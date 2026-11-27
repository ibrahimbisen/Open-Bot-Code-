import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import manifestUrl from "material-icon-theme/dist/material-icons.json?url";
import { createSignal } from "solid-js";

const iconFiles = import.meta.glob<string>("../../../../../node_modules/material-icon-theme/icons/*.svg", {
  query: "?no-inline",
  import: "default",
  eager: true,
  exhaustive: true,
});

const iconUrls = new Map<string, string>();
for (const [path, url] of Object.entries(iconFiles)) {
  const name = path.slice(path.lastIndexOf("/") + 1, -".svg".length);
  iconUrls.set(name, url);
}

type IconNames = ReadonlyMap<string, string>;

interface IconNameSet {
  fileNames: IconNames;
  fileExtensions: IconNames;
  folderNames: IconNames;
  folderNamesExpanded: IconNames;
}

interface IconManifest extends IconNameSet {
  file: string;
  folder: string;
  folderExpanded: string;
  rootFolder: string;
  rootFolderExpanded: string;
  light: IconNameSet;
}

const DEFAULTS = {
  file: "file",
  folder: "folder",
  folderExpanded: "folder-open",
  rootFolder: "folder-root",
  rootFolderExpanded: "folder-root-open",
} as const;

function names(value: unknown): IconNames {
  const found = new Map<string, string>();
  if (!isDynamicRecord(value)) return found;
  for (const [key, icon] of Object.entries(value)) if (isString(icon)) found.set(key.toLowerCase(), icon);
  return found;
}

function nameSet(value: unknown): IconNameSet {
  const record = isDynamicRecord(value) ? value : {};
  return {
    fileNames: names(record.fileNames),
    fileExtensions: names(record.fileExtensions),
    folderNames: names(record.folderNames),
    folderNamesExpanded: names(record.folderNamesExpanded),
  };
}

function readManifest(value: unknown): IconManifest {
  const record = isDynamicRecord(value) ? value : {};
  const named = (key: keyof typeof DEFAULTS) => {
    const icon = record[key];
    return isString(icon) ? icon : DEFAULTS[key];
  };
  return {
    ...nameSet(record),
    file: named("file"),
    folder: named("folder"),
    folderExpanded: named("folderExpanded"),
    rootFolder: named("rootFolder"),
    rootFolderExpanded: named("rootFolderExpanded"),
    light: nameSet(record.light),
  };
}

const [manifest, setManifest] = createSignal<IconManifest | null>(null);
let manifestRequest: Promise<void> | undefined;

export function loadExplorerIcons(): Promise<void> {
  manifestRequest ??= fetch(manifestUrl)
    .then((response) => response.json())
    .then(
      (value: unknown) => {
        setManifest(readManifest(value));
      },
      () => {
        manifestRequest = undefined;
      },
    );
  return manifestRequest;
}

export interface ExplorerIconTarget {
  name: string;
  directory: boolean;
  expanded?: boolean;
  root?: boolean;
  light?: boolean;
}

function fileIcon(sets: readonly IconNameSet[], name: string): string | undefined {
  for (const set of sets) {
    const exact = set.fileNames.get(name);
    if (exact) return exact;
  }
  for (let dot = name.indexOf("."); dot !== -1; dot = name.indexOf(".", dot + 1)) {
    const extension = name.slice(dot + 1);
    if (extension === "") break;
    for (const set of sets) {
      const icon = set.fileExtensions.get(extension);
      if (icon) return icon;
    }
  }
  return undefined;
}

function folderIcon(sets: readonly IconNameSet[], name: string, expanded: boolean): string | undefined {
  for (const set of sets) {
    const icon = (expanded ? set.folderNamesExpanded : set.folderNames).get(name);
    if (icon) return icon;
  }
  return undefined;
}

function explorerIconName(target: ExplorerIconTarget): string {
  const loaded = manifest();
  const name = target.name.toLowerCase();
  if (!loaded) {
    if (!target.directory) return DEFAULTS.file;
    return target.expanded ? DEFAULTS.folderExpanded : DEFAULTS.folder;
  }
  const sets = target.light ? [loaded.light, loaded] : [loaded];
  if (!target.directory) return fileIcon(sets, name) ?? loaded.file;
  const expanded = target.expanded === true;
  const named = folderIcon(sets, name, expanded);
  if (named) return named;
  if (target.root) return expanded ? loaded.rootFolderExpanded : loaded.rootFolder;
  return expanded ? loaded.folderExpanded : loaded.folder;
}

export function explorerIconUrl(target: ExplorerIconTarget): string {
  return (
    iconUrls.get(explorerIconName(target)) ?? iconUrls.get(target.directory ? DEFAULTS.folder : DEFAULTS.file) ?? ""
  );
}
