import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Bot, webhookCallback } from "npm:grammy@^1.34.0";

function trimEnv(name: string): string | undefined {
  const v = Deno.env.get(name)?.trim();
  return v || undefined;
}

/** TELEGRAM_BOT_TOKEN (our docs) or BOT_TOKEN (Supabase grammY example). */
function getBotToken(): string | undefined {
  return trimEnv("TELEGRAM_BOT_TOKEN") ?? trimEnv("BOT_TOKEN");
}

/** Optional random secret for webhook (recommended). Not the bot token. */
function getFunctionSecret(): string | undefined {
  return trimEnv("FUNCTION_SECRET") ?? trimEnv("WEBHOOK_SECRET");
}

const token = getBotToken();
const functionSecret = getFunctionSecret();

if (!token) {
  console.error(
    "telegram-bot: set TELEGRAM_BOT_TOKEN or BOT_TOKEN in Edge Function secrets",
  );
}

const bot = new Bot(token ?? "missing-token");

bot.catch((err) => {
  console.error("telegram-bot handler error:", err);
});

async function replyChatId(ctx: {
  chat?: { id?: number; type?: string };
  reply: (text: string) => Promise<unknown>;
}) {
  const id = ctx.chat?.id;
  if (id == null) {
    await ctx.reply("Не удалось определить chat id.");
    return;
  }
  const where =
    ctx.chat?.type === "private"
      ? "личного чата"
      : "этого чата (группы/канала)";
  await ctx.reply(
    `Chat ID (${where}):\n${id}\n\nСкопируйте число в Supabase Secret TELEGRAM_GROUP_CHAT_ID.`,
  );
}

bot.command("start", async (ctx) => {
  await ctx.reply(
    [
      "Привет! Я бот группы по волейболу.",
      "",
      "Команды:",
      "/chatid — показать ID этого чата (для TELEGRAM_GROUP_CHAT_ID в Supabase)",
      "",
      "В группе используйте /chatid@имя_бота, если бот не отвечает.",
    ].join("\n"),
  );
});

bot.command("chatid", replyChatId);
bot.hears(/^\/chatid(@\w+)?\s*$/i, replyChatId);

const handleUpdate = webhookCallback(bot, "std/http");

let botInitialized = false;
async function ensureBotInit() {
  if (!botInitialized && token) {
    await bot.init();
    botInitialized = true;
  }
}

function isWebhookAuthorized(req: Request): boolean {
  const headerSecret = req.headers
    .get("X-Telegram-Bot-Api-Secret-Token")
    ?.trim();
  if (functionSecret && headerSecret === functionSecret) {
    return true;
  }

  const querySecret = new URL(req.url).searchParams.get("secret")?.trim();
  if (!querySecret) return false;

  if (functionSecret && querySecret === functionSecret) return true;
  if (token && querySecret === token) return true;

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        ok: !!token,
        bot_token_set: !!token,
        function_secret_set: !!functionSecret,
        hint: functionSecret
          ? "Register webhook with secret_token header (see TELEGRAM_BOT.md)"
          : "Register webhook with ?secret=<BOT_TOKEN> URL-encoded, or set FUNCTION_SECRET",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!token) {
    return new Response("bot token not configured", { status: 503 });
  }

  if (!isWebhookAuthorized(req)) {
    console.warn(
      "telegram-bot: webhook auth failed (check FUNCTION_SECRET vs setWebhook URL)",
    );
    return new Response("unauthorized", { status: 401 });
  }

  try {
    await ensureBotInit();
    const res = await handleUpdate(req);
    console.log("telegram-bot: update handled", res.status);
    return res;
  } catch (err) {
    console.error("telegram-bot webhook:", err);
    return new Response("ok", { status: 200 });
  }
});
