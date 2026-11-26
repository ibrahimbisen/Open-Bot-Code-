import {
  LOCAL_SERVER_ID,
  type SlashCommandEntry,
  type SlashCommandScreen,
  type SlashCommandsChanged,
} from "@codebot/contracts/ipc";
import { createEffect, createSignal } from "solid-js";
import { openSlashScreen } from "./slash-screen-state";

export interface SlashCommandTarget {
  agentId: string;
  taskId?: string | undefined;
  serverId: string;
}

export function slashCommandsAffect(change: SlashCommandsChanged, target: SlashCommandTarget): boolean {
  if (change.agentId === null) return true;
  return change.agentId === target.agentId && change.taskId === (target.taskId ?? null);
}

export function createSlashCommands(target: () => SlashCommandTarget | undefined) {
  const [commands, setCommands] = createSignal<SlashCommandEntry[] | undefined>(undefined);
  let request = 0;
  const load = (current: SlashCommandTarget) => {
    const own = ++request;
    window.codebot.slashCommands
      .list({ agentId: current.agentId, ...(current.taskId === undefined ? {} : { taskId: current.taskId }) })
      .then(
        (list) => {
          if (own === request) setCommands(list.commands);
        },
        () => {
          if (own === request) setCommands([]);
        },
      );
  };
  createEffect(target, (current) => {
    request += 1;
    if (!current || current.serverId !== LOCAL_SERVER_ID) {
      setCommands(undefined);
      return undefined;
    }
    load(current);
    return window.codebot.slashCommands.onChanged((change) => {
      if (slashCommandsAffect(change, current)) load(current);
    });
  });
  return commands;
}

export function createSlashCommandsFor(target: () => SlashCommandTarget | undefined) {
  const commands = createSlashCommands(target);
  const openScreen = (screen: SlashCommandScreen) => {
    const current = target();
    if (current) openSlashScreen({ screen, agentId: current.agentId, taskId: current.taskId });
  };
  return { commands, openScreen };
}
