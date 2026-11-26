export function isIncomingShareLink(path: string): boolean {
  try {
    const url = new URL(path);
    return url.protocol === "codebot:" && url.host === "expo-sharing";
  } catch {
    return false;
  }
}
