import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { Bot } from "npm:grammy@^1.34.0";

const CAPTION_MAX = 1024;

function trimEnv(name: string): string | undefined {
  const v = Deno.env.get(name)?.trim();
  return v || undefined;
}

/** Public or signed URL for the reminder image in Supabase Storage. */
export async function resolveReminderImageUrl(
  admin: SupabaseClient,
): Promise<string | null> {
  const direct = trimEnv("TELEGRAM_REMINDER_IMAGE_URL");
  if (direct) return direct;

  const bucket = trimEnv("TELEGRAM_REMINDER_IMAGE_BUCKET") ?? "Image";
  const objectPath = trimEnv("TELEGRAM_REMINDER_IMAGE_PATH");
  if (!objectPath) return null;

  const supabaseUrl = trimEnv("SUPABASE_URL")?.replace(/\/$/, "");
  if (!supabaseUrl) return null;

  if (trimEnv("TELEGRAM_REMINDER_IMAGE_SIGNED") === "true") {
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(objectPath, 3600);
    if (error) {
      console.error("reminder image signed url:", error);
      return null;
    }
    return data.signedUrl;
  }

  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const encodedBucket = encodeURIComponent(bucket);
  return `${supabaseUrl}/storage/v1/object/public/${encodedBucket}/${encodedPath}`;
}

export async function sendTelegramReminder(
  bot: Bot,
  chatId: string,
  text: string,
  imageUrl: string | null,
): Promise<void> {
  if (!imageUrl) {
    await bot.api.sendMessage(chatId, text, {
      link_preview_options: { is_disabled: true },
    });
    return;
  }

  if (text.length <= CAPTION_MAX) {
    await bot.api.sendPhoto(chatId, imageUrl, { caption: text });
    return;
  }

  const headline = text.split("\n").slice(0, 2).join("\n").slice(0, CAPTION_MAX);
  await bot.api.sendPhoto(chatId, imageUrl, { caption: headline });
  await bot.api.sendMessage(chatId, text, {
    link_preview_options: { is_disabled: true },
  });
}
