import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused": "{host} 上的模型服务器拒绝了连接。请在那台机器上启动模型服务器。",
  "error.localServer.hostNotFound": "找不到地址 {host}。请检查机器的名称。",
  "error.localServer.timeout": "{host} 上的模型服务器在 {seconds} 秒内没有响应。",
  "error.localServer.unreachable": "无法访问 {host} 上的模型服务器。请确认该机器已开机并在你的网络中。",
  "error.localServer.redirect": "{host} 上的模型服务器发送了重定向。为保护 API 密钥安全，OpenBot Code 不会跟随重定向。",
  "error.localServer.keyNeeded": "{host} 上的模型服务器需要 API 密钥。请添加这台机器的密钥。",
  "error.localServer.keyRefused": "{host} 上的模型服务器拒绝了 API 密钥。请检查这台机器的密钥。",
  "error.localServer.http": "{host} 上的模型服务器返回了 HTTP 状态 {status}。",
  "error.localServer.invalidAnswer": "{host} 上的模型服务器没有发送与 OpenAI 兼容的模型列表。",
  "error.localServer.tooLarge": "{host} 上的模型服务器的响应过大。",
  "error.localServer.gpuUnreachable": "无法访问 GPU 状态地址 {host}。",
  "error.localServer.gpuTimeout": "GPU 状态地址 {host} 在 {seconds} 秒内没有响应。",
  "error.localServer.gpuRedirect": "GPU 状态地址 {host} 发送了重定向。OpenBot Code 不会跟随重定向。",
  "error.localServer.gpuHttp": "GPU 状态地址 {host} 返回了 HTTP 状态 {status}。",
  "error.localServer.gpuInvalid": "GPU 状态地址 {host} 没有发送 OpenBot Code 可以读取的 GPU 数值。",
  "error.localServer.gpuTooLarge": "GPU 状态地址 {host} 的响应过大。",
  "error.localServer.gpuUrlInvalid": "GPU 状态 URL 必须是不含用户名和密码的 http 或 https 地址。",
  "error.localServer.gpuKeyOtherOrigin": "只有当 GPU 状态 URL 与基础 URL 同源时，才能将 API 密钥发送到该 URL。",
  "error.localServer.scanHostInvalid": "请输入主机名、IP 地址，或 http 或 https 地址。",
} as const satisfies PartialTranslation<typeof source>;
