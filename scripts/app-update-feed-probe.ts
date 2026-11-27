import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import type { RequestOptions } from "node:http";
import { join } from "node:path";
import type { UpdateInfo } from "electron-updater";
import { AppUpdater } from "electron-updater/out/AppUpdater";
import { stringify } from "yaml";

export const INSTALLER = Buffer.from("CodeBot installer bytes for the local update feed test");
const sha512 = createHash("sha512").update(INSTALLER).digest("base64");

export function manifest(version: string, file = `CodeBot-${version}-x64.exe`): string {
  return stringify({
    version,
    files: [{ url: file, sha512, size: INSTALLER.length }],
    path: file,
    sha512,
    releaseDate: "2026-01-01T00:00:00.000Z",
  });
}

export class FeedProbeUpdater extends AppUpdater {
  downloaded: string[] = [];
  installs = 0;
  readonly #downloadFolder: string;
  constructor(userData: string, version: string, downloadFolder: string, platform: NodeJS.Platform = "win32") {
    mkdirSync(userData, { recursive: true });
    writeFileSync(join(userData, "app-update.yml"), "provider: generic\nurl: http://127.0.0.1:1/\n");
    super(null, {
      version,
      name: "CodeBot",
      isPackaged: true,
      appUpdateConfigPath: join(userData, "app-update.yml"),
      userDataPath: userData,
      baseCachePath: join(userData, "cache"),
      whenReady: () => Promise.resolve(),
      relaunch: () => undefined,
      quit: () => undefined,
      onQuit: () => undefined,
    });
    this.#downloadFolder = downloadFolder;
    this.logger = null;
    Object.assign(this, {
      _testOnlyOptions: { platform },
      httpExecutor: {
        request: async (request: RequestOptions) => {
          const response = await fetch(`http://${request.hostname}:${request.port}${request.path}`);
          if (!response.ok) throw new Error(`HTTP ${response.status} for ${request.path}`);
          return response.text();
        },
      },
    });
  }

  protected async doDownloadUpdate(options: {
    updateInfoAndProvider: { info: UpdateInfo };
  }): Promise<{ updateFile: string }> {
    const { info } = options.updateInfoAndProvider;
    const file = info.files[0];
    if (!file) throw new Error("The manifest lists no file.");
    const response = await fetch(new URL(file.url, this.feedUrl));
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${file.url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash("sha512").update(bytes).digest("base64") !== file.sha512) throw new Error("sha512 mismatch");
    this.downloaded.push(file.url);
    this.emit("download-progress", {
      total: bytes.length,
      delta: bytes.length,
      transferred: bytes.length,
      percent: 100,
      bytesPerSecond: 1,
    });
    const updateFile = join(this.#downloadFolder, file.url);
    this.dispatchUpdateDownloaded({ ...info, downloadedFile: updateFile });
    return { updateFile };
  }

  feedUrl = "";

  override setFeedURL(options: { provider: "generic"; url: string }): void {
    this.feedUrl = options.url;
    super.setFeedURL(options);
  }

  quitAndInstall(): void {
    this.installs += 1;
  }
}
