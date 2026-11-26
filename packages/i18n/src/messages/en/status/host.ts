import { defineMessages } from "../../../message";

export const messages = defineMessages("status.host", {
  "status.host.registered": "Registered this CodeBot for WebRTC access.",
  "status.host.keyRotated": "Server key changed. Paired devices stay paired.",
  "status.host.identityUpdated": "Server identity updated.",
  "status.host.starting": "Starting the WebRTC host…",
  "status.host.ready": "This CodeBot is ready for WebRTC connections.",
  "status.host.signalLost": "Other devices cannot reach this CodeBot now. It connects again.",
  "status.host.stopping": "Making this CodeBot private…",
  "status.host.private": "This CodeBot is private.",
  "status.host.removed": "This CodeBot was removed from your account. Publish it again to share it.",
});
