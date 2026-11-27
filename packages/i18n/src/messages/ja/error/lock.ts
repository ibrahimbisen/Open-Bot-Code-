import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "「厳格」には Claude のサンドボックスが必要ですが、Claude はこのコンピューターで起動できません: {reason}。プロジェクト設定で「通常」または「オープン」を選ぶか、別のプロバイダーを選んでください。",
  "error.lock.claudeNoSandboxStrict":
    "「厳格」には Claude のサンドボックスが必要ですが、Claude はこのコンピューターで起動できません。プロジェクト設定で「通常」または「オープン」を選ぶか、別のプロバイダーを選んでください。",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} はこのコンピューターでエージェントをプロジェクトのフォルダー内に留めておけないため、OpenBot Code は {level} では起動しません。プロジェクト設定で「オープン」を選ぶか、Claude または Codex を選んでください。",
  "error.lock.providerToolMissing":
    "{level} には {tool} が必要ですが、OpenBot Code は見つけられませんでした。インストールするか、プロジェクト設定で「オープン」を選んでください。",
  "error.lock.containerMissing":
    "コンテナーを使う「厳格」には Docker または Podman が必要ですが、OpenBot Code は見つけられませんでした。どちらかをインストールするか、プロジェクト設定で「通常」を選んでください。",
  "error.lock.containerFailed":
    "このプロジェクトのコンテナーが起動しませんでした: {reason}。プロジェクト設定で「通常」を選ぶか、コンテナーツールを修正してください。",
  "error.lock.codexStrictNeedsSandbox":
    "「厳格」には Codex のサンドボックスが必要ですが、Codex はこのコンピューターで起動できません。プロジェクト設定で「通常」または「オープン」を選ぶか、別のプロバイダーを選んでください。",
  "error.lock.commandAsk":
    "このエージェントでは OS のサンドボックスを利用できないため、このコマンドにはあなたの承認が必要です。",
} as const satisfies PartialTranslation<typeof source>;
