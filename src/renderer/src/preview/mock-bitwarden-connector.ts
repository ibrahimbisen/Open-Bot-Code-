import {
  type BitwardenConnectorStatus,
  type CodeBotDesktopApi,
  DISCONNECTED_BITWARDEN_CONNECTOR,
} from "@codebot/contracts/ipc";

export function createMockBitwardenConnector(): CodeBotDesktopApi["bitwardenConnector"] {
  let status: BitwardenConnectorStatus = DISCONNECTED_BITWARDEN_CONNECTOR;
  let host: BitwardenConnectorStatus = DISCONNECTED_BITWARDEN_CONNECTOR;
  const listeners = new Set<(status: BitwardenConnectorStatus) => void>();
  const change = (next: BitwardenConnectorStatus) => {
    status = next;
    for (const listener of listeners) listener(status);
    return status;
  };
  return {
    status: async () => status,
    connect: async () => change({ ...DISCONNECTED_BITWARDEN_CONNECTOR, connected: true }),
    disconnect: async () => change(DISCONNECTED_BITWARDEN_CONNECTOR),
    onChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hostStatus: async () => host,
    hostConnect: async ({ serverUrl }) => {
      host = { ...DISCONNECTED_BITWARDEN_CONNECTOR, connected: true, serverUrl };
      return host;
    },
    hostDisconnect: async () => {
      host = DISCONNECTED_BITWARDEN_CONNECTOR;
      return host;
    },
  };
}
