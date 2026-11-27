import { isNumber } from "@codebot/contracts/runtime-values";

const PREVIEW_WIDTH_STORAGE_KEY = "codebot:project-preview-width:v1";

const PREVIEW_DEFAULT_FRACTION = 0.5;
const PREVIEW_MIN_FRACTION = 0.2;
const PREVIEW_MAX_FRACTION = 0.8;

type PreviewStorage = Pick<Storage, "getItem" | "setItem">;

export function clampPreviewFraction(value: number): number {
  return Math.min(PREVIEW_MAX_FRACTION, Math.max(PREVIEW_MIN_FRACTION, value));
}

export function readPreviewFraction(storage: PreviewStorage = window.localStorage): number {
  try {
    const value = JSON.parse(storage.getItem(PREVIEW_WIDTH_STORAGE_KEY) ?? "null");
    return isNumber(value) && Number.isFinite(value) ? clampPreviewFraction(value) : PREVIEW_DEFAULT_FRACTION;
  } catch {
    return PREVIEW_DEFAULT_FRACTION;
  }
}

export function writePreviewFraction(value: number, storage: PreviewStorage = window.localStorage): void {
  try {
    storage.setItem(PREVIEW_WIDTH_STORAGE_KEY, JSON.stringify(clampPreviewFraction(value)));
  } catch {}
}
