import { useRef, useState } from "react";
import { Keyboard } from "react-native";
import { MobileAccountSignInError, type MobileSession, signInMobileWithAccount } from "@/features/auth/api/mobile-auth";
import { saveServiceAddresses, useServiceAddresses } from "@/features/auth/model/service-address-store";
import { normalizeAccountAddress, normalizeSignalAddress } from "@/features/auth/model/service-addresses";
import { useSecondsUntil } from "@/shared/lib/countdown";
import { haptics } from "@/shared/lib/haptics";
import { useText } from "@/shared/lib/text";

export type SignInStep = "options" | "server";

export interface SignInIssue {
  message: string;
  code: string;
  field: "account" | "signal" | "login";
}

const VERIFIED_PAUSE_MS = 450;
const KEYBOARD_HIDE_LIMIT_MS = 600;

function closeKeyboard(): Promise<void> {
  if (!Keyboard.isVisible()) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      subscription.remove();
      clearTimeout(limit);
      resolve();
    };
    const subscription = Keyboard.addListener("keyboardDidHide", finish);
    const limit = setTimeout(finish, KEYBOARD_HIDE_LIMIT_MS);
    Keyboard.dismiss();
  });
}

export function useAccountSignIn({
  connect,
  reduced,
}: {
  connect: (session: MobileSession) => void | Promise<void>;
  reduced: boolean;
}) {
  const { t, errorMessage } = useText();
  const saved = useServiceAddresses();
  const [step, setStep] = useState<SignInStep>("options");
  const [accountEdit, setAccountEdit] = useState<string | null>(null);
  const [signalEdit, setSignalEdit] = useState<string | null>(null);
  const [issue, setIssue] = useState<SignInIssue | null>(null);
  const [rejection, setRejection] = useState(0);
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const retryIn = useSecondsUntil(blockedUntil);
  const leaving = useRef(false);

  const accountAddress = accountEdit ?? saved.accountUrl ?? "";
  const signalAddress = signalEdit ?? saved.signalUrl ?? "";

  function reject() {
    setRejection((count) => count + 1);
    void haptics.notification("error");
  }

  async function finish(session: MobileSession) {
    setVerified(true);
    void haptics.notification("success");
    await Promise.all([
      reduced ? undefined : new Promise((resolve) => setTimeout(resolve, VERIFIED_PAUSE_MS)),
      closeKeyboard(),
    ]);
    await connect(session);
  }

  async function submit() {
    if (pending || verified || retryIn > 0) return;
    const account = normalizeAccountAddress(accountAddress);
    if (!account) {
      setIssue({ message: t("mobile.auth.account.error.invalidAddress"), code: "invalid_account", field: "account" });
      reject();
      return;
    }
    const signalText = signalAddress.trim();
    const signal = signalText ? normalizeSignalAddress(signalText) : null;
    if (signalText && !signal) {
      setIssue({ message: t("mobile.auth.account.error.invalidSignal"), code: "invalid_signal", field: "signal" });
      reject();
      return;
    }
    setPending(true);
    setIssue(null);
    try {
      await saveServiceAddresses({ accountUrl: account, signalUrl: signal });
      await closeKeyboard();
      const session = await signInMobileWithAccount(account);
      if (session) await finish(session);
    } catch (error) {
      if (error instanceof MobileAccountSignInError) {
        if (error.retryAfterSeconds) setBlockedUntil(Date.now() + error.retryAfterSeconds * 1_000);
        setIssue({ message: error.message, code: error.code, field: "login" });
      } else {
        setIssue({
          message: errorMessage(error, t("mobile.auth.account.error.loginFailed")),
          code: "",
          field: "login",
        });
      }
      reject();
    } finally {
      setPending(false);
    }
  }

  async function back() {
    if (pending || verified || leaving.current) return;
    leaving.current = true;
    try {
      await closeKeyboard();
    } finally {
      leaving.current = false;
    }
    setIssue(null);
    setStep("options");
  }

  return {
    step,
    openServer: () => setStep("server"),
    back: () => void back(),
    accountAddress,
    setAccountAddress: (value: string) => {
      setAccountEdit(value);
      setIssue(null);
      setBlockedUntil(0);
    },
    signalAddress,
    setSignalAddress: (value: string) => {
      setSignalEdit(value);
      setIssue((current) => (current?.field === "signal" ? null : current));
    },
    issue,
    submit: () => void submit(),
    sending: pending,
    verified,
    retryIn,
    rejection,
    busy: pending || verified,
  };
}

export type AccountSignIn = ReturnType<typeof useAccountSignIn>;
