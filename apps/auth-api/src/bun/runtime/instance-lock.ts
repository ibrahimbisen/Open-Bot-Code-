import { Database } from "bun:sqlite";
import { join } from "node:path";

export class InstanceLockError extends Error {
  constructor(dataDir: string) {
    super(`Another account service uses the data folder ${dataDir}. Stop it first.`);
    this.name = "InstanceLockError";
  }
}

export interface InstanceLock {
  release(): void;
}

export function acquireInstanceLock(dataDir: string): InstanceLock {
  const lock = new Database(join(dataDir, "instance.lock"), { create: true });
  try {
    lock.exec("PRAGMA busy_timeout = 0");
    lock.exec("PRAGMA locking_mode = EXCLUSIVE");
    lock.exec("BEGIN EXCLUSIVE");
  } catch {
    lock.close();
    throw new InstanceLockError(dataDir);
  }
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      if (lock.inTransaction) lock.exec("ROLLBACK");
      lock.close();
    },
  };
}
