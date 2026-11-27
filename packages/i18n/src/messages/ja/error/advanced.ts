import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported": "このサーバーは高度な機能のスイッチに対応していません。サーバーを更新してください。",
  "error.advanced.invalidChange": "高度な機能の変更が無効です。",
  "error.advanced.featureOff":
    "この機能がオフのため、このツールは利用できません。ユーザーは 設定 > 高度な機能 でオンにできます。",
} as const satisfies PartialTranslation<typeof source>;
