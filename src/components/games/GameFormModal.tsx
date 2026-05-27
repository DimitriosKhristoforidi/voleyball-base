import { Button } from "@heroui/react";
import { useEffect, useState, type FormEvent } from "react";
import type { Game, GameInsert, GameStatus, Venue } from "@/types/domain";
import { GAME_STATUS_LABEL_RU, GAME_STATUSES } from "@/types/domain";
import { todayISO } from "@/lib/date";
import { AppModal } from "@/components/ui/AppModal";
import { AppInput, AppTextarea } from "@/components/ui/AppField";
import { AppSelect } from "@/components/ui/AppSelect";

interface GameFormModalProps {
  isOpen: boolean;
  initialValue: Game | null;
  venues: Venue[];
  onClose: () => void;
  onSubmit: (payload: GameInsert) => Promise<void>;
}

interface FormState {
  title: string;
  venue_id: string;
  game_date: string;
  start_time: string;
  end_time: string;
  price_per_player: string;
  max_players: string;
  status: GameStatus;
  notes: string;
}

const emptyState = (): FormState => ({
  title: "",
  venue_id: "",
  game_date: todayISO(),
  start_time: "20:00",
  end_time: "",
  price_per_player: "",
  max_players: "",
  status: "planned",
  notes: "",
});

function toFormState(game: Game | null): FormState {
  if (!game) return emptyState();
  return {
    title: game.title ?? "",
    venue_id: game.venue_id ?? "",
    game_date: game.game_date,
    start_time: game.start_time.slice(0, 5),
    end_time: game.end_time ? game.end_time.slice(0, 5) : "",
    price_per_player:
      game.price_per_player != null ? String(game.price_per_player) : "",
    max_players: game.max_players != null ? String(game.max_players) : "",
    status: game.status,
    notes: game.notes ?? "",
  };
}

export function GameFormModal({
  isOpen,
  initialValue,
  venues,
  onClose,
  onSubmit,
}: GameFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyState);
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
    setLoading(true);
    setError(null);
    try {
      const payload: GameInsert = {
        title: emptyToNull(form.title),
        venue_id: form.venue_id || null,
        game_date: form.game_date,
        start_time: form.start_time,
        end_time: form.end_time ? form.end_time : null,
        price_per_player: parseNumber(form.price_per_player),
        max_players: parseInt(form.max_players, 10) || null,
        status: form.status,
        notes: emptyToNull(form.notes),
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
      title={initialValue ? "Редактировать игру" : "Новая игра"}
      footer={
        <>
          <Button variant="secondary" onPress={onClose} isDisabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            isPending={loading}
            onPress={() =>
              (document.getElementById("game-form") as HTMLFormElement)?.requestSubmit()
            }
          >
            Сохранить
          </Button>
        </>
      }
    >
      <form
        id="game-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <AppInput
          label="Название"
          placeholder="Например, Субботний волейбол"
          value={form.title}
          onChange={(v) => setForm((s) => ({ ...s, title: v }))}
        />
        <AppSelect
          label="Площадка"
          value={form.venue_id || null}
          onChange={(v) => setForm((s) => ({ ...s, venue_id: v ?? "" }))}
          options={venues.map((v) => ({ id: v.id, label: v.name }))}
          placeholder="Выберите площадку"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <AppInput
            type="date"
            label="Дата"
            value={form.game_date}
            onChange={(v) => setForm((s) => ({ ...s, game_date: v }))}
            isRequired
          />
          <AppInput
            type="time"
            label="Начало"
            value={form.start_time}
            onChange={(v) => setForm((s) => ({ ...s, start_time: v }))}
            isRequired
          />
          <AppInput
            type="time"
            label="Окончание"
            value={form.end_time}
            onChange={(v) => setForm((s) => ({ ...s, end_time: v }))}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <AppInput
            type="number"
            inputMode="decimal"
            label="Цена с человека"
            value={form.price_per_player}
            onChange={(v) => setForm((s) => ({ ...s, price_per_player: v }))}
          />
          <AppInput
            type="number"
            inputMode="numeric"
            label="Лимит игроков"
            value={form.max_players}
            onChange={(v) => setForm((s) => ({ ...s, max_players: v }))}
          />
          <AppSelect<GameStatus>
            label="Статус"
            value={form.status}
            onChange={(v) =>
              setForm((s) => ({ ...s, status: v ?? "planned" }))
            }
            options={GAME_STATUSES.map((status) => ({
              id: status,
              label: GAME_STATUS_LABEL_RU[status],
            }))}
          />
        </div>
        <AppTextarea
          label="Заметки"
          value={form.notes}
          onChange={(v) => setForm((s) => ({ ...s, notes: v }))}
          rows={2}
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

function parseNumber(value: string): number | null {
  const v = value.trim();
  if (v.length === 0) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
