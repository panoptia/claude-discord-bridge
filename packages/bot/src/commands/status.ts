/**
 * /status — Show bot and system status.
 *
 * Displays uptime, Discord latency, and whether claude CLI is available.
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { buildEmbed } from "@claude-discord-bridge/shared";
import { execFile } from "node:child_process";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show bot status and claude availability");

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  // Check claude CLI availability
  const claudeAvailable = await checkClaudeAvailable();

  // Bot info
  const client = interaction.client;
  const uptime = client.uptime ?? 0;
  const uptimeStr = formatUptime(uptime);
  const ping = client.ws.ping;

  await interaction.editReply({
    embeds: [
      buildEmbed({
        title: "Claude Discord Bridge — Status",
        color: claudeAvailable ? "success" : "warning",
        fields: [
          {
            name: "Bot",
            value: `\`${client.user?.tag ?? "unknown"}\``,
            inline: true,
          },
          { name: "Uptime", value: uptimeStr, inline: true },
          { name: "Latency", value: `${ping}ms`, inline: true },
          {
            name: "Claude CLI",
            value: claudeAvailable ? "Available" : "Not found",
            inline: true,
          },
          {
            name: "Node.js",
            value: process.version,
            inline: true,
          },
        ],
      }),
    ],
  });
}

async function checkClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("claude", ["--version"], { timeout: 5000 }, (error) => {
      resolve(!error);
    });
  });
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
