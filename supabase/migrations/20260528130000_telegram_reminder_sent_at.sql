ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS telegram_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.games.telegram_reminder_sent_at IS
  'When the day-before Telegram group reminder was last sent.';
