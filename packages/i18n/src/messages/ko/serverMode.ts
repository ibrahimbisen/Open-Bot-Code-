import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "에이전트가 실행되는 위치",
  "serverMode.switch.thisComputer": "이 컴퓨터",
  "serverMode.switch.homeServer": "홈 서버",
  "serverMode.switch.homeServerNamed": "{name}에서 에이전트 실행",
  "serverMode.switch.noHomeServer": "아직 홈 서버가 없습니다. 선택하여 참여하세요.",
  "serverMode.switch.useComputer": "이 컴퓨터에서 에이전트 실행",
  "serverMode.switch.useHomeServer": "홈 서버에서 에이전트 실행",
} as const satisfies PartialTranslation<typeof source>;
