import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported": "此服务器不支持高级功能开关。请更新服务器。",
  "error.advanced.invalidChange": "高级功能的更改无效。",
  "error.advanced.featureOff": "该功能已关闭，因此此工具不可用。用户可以在 设置 > 高级功能 中开启它。",
} as const satisfies PartialTranslation<typeof source>;
