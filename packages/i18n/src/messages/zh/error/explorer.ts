import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "此路径不在项目的文件夹中。",
  "error.explorer.notFound": "文件或文件夹不存在。",
  "error.explorer.rootProtected": "此处无法重命名或删除项目文件夹。",
  "error.explorer.invalidName": "此名称不能用于文件或文件夹。",
  "error.explorer.notFile": "此路径不是文件。",
  "error.explorer.notDirectory": "此路径不是文件夹。",
  "error.explorer.exists": "此文件夹中已有名为 {name} 的文件或文件夹。",
  "error.explorer.unknownAgent": "此文件树的代理不存在。",
  "error.explorer.gitTimeout": "一个 Git 命令耗时过长，已被停止。",
  "error.explorer.gitFailed": "Git 报告了一个错误：{detail}",
  "error.explorer.serverUnsupported": "此服务器无法显示文件。请更新服务器。",
  "error.explorer.clientUnsupported": "此版本的 OpenBot Code 无法显示服务器的文件。",
  "error.explorer.remoteFailed": "服务器无法完成此文件操作。请重试。",
} as const satisfies PartialTranslation<typeof source>;
