import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code не смог связаться со службой аккаунтов. Убедитесь, что API работает, и повторите попытку.",
  "error.auth.sessionTimeout":
    "OpenBot Code не ответил вовремя. Проверьте подключение к интернету, затем повторите попытку.",
  "error.auth.networkBlocked":
    "Брандмауэр или прокси в этой сети не дал OpenBot Code подключиться к {host}. Попросите сетевого администратора разрешить {host} и повторите попытку.",
  "error.auth.signInFirst": "Сначала войдите в OpenBot Code.",
  "error.auth.signInRequired": "Требуется вход.",
  "error.auth.chatColorUnavailable": "Служба учётных записей пока не поддерживает цвета чата. Повторите попытку позже.",
  "error.auth.accountChangedDuringRegister":
    "Аккаунт, в который выполнен вход, изменился во время регистрации этого сервера.",
  "error.auth.hostCredentialUnavailable": "Учётные данные удалённого хоста недоступны. Зарегистрируйте хост заново.",
  "error.auth.serviceError": "Служба аккаунтов вернула ошибку.",
  "error.auth.serviceUnreachable":
    "OpenBot Code не смог связаться со службой аккаунтов. Проверьте подключение и повторите попытку.",
  "error.auth.serviceTimeout": "Служба аккаунтов не ответила вовремя. Повторите попытку.",
  "error.auth.serviceStatus": "Служба аккаунтов вернула ошибку ({status}). Повторите попытку позже.",
  "error.auth.deliveryTimeout":
    "OpenBot Code не успел подтвердить доставку. Код всё же может прийти; проверьте доставку, прежде чем отправлять снова.",
} as const satisfies PartialTranslation<typeof source>;
