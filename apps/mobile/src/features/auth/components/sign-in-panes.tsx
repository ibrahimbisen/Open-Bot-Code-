import { Button, Spinner, Typography } from "heroui-native";
import type { LucideIcon } from "lucide-react-native";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ScanLine from "lucide-react-native/icons/scan-line";
import { type ReactNode, type Ref, useEffect } from "react";
import { Pressable, type TextInputInstance, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { AddressField } from "@/features/auth/components/address-field";
import { SIGN_IN_CONTROL_HEIGHT, useSignInColors } from "@/features/auth/components/sign-in-colors";
import {
  type PaneDirection,
  paneEnter,
  SIGN_IN_EASE_OUT,
  SIGN_IN_TEXT_EASE,
  signInMotion,
} from "@/features/auth/components/sign-in-motion";
import type { AccountSignIn } from "@/features/auth/model/use-account-sign-in";
import { BLOUB_MOVE_MS } from "@/shared/components/bloub-stage/bloub-look";
import { formatTimer } from "@/shared/lib/countdown";
import { haptics } from "@/shared/lib/haptics";
import { SPLASH_EASE_IN_OUT } from "@/shared/lib/splash-motion";
import { useText } from "@/shared/lib/text";

const LABEL_OUT = FadeOut.duration(120).easing(SIGN_IN_TEXT_EASE);
const LABEL_IN = FadeIn.duration(180).delay(100).easing(SIGN_IN_TEXT_EASE);
const MESSAGE_HEIGHT = 20;

export interface PaneMotion {
  from: PaneDirection;
  startMs: number;
  reduced: boolean;
}

function PaneItem({
  index,
  motion,
  className,
  children,
}: {
  index: number;
  motion: PaneMotion | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Animated.View
      entering={motion ? paneEnter(index, motion.from, motion.reduced, motion.startMs) : undefined}
      className={className}
    >
      {children}
    </Animated.View>
  );
}

function SignInButton({
  label,
  labelKey = label,
  brand,
  icon: Icon,
  onPress,
  busy = false,
  waiting = false,
  reduced,
}: {
  label: string;
  labelKey?: string;
  brand: boolean;
  icon?: LucideIcon;
  onPress: () => void;
  busy?: boolean;
  waiting?: boolean;
  reduced: boolean;
}) {
  const colors = useSignInColors();
  const textColor = brand ? colors.onBrand : colors.text;
  return (
    <Button
      size="lg"
      variant="ghost"
      feedbackVariant="scale"
      className="w-full"
      accessibilityLabel={label}
      accessibilityState={{ disabled: waiting, busy }}
      style={{
        height: SIGN_IN_CONTROL_HEIGHT,
        borderRadius: colors.radius,
        backgroundColor: brand ? colors.brand : colors.surface,
      }}
      onPress={() => {
        if (busy || waiting) return;
        void haptics.impact("light");
        onPress();
      }}
    >
      <Animated.View
        key={labelKey}
        entering={reduced ? undefined : LABEL_IN}
        exiting={reduced ? undefined : LABEL_OUT}
        className="flex-row items-center gap-2"
      >
        {busy ? (
          <Spinner size="sm" color={textColor} />
        ) : Icon ? (
          <Icon size={20} color={textColor} strokeWidth={2} />
        ) : null}
        <Button.Label className="font-sans font-semibold" style={{ color: textColor, opacity: waiting ? 0.5 : 1 }}>
          {label}
        </Button.Label>
      </Animated.View>
    </Button>
  );
}

function TextAction({
  label,
  labelKey = label,
  onPress,
  disabled = false,
  reduced,
}: {
  label: string;
  labelKey?: string;
  onPress: () => void;
  disabled?: boolean;
  reduced: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      pressRetentionOffset={12}
      onPress={() => {
        void haptics.impact("light");
        onPress();
      }}
      className="min-h-11 justify-center"
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.6 : 1 })}
    >
      <Animated.View key={labelKey} entering={reduced ? undefined : LABEL_IN} exiting={reduced ? undefined : LABEL_OUT}>
        <Typography.Paragraph type="body-sm" color="muted">
          {label}
        </Typography.Paragraph>
      </Animated.View>
    </Pressable>
  );
}

function PaneMessage({
  message,
  spinner,
  reduced,
}: {
  message: { key: string; text: string; color: string } | null;
  spinner: boolean;
  reduced: boolean;
}) {
  const colors = useSignInColors();
  const motion = signInMotion(reduced);
  return (
    <View className="mt-2 justify-center" style={{ minHeight: MESSAGE_HEIGHT }}>
      {message ? (
        <Animated.View
          key={message.key}
          entering={motion.fadeIn()}
          exiting={motion.fadeOut}
          className="flex-row items-center gap-2"
        >
          {spinner ? <Spinner size="sm" color={colors.muted} /> : null}
          <Typography.Paragraph
            type="body-sm"
            accessibilityRole="alert"
            className="shrink"
            style={{ color: message.color }}
          >
            {message.text}
          </Typography.Paragraph>
        </Animated.View>
      ) : null}
    </View>
  );
}

function HelpToggle({
  open,
  onToggle,
  onBodyLayout,
  reduced,
}: {
  open: boolean;
  onToggle: () => void;
  onBodyLayout?: (height: number) => void;
  reduced: boolean;
}) {
  const { t } = useText();
  const colors = useSignInColors();
  const shown = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    shown.set(
      reduced
        ? withTiming(open ? 1 : 0, { duration: 160 })
        : open
          ? withDelay(200, withTiming(1, { duration: 240, easing: SIGN_IN_EASE_OUT }))
          : withTiming(0, { duration: 120 }),
    );
  }, [open, reduced, shown]);
  const bodyStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${180 * shown.get()}deg` }] }));
  return (
    <View className="mt-3 items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("mobile.auth.signIn.helpTitle")}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={() => {
          void haptics.selection();
          onToggle();
        }}
        className="min-h-11 flex-row items-center gap-1.5"
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Typography.Paragraph type="body-sm" color="muted">
          {t("mobile.auth.signIn.helpTitle")}
        </Typography.Paragraph>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={14} color={colors.muted} strokeWidth={2} />
        </Animated.View>
      </Pressable>
      <Animated.View
        style={bodyStyle}
        pointerEvents="none"
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        className="gap-1 pt-1.5"
        onLayout={({ nativeEvent: { layout } }) => onBodyLayout?.(layout.height)}
      >
        <Typography.Paragraph type="body-sm" color="muted">
          {t("mobile.auth.signIn.helpStep1")}
        </Typography.Paragraph>
        <Typography.Paragraph type="body-sm" color="muted">
          {t("mobile.auth.signIn.helpStep2")}
        </Typography.Paragraph>
        <Typography.Paragraph type="body-sm" color="muted">
          {t("mobile.auth.signIn.helpStep3")}
        </Typography.Paragraph>
      </Animated.View>
    </View>
  );
}

export function OptionsPane({
  motion,
  notice,
  helpOpen,
  helpShift,
  onToggleHelp,
  onScan,
  onServer,
  onLayout,
  onHelpLayout,
  reduced,
}: {
  motion: PaneMotion | null;
  notice?: ReactNode;
  helpOpen: boolean;
  helpShift: SharedValue<number>;
  onToggleHelp: () => void;
  onScan: () => void;
  onServer: () => void;
  onLayout?: (height: number) => void;
  onHelpLayout?: (height: number) => void;
  reduced: boolean;
}) {
  const { t } = useText();
  const riseStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -helpShift.get() }] }));
  return (
    <Animated.View style={riseStyle} onLayout={({ nativeEvent: { layout } }) => onLayout?.(layout.height)}>
      {notice ? (
        <PaneItem index={0} motion={motion} className="mb-6">
          {notice}
        </PaneItem>
      ) : null}
      <PaneItem index={0} motion={motion}>
        <Typography.Heading type="h1" accessibilityRole="header" className="tracking-codebot-tight">
          {t("mobile.auth.signIn.title")}
        </Typography.Heading>
      </PaneItem>
      <PaneItem index={1} motion={motion} className="mt-2.5">
        <Typography.Paragraph color="muted">{t("mobile.auth.signIn.subtitle")}</Typography.Paragraph>
      </PaneItem>
      <PaneItem index={2} motion={motion} className="mt-7 gap-3">
        <SignInButton brand icon={ScanLine} label={t("mobile.auth.scanQrCode")} onPress={onScan} reduced={reduced} />
        <SignInButton
          brand={false}
          label={t("mobile.auth.signIn.accountButton")}
          onPress={onServer}
          reduced={reduced}
        />
      </PaneItem>
      <PaneItem index={3} motion={motion}>
        <HelpToggle open={helpOpen} onToggle={onToggleHelp} onBodyLayout={onHelpLayout} reduced={reduced} />
      </PaneItem>
    </Animated.View>
  );
}

export function ServerPane({
  signIn,
  motion,
  addressInput,
  onScanInstead,
  onLayout,
  reduced,
}: {
  signIn: AccountSignIn;
  motion: PaneMotion;
  addressInput: Ref<TextInputInstance>;
  onScanInstead: () => void;
  onLayout: (height: number) => void;
  reduced: boolean;
}) {
  const { t } = useText();
  const colors = useSignInColors();
  const { retryIn, sending, issue } = signIn;
  const label = sending
    ? t("mobile.auth.account.waiting")
    : retryIn > 0
      ? t("mobile.auth.account.tryAgainIn", { time: formatTimer(retryIn) })
      : t("mobile.auth.account.continue");
  const labelKey = sending ? "waiting" : retryIn > 0 ? "wait" : "continue";
  const message = issue ? { key: `issue-${signIn.rejection}`, text: issue.message, color: colors.danger } : null;
  return (
    <View onLayout={({ nativeEvent: { layout } }) => onLayout(layout.height)}>
      <PaneItem index={0} motion={motion}>
        <Typography.Heading type="h2" accessibilityRole="header" className="tracking-codebot-tight">
          {t("mobile.auth.account.title")}
        </Typography.Heading>
      </PaneItem>
      <PaneItem index={1} motion={motion} className="mt-2.5">
        <Typography.Paragraph color="muted">{t("mobile.auth.account.description")}</Typography.Paragraph>
      </PaneItem>
      <PaneItem index={2} motion={motion} className="mt-5">
        <AddressField
          ref={addressInput}
          kind="url"
          value={signIn.accountAddress}
          onChangeText={signIn.setAccountAddress}
          onSubmit={signIn.submit}
          placeholder={t("mobile.auth.account.placeholder")}
          label={t("mobile.auth.account.label")}
          invalid={issue?.field === "account"}
          rejection={issue?.field === "signal" ? 0 : signIn.rejection}
          editable={!sending}
          visible
          reduced={reduced}
        />
        <View className="mt-2">
          <AddressField
            kind="url"
            value={signIn.signalAddress}
            onChangeText={signIn.setSignalAddress}
            onSubmit={signIn.submit}
            placeholder={t("mobile.auth.account.signalPlaceholder")}
            label={t("mobile.auth.account.signalLabel")}
            invalid={issue?.field === "signal"}
            rejection={issue?.field === "signal" ? signIn.rejection : 0}
            editable={!sending}
            visible
            reduced={reduced}
          />
        </View>
        <PaneMessage message={message} spinner={false} reduced={reduced} />
      </PaneItem>
      <PaneItem index={3} motion={motion} className="mt-2">
        <SignInButton
          brand
          label={label}
          labelKey={labelKey}
          onPress={signIn.submit}
          busy={sending}
          waiting={retryIn > 0}
          reduced={reduced}
        />
      </PaneItem>
      <PaneItem index={4} motion={motion} className="mt-1.5 flex-row">
        <TextAction
          label={t("mobile.auth.account.useQrCode")}
          onPress={onScanInstead}
          disabled={sending}
          reduced={reduced}
        />
      </PaneItem>
    </View>
  );
}

export const HELP_MOVE = { duration: BLOUB_MOVE_MS, easing: SPLASH_EASE_IN_OUT };
