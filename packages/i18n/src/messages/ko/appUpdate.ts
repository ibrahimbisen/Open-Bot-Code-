import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "업데이트 서버",
  "appUpdate.server.description":
    "비워 두면 OpenBot Code의 GitHub 릴리스에서 업데이트를 받습니다. 자체 서버를 사용하려면 설치 프로그램과 업데이트 파일이 있는 폴더의 URL을 입력하세요.",
  "appUpdate.server.urlLabel": "업데이트 서버 URL",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code는 이 URL에서 업데이트를 받습니다.",
  "appUpdate.server.source.environment":
    "OpenBot Code는 {url}에서 업데이트를 받습니다. 이 URL은 환경 변수 CODEBOT_UPDATE_URL에서 가져온 것입니다.",
  "appUpdate.server.source.build":
    "OpenBot Code는 {url}에서 업데이트를 받습니다. 이 URL은 이 OpenBot Code 빌드에서 가져온 것입니다.",
  "appUpdate.server.source.none": "업데이트 서버가 설정되지 않았습니다. OpenBot Code는 업데이트를 확인하지 않습니다.",
  "appUpdate.server.saveFailed": "OpenBot Code가 업데이트 서버 URL을 저장할 수 없었습니다.",
  "appUpdate.server.loadFailed": "OpenBot Code가 업데이트 서버 URL을 읽을 수 없었습니다.",
  "appUpdate.autoRestart.title": "유휴 상태일 때 자동으로 다시 시작",
  "appUpdate.autoRestart.description":
    "에이전트가 작업 중이 아닐 때 OpenBot Code가 다시 시작되어 내려받은 업데이트를 설치합니다. 서버 구성원은 잠시 연결이 끊깁니다.",
} as const satisfies PartialTranslation<typeof source>;
