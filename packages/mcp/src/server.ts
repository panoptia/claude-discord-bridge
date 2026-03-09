#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import "dotenv/config";
import { sendMessageTool, handleSendMessage } from "./tools/send-message.js";
import {
  createThreadTool,
  handleCreateThread,
} from "./tools/create-thread.js";
import {
  readMessagesTool,
  handleReadMessages,
} from "./tools/read-messages.js";
import {
  listChannelsTool,
  handleListChannels,
} from "./tools/list-channels.js";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN environment variable is required");
  process.exit(1);
}

// Initialize Discord client
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize MCP server
const server = new Server(
  {
    name: "claude-discord-bridge",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [sendMessageTool, createThreadTool, readMessagesTool, listChannelsTool],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  switch (name) {
    case "send_discord_message":
      return handleSendMessage(discord, args);
    case "create_discord_thread":
      return handleCreateThread(discord, args);
    case "read_discord_messages":
      return handleReadMessages(discord, args);
    case "list_discord_channels":
      return handleListChannels(discord, args);
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// Start
async function main() {
  // Connect Discord first
  await discord.login(DISCORD_BOT_TOKEN);
  console.error(`Discord connected as ${discord.user?.tag}`);

  // Then start MCP stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
