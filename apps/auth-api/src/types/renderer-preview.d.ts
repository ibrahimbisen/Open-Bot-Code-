declare module "@codebot/renderer-preview" {
  import type { JSX } from "@solidjs/web";

  export interface CodeBotPlaygroundProps {
    variant?: "default" | "landing";
    theme?: "dark" | "light";
  }

  export function CodeBotPlayground(props: CodeBotPlaygroundProps): JSX.Element;
}
