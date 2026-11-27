import { REPLY_ROUTES } from "../ipc-replies";
import { directJsonPayloadCodecs } from "./json-payload-codec";

export { REPLY_ROUTES, REPLY_RULE_CAPABILITY, TURN_STEP_DETAILS_CAPABILITY } from "../ipc-replies";

export const REPLIES_CODECS = directJsonPayloadCodecs(REPLY_ROUTES);
