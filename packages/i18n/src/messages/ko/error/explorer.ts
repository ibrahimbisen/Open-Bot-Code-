import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "이 경로는 프로젝트 폴더에 없습니다.",
  "error.explorer.notFound": "파일 또는 폴더가 없습니다.",
  "error.explorer.rootProtected": "프로젝트 폴더는 여기서 이름을 바꾸거나 삭제할 수 없습니다.",
  "error.explorer.invalidName": "이 이름은 파일이나 폴더에 사용할 수 없습니다.",
  "error.explorer.notFile": "이 경로는 파일이 아닙니다.",
  "error.explorer.notDirectory": "이 경로는 폴더가 아닙니다.",
  "error.explorer.exists": "이 폴더에 {name}이라는 이름의 파일 또는 폴더가 이미 있습니다.",
  "error.explorer.unknownAgent": "이 파일 트리의 에이전트가 없습니다.",
  "error.explorer.gitTimeout": "Git 명령이 너무 오래 걸려 중지되었습니다.",
  "error.explorer.gitFailed": "Git이 오류를 보고했습니다: {detail}",
  "error.explorer.serverUnsupported": "이 서버는 파일을 표시할 수 없습니다. 서버를 업데이트하세요.",
  "error.explorer.clientUnsupported": "이 OpenBot Code 버전은 서버의 파일을 표시할 수 없습니다.",
  "error.explorer.remoteFailed": "서버가 이 파일 작업을 완료할 수 없었습니다. 다시 시도하세요.",
} as const satisfies PartialTranslation<typeof source>;
