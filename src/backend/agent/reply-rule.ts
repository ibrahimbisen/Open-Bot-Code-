import { DEFAULT_REPLY_RULE, effectiveReplyRule } from "@codebot/contracts/ipc";
import { redactText } from "@codebot/logging";
import { agentProjectContext } from "../projects/project-context";

const REPLY_RULE_LABEL = "Reply rule, above all style guidance:";

export function agentReplyRule(agentId: string, globalRule: string | null | undefined): string {
  return effectiveReplyRule(agentProjectContext(agentId)?.replyRule, globalRule);
}

export function replyRuleInstruction(rule: string | undefined): string[] {
  const text = redactText((rule ?? DEFAULT_REPLY_RULE).trim());
  return text ? [`${REPLY_RULE_LABEL} ${text}`] : [];
}
