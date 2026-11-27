import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/slash";

export const messages = {
  "slash.picker.label": "コマンド",
  "slash.picker.option": "コマンド /{name}",
  "slash.picker.none":
    "エンジンはまだコマンドを報告していません。OpenBot Code はエンジンの起動時にコマンドを読み取ります。",
  "slash.picker.noMatch": "「{query}」に一致するコマンドはありません。",
  "slash.badge.project": "プロジェクト",
  "slash.badge.user": "ユーザー",
  "slash.badge.plugin": "プラグイン",
  "slash.badge.mcp": "MCP",
  "slash.badge.skill": "スキル",
  "slash.badge.host": "OpenBot Code",
  "slash.badge.terminal": "ターミナル専用",
  "slash.screen.close": "閉じる",
  "slash.screen.loading": "読み込み中…",
  "slash.model.title": "モデルを選択",
  "slash.model.description": "{name} は次のメッセージからこのモデルを使います。",
  "slash.model.empty": "このエージェントで使えるモデルがありません。",
  "slash.model.failed": "モデルが変更されませんでした。",
  "slash.effort.title": "思考レベル",
  "slash.effort.description": "{name} が回答する前にどれだけ考えるか。",
  "slash.effort.unsupported": "このエージェントのモデルには思考レベルがありません。",
  "slash.effort.failed": "思考レベルが変更されませんでした。",
  "slash.resume.title": "チャットを再開",
  "slash.resume.description":
    "エンジンが {name} のフォルダー用に保存したチャット。再開したチャットは新しいチャットとして開きます。",
  "slash.resume.empty": "このフォルダー用にエンジンが保存したチャットはありません。",
  "slash.resume.failed": "OpenBot Code は保存済みのチャットを読み取れませんでした。",
  "slash.resume.retry": "再試行",
  "slash.resume.inUse": "OpenBot Code で開いています",
  "slash.resume.untitled": "タイトルなしのチャット",
  "slash.resume.branch": "ブランチ {name}",
  "slash.resume.updated": "{time} に更新",
  "slash.resume.openFailed": "チャットを開けませんでした。",
} as const satisfies PartialTranslation<typeof source>;
