import { execFile } from "node:child_process";

export type MacSignature = "developer-id" | "adhoc" | "unsigned";

const CODESIGN_TIMEOUT_MS = 15_000;

export function parseCodesignDetails(output: string): MacSignature {
  if (/^Signature=adhoc$/mu.test(output)) return "adhoc";
  const team = /^TeamIdentifier=(.+)$/mu.exec(output)?.[1]?.trim();
  if (team === undefined || team === "" || team === "not set") return "unsigned";
  return /^Authority=Developer ID Application:/mu.test(output) ? "developer-id" : "unsigned";
}

export function installsUpdatesInPlace(platform: NodeJS.Platform, signature: MacSignature | null): boolean {
  return platform !== "darwin" || signature === "developer-id";
}

export function readMacSignature(bundlePath: string): Promise<MacSignature> {
  return new Promise((resolve) => {
    execFile(
      "codesign",
      ["--display", "--verbose=2", bundlePath],
      { timeout: CODESIGN_TIMEOUT_MS, encoding: "utf8" },
      (error, stdout, stderr) => {
        if (error) return resolve("unsigned");
        resolve(parseCodesignDetails(`${stdout}\n${stderr}`));
      },
    );
  });
}
