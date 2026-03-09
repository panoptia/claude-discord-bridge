import type { Client, TextChannel } from "discord.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const sendMessageTool: Tool = {
  name: "send_discord_message",
  description:
    "Send a message to a Discord channel. Use this to share updates, results, or notifications with your team.",
  inputSchema: {
    type: "object" as const,
    properties: {
      channel_id: {
        type: "string",
        description:
          "Discord channel ID to send the message to. If not provided, uses the default channel from DISCORD_CHANNEL_ID.",
      },
      content: {
        type: "string",
        description: "Message content (max 2000 characters). Supports Discord markdown.",
      },
      title: {
        type: "string",
        description:
          "Optional title for a rich embed. If provided, the message is sent as an embed.",
      },
      color: {
        type: "string",
        enum: ["info", "success", "warning", "error"],
        description: "Embed color (only used when title is provided). Defaults to info.",
      },
    },
    required: ["content"],
  },
};

const COLOR_MAP: Record<string, number> = {
  info: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  error: 0xed4245,
};

export async function handleSendMessage(
  discord: Client,
  args: Record<string, unknown>
) {
  const channelId =
    (args.channel_id as string) || process.env.DISCORD_CHANNEL_ID;
  const content = args.content as string;
  const title = args.title as string | undefined;
  const color = (args.color as string) || "info";

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

  if (!content) {
    return {
      content: [
        { type: "text" as const, text: "content is required." },
      ],
      isError: true,
    };
  }

  try {
    const channel = await discord.channels.fetch(channelId);
    if (!channel?.isTextBased() || !("send" in channel)) {
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

    if (title) {
      // Send as embed
      const msg = await textChannel.send({
        embeds: [
          {
            title,
            description: content,
            color: COLOR_MAP[color] ?? COLOR_MAP.info,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Embed sent to #${textChannel.name} (message ID: ${msg.id})`,
          },
        ],
      };
    }

    // Send as plain message
    const msg = await textChannel.send(content);
    return {
      content: [
        {
          type: "text" as const,
          text: `Message sent to #${textChannel.name} (message ID: ${msg.id})`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
