import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld": "此服务器不支持项目。请在运行它的电脑上更新 OpenBot Code。",
  "error.project.remoteFailed": "服务器无法完成此项目操作。请重试。",
  "error.project.replyUnsupported": "此服务器无法共享回复设置。请更新服务器。",
  "error.project.replyFailed": "服务器无法保存回复规则。请重试。",
  "error.project.notFound": "此项目已不存在。",
  "error.project.archived": "此项目已归档。请先恢复它。",
  "error.project.nameRequired": "请为项目命名。",
  "error.project.limit": "已达到项目数量上限（{limit}）。请先删除一个项目。",
  "error.project.agentLimit": "一个项目最多可以有 {limit} 个代理。",
  "error.project.agentRequired": "项目至少需要一个代理。",
  "error.project.agentNotFound": "此代理不属于该项目。",
  "error.project.agentNameRequired": "请为代理命名。",
  "error.project.runtimeProviderMismatch":
    "聊天可以使用其代理所属提供商的另一个模型。要使用其他提供商，请用该提供商的代理开始聊天。",
  "error.project.chatNotFound": "此聊天已不存在。",
  "error.project.cursorInvalid": "聊天列表的这一部分已失效。请重新加载聊天。",
  "error.project.folderMissing": "此文件夹不存在。",
  "error.project.folderProtected": "OpenBot Code 无法使用此文件夹。请选择其他文件夹。",
  "error.project.mainFolderMissing": "此项目的主文件夹丢失：{path}。请恢复该文件夹或选择新的主文件夹。",
  "error.project.ownerOnly": "只有创建此项目的人可以使用它。",
  "error.project.memberFolder": "请使用你在此服务器上的项目空间中的文件夹。",
  "error.project.memberOpenAccess": "只有所有者或管理员可以给项目授予此电脑的完全访问权限。",
} as const satisfies PartialTranslation<typeof source>;
