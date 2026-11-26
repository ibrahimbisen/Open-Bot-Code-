import { NOTIFICATION_SOUNDS, type NotificationSound } from "@codebot/contracts/notification-relay";
import type { MobileTextKey } from "@codebot/i18n/mobile";
import * as Notifications from "expo-notifications";
import { currentText } from "@/shared/lib/text";

export function androidChannelId(sound: NotificationSound | null): string {
  if (sound === null || sound === "default") return `codebot.sound.${sound ?? "none"}`;
  return `codebot.sound.${sound}.v2`;
}

const SOUND_FILES: Readonly<Record<Exclude<NotificationSound, "default">, string>> = {
  codebot: "codebot_task.wav",
  warm: "codebot_warm.wav",
  mech: "codebot_mech.wav",
  bubble: "codebot_bubble.wav",
  press: "codebot_press.wav",
};

const SOUND_LABELS = {
  codebot: "mobile.settings.notifications.sound.codebot",
  warm: "mobile.settings.notifications.sound.warm",
  mech: "mobile.settings.notifications.sound.mech",
  bubble: "mobile.settings.notifications.sound.bubble",
  press: "mobile.settings.notifications.sound.press",
  default: "mobile.settings.notifications.sound.defaultAndroid",
} as const satisfies Record<NotificationSound, MobileTextKey>;

export async function createAndroidChannels(): Promise<void> {
  const { t } = currentText();
  for (const sound of Object.keys(SOUND_FILES)) {
    await Notifications.deleteNotificationChannelAsync(`codebot.sound.${sound}`);
  }
  for (const sound of NOTIFICATION_SOUNDS) {
    await Notifications.setNotificationChannelAsync(androidChannelId(sound), {
      name: t("mobile.settings.notifications.channel", { sound: t(SOUND_LABELS[sound]) }),
      importance: Notifications.AndroidImportance.HIGH,
      ...(sound === "default" ? {} : { sound: SOUND_FILES[sound] }),
    });
  }
  await Notifications.setNotificationChannelAsync(androidChannelId(null), {
    name: t("mobile.settings.notifications.channelSilent"),
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: false,
  });
}
