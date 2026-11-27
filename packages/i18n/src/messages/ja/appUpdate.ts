import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "アップデートサーバー",
  "appUpdate.server.description": "サーバー上の、OpenBot Code のインストーラーとアップデートファイルがあるフォルダー。",
  "appUpdate.server.urlLabel": "アップデートサーバーの URL",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code はこの URL からアップデートを取得します。",
  "appUpdate.server.source.environment":
    "OpenBot Code は {url} からアップデートを取得します。この URL は環境変数 CODEBOT_UPDATE_URL から取得されています。",
  "appUpdate.server.source.build":
    "OpenBot Code は {url} からアップデートを取得します。この URL は、この OpenBot Code のビルドに含まれています。",
  "appUpdate.server.source.none":
    "アップデートサーバーが設定されていません。OpenBot Code はアップデートを確認しません。",
  "appUpdate.server.saveFailed": "OpenBot Code はアップデートサーバーの URL を保存できませんでした。",
  "appUpdate.server.loadFailed": "OpenBot Code はアップデートサーバーの URL を読み取れませんでした。",
  "appUpdate.autoRestart.title": "アイドル時に自動で再起動",
  "appUpdate.autoRestart.description":
    "エージェントが動作していないとき、OpenBot Code はダウンロード済みのアップデートをインストールするために再起動します。サーバーのメンバーは短時間切断されます。",
} as const satisfies PartialTranslation<typeof source>;
