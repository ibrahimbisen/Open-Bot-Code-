import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "このエージェントは、エンジンの保存済みチャットを再開できません。",
  "error.slash.resumeEngineOff": "エンジンが起動していません。起動してからもう一度お試しください。",
  "error.slash.sessionNotFound": "この保存済みチャットはもうありません。一覧を更新して別のチャットを選んでください。",
  "error.slash.sessionInUse": "OpenBot Code 内のチャットが、この保存済みチャットを既に使用しています。",
  "error.slash.remoteFailed": "サーバーがこのコマンドを完了できませんでした。もう一度お試しください。",
  "error.slash.serverUnsupported": "このサーバーはスラッシュコマンドを一覧表示できません。サーバーを更新してください。",
} as const satisfies PartialTranslation<typeof source>;
