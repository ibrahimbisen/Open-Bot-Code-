import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { validUpdateFeedUrl } from "../../src/main/app-update/update-feed";

const ENVIRONMENT_VARIABLE = "CODEBOT_UPDATE_URL";

function resolveFeedUrl(value: string | undefined): string {
  const text = value?.trim() ?? "";
  if (text === "") return "";
  const url = validUpdateFeedUrl(text);
  if (url === null) {
    throw new Error(
      `${ENVIRONMENT_VARIABLE} is not a valid update server URL. Use an https:// URL of the update folder, for example https://example.com/codebot-updates/.`,
    );
  }
  return url;
}

export function builderEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...environment, [ENVIRONMENT_VARIABLE]: resolveFeedUrl(environment[ENVIRONMENT_VARIABLE]) };
}

function builderCli(): string {
  const require = createRequire(import.meta.url);
  const packageJson = require.resolve("electron-builder/package.json");
  return join(dirname(packageJson), "out", "cli", "cli.js");
}

if (import.meta.main) {
  const result = spawnSync("node", [builderCli(), ...process.argv.slice(2)], {
    env: builderEnvironment(process.env),
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
