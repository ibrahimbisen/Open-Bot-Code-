import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "このパスはプロジェクトのフォルダー内にありません。",
  "error.explorer.notFound": "ファイルまたはフォルダーが存在しません。",
  "error.explorer.rootProtected": "プロジェクトフォルダーは、ここで名前を変更したり削除したりできません。",
  "error.explorer.invalidName": "この名前はファイルやフォルダーには使えません。",
  "error.explorer.notFile": "このパスはファイルではありません。",
  "error.explorer.notDirectory": "このパスはフォルダーではありません。",
  "error.explorer.exists": "このフォルダーには、{name} という名前のファイルまたはフォルダーが既にあります。",
  "error.explorer.unknownAgent": "このファイルツリーのエージェントは存在しません。",
  "error.explorer.gitTimeout": "Git コマンドの実行に時間がかかりすぎたため、停止しました。",
  "error.explorer.gitFailed": "Git がエラーを報告しました: {detail}",
  "error.explorer.serverUnsupported": "このサーバーはファイルを表示できません。サーバーを更新してください。",
  "error.explorer.clientUnsupported": "このバージョンの OpenBot Code はサーバーのファイルを表示できません。",
  "error.explorer.remoteFailed": "サーバーがこのファイル操作を完了できませんでした。もう一度お試しください。",
} as const satisfies PartialTranslation<typeof source>;
