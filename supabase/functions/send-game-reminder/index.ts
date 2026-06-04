import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Bot } from "npm:grammy@^1.34.0";
import { createAdminClient, fetchGameForTelegram } from "./_shared/game-data.ts";
import { buildReminderMessage } from "./_shared/telegram-message.ts";
import {
  resolveReminderImageUrl,
  sendTelegramReminder,
} from "./_shared/telegram-send.ts";
import { handleOptions, jsonResponse } from "./_shared/cors.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const gameId = body?.game_id as string | undefined;
    if (!gameId) {
      return jsonResponse({ error: "game_id is required" }, 400);
    }

    const botToken =
      Deno.env.get("TELEGRAM_BOT_TOKEN") ?? Deno.env.get("BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_GROUP_CHAT_ID");
    const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") ?? "";

    if (!botToken || !chatId) {
      return jsonResponse(
        {
          error:
            "Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_CHAT_ID secrets.",
        },
        503,
      );
    }

    const admin = createAdminClient();
    const game = await fetchGameForTelegram(admin, gameId);
    if (!game) {
      return jsonResponse({ error: "Game not found" }, 404);
    }

    if (game.status === "cancelled") {
      return jsonResponse({ error: "Cannot remind for a cancelled game" }, 400);
    }

    const text = buildReminderMessage(game, publicAppUrl);
    const imageUrl = await resolveReminderImageUrl(admin);
    const bot = new Bot(botToken);
    await sendTelegramReminder(bot, chatId, text, imageUrl);

    const sentAt = new Date().toISOString();
    const { error: updateError } = await admin
      .from("games")
      .update({ telegram_reminder_sent_at: sentAt })
      .eq("id", gameId);

    if (updateError) throw updateError;

    return jsonResponse({ ok: true, sent_at: sentAt });
  } catch (err) {
    console.error("send-game-reminder:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
