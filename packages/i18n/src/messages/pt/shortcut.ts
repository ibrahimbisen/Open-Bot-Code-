import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/shortcut";

export const messages = {
  "shortcut.command.newChat": "Novo chat",
  "shortcut.command.switchProject": "Ir para o próximo projeto",
  "shortcut.command.splitPanel": "Dividir o painel",
  "shortcut.command.closePanel": "Fechar o painel",
  "shortcut.command.openCommandMenu": "Abrir o menu de comandos",
} as const satisfies PartialTranslation<typeof source>;
