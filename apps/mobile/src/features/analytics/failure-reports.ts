import { classifyFailure, type FailureProperties, type ReportQueue } from "@codebot/telemetry";
import { errorReference } from "@codebot/user-errors";
import { Effect } from "effect";
import { Alert, type AlertButton } from "react-native";
import { currentText } from "@/shared/lib/text";

export const mobileReportQueue: () => ReportQueue | undefined = () => undefined;

export function reportMobileNotification(
  error: unknown,
  operation: FailureProperties["operation"],
  presentation: "alert" | "banner" = "banner",
  context: Partial<Pick<FailureProperties, "source" | "severity" | "provider" | "model">> = {},
): void {
  const queue = mobileReportQueue();
  if (queue)
    Effect.runFork(
      queue.record("notification_shown", {
        operation,
        source: "action",
        severity: "error",
        presentation,
        cause_code: classifyFailure(error),
        ...context,
      }),
    );
}

export function showFailureAlert(
  error: unknown,
  operation: FailureProperties["operation"],
  ...args: Parameters<typeof Alert.alert>
): void {
  reportMobileNotification(error, operation, "alert");
  const reference = errorReference(error);
  if (!reference) {
    Alert.alert(...args);
    return;
  }
  const [title, message, buttons, options] = args;
  const { t } = currentText();
  const code = t("error.reference.label", { code: reference });
  const kept: AlertButton[] = buttons?.length ? buttons : [{ text: t("common.close"), style: "cancel" }];
  const copy: AlertButton[] =
    kept.length < 3
      ? [
          {
            text: t("error.reference.copy"),
            onPress: () =>
              void import("expo-clipboard").then((clipboard) => clipboard.setStringAsync(reference)).catch(() => false),
          },
        ]
      : [];
  Alert.alert(title, message ? `${message}\n\n${code}` : code, [...kept, ...copy], options);
}

export function showWarningAlert(
  operation: FailureProperties["operation"],
  ...args: Parameters<typeof Alert.alert>
): void {
  reportMobileNotification(undefined, operation, "alert", { severity: "warning", source: "system" });
  Alert.alert(...args);
}
