import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "엄격 모드에는 Claude 샌드박스가 필요하지만 Claude는 이 컴퓨터에서 이를 시작할 수 없습니다: {reason}. 프로젝트 설정에서 일반 또는 개방을 선택하거나 다른 공급자를 선택하세요.",
  "error.lock.claudeNoSandboxStrict":
    "엄격 모드에는 Claude 샌드박스가 필요하지만 Claude는 이 컴퓨터에서 이를 시작할 수 없습니다. 프로젝트 설정에서 일반 또는 개방을 선택하거나 다른 공급자를 선택하세요.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider}은(는) 이 컴퓨터에서 에이전트를 프로젝트 폴더 안에 머물게 할 수 없으므로 OpenBot Code는 {level} 모드로 시작하지 않습니다. 프로젝트 설정에서 개방을 선택하거나 Claude 또는 Codex를 선택하세요.",
  "error.lock.providerToolMissing":
    "{level} 모드에는 {tool}이(가) 필요하지만 OpenBot Code가 찾지 못했습니다. 설치하거나 프로젝트 설정에서 개방을 선택하세요.",
  "error.lock.containerMissing":
    "컨테이너를 쓰는 엄격 모드에는 Docker 또는 Podman이 필요하지만 OpenBot Code가 찾지 못했습니다. 둘 중 하나를 설치하거나 프로젝트 설정에서 일반을 선택하세요.",
  "error.lock.containerFailed":
    "이 프로젝트의 컨테이너가 시작되지 않았습니다: {reason}. 프로젝트 설정에서 일반을 선택하거나 컨테이너 도구를 고치세요.",
  "error.lock.codexStrictNeedsSandbox":
    "엄격 모드에는 Codex 샌드박스가 필요하지만 Codex는 이 컴퓨터에서 이를 시작할 수 없습니다. 프로젝트 설정에서 일반 또는 개방을 선택하거나 다른 공급자를 선택하세요.",
  "error.lock.commandAsk": "이 에이전트에는 OS 샌드박스를 사용할 수 없으므로 이 명령에는 승인이 필요합니다.",
} as const satisfies PartialTranslation<typeof source>;
