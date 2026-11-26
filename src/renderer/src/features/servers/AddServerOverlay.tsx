import { Show } from "solid-js";
import { AddServerDialog } from "../../lazy-views";

interface AddServerOverlayProps {
  open: boolean;
  onClose: () => void;
  onJoinWithInvite?: (() => void) | undefined;
  onCreateLocal?: (() => void) | undefined;
}

export function AddServerOverlay(props: AddServerOverlayProps) {
  return (
    <Show when={props.open}>
      <AddServerDialog
        onClose={props.onClose}
        onJoinWithInvite={props.onJoinWithInvite}
        onCreateLocal={props.onCreateLocal}
      />
    </Show>
  );
}
