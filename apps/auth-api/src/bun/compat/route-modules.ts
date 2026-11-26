import { resolve } from "node:path";
import * as requestAuth from "./request-auth";
import * as sourceIp from "./source-ip";
import * as tanstackRoute from "./tanstack-route";

const SERVER_DIRECTORY = resolve(import.meta.dirname, "../../server");

let installed = false;

function spellings(path: string): string[] {
  return [...new Set([path, path.replaceAll("\\", "/")])];
}

export function installRouteCompat(): void {
  if (installed) return;
  installed = true;
  Bun.plugin({
    name: "account-route-compat",
    setup(build) {
      for (const path of spellings(resolve(SERVER_DIRECTORY, "request-auth.ts"))) {
        build.module(path, () => ({ exports: { ...requestAuth }, loader: "object" }));
      }
      for (const path of spellings(resolve(SERVER_DIRECTORY, "source-ip.ts"))) {
        build.module(path, () => ({ exports: { ...sourceIp }, loader: "object" }));
      }
      build.module("@tanstack/solid-router", () => ({ exports: { ...tanstackRoute }, loader: "object" }));
    },
  });
}
