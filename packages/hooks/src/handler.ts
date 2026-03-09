#!/usr/bin/env node

/**
 * Claude Code Hook Handler.
 *
 * Usage in .claude/settings.json:
 *   "hooks": {
 *     "Stop": [{ "type": "command", "command": "node /path/to/hooks/dist/handler.js" }],
 *     "Notification": [{ "type": "command", "command": "node /path/to/hooks/dist/handler.js" }]
 *   }
 *
 * Reads hook event from stdin (JSON), formats a Discord embed, sends to Discord.
 * Supports two send methods (priority order):
 *   1. Webhook URL (zero-infrastructure, no bot needed)
 *   2. Bot REST API (uses existing bot token + channel ID)
 *
 * Required env vars (one of):
 *   DISCORD_WEBHOOK_URL — Discord webhook URL (preferred)
 *   DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID — Bot API fallback
 *
 * Optional env vars:
 *   DISCORD_HOOK_EVENTS — Comma-separated list of events to handle (default: all)
 */

import "dotenv/config";
import type { HookEvent } from "@claude-discord-bridge/shared";
import { readStdin } from "./read-stdin.js";
import { formatHookEvent } from "./format.js";
import { sendEmbed } from "./send.js";

async function main(): Promise<void> {
  const hasWebhook = !!process.env.DISCORD_WEBHOOK_URL;
  const hasBotApi =
    !!process.env.DISCORD_BOT_TOKEN && !!process.env.DISCORD_CHANNEL_ID;

  if (!hasWebhook && !hasBotApi) {
    // Silently exit — hook is configured but no Discord credentials set up yet
    // Don't crash Claude Code over a missing notification config
    process.exit(0);
  }

  // Read hook event from stdin
  const raw = await readStdin();
  if (!raw.trim()) {
    // No input — nothing to do
    process.exit(0);
  }

  let event: HookEvent;
  try {
    event = JSON.parse(raw) as HookEvent;
  } catch {
    console.error("Failed to parse hook event JSON from stdin");
    process.exit(1);
  }

  // Optional event filtering
  const allowedEvents = process.env.DISCORD_HOOK_EVENTS;
  if (allowedEvents) {
    const allowed = allowedEvents.split(",").map((s) => s.trim());
    if (!allowed.includes(event.hook_event_name)) {
      process.exit(0);
    }
  }

  // Format and send
  const embed = formatHookEvent(event);

  try {
    await sendEmbed(embed);
  } catch (error) {
    // Log but don't crash Claude Code
    console.error(
      "Discord webhook error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
