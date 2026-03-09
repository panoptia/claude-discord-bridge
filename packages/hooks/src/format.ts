/**
 * Format hook events into Discord embeds.
 */

import type {
  HookEvent,
  StopEvent,
  NotificationEvent,
} from "@claude-discord-bridge/shared";
import type { DiscordEmbed } from "@claude-discord-bridge/shared";
import { EventColor } from "@claude-discord-bridge/shared";

/** Truncate text to Discord field limits */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

/** Extract a human-readable summary from the transcript path */
function sessionLabel(transcriptPath: string): string {
  // Transcript paths look like: /Users/.../sessions/<id>.jsonl
  const parts = transcriptPath.split("/");
  const filename = parts[parts.length - 1] ?? "unknown";
  return filename.replace(".jsonl", "").slice(0, 12);
}

export function formatStopEvent(event: StopEvent): {
  title: string;
  description: string;
  color: keyof typeof EventColor;
  fields?: DiscordEmbed["fields"];
} {
  return {
    title: "Claude Code — Task Complete",
    description: "Claude Code has finished processing.",
    color: "success",
    fields: [
      {
        name: "Session",
        value: `\`${sessionLabel(event.transcript_path)}\``,
        inline: true,
      },
    ],
  };
}

export function formatSessionEndEvent(event: HookEvent): {
  title: string;
  description: string;
  color: keyof typeof EventColor;
  fields?: DiscordEmbed["fields"];
} {
  return {
    title: "Claude Code — Session Ended",
    description: "The Claude Code session has ended.",
    color: "neutral",
    fields: [
      {
        name: "Session",
        value: `\`${sessionLabel(event.transcript_path)}\``,
        inline: true,
      },
    ],
  };
}

export function formatNotificationEvent(event: NotificationEvent): {
  title: string;
  description: string;
  color: keyof typeof EventColor;
  fields?: DiscordEmbed["fields"];
} {
  return {
    title: "Claude Code — Notification",
    description: truncate(event.message, 2000),
    color: "warning",
    fields: [
      {
        name: "Session",
        value: `\`${sessionLabel(event.transcript_path)}\``,
        inline: true,
      },
    ],
  };
}

export function formatHookEvent(event: HookEvent): {
  title: string;
  description: string;
  color: keyof typeof EventColor;
  fields?: DiscordEmbed["fields"];
} {
  switch (event.hook_event_name) {
    case "Stop":
      return formatStopEvent(event);
    case "SessionEnd":
      return formatSessionEndEvent(event);
    case "Notification":
      return formatNotificationEvent(event);
    default:
      return {
        title: `Claude Code — ${event.hook_event_name}`,
        description: "Hook event received.",
        color: "info",
      };
  }
}
