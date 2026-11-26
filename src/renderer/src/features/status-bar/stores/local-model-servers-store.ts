import type { LocalModelServerStatus, LocalModelServerWatchMode } from "@codebot/contracts/ipc";
import { createStore } from "solid-js";
import type { StatusBarPort } from "../status-bar-port";

interface LocalModelServersState {
  statuses: LocalModelServerStatus[];
  loaded: boolean;
  refreshing: boolean;
}

export function createLocalModelServersStore(port: () => StatusBarPort) {
  const [state, setState] = createStore<LocalModelServersState>({ statuses: [], loaded: false, refreshing: false });
  const watchId = `window-${Math.random().toString(36).slice(2)}`;

  function apply(statuses: LocalModelServerStatus[]): void {
    setState((current) => {
      current.statuses = statuses;
      current.loaded = true;
    });
  }

  function watch(mode: LocalModelServerWatchMode): void {
    void port()
      .localModelServers.watch({ watchId, mode })
      .catch(() => undefined);
  }

  function start(): () => void {
    const api = port().localModelServers;
    const stop = api.onStatuses(apply);
    void api
      .list()
      .then(apply)
      .catch(() => undefined);
    const mode = (): LocalModelServerWatchMode => (document.visibilityState === "hidden" ? "hidden" : "visible");
    const onVisibility = () => watch(mode());
    document.addEventListener("visibilitychange", onVisibility);
    watch(mode());
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      watch("off");
    };
  }

  async function refresh(id: string | null = null): Promise<void> {
    if (state.refreshing) return;
    setState((current) => {
      current.refreshing = true;
    });
    try {
      apply(await port().localModelServers.refresh({ id }));
    } finally {
      setState((current) => {
        current.refreshing = false;
      });
    }
  }

  return {
    statuses: () => state.statuses,
    loaded: () => state.loaded,
    refreshing: () => state.refreshing,
    start,
    refresh,
    apply,
    api: () => port().localModelServers,
  };
}
