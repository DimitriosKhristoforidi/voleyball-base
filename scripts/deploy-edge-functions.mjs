#!/usr/bin/env node
/**
 * Deploy Telegram edge functions via Supabase Management API.
 * Requires: SUPABASE_ACCESS_TOKEN (from `supabase login` or dashboard token)
 *           SUPABASE_PROJECT_REF
 *
 * Usage: node scripts/deploy-edge-functions.mjs
 */
import fs from "node:fs";
import path from "node:path";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error(
    "Set SUPABASE_ACCESS_TOKEN (run: supabase login, then export token)",
  );
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");

function collectFiles(dir) {
  const base = path.join(ROOT, "supabase/functions", dir);
  const files = [];
  for (const rel of [
    "index.ts",
    "_shared/cors.ts",
    "_shared/game-data.ts",
    "_shared/telegram-message.ts",
  ]) {
    const p = path.join(base, rel);
    if (!fs.existsSync(p)) throw new Error(`Missing ${p}`);
    files.push({ name: rel, content: fs.readFileSync(p, "utf8") });
  }
  return files;
}

async function deploy(name, verifyJwt, files) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${name}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug: name,
        name,
        entrypoint_path: "index.ts",
        verify_jwt: verifyJwt,
        files,
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Deploy ${name} failed ${res.status}: ${text}`);
  }
  console.log(`Deployed ${name}:`, text);
}

const telegramBot = fs.readFileSync(
  path.join(ROOT, "supabase/functions/telegram-bot/index.ts"),
  "utf8",
);

await deploy("send-game-reminder", true, collectFiles("send-game-reminder"));
await deploy(
  "daily-game-reminders",
  false,
  collectFiles("daily-game-reminders"),
);
await deploy("telegram-bot", false, [
  { name: "index.ts", content: telegramBot },
]);

console.log("All functions deployed.");
