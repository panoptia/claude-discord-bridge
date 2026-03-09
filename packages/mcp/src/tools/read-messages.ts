import type { Client, TextChannel } from "discord.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const readMessagesTool: Tool = {
  name: "read_discord_messages",
  description:
    "Read recent messages from a Discord channel or thread. Useful for getting context or checking what was discussed.",
  inputSchema: {
    type: "object" as const,
    properties: {
      channel_id: {
        type: "string",
        description:
          "Discord channel or thread ID. If not provided, uses DISCORD_CHANNEL_ID.",
      },
      limit: {
        type: "number",
        description: "Number of messages to fetch (1-50, default 10).",
      },
    },
    required: [],
  },
};

export async function handleReadMessages(
  discord: Client,
  args: Record<string, unknown>
) {
  const channelId =
    (args.channel_id as string) || process.env.DISCORD_CHANNEL_ID;
  const limit = Math.min(Math.max((args.limit as number) || 10, 1), 50);

  if (!channelId) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No channel_id provided and DISCORD_CHANNEL_ID not set.",
        },
      ],
      isError: true,
    };
  }

  try {
    const channel = await discord.channels.fetch(channelId);
    if (!channel?.isTextBased() || !("messages" in channel)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Channel ${channelId} is not a text channel.`,
          },
        ],
        isError: true,
      };
    }

    const textChannel = channel as TextChannel;
    const messages = await textChannel.messages.fetch({ limit });

    const formatted = messages
      .reverse()
      .map((msg) => {
        const author = msg.author.tag;
        const time = msg.createdAt.toISOString();
        const text = msg.content || "(embed/attachment)";
        return `[${time}] ${author}: ${text}`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: formatted || "No messages found.",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to read messages: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
