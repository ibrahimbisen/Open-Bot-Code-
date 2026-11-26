# Local model servers and the status bar

Work package W13. PRD items 6.11, 13.1 to 13.4, 17.1 (UI part), 17.2 to 17.4.

## What a machine is

A local machine is one entry of the custom endpoint store (`codebot-custom-providers-v1.json`). It has
a name, an OpenAI-compatible base URL, an optional key, and an optional `machine` field:

- `monitored`: status polling on or off. An entry that has no value is polled when its address is on
  the local network.
- `gpuStatusUrl`: an address that shows GPU load and memory (JSON, nvidia-smi exporter or DCGM exporter).
- `gpuStatusUsesKey`: send the key to the GPU status address. Only the same origin gets it.

Each machine is its own entry. Add several DGX Spark units as several entries. Phase 1 needs no local
server: with no entry, the footer is hidden and Settings shows an empty list.

## What CodeBot reads

The monitor (`src/main/local-model-servers/`) reads, for each machine:

- `GET /v1/models` for the model list, and the kind of server (Ollama, LM Studio, vLLM, other).
- Ollama `/api/ps` and `/api/version`, LM Studio and vLLM model data, vLLM `/metrics` (KV cache,
  requests running and waiting).
- The GPU status address, when it is set.

An offline machine is read less often. Polling stops when no window shows the status.

The key goes only to the origin of the base URL. No redirect is followed.

## GPU status helper

Run `bun scripts/codebot/gpu-status-server.ts --host <address> --port <port>` on the GPU machine. It
serves the result of `nvidia-smi` as JSON on `GET /`. Use the address as the GPU status address.

## Where it shows

- Footer of the left bar (`StatusFooter`): the 5-hour and weekly limits of each provider that reports
  them, and one line for each machine.
- Click the footer: the status dialog (`StatusDetailView`) shows each provider and each machine.
- Settings, Server settings, "Local servers": list, add, edit, remove, test, and find a machine by host.

## Tests

`bun run test:local-model-servers` writes `.codebot-build/local-model-servers-e2e/report.json`.
