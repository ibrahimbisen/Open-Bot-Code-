import { type CodeBotDesktopApi, nextSpeechSpeed, type SpeechSettings, type SpeechSpeed } from "@codebot/contracts/ipc";
import { toast } from "@codebot/ui";
import { currentText } from "@codebot/ui/text";
import { createSignal } from "solid-js";
import { setReplyPlaybackRate } from "./speech-playback";
import { speechPort } from "./speech-port";

const [speed, setSpeed] = createSignal<SpeechSpeed>(1);
let loading: Promise<void> | undefined;
let changed = false;
let saved: SpeechSpeed = 1;
let saving: Promise<unknown> = Promise.resolve();

function apply(next: SpeechSpeed): void {
  setSpeed(next);
  setReplyPlaybackRate(next);
}

export function updateSpeechSettings(
  voice: Pick<CodeBotDesktopApi["voice"], "getSpeechSettings" | "setSpeechSettings">,
  patch: Partial<SpeechSettings>,
): Promise<SpeechSettings> {
  const next = saving.then(async () => voice.setSpeechSettings({ ...(await voice.getSpeechSettings()), ...patch }));
  saving = next.catch(() => undefined);
  return next;
}

export function speechSpeed(): SpeechSpeed {
  void loadSpeechSpeed();
  return speed();
}

export function loadSpeechSpeed(): Promise<void> {
  loading ??= speechPort()
    .voice.getSpeechSettings()
    .then(
      (settings) => {
        if (changed) return;
        saved = settings.speed;
        apply(settings.speed);
      },
      () => {
        loading = undefined;
      },
    );
  return loading;
}

export function changeSpeechSpeed(next: SpeechSpeed): void {
  if (next === speed()) return;
  changed = true;
  apply(next);
  updateSpeechSettings(speechPort().voice, { speed: next }).then(
    (settings) => {
      saved = settings.speed;
    },
    () => {
      if (speed() === next) apply(saved);
      toast.error(currentText().t("settings.voice.saveFailed"), {
        report: { operation: "settings", source: "system", cause_code: "unknown" },
      });
    },
  );
}

export function cycleSpeechSpeed(): void {
  void loadSpeechSpeed().then(() => {
    changeSpeechSpeed(nextSpeechSpeed(speed()));
  });
}
