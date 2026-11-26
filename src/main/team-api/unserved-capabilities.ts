import { CODEBOT_CREDITS_EVENTS_CAPABILITY } from "@codebot/contracts/team-protocol/codebot-credits-events-v1";
import { HOSTED_SITES_CAPABILITY } from "@codebot/contracts/team-protocol/hosted-sites-v1";
import { MEDIA_APPROVAL_CHOICE_CAPABILITY } from "@codebot/contracts/team-protocol/media-approval-choice-v1";
import { MEDIA_APPROVAL_CREDITS_CAPABILITY } from "@codebot/contracts/team-protocol/media-approval-credits-v1";
import { WORKFLOWS_CREDIT_MEDIA_UNAVAILABLE_CAPABILITY } from "@codebot/contracts/team-protocol/workflows-credit-media-unavailable-v1";
import { WORKFLOWS_CREDIT_MEDIA_CAPABILITY } from "@codebot/contracts/team-protocol/workflows-credit-media-v1";

export const UNSERVED_TEAM_CAPABILITIES: ReadonlySet<string> = new Set([
  CODEBOT_CREDITS_EVENTS_CAPABILITY,
  HOSTED_SITES_CAPABILITY,
  MEDIA_APPROVAL_CHOICE_CAPABILITY,
  MEDIA_APPROVAL_CREDITS_CAPABILITY,
  WORKFLOWS_CREDIT_MEDIA_CAPABILITY,
  WORKFLOWS_CREDIT_MEDIA_UNAVAILABLE_CAPABILITY,
]);
