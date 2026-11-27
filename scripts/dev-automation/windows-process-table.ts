import type { ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import type * as Koffi from "koffi";
import type { ProcessTableRow } from "./cpu-sampling";

const requireModule = createRequire(import.meta.url);

const SNAPSHOT_PROCESSES = 0x2;
const INVALID_HANDLE = -1;
const ACCESS_TERMINATE = 0x1;
const ACCESS_QUERY_LIMITED = 0x1000;
const ACCESS_SYNCHRONIZE = 0x10_0000;
const READ_ACCESS = ACCESS_QUERY_LIMITED | ACCESS_SYNCHRONIZE;
const STOP_ACCESS = READ_ACCESS | ACCESS_TERMINATE;
const BASIC_INFORMATION = 0;
const COMMAND_LINE_INFORMATION = 60;
const STATUS_SUCCESS = 0;
const WAIT_TIMEOUT = 258;
const STOPPED_EXIT_CODE = 1;
const MAX_IMAGE_NAME_CHARACTERS = 260;
const MAX_COMMAND_LINE_BYTES = 0x1_0000;
const TICKS_PER_SECOND = 10_000_000;
const BYTES_PER_KB = 1_024;
const STOP_POLL_MS = 50;

type Handle = number | bigint;
type Ticks = number | bigint;
type Bytes = number | bigint;

interface ProcessEntry {
  dwSize: number;
  th32ProcessID?: number;
  th32ParentProcessID?: number;
  szExeFile?: string;
}

interface MemoryCounters {
  WorkingSetSize?: Bytes;
  PrivateUsage?: Bytes;
}

interface BasicInformation {
  InheritedFromUniqueProcessId?: number | bigint;
}

interface CommandLineBuffer {
  bytes: Buffer;
  address: bigint;
  headerBytes: number;
  pointerOffset: number;
  pointerBytes: number;
}

interface ProcessApi {
  entryBytes: number;
  countersBytes: number;
  basicBytes: number;
  commandLine: CommandLineBuffer;
  createSnapshot: (flags: number, pid: number) => Handle;
  firstProcess: (snapshot: Handle, entry: ProcessEntry) => boolean;
  nextProcess: (snapshot: Handle, entry: ProcessEntry) => boolean;
  openProcess: (access: number, inherit: boolean, pid: number) => Handle;
  closeHandle: (handle: Handle) => boolean;
  processTimes: (handle: Handle, created: [Ticks], exited: [Ticks], kernel: [Ticks], user: [Ticks]) => boolean;
  memoryCounters: (handle: Handle, counters: MemoryCounters, bytes: number) => boolean;
  basicInformation: (handle: Handle, kind: number, basic: BasicInformation, bytes: number, returned: null) => number;
  rawInformation: (handle: Handle, kind: number, buffer: Buffer, bytes: number, returned: null) => number;
  waitForObject: (handle: Handle, milliseconds: number) => number;
  terminateProcess: (handle: Handle, exitCode: number) => boolean;
}

let processApi: ProcessApi | null = null;

function loadProcessApi(): ProcessApi {
  if (processApi) return processApi;
  const koffi: typeof Koffi = requireModule("koffi");
  const kernel = koffi.load("kernel32.dll");
  const system = koffi.load("ntdll.dll");
  const entry = koffi.struct({
    dwSize: "uint32_t",
    cntUsage: "uint32_t",
    th32ProcessID: "uint32_t",
    th32DefaultHeapID: "uintptr_t",
    th32ModuleID: "uint32_t",
    cntThreads: "uint32_t",
    th32ParentProcessID: "uint32_t",
    pcPriClassBase: "int32_t",
    dwFlags: "uint32_t",
    szExeFile: koffi.array("char16_t", MAX_IMAGE_NAME_CHARACTERS),
  });
  const counters = koffi.struct({
    cb: "uint32_t",
    PageFaultCount: "uint32_t",
    PeakWorkingSetSize: "size_t",
    WorkingSetSize: "size_t",
    QuotaPeakPagedPoolUsage: "size_t",
    QuotaPagedPoolUsage: "size_t",
    QuotaPeakNonPagedPoolUsage: "size_t",
    QuotaNonPagedPoolUsage: "size_t",
    PagefileUsage: "size_t",
    PeakPagefileUsage: "size_t",
    PrivateUsage: "size_t",
  });
  const basic = koffi.struct({
    ExitStatus: "int32_t",
    PebBaseAddress: "void *",
    AffinityMask: "uintptr_t",
    BasePriority: "int32_t",
    UniqueProcessId: "uintptr_t",
    InheritedFromUniqueProcessId: "uintptr_t",
  });
  const countedString = koffi.struct({ Length: "uint16_t", MaximumLength: "uint16_t", Buffer: "void *" });
  const entryPointer = koffi.inout(koffi.pointer(entry));
  const ticksPointer = koffi.out(koffi.pointer("uint64_t"));
  const bytes = Buffer.alloc(koffi.sizeof(countedString) + MAX_COMMAND_LINE_BYTES);
  processApi = {
    entryBytes: koffi.sizeof(entry),
    countersBytes: koffi.sizeof(counters),
    basicBytes: koffi.sizeof(basic),
    commandLine: {
      bytes,
      address: koffi.address(bytes),
      headerBytes: koffi.sizeof(countedString),
      pointerOffset: koffi.offsetof(countedString, "Buffer"),
      pointerBytes: koffi.sizeof("void *"),
    },
    createSnapshot: kernel.func("__stdcall", "CreateToolhelp32Snapshot", "intptr_t", ["uint32_t", "uint32_t"]),
    firstProcess: kernel.func("__stdcall", "Process32FirstW", "bool", ["intptr_t", entryPointer]),
    nextProcess: kernel.func("__stdcall", "Process32NextW", "bool", ["intptr_t", entryPointer]),
    openProcess: kernel.func("__stdcall", "OpenProcess", "intptr_t", ["uint32_t", "bool", "uint32_t"]),
    closeHandle: kernel.func("__stdcall", "CloseHandle", "bool", ["intptr_t"]),
    processTimes: kernel.func("__stdcall", "GetProcessTimes", "bool", [
      "intptr_t",
      ticksPointer,
      ticksPointer,
      ticksPointer,
      ticksPointer,
    ]),
    memoryCounters: kernel.func("__stdcall", "K32GetProcessMemoryInfo", "bool", [
      "intptr_t",
      koffi.out(koffi.pointer(counters)),
      "uint32_t",
    ]),
    basicInformation: system.func("__stdcall", "NtQueryInformationProcess", "int32_t", [
      "intptr_t",
      "int32_t",
      koffi.out(koffi.pointer(basic)),
      "uint32_t",
      "void *",
    ]),
    rawInformation: system.func("__stdcall", "NtQueryInformationProcess", "int32_t", [
      "intptr_t",
      "int32_t",
      "void *",
      "uint32_t",
      "void *",
    ]),
    waitForObject: kernel.func("__stdcall", "WaitForSingleObject", "uint32_t", ["intptr_t", "uint32_t"]),
    terminateProcess: kernel.func("__stdcall", "TerminateProcess", "bool", ["intptr_t", "uint32_t"]),
  };
  return processApi;
}

interface SnapshotEntry {
  pid: number;
  ppid: number;
  image: string;
}

const SNAPSHOT_ATTEMPTS = 40;

function createSnapshotWithRetry(api: ProcessApi): Handle {
  for (let attempt = 1; ; attempt++) {
    const snapshot = api.createSnapshot(SNAPSHOT_PROCESSES, 0);
    if (Number(snapshot) !== INVALID_HANDLE) return snapshot;
    if (attempt >= SNAPSHOT_ATTEMPTS) throw new Error("Windows did not give a process snapshot.");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(200 * attempt, 1000));
  }
}

function readSnapshot(api: ProcessApi): SnapshotEntry[] {
  const snapshot = createSnapshotWithRetry(api);
  const entries: SnapshotEntry[] = [];
  try {
    const entry: ProcessEntry = { dwSize: api.entryBytes };
    for (let more = api.firstProcess(snapshot, entry); more; more = api.nextProcess(snapshot, entry)) {
      entries.push({
        pid: entry.th32ProcessID ?? 0,
        ppid: entry.th32ParentProcessID ?? 0,
        image: entry.szExeFile ?? "",
      });
    }
  } finally {
    api.closeHandle(snapshot);
  }
  return entries;
}

interface ProcessTimes {
  createdAt: bigint;
  cpuSeconds: number;
}

function readTimes(api: ProcessApi, handle: Handle): ProcessTimes | null {
  const created: [Ticks] = [0];
  const exited: [Ticks] = [0];
  const kernel: [Ticks] = [0];
  const user: [Ticks] = [0];
  if (!api.processTimes(handle, created, exited, kernel, user)) return null;
  return {
    createdAt: BigInt(created[0]),
    cpuSeconds: (Number(kernel[0]) + Number(user[0])) / TICKS_PER_SECOND,
  };
}

function readParentPid(api: ProcessApi, handle: Handle): number | null {
  const basic: BasicInformation = {};
  if (api.basicInformation(handle, BASIC_INFORMATION, basic, api.basicBytes, null) !== STATUS_SUCCESS) return null;
  return Number(basic.InheritedFromUniqueProcessId ?? 0);
}

function readCommandLine(api: ProcessApi, handle: Handle): string | null {
  const { bytes, address, headerBytes, pointerOffset, pointerBytes } = api.commandLine;
  if (api.rawInformation(handle, COMMAND_LINE_INFORMATION, bytes, bytes.length, null) !== STATUS_SUCCESS) return null;
  const length = bytes.readUInt16LE(0);
  const pointer = pointerBytes === 8 ? bytes.readBigUInt64LE(pointerOffset) : BigInt(bytes.readUInt32LE(pointerOffset));
  const start = Number(pointer - address);
  if (start < headerBytes || start + length > bytes.length) return null;
  return bytes.toString("utf16le", start, start + length);
}

interface HeldProcess {
  entry: SnapshotEntry;
  handle: Handle;
  createdAt: bigint;
  canStop: boolean;
}

function holdProcess(
  api: ProcessApi,
  entry: SnapshotEntry,
  parent: HeldProcess | null,
  access: number,
): HeldProcess | null {
  const handle = api.openProcess(access, false, entry.pid);
  if (!handle) return access === READ_ACCESS ? null : holdProcess(api, entry, parent, READ_ACCESS);
  const createdAt = readTimes(api, handle)?.createdAt;
  const descends = parent === null || (createdAt !== undefined && createdAt >= parent.createdAt);
  if (createdAt !== undefined && descends && readParentPid(api, handle) === entry.ppid) {
    return { entry, handle, createdAt, canStop: access === STOP_ACCESS };
  }
  api.closeHandle(handle);
  return null;
}

function holdChildren(api: ProcessApi, entries: SnapshotEntry[], held: Map<number, HeldProcess>, access: number): void {
  for (let grew = true; grew; ) {
    grew = false;
    for (const entry of entries) {
      const parent = held.get(entry.ppid);
      if (!parent || held.has(entry.pid)) continue;
      const child = holdProcess(api, entry, parent, access);
      if (!child) continue;
      held.set(entry.pid, child);
      grew = true;
    }
  }
}

function holdTree(api: ProcessApi, rootPid: number, access: number): Map<number, HeldProcess> {
  const held = new Map<number, HeldProcess>();
  const entries = readSnapshot(api);
  const rootEntry = entries.find((entry) => entry.pid === rootPid);
  const root = rootEntry ? holdProcess(api, rootEntry, null, access) : null;
  if (!root) return held;
  held.set(rootPid, root);
  holdChildren(api, entries, held, access);
  return held;
}

function release(api: ProcessApi, held: Map<number, HeldProcess>): void {
  for (const process of held.values()) api.closeHandle(process.handle);
  held.clear();
}

function isRunning(api: ProcessApi, process: HeldProcess): boolean {
  return api.waitForObject(process.handle, 0) === WAIT_TIMEOUT;
}

function readRow(api: ProcessApi, process: HeldProcess): ProcessTableRow | null {
  const counters: MemoryCounters = {};
  const times = readTimes(api, process.handle);
  if (!times || !isRunning(api, process)) return null;
  if (!api.memoryCounters(process.handle, counters, api.countersBytes)) return null;
  return {
    pid: process.entry.pid,
    ppid: process.entry.ppid,
    rssKb: Math.round(Number(counters.WorkingSetSize ?? 0) / BYTES_PER_KB),
    cpuSeconds: times.cpuSeconds,
    command: readCommandLine(api, process.handle) ?? process.entry.image,
    privateKb: Math.round(Number(counters.PrivateUsage ?? 0) / BYTES_PER_KB),
  };
}

export function readWindowsProcessTree(rootPid: number): ProcessTableRow[] {
  const api = loadProcessApi();
  const held = holdTree(api, rootPid, READ_ACCESS);
  try {
    return [...held.values()].flatMap((process) => readRow(api, process) ?? []);
  } finally {
    release(api, held);
  }
}

export async function stopWindowsProcessTree(
  root: Pick<ChildProcess, "pid" | "exitCode" | "signalCode">,
  timeoutMs: number,
): Promise<number[]> {
  if (root.pid === undefined || root.exitCode !== null || root.signalCode !== null) return [];
  const api = loadProcessApi();
  const held = holdTree(api, root.pid, STOP_ACCESS);
  const deadline = Date.now() + timeoutMs;
  try {
    for (;;) {
      const known = held.size;
      const running = [...held.values()].filter((process) => isRunning(api, process));
      for (const process of running) if (process.canStop) api.terminateProcess(process.handle, STOPPED_EXIT_CODE);
      holdChildren(api, readSnapshot(api), held, STOP_ACCESS);
      if (running.length === 0 && held.size === known) return [];
      if (Date.now() > deadline) return running.map((process) => process.entry.pid);
      await new Promise((resolve) => setTimeout(resolve, STOP_POLL_MS));
    }
  } finally {
    release(api, held);
  }
}
