import { router } from "expo-router";
import { Typography } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useMobileSession } from "@/features/auth/context/mobile-session-context";
import { saveServiceAddresses, useServiceAddresses } from "@/features/auth/model/service-address-store";
import { normalizeSignalAddress } from "@/features/auth/model/service-addresses";
import { SettingsContent, SettingsRow, SettingsSection } from "@/features/settings/components/settings-content";
import { SheetFormField } from "@/shared/components/sheet-form-field";
import { SheetSaveAction } from "@/shared/components/sheet-save-action";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";

const ADDRESS_MAX_LENGTH = 2_048;

export function ConnectionSettingsScreen() {
  const { t } = useText();
  const { session } = useMobileSession();
  const saved = useServiceAddresses();
  const [draft, setDraft] = useState<string | null>(null);
  const [state, setState] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });
  const signal = draft ?? saved.signalUrl ?? "";
  const trimmed = signal.trim();
  const normalized = trimmed ? normalizeSignalAddress(trimmed) : null;
  const invalid = trimmed.length > 0 && normalized === null;
  const dirty = (normalized ?? "") !== (saved.signalUrl ?? "") && !invalid;

  async function save() {
    setState({ saving: true, error: null });
    try {
      await saveServiceAddresses({ accountUrl: saved.accountUrl ?? session?.apiUrl ?? null, signalUrl: normalized });
      void haptics.notification("success");
      setState({ saving: false, error: null });
      router.back();
    } catch {
      void haptics.notification("error");
      setState({ saving: false, error: t("mobile.settings.saveFailed") });
    }
  }

  return (
    <SettingsContent>
      <SheetSaveAction
        dirty={dirty}
        canSave={dirty}
        pending={state.saving}
        label={t("mobile.settings.connection.save")}
        pendingLabel={t("mobile.settings.connection.saving")}
        onSave={() => void save()}
      />
      <SettingsSection
        title={t("mobile.settings.connection.account")}
        footer={t("mobile.settings.connection.accountFooter")}
      >
        <SettingsRow disclosure={false} supportingText={session?.apiUrl ?? t("mobile.settings.connection.notSignedIn")}>
          <Typography.Paragraph>{t("mobile.settings.connection.accountService")}</Typography.Paragraph>
        </SettingsRow>
      </SettingsSection>
      <View className="gap-2">
        <SheetFormField
          label={t("mobile.settings.connection.signal")}
          placeholder={t("mobile.settings.connection.signalPlaceholder")}
          value={signal}
          editable={!state.saving}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={ADDRESS_MAX_LENGTH}
          hint={t("mobile.settings.connection.signalHint")}
          onChangeText={(value) => {
            setDraft(value);
            setState((current) => ({ ...current, error: null }));
          }}
          returnKeyType="done"
        />
        {invalid || state.error ? (
          <Typography.Paragraph accessibilityRole="alert" type="body-xs" className="px-4 text-danger-text">
            {state.error ?? t("mobile.auth.account.error.invalidSignal")}
          </Typography.Paragraph>
        ) : null}
      </View>
    </SettingsContent>
  );
}
