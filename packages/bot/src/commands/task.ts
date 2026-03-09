/**
 * /task — Run a Claude Code task in a project directory.
 *
 * Similar to /ask but specifically for code tasks with project context.
 * Always creates a thread for the response.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { buildEmbed } from "@claude-discord-bridge/shared";
import { runClaude } from "../claude-runner.js";

export const data = new SlashCommandBuilder()
  .setName("task")
  .setDescription("Run a Claude Code task in a project directory")
  .addStringOption((option) =>
    option
      .setName("description")
      .setDescription("What Claude should do")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("project")
      .setDescription("Project directory path")
      .setRequired(false)
  )
  .addIntegerOption((option) =>
    option
      .setName("timeout")
      .setDescription("Timeout in seconds (default: 120)")
      .setMinValue(10)
      .setMaxValue(600)
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const description = interaction.options.getString("description", true);
  const project = interaction.options.getString("project") ?? undefined;
  const timeoutSec = interaction.options.getInteger("timeout") ?? 120;

  await interaction.deferReply();

  const threadName = `Task: ${description.slice(0, 88)}${description.length > 88 ? "…" : ""}`;

  // Post initial status
  await interaction.editReply({
    embeds: [
      buildEmbed({
        title: "Claude Code — Task Running",
        description: `\`${truncateField(description)}\``,
        color: "info",
        fields: [
          ...(project
            ? [{ name: "Project", value: `\`${project}\``, inline: true }]
            : []),
          {
            name: "Timeout",
            value: `${timeoutSec}s`,
            inline: true,
          },
        ],
      }),
    ],
  });

  // Run the task
  const result = await runClaude({
    prompt: description,
    cwd: project,
    timeout: timeoutSec * 1000,
    maxOutput: 8000, // Larger limit since we'll thread it
  });

  const durationSec = (result.durationMs / 1000).toFixed(1);

  // Update the reply with result status
  const statusEmbed = buildEmbed({
    title: result.success
      ? "Claude Code — Task Complete"
      : "Claude Code — Task Failed",
    description: result.success
      ? "See thread for output."
      : result.error ?? "Unknown error",
    color: result.success ? "success" : "error",
    fields: [
      { name: "Task", value: truncateField(description), inline: false },
      ...(project
        ? [{ name: "Project", value: `\`${project}\``, inline: true }]
        : []),
      { name: "Duration", value: `${durationSec}s`, inline: true },
      ...(result.truncated
        ? [{ name: "Note", value: "Output was truncated", inline: true }]
        : []),
    ],
  });

  await interaction.editReply({ embeds: [statusEmbed] });

  // Post output in thread
  if (result.output) {
    const message = await interaction.fetchReply();
    if (message.channel.isTextBased() && "threads" in message.channel) {
      const thread = await message.startThread({
        name: threadName,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      });

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
