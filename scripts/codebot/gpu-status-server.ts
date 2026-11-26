import { spawn } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

const QUERY_ARGUMENTS = [
  "--query-gpu=index,name,utilization.gpu,memory.used,memory.total",
  "--format=csv,noheader,nounits",
];
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9835;
const DEFAULT_INTERVAL_SECONDS = 5;
const COMMAND_TIMEOUT_MS = 5_000;
const OUTPUT_LIMIT_BYTES = 64 * 1024;
const STALE_AFTER_INTERVALS = 3;

const USAGE = `gpu-status-server: serves the GPU load and GPU memory of this machine as JSON for CodeBot.

Usage:
  bun gpu-status-server.ts [--host <address>] [--port <port>] [--interval <seconds>]
  node gpu-status-server.ts [--host <address>] [--port <port>] [--interval <seconds>]

Options:
  --host <address>      Address to listen on. Default: ${DEFAULT_HOST} (GPU_STATUS_HOST).
                        Use 0.0.0.0 or the LAN address when CodeBot runs on another computer.
  --port <port>         Port to listen on. Default: ${DEFAULT_PORT} (GPU_STATUS_PORT). 0 selects a free port.
  --interval <seconds>  Time between two nvidia-smi readings. Default: ${DEFAULT_INTERVAL_SECONDS} (GPU_STATUS_INTERVAL).
  --help                Show this text.

The server has one endpoint, GET /, and it changes nothing on the machine.
`;

interface Gpu {
  index: number;
  name: string | null;
  utilization: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
}

interface Reading {
  gpus: Gpu[];
  checkedAt: string;
  takenAt: number;
}

interface Settings {
  host: string;
  port: number;
  intervalMs: number;
}

function fail(message: string): never {
  process.stderr.write(`gpu-status-server: ${message}\n`);
  process.exit(2);
}

function numberOption(name: string, value: string | undefined, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (value === undefined || value.trim() === "" || !Number.isFinite(parsed) || parsed < minimum || parsed > maximum)
    fail(`${name} must be a number from ${minimum} to ${maximum}.`);
  return parsed;
}

function readSettings(argv: readonly string[], env: NodeJS.ProcessEnv): Settings {
  const values = new Map<string, string>();
  for (let position = 0; position < argv.length; position += 1) {
    const argument = argv[position] ?? "";
    if (argument === "--help" || argument === "-h") {
      process.stdout.write(USAGE);
      process.exit(0);
    }
    const match = /^--(host|port|interval)(?:=(.*))?$/.exec(argument);
    if (!match) fail(`Unknown option ${argument}. Use --help.`);
    const value = match[2] ?? argv[position + 1];
    if (match[2] === undefined) position += 1;
    if (value === undefined) fail(`--${match[1]} needs a value.`);
    values.set(match[1] ?? "", value);
  }
  const port = values.get("port") ?? env.GPU_STATUS_PORT;
  const interval = values.get("interval") ?? env.GPU_STATUS_INTERVAL;
  return {
    host: values.get("host") ?? env.GPU_STATUS_HOST ?? DEFAULT_HOST,
    port: port === undefined ? DEFAULT_PORT : Math.trunc(numberOption("--port", port, 0, 65_535)),
    intervalMs:
      (interval === undefined ? DEFAULT_INTERVAL_SECONDS : numberOption("--interval", interval, 1, 3_600)) * 1_000,
  };
}

function measure(value: string | undefined): number | null {
  const text = (value ?? "").trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseRow(line: string, position: number): Gpu | null {
  const cells = line.split(",").map((cell) => cell.trim());
  if (cells.length < 5) return null;
  const index = measure(cells[0]);
  const utilization = measure(cells[cells.length - 3]);
  const name = cells.slice(1, cells.length - 3).join(", ");
  return {
    index: index !== null && Number.isInteger(index) ? index : position,
    name: name || null,
    utilization: utilization !== null && utilization <= 100 ? utilization : null,
    memoryUsedMb: measure(cells[cells.length - 2]),
    memoryTotalMb: measure(cells[cells.length - 1]),
  };
}

function parseOutput(output: string): Gpu[] {
  const rows = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return rows.flatMap((line, position) => {
    const gpu = parseRow(line, position);
    return gpu ? [gpu] : [];
  });
}

function runNvidiaSmi(): Promise<string> {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn(`nvidia-smi ${QUERY_ARGUMENTS.join(" ")}`, {
            shell: true,
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
          })
        : spawn("nvidia-smi", QUERY_ARGUMENTS, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    let settled = false;
    const finish = (error: Error | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(output);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error("nvidia-smi did not answer in time."));
    }, COMMAND_TIMEOUT_MS);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (output.length < OUTPUT_LIMIT_BYTES) output += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      if (errors.length < OUTPUT_LIMIT_BYTES) errors += chunk;
    });
    child.on("error", (error) => finish(new Error(`nvidia-smi did not start: ${error.message}`)));
    child.on("close", (code) => {
      if (code === 0) finish(null);
      else finish(new Error(errors.trim().split(/\r?\n/)[0] || `nvidia-smi stopped with the code ${code}.`));
    });
  });
}

const settings = readSettings(process.argv.slice(2), process.env);
let reading: Reading | null = null;
let lastError = "No GPU reading is available yet.";
let sampling = false;

async function sample(): Promise<void> {
  if (sampling) return;
  sampling = true;
  try {
    const gpus = parseOutput(await runNvidiaSmi());
    const now = new Date();
    reading = { gpus, checkedAt: now.toISOString(), takenAt: now.getTime() };
  } catch (error) {
    lastError = error instanceof Error ? error.message : "nvidia-smi failed.";
  } finally {
    sampling = false;
  }
}

function currentReading(): Reading | null {
  if (!reading) return null;
  return Date.now() - reading.takenAt > settings.intervalMs * STALE_AFTER_INTERVALS ? null : reading;
}

const server = createServer((request, response) => {
  const path = (request.url ?? "/").split("?")[0];
  if (path !== "/") {
    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Not found. The only endpoint is GET /." }));
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD", "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Only GET is permitted." }));
    return;
  }
  const current = currentReading();
  const body = current
    ? JSON.stringify({ gpus: current.gpus, checkedAt: current.checkedAt })
    : JSON.stringify({ gpus: [], error: lastError });
  response.writeHead(current ? 200 : 503, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(request.method === "HEAD" ? undefined : body);
});

function addressOf(info: AddressInfo): string {
  return `http://${info.family === "IPv6" ? `[${info.address}]` : info.address}:${info.port}/`;
}

async function main(): Promise<void> {
  server.on("error", (error) => fail(`The server did not start: ${error.message}`));
  await sample();
  const timer = setInterval(() => void sample(), settings.intervalMs);
  server.listen(settings.port, settings.host, () => {
    const info = server.address();
    if (info && typeof info === "object") process.stdout.write(`gpu-status-server: listening on ${addressOf(info)}\n`);
  });
  const stop = () => {
    clearInterval(timer);
    server.close(() => process.exit(0));
    server.closeAllConnections?.();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

void main();
