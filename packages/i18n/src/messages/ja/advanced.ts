import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "高度な機能",
  "advanced.tab.description": "既定で非表示の機能をオンにします。",
  "advanced.section.title": "非表示の機能",
  "advanced.section.description":
    "各スイッチは {server} の機能を表示または非表示にします。オフの機能にはボタン、設定、エージェントツールがありません。データは残ります。",
  "advanced.adminOnly": "これらのスイッチを変更できるのは、このサーバーのオーナーまたは管理者だけです。",
  "advanced.loadFailed": "OpenBot Code はこのサーバーのスイッチを読み取れませんでした。",
  "advanced.saveFailed": "OpenBot Code はスイッチを保存できませんでした。",
  "advanced.routines.title": "ルーティン",
  "advanced.routines.description":
    "スケジュールされたタスクと Webhook。左バーにスケジュールを、エージェント設定にルーティンを追加します。",
  "advanced.channels.title": "チャンネル",
  "advanced.channels.description": "1 つのチャットに多数のエージェント。左バーにチャンネルを追加します。",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description":
    "インストールできるスキル、エージェント、プラグイン。Marketplace ボタンを追加します。",
  "advanced.chatApps.title": "Slack、Discord、Telegram、WhatsApp",
  "advanced.chatApps.description": "エージェントをチャットアプリに接続します。チャットアプリのコネクターを追加します。",
  "advanced.chatApps.open.title": "チャットアプリの接続",
  "advanced.chatApps.open.description": "Slack、Discord、Telegram、WhatsApp に接続します。",
  "advanced.chatApps.open.action": "開く",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "エージェントがこのコンピューター上のアプリを見て操作できるようにします。Computer Use の設定を追加します。",
  "advanced.remoteDesktop.title": "リモートデスクトップ",
  "advanced.remoteDesktop.description": "別のデバイスからこのコンピューターの画面を操作します。",
} as const satisfies PartialTranslation<typeof source>;
