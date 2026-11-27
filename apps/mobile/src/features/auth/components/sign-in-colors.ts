import { useCSSVariable } from "uniwind";

export function useSignInColors() {
  const surface = useCSSVariable("--codebot-bg-control-active");
  const brand = useCSSVariable("--codebot-logo-production");
  const onBrand = useCSSVariable("--codebot-logo-eye");
  const text = useCSSVariable("--codebot-text-primary");
  const muted = useCSSVariable("--codebot-text-muted");
  const danger = useCSSVariable("--codebot-danger");
  const success = useCSSVariable("--codebot-success");
  const radius = useCSSVariable("--codebot-radius-lg");
  return {
    surface: String(surface ?? "#2a2a2a"),
    brand: String(brand ?? "#d6adf2"),
    onBrand: String(onBrand ?? "#040007"),
    text: String(text ?? "#ffffff"),
    muted: String(muted ?? "#979797"),
    danger: String(danger ?? "#fd2f3b"),
    success: String(success ?? "#31cf76"),
    radius: Number.parseFloat(String(radius ?? "12")),
  };
}

export const SIGN_IN_CONTROL_HEIGHT = 52;
