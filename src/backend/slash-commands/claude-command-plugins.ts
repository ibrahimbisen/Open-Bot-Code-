import { createHash, randomUUID } from "node:crypto";
import { mkdir, readlink, rename, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SdkPluginConfig } from "@anthropic-ai/claude-agent-sdk";
import { Effect, Result } from "effect";
import { isMissingFileError } from "../file-errors";
import { type ProviderClientOperationError, providerCall } from "../provider-client-effects";

export const CLAUDE_PROJECT_PLUGIN = "project";
export const CLAUDE_USER_PLUGIN = "user";

export type ClaudeCommandPluginName = typeof CLAUDE_PROJECT_PLUGIN | typeof CLAUDE_USER_PLUGIN;

const LINKED_FOLDERS = ["skills", "commands"] as const;

const currentLink = Effect.fn("SlashCommands.currentLink")((path: string) =>
  providerCall(() => readlink(path)).pipe(
    Effect.catch((error) => (isMissingFileError(error.cause) ? Effect.succeed(null) : Effect.fail(error))),
  ),
);

const linkFolder = Effect.fn("SlashCommands.linkFolder")(function* (link: string, target: string) {
  if ((yield* currentLink(link)) === target) return;
  const staged = `${link}.${randomUUID()}`;
  yield* providerCall(() => symlink(target, staged, "junction"));
  const moved = yield* Effect.result(providerCall(() => rename(staged, link)));
  if (Result.isSuccess(moved)) return;
  yield* providerCall(() => rm(staged, { force: true })).pipe(Effect.ignore);
  if ((yield* currentLink(link)) !== target) return yield* Effect.fail(moved.failure);
});

export const claudeCommandPlugin = Effect.fn("SlashCommands.claudeCommandPlugin")(function* (
  stateDirectory: string,
  name: ClaudeCommandPluginName,
  folder: string,
): Effect.fn.Return<SdkPluginConfig, ProviderClientOperationError> {
  const directory = join(
    stateDirectory,
    "claude-command-plugins",
    `${name}-${createHash("sha256").update(folder).digest("hex")}`,
  );
  yield* providerCall(() => mkdir(join(directory, ".claude-plugin"), { recursive: true, mode: 0o700 }));
  yield* providerCall(() =>
    writeFile(join(directory, ".claude-plugin", "plugin.json"), `${JSON.stringify({ name })}\n`),
  );
  for (const part of LINKED_FOLDERS) yield* linkFolder(join(directory, part), join(folder, part));
  return { type: "local", path: directory };
});
