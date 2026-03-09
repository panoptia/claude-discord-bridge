/**
 * Lightweight Discord webhook client.
 * No discord.js dependency — just native fetch.
 */

import { type DiscordEmbed, EventColor } from "@claude-discord-bridge/shared";

interface WebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

export async function sendWebhook(
  webhookUrl: string,
  payload: WebhookPayload
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "unknown");
    throw new Error(
      `Discord webhook failed (${response.status}): ${body}`
    );
  }
}

export function sendHookEmbed(
  webhookUrl: string,
  options: {
    title: string;
    description?: string;
    color?: keyof typeof EventColor;
    fields?: DiscordEmbed["fields"];
  }
): Promise<void> {
  return sendWebhook(webhookUrl, {
    username: "Claude Code",
    embeds: [
      {
        title: options.title,
        description: options.description,
        color: EventColor[options.color ?? "info"],
        fields: options.fields,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
