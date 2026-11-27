import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "更新服务器",
  "appUpdate.server.description": "你服务器上存放 OpenBot Code 安装程序和更新文件的文件夹。",
  "appUpdate.server.urlLabel": "更新服务器 URL",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code 从此 URL 获取更新。",
  "appUpdate.server.source.environment": "OpenBot Code 从 {url} 获取更新。此 URL 来自环境变量 CODEBOT_UPDATE_URL。",
  "appUpdate.server.source.build": "OpenBot Code 从 {url} 获取更新。此 URL 来自这个 OpenBot Code 构建。",
  "appUpdate.server.source.none": "未设置更新服务器。OpenBot Code 不会检查更新。",
  "appUpdate.server.saveFailed": "OpenBot Code 无法保存更新服务器 URL。",
  "appUpdate.server.loadFailed": "OpenBot Code 无法读取更新服务器 URL。",
  "appUpdate.autoRestart.title": "空闲时自动重新启动",
  "appUpdate.autoRestart.description":
    "当没有代理在工作时，OpenBot Code 会重新启动以安装已下载的更新。你的服务器成员会短暂断开连接。",
} as const satisfies PartialTranslation<typeof source>;
