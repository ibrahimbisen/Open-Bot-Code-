import { Button } from "@codebot/ui";
import type { AgentProfile } from "@codebot/ui/data";
import { AgentAvatar } from "@codebot/ui/features/agents/AgentAvatar";
import { StopIcon } from "@codebot/ui/features/conversation/ConversationIcons";
import { VoiceWaveform } from "@codebot/ui/features/conversation/VoiceRecordingMorph";
import { useText } from "@codebot/ui/text";

export interface SpeakingBarProps {
  agent: AgentProfile;
  caption: string;
  levels: readonly number[];
  onStop: () => void;
}

export function SpeakingBar(props: SpeakingBarProps) {
  const { t } = useText();
  return (
    <section class="speaking-bar" aria-label={t("conversation.speech.label", { name: props.agent.name })}>
      <AgentAvatar agent={props.agent} mood="responded" motion="always" class="speaking-bar-avatar" />
      <VoiceWaveform levels={props.levels} class="speaking-bar-waveform" />
      <p class="speaking-bar-caption">{props.caption}</p>
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        class="speaking-bar-stop"
        aria-label={t("conversation.speech.stop")}
        title={t("conversation.speech.stop")}
        onClick={() => props.onStop()}
      >
        <StopIcon />
      </Button>
    </section>
  );
}
