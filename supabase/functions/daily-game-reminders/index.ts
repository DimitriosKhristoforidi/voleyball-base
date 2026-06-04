import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Bot } from "npm:grammy@^1.34.0";
import {
  createAdminClient,
  fetchGamesDueForReminder,
} from "./_shared/game-data.ts";
import { buildReminderMessage } from "./_shared/telegram-message.ts";
import { handleOptions, jsonResponse } from "./_shared/cors.ts";

/**
 * Sends day-before reminders for all planned games tomorrow (Asia/Bishkek).
 * Invoke daily via Supabase Cron or an external scheduler.
 * Requires header: x-cron-secret: <CRON_SECRET>
 */
Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  try {
    const botToken =
      Deno.env.get("TELEGRAM_BOT_TOKEN") ?? Deno.env.get("BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_GROUP_CHAT_ID");
    const publicAppUrl = Deno.env.get("PUBLIC_APP_URL") ?? "";

    if (!botToken || !chatId) {
      return jsonResponse({ error: "Telegram bot not configured" }, 503);
    }

    const admin = createAdminClient();
    const games = await fetchGamesDueForReminder(admin);
    const bot = new Bot(botToken);

    const sent: string[] = [];
    const errors: { game_id: string; error: string }[] = [];

    for (const game of games) {
      try {
        const text = buildReminderMessage(game, publicAppUrl);
        await bot.api.sendMessage(chatId, text, {
          link_preview_options: { is_disabled: true },
        });
        const sentAt = new Date().toISOString();
        await admin
          .from("games")
          .update({ telegram_reminder_sent_at: sentAt })
          .eq("id", game.id);
        sent.push(game.id);
      } catch (e) {
        errors.push({
          game_id: game.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return jsonResponse({
      ok: true,
      sent_count: sent.length,
      sent_game_ids: sent,
      errors,
    });
  } catch (err) {
    console.error("daily-game-reminders:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
