import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import CssWorker from "monaco-editor/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker?worker";

const WORKERS: Readonly<Record<string, new () => Worker>> = {
  json: JsonWorker,
  css: CssWorker,
  scss: CssWorker,
  less: CssWorker,
  html: HtmlWorker,
  handlebars: HtmlWorker,
  razor: HtmlWorker,
  typescript: TypeScriptWorker,
  javascript: TypeScriptWorker,
};

globalThis.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    const Worker = WORKERS[label] ?? EditorWorker;
    return new Worker();
  },
};

monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSuggestionDiagnostics: true,
});
monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSuggestionDiagnostics: true,
});

export { monaco };
