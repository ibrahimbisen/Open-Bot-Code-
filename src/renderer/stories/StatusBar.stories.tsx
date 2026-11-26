import { accountUsageProviderRows } from "@codebot/ui/features/account/account-usage-view";
import { StatusDetailView } from "@codebot/ui/features/status-bar/StatusDetailView";
import { StatusFooter } from "@codebot/ui/features/status-bar/StatusFooter";
import { fn } from "storybook/test";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { LOCAL_MODEL_SERVER_FIXTURES } from "../src/preview/mock-local-model-servers";

const nowSeconds = Math.floor(Date.now() / 1_000);
const fiveHourReset = nowSeconds + 2 * 3_600 + 14 * 60;
const weeklyReset = nowSeconds + 4 * 86_400 + 6 * 3_600;

const providerRows = accountUsageProviderRows({
  limits: [
    {
      id: "codex",
      primary: { usedPercent: 28, windowDurationMins: 300, resetsAt: fiveHourReset },
      secondary: { usedPercent: 15, windowDurationMins: 10_080, resetsAt: weeklyReset },
    },
    {
      id: "claude",
      primary: { usedPercent: 92, windowDurationMins: 300, resetsAt: fiveHourReset },
      secondary: { usedPercent: 64, windowDurationMins: 10_080, resetsAt: weeklyReset },
    },
  ],
});

function Footer(props: { withProviders: boolean; withMachines: boolean }) {
  return (
    <div style={{ width: "260px" }}>
      <StatusFooter
        providerRows={props.withProviders ? providerRows : []}
        machines={props.withMachines ? LOCAL_MODEL_SERVER_FIXTURES : []}
        onOpen={fn()}
      />
    </div>
  );
}

const meta = {
  title: "Status/Footer",
  component: Footer,
  args: { withProviders: true, withMachines: true },
  parameters: { layout: "centered", a11y: { test: "error" } },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LimitsAndMachines: Story = {};
export const LimitsOnly: Story = { args: { withMachines: false } };
export const MachinesOnly: Story = { args: { withProviders: false } };

export const Detail: Story = {
  render: () => (
    <StatusDetailView
      open
      onOpenChange={fn()}
      providerRows={providerRows}
      machines={LOCAL_MODEL_SERVER_FIXTURES}
      refreshing={false}
      onRefresh={fn()}
      onManageMachines={fn()}
    />
  ),
  parameters: { layout: "fullscreen" },
};
