import { ChannelType, type Client } from "discord.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const listChannelsTool: Tool = {
  name: "list_discord_channels",
  description:
    "List available text channels in all Discord servers the bot has access to.",
  inputSchema: {
    type: "object" as const,
    properties: {
      guild_id: {
        type: "string",
        description:
          "Optional: filter to a specific server (guild) ID.",
      },
    },
    required: [],
  },
};

export async function handleListChannels(
  discord: Client,
  args: Record<string, unknown>
) {
  const guildId = args.guild_id as string | undefined;

  try {
    const guilds = guildId
      ? [await discord.guilds.fetch(guildId)]
      : Array.from((await discord.guilds.fetch()).values());

    const results: string[] = [];

    for (const guildRef of guilds) {
      const guild = await guildRef.fetch();
      const channels = await guild.channels.fetch();

      const textChannels = channels.filter(
        (ch) =>
          ch !== null &&
          (ch.type === ChannelType.GuildText ||
            ch.type === ChannelType.GuildAnnouncement)
      );

      if (textChannels.size > 0) {
        results.push(`**${guild.name}** (${guild.id}):`);
        for (const [id, channel] of textChannels) {
          if (channel) {
            results.push(`  #${channel.name} (${id})`);
          }
        }
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: results.length > 0 ? results.join("\n") : "No text channels found.",
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to list channels: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
