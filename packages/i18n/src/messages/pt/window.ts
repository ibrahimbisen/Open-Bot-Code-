import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "Computador anfitrião local do OpenBot Code",
  "window.localClientTitle": "Cliente local do OpenBot Code",
  "window.computerUsePermissionTitle": "Ativar Uso do computador",
  "window.rendererStoppedTitle": "O OpenBot Code parou de funcionar",
  "window.rendererStoppedBody":
    "A janela parou várias vezes. Suas conversas estão salvas e seus agentes continuam trabalhando.",
  "window.rendererStoppedReload": "Recarregar",
} as const satisfies PartialTranslation<typeof source>;
