import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "代理运行的位置",
  "serverMode.switch.thisComputer": "这台电脑",
  "serverMode.switch.homeServer": "家庭服务器",
  "serverMode.switch.homeServerNamed": "在 {name} 上运行代理",
  "serverMode.switch.noHomeServer": "还没有家庭服务器。请选择加入一个。",
  "serverMode.switch.useComputer": "在这台电脑上运行代理",
  "serverMode.switch.useHomeServer": "在家庭服务器上运行代理",
} as const satisfies PartialTranslation<typeof source>;
