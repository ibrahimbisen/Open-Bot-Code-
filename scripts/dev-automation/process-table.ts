import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { collectDescendants, PROCESS_TABLE_PS_ARGS, type ProcessTableRow, parseProcessTable } from "./cpu-sampling";
import { readWindowsProcessTree } from "./windows-process-table";

const run = promisify(execFile);
const PS_OUTPUT_LIMIT_BYTES = 16 * 1_024 * 1_024;

export async function readProcessTree(rootPid: number): Promise<ProcessTableRow[]> {
  if (process.platform === "win32") return readWindowsProcessTree(rootPid);
  const { stdout } = await run("ps", PROCESS_TABLE_PS_ARGS, { maxBuffer: PS_OUTPUT_LIMIT_BYTES });
  return collectDescendants(parseProcessTable(stdout), rootPid);
}
