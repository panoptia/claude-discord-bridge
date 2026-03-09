import type { Client, TextChannel } from "discord.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const createThreadTool: Tool = {
  name: "create_discord_thread",
  description:
    "Create a new thread in a Discord channel. Useful for grouping related messages (e.g., a session log, task progress).",
  inputSchema: {
    type: "object" as const,
    properties: {
      channel_id: {
        type: "string",
        description:
          "Discord channel ID. If not provided, uses DISCORD_CHANNEL_ID.",
      },
      name: {
        type: "string",
        description: "Thread name (max 100 characters).",
      },
      content: {
        type: "string",
        description: "Initial message in the thread.",
      },
    },
    required: ["name", "content"],
  },
};

export async function handleCreateThread(
  discord: Client,
  args: Record<string, unknown>
) {
  const channelId =
    (args.channel_id as string) || process.env.DISCORD_CHANNEL_ID;
  const name = args.name as string;
  const content = args.content as string;

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
    if (!channel?.isTextBased() || !("threads" in channel)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Channel ${channelId} does not support threads.`,
          },
        ],
        isError: true,
      };
    }

    const textChannel = channel as TextChannel;

    // Create a starter message, then thread from it
    const starterMessage = await textChannel.send({
      embeds: [
        {
          title: `🔗 ${name}`,
          description: "Thread created by Claude Code",
          color: 0x5865f2,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const thread = await starterMessage.startThread({
      name: name.slice(0, 100),
    });

    await thread.send(content);

    return {
      content: [
        {
          type: "text" as const,
          text: `Thread "${name}" created in #${textChannel.name} (thread ID: ${thread.id}). Use this thread_id as channel_id in send_discord_message to post follow-up messages.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to create thread: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
