import { supabase } from "@/lib/supabase";

export interface SendReminderResult {
  ok: boolean;
  sent_at: string;
}

export const telegramService = {
  /** Send day-before style reminder to the configured Telegram group. */
  async sendGameReminder(gameId: string): Promise<SendReminderResult> {
    const { data, error } = await supabase.functions.invoke("send-game-reminder", {
      body: { game_id: gameId },
    });

    if (error) {
      throw new Error(error.message || "Не удалось отправить напоминание");
    }

    const payload = data as { error?: string; ok?: boolean; sent_at?: string };
    if (payload?.error) {
      throw new Error(payload.error);
    }
    if (!payload?.ok || !payload.sent_at) {
      throw new Error("Неожиданный ответ сервера");
    }

    return { ok: true, sent_at: payload.sent_at };
  },
};
