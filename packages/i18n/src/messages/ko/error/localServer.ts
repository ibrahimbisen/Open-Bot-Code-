import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused": "{host}의 모델 서버가 연결을 거부했습니다. 해당 머신에서 모델 서버를 시작하세요.",
  "error.localServer.hostNotFound": "주소 {host}을(를) 찾을 수 없습니다. 머신 이름을 확인하세요.",
  "error.localServer.timeout": "{host}의 모델 서버가 {seconds}초 안에 응답하지 않았습니다.",
  "error.localServer.unreachable":
    "{host}의 모델 서버에 연결할 수 없습니다. 머신이 켜져 있고 네트워크에 연결되어 있는지 확인하세요.",
  "error.localServer.redirect":
    "{host}의 모델 서버가 리디렉션을 보냈습니다. OpenBot Code는 API 키를 안전하게 지키기 위해 리디렉션을 따르지 않습니다.",
  "error.localServer.keyNeeded": "{host}의 모델 서버에는 API 키가 필요합니다. 이 머신의 키를 추가하세요.",
  "error.localServer.keyRefused": "{host}의 모델 서버가 API 키를 거부했습니다. 이 머신의 키를 확인하세요.",
  "error.localServer.http": "{host}의 모델 서버가 HTTP 상태 {status}(으)로 응답했습니다.",
  "error.localServer.invalidAnswer": "{host}의 모델 서버가 OpenAI 호환 모델 목록을 보내지 않았습니다.",
  "error.localServer.tooLarge": "{host}의 모델 서버 응답이 너무 큽니다.",
  "error.localServer.gpuUnreachable": "GPU 상태 주소 {host}에 연결할 수 없습니다.",
  "error.localServer.gpuTimeout": "GPU 상태 주소 {host}이(가) {seconds}초 안에 응답하지 않았습니다.",
  "error.localServer.gpuRedirect":
    "GPU 상태 주소 {host}이(가) 리디렉션을 보냈습니다. OpenBot Code는 리디렉션을 따르지 않습니다.",
  "error.localServer.gpuHttp": "GPU 상태 주소 {host}이(가) HTTP 상태 {status}(으)로 응답했습니다.",
  "error.localServer.gpuInvalid":
    "GPU 상태 주소 {host}이(가) OpenBot Code에서 읽을 수 있는 GPU 값을 보내지 않았습니다.",
  "error.localServer.gpuTooLarge": "GPU 상태 주소 {host}의 응답이 너무 큽니다.",
  "error.localServer.gpuUrlInvalid": "GPU 상태 URL은 사용자 이름과 비밀번호가 없는 http 또는 https 주소여야 합니다.",
  "error.localServer.gpuKeyOtherOrigin":
    "API 키는 GPU 상태 URL이 기본 URL과 같은 출처일 때만 해당 URL로 보낼 수 있습니다.",
  "error.localServer.scanHostInvalid": "호스트 이름, IP 주소 또는 http 또는 https 주소를 입력하세요.",
} as const satisfies PartialTranslation<typeof source>;
