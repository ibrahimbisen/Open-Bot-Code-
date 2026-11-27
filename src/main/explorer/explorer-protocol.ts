import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { type ExplorerRoot, type ExplorerScope, isExplorerScope } from "@codebot/contracts/ipc";
import { runCauseEffect } from "../../backend/effect-boundary";
import { attachmentCorsHeaders, attachmentDocumentHeaders } from "../chat-visual-protocol";
import { inlineContentDisposition } from "../content-disposition";
import { fileResponse } from "../file-response";
import { previewTypeForName } from "./explorer-file-kinds";
import { resolveInside } from "./explorer-paths";

const EXPLORER_FILE_HOST = "explorer";
const AGENT_SCOPE = "agent";

export function explorerFileUrl(
  scope: ExplorerScope,
  file: { path: string; name: string; modifiedAt: number; size: number },
): string {
  const query = new URLSearchParams({ path: file.path, v: `${file.modifiedAt}-${file.size}` });
  const owner = `${AGENT_SCOPE}/${encodeURIComponent(scope.agentId)}`;
  return `codebot-attachment://${EXPLORER_FILE_HOST}/${owner}/${encodeURIComponent(file.name)}?${query.toString()}`;
}

export function isExplorerFileRequest(url: URL): boolean {
  return url.hostname === EXPLORER_FILE_HOST;
}

function scopeOf(url: URL): ExplorerScope | null {
  const [kind, id] = url.pathname.split("/").filter(Boolean);
  if (kind !== AGENT_SCOPE || id === undefined) return null;
  try {
    const scope = { agentId: decodeURIComponent(id) };
    return isExplorerScope(scope) ? scope : null;
  } catch {
    return null;
  }
}

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

export function createExplorerProtocol(roots: (scope: ExplorerScope) => Promise<ExplorerRoot[]>) {
  return async function explorerFileResponse(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const scope = scopeOf(url);
      const path = url.searchParams.get("path");
      if (request.method !== "GET" || !scope || !path || url.username || url.password) return notFound();
      const resolved = await resolveInside(await roots(scope), path);
      const type = previewTypeForName(resolved.path);
      if (!type || !(await stat(resolved.real)).isFile()) return notFound();
      return await runCauseEffect(
        fileResponse(
          resolved.real,
          {
            "Content-Type": type.mimeType,
            "Cache-Control": "no-store",
            ...attachmentCorsHeaders(request.headers.get("Origin")),
            ...attachmentDocumentHeaders(type.mimeType),
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": inlineContentDisposition(basename(resolved.path)),
          },
          request.headers.get("Range"),
        ),
      );
    } catch {
      return notFound();
    }
  };
}
