import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import {
  decodeStoredAddresses,
  NO_SERVICE_ADDRESSES,
  resolveServiceAddresses,
  type ServiceAddresses,
} from "./service-addresses";

const SERVICE_ADDRESSES_KEY = "codebot.mobile.service-addresses.v1";

const buildAddresses = {
  accountUrl: process.env.EXPO_PUBLIC_CODEBOT_API_URL,
  signalUrl: process.env.EXPO_PUBLIC_CODEBOT_SIGNAL_URL,
};

let current: ServiceAddresses = resolveServiceAddresses(null, buildAddresses);
let loading: Promise<ServiceAddresses> | null = null;
const listeners = new Set<() => void>();

function publish(next: ServiceAddresses): void {
  current = next;
  for (const listener of listeners) listener();
}

export function currentServiceAddresses(): ServiceAddresses {
  return current;
}

export function loadServiceAddresses(): Promise<ServiceAddresses> {
  loading ??= SecureStore.getItemAsync(SERVICE_ADDRESSES_KEY).then(
    (raw) => {
      publish(resolveServiceAddresses(decodeStoredAddresses(raw), buildAddresses));
      return current;
    },
    () => current,
  );
  return loading;
}

export async function saveServiceAddresses(next: ServiceAddresses): Promise<void> {
  if (next.accountUrl === null && next.signalUrl === null) {
    await SecureStore.deleteItemAsync(SERVICE_ADDRESSES_KEY);
    publish(resolveServiceAddresses(null, buildAddresses));
    return;
  }
  await SecureStore.setItemAsync(SERVICE_ADDRESSES_KEY, JSON.stringify(next));
  publish(next);
}

export function useServiceAddresses(): ServiceAddresses {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void loadServiceAddresses();
      return () => listeners.delete(listener);
    },
    () => current,
    () => NO_SERVICE_ADDRESSES,
  );
}
