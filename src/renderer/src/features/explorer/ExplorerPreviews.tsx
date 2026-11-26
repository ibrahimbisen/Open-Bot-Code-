import { Button, ChevronRight } from "@codebot/ui";
import { MarkdownFilePreview } from "@codebot/ui/features/conversation/MarkdownFilePreview";
import { MediaFilePreview } from "@codebot/ui/features/conversation/MediaFilePreview";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import { type ExplorerJson, explorerDelimiter, parseExplorerJson, parseExplorerTable } from "./explorer-preview";

const JSON_PAGE = 100;
const JSON_AUTO_EXPAND_DEPTH = 1;

export function ExplorerMarkdownPreview(props: { body: string; onOpenLink: (url: string) => void }): JSX.Element {
  return (
    <MarkdownFilePreview
      class="file-preview-markdown explorer-preview-markdown"
      renderedClass="message-markdown"
      statusClass="file-preview-markdown-status"
      truncatedClass="file-preview-truncated"
      body={props.body}
      agents={[]}
      onSelectAgent={() => undefined}
      onOpenLink={props.onOpenLink}
      onOpenSharedFile={() => undefined}
    />
  );
}

export function ExplorerImagePreview(props: { url: string; name: string }): JSX.Element {
  const { t } = useText();
  const [failed, setFailed] = createSignal(false);
  return (
    <div class="file-preview-image-wrap explorer-preview-image">
      <Show when={!failed()} fallback={<p class="explorer-preview-note">{t("explorer.preview.imageFailed")}</p>}>
        <img class="file-preview-image" src={props.url} alt={props.name} onError={() => setFailed(true)} />
      </Show>
    </div>
  );
}

export function ExplorerPdfPreview(props: { url: string; name: string }): JSX.Element {
  return <iframe class="file-preview-pdf" title={props.name} src={props.url} />;
}

export function ExplorerMediaPreview(props: { kind: "audio" | "video"; url: string; name: string }): JSX.Element {
  return (
    <div class="explorer-preview-media">
      <MediaFilePreview
        kind={props.kind}
        src={props.url}
        name={props.name}
        class={props.kind === "audio" ? "file-preview-audio" : "file-preview-video"}
      />
    </div>
  );
}

export function ExplorerTablePreview(props: { text: string; name: string }): JSX.Element {
  const { t, format } = useText();
  const table = createMemo(() => parseExplorerTable(props.text, explorerDelimiter(props.name)));
  const header = () => table().rows[0] ?? [];
  const body = () => table().rows.slice(1);
  return (
    <div class="explorer-table-preview">
      <Show
        when={table().rows.length > 0}
        fallback={<p class="explorer-preview-note">{t("explorer.preview.empty")}</p>}
      >
        <div class="explorer-table-scroll">
          <table class="explorer-table">
            <thead>
              <tr>
                <td class="explorer-table-index" />
                <For each={header()} keyed={false}>
                  {(cell) => <th scope="col">{cell()}</th>}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={body()}>
                {(row, index) => (
                  <tr>
                    <th scope="row" class="explorer-table-index">
                      {index() + 1}
                    </th>
                    <For each={row} keyed={false}>
                      {(cell) => <td>{cell()}</td>}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
        <p class="explorer-preview-footer">
          {t("explorer.preview.tableSize", {
            rows: format.number(Math.max(0, table().rows.length - 1)),
            columns: format.number(table().columns),
          })}
          <Show when={table().truncatedRows || table().truncatedColumns}>
            {` ${t("explorer.preview.tableTruncated")}`}
          </Show>
        </p>
      </Show>
    </div>
  );
}

type JsonKind = "object" | "array" | "string" | "number" | "boolean" | "null";

function jsonKind(value: ExplorerJson): JsonKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "object";
}

function jsonEntries(value: ExplorerJson): [string, ExplorerJson][] {
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item]);
  if (value !== null && typeof value === "object") return Object.entries(value);
  return [];
}

function JsonNode(props: { name: string | null; value: ExplorerJson; depth: number }): JSX.Element {
  const { t } = useText();
  const kind = () => jsonKind(props.value);
  const container = () => kind() === "object" || kind() === "array";
  const entries = createMemo(() => jsonEntries(props.value));
  const [open, setOpen] = createSignal(props.depth < JSON_AUTO_EXPAND_DEPTH);
  const [shown, setShown] = createSignal(JSON_PAGE);
  const summary = () =>
    kind() === "array"
      ? t("explorer.preview.jsonItems", { count: entries().length })
      : t("explorer.preview.jsonKeys", { count: entries().length });
  return (
    <li class="explorer-json-node">
      <div class="explorer-json-line">
        <Show when={container()} fallback={<span class="explorer-json-twist" />}>
          <Button
            variant="ghost"
            size="icon-xs"
            class="explorer-json-toggle"
            aria-label={open() ? t("explorer.preview.collapse") : t("explorer.preview.expand")}
            aria-expanded={open() ? "true" : "false"}
            onClick={() => setOpen(!open())}
          >
            <ChevronRight class={open() ? "explorer-json-chevron-open" : undefined} aria-hidden="true" />
          </Button>
        </Show>
        <Show when={props.name !== null}>
          <span class="explorer-json-key">{props.name}</span>
          <span class="explorer-json-colon">:</span>
        </Show>
        <Switch>
          <Match when={container()}>
            <span class="explorer-json-summary">{summary()}</span>
          </Match>
          <Match when={kind() === "string"}>
            <span class="explorer-json-value" data-kind="string">
              {JSON.stringify(props.value)}
            </span>
          </Match>
          <Match when={true}>
            <span class="explorer-json-value" data-kind={kind()}>
              {String(props.value)}
            </span>
          </Match>
        </Switch>
      </div>
      <Show when={container() && open()}>
        <ul class="explorer-json-children">
          <For each={entries().slice(0, shown())}>
            {(entry) => <JsonNode name={entry[0]} value={entry[1]} depth={props.depth + 1} />}
          </For>
          <Show when={entries().length > shown()}>
            <li class="explorer-json-more">
              <Button variant="link" size="xs" onClick={() => setShown(shown() + JSON_PAGE)}>
                {t("explorer.preview.showMore", { count: entries().length - shown() })}
              </Button>
            </li>
          </Show>
        </ul>
      </Show>
    </li>
  );
}

export function ExplorerJsonPreview(props: { text: string }): JSX.Element {
  const { t } = useText();
  const parsed = createMemo(() => parseExplorerJson(props.text));
  const success = createMemo(() => {
    const result = parsed();
    return result.ok ? result : null;
  });
  const failure = createMemo(() => {
    const result = parsed();
    return result.ok ? null : result;
  });
  return (
    <div class="explorer-json-preview">
      <Show when={failure()}>
        {(result) => (
          <p class="explorer-preview-note explorer-preview-error">
            {t("explorer.preview.jsonInvalid", { detail: result().error })}
          </p>
        )}
      </Show>
      <Show when={success()}>
        {(result) => (
          <ul class="explorer-json-root" aria-label={t("explorer.preview.jsonLabel")}>
            <JsonNode name={null} value={result().value} depth={0} />
          </ul>
        )}
      </Show>
    </div>
  );
}
