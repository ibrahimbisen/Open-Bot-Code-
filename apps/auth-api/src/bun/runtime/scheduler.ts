import type { Logger } from "@codebot/logging";

export interface ScheduledJob {
  name: string;
  intervalMs: number;
  firstDelayMs?: number;
  run: (scheduledTime: number) => Promise<void>;
}

interface JobState {
  job: ScheduledJob;
  timer: ReturnType<typeof setTimeout> | null;
  running: Promise<void> | null;
}

export class Scheduler {
  readonly #logger: Logger;
  readonly #jobs: JobState[] = [];
  #stopped = false;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  add(job: ScheduledJob): void {
    const state: JobState = { job, timer: null, running: null };
    this.#jobs.push(state);
    this.#arm(state, job.firstDelayMs ?? job.intervalMs);
  }

  runNow(name: string): Promise<void> {
    const state = this.#jobs.find((entry) => entry.job.name === name);
    if (!state) return Promise.reject(new Error(`No scheduled job has the name ${name}.`));
    return this.#run(state);
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    for (const state of this.#jobs) {
      if (state.timer) clearTimeout(state.timer);
      state.timer = null;
    }
    await Promise.allSettled(this.#jobs.flatMap((state) => (state.running ? [state.running] : [])));
  }

  #arm(state: JobState, delayMs: number): void {
    if (this.#stopped) return;
    state.timer = setTimeout(() => {
      state.timer = null;
      void this.#run(state).finally(() => this.#arm(state, state.job.intervalMs));
    }, delayMs);
    state.timer.unref?.();
  }

  #run(state: JobState): Promise<void> {
    if (state.running) return state.running;
    const running = state.job
      .run(Date.now())
      .catch((error: unknown) => {
        this.#logger.error("A scheduled job failed.", {
          job: state.job.name,
          error: error instanceof Error ? error.name : typeof error,
        });
      })
      .finally(() => {
        state.running = null;
      });
    state.running = running;
    return running;
  }
}
