import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer": "업데이트 서버가 설정되지 않았습니다. 설정 > 업데이트에 업데이트 서버 URL을 입력하세요.",
  "error.appUpdate.urlInvalid": "업데이트 서버 URL이 올바르지 않습니다. https://로 시작하는 URL을 사용하세요.",
  "error.appUpdate.urlCredentials": "업데이트 서버 URL에서 사용자 이름과 비밀번호를 제거하세요.",
  "error.appUpdate.urlInsecure":
    "업데이트 서버 URL에는 https://를 사용하세요. http://는 같은 네트워크의 컴퓨터에만 허용됩니다.",
  "error.appUpdate.urlNotSaved": "OpenBot Code가 업데이트 서버 URL을 저장할 수 없었습니다. 다시 시도하세요.",
  "error.appUpdate.manualDownload":
    "이 Mac 빌드는 서명되지 않아 OpenBot Code가 업데이트를 직접 설치할 수 없습니다. 다운로드를 선택해 다운로드 페이지를 연 다음 새 버전을 직접 설치하세요.",
} as const satisfies PartialTranslation<typeof source>;
