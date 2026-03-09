import { z } from "zod";

export const configSchema = z.object({
  discordBotToken: z.string().min(1, "DISCORD_BOT_TOKEN is required"),
  discordChannelId: z.string().min(1, "DISCORD_CHANNEL_ID is required"),
  discordWebhookUrl: z.string().url().optional(),
});

export type BridgeConfig = z.infer<typeof configSchema>;

export function loadConfig(): BridgeConfig {
  return configSchema.parse({
    discordBotToken: process.env.DISCORD_BOT_TOKEN,
    discordChannelId: process.env.DISCORD_CHANNEL_ID,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || undefined,
  });
}
