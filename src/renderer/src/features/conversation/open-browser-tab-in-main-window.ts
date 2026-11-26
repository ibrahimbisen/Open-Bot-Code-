import { classifyFailure } from "@codebot/telemetry";
import { currentText } from "@codebot/ui/text";
import { actionToast } from "../../action-toast";
import { conversationPort } from "./conversation-port";

export function openBrowserTabInMainWindow(page: { serverId: string; agentId: string; tabId: string }): void {
  void conversationPort()
    .dynamicIsland.openBrowserTakeover(page)
    .catch((error: unknown) => {
      const { t, errorMessage } = currentText();
      actionToast.error(errorMessage(error, t("prompt.browser.openFailed")), {
        report: { operation: "other", source: "action", cause_code: classifyFailure(error) },
      });
    });
}
