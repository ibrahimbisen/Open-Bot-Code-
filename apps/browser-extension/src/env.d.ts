interface ImportMetaEnv {
  readonly VITE_CODEBOT_API_URL: string;
  readonly VITE_CODEBOT_WEB_URL: string;
  readonly VITE_CODEBOT_X_RULES_URL: string;
  readonly VITE_CODEBOT_ANALYTICS_URL: string;
}

declare const __CODEBOT_X_NOTES__: boolean;

declare var codebotRefs: Map<string, WeakRef<Element>> | undefined;
