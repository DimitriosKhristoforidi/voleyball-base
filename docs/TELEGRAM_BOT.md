# Telegram bot setup

The app uses [grammY](https://grammy.dev) on **Supabase Edge Functions** to post game reminders to your volleyball group.

## 1. Create the bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot`, follow prompts, copy the **bot token**.

## 2. Get the group Chat ID (`/chatid`)

**Easiest:** open a **private chat** with your bot (not the group) and send `/chatid`. The bot always sees commands there.

**In a group**, Telegram often hides commands from bots unless:

- You use `/chatid@YourBotUsername` (replace with your bot’s username from BotFather), **or**
- The bot is a **group admin**, **or**
- You disable privacy: BotFather → `/setprivacy` → your bot → **Disable** → remove bot from group and add it again.

Then send `/chatid` or `/chatid@YourBotUsername` in the group.

Copy the Chat ID (often negative, e.g. `-1001234567890`) into `TELEGRAM_GROUP_CHAT_ID`.

## 3. Supabase secrets

In [Supabase Dashboard](https://supabase.com/dashboard) → Project → **Edge Functions** → **Secrets**, add:

| Secret | Example |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | From BotFather (alias: `BOT_TOKEN` also works) |
| `FUNCTION_SECRET` | **Recommended:** random string (e.g. `openssl rand -hex 16`) for webhook auth — **not** the bot token |
| `WEBHOOK_SECRET` | Alias for `FUNCTION_SECRET` |
| `TELEGRAM_GROUP_CHAT_ID` | From `/chatid` in the group |
| `PUBLIC_APP_URL` | `https://your-app.vercel.app` (for links in messages) |
| `CRON_SECRET` | Random long string (for automatic daily reminders) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set automatically for Edge Functions.

## 4. Deploy Edge Functions

```bash
supabase link --project-ref <your-project-ref>
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_GROUP_CHAT_ID=... PUBLIC_APP_URL=... CRON_SECRET=...
supabase functions deploy send-game-reminder
supabase functions deploy daily-game-reminders --no-verify-jwt
supabase functions deploy telegram-bot --no-verify-jwt
```

## 5. Register the webhook (required — without this, Start shows “An error occurred”)

### Option A — recommended (`FUNCTION_SECRET`)

1. Generate a secret: `openssl rand -hex 16`
2. Add to Supabase secrets: `FUNCTION_SECRET=<that value>` (same value everywhere)
3. Run (replace token and secret):

```bash
TELEGRAM_BOT_TOKEN=your_token \
FUNCTION_SECRET=your_random_secret \
node scripts/telegram-set-webhook.mjs
```

Or open in browser (one line):

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot&secret_token=<FUNCTION_SECRET>
```

### Option B — bot token in URL (simpler, less ideal)

**Do not** set `FUNCTION_SECRET` / `WEBHOOK_SECRET` unless you use the same value in the webhook URL.

The `secret` query param must be **URL-encoded** (token contains `:`):

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https%3A%2F%2F<PROJECT_REF>.supabase.co%2Ffunctions%2Fv1%2Ftelegram-bot%3Fsecret%3D<URL_ENCODED_BOT_TOKEN>
```

Easiest: run `TELEGRAM_BOT_TOKEN=xxx node scripts/telegram-set-webhook.mjs` (encodes automatically).

### Verify

```
https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Look at `url`, `last_error_message`, and `pending_update_count`. Then open the bot in Telegram and tap **Start** again.

Quick health check (no Telegram): open in browser:

```
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot
```

If `bot_token_set` is `false`, add `TELEGRAM_BOT_TOKEN` in Edge Function secrets and redeploy.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| **“An error occurred”** when pressing Start | Webhook missing or wrong secret → step 5; run `getWebhookInfo` and check `last_error_message` |
| `FUNCTION_SECRET` set but webhook uses bot token only | Add same `FUNCTION_SECRET` via `secret_token` in setWebhook, or remove `FUNCTION_SECRET` from Supabase |
| Nothing happens in group | **Private chat** + `/chatid`, or `/chatid@BotName` in group |
| `send-game-reminder` 503 | Set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_GROUP_CHAT_ID` secrets |
| Health check `bot_token_set: false` | Add `TELEGRAM_BOT_TOKEN` in Edge Function secrets |

## 6. Use in the admin panel

On **Game detail** → **«Напоминание в группу»** sends a Russian reminder to the group:

- Title: «Завтра игра»
- Date, time, venue, map link
- Full player list + public view link

Best practice: click **the day before** the game (the message always says «завтра»).

## 7. Automatic reminders (optional)

Function `daily-game-reminders` sends reminders for **planned** games whose `game_date` is **tomorrow** (timezone `Asia/Bishkek`) and have not been sent yet.

Schedule in Supabase Dashboard → **Integrations** → **Cron** (or `pg_cron`):

- **Schedule:** `0 9 * * *` (09:00 UTC daily — adjust to your timezone)
- **HTTP POST** to:
  `https://<PROJECT_REF>.supabase.co/functions/v1/daily-game-reminders`
- **Header:** `x-cron-secret: <your CRON_SECRET>`
- **Body:** `{}`

## Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `telegram-bot` | Webhook secret | `/start`, `/chatid` |
| `send-game-reminder` | User JWT | Manual send from admin UI |
| `daily-game-reminders` | `x-cron-secret` | Automatic day-before send |
