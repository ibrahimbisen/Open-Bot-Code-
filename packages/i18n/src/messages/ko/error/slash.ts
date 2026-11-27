import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "이 에이전트는 엔진의 저장된 채팅을 다시 시작할 수 없습니다.",
  "error.slash.resumeEngineOff": "엔진이 실행 중이 아닙니다. 시작한 후 다시 시도하세요.",
  "error.slash.sessionNotFound": "이 저장된 채팅은 더 이상 없습니다. 목록을 새로 고치고 다른 채팅을 선택하세요.",
  "error.slash.sessionInUse": "OpenBot Code의 한 채팅이 이미 이 저장된 채팅을 사용하고 있습니다.",
  "error.slash.remoteFailed": "서버가 이 명령을 완료할 수 없었습니다. 다시 시도하세요.",
  "error.slash.serverUnsupported": "이 서버는 슬래시 명령을 나열할 수 없습니다. 서버를 업데이트하세요.",
} as const satisfies PartialTranslation<typeof source>;
