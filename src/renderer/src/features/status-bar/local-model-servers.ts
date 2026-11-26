import { createRoot, onSettled } from "solid-js";
import { statusBarPort } from "./status-bar-port";
import { createLocalModelServersStore } from "./stores/local-model-servers-store";

type LocalModelServersStore = ReturnType<typeof createLocalModelServersStore>;

let shared: { store: LocalModelServersStore; holders: number; stop: (() => void) | null } | null = null;

function sharedState() {
  shared ??= { store: createRoot(() => createLocalModelServersStore(statusBarPort)), holders: 0, stop: null };
  return shared;
}

export function useLocalModelServers(): LocalModelServersStore {
  const state = sharedState();
  onSettled(() => {
    state.holders += 1;
    if (state.holders === 1) state.stop = state.store.start();
    return () => {
      state.holders -= 1;
      if (state.holders === 0) {
        state.stop?.();
        state.stop = null;
      }
    };
  });
  return state.store;
}
