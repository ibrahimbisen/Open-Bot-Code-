import { coordinatorText } from "@codebot/contracts/coordinator-text";
import type { ChannelSummary } from "@codebot/contracts/ipc";
import type { GlobalSearchChannel } from "@codebot/ui/components/GlobalSearch";

export function globalSearchChannels(
  channels: ChannelSummary[],
  localize: (text: string) => string,
): GlobalSearchChannel[] {
  return channels
    .filter((channel) => !channel.archived)
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      detail: channel.lastMessage
        ? `${channel.lastMessage.authorName}: ${coordinatorText(channel.lastMessage.author, channel.lastMessage.text, localize)}`
        : undefined,
    }));
}
