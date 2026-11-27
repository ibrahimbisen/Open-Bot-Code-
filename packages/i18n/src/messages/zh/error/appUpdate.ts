import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer": "未设置更新服务器。请在 设置 > 更新 中输入更新服务器 URL。",
  "error.appUpdate.urlInvalid": "更新服务器 URL 无效。请使用以 https:// 开头的 URL。",
  "error.appUpdate.urlCredentials": "请从更新服务器 URL 中删除用户名和密码。",
  "error.appUpdate.urlInsecure": "更新服务器 URL 请使用 https://。仅允许对你自己网络中的电脑使用 http://。",
  "error.appUpdate.urlNotSaved": "OpenBot Code 无法保存更新服务器 URL。请重试。",
} as const satisfies PartialTranslation<typeof source>;
