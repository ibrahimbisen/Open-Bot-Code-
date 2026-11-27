import type { AppFormat, AppTranslate } from "@codebot/i18n";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function projectChatDateLabel(iso: string, now: Date, t: AppTranslate, format: AppFormat): string {
  const date = new Date(iso);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";
  const age = now.getTime() - time;
  if (age < MINUTE_MS) return t("project.chat.age.now");
  if (age < HOUR_MS) return t("project.chat.age.minutes", { count: Math.floor(age / MINUTE_MS) });
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (days === 0) return t("project.chat.age.hours", { count: Math.floor(age / HOUR_MS) });
  if (days === 1) return t("project.chat.age.yesterday");
  if (days < 7) return format.date(date, { weekday: "short" });
  if (date.getFullYear() === now.getFullYear()) return format.date(date, { month: "short", day: "numeric" });
  return format.date(date, { year: "numeric", month: "short", day: "numeric" });
}

export function projectChatDateTitle(iso: string, format: AppFormat): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return format.date(date, { dateStyle: "medium", timeStyle: "short" });
}
