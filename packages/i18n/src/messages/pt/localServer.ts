import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/localServer";

export const messages = {
  "localServer.settings.title": "Servidores locais",
  "localServer.settings.description":
    "Máquinas de modelos na sua rede, como um DGX Spark. Cada máquina é uma entrada separada.",
  "localServer.settings.add": "Adicionar máquina",
  "localServer.settings.empty":
    "Nenhuma máquina local ainda. Adicione o endereço de um servidor de modelos para usá-lo em um projeto ou chat.",
  "localServer.settings.edit": "Editar {name}",
  "localServer.settings.remove": "Remover {name}",
  "localServer.settings.refresh": "Verificar agora",
  "localServer.settings.statusOff": "Status desativado",
  "localServer.settings.models": { one: "{count} modelo", other: "{count} modelos" },
  "localServer.scan.title": "Encontrar uma máquina",
  "localServer.scan.description":
    "Informe um nome de host ou um endereço IP. O OpenBot Code procura Ollama, LM Studio e vLLM nas portas habituais.",
  "localServer.scan.host": "Host ou endereço",
  "localServer.scan.placeholder": "spark-1.local",
  "localServer.scan.action": "Escanear",
  "localServer.scan.scanning": "Escaneando",
  "localServer.scan.none": "Nenhum servidor de modelos encontrado neste host.",
  "localServer.scan.needsKey": "Exige uma chave de API",
  "localServer.scan.add": "Adicionar {name}",
  "localServer.dialog.addTitle": "Adicionar uma máquina local",
  "localServer.dialog.editTitle": "Editar {name}",
  "localServer.dialog.description":
    "O OpenBot Code lê a lista de modelos e o status a partir do endereço compatível com OpenAI da máquina.",
  "localServer.field.name": "Nome",
  "localServer.field.namePlaceholder": "DGX Spark 1",
  "localServer.field.baseUrl": "Endereço do servidor",
  "localServer.field.baseUrlPlaceholder": "http://192.168.1.41:8000/v1",
  "localServer.field.apiKey": "Chave de API (opcional)",
  "localServer.field.apiKeyKept": "Salva. Deixe vazio para mantê-la.",
  "localServer.field.gpuUrl": "Endereço de status da GPU (opcional)",
  "localServer.field.gpuUrlPlaceholder": "http://192.168.1.41:9101/gpu",
  "localServer.field.gpuUrlHelp":
    "Um endereço JSON, exportador nvidia-smi ou exportador DCGM que mostra a carga e a memória da GPU.",
  "localServer.field.gpuUsesKey": "Enviar a chave de API ao endereço de status da GPU",
  "localServer.field.gpuUsesKeyHelp": "Somente para um endereço com a mesma origem que o endereço do servidor.",
  "localServer.field.monitored": "Mostrar o status desta máquina",
  "localServer.field.monitoredHelp":
    "O OpenBot Code verifica a máquina de tempos em tempos e mostra o resultado na barra de status.",
  "localServer.error.nameRequired": "Informe um nome.",
  "localServer.error.gpuUrlInvalid": "Informe um endereço http ou https sem nome de usuário e sem senha.",
  "localServer.error.gpuKeyOtherOrigin":
    "O endereço de status da GPU deve ter a mesma origem que o endereço do servidor.",
  "localServer.test.action": "Testar",
  "localServer.test.testing": "Testando",
  "localServer.test.online": "Online. {models} encontrado(s).",
  "localServer.test.onlineKind": "{kind} está online. {models} encontrado(s).",
  "localServer.test.gpuFound": "Status da GPU lido: {count}",
  "localServer.test.gpuCount": { one: "{count} GPU", other: "{count} GPUs" },
  "localServer.test.offline": "Offline. {error}",
  "localServer.test.gpuFailed": "Falha no status da GPU: {error}",
  "localServer.dialog.saving": "Salvando",
  "localServer.dialog.saveFailed": "O OpenBot Code não conseguiu salvar esta máquina.",
  "localServer.remove.title": "Remover {name}?",
  "localServer.remove.description":
    "O OpenBot Code deixa de usar esta máquina. Projetos e chats que usam seus modelos precisam de outro modelo.",
  "localServer.remove.failed": "O OpenBot Code não conseguiu remover esta máquina.",
} as const satisfies PartialTranslation<typeof source>;
