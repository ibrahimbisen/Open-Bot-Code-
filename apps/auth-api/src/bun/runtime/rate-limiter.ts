interface Window {
  startedAt: number;
  count: number;
}

const MAXIMUM_TRACKED_KEYS = 50_000;

export function memoryRateLimit(options: { limit: number; periodSeconds: number; now?: () => number }): RateLimit {
  const now = options.now ?? Date.now;
  const periodMs = options.periodSeconds * 1_000;
  const windows = new Map<string, Window>();

  const forgetExpired = (time: number) => {
    for (const [key, window] of windows) {
      if (time - window.startedAt >= periodMs) windows.delete(key);
    }
    while (windows.size >= MAXIMUM_TRACKED_KEYS) {
      const oldest = windows.keys().next();
      if (oldest.done) break;
      windows.delete(oldest.value);
    }
  };

  return {
    limit: ({ key }) => {
      const time = now();
      const current = windows.get(key);
      if (!current || time - current.startedAt >= periodMs) {
        if (windows.size >= MAXIMUM_TRACKED_KEYS) forgetExpired(time);
        windows.delete(key);
        windows.set(key, { startedAt: time, count: 1 });
        return Promise.resolve({ success: options.limit >= 1 });
      }
      current.count += 1;
      return Promise.resolve({ success: current.count <= options.limit });
    },
  };
}
