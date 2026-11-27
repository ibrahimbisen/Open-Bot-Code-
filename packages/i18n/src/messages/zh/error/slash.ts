import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "此代理无法从其引擎恢复已保存的聊天。",
  "error.slash.resumeEngineOff": "引擎未运行。请启动它后重试。",
  "error.slash.sessionNotFound": "这个已保存的聊天已不存在。请刷新列表并选择另一个。",
  "error.slash.sessionInUse": "OpenBot Code 中已有一个聊天在使用这个已保存的聊天。",
  "error.slash.remoteFailed": "服务器无法完成此命令。请重试。",
  "error.slash.serverUnsupported": "此服务器无法列出斜杠命令。请更新服务器。",
} as const satisfies PartialTranslation<typeof source>;
