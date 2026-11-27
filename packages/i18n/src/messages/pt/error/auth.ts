import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "O OpenBot Code não conseguiu acessar o serviço de contas. Verifique se a API está em execução e tente novamente.",
  "error.auth.sessionTimeout":
    "O OpenBot Code não respondeu a tempo. Verifique sua conexão com a internet e tente novamente.",
  "error.auth.networkBlocked":
    "Um firewall ou proxy desta rede impediu o OpenBot Code de acessar {host}. Peça ao administrador da rede para permitir {host} e tente novamente.",
  "error.auth.signInFirst": "Entre no OpenBot Code primeiro.",
  "error.auth.signInRequired": "É necessário entrar.",
  "error.auth.chatColorUnavailable":
    "O serviço de contas ainda não oferece suporte a cores de chat. Tente de novo mais tarde.",
  "error.auth.accountChangedDuringRegister": "A conta conectada mudou durante o registro deste servidor.",
  "error.auth.hostCredentialUnavailable":
    "A credencial do computador anfitrião remoto está indisponível. Registre o computador anfitrião novamente.",
  "error.auth.serviceError": "O serviço de contas retornou um erro.",
  "error.auth.serviceUnreachable":
    "O OpenBot Code não conseguiu acessar o serviço de contas. Verifique sua conexão e tente novamente.",
  "error.auth.serviceTimeout": "O serviço de contas não respondeu a tempo. Tente novamente.",
  "error.auth.serviceStatus": "O serviço de contas retornou um erro ({status}). Tente novamente mais tarde.",
  "error.auth.deliveryTimeout":
    "O OpenBot Code não conseguiu confirmar a entrega a tempo. O código ainda pode chegar; verifique a entrega antes de enviar novamente.",
} as const satisfies PartialTranslation<typeof source>;
