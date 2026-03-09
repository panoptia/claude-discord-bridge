/**
 * Discord embed builder helpers.
 * Keeps embed construction consistent across modules.
 */

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

/** Discord embed color constants (decimal) */
export const EventColor = {
  info: 0x5865f2, // Discord blurple
  success: 0x57f287, // Green
  warning: 0xfee75c, // Yellow
  error: 0xed4245, // Red
  neutral: 0x99aab5, // Grey
} as const;

export function buildEmbed(options: {
  title: string;
  description?: string;
  color?: keyof typeof EventColor;
  fields?: DiscordEmbed["fields"];
}): DiscordEmbed {
  return {
    title: options.title,
    description: options.description,
    color: EventColor[options.color ?? "info"],
    fields: options.fields,
    timestamp: new Date().toISOString(),
  };
}
