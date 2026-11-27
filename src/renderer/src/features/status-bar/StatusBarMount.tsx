import { StatusDetailView } from "@codebot/ui/features/status-bar/StatusDetailView";
import { StatusFooter } from "@codebot/ui/features/status-bar/StatusFooter";
import { createSignal } from "solid-js";
import { usePlanLimitRows } from "../usage/plan-limit-rows";
import { useLocalModelServers } from "./local-model-servers";

interface StatusBarMountProps {
  onManageMachines?: (() => void) | undefined;
}

export function StatusBarMount(props: StatusBarMountProps) {
  const machines = useLocalModelServers();
  const providerRows = usePlanLimitRows();
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <StatusFooter providerRows={providerRows()} machines={machines.statuses()} onOpen={() => setOpen(true)} />
      <StatusDetailView
        open={open()}
        onOpenChange={setOpen}
        providerRows={providerRows()}
        machines={machines.statuses()}
        refreshing={machines.refreshing()}
        onRefresh={() => void machines.refresh().catch(() => undefined)}
        onManageMachines={
          props.onManageMachines
            ? () => {
                setOpen(false);
                props.onManageMachines?.();
              }
            : undefined
        }
      />
    </>
  );
}
