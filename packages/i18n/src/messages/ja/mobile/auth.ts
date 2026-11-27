import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/mobile/auth";

export const messages = {
  "mobile.auth.logo.animate": "OpenBot Code のロゴを動かす",
  "mobile.auth.logo.animateHint": "ロゴがウインクします",
  "mobile.auth.scanQrCode": "QR コードをスキャン",
  "mobile.auth.closeScanner": "スキャナーを閉じる",
  "mobile.auth.scanner.connectFailed": "接続できませんでした",
  "mobile.auth.scanner.codeFailed": "このコードは使用できません",
  "mobile.auth.scanner.scanAgain": "もう一度スキャン",
  "mobile.auth.scanner.connecting": "スマートフォンを接続しています…",
  "mobile.auth.scanner.readingInvitation": "招待を読み込んでいます…",
  "mobile.auth.scanner.scanDesktop": "デスクトップのコードをスキャンしてください",
  "mobile.auth.scanner.scanInvitation": "招待コードをスキャンしてください",
  "mobile.auth.scanner.verifying": "ワンタイムコードを確認しています。",
  "mobile.auth.scanner.checkingServer": "サーバーの ID を確認しています。",
  "mobile.auth.scanner.keepCentered": "QR コードを枠の中央に合わせてください。",
  "mobile.auth.scanner.connectFallback": "OpenBot Code はこのスマートフォンを接続できませんでした。",
  "mobile.auth.scanner.cameraFailed": "カメラを起動できませんでした。もう一度お試しください。",
  "mobile.auth.camera.title": "カメラへのアクセスが必要です",
  "mobile.auth.camera.pairingReason":
    "OpenBot Code はデスクトップアプリに表示されるワンタイム QR コードをスキャンするためにのみカメラを使用します。",
  "mobile.auth.camera.invitationReason": "OpenBot Code は招待の QR コードをスキャンするためにのみカメラを使用します。",
  "mobile.auth.camera.blocked":
    "カメラへのアクセスがブロックされています。端末の設定で OpenBot Code のカメラを許可してから、ここに戻ってコードをスキャンしてください。",
  "mobile.auth.camera.allow": "カメラへのアクセスを許可",
  "mobile.auth.camera.openSettings": "設定を開く",
  "mobile.auth.signIn.title": "エージェントを、どこでも。",
  "mobile.auth.signIn.subtitle": "コンピューターの OpenBot Code に接続します。",
  "mobile.auth.signIn.helpTitle": "QR コードはどこにありますか？",
  "mobile.auth.signIn.helpStep1": "1. コンピューターで OpenBot Code を開きます。",
  "mobile.auth.signIn.helpStep2": "2. 設定 → Mobile Connect に移動します。",
  "mobile.auth.signIn.helpStep3":
    "3. 「スマートフォンを追加」→「はい、サインイン」を選択して、ここでコードをスキャンします。",
  "mobile.auth.signIn.accountButton": "Nextcloud でサインイン",
  "mobile.auth.account.title": "Nextcloud でサインイン",
  "mobile.auth.account.description":
    "OpenBot Code アカウントサービスのアドレスを入力してください。その後、Nextcloud がユーザー名とパスワードを求めます。",
  "mobile.auth.account.label": "アカウントサービスのアドレス",
  "mobile.auth.account.placeholder": "account.example.com",
  "mobile.auth.account.signalLabel": "Signal アドレス (任意)",
  "mobile.auth.account.signalPlaceholder": "Signal アドレス (任意)",
  "mobile.auth.account.continue": "Nextcloud で続行",
  "mobile.auth.account.waiting": "Nextcloud を待っています…",
  "mobile.auth.account.tryAgainIn": "{time} 後にもう一度お試しください",
  "mobile.auth.account.useQrCode": "代わりに QR コードをスキャン",
  "mobile.auth.account.error.invalidAddress":
    "アカウントサービスのアドレスを入力してください。例: account.example.com。",
  "mobile.auth.account.error.invalidSignal": "wss:// で始まる Signal アドレスを入力するか、空のままにしてください。",
  "mobile.auth.account.error.notAccountService": "このアドレスは OpenBot Code アカウントサービスではありません。",
  "mobile.auth.account.error.startFailed":
    "アカウントサービスがサインインを開始できませんでした。もう一度お試しください。",
  "mobile.auth.account.error.loginFailed": "サインインが完了しませんでした。もう一度お試しください。",
  "mobile.auth.account.error.wait": "サインインの試行回数が多すぎます。しばらく待ってからもう一度お試しください。",
  "mobile.auth.account.error.providerUnreachable":
    "アカウントサービスが Nextcloud に接続できませんでした。後でもう一度お試しください。",
  "mobile.auth.account.error.refused": "Nextcloud がこのサインインを許可しませんでした。",
  "mobile.auth.done.title": "接続しました",
  "mobile.auth.done.body": "サインインしました。",
  "mobile.auth.error.sessionEnded": "セッションが終了しました。もう一度サインインしてください。",
  "mobile.auth.error.connectionInProgress": "別の接続が進行中です。完了するまでお待ちください。",
  "mobile.auth.error.invalidCode": "これは有効な OpenBot Code Mobile Connect コードではありません。",
  "mobile.auth.error.codeOutdated": "最新のデスクトップアプリで新しい Mobile Connect コードを生成してください。",
  "mobile.auth.error.alreadySignedIn":
    "すでにサインインしています。別のアカウントを接続する前にサインアウトしてください。",
  "mobile.auth.error.desktopUnreachable":
    "OpenBot Code はデスクトップに接続できませんでした。両方の端末を同じ Wi-Fi ネットワークに接続し、ローカルネットワークへのアクセスを許可してください。",
  "mobile.auth.error.accountServiceUnreachable":
    "OpenBot Code はアカウントサービスに接続できませんでした。接続を確認して、もう一度お試しください。",
  "mobile.auth.error.codeExpired": "この Mobile Connect コードは無効か、有効期限が切れています。",
  "mobile.auth.error.revokePreviousFailed":
    "以前のモバイルセッションを取り消せませんでした。接続を確認して、もう一度スキャンしてください。",
  "mobile.auth.error.verifyFailed": "OpenBot Code はこのモバイルセッションを確認できませんでした。",
  "mobile.auth.error.sessionsLoadFailed": "アカウントのセッションを読み込めませんでした。もう一度お試しください。",
  "mobile.auth.error.useSignOut": "この端末の接続を解除するには「サインアウト」を使用してください。",
  "mobile.auth.error.desktopSession": "デスクトップのセッションはモバイルから接続解除できません。",
  "mobile.auth.error.disconnectFailed": "このセッションを接続解除できませんでした。更新してもう一度お試しください。",
  "mobile.auth.error.nameLength": "3〜20 文字の表示名を入力してください。",
  "mobile.auth.error.photoTooLarge": "512 KB 未満の写真を選択してください。",
  "mobile.auth.error.photoInvalid": "選択した写真は無効です。別の画像を選択してください。",
  "mobile.auth.error.tooManyChanges": "変更が多すぎます。しばらく待ってから、もう一度お試しください。",
  "mobile.auth.error.photoConflict": "別の端末で写真が変更されました。もう一度お試しください。",
  "mobile.auth.error.profileSaveFailed": "プロフィールを保存できませんでした。接続を確認して、もう一度お試しください。",
  "mobile.auth.error.signOutUnconfirmed":
    "サインアウトを確認できませんでした。接続を確認して、もう一度お試しください。",
} as const satisfies PartialTranslation<typeof source>;
