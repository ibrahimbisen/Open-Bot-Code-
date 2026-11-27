import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "このサーバーはプロジェクトに対応していません。サーバーを実行しているコンピューターで OpenBot Code を更新してください。",
  "error.project.remoteFailed": "サーバーがこのプロジェクト操作を完了できませんでした。もう一度お試しください。",
  "error.project.replyUnsupported": "このサーバーは返信設定を共有できません。サーバーを更新してください。",
  "error.project.replyFailed": "サーバーが返信ルールを保存できませんでした。もう一度お試しください。",
  "error.project.notFound": "このプロジェクトは存在しなくなりました。",
  "error.project.archived": "このプロジェクトはアーカイブされています。先に復元してください。",
  "error.project.nameRequired": "プロジェクトに名前を付けてください。",
  "error.project.limit": "プロジェクト数の上限 ({limit}) に達しました。先にプロジェクトを削除してください。",
  "error.project.agentLimit": "1 つのプロジェクトに置けるエージェントは最大 {limit} 個です。",
  "error.project.agentRequired": "プロジェクトには少なくとも 1 つのエージェントが必要です。",
  "error.project.agentNotFound": "このエージェントはプロジェクトに含まれていません。",
  "error.project.agentNameRequired": "エージェントに名前を付けてください。",
  "error.project.runtimeProviderMismatch":
    "チャットでは、そのエージェントのプロバイダーの別のモデルを使えます。別のプロバイダーを使うには、そのプロバイダーのエージェントでチャットを開始してください。",
  "error.project.chatNotFound": "このチャットは存在しなくなりました。",
  "error.project.cursorInvalid": "チャット一覧のこの部分は無効になりました。チャットを再読み込みしてください。",
  "error.project.folderMissing": "このフォルダーは存在しません。",
  "error.project.folderProtected": "OpenBot Code はこのフォルダーを使えません。別のフォルダーを選んでください。",
  "error.project.mainFolderMissing":
    "このプロジェクトのメインフォルダーが見つかりません: {path}。フォルダーを復元するか、新しいメインフォルダーを選んでください。",
} as const satisfies PartialTranslation<typeof source>;
