import type { AgentEvent } from "@codebot/contracts/ipc";
import type { CreditMediaReport } from "../backend/agent/credit-media-tools";
import type { FailureSignal } from "../backend/agent/failure-signal";
import type { ToolUsageSignal } from "../backend/agent/thread-items";
import type { BrowserSiteVisit } from "../backend/browser-host";
import type { WorkflowRunEnd } from "../backend/workflows/workflows";
import type { WebhookDeliveryReport } from "./host-events-service";
import type { RemoteConnectSummary } from "./remote-connect-trace";
import type { MainLoopStallProfile } from "./resource-monitor";
import type { StartupProperties } from "./startup-timing";

export class HostAnalytics {
  handleAgentEvent(_event: AgentEvent): void {}

  handleStartup(_properties: StartupProperties): void {}

  handleMainLoopProfile(_profile: MainLoopStallProfile): void {}

  handleRemoteConnect(_summary: RemoteConnectSummary): void {}

  handleFailure(_failure: FailureSignal): void {}

  handleToolUsage(_usage: ToolUsageSignal): void {}

  handleWorkflowRun(_end: WorkflowRunEnd): void {}

  handleCreditMedia(_report: CreditMediaReport): void {}

  handleWebhookDelivery(_report: WebhookDeliveryReport): void {}

  handleSiteVisit(_visit: BrowserSiteVisit): void {}

  checkResources(): void {}
}
