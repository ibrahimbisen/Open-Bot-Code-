import { defineMessages } from "../../message";

export const messages = defineMessages("advanced", {
  "advanced.tab.title": "Advanced features",
  "advanced.tab.description": "Turn on features that are hidden by default.",
  "advanced.section.title": "Hidden features",
  "advanced.section.description":
    "Each switch shows or hides a feature on {server}. A feature that is off has no buttons, no settings and no agent tools. Your data stays.",
  "advanced.adminOnly": "Only an owner or an admin of this server can change these switches.",
  "advanced.loadFailed": "CodeBot could not read the switches of this server.",
  "advanced.saveFailed": "CodeBot could not save the switch.",
  "advanced.routines.title": "Routines",
  "advanced.routines.description":
    "Scheduled tasks and webhooks. Adds Schedule to the left bar and Routines to the agent settings.",
  "advanced.channels.title": "Channels",
  "advanced.channels.description": "Many agents in one chat. Adds Channels to the left bar.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Skills, agents and plugins to install. Adds the Marketplace button.",
  "advanced.chatApps.title": "Slack, Discord, Telegram and WhatsApp",
  "advanced.chatApps.description": "Connect agents to chat apps. Adds the chat app connectors.",
  "advanced.chatApps.open.title": "Chat app connections",
  "advanced.chatApps.open.description": "Connect Slack, Discord, Telegram or WhatsApp.",
  "advanced.chatApps.open.action": "Open",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Lets an agent see and control apps on this computer. Adds the Computer Use settings.",
  "advanced.remoteDesktop.title": "Remote desktop",
  "advanced.remoteDesktop.description": "Control the screen of this computer from another device.",
});
