import { onCleanup } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { App } from "../src/App";
import { LEFT_PANEL_COLLAPSED_STORAGE_KEY } from "../src/layout-constants";
import { CodeBotPlayground } from "../src/preview/CodeBotPlayground";
import { MOCK_PROJECT_SEEDS, type MockProjectSeed } from "../src/preview/mock-projects";

const meta = {
  title: "Projects/Shell",
  component: App,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

function useStoredValue(key: string, value: string): void {
  const previous = window.localStorage.getItem(key);
  window.localStorage.setItem(key, value);
  onCleanup(() => {
    if (previous === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, previous);
  });
}

function ProjectShellPlayground(props: { projects: MockProjectSeed[]; compact?: boolean; activeProjectId?: string }) {
  useStoredValue(LEFT_PANEL_COLLAPSED_STORAGE_KEY, props.compact ? "true" : "false");
  if (props.activeProjectId)
    useStoredValue("codebot:active-project:v1", JSON.stringify({ local: props.activeProjectId }));
  return <CodeBotPlayground options={{ projects: props.projects }} />;
}

const MANY_CHATS: MockProjectSeed = {
  id: "mock-project-many",
  name: "Large repository",
  color: "#8b5cf6",
  mainFolder: "/Users/demo/Projects/large-repository",
  agents: [{ id: "mock-project-many-dev", name: "Ken", role: "Developer" }],
  chats: Array.from({ length: 120 }, (_, index) => ({
    agentId: "mock-project-many-dev",
    title: `Task ${index + 1}: tidy module ${index + 1}`,
    minutesAgo: 5 + index * 37,
    messages: [{ author: "user" as const, text: `Task ${index + 1}` }],
  })),
};

export const WithProjects: Story = {
  render: () => <ProjectShellPlayground projects={MOCK_PROJECT_SEEDS} />,
};

export const CompactLeftBar: Story = {
  render: () => <ProjectShellPlayground projects={MOCK_PROJECT_SEEDS} compact />,
};

export const NoProjects: Story = {
  render: () => <ProjectShellPlayground projects={[]} />,
};

export const StrictProject: Story = {
  render: () => <ProjectShellPlayground projects={MOCK_PROJECT_SEEDS} activeProjectId="mock-project-firmware" />,
};

export const OpenProject: Story = {
  render: () => <ProjectShellPlayground projects={MOCK_PROJECT_SEEDS} activeProjectId="mock-project-docs" />,
};

export const LongChatHistory: Story = {
  render: () => (
    <ProjectShellPlayground projects={[MANY_CHATS, ...MOCK_PROJECT_SEEDS]} activeProjectId="mock-project-many" />
  ),
};

export const ArchivedProject: Story = {
  render: () => (
    <ProjectShellPlayground
      projects={[
        ...MOCK_PROJECT_SEEDS,
        { ...MANY_CHATS, id: "mock-project-old", name: "Old prototype", archived: true },
      ]}
    />
  ),
};
