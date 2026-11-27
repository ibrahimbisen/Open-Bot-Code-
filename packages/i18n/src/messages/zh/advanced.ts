import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "高级功能",
  "advanced.tab.description": "开启默认隐藏的功能。",
  "advanced.section.title": "隐藏的功能",
  "advanced.section.description":
    "每个开关在 {server} 上显示或隐藏一项功能。关闭的功能没有按钮、设置和代理工具。你的数据会保留。",
  "advanced.adminOnly": "只有此服务器的所有者或管理员可以更改这些开关。",
  "advanced.loadFailed": "OpenBot Code 无法读取此服务器的开关。",
  "advanced.saveFailed": "OpenBot Code 无法保存该开关。",
  "advanced.routines.title": "例程",
  "advanced.routines.description": "计划任务和 Webhook。在左侧栏添加日程，在代理设置中添加例程。",
  "advanced.channels.title": "频道",
  "advanced.channels.description": "一个聊天中有多个代理。在左侧栏添加频道。",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "可安装的技能、代理和插件。添加 Marketplace 按钮。",
  "advanced.chatApps.title": "Slack、Discord、Telegram 和 WhatsApp",
  "advanced.chatApps.description": "将代理连接到聊天应用。添加聊天应用连接器。",
  "advanced.chatApps.open.title": "聊天应用连接",
  "advanced.chatApps.open.description": "连接 Slack、Discord、Telegram 或 WhatsApp。",
  "advanced.chatApps.open.action": "打开",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description": "让代理查看并控制这台电脑上的应用。添加 Computer Use 设置。",
  "advanced.remoteDesktop.title": "远程桌面",
  "advanced.remoteDesktop.description": "从另一台设备控制这台电脑的屏幕。",
} as const satisfies PartialTranslation<typeof source>;
