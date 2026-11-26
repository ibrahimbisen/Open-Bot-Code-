import { type ContentCollection, publishedFirst } from "./content-collection";
import { NEWS_AUTHOR } from "./news";

export const PROVIDERS_COLLECTION: ContentCollection<"providers"> = {
  id: "providers",
  indexRoute: "/providers",
  articleRoute: "/providers/$slug",
  name: "Providers",
  indexTitle: "AI coding agents that CodeBot runs",
  indexDescription:
    "Claude Code, Codex, Gemini, Grok, Cursor, OpenCode, Cline, Muse Code, Pi, Inception, ACP agents and local models in one desktop app: how to set each one up, and what CodeBot adds to it.",
  indexSocialImage: {
    path: "/social/providers.jpg",
    alt: "Open to possibility. Two CodeBot agents beside a glass frame",
  },
  feedTitle: "CodeBot providers",
  backLabel: "All providers",
  moreTitle: "More providers",
  imageEyebrow: "CODEBOT · PROVIDERS",
  articles: publishedFirst([
    {
      slug: "claude-code",
      title: "Claude Code GUI: Run Claude Code in a Desktop App",
      description:
        "Run Claude Code in CodeBot on macOS, Windows or Linux. Sign in with your Claude plan, then give it a team, shared channels and an app on your phone.",
      publishedAt: "2026-10-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "codex",
      title: "Codex Desktop App for macOS, Windows and Linux",
      description:
        "Run OpenAI Codex in CodeBot on macOS, Windows or Linux. Sign in with ChatGPT, then give Codex a team, shared channels and an app on your phone.",
      publishedAt: "2026-10-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "gemini",
      title: "Gemini Agent Desktop App: Run Gemini in CodeBot",
      description:
        "Run the Gemini coding agent in CodeBot on macOS, Windows or Linux. Sign in with Google, then give it a team, shared channels and an app on your phone.",
      publishedAt: "2026-10-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "grok",
      title: "Grok CLI GUI: Run the Grok Coding Agent in CodeBot",
      description:
        "Run the Grok coding agent in CodeBot on macOS, Windows or Linux. Sign in with xAI, then give it a team, shared channels and an app on your phone.",
      publishedAt: "2026-10-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "cursor",
      title: "Cursor CLI GUI: Run the Cursor Agent in CodeBot",
      description:
        "Run the Cursor agent outside the editor, in CodeBot on macOS, Windows or Linux. Give it a team and shared channels with agents on other providers.",
      publishedAt: "2026-10-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "opencode",
      title: "OpenCode GUI: Run OpenCode and Its Free Models in CodeBot",
      description:
        "Run OpenCode in CodeBot on macOS, Windows or Linux, with its free models and no account. Give it a team and shared channels with agents on other providers.",
      publishedAt: "2026-10-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "cline",
      title: "Cline Desktop App: Run Cline Without an Editor in CodeBot",
      description:
        "Run the Cline agent without an editor, in CodeBot on macOS, Windows or Linux. Give it a team and shared channels with agents on other providers.",
      publishedAt: "2026-10-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "local-models",
      title: "Ollama and LM Studio Agent App: Run Local Models in CodeBot",
      description:
        "Run a coding agent on a model from Ollama or LM Studio, in CodeBot on macOS, Windows or Linux. The model and your files stay on your computer.",
      publishedAt: "2026-10-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "muse-code",
      title: "Muse Code GUI: Run Meta's Coding Agent in CodeBot",
      description:
        "Run Muse Code in CodeBot on macOS, Windows or Linux. Sign in with your Meta account, then give it a team, shared channels and an app on your phone.",
      publishedAt: "2026-10-24",
      author: NEWS_AUTHOR,
    },
    {
      slug: "pi",
      title: "Pi Coding Agent GUI: Run Pi in CodeBot",
      description:
        "Run the Pi coding agent in CodeBot on macOS, Windows or Linux, with the providers you sign in to. Give it a team and shared channels with agents on other providers.",
      publishedAt: "2026-10-24",
      author: NEWS_AUTHOR,
    },
    {
      slug: "inception",
      title: "Mercury Agent App: Run Inception's Mercury Models in CodeBot",
      description:
        "Run a coding agent on Inception's Mercury diffusion models, in CodeBot on macOS, Windows or Linux. Give it a team and shared channels with agents on other providers.",
      publishedAt: "2026-10-24",
      author: NEWS_AUTHOR,
    },
    {
      slug: "custom-agents",
      title: "ACP Agent GUI: Run Goose, Qwen Code and Oh My Pi in CodeBot",
      description:
        "Run any Agent Client Protocol agent in CodeBot on macOS, Windows or Linux, such as Goose, Qwen Code or Oh My Pi. Give it a team and an app on your phone.",
      publishedAt: "2026-10-24",
      author: NEWS_AUTHOR,
    },
  ]),
};
