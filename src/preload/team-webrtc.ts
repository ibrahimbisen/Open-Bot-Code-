import { type IpcRendererEvent, ipcRenderer } from "electron";

ipcRenderer.once("codebot-team-webrtc-port", (event: IpcRendererEvent) => {
  const port = event.ports[0];
  if (!port) throw new Error("The Team WebRTC message port is missing.");
  window.postMessage("codebot-team-webrtc-port", "*", [port]);
});
