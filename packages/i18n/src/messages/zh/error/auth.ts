import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable": "OpenBot Code 无法连接账号服务。请确认 API 正在运行后重试。",
  "error.auth.sessionTimeout": "OpenBot Code 未及时响应。请检查网络连接，然后重试。",
  "error.auth.networkBlocked":
    "该网络中的防火墙或代理阻止了 OpenBot Code 访问 {host}。请让网络管理员放行 {host}，然后重试。",
  "error.auth.signInFirst": "请先登录 OpenBot Code。",
  "error.auth.accountServiceNotConfigured": "请先输入你的账户服务地址。",
  "error.auth.accountServiceUrlInvalid": "账户服务地址必须以 https:// 开头，且不能包含路径。",
  "error.auth.accountServiceFixed": "环境变量 CODEBOT_AUTH_API_URL 设置了账户服务。要在此处更改地址，请先删除该变量。",
  "error.auth.signInFailed": "登录未完成。请重试。",
  "error.auth.signInCancelled": "登录已取消或被拒绝。",
  "error.auth.signInTimeout": "登录耗时过长。请重新开始。",
  "error.auth.signInBrowserFailed": "OpenBot Code 无法打开浏览器进行登录。",
  "error.auth.signInUnavailable": "此 OpenBot Code 无法打开浏览器进行登录。",
  "error.auth.signInRequired": "需要先登录。",
  "error.auth.chatColorUnavailable": "账户服务暂不支持聊天颜色。请稍后重试。",
  "error.auth.accountChangedDuringRegister": "注册该服务器期间，已登录的账号发生了变更。",
  "error.auth.hostCredentialUnavailable": "远程主机凭据不可用，请重新注册该主机。",
  "error.auth.serviceError": "账号服务返回了错误。",
  "error.auth.serviceUnreachable": "OpenBot Code 无法连接账号服务。请检查网络连接后重试。",
  "error.auth.serviceTimeout": "账号服务未及时响应，请重试。",
  "error.auth.serviceStatus": "账号服务返回了错误（{status}），请稍后重试。",
  "error.auth.deliveryTimeout": "OpenBot Code 未能及时确认送达。验证码可能仍会到达，重发前请先检查送达情况。",
} as const satisfies PartialTranslation<typeof source>;
