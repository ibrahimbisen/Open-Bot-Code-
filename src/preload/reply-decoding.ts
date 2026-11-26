import { isReplyRuleSettings, isTurnStepDetails } from "@codebot/contracts/ipc";
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";

export const decodeReplyRuleFromMain = guardedDecoder(isReplyRuleSettings, "reply rule response");
export const decodeTurnStepDetailsFromMain = guardedDecoder(isTurnStepDetails, "turn step details response");
