# Claude Discord Bridge

Bidirectional bridge between Claude Code and Discord — modular, open source.

## What it does

- **MCP Server** — Claude Code can send messages, create threads, read messages, and list channels on Discord (on-demand)
- **Hooks** (coming) — Automatic Discord notifications on session end, tool results, errors
- **Discord Bot** (coming) — Slash commands in Discord to run Claude Code tasks

## Architecture

Three independent modules that work alone or together:

```
┌──────────────────────────┐
│     Claude Code CLI      │
│                          │
│  ┌─────────┐            │
│  │  Hooks   │── HTTP ──────► Discord Webhook / Channel
│  │(auto)    │            │
│  └─────────┘            │
│                          │
│  ┌─────────┐            │
│  │MCP Server│── API ───────► Discord Channel (on-demand)
│  │(stdio)   │            │
│  └─────────┘            │
└──────────────────────────┘
         ▲
         │ claude -p (headless)
         │
┌────────┴─────────┐
│   Discord Bot    │◄── Discord User (Slash Commands)
│   (discord.js)   │
└──────────────────┘
```

## Quick Start — MCP Server

### Prerequisites

- Node.js 20+
- A Discord Bot Token ([create one](https://discord.com/developers/applications))
- Claude Code CLI installed

### Setup

```bash
git clone https://github.com/panoptia/claude-discord-bridge.git
cd claude-discord-bridge
pnpm install
pnpm build
```

### Configure

```bash
cp .env.example .env
# Edit .env with your DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID
```

### Register with Claude Code

```bash
claude mcp add discord-bridge -- node /path/to/claude-discord-bridge/packages/mcp/dist/server.js
```

Or add to your Claude Code MCP config (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "discord-bridge": {
      "command": "node",
      "args": ["/path/to/claude-discord-bridge/packages/mcp/dist/server.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "your-token",
        "DISCORD_CHANNEL_ID": "your-channel-id"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|---|---|
| `send_discord_message` | Send a message or embed to a Discord channel |
| `create_discord_thread` | Create a thread with an initial message |
| `read_discord_messages` | Read recent messages from a channel or thread |
| `list_discord_channels` | List text channels across servers |

## Packages

| Package | Description | Status |
|---|---|---|
| `@claude-discord-bridge/mcp` | MCP Server with Discord tools | Available |
| `@claude-discord-bridge/shared` | Shared types, config, helpers | Available |
| `@claude-discord-bridge/hooks` | Hook handlers for auto-posting | Planned |
| `@claude-discord-bridge/bot` | Discord bot with slash commands | Planned |

## Development

```bash
pnpm install     # Install dependencies
pnpm build       # Build all packages
pnpm dev         # Watch mode
```

## Why this exists

Existing solutions are either monolithic, one-directional, or rely on tmux wrappers. This bridge is:

- **Modular** — Use only what you need (MCP, Hooks, Bot, or all three)
- **Claude-Code-native** — Built on Hooks + MCP, not shell wrappers
- **Open source** — MIT licensed, designed for the community

## License

MIT
