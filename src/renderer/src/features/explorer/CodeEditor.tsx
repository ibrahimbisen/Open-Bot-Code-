import { Spinner } from "@codebot/ui";
import { documentColorScheme } from "@codebot/ui/document-color-scheme";
import { useText } from "@codebot/ui/text";
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, onCleanup, onSettled, Show } from "solid-js";
import { applyMonacoTheme, loadMonaco, type Monaco, monacoLanguageFor } from "./monaco-runtime";

interface CodeEditorHandle {
  focus: () => void;
  revealLine: (line: number) => void;
}

export interface CodeEditorProps {
  name: string;
  value: string;
  readOnly: boolean;
  wrap: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  handle?: ((handle: CodeEditorHandle) => void) | undefined;
}

let modelCounter = 0;

export function monacoFontFamily(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--codebot-font-mono").trim() || "monospace";
}

export function CodeEditor(props: CodeEditorProps): JSX.Element {
  const { t } = useText();
  const [state, setState] = createSignal<"loading" | "ready" | "failed">("loading");
  let host: HTMLElement | undefined;
  let api: Monaco | undefined;
  let editor: ReturnType<Monaco["editor"]["create"]> | undefined;
  let model: ReturnType<Monaco["editor"]["createModel"]> | undefined;
  let disposed = false;

  onCleanup(() => {
    disposed = true;
    editor?.dispose();
    model?.dispose();
    editor = undefined;
    model = undefined;
  });

  onSettled(() => {
    void loadMonaco().then(
      (monaco) => {
        if (disposed || !host) return;
        api = monaco;
        modelCounter += 1;
        model = monaco.editor.createModel(
          props.value,
          monacoLanguageFor(monaco, props.name),
          monaco.Uri.from({ scheme: "codebot-file", path: `/${modelCounter}/${props.name}` }),
        );
        model.setEOL(monaco.editor.EndOfLineSequence.LF);
        applyMonacoTheme(monaco, documentColorScheme());
        editor = monaco.editor.create(host, {
          model,
          readOnly: props.readOnly,
          wordWrap: props.wrap ? "on" : "off",
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: monacoFontFamily(),
          fontSize: 12.5,
          lineHeight: 19,
          renderWhitespace: "selection",
          padding: { top: 8, bottom: 8 },
          fixedOverflowWidgets: true,
          fontLigatures: false,
          tabSize: 2,
          detectIndentation: true,
          smoothScrolling: false,
          contextmenu: true,
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          overviewRulerBorder: false,
          stickyScroll: { enabled: false },
        });
        editor.onDidChangeModelContent(() => {
          if (model) props.onChange(model.getValue());
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => props.onSave());
        props.handle?.({
          focus: () => editor?.focus(),
          revealLine: (line) => editor?.revealLineInCenter(line),
        });
        setState("ready");
      },
      () => setState("failed"),
    );
  });

  createEffect(
    () => props.value,
    (value) => {
      if (model && model.getValue() !== value) model.setValue(value);
    },
  );
  createEffect(
    () => ({ readOnly: props.readOnly, wrap: props.wrap }),
    ({ readOnly, wrap }) => {
      editor?.updateOptions({ readOnly, wordWrap: wrap ? "on" : "off" });
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
      <section
        ref={host}
        class="explorer-editor-host"
        aria-label={t("explorer.file.editorLabel", { name: props.name })}
      />
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
