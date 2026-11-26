import {
  type CheckCustomAgentInput,
  type CodeBotDesktopApi,
  type CustomAgentCheckResult,
  type CustomAgentResult,
  type CustomAgentSummary,
  type CustomAgentUsage,
  type DeleteCustomAgentInput,
  LOCAL_SERVER_ID,
  type SaveCustomAgentInput,
} from "@codebot/contracts/ipc";

interface CustomAgentsPort {
  customAgents: CodeBotDesktopApi["customAgents"];
}

function customAgentsPort(): CustomAgentsPort {
  return window.codebot;
}

export interface CustomAgentsEndpointApi {
  list: () => Promise<CustomAgentSummary[]>;
  save: (input: SaveCustomAgentInput) => Promise<CustomAgentResult>;
  delete: (input: DeleteCustomAgentInput) => Promise<CustomAgentResult>;
  check?: ((input: CheckCustomAgentInput) => Promise<CustomAgentCheckResult>) | undefined;
  usage?: (() => Promise<CustomAgentUsage[]>) | undefined;
}

export function localCustomAgentsApi(): CustomAgentsEndpointApi {
  const api = () => customAgentsPort().customAgents;
  return {
    list: () => api().list(LOCAL_SERVER_ID),
    save: (input) => api().save(input, LOCAL_SERVER_ID),
    delete: (input) => api().delete(input, LOCAL_SERVER_ID),
    check: (input) => api().check(input),
    usage: () => api().usage(),
  };
}

export function hostCustomAgentsApi(serverId: string): CustomAgentsEndpointApi {
  const api = () => customAgentsPort().customAgents;
  return {
    list: () => api().list(serverId),
    save: (input) => api().save(input, serverId),
    delete: (input) => api().delete(input, serverId),
  };
}
