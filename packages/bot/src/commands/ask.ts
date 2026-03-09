/**
 * /ask — Send a prompt to Claude and get a response.
 *
 * Creates a thread for the response to keep the channel clean.
 * Runs claude -p in the background and posts the result.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { EventColor, buildEmbed } from "@claude-discord-bridge/shared";
import { runClaude } from "../claude-runner.js";

export const data = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Ask Claude a question")
  .addStringOption((option) =>
    option
      .setName("prompt")
      .setDescription("Your question or prompt for Claude")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("cwd")
      .setDescription("Working directory for project context (optional)")
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const prompt = interaction.options.getString("prompt", true);
  const cwd = interaction.options.getString("cwd") ?? undefined;

  // Acknowledge immediately (claude can take a while)
  await interaction.deferReply();

  // Create a thread for the response
  const threadName = `Ask: ${prompt.slice(0, 90)}${prompt.length > 90 ? "…" : ""}`;

  const result = await runClaude({ prompt, cwd });
  const durationSec = (result.durationMs / 1000).toFixed(1);

  if (!result.success) {
    await interaction.editReply({
      embeds: [
        buildEmbed({
          title: "Claude — Error",
          description: result.error ?? "Unknown error",
          color: "error",
          fields: [
            { name: "Prompt", value: truncateField(prompt), inline: false },
            { name: "Duration", value: `${durationSec}s`, inline: true },
          ],
        }),
      ],
    });
    return;
  }

  // Format response — use embed for short, code block for long
  if (result.output.length <= 2000) {
    await interaction.editReply({
      embeds: [
        buildEmbed({
          title: "Claude — Response",
          description: result.output,
          color: "success",
          fields: [
            { name: "Prompt", value: truncateField(prompt), inline: false },
            ...(result.truncated
              ? [
                  {
                    name: "Note",
                    value: "Output was truncated",
                    inline: true,
                  },
                ]
              : []),
            { name: "Duration", value: `${durationSec}s`, inline: true },
          ],
        }),
      ],
    });
  } else {
    // Too long for embed description — create thread and post there
    const reply = await interaction.editReply({
      embeds: [
        buildEmbed({
          title: "Claude — Response",
          description: "Response posted in thread (too long for embed).",
          color: "success",
          fields: [
            { name: "Prompt", value: truncateField(prompt), inline: false },
            { name: "Duration", value: `${durationSec}s`, inline: true },
          ],
        }),
      ],
    });

    // Create a thread on the reply message
    const message = await interaction.fetchReply();
    if (message.channel.isTextBased() && "threads" in message.channel) {
      const thread = await message.startThread({
        name: threadName,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
      });

      // Split output into Discord-safe chunks (2000 char limit)
      const chunks = splitIntoChunks(result.output, 1950);
      for (const chunk of chunks) {
        await thread.send(`\`\`\`\n${chunk}\n\`\`\``);
      }
    }
  }
}

function truncateField(text: string, max = 1024): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "…";
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
