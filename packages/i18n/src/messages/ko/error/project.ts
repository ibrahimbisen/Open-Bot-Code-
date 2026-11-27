import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "이 서버는 프로젝트를 지원하지 않습니다. 서버를 실행하는 컴퓨터에서 OpenBot Code를 업데이트하세요.",
  "error.project.remoteFailed": "서버가 이 프로젝트 작업을 완료할 수 없었습니다. 다시 시도하세요.",
  "error.project.replyUnsupported": "이 서버는 답장 설정을 공유할 수 없습니다. 서버를 업데이트하세요.",
  "error.project.replyFailed": "서버가 답장 규칙을 저장할 수 없었습니다. 다시 시도하세요.",
  "error.project.notFound": "이 프로젝트는 더 이상 없습니다.",
  "error.project.archived": "이 프로젝트는 보관되어 있습니다. 먼저 복원하세요.",
  "error.project.nameRequired": "프로젝트의 이름을 입력하세요.",
  "error.project.limit": "프로젝트 최대 개수({limit})에 도달했습니다. 먼저 프로젝트를 삭제하세요.",
  "error.project.agentLimit": "프로젝트에는 에이전트를 최대 {limit}개까지 둘 수 있습니다.",
  "error.project.agentRequired": "프로젝트에는 에이전트가 하나 이상 필요합니다.",
  "error.project.agentNotFound": "이 에이전트는 프로젝트에 속해 있지 않습니다.",
  "error.project.agentNameRequired": "에이전트의 이름을 입력하세요.",
  "error.project.runtimeProviderMismatch":
    "채팅은 해당 에이전트의 공급자가 제공하는 다른 모델을 사용할 수 있습니다. 다른 공급자를 사용하려면 그 공급자의 에이전트로 채팅을 시작하세요.",
  "error.project.chatNotFound": "이 채팅은 더 이상 없습니다.",
  "error.project.cursorInvalid": "채팅 목록의 이 부분은 더 이상 유효하지 않습니다. 채팅을 다시 불러오세요.",
  "error.project.folderMissing": "이 폴더가 없습니다.",
  "error.project.folderProtected": "OpenBot Code가 이 폴더를 사용할 수 없습니다. 다른 폴더를 선택하세요.",
  "error.project.mainFolderMissing":
    "이 프로젝트의 기본 폴더가 없습니다: {path}. 폴더를 복원하거나 새 기본 폴더를 선택하세요.",
  "error.project.ownerOnly": "이 프로젝트를 만든 사람만 사용할 수 있어요.",
  "error.project.memberFolder": "이 서버에 있는 내 프로젝트 공간의 폴더를 사용하세요.",
  "error.project.memberOpenAccess": "소유자나 관리자만 프로젝트에 이 컴퓨터 전체 접근 권한을 줄 수 있어요.",
} as const satisfies PartialTranslation<typeof source>;
