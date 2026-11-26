import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/messaging";

export const messages = {
  "messaging.help.invalid_token":
    "Slack はこのワークスペースで CodeBot を受け付けなくなりました。アンインストールされた可能性があります。ワークスペースをもう一度接続してください。",
  "messaging.help.secret_storage_unavailable":
    "CodeBot はこのコンピューターに保存されたトークンを読み取れません。ワークスペースの接続を解除してから、もう一度接続してください。",
  "messaging.help.relay_unavailable":
    "CodeBot はこのコンピューターで Slack のイベントを受信できません。サインインし、サーバー設定でこのコンピューターに名前を付けて、CodeBot を開いたままにしてください。",
  "messaging.help.not_linked":
    "このワークスペースはこのサーバーにリンクされていません。リンクするには「再接続」を選択してください。",
  "messaging.discordHelp.invalid_token":
    "Discord はこの Discord サーバーで CodeBot を受け付けなくなりました。削除された可能性があります。Discord サーバーをもう一度接続してください。",
  "messaging.discordHelp.secret_storage_unavailable":
    "CodeBot はこのコンピューターに保存されたトークンを読み取れません。Discord サーバーの接続を解除してから、もう一度接続してください。",
  "messaging.discordHelp.relay_unavailable":
    "CodeBot はこのコンピューターで Discord のイベントを受信できません。サインインし、サーバー設定でこのコンピューターに名前を付けて、CodeBot を開いたままにしてください。",
  "messaging.discordHelp.not_linked":
    "この Discord サーバーはこの CodeBot サーバーにリンクされていません。リンクするには「再接続」を選択してください。",
} as const satisfies PartialTranslation<typeof source>;
