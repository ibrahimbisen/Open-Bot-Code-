import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {} as const satisfies PartialTranslation<typeof source>;
