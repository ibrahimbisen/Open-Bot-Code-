import type {
  AgentModelId,
  AgentProviderId,
  AgentReasoningEffort,
  CentralAuthUser,
  SpeechVoice,
  WorkflowNodeKind,
} from "@codebot/contracts/ipc";

type ServerKind = "local" | "remote" | "unknown";
type AnalyticsResult = "succeeded" | "failed";
type AnalyticsOutcome = AnalyticsResult | "cancelled";
type TranscriptionKind = "local" | "cloud" | "server";

interface AgentAnalyticsProperties {
  provider: AgentProviderId;
  model: AgentModelId;
  reasoning_effort: AgentReasoningEffort;
  server_kind: ServerKind;
}

export type WorkflowAnalyticsAction =
  | "create"
  | "rename"
  | "delete"
  | "run"
  | "run_step"
  | "stop_step"
  | "stop_run"
  | "retry_step"
  | "approve"
  | "reject"
  | "restore_version"
  | "rotate_webhook_secret";

interface DesktopAnalyticsEvents {
  account_sign_in_started: { result: "code_sent" | "company_sign_in" | "failed"; failure_code?: string };
  account_sign_in_completed: { result: AnalyticsResult; failure_code?: string };
  account_sign_out: { result: AnalyticsResult; failure_code?: string };
  onboarding_completed: { preferred_provider: AgentProviderId; path?: OnboardingPath; skipped?: boolean };
  onboarding_step: { step: OnboardingStep; action: "viewed" | "next" | "back" | "skipped"; path?: OnboardingPath };
  agent_action:
    | ({ action: "create" } & Partial<AgentAnalyticsProperties> & {
          result: AnalyticsResult;
          failure_code?: string;
        })
    | (Partial<AgentAnalyticsProperties> & {
        action: "update";
        changed_fields: string[];
        result: AnalyticsResult;
        failure_code?: string;
      })
    | (Partial<AgentAnalyticsProperties> & {
        action: "delete" | "duplicate" | "branch";
        result: AnalyticsResult;
        failure_code?: string;
      });
  message_send: Partial<AgentAnalyticsProperties> & {
    channel: "agent" | "direct";
    attachment_count: number;
    attachment_kinds?: AttachmentKind[];
    is_reply: boolean;
    result: AnalyticsResult;
    delivery_count?: number;
    failure_code?: string;
  };
  agent_input_action: {
    kind: "prompt" | "approval";
    decision: "answered" | "accept" | "decline";
    result: AnalyticsResult;
    failure_code?: string;
  };
  queue_action: {
    action: "cancel" | "steer" | "send_now" | "edit" | "reorder" | "interrupt";
    result: AnalyticsResult;
    failure_code?: string;
  };
  routine_action: {
    action: "create" | "update" | "delete" | "test";
    trigger_type: string;
    duration_ms: number;
    result: AnalyticsResult;
    failure_code?: string;
  };
  workflow_action: {
    action: WorkflowAnalyticsAction;
    node_kind?: WorkflowNodeKind;
    duration_ms: number;
    result: AnalyticsResult;
    failure_code?: string;
  };
  team_action: {
    action:
      | "server_selected"
      | "server_joined"
      | "server_left"
      | "server_removed"
      | "identity_saved"
      | "published"
      | "unpublished"
      | "invite_created"
      | "member_updated"
      | "member_removed"
      | "invite_revoked"
      | "mcp_server_saved"
      | "mcp_server_removed"
      | "mcp_server_toggled"
      | "mcp_server_tested"
      | "invite_link_copied"
      | "invite_qr_shown";
    result: AnalyticsResult;
    server_kind?: ServerKind;
    role?: "admin" | "member";
    email_bound?: boolean;
    entry_point?: "in_app" | "invite_deep_link";
    failure_code?: string;
  };
  browser_action: {
    action: "open" | "activate" | "reload" | "close";
    result: AnalyticsResult;
    failure_code?: string;
  };
  search_action: {
    scope: "global" | "agent";
    result: AnalyticsResult;
    result_count?: number;
    failure_code?: string;
  };
  remote_desktop_action: {
    action: "connect" | "disconnect" | "select_display";
    result: AnalyticsResult;
    transport?: "unknown" | "p2p" | "relay";
    failure_code?: string;
  };
  update_action: {
    action: "check" | "download" | "install";
    result: AnalyticsResult;
    phase?: string;
    failure_code?: string;
  };
  marketplace_action: {
    entity: "skill" | "agent" | "plugin";
    action: "view" | "install" | "update" | "uninstall" | "publish" | "enable" | "disable";
    result: AnalyticsResult;
    failure_code?: string;
    listing_slug?: string;
  };
  memory_action: {
    action: "create" | "update" | "delete" | "clear";
    result: AnalyticsResult;
    failure_code?: string;
  };
  provider_action: {
    provider?: AgentProviderId;
    action:
      | "connect_started"
      | "connect_completed"
      | "refresh"
      | "download_started"
      | "download_completed"
      | "download_cancelled"
      | "cli_update_started"
      | "cli_update_completed"
      | "sign_in_cancelled"
      | "api_key_saved"
      | "custom_provider_saved"
      | "custom_provider_removed";
    result: AnalyticsOutcome;
    method?: "browser" | "code" | "api_key";
    failure_code?: string;
  };
  voice_transcription: {
    result: AnalyticsResult;
    audio_duration_seconds: number;
    duration_ms: number;
    failure_code?: string;
  };
  voice_conversation_action: {
    action: "start" | "end" | "interrupt" | "mute" | "unmute";
    server_kind: ServerKind;
    result: AnalyticsResult;
    trigger?: "button" | "voice";
    transcription?: TranscriptionKind;
    duration_ms?: number;
    turn_count?: number;
    failure_code?: string;
  };
  voice_turn: {
    server_kind: ServerKind;
    transcription: TranscriptionKind;
    result: AnalyticsResult;
    audio_duration_seconds: number;
    duration_ms?: number;
    recording_kept?: boolean;
    failure_code?: string;
  };
  speech_reply: {
    trigger: "voice_conversation" | "progress_update" | "dictation" | "read_aloud";
    result: AnalyticsResult;
    completed?: boolean;
    first_audio_ms?: number;
    audio_duration_seconds?: number;
    failure_code?: string;
  };
  speech_model_action: {
    action: "download";
    entry_point: "settings" | "voice_conversation";
    result: AnalyticsResult;
    duration_ms: number;
    failure_code?: string;
  };
  speech_settings_action: {
    action: "read_replies_on" | "read_replies_off" | "voice_changed";
    result: AnalyticsResult;
    voice?: SpeechVoice;
    failure_code?: string;
  };
  reaction_action: {
    action: "add" | "remove";
    result: AnalyticsResult;
    failure_code?: string;
  };
  usage_limit_action: {
    action: "shown" | "model_switched" | "waited";
    from_provider?: AgentProviderId;
    to_provider?: AgentProviderId;
    to_model?: AgentModelId;
  };
  agent_template_action: {
    action: "published" | "updated" | "unpublished" | "link_copied" | "installed";
    result: AnalyticsResult;
    entry_point?: "deep_link" | "in_app";
    failure_code?: string;
  };
  mobile_connect_action: {
    action: "code_shown" | "link_created" | "connected" | "cancelled" | "revoked" | "link_revoked";
    result: AnalyticsResult;
    failure_code?: string;
  };
  connector_action: {
    connector: "slack" | "discord" | "telegram" | "whatsapp" | "github" | "onepassword" | "bitwarden" | "protonpass";
    action: "connect_started" | "connected" | "disconnected" | "enabled" | "disabled";
    result: AnalyticsResult;
    failure_code?: string;
  };
  computer_use_action: { action: "permission_opened"; permission: "screen-recording" | "accessibility" };
  help_link_opened: {
    destination: "discord" | "feedback" | "report-problem" | "guides" | "changelog";
  };
  channel_action: {
    action: "created" | "archived" | "member_added";
    result: AnalyticsResult;
    failure_code?: string;
  };
  server_transfer_action: {
    action: "export" | "import" | "copy";
    result: AnalyticsOutcome;
    failure_code?: string;
  };
  usage_viewed: { scope: "agent" | "server"; range?: "7d" | "30d" | "90d" | "1y"; filtered?: boolean };
}

type OnboardingStep = "existing" | "choose" | "plan" | "computer" | "language";
type OnboardingPath = "free" | "plan" | "existing";
type AttachmentKind = "image" | "document" | "spreadsheet" | "zip" | "other";

type AnalyticsEventName = keyof DesktopAnalyticsEvents;
export type DesktopAnalyticsProperties<Name extends AnalyticsEventName> = DesktopAnalyticsEvents[Name];
export interface DesktopAnalyticsScope {
  track<Name extends AnalyticsEventName>(name: Name, properties: DesktopAnalyticsEvents[Name]): void;
}

class DesktopAnalytics implements DesktopAnalyticsScope {
  setUser(_user: Pick<CentralAuthUser, "id" | "email"> | null): void {}

  scope(): DesktopAnalyticsScope {
    return this;
  }

  anonymousScope(): DesktopAnalyticsScope {
    return this;
  }

  track<Name extends AnalyticsEventName>(_name: Name, _properties: DesktopAnalyticsEvents[Name]): void {}
}

export const desktopAnalytics = new DesktopAnalytics();
