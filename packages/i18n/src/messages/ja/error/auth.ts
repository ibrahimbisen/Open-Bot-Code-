import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code がアカウントサービスに接続できませんでした。API が動作していることを確認してから、再試行してください。",
  "error.auth.sessionTimeout":
    "OpenBot Code が時間内に応答しませんでした。インターネット接続を確認してから、もう一度お試しください。",
  "error.auth.networkBlocked":
    "このネットワークのファイアウォールまたはプロキシが、OpenBot Code から {host} への接続をブロックしました。ネットワーク管理者に {host} の許可を依頼してから、再試行してください。",
  "error.auth.signInFirst": "先に OpenBot Code にサインインしてください。",
  "error.auth.accountServiceNotConfigured": "先にアカウントサービスのアドレスを入力してください。",
  "error.auth.accountServiceUrlInvalid": "アカウントサービスのアドレスは https:// で始まり、パスを含められません。",
  "error.auth.accountServiceFixed":
    "環境変数 CODEBOT_AUTH_API_URL がアカウントサービスを設定しています。ここでアドレスを変更するには、この変数を削除してください。",
  "error.auth.signInFailed": "サインインが完了しませんでした。もう一度お試しください。",
  "error.auth.signInCancelled": "サインインがキャンセルされたか、拒否されました。",
  "error.auth.signInTimeout": "サインインに時間がかかりすぎました。もう一度開始してください。",
  "error.auth.signInBrowserFailed": "OpenBot Code はサインイン用のブラウザーを開けませんでした。",
  "error.auth.signInUnavailable": "この OpenBot Code はサインイン用のブラウザーを開けません。",
  "error.auth.signInRequired": "サインインが必要です。",
  "error.auth.chatColorUnavailable":
    "アカウントサービスはまだチャットの色に対応していません。後でもう一度お試しください。",
  "error.auth.accountChangedDuringRegister": "このサーバーの登録中に、サインイン中のアカウントが変わりました。",
  "error.auth.hostCredentialUnavailable": "リモートホストの認証情報を利用できません。ホストを再登録してください。",
  "error.auth.serviceError": "アカウントサービスがエラーを返しました。",
  "error.auth.serviceUnreachable":
    "OpenBot Code はアカウントサービスに接続できませんでした。接続を確認してから、もう一度お試しください。",
  "error.auth.serviceTimeout": "アカウントサービスが時間内に応答しませんでした。もう一度お試しください。",
  "error.auth.serviceStatus": "アカウントサービスがエラー ({status}) を返しました。後でもう一度お試しください。",
  "error.auth.deliveryTimeout":
    "OpenBot Code が時間内に配信を確認できませんでした。コードが後で届く場合があります。再送信する前に配信を確認してください。",
} as const satisfies PartialTranslation<typeof source>;
