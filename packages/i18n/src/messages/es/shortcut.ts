import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Nuevo chat",
  "shortcut.command.switchProject": "Cambiar al siguiente proyecto",
  "shortcut.command.splitPanel": "Dividir el panel",
  "shortcut.command.closePanel": "Cerrar el panel",
  "shortcut.command.openCommandMenu": "Abrir el menú de comandos",
} as const satisfies PartialTranslation<typeof source>;
