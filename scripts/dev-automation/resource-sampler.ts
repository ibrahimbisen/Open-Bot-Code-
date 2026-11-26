import { execFile } from "node:child_process";
import { cpus, freemem } from "node:os";
import { promisify } from "node:util";
import { isDynamicRecord, isNumber, isString } from "@codebot/contracts/runtime-values";
import type { Logger } from "@codebot/logging";
import type { Browser, CDPSession, Page } from "playwright-core";
import { cpuMetrics, type MetricValues, parseFootprint, processMetrics } from "./bench-stats";
import type { ProcessTableRow } from "./cpu-sampling";
import type { InspectorClient } from "./inspector-client";
import { readPageMemory } from "./memory-profile";
import { describeTarget } from "./page-url";
import { readProcessTree } from "./process-table";

const run = promisify(execFile);
const BYTES_PER_KB = 1_024;
const BYTES_PER_MB = 1_024 * 1_024;

export interface ResourceSamplerOptions {
  browser: () => Browser | null;
  inspector: () => InspectorClient | null;
  rootPid: number;
  appPage: () => Page | null;
  logger: Logger;
  intervalMs?: number;
  heapEvery?: number;
}

export interface ResourceSample {
  atMs: number;
  values: MetricValues;
}

function privateBytes(rows: ProcessTableRow[]): Map<number, number> {
  const footprints = new Map<number, number>();
  for (const row of rows) if (row.privateKb !== undefined) footprints.set(row.pid, row.privateKb * BYTES_PER_KB);
  return footprints;
}

async function readFootprints(rows: ProcessTableRow[]): Promise<Map<number, number>> {
  if (process.platform === "win32") return privateBytes(rows);
  if (process.platform !== "darwin" || rows.length === 0) return new Map();
  try {
    const { stdout } = await run(
      "footprint",
      ["--noCategories", "-f", "bytes", ...rows.flatMap((row) => ["-p", String(row.pid)])],
      { maxBuffer: 16 * 1_024 * 1_024, timeout: 10_000 },
    );
    return parseFootprint(stdout);
  } catch (error) {
    const stdout = error instanceof Error && "stdout" in error && typeof error.stdout === "string" ? error.stdout : "";
    return parseFootprint(stdout);
  }
}

interface HostCpuTimes {
  busyMs: number;
  totalMs: number;
  cores: number;
}

function readHostCpuTimes(): HostCpuTimes {
  const cores = cpus();
  let busyMs = 0;
  let totalMs = 0;
  for (const { times } of cores) {
    const all = times.user + times.nice + times.sys + times.idle + times.irq;
    totalMs += all;
    busyMs += all - times.idle;
  }
  return { busyMs, totalMs, cores: cores.length };
}

function hostMetrics(previous: HostCpuTimes | null, current: HostCpuTimes): MetricValues {
  const values: MetricValues = { "host.mem.free": Math.round(freemem() / BYTES_PER_MB) };
  const elapsedMs = previous ? current.totalMs - previous.totalMs : 0;
  if (previous && elapsedMs > 0) {
    const busyCores = ((current.busyMs - previous.busyMs) / elapsedMs) * current.cores;
    values["host.cpu"] = Math.round(busyCores * 1_000) / 10;
  }
  return values;
}

const READ_PROCESS_KINDS = "globalThis.__codebotPerfProbes?.processKinds() ?? null";
const KIND_REFRESH_TICKS = 10;

export async function readAppProcessKinds(inspector: InspectorClient | null): Promise<Map<number, string>> {
  const kinds = new Map<number, string>();
  const listed = inspector ? await inspector.evaluate(READ_PROCESS_KINDS).catch(() => null) : null;
  if (!Array.isArray(listed)) return kinds;
  for (const entry of listed) {
    if (isDynamicRecord(entry) && isNumber(entry.pid) && isString(entry.kind)) kinds.set(entry.pid, entry.kind);
  }
  return kinds;
}

function allPages(browser: Browser | null): Page[] {
  return browser?.contexts().flatMap((context) => context.pages()) ?? [];
}

async function withSession<T>(page: Page, use: (session: CDPSession) => Promise<T>): Promise<T | null> {
  let session: CDPSession | null = null;
  try {
    session = await page.context().newCDPSession(page);
    return await use(session);
  } catch {
    return null;
  } finally {
    await session?.detach().catch(() => undefined);
  }
}

export class ResourceSampler {
  readonly #options: ResourceSamplerOptions;
  readonly #samples: ResourceSample[] = [];
  #previousRows: ProcessTableRow[] | null = null;
  #previousAt = 0;
  #previousHost: HostCpuTimes | null = null;
  #appKinds = new Map<number, string>();
  #kindsTick = -KIND_REFRESH_TICKS;
  #tick = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #running: Promise<void> | null = null;
  #stopped = false;
  #failure: Error | null = null;

  constructor(options: ResourceSamplerOptions) {
    this.#options = options;
  }

  async readHeaps(): Promise<MetricValues> {
    const { appPage, logger } = this.#options;
    const browser = this.#options.browser();
    const inspector = this.#options.inspector();
    const values: MetricValues = {};
    if (!browser) return values;
    const app = appPage();
    let rendererHeap = 0;
    let pageCount = 0;
    for (const page of allPages(browser)) {
      const memory = await withSession(page, (session) => readPageMemory(session, describeTarget(page.url())));
      if (!memory) continue;
      pageCount += 1;
      rendererHeap += memory.jsHeapUsedMb;
      if (page === app) {
        values["heap.renderer.app"] = memory.jsHeapUsedMb;
        values["dom.nodes.app"] = memory.nodes;
        values["dom.listeners.app"] = memory.jsEventListeners;
      }
    }
    values["heap.renderer.all"] = Math.round(rendererHeap * 10) / 10;
    values["pages.count"] = pageCount;
    if (inspector) {
      try {
        const heap = await inspector.readHeap();
        values["heap.main"] = heap.heapUsedMb;
        values["heap.main.total"] = heap.heapTotalMb;
        values["heap.main.external"] = heap.externalMb;
        values["heap.main.arrayBuffers"] = heap.arrayBuffersMb;
      } catch (error) {
        logger.warn(`could not read the main heap: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return values;
  }

  async #sample(withHeaps: boolean): Promise<ResourceSample> {
    const atMs = Date.now();
    const rows = await readProcessTree(this.#options.rootPid);
    const values: MetricValues = processMetrics(rows, await readFootprints(rows));
    await this.#refreshAppKinds(rows);
    if (this.#previousRows) {
      Object.assign(values, cpuMetrics(this.#previousRows, rows, atMs - this.#previousAt, this.#appKinds));
    }
    this.#previousRows = rows;
    this.#previousAt = atMs;
    const host = readHostCpuTimes();
    Object.assign(values, hostMetrics(this.#previousHost, host));
    this.#previousHost = host;
    if (withHeaps) Object.assign(values, await this.readHeaps());
    return { atMs, values };
  }

  async #refreshAppKinds(rows: ProcessTableRow[]): Promise<void> {
    const unknownPid = rows.some((row) => row.ppid === this.#options.rootPid && !this.#appKinds.has(row.pid));
    if (!unknownPid && this.#tick - this.#kindsTick < KIND_REFRESH_TICKS) return;
    this.#kindsTick = this.#tick;
    this.#appKinds = await readAppProcessKinds(this.#options.inspector());
  }

  start(): void {
    const intervalMs = this.#options.intervalMs ?? 1_000;
    const heapEvery = this.#options.heapEvery ?? 5;
    this.#stopped = false;
    const loop = async (): Promise<void> => {
      if (this.#stopped) return;
      const started = Date.now();
      try {
        this.#samples.push(await this.#sample(this.#tick % heapEvery === 0));
      } catch (error) {
        this.#failure = error instanceof Error ? error : new Error(String(error));
        this.#stopped = true;
        return;
      }
      this.#tick += 1;
      if (this.#stopped) return;
      this.#timer = setTimeout(
        () => {
          this.#running = loop();
        },
        Math.max(intervalMs - (Date.now() - started), 0),
      );
    };
    this.#running = loop();
  }

  async stop(): Promise<ResourceSample[]> {
    this.#stopped = true;
    if (this.#timer) clearTimeout(this.#timer);
    await this.#running;
    const failure = this.#failure;
    this.#failure = null;
    if (failure) throw new Error(`The process tree could not be sampled: ${failure.message}`, { cause: failure });
    return [...this.#samples];
  }

  async settled(waitMs: number): Promise<MetricValues> {
    const { rootPid } = this.#options;
    await this.#options
      .inspector()
      ?.collectGarbage()
      .catch(() => undefined);
    for (const page of allPages(this.#options.browser())) {
      await withSession(page, async (session) => {
        await session.send("HeapProfiler.enable");
        await session.send("HeapProfiler.collectGarbage");
        await session.send("HeapProfiler.disable");
      });
    }
    const before = await readProcessTree(rootPid);
    const hostBefore = readHostCpuTimes();
    const startedAt = Date.now();
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const after = await readProcessTree(rootPid);
    const host = hostMetrics(hostBefore, readHostCpuTimes());
    const appKinds = await readAppProcessKinds(this.#options.inspector());
    return {
      ...host,
      ...processMetrics(after, await readFootprints(after)),
      ...cpuMetrics(before, after, Date.now() - startedAt, appKinds),
      ...(await this.readHeaps()),
    };
  }
}
