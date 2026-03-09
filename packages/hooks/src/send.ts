/**
 * Send Discord messages via webhook or Bot API (fallback).
 *
 * Priority: DISCORD_WEBHOOK_URL > DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID
 */

import type { DiscordEmbed } from "@claude-discord-bridge/shared";
import { EventColor } from "@claude-discord-bridge/shared";

const DISCORD_API = "https://discord.com/api/v10";

interface EmbedPayload {
  title: string;
  description?: string;
  color?: keyof typeof EventColor;
  fields?: DiscordEmbed["fields"];
}

/** Send via Discord webhook (zero-infrastructure) */
async function sendViaWebhook(
  webhookUrl: string,
  embed: EmbedPayload
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Claude Code",
      embeds: [
        {
          title: embed.title,
          description: embed.description,
          color: EventColor[embed.color ?? "info"],
          fields: embed.fields,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "unknown");
    throw new Error(`Webhook failed (${response.status}): ${body}`);
  }
}

/** Send via Discord Bot API (requires bot token) */
async function sendViaBotApi(
  token: string,
  channelId: string,
  embed: EmbedPayload
): Promise<void> {
  const response = await fetch(
    `${DISCORD_API}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title: embed.title,
            description: embed.description,
            color: EventColor[embed.color ?? "info"],
            fields: embed.fields,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "unknown");
    throw new Error(`Bot API failed (${response.status}): ${body}`);
  }
}

/** Send embed via best available method */
export async function sendEmbed(embed: EmbedPayload): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (webhookUrl) {
    return sendViaWebhook(webhookUrl, embed);
  }

  if (botToken && channelId) {
    return sendViaBotApi(botToken, channelId, embed);
  }

  throw new Error(
    "No Discord credentials configured. Set DISCORD_WEBHOOK_URL or DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID."
  );
}
