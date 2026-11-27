import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code가 계정 서비스에 연결하지 못했어요. API가 실행 중인지 확인한 후 다시 시도해 주세요.",
  "error.auth.sessionTimeout":
    "OpenBot Code가 제시간에 응답하지 않았습니다. 인터넷 연결을 확인한 다음 다시 시도하세요.",
  "error.auth.networkBlocked":
    "이 네트워크의 방화벽 또는 프록시가 OpenBot Code의 {host} 접속을 막았어요. 네트워크 관리자에게 {host} 허용을 요청한 후 다시 시도해 주세요.",
  "error.auth.signInFirst": "먼저 OpenBot Code에 로그인해 주세요.",
  "error.auth.accountServiceNotConfigured": "먼저 계정 서비스 주소를 입력하세요.",
  "error.auth.accountServiceUrlInvalid": "계정 서비스 주소는 https://로 시작해야 하며 경로가 없어야 합니다.",
  "error.auth.accountServiceFixed":
    "환경 변수 CODEBOT_AUTH_API_URL이 계정 서비스를 설정합니다. 여기서 주소를 바꾸려면 이 변수를 제거하세요.",
  "error.auth.signInFailed": "로그인이 완료되지 않았습니다. 다시 시도하세요.",
  "error.auth.signInCancelled": "로그인이 취소되었거나 거부되었습니다.",
  "error.auth.signInTimeout": "로그인에 시간이 너무 오래 걸렸습니다. 다시 시작하세요.",
  "error.auth.signInBrowserFailed": "OpenBot Code가 로그인을 위해 브라우저를 열 수 없었습니다.",
  "error.auth.signInUnavailable": "이 OpenBot Code는 로그인을 위해 브라우저를 열 수 없습니다.",
  "error.auth.signInRequired": "로그인이 필요해요.",
  "error.auth.chatColorUnavailable": "계정 서비스가 아직 채팅 색상을 지원하지 않아요. 나중에 다시 시도해 주세요.",
  "error.auth.accountChangedDuringRegister": "이 서버를 등록하는 동안 로그인한 계정이 바뀌었어요.",
  "error.auth.hostCredentialUnavailable": "원격 호스트 자격 증명을 사용할 수 없어요. 호스트를 다시 등록해 주세요.",
  "error.auth.serviceError": "계정 서비스에서 오류가 발생했어요.",
  "error.auth.serviceUnreachable":
    "OpenBot Code가 계정 서비스에 연결하지 못했어요. 연결 상태를 확인한 후 다시 시도해 주세요.",
  "error.auth.serviceTimeout": "계정 서비스가 제때 응답하지 않았어요. 다시 시도해 주세요.",
  "error.auth.serviceStatus": "계정 서비스에서 오류({status})가 발생했어요. 나중에 다시 시도해 주세요.",
  "error.auth.deliveryTimeout":
    "OpenBot Code가 전송 여부를 제때 확인하지 못했어요. 코드가 도착할 수도 있으니, 다시 보내기 전에 전송 여부를 확인해 주세요.",
} as const satisfies PartialTranslation<typeof source>;
