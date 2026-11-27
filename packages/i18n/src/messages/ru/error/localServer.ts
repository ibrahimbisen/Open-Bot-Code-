import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "Сервер моделей по адресу {host} отклонил подключение. Запустите сервер моделей на этой машине.",
  "error.localServer.hostNotFound": "Адрес {host} не найден. Проверьте имя машины.",
  "error.localServer.timeout": "Сервер моделей по адресу {host} не ответил за {seconds} с.",
  "error.localServer.unreachable":
    "Сервер моделей по адресу {host} недоступен. Убедитесь, что машина включена и находится в вашей сети.",
  "error.localServer.redirect":
    "Сервер моделей по адресу {host} прислал перенаправление. OpenBot Code не следует перенаправлениям, чтобы защитить ключ API.",
  "error.localServer.keyNeeded": "Серверу моделей по адресу {host} нужен ключ API. Добавьте ключ этой машины.",
  "error.localServer.keyRefused": "Сервер моделей по адресу {host} отклонил ключ API. Проверьте ключ этой машины.",
  "error.localServer.http": "Сервер моделей по адресу {host} ответил со статусом HTTP {status}.",
  "error.localServer.invalidAnswer": "Сервер моделей по адресу {host} не прислал список моделей, совместимый с OpenAI.",
  "error.localServer.tooLarge": "Ответ сервера моделей по адресу {host} слишком большой.",
  "error.localServer.gpuUnreachable": "Адрес состояния GPU {host} недоступен.",
  "error.localServer.gpuTimeout": "Адрес состояния GPU {host} не ответил за {seconds} с.",
  "error.localServer.gpuRedirect":
    "Адрес состояния GPU {host} прислал перенаправление. OpenBot Code не следует перенаправлениям.",
  "error.localServer.gpuHttp": "Адрес состояния GPU {host} ответил со статусом HTTP {status}.",
  "error.localServer.gpuInvalid":
    "Адрес состояния GPU {host} не прислал значения GPU, которые OpenBot Code может прочитать.",
  "error.localServer.gpuTooLarge": "Ответ адреса состояния GPU {host} слишком большой.",
  "error.localServer.gpuUrlInvalid":
    "URL состояния GPU должен быть адресом http или https без имени пользователя и пароля.",
  "error.localServer.gpuKeyOtherOrigin":
    "Ключ API можно отправлять на URL состояния GPU только если у него тот же источник (origin), что и у базового URL.",
  "error.localServer.scanHostInvalid": "Введите имя хоста, IP-адрес или адрес http или https.",
} as const satisfies PartialTranslation<typeof source>;
