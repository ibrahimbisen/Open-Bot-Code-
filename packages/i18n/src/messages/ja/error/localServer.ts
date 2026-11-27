import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "{host} のモデルサーバーが接続を拒否しました。そのマシンでモデルサーバーを起動してください。",
  "error.localServer.hostNotFound": "アドレス {host} が見つかりません。マシン名を確認してください。",
  "error.localServer.timeout": "{host} のモデルサーバーから {seconds} 秒以内に応答がありませんでした。",
  "error.localServer.unreachable":
    "{host} のモデルサーバーに接続できません。マシンの電源が入っていて、ネットワークに接続されていることを確認してください。",
  "error.localServer.redirect":
    "{host} のモデルサーバーがリダイレクトを返しました。API キーを守るため、OpenBot Code はリダイレクトに従いません。",
  "error.localServer.keyNeeded": "{host} のモデルサーバーには API キーが必要です。このマシンのキーを追加してください。",
  "error.localServer.keyRefused":
    "{host} のモデルサーバーが API キーを拒否しました。このマシンのキーを確認してください。",
  "error.localServer.http": "{host} のモデルサーバーが HTTP ステータス {status} で応答しました。",
  "error.localServer.invalidAnswer": "{host} のモデルサーバーは OpenAI 互換のモデル一覧を返しませんでした。",
  "error.localServer.tooLarge": "{host} のモデルサーバーの応答が大きすぎます。",
  "error.localServer.gpuUnreachable": "GPU ステータスのアドレス {host} に接続できません。",
  "error.localServer.gpuTimeout": "GPU ステータスのアドレス {host} から {seconds} 秒以内に応答がありませんでした。",
  "error.localServer.gpuRedirect":
    "GPU ステータスのアドレス {host} がリダイレクトを返しました。OpenBot Code はリダイレクトに従いません。",
  "error.localServer.gpuHttp": "GPU ステータスのアドレス {host} が HTTP ステータス {status} で応答しました。",
  "error.localServer.gpuInvalid":
    "GPU ステータスのアドレス {host} は、OpenBot Code が読み取れる GPU の値を返しませんでした。",
  "error.localServer.gpuTooLarge": "GPU ステータスのアドレス {host} の応答が大きすぎます。",
  "error.localServer.gpuUrlInvalid":
    "GPU ステータス URL は、ユーザー名とパスワードを含まない http または https のアドレスにしてください。",
  "error.localServer.gpuKeyOtherOrigin":
    "API キーを GPU ステータス URL に送れるのは、その URL がベース URL と同じオリジンの場合だけです。",
  "error.localServer.scanHostInvalid": "ホスト名、IP アドレス、または http か https のアドレスを入力してください。",
} as const satisfies PartialTranslation<typeof source>;
