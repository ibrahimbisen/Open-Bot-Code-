import { Spinner } from "@codebot/ui";
import { documentColorScheme } from "@codebot/ui/document-color-scheme";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, onCleanup, onSettled, Show } from "solid-js";
import { monacoFontFamily } from "./CodeEditor";
import { applyMonacoTheme, loadMonaco, type Monaco, monacoLanguageFor } from "./monaco-runtime";

export interface DiffEditorViewProps {
  name: string;
  original: string;
  modified: string;
  sideBySide: boolean;
}

let modelCounter = 0;

export function DiffEditorView(props: DiffEditorViewProps): JSX.Element {
  const { t } = useText();
  const [state, setState] = createSignal<"loading" | "ready" | "failed">("loading");
  let host: HTMLElement | undefined;
  let api: Monaco | undefined;
  let editor: ReturnType<Monaco["editor"]["createDiffEditor"]> | undefined;
  let originalModel: ReturnType<Monaco["editor"]["createModel"]> | undefined;
  let modifiedModel: ReturnType<Monaco["editor"]["createModel"]> | undefined;
  let disposed = false;

  onCleanup(() => {
    disposed = true;
    editor?.setModel(null);
    editor?.dispose();
    originalModel?.dispose();
    modifiedModel?.dispose();
    editor = undefined;
  });

  onSettled(() => {
    void loadMonaco().then(
      (monaco) => {
        if (disposed || !host) return;
        api = monaco;
        modelCounter += 1;
        const language = monacoLanguageFor(monaco, props.name);
        const uri = (side: string) =>
          monaco.Uri.from({ scheme: "codebot-diff", path: `/${modelCounter}/${side}/${props.name}` });
        originalModel = monaco.editor.createModel(props.original, language, uri("original"));
        modifiedModel = monaco.editor.createModel(props.modified, language, uri("modified"));
        applyMonacoTheme(monaco, documentColorScheme());
        editor = monaco.editor.createDiffEditor(host, {
          readOnly: true,
          originalEditable: false,
          renderSideBySide: props.sideBySide,
          useInlineViewWhenSpaceIsLimited: false,
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: monacoFontFamily(),
          fontSize: 12.5,
          lineHeight: 19,
          padding: { top: 8, bottom: 8 },
          fixedOverflowWidgets: true,
          renderOverviewRuler: false,
          ignoreTrimWhitespace: false,
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        });
        editor.setModel({ original: originalModel, modified: modifiedModel });
        setState("ready");
      },
      () => setState("failed"),
    );
  });

  createEffect(
    () => ({ original: props.original, modified: props.modified }),
    ({ original, modified }) => {
      if (originalModel && originalModel.getValue() !== original) originalModel.setValue(original);
      if (modifiedModel && modifiedModel.getValue() !== modified) modifiedModel.setValue(modified);
    },
  );
  createEffect(
    () => props.sideBySide,
    (sideBySide) => {
      editor?.updateOptions({ renderSideBySide: sideBySide });
    },
  );
  createEffect(
    () => documentColorScheme(),
    (scheme) => {
      if (api) applyMonacoTheme(api, scheme);
    },
  );

  return (
    <div class="explorer-editor">
      <section ref={host} class="explorer-editor-host" aria-label={t("explorer.diff.label", { name: props.name })} />
      <Show when={state() !== "ready"}>
        <div class="explorer-editor-state">
          <Show when={state() === "loading"} fallback={<p>{t("explorer.file.editorFailed")}</p>}>
            <Spinner />
          </Show>
        </div>
      </Show>
    </div>
  );
}
