import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";

export interface ProvidersPort {
  cancelProviderCodeLogin: CodeBotDesktopApi["cancelProviderCodeLogin"];
  connectProvider: CodeBotDesktopApi["connectProvider"];
  connectProviderInMainlandChina: CodeBotDesktopApi["connectProviderInMainlandChina"];
  cancelProviderSignIn: CodeBotDesktopApi["cancelProviderSignIn"];
  refreshAgentProviders: CodeBotDesktopApi["refreshAgentProviders"];
  setProviderOn: CodeBotDesktopApi["setProviderOn"];
  restartProvider: CodeBotDesktopApi["restartProvider"];
  cancelProviderRestart: CodeBotDesktopApi["cancelProviderRestart"];
  chooseInstalledCli: CodeBotDesktopApi["chooseInstalledCli"];
  startProviderCodeLogin: CodeBotDesktopApi["startProviderCodeLogin"];
  providerRuntimes: CodeBotDesktopApi["providerRuntimes"];
  connectProviderAccount: CodeBotDesktopApi["connectProviderAccount"];
  connectProviderAccountKey: CodeBotDesktopApi["connectProviderAccountKey"];
  cancelProviderAccountSignIn: CodeBotDesktopApi["cancelProviderAccountSignIn"];
  renameProviderAccount: CodeBotDesktopApi["renameProviderAccount"];
  removeProviderAccount: CodeBotDesktopApi["removeProviderAccount"];
  setProviderAccountPool: CodeBotDesktopApi["setProviderAccountPool"];
  setLiveVoiceAccount: CodeBotDesktopApi["setLiveVoiceAccount"];
  signOutProvider: CodeBotDesktopApi["signOutProvider"];
  providerUsageResets: CodeBotDesktopApi["providerUsageResets"];
  resetProviderUsage: CodeBotDesktopApi["resetProviderUsage"];
  providerAdmin: CodeBotDesktopApi["providerAdmin"];
}

export function providersPort(): ProvidersPort {
  return window.codebot;
}
