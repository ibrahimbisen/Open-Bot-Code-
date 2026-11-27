import { isReplyRuleSettings, isTurnStepDetails } from "@codebot/contracts/ipc";
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";

export const decodeReplyRuleFromHost = guardedDecoder(isReplyRuleSettings, "reply rule response");
export const decodeTurnStepDetailsFromHost = guardedDecoder(isTurnStepDetails, "turn step details response");
