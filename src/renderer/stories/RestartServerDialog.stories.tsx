import type { ServerSummary } from "@codebot/contracts/ipc";
import { Button, Toaster } from "@codebot/ui";
import { RestartServerDialog } from "@codebot/ui/features/servers/RestartServerDialog";
import { createSignal, onCleanup } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";

type StoryServer = Pick<ServerSummary, "id" | "name" | "state">;

const SERVER: StoryServer = { id: "research-hosted", name: "Research server", state: "online" };

function RestartStory(props: { outcome: "online" | "request-failed" }) {
  const [server, setServer] = createSignal<StoryServer>(SERVER);
  const [open, setOpen] = createSignal(true);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  onCleanup(() => {
    for (const timer of timers) clearTimeout(timer);
  });
  function later(ms: number, change: Partial<StoryServer>): void {
    const timer = setTimeout(() => setServer((current) => ({ ...current, ...change })), ms);
    timers.add(timer);
  }
  async function restart(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (props.outcome === "request-failed")
      throw new Error("The server cannot restart now. Wait a moment, then try again.");
    later(1500, { state: "connecting" });
    later(5500, { state: "online" });
  }
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Restart server
      </Button>
      <RestartServerDialog
        server={open() ? server() : null}
        servers={[server()]}
        onClose={() => setOpen(false)}
        onRestart={restart}
      />
      <Toaster />
    </>
  );
}

const meta = {
  title: "Team/RestartServerDialog",
  parameters: { layout: "centered", a11y: { test: "error" } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const BackOnline: Story = { render: () => <RestartStory outcome="online" /> };

export const RequestFailed: Story = { render: () => <RestartStory outcome="request-failed" /> };
