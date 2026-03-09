#!/usr/bin/env node

/**
 * Claude Discord Bot.
 *
 * Interactive Discord bot with slash commands for running Claude Code
 * tasks from Discord. Listens for commands and executes them via
 * the `claude -p` CLI.
 *
 * Required env vars:
 *   DISCORD_BOT_TOKEN — Discord bot token
 *
 * Optional env vars:
 *   DISCORD_CLIENT_ID — For command deployment (also needed for deploy-commands)
 *   DISCORD_GUILD_ID — Restrict commands to a specific guild (dev mode)
 */

import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  type Interaction,
} from "discord.js";
import { commands } from "./commands/index.js";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN environment variable is required");
  process.exit(1);
}

// Initialize Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot ready as ${readyClient.user.tag}`);
  console.log(
    `Serving ${commands.length} commands: ${commands.map((c) => `/${c.data.name}`).join(", ")}`
  );
});

// Interaction handler
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find(
    (cmd) => cmd.data.name === interaction.commandName
  );

  if (!command) {
    console.error(`Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(
      `Error executing /${interaction.commandName}:`,
      error instanceof Error ? error.message : String(error)
    );

    // Try to inform the user
    const errorMessage = "An error occurred while executing this command.";
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch {
      // Can't reply — the interaction likely expired
    }
  }
});

// Graceful shutdown
function shutdown(): void {
  console.log("Shutting down...");
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Connect
client.login(DISCORD_BOT_TOKEN).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
