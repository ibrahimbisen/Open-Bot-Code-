import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "严格模式需要 Claude 沙盒，但 Claude 无法在这台电脑上启动它：{reason}。请在项目设置中选择普通或开放，或选择其他提供商。",
  "error.lock.claudeNoSandboxStrict":
    "严格模式需要 Claude 沙盒，但 Claude 无法在这台电脑上启动它。请在项目设置中选择普通或开放，或选择其他提供商。",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} 无法在这台电脑上将代理限制在其项目文件夹内，因此 OpenBot Code 不会在{level}模式下启动它。请在项目设置中选择开放，或选择 Claude 或 Codex。",
  "error.lock.providerToolMissing":
    "{level}模式需要 {tool}，但 OpenBot Code 没有找到。请安装它，或在项目设置中选择开放。",
  "error.lock.containerMissing":
    "使用容器的严格模式需要 Docker 或 Podman，但 OpenBot Code 没有找到。请安装其中之一，或在项目设置中选择普通。",
  "error.lock.containerFailed": "此项目的容器没有启动：{reason}。请在项目设置中选择普通，或修复容器工具。",
  "error.lock.codexStrictNeedsSandbox":
    "严格模式需要 Codex 沙盒，但 Codex 无法在这台电脑上启动它。请在项目设置中选择普通或开放，或选择其他提供商。",
  "error.lock.commandAsk": "此代理无法使用系统沙盒，因此该命令需要你的批准。",
} as const satisfies PartialTranslation<typeof source>;
