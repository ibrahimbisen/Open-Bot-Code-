import { join } from "node:path";
import { app, shell } from "electron";
import { installerDownloadUrl } from "./app-update/installer-download";
import { resolveInstalledUpdateFeed, UPDATE_FEED_FILE } from "./app-update/update-feed";

export function updateFolderUrl(): string | null {
  return resolveInstalledUpdateFeed({
    storePath: join(app.getPath("userData"), UPDATE_FEED_FILE),
    environment: process.env,
    buildConfigPath: app.isPackaged ? join(process.resourcesPath, "app-update.yml") : null,
  }).url;
}

export function hasDownloadSource(): boolean {
  return updateFolderUrl() !== null;
}

export async function downloadUrl(version?: string | null): Promise<string | null> {
  const feedUrl = updateFolderUrl();
  if (feedUrl === null) return null;
  return installerDownloadUrl({ feedUrl, version, platform: process.platform, arch: process.arch });
}

export async function openDownload(version?: string | null): Promise<boolean> {
  const url = await downloadUrl(version);
  if (url === null) return false;
  await shell.openExternal(url);
  return true;
}

export async function openUpdateFolder(): Promise<boolean> {
  const url = updateFolderUrl();
  if (url === null) return false;
  await shell.openExternal(url);
  return true;
}
