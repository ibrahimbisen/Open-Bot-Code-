import type { ServerSummary } from "@codebot/contracts/ipc";
import { Heading, Text, Toaster } from "@codebot/ui";
import { AddServerDialog } from "@codebot/ui/features/servers/AddServerDialog";
import { ServerRail } from "@codebot/ui/features/servers/ServerRail";
import { createMemo, createSignal, Show } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { STORY_SERVERS } from "./fixtures";

interface FlowProps {
  startOpen?: boolean;
}

function AddServerFlow(props: FlowProps) {
  const [servers, setServers] = createSignal<ServerSummary[]>(STORY_SERVERS);
  const [addOpen, setAddOpen] = createSignal(props.startOpen ?? false);
  const [joinNote, setJoinNote] = createSignal(false);
  const [localNote, setLocalNote] = createSignal(false);

  const activeServer = createMemo(() => servers().find((server) => server.active) ?? servers()[0]);

  function openAdd(): void {
    setAddOpen(true);
  }

  return (
    <>
      <Toaster />
      <ServerRail
        servers={servers()}
        onSelect={(serverId) =>
          setServers((current) => current.map((server) => ({ ...server, active: server.id === serverId })))
        }
        onReorder={(serverIds) =>
          setServers((current) => [
            ...current.filter((server) => server.kind === "local"),
            ...serverIds.flatMap((id) => current.filter((server) => server.id === id)),
          ])
        }
        onAdd={openAdd}
        addCreatesServer
      />
      <main class="foundation-story">
        <Heading as="h1" size="lg">
          {activeServer()?.name}
        </Heading>
        <Text tone="muted">Click the plus button in the server rail to add a server.</Text>
        <Show when={joinNote()}>
          <Text tone="muted">"Join a server" was clicked. The app opens the invite dialog here.</Text>
        </Show>
        <Show when={localNote()}>
          <Text tone="muted">
            "New server on this computer" was clicked. The app opens the dialog that names the server here.
          </Text>
        </Show>
      </main>

      <Show when={addOpen()}>
        <AddServerDialog
          onClose={() => setAddOpen(false)}
          onJoinWithInvite={() => {
            setAddOpen(false);
            setJoinNote(true);
          }}
          onCreateLocal={() => {
            setAddOpen(false);
            setLocalNote(true);
          }}
        />
      </Show>
    </>
  );
}

const meta = {
  title: "Team/Add Server Flow",
  decorators: [(Story) => <div class="app-frame app-frame-edge app-frame-with-server-rail">{Story()}</div>],
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
    viewport: {
      options: {
        addServerNarrow: { name: "Add server — 360 × 720", styles: { width: "360px", height: "720px" } },
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClickPlus: Story = {
  render: () => <AddServerFlow />,
};

export const DialogOpen: Story = {
  render: () => <AddServerFlow startOpen />,
};

export const Narrow: Story = {
  globals: { viewport: { value: "addServerNarrow", isRotated: false } },
  render: () => <AddServerFlow startOpen />,
};
