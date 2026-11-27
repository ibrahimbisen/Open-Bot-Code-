import { isDynamicRecord, isNumber, isString } from "@codebot/contracts/runtime-values";
import type { SerializedDockview } from "dockview-core";

const DOCK_LAYOUT_STORAGE_PREFIX = "codebot:project-dock:v1";
const ACTIVE_PROJECT_STORAGE_KEY = "codebot:active-project:v1";

type LayoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function dockLayoutKey(serverId: string, projectId: string): string {
  return `${DOCK_LAYOUT_STORAGE_PREFIX}:${serverId}:${projectId}`;
}

function isSerializedDockview(value: unknown): value is SerializedDockview {
  if (!isDynamicRecord(value) || !isDynamicRecord(value.grid) || !isDynamicRecord(value.panels)) return false;
  const { root, width, height, orientation } = value.grid;
  if (!isDynamicRecord(root) || !isNumber(width) || !isNumber(height) || !isString(orientation)) return false;
  return Object.values(value.panels).every((panel) => isDynamicRecord(panel) && isString(panel.id));
}

function storedDockLayout(value: unknown): SerializedDockview | null {
  return isSerializedDockview(value) ? value : null;
}

export function readDockLayout(
  serverId: string,
  projectId: string,
  storage: LayoutStorage = window.localStorage,
): SerializedDockview | null {
  try {
    return storedDockLayout(JSON.parse(storage.getItem(dockLayoutKey(serverId, projectId)) ?? "null"));
  } catch {
    return null;
  }
}

export function writeDockLayout(
  serverId: string,
  projectId: string,
  layout: SerializedDockview,
  storage: LayoutStorage = window.localStorage,
): void {
  try {
    storage.setItem(dockLayoutKey(serverId, projectId), JSON.stringify(layout));
  } catch {}
}

function storedActiveProjects(stored: unknown): Record<string, string> {
  if (!isDynamicRecord(stored)) return {};
  return Object.fromEntries(Object.entries(stored).flatMap(([key, value]) => (isString(value) ? [[key, value]] : [])));
}

function readActiveProjects(storage: LayoutStorage): Record<string, string> {
  try {
    return storedActiveProjects(JSON.parse(storage.getItem(ACTIVE_PROJECT_STORAGE_KEY) ?? "{}"));
  } catch {
    return {};
  }
}

export function readActiveProjectId(serverId: string, storage: LayoutStorage = window.localStorage): string | null {
  return readActiveProjects(storage)[serverId] ?? null;
}

export function writeActiveProjectId(
  serverId: string,
  projectId: string | null,
  storage: LayoutStorage = window.localStorage,
): void {
  const stored = readActiveProjects(storage);
  if (projectId) stored[serverId] = projectId;
  else delete stored[serverId];
  try {
    storage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify(stored));
  } catch {}
}
