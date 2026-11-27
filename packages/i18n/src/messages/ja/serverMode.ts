import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "エージェントの実行場所",
  "serverMode.switch.thisComputer": "このコンピューター",
  "serverMode.switch.homeServer": "ホームサーバー",
  "serverMode.switch.homeServerNamed": "{name} でエージェントを実行",
  "serverMode.switch.noHomeServer": "ホームサーバーはまだありません。選択して参加してください。",
  "serverMode.switch.useComputer": "このコンピューターでエージェントを実行",
  "serverMode.switch.useHomeServer": "ホームサーバーでエージェントを実行",
} as const satisfies PartialTranslation<typeof source>;
