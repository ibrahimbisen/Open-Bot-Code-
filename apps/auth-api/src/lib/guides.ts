import { type ContentCollection, publishedFirst } from "./content-collection";
import { NEWS_AUTHOR } from "./news";

export const GUIDES_COLLECTION: ContentCollection<"guides"> = {
  id: "guides",
  indexRoute: "/guides",
  articleRoute: "/guides/$slug",
  name: "Guides",
  indexTitle: "CodeBot Guides: How to Run a Team of AI Agents",
  indexDescription:
    "How CodeBot works and how to run a team of AI agents. Start with how to set up your first agent, then explore practical guides to models, agents, and the Marketplace.",
  indexSocialImage: {
    path: "/social/guides.jpg",
    alt: "From idea to done. CodeBot agents on a folded paper path",
  },
  feedTitle: "CodeBot guides",
  backLabel: "All guides",
  moreTitle: "More guides",
  imageEyebrow: "CODEBOT · GUIDES",
  articles: publishedFirst([
    {
      slug: "ai-agent-productivity",
      title: "AI Agent Productivity: Why Persistence Beats a Blank Chat",
      description:
        "See how persistent CodeBot agents can help with recurring work. Follow a weekly client update and check whether saved context reduces setup and corrections.",
      publishedAt: "2026-11-19",
      author: NEWS_AUTHOR,
    },
    {
      slug: "ai-agent-workflows",
      title: "AI Agent Workflows: 12 Repeatable Processes for Small Teams",
      description:
        "Build a small team of CodeBot agents and reuse it across 12 practical workflows. Set roles, share files and connect research, writing and review.",
      publishedAt: "2026-11-17",
      author: NEWS_AUTHOR,
    },
    {
      slug: "ai-agent-workflow",
      title: "AI Agent Workflow: From Task to Finished Result",
      description:
        "Follow a practical AI agent workflow in CodeBot. Write a clear brief, check official sources, save a result and review it before you share it.",
      publishedAt: "2026-11-12",
      author: NEWS_AUTHOR,
    },
    {
      slug: "ai-teammates-vs-ai-chatbots",
      title: "AI Teammates vs AI Chatbots: When You Need More Than One Conversation",
      description:
        "See when a quick AI chat is enough and how to divide research, writing and review between CodeBot agents that can pass files to each other.",
      publishedAt: "2026-11-10",
      author: NEWS_AUTHOR,
    },
    {
      slug: "ai-workspace-vs-chat",
      title: "AI Agent Workspace vs Chat History: What Changes in Practice?",
      description:
        "Compare an AI agent workspace with chat history in CodeBot. See how saved files, shared work and model changes affect an ongoing research task.",
      publishedAt: "2026-11-03",
      author: NEWS_AUTHOR,
    },
    {
      slug: "install-codebot-vps",
      title: "How to Install CodeBot on a VPS: Ubuntu and Docker Guide",
      description:
        "Install CodeBot on a VPS with Ubuntu or Docker. Connect the server to your account, set up an AI provider, and manage updates, logs and backups.",
      publishedAt: "2026-10-30",
      author: NEWS_AUTHOR,
    },
    {
      slug: "import-hermes-agents",
      title: "How to Import Hermes Agents into CodeBot",
      description:
        "Import your Hermes Agent profiles into CodeBot. Choose what to bring over, review instructions, memories and skills, and check your agents after import.",
      publishedAt: "2026-10-27",
      author: NEWS_AUTHOR,
    },
    {
      slug: "import-grok-bot-agents",
      title: "How to Import Grok Bot Agents into CodeBot",
      description:
        "Move your Grok Bot agents into CodeBot with one ZIP export. Follow the steps for instructions, skills, memories, routines and optional files.",
      publishedAt: "2026-10-23",
      author: NEWS_AUTHOR,
    },
    {
      slug: "ai-agents-examples",
      title: "20 Real AI Agent Examples for Work and Business",
      description:
        "Explore 20 practical AI agent examples for research, content, coding and daily operations. Each CodeBot task ends with a result you can review.",
      publishedAt: "2026-10-20",
      author: NEWS_AUTHOR,
    },
    {
      slug: "ai-agents-vs-agentic-ai",
      title: "AI Agents vs Agentic AI: What Is the Difference?",
      description:
        "AI agents vs agentic AI, explained with a simple CodeBot example. See what an agent is, what makes its work agentic, and when one agent is enough.",
      publishedAt: "2026-10-16",
      author: NEWS_AUTHOR,
    },
    {
      slug: "agentic-ai-definition",
      title: "Agentic AI Definition: How It Differs From Chatbots",
      description:
        "What is agentic AI? Compare CodeBot agents with a typical chatbot: ongoing tasks, saved files, source checking and handoffs between agents.",
      publishedAt: "2026-10-13",
      author: NEWS_AUTHOR,
    },
    {
      slug: "codebot-hosted-servers",
      title: "CodeBot Hosted Servers: Plans, Pricing, and How They Work",
      description:
        "Compare CodeBot hosted server plans, pricing, storage, and team limits. Learn how to set one up and when self-hosting may suit you better.",
      publishedAt: "2026-10-07",
      author: NEWS_AUTHOR,
    },
    {
      slug: "codebot-marketplace",
      title: "How to Use the CodeBot Marketplace: Agents, Skills, and Plugins",
      description:
        "Browse the CodeBot Marketplace, install agents, plugins, and skills, and submit your own agent for review.",
      publishedAt: "2026-09-29",
      author: NEWS_AUTHOR,
    },
    {
      slug: "what-are-ai-agents",
      title: "What Are AI Agents? How They Work and When to Use Them",
      description:
        "What are AI agents, how do they work, and when are they useful? A practical guide to their tools, use cases, and limits.",
      publishedAt: "2026-09-24",
      author: NEWS_AUTHOR,
    },
    {
      slug: "codebot-101",
      title: "How to Use CodeBot: Set Up Your First AI Agent",
      description:
        "What CodeBot is, what an agent keeps between runs, and how to get one doing real work on your computer. Start here if you have not opened the app yet.",
      publishedAt: "2026-09-12",
      author: NEWS_AUTHOR,
    },
    {
      slug: "wtf-is-codebot",
      title: "What Is CodeBot? Models, Providers and Agents Explained",
      description:
        "A practical explanation of models, providers, agents, and the local-first workspace that brings them together.",
      publishedAt: "2026-09-15",
      author: NEWS_AUTHOR,
    },
  ]),
};
