#!/usr/bin/env node

/**
 * Register slash commands with Discord.
 *
 * Run once after adding/changing commands:
 *   pnpm --filter @claude-discord-bridge/bot deploy-commands
 *
 * Registers commands globally (all guilds) or to a specific guild
 * if DISCORD_GUILD_ID is set (faster for development).
 */

import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!process.env.DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN is required");
  process.exit(1);
}

if (!process.env.DISCORD_CLIENT_ID) {
  console.error(
    "DISCORD_CLIENT_ID is required. Find it in Discord Developer Portal → Application → General Information"
  );
  process.exit(1);
}

const TOKEN: string = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID: string = process.env.DISCORD_CLIENT_ID;

const rest = new REST({ version: "10" }).setToken(TOKEN);

const commandData = commands.map((cmd) => cmd.data.toJSON());

async function main(): Promise<void> {
  console.log(`Registering ${commandData.length} slash commands...`);

  if (GUILD_ID) {
    // Guild-specific (instant, good for dev)
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commandData,
    });
    console.log(`Registered to guild ${GUILD_ID} (instant)`);
  } else {
    // Global (takes up to 1 hour to propagate)
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commandData,
    });
    console.log("Registered globally (may take up to 1 hour to propagate)");
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error("Failed to deploy commands:", error);
  process.exit(1);
});
