import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported": "이 서버는 고급 기능 스위치를 지원하지 않습니다. 서버를 업데이트하세요.",
  "error.advanced.invalidChange": "고급 기능 변경이 올바르지 않습니다.",
  "error.advanced.featureOff":
    "기능이 꺼져 있어 이 도구를 사용할 수 없습니다. 사용자는 설정 > 고급 기능에서 켤 수 있습니다.",
} as const satisfies PartialTranslation<typeof source>;
