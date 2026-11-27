import { Share } from "react-native";
import { supportLog, supportLogValue } from "@/features/support/model/support-log";
import { isIOS } from "@/shared/lib/platform";

const DOWNLOAD_URL = process.env.EXPO_PUBLIC_CODEBOT_DOWNLOAD_URL ?? "";

export function shareCodeBot(): void {
  if (!DOWNLOAD_URL) return;
  Share.share(isIOS ? { url: DOWNLOAD_URL } : { message: DOWNLOAD_URL }).catch((error: unknown) => {
    supportLog.add("warn", "app", `Share sheet not opened: ${supportLogValue(error)}`);
  });
}
