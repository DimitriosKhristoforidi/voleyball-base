import { Button } from "@/components/ui/hero";
import { useEffect, useState, type FormEvent } from "react";
import {
  isPlayerPosition,
  type Player,
  type PlayerInsert,
  type PlayerPosition,
} from "@/types/domain";
import { AppModal } from "@/components/ui/AppModal";
import { AppInput, AppTextarea } from "@/components/ui/AppField";
import { AppSwitch } from "@/components/ui/AppSwitch";
import { PositionsField } from "@/components/ui/PositionsField";

interface PlayerFormModalProps {
  isOpen: boolean;
  initialValue: Player | null;
  onClose: () => void;
  onSubmit: (payload: PlayerInsert) => Promise<void>;
}

interface FormState {
  full_name: string;
  telegram_username: string;
  telegram_url: string;
  phone: string;
  notes: string;
  is_active: boolean;
  positions: PlayerPosition[];
}

const EMPTY: FormState = {
  full_name: "",
  telegram_username: "",
  telegram_url: "",
  phone: "",
  notes: "",
  is_active: true,
  positions: [],
};

function toFormState(player: Player | null): FormState {
  if (!player) return EMPTY;
  return {
    full_name: player.full_name,
    telegram_username: player.telegram_username ?? "",
    telegram_url: player.telegram_url ?? "",
    phone: player.phone ?? "",
    notes: player.notes ?? "",
    is_active: player.is_active,
    positions: (player.positions ?? []).filter(isPlayerPosition),
  };
}

export function PlayerFormModal({
  isOpen,
  initialValue,
  onClose,
  onSubmit,
}: PlayerFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(toFormState(initialValue));
      setError(null);
    }
  }, [isOpen, initialValue]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: PlayerInsert = {
        full_name: form.full_name.trim(),
        telegram_username: emptyToNull(form.telegram_username),
        telegram_url: emptyToNull(form.telegram_url),
        phone: emptyToNull(form.phone),
        notes: emptyToNull(form.notes),
        is_active: form.is_active,
        positions: form.positions.length > 0 ? form.positions : null,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      size="lg"
      title={initialValue ? "Редактировать игрока" : "Новый игрок"}
      footer={
        <>
          <Button variant="secondary" onPress={onClose} isDisabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            isPending={loading}
            onPress={() =>
              (document.getElementById("player-form") as HTMLFormElement)?.requestSubmit()
            }
          >
            Сохранить
          </Button>
        </>
      }
    >
      <form
        id="player-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <AppInput
          label="Имя"
          value={form.full_name}
          onChange={(v) => setForm((s) => ({ ...s, full_name: v }))}
          isRequired
          autoFocus
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <AppInput
            label="Telegram username"
            placeholder="@username"
            value={form.telegram_username}
            onChange={(v) => setForm((s) => ({ ...s, telegram_username: v }))}
          />
          <AppInput
            label="Telegram ссылка"
            placeholder="https://t.me/username"
            value={form.telegram_url}
            onChange={(v) => setForm((s) => ({ ...s, telegram_url: v }))}
          />
        </div>
        <AppInput
          label="Телефон"
          value={form.phone}
          onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
        />
        <PositionsField
          value={form.positions}
          onChange={(v) => setForm((s) => ({ ...s, positions: v }))}
        />
        <AppTextarea
          label="Заметки"
          value={form.notes}
          onChange={(v) => setForm((s) => ({ ...s, notes: v }))}
          rows={2}
        />
        <AppSwitch
          isSelected={form.is_active}
          onChange={(v) => setForm((s) => ({ ...s, is_active: v }))}
          label="Активный"
        />
        {error && <div className="text-sm text-danger">{error}</div>}
      </form>
    </AppModal>
  );
}

function emptyToNull(value: string): string | null {
  const v = value.trim();
  return v.length === 0 ? null : v;
}
