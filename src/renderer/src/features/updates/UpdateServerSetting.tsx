import type { AppUpdateFeed } from "@codebot/contracts/ipc";
import { SettingsUpdateServerRow } from "@codebot/ui/features/settings/SettingsUpdateServerRow";
import { createSignal, onSettled } from "solid-js";
import { updatesPort } from "./updates-port";

export function UpdateServerSetting() {
  const [feed, setFeed] = createSignal<AppUpdateFeed | null>(null);
  const [loadFailed, setLoadFailed] = createSignal(false);

  onSettled(() => {
    void updatesPort()
      .appUpdate.getFeed()
      .then(setFeed)
      .catch(() => setLoadFailed(true));
  });

  async function save(url: string | null): Promise<AppUpdateFeed> {
    const next = await updatesPort().appUpdate.setFeedUrl({ url });
    setFeed(next);
    return next;
  }

  return <SettingsUpdateServerRow feed={feed()} loadFailed={loadFailed()} onSave={save} />;
}
