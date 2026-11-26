import type { ArticleBody } from "../body";
import { AgenticAIDefinition } from "./agentic-ai-definition";
import { AIAgentProductivity } from "./ai-agent-productivity";
import { AIAgentWorkflow } from "./ai-agent-workflow";
import { AIAgentWorkflows } from "./ai-agent-workflows";
import { AIAgentsExamples } from "./ai-agents-examples";
import { AIAgentsVsAgenticAI } from "./ai-agents-vs-agentic-ai";
import { AITeammatesVsAIChatbots } from "./ai-teammates-vs-ai-chatbots";
import { AIWorkspaceVsChat } from "./ai-workspace-vs-chat";
import { CodeBot101 } from "./codebot-101";
import { CodeBotHostedServers } from "./codebot-hosted-servers";
import { CodeBotMarketplace } from "./codebot-marketplace";
import { ImportGrokBotAgents } from "./import-grok-bot-agents";
import { ImportHermesAgents } from "./import-hermes-agents";
import { InstallCodeBotVPS } from "./install-codebot-vps";
import { WhatAreAIAgents } from "./what-are-ai-agents";
import { WtfIsCodeBot } from "./wtf-is-codebot";

export const GUIDE_BODIES: Readonly<Record<string, ArticleBody>> = {
  "ai-agent-workflows": AIAgentWorkflows,
  "ai-agent-productivity": AIAgentProductivity,
  "ai-agent-workflow": AIAgentWorkflow,
  "ai-teammates-vs-ai-chatbots": AITeammatesVsAIChatbots,
  "ai-workspace-vs-chat": AIWorkspaceVsChat,
  "install-codebot-vps": InstallCodeBotVPS,
  "import-hermes-agents": ImportHermesAgents,
  "import-grok-bot-agents": ImportGrokBotAgents,
  "ai-agents-examples": AIAgentsExamples,
  "ai-agents-vs-agentic-ai": AIAgentsVsAgenticAI,
  "agentic-ai-definition": AgenticAIDefinition,
  "what-are-ai-agents": WhatAreAIAgents,
  "codebot-101": CodeBot101,
  "codebot-hosted-servers": CodeBotHostedServers,
  "codebot-marketplace": CodeBotMarketplace,
  "wtf-is-codebot": WtfIsCodeBot,
};
