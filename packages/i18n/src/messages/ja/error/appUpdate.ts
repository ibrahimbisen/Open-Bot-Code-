import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "アップデートサーバーが設定されていません。設定 > アップデート にアップデートサーバーの URL を入力してください。",
  "error.appUpdate.urlInvalid": "アップデートサーバーの URL が無効です。https:// で始まる URL を使ってください。",
  "error.appUpdate.urlCredentials": "アップデートサーバーの URL からユーザー名とパスワードを削除してください。",
  "error.appUpdate.urlInsecure":
    "アップデートサーバーの URL には https:// を使ってください。http:// は、同じネットワーク内のコンピューターにのみ許可されます。",
  "error.appUpdate.urlNotSaved":
    "OpenBot Code はアップデートサーバーの URL を保存できませんでした。もう一度お試しください。",
  "error.appUpdate.manualDownload":
    "この Mac ビルドは署名されていないため、OpenBot Code はアップデートを自動でインストールできません。［ダウンロード］を選択してダウンロードページを開き、新しいバージョンを手動でインストールしてください。",
} as const satisfies PartialTranslation<typeof source>;
