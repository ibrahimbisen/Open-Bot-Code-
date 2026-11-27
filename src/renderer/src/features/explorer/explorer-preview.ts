import type { ExplorerFile } from "@codebot/contracts/ipc";

export type ExplorerPreviewKind = "markdown" | "json" | "table" | "svg" | "image" | "pdf" | "audio" | "video";

const CSV_MAX_ROWS = 2_000;
const CSV_MAX_COLUMNS = 100;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export function explorerPreviewKind(
  file: Pick<ExplorerFile, "kind" | "name" | "text" | "url">,
): ExplorerPreviewKind | null {
  switch (file.kind) {
    case "image":
    case "pdf":
    case "audio":
    case "video":
      return file.url ? file.kind : null;
    case "svg":
      return file.url ? "svg" : null;
    case "text": {
      if (!file.text) return null;
      const extension = extensionOf(file.name);
      if (extension === "md" || extension === "markdown" || extension === "mdx") return "markdown";
      if (extension === "json" || extension === "jsonc" || extension === "geojson") return "json";
      if (extension === "csv" || extension === "tsv") return "table";
      return null;
    }
    default:
      return null;
  }
}

export function explorerDelimiter(name: string): "	" | "," {
  return extensionOf(name) === "tsv" ? "\t" : ",";
}

export interface ExplorerTable {
  rows: string[][];
  columns: number;
  truncatedRows: boolean;
  truncatedColumns: boolean;
}

export function parseExplorerTable(text: string, delimiter: string): ExplorerTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let columns = 0;
  let truncatedRows = false;
  let truncatedColumns = false;
  const endField = () => {
    if (row.length < CSV_MAX_COLUMNS) row.push(field);
    else truncatedColumns = true;
    field = "";
  };
  const endRow = () => {
    endField();
    columns = Math.max(columns, row.length);
    rows.push(row);
    row = [];
  };
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (quoted) {
      if (char === '"') {
        if (text.charAt(index + 1) === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === delimiter) endField();
    else if (char === "\n") {
      endRow();
      if (rows.length > CSV_MAX_ROWS) {
        truncatedRows = true;
        rows.pop();
        return { rows, columns, truncatedRows, truncatedColumns };
      }
    } else if (char !== "\r") field += char;
  }
  if (field !== "" || row.length > 0) endRow();
  if (rows.length > CSV_MAX_ROWS) {
    truncatedRows = true;
    rows.length = CSV_MAX_ROWS;
  }
  return { rows, columns, truncatedRows, truncatedColumns };
}

export type ExplorerJson = string | number | boolean | null | ExplorerJson[] | { [key: string]: ExplorerJson };

export type ExplorerJsonResult = { ok: true; value: ExplorerJson } | { ok: false; error: string };

export function parseExplorerJson(text: string): ExplorerJsonResult {
  try {
    const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    return { ok: true, value: JSON.parse(stripped) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
