import type { HostAdminDesktopApi, HostTimezoneSettings } from "@codebot/contracts/ipc";

export function createMockHostTimezone(): Pick<HostAdminDesktopApi, "getTimezone" | "setTimezone"> {
  const settings: HostTimezoneSettings = { timezone: null, systemTimezone: "UTC" };
  return {
    getTimezone: async () => ({ ...settings }),
    setTimezone: async (timezone) => {
      settings.timezone = timezone;
      return { ...settings };
    },
  };
}
