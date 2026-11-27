import type { FooterColumnId, FooterTextId } from "./site-text";

export const EXTERNAL_LINK_REL = "noopener noreferrer";

export const CODEBOT_DOWNLOAD_LINKS = {
  macos: "/download/macos/latest",
  windows: "/download/windows/latest",
  linux: "/download/linux/latest",
} as const;

export const CODEBOT_ALTERNATE_DOWNLOAD_LINKS = {
  macos: "/download/macos/latest?arch=x64",
  linux: "/download/linux/latest?arch=arm64",
} as const;

export const CODEBOT_ANDROID_APK_LINK = "/download/android/latest";

export const CODEBOT_DOWNLOAD_PAGE_LINKS = {
  hub: "/download",
  macos: "/download/macos",
  windows: "/download/windows",
  linux: "/download/linux",
  ios: "/download/ios",
  android: "/download/android",
} as const;

export const CODEBOT_LINKS = {
  contact: "/contact",
  x: "https://codebot.example/x",
  threads: "https://codebot.example/threads",
  linkedin: "https://codebot.example/linkedin",
  reddit: "https://codebot.example/reddit",
  instagram: "https://codebot.example/instagram",
  tiktok: "https://codebot.example/tiktok",
  facebook: "https://www.facebook.com/profile.php?id=61595425259628",
  discord: "https://discord.codebot.example",
  download: "#download",
  news: "/news",
  guides: "/guides",
  marketplace: "/marketplace",
  changelog: "/changelog",
  releases: "https://github.com/your-org/codebot/releases",
  repository: "https://github.com/your-org/codebot",
  license: "https://github.com/your-org/codebot/blob/main/LICENSE",
  privacy: "https://github.com/your-org/codebot/blob/main/PRIVACY.md",
  documentation: "https://github.com/your-org/codebot#readme",
  troubleshooting: "https://github.com/your-org/codebot/blob/main/docs/TROUBLESHOOTING.md",
  status: "https://status.codebot.example",
  selfHostedServer: "https://github.com/your-org/codebot/blob/main/docs/self-hosted-server.md",
  dockerDocumentation: "https://github.com/your-org/codebot/blob/main/docs/docker.md",
  dockerInstallUbuntu: "https://docs.docker.com/engine/install/ubuntu/",
  architecture: "https://github.com/your-org/codebot#architecture",
  contributing: "https://github.com/your-org/codebot/blob/main/CONTRIBUTING.md",
  codex: "https://learn.chatgpt.com/docs/app-server",
  claude: "https://code.claude.com/docs/en/overview",
  anthropicAgents: "https://www.anthropic.com/engineering/building-effective-agents",
} as const;

type FooterLabel = string | { readonly text: FooterTextId };

export type FooterLink =
  | { readonly label: FooterLabel; readonly external: true; readonly href: string }
  | {
      readonly label: FooterLabel;
      readonly external: false;
      readonly to:
        | "/"
        | "/download"
        | "/news"
        | "/guides"
        | "/marketplace"
        | "/changelog"
        | "/compare"
        | "/providers"
        | "/teams"
        | "/pricing"
        | "/brand"
        | "/contact"
        | "/privacy-policy"
        | "/terms"
        | "/commercial-license"
        | "/dpa"
        | "/cla";
      readonly hash?: string;
    }
  | {
      readonly label: FooterLabel;
      readonly external: false;
      readonly to: "/compare/$slug" | "/providers/$slug";
      readonly slug: string;
    };

export interface FooterColumn {
  readonly id: FooterColumnId;
  readonly links: readonly FooterLink[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    id: "product",
    links: [
      { label: { text: "download" }, external: false, to: "/download" },
      { label: { text: "news" }, external: false, to: "/news" },
      { label: { text: "guides" }, external: false, to: "/guides" },
      { label: { text: "marketplace" }, external: false, to: "/marketplace" },
      { label: { text: "changelog" }, external: false, to: "/changelog" },
      { label: { text: "teams" }, external: false, to: "/teams" },
      { label: { text: "pricing" }, external: false, to: "/pricing" },
      { label: { text: "contact" }, external: false, to: "/contact" },
      { label: { text: "brand" }, external: false, to: "/brand" },
      { label: { text: "sourceCode" }, external: true, href: CODEBOT_LINKS.repository },
      { label: { text: "license" }, external: true, href: CODEBOT_LINKS.license },
      { label: { text: "privacy" }, external: false, to: "/privacy-policy" },
      { label: { text: "terms" }, external: false, to: "/terms" },
      { label: { text: "commercialLicense" }, external: false, to: "/commercial-license" },
      { label: "DPA", external: false, to: "/dpa" },
      { label: "CLA", external: false, to: "/cla" },
    ],
  },
  {
    id: "resources",
    links: [
      { label: { text: "documentation" }, external: true, href: CODEBOT_LINKS.documentation },
      { label: { text: "troubleshooting" }, external: true, href: CODEBOT_LINKS.troubleshooting },
      { label: { text: "status" }, external: true, href: CODEBOT_LINKS.status },
      { label: { text: "selfHosted" }, external: true, href: CODEBOT_LINKS.selfHostedServer },
      { label: { text: "architecture" }, external: true, href: CODEBOT_LINKS.architecture },
      { label: { text: "contributing" }, external: true, href: CODEBOT_LINKS.contributing },
      { label: "Codex", external: true, href: CODEBOT_LINKS.codex },
      { label: "Claude Code", external: true, href: CODEBOT_LINKS.claude },
      { label: "Discord", external: true, href: CODEBOT_LINKS.discord },
    ],
  },
  {
    id: "providers",
    links: [
      { label: "Claude Code", external: false, to: "/providers/$slug", slug: "claude-code" },
      { label: "Codex", external: false, to: "/providers/$slug", slug: "codex" },
      { label: "Gemini", external: false, to: "/providers/$slug", slug: "gemini" },
      { label: "Grok", external: false, to: "/providers/$slug", slug: "grok" },
      { label: "Cursor", external: false, to: "/providers/$slug", slug: "cursor" },
      { label: "OpenCode", external: false, to: "/providers/$slug", slug: "opencode" },
      { label: "Cline", external: false, to: "/providers/$slug", slug: "cline" },
      { label: { text: "localModels" }, external: false, to: "/providers/$slug", slug: "local-models" },
      { label: { text: "allProviders" }, external: false, to: "/providers" },
    ],
  },
  {
    id: "compare",
    links: [
      { label: "CodeBot vs Grok Bot", external: false, to: "/compare/$slug", slug: "grok-bot" },
      { label: "CodeBot vs Hermes Agent", external: false, to: "/compare/$slug", slug: "hermes-agent" },
      { label: "CodeBot vs Muse", external: false, to: "/compare/$slug", slug: "muse" },
      { label: "CodeBot vs OpenClaw", external: false, to: "/compare/$slug", slug: "openclaw" },
      { label: "CodeBot vs Claude Cowork", external: false, to: "/compare/$slug", slug: "claude-cowork" },
      { label: "CodeBot vs ChatGPT dots", external: false, to: "/compare/$slug", slug: "chatgpt-dots" },
      { label: "CodeBot vs Manus", external: false, to: "/compare/$slug", slug: "manus" },
      { label: "CodeBot vs Devin", external: false, to: "/compare/$slug", slug: "devin" },
      { label: "CodeBot vs Paperclip", external: false, to: "/compare/$slug", slug: "paperclip" },
      { label: "CodeBot vs Viktor", external: false, to: "/compare/$slug", slug: "viktor" },
      { label: "CodeBot vs Instinct", external: false, to: "/compare/$slug", slug: "instinct" },
      { label: { text: "bestApps" }, external: false, to: "/compare/$slug", slug: "best-ai-agent-apps" },
      { label: { text: "allComparisons" }, external: false, to: "/compare" },
    ],
  },
];
