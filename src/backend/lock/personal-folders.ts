import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, parse, resolve, win32 } from "node:path";
import { isPathInside } from "../path-containment";

interface FolderFacts {
  readonly platform: NodeJS.Platform;
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
}

type PersonalFolderSource = () => readonly string[];

let source: PersonalFolderSource | null = null;
let cached: { readonly key: string; readonly folders: readonly string[]; readonly at: number } | null = null;

const REUSE_MS = 60_000;
const REGISTRY_TIMEOUT_MS = 3_000;
const WINDOWS_SHELL_FOLDERS = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders";
const WINDOWS_SHELL_FOLDER_NAMES = new Set([
  "desktop",
  "personal",
  "my pictures",
  "my music",
  "my video",
  "{374de290-123f-4565-9164-39c4925e467b}",
]);
const WINDOWS_FOLDERS = ["Desktop", "Documents", "Downloads", "Pictures", "Music", "Videos"];
const MACOS_FOLDERS = [
  "Desktop",
  "Documents",
  "Downloads",
  "Pictures",
  "Music",
  "Movies",
  "Library/Mobile Documents",
  "Library/CloudStorage",
];
const XDG_FOLDERS: Readonly<Record<string, string>> = {
  XDG_DESKTOP_DIR: "Desktop",
  XDG_DOCUMENTS_DIR: "Documents",
  XDG_DOWNLOAD_DIR: "Downloads",
  XDG_PICTURES_DIR: "Pictures",
  XDG_MUSIC_DIR: "Music",
  XDG_VIDEOS_DIR: "Videos",
};
const CLOUD_FOLDER =
  /^(?:OneDrive|Dropbox|Google ?Drive|My Drive|iCloud ?Drive|iCloud ?Photos|Box(?: Sync)?|Nextcloud|ownCloud|pCloud ?Drive|MEGA(?:sync)?|Seafile|Proton ?Drive|Tresorit|Yandex\.?Disk|SynologyDrive|Koofr)(?:$|[ ._(-])/iu;
const WINDOWS_CLOUD_VARIABLES = ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"];

export function setPersonalFolderSource(next: PersonalFolderSource | null): void {
  source = next;
  cached = null;
}

export function personalFolders(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string[] {
  if (source) return usable(source(), home);
  const key = JSON.stringify([platform, home, env.XDG_CONFIG_HOME ?? "", env.OneDrive ?? ""]);
  if (cached && cached.key === key && Date.now() - cached.at < REUSE_MS) return [...cached.folders];
  const folders = usable(detected({ platform, env, home }), home);
  cached = { key, folders, at: Date.now() };
  return [...folders];
}

export function strictHiddenFolders(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string[] {
  const homes = dirname(home);
  const homeArea = /^(?:home|users)$/iu.test(parse(homes).base) ? homes : home;
  return unique([homeArea, ...otherVolumes(platform, env, home)]);
}

function detected(facts: FolderFacts): string[] {
  if (facts.platform === "win32") return [...windowsFolders(facts), ...cloudFolders(facts.home)];
  if (facts.platform === "darwin")
    return [...MACOS_FOLDERS.map((name) => join(facts.home, name)), ...cloudFolders(facts.home)];
  return [...xdgFolders(facts), ...cloudFolders(facts.home)];
}

function windowsFolders({ env, home }: FolderFacts): string[] {
  return [
    ...WINDOWS_FOLDERS.map((name) => win32.join(home, name)),
    ...WINDOWS_CLOUD_VARIABLES.flatMap((name) => {
      const value = env[name]?.trim();
      return value ? [value] : [];
    }),
    ...windowsShellFolders(env),
  ];
}

function windowsShellFolders(env: NodeJS.ProcessEnv): string[] {
  let output: string;
  try {
    output = execFileSync(
      win32.join(env.SystemRoot ?? "C:\\Windows", "System32", "reg.exe"),
      ["query", WINDOWS_SHELL_FOLDERS],
      { encoding: "utf8", timeout: REGISTRY_TIMEOUT_MS, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return [];
  }
  return output.split(/\r?\n/u).flatMap((line) => {
    const match = /^\s+(.+?)\s+REG_(?:EXPAND_)?SZ\s+(.+?)\s*$/u.exec(line);
    if (!match?.[1] || !match[2] || !WINDOWS_SHELL_FOLDER_NAMES.has(match[1].toLowerCase())) return [];
    return [match[2].replace(/%([^%]+)%/gu, (text, name: string) => env[name] ?? text)];
  });
}

function xdgFolders({ env, home }: FolderFacts): string[] {
  const configured = new Map<string, string>();
  const file = join(env.XDG_CONFIG_HOME?.trim() || join(home, ".config"), "user-dirs.dirs");
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    text = "";
  }
  for (const line of text.split(/\r?\n/u)) {
    const match = /^\s*(XDG_[A-Z]+_DIR)\s*=\s*"?([^"]*)"?\s*$/u.exec(line);
    if (!match?.[1] || match[2] === undefined || !(match[1] in XDG_FOLDERS)) continue;
    configured.set(match[1], match[2].replace(/^\$HOME(?=\/|$)/u, home).replace(/^\$\{HOME\}(?=\/|$)/u, home));
  }
  return Object.entries(XDG_FOLDERS).map(([name, fallback]) => configured.get(name) ?? join(home, fallback));
}

function cloudFolders(home: string): string[] {
  try {
    return readdirSync(home, { withFileTypes: true })
      .filter((entry) => (entry.isDirectory() || entry.isSymbolicLink()) && CLOUD_FOLDER.test(entry.name))
      .map((entry) => join(home, entry.name));
  } catch {
    return [];
  }
}

function otherVolumes(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, home: string): string[] {
  if (platform === "darwin") return ["/Volumes"];
  if (platform !== "win32") return ["/mnt", "/media", "/run/media"];
  const system = (env.SystemDrive ?? parse(home).root).slice(0, 1).toUpperCase();
  const drives: string[] = [];
  for (let code = 65; code <= 90; code += 1) {
    const letter = String.fromCharCode(code);
    if (letter !== system && existsSync(`${letter}:\\`)) drives.push(`${letter}:\\`);
  }
  return drives;
}

function usable(folders: readonly string[], home: string): string[] {
  const homeRoot = resolve(home);
  return unique(
    folders
      .map((folder) => folder.trim())
      .filter((folder) => folder !== "" && isAbsolute(folder))
      .map((folder) => resolve(folder))
      .filter((folder) => !isPathInside(folder, homeRoot)),
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
