export const NOTIFICATION_SOUNDS = ["codebot", "warm", "mech", "bubble", "press", "default"] as const;
export type NotificationSound = (typeof NOTIFICATION_SOUNDS)[number];

export interface NotificationRelayPush {
  token: string;
  environment: "production" | "development";
  sessionId: string;
  sealed: string;
  sound: NotificationSound | null;
  timestamp: number;
}

export interface AndroidNotificationRelayPush {
  token: string;
  sessionId: string;
  sealed: string;
  sound: NotificationSound | null;
  timestamp: number;
}

export const NOTIFICATION_SEALED_LIMIT = 3_600;
export const NOTIFICATION_TOKEN_PATTERN = /^(?:[0-9a-f]{2}){8,256}$/u;
export const NOTIFICATION_SOUND_FILES: Readonly<Record<Exclude<NotificationSound, "default">, string>> = {
  codebot: "codebot-task.wav",
  warm: "codebot-warm.wav",
  mech: "codebot-mech.wav",
  bubble: "codebot-bubble.wav",
  press: "codebot-press.wav",
};
