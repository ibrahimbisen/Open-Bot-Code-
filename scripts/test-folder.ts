import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const WINDOWS_IN_USE_CODES = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);
const REMOVE_AFTER_EXIT_SOURCE = `
const fs = require("node:fs");
const [owner, folder] = JSON.parse(process.env.CODEBOT_TEST_FOLDER_REMOVAL);
const ownerDeadline = Date.now() + 600000;
const ownerRuns = () => {
  try {
    process.kill(owner, 0);
    return true;
  } catch {
    return false;
  }
};
const remove = () => {
  if (ownerRuns() && Date.now() < ownerDeadline) return setTimeout(remove, 200);
  try {
    fs.rmSync(folder, { recursive: true, force: true });
  } catch {
    if (Date.now() < ownerDeadline + 60000) setTimeout(remove, 200);
  }
};
remove();
`;

export async function removeTestFolder(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true });
  } catch (error) {
    if (!isInUseOnWindows(error)) throw error;
    removeAfterThisProcessExits(path);
  }
}

function isInUseOnWindows(error: unknown): boolean {
  return (
    process.platform === "win32" &&
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    WINDOWS_IN_USE_CODES.has(error.code)
  );
}

function removeAfterThisProcessExits(path: string): void {
  spawn(process.execPath, ["-e", REMOVE_AFTER_EXIT_SOURCE], {
    cwd: tmpdir(),
    detached: true,
    env: { ...process.env, CODEBOT_TEST_FOLDER_REMOVAL: JSON.stringify([process.pid, path]) },
    stdio: "ignore",
    windowsHide: true,
  }).unref();
}
