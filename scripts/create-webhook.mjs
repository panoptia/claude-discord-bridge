#!/usr/bin/env node
import { readFileSync } from "fs";

// Manual .env loading
const envPath = new URL("../.env", import.meta.url);
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const API = "https://discord.com/api/v10";

// Check existing webhooks
const res = await fetch(`${API}/channels/${CHANNEL_ID}/webhooks`, {
  headers: { Authorization: `Bot ${TOKEN}` },
});
const existing = await res.json();

if (!Array.isArray(existing)) {
  console.error("Failed to fetch webhooks:", JSON.stringify(existing));
  console.error("Bot may need MANAGE_WEBHOOKS permission.");
  process.exit(1);
}

let webhook = existing.find((w) => w.name === "Claude Code Hooks");

if (!webhook) {
  const createRes = await fetch(`${API}/channels/${CHANNEL_ID}/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Claude Code Hooks" }),
  });
  webhook = await createRes.json();
  if (webhook.code) {
    console.error("Failed to create webhook:", JSON.stringify(webhook));
    process.exit(1);
  }
}

const url = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;
console.log(url);
