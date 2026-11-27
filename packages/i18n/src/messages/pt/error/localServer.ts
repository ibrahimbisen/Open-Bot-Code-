import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "O servidor de modelos em {host} recusou a conexão. Inicie o servidor de modelos nessa máquina.",
  "error.localServer.hostNotFound": "O endereço {host} não foi encontrado. Verifique o nome da máquina.",
  "error.localServer.timeout": "O servidor de modelos em {host} não respondeu em {seconds} segundos.",
  "error.localServer.unreachable":
    "O servidor de modelos em {host} não está acessível. Verifique se a máquina está ligada e na sua rede.",
  "error.localServer.redirect":
    "O servidor de modelos em {host} enviou um redirecionamento. O OpenBot Code não segue redirecionamentos, para manter a chave de API segura.",
  "error.localServer.keyNeeded":
    "O servidor de modelos em {host} exige uma chave de API. Adicione a chave desta máquina.",
  "error.localServer.keyRefused":
    "O servidor de modelos em {host} recusou a chave de API. Verifique a chave desta máquina.",
  "error.localServer.http": "O servidor de modelos em {host} respondeu com o status HTTP {status}.",
  "error.localServer.invalidAnswer":
    "O servidor de modelos em {host} não enviou uma lista de modelos compatível com OpenAI.",
  "error.localServer.tooLarge": "A resposta do servidor de modelos em {host} é grande demais.",
  "error.localServer.gpuUnreachable": "O endereço de status da GPU {host} não está acessível.",
  "error.localServer.gpuTimeout": "O endereço de status da GPU {host} não respondeu em {seconds} segundos.",
  "error.localServer.gpuRedirect":
    "O endereço de status da GPU {host} enviou um redirecionamento. O OpenBot Code não segue redirecionamentos.",
  "error.localServer.gpuHttp": "O endereço de status da GPU {host} respondeu com o status HTTP {status}.",
  "error.localServer.gpuInvalid":
    "O endereço de status da GPU {host} não enviou valores de GPU que o OpenBot Code consiga ler.",
  "error.localServer.gpuTooLarge": "A resposta do endereço de status da GPU {host} é grande demais.",
  "error.localServer.gpuUrlInvalid":
    "A URL de status da GPU deve ser um endereço http ou https sem nome de usuário e sem senha.",
  "error.localServer.gpuKeyOtherOrigin":
    "A chave de API só pode ir para a URL de status da GPU quando essa URL tem a mesma origem que a URL base.",
  "error.localServer.scanHostInvalid": "Informe um nome de host, um endereço IP ou um endereço http ou https.",
} as const satisfies PartialTranslation<typeof source>;
