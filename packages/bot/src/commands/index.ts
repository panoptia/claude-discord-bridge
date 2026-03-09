/**
 * Command registry.
 *
 * Collects all slash command definitions and handlers.
 */

import type {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

import * as ask from "./ask.js";
import * as task from "./task.js";
import * as status from "./status.js";

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands: Command[] = [
  ask as Command,
  task as Command,
  status as Command,
];
