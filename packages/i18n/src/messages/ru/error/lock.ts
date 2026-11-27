import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "Для режима «Строгий» нужна песочница Claude, которую Claude не может запустить на этом компьютере: {reason}. Выберите «Обычный» или «Открытый» в настройках проекта либо выберите другого провайдера.",
  "error.lock.claudeNoSandboxStrict":
    "Для режима «Строгий» нужна песочница Claude, которую Claude не может запустить на этом компьютере. Выберите «Обычный» или «Открытый» в настройках проекта либо выберите другого провайдера.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} не может удерживать агента внутри папок проекта на этом компьютере, поэтому OpenBot Code не запускает его в режиме {level}. Выберите «Открытый» в настройках проекта либо выберите Claude или Codex.",
  "error.lock.providerToolMissing":
    "Для режима {level} нужен {tool}, который OpenBot Code не нашёл. Установите его или выберите «Открытый» в настройках проекта.",
  "error.lock.containerMissing":
    "Для режима «Строгий» с контейнером нужен Docker или Podman, которые OpenBot Code не нашёл. Установите один из них или выберите «Обычный» в настройках проекта.",
  "error.lock.containerFailed":
    "Контейнер этого проекта не запустился: {reason}. Выберите «Обычный» в настройках проекта или исправьте инструмент контейнеров.",
  "error.lock.codexStrictNeedsSandbox":
    "Для режима «Строгий» нужна песочница Codex, которую Codex не может запустить на этом компьютере. Выберите «Обычный» или «Открытый» в настройках проекта либо выберите другого провайдера.",
  "error.lock.commandAsk":
    "Песочница ОС недоступна для этого агента, поэтому эта команда требует вашего подтверждения.",
} as const satisfies PartialTranslation<typeof source>;
