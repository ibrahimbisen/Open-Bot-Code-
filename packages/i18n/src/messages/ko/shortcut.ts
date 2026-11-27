import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "새 채팅",
  "shortcut.command.switchProject": "다음 프로젝트로 전환",
  "shortcut.command.splitPanel": "패널 분할",
  "shortcut.command.closePanel": "패널 닫기",
  "shortcut.command.openCommandMenu": "명령 메뉴 열기",
} as const satisfies PartialTranslation<typeof source>;
