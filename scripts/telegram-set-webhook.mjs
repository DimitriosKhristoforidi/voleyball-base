#!/usr/bin/env node
/**
 * Register Telegram webhook for Supabase telegram-bot function.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=xxx node scripts/telegram-set-webhook.mjs
 *   TELEGRAM_BOT_TOKEN=xxx FUNCTION_SECRET=my-secret node scripts/telegram-set-webhook.mjs
 *
 */
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const functionSecret = process.env.FUNCTION_SECRET?.trim();
const projectRef = process.env.SUPABASE_PROJECT_REF;

if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const baseUrl = `https://${projectRef}.supabase.co/functions/v1/telegram-bot`;
const webhookUrl = functionSecret
  ? baseUrl
  : `${baseUrl}?secret=${encodeURIComponent(token)}`;

const params = new URLSearchParams({ url: webhookUrl });
if (functionSecret) {
  params.set("secret_token", functionSecret);
}

const setUrl = `https://api.telegram.org/bot${token}/setWebhook?${params}`;

console.log("Calling setWebhook...");
const res = await fetch(setUrl);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));

if (!data.ok) {
  process.exit(1);
}

console.log("\nVerify with getWebhookInfo:");
console.log(`https://api.telegram.org/bot${token}/getWebhookInfo`);
