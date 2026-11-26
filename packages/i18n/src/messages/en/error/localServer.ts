import { defineMessages } from "../../../message";

export const messages = defineMessages("error.localServer", {
  "error.localServer.refused":
    "The model server at {host} refused the connection. Start the model server on that machine.",
  "error.localServer.hostNotFound": "The address {host} was not found. Check the name of the machine.",
  "error.localServer.timeout": "The model server at {host} gave no answer in {seconds} seconds.",
  "error.localServer.unreachable":
    "The model server at {host} is not reachable. Make sure that the machine is on and on your network.",
  "error.localServer.redirect":
    "The model server at {host} sent a redirect. CodeBot does not follow a redirect, to keep the API key safe.",
  "error.localServer.keyNeeded": "The model server at {host} needs an API key. Add the key of this machine.",
  "error.localServer.keyRefused": "The model server at {host} refused the API key. Check the key of this machine.",
  "error.localServer.http": "The model server at {host} answered with the HTTP status {status}.",
  "error.localServer.invalidAnswer": "The model server at {host} sent no OpenAI-compatible model list.",
  "error.localServer.tooLarge": "The answer of the model server at {host} is too large.",
  "error.localServer.gpuUnreachable": "The GPU status address {host} is not reachable.",
  "error.localServer.gpuTimeout": "The GPU status address {host} gave no answer in {seconds} seconds.",
  "error.localServer.gpuRedirect": "The GPU status address {host} sent a redirect. CodeBot does not follow a redirect.",
  "error.localServer.gpuHttp": "The GPU status address {host} answered with the HTTP status {status}.",
  "error.localServer.gpuInvalid": "The GPU status address {host} sent no GPU values that CodeBot can read.",
  "error.localServer.gpuTooLarge": "The answer of the GPU status address {host} is too large.",
  "error.localServer.gpuUrlInvalid":
    "The GPU status URL must be an http or https address with no user name and no password.",
  "error.localServer.gpuKeyOtherOrigin":
    "The API key can go to the GPU status URL only when that URL has the same origin as the base URL.",
  "error.localServer.scanHostInvalid": "Enter a host name, an IP address, or an http or https address.",
});
