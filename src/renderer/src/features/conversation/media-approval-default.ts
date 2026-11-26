import type { CreditMediaGenerationKind } from "@codebot/contracts/credit-media";
import { mediaApprovalDefaultModelUpdate } from "@codebot/contracts/ipc";
import { saveMediaApprovalCredits } from "../servers/media-approval-credits-store";

export function desktopMediaApprovalDefault(serverId: () => string) {
  return async (kind: CreditMediaGenerationKind, model: string | null): Promise<void> => {
    await saveMediaApprovalCredits(serverId(), mediaApprovalDefaultModelUpdate(kind, model), window.codebot.hostAdmin);
  };
}
