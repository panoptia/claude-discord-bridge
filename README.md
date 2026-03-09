# Claude Discord Bridge

Bidirectional bridge between Claude Code and Discord -- modular, open source.

## What it does

- **MCP Server** -- Claude Code can send messages, create threads, read messages, and list channels on Discord (on-demand)
- **Hooks** -- Automatic Discord notifications when Claude Code sessions end, tasks complete, or notifications fire
- **Discord Bot** -- Slash commands in Discord to run Claude Code tasks remotely via `claude -p`

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

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- A Discord Bot with token ([create one](https://discord.com/developers/applications))
- Claude Code CLI installed (for Bot module)

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
# Edit .env -- see comments for each variable
```

Required variables:

| Variable | Required for | Description |
|---|---|---|
| `DISCORD_BOT_TOKEN` | All modules | Bot token from Discord Developer Portal |
| `DISCORD_CHANNEL_ID` | Hooks, MCP | Default channel for messages |
| `DISCORD_CLIENT_ID` | Bot | Application ID (for slash command registration) |
| `DISCORD_GUILD_ID` | Bot (optional) | Restrict commands to one server (instant updates) |
| `DISCORD_WEBHOOK_URL` | Hooks (optional) | Webhook URL -- preferred over Bot API for hooks |
| `DISCORD_HOOK_EVENTS` | Hooks (optional) | Filter events: `Stop,Notification,SessionEnd` |

---

## Module 1: MCP Server

Claude Code can interact with Discord on-demand through MCP tools.

### Register with Claude Code

```bash
claude mcp add discord-bridge -- node /path/to/claude-discord-bridge/packages/mcp/dist/server.js
```

Or add to `~/.claude/settings.json`:

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

---

## Module 2: Hooks

Automatic Discord notifications from Claude Code hook events. No bot process required -- runs as a standalone script triggered by Claude Code.

### Configure hooks in Claude Code

Add to your `.claude/settings.json` (project or global):

```json
{
  "hooks": {
    "Stop": [{ "type": "command", "command": "node /path/to/claude-discord-bridge/packages/hooks/dist/handler.js" }],
    "Notification": [{ "type": "command", "command": "node /path/to/claude-discord-bridge/packages/hooks/dist/handler.js" }],
    "SessionEnd": [{ "type": "command", "command": "node /path/to/claude-discord-bridge/packages/hooks/dist/handler.js" }]
  }
}
```

### How it works

1. Claude Code triggers a hook event (Stop, Notification, SessionEnd, etc.)
2. Hook event JSON is piped via stdin to the handler
3. Handler formats a Discord embed and sends it

### Sending methods (priority order)

1. **Webhook URL** (`DISCORD_WEBHOOK_URL`) -- Zero-infrastructure, no bot process needed
2. **Bot REST API** (`DISCORD_BOT_TOKEN` + `DISCORD_CHANNEL_ID`) -- Uses existing bot token

### Supported events

| Event | When it fires | Embed content |
|---|---|---|
| `Stop` | Claude Code task completes | Session ID, stop status |
| `SessionEnd` | Interactive session ends | Session ID |
| `Notification` | Claude Code sends a notification | Message content |
| `PreToolUse` | Before a tool is used | Tool name, input preview |
| `PostToolUse` | After a tool completes | Tool name, response preview |

### Event filtering

Set `DISCORD_HOOK_EVENTS` to receive only specific events:

```bash
# Only get notified on Stop and Notification events
DISCORD_HOOK_EVENTS=Stop,Notification
```

---

## Module 3: Discord Bot

Run Claude Code tasks from Discord using slash commands.

### Start the bot

```bash
# Register slash commands (once, or after changes)
node packages/bot/dist/deploy-commands.js

# Start the bot
node packages/bot/dist/bot.js
```

### Slash Commands

| Command | Description | Parameters |
|---|---|---|
| `/ask` | Ask Claude a question | `prompt` (required), `cwd` (optional) |
| `/task` | Run a Claude Code task | `description` (required), `project` (optional), `timeout` (optional, 10-600s) |
| `/status` | Show bot status | -- |

### How `/ask` and `/task` work

1. User sends a slash command in Discord
2. Bot defers the reply (allows up to 15 minutes for Claude to respond)
3. Bot spawns `claude -p` with the prompt/task description
4. Response is posted as an embed (short responses) or in a thread (long responses)
5. Long outputs are split into chunks to fit Discord's message limits

---

## Packages

| Package | Description | Status |
|---|---|---|
| `@claude-discord-bridge/shared` | Shared types, config, embed helpers | Stable |
| `@claude-discord-bridge/mcp` | MCP Server with Discord tools | Stable |
| `@claude-discord-bridge/hooks` | Hook handlers for auto-posting | Stable |
| `@claude-discord-bridge/bot` | Discord bot with slash commands | Stable |

## Development

```bash
pnpm install     # Install dependencies
pnpm build       # Build all packages (Turborepo)
pnpm dev         # Watch mode (all packages)
pnpm clean       # Remove all dist/ directories
```

### Project structure

```
claude-discord-bridge/
├── packages/
│   ├── shared/          # Types, config schema, embed builder
│   ├── mcp/             # MCP stdio server with Discord tools
│   ├── hooks/           # Claude Code hook handler (stdin → Discord)
│   └── bot/             # Discord bot with slash commands
├── scripts/
│   └── create-webhook.mjs
├── .env.example
├── turbo.json
└── package.json
```

## Why this exists

Existing solutions are either monolithic, one-directional, or rely on tmux wrappers. This bridge is:

- **Modular** -- Use only what you need (MCP, Hooks, Bot, or all three)
- **Claude-Code-native** -- Built on Hooks + MCP, not shell wrappers
- **Zero-dependency sending** -- Hooks use native `fetch`, no Discord.js needed
- **Open source** -- MIT licensed, designed for the community

## Discord Bot Setup

If you're setting up the Discord bot for the first time:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** > click **Reset Token** > copy the token to `DISCORD_BOT_TOKEN`
4. Under **Privileged Gateway Intents**, enable what you need (Guilds intent is sufficient)
5. Go to **General Information** > copy **Application ID** to `DISCORD_CLIENT_ID`
6. Generate invite URL: **OAuth2** > **URL Generator** > select `bot` + `applications.commands` > select permissions: `Send Messages`, `Create Public Threads`, `Embed Links`, `Read Message History`, `Use Slash Commands`
7. Invite the bot to your server
8. Copy the server ID to `DISCORD_GUILD_ID` (right-click server > Copy Server ID)

## License

MIT
