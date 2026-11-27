import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "고급 기능",
  "advanced.tab.description": "기본적으로 숨겨진 기능을 켭니다.",
  "advanced.section.title": "숨겨진 기능",
  "advanced.section.description":
    "각 스위치는 {server}에서 기능을 표시하거나 숨깁니다. 꺼진 기능에는 버튼, 설정, 에이전트 도구가 없습니다. 데이터는 그대로 유지됩니다.",
  "advanced.adminOnly": "이 서버의 소유자나 관리자만 이 스위치를 변경할 수 있습니다.",
  "advanced.loadFailed": "OpenBot Code가 이 서버의 스위치를 읽을 수 없었습니다.",
  "advanced.saveFailed": "OpenBot Code가 스위치를 저장할 수 없었습니다.",
  "advanced.routines.title": "루틴",
  "advanced.routines.description": "예약된 작업과 웹훅입니다. 왼쪽 바에 일정을, 에이전트 설정에 루틴을 추가합니다.",
  "advanced.channels.title": "채널",
  "advanced.channels.description": "한 채팅에서 여러 에이전트를 사용합니다. 왼쪽 바에 채널을 추가합니다.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "설치할 스킬, 에이전트, 플러그인입니다. Marketplace 버튼을 추가합니다.",
  "advanced.chatApps.title": "Slack, Discord, Telegram, WhatsApp",
  "advanced.chatApps.description": "에이전트를 채팅 앱에 연결합니다. 채팅 앱 커넥터를 추가합니다.",
  "advanced.chatApps.open.title": "채팅 앱 연결",
  "advanced.chatApps.open.description": "Slack, Discord, Telegram 또는 WhatsApp을 연결합니다.",
  "advanced.chatApps.open.action": "열기",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "에이전트가 이 컴퓨터의 앱을 보고 제어할 수 있게 합니다. Computer Use 설정을 추가합니다.",
  "advanced.remoteDesktop.title": "원격 데스크톱",
  "advanced.remoteDesktop.description": "다른 기기에서 이 컴퓨터의 화면을 제어합니다.",
} as const satisfies PartialTranslation<typeof source>;
