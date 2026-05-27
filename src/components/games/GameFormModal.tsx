import { Button } from "@heroui/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  CostSource,
  Game,
  GameInsert,
  GameStatus,
  Venue,
} from "@/types/domain";
import { GAME_STATUS_LABEL_RU, GAME_STATUSES } from "@/types/domain";
import { diffTimeMinutes, todayISO } from "@/lib/date";
import { computeAutoTotalCost, formatAmount } from "@/lib/payments";
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
  total_cost: string;
  /** Tracks whether total_cost was auto-derived from the venue or manually set. */
  cost_source: CostSource;
  max_players: number | null; // numeric input
  max_players_str: string;
  status: GameStatus;
  notes: string;
}

const emptyState = (): FormState => ({
  title: "",
  venue_id: "",
  game_date: todayISO(),
  start_time: "20:00",
  end_time: "",
  total_cost: "",
  cost_source: "manual",
  max_players: null,
  max_players_str: "",
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
    total_cost: game.total_cost != null ? String(game.total_cost) : "",
    cost_source: game.cost_source,
    max_players: game.max_players,
    max_players_str: game.max_players != null ? String(game.max_players) : "",
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

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === form.venue_id) ?? null,
    [venues, form.venue_id],
  );

  const durationMinutes = useMemo(
    () => diffTimeMinutes(form.start_time, form.end_time),
    [form.start_time, form.end_time],
  );

  const autoCost = useMemo(
    () => computeAutoTotalCost(selectedVenue?.hourly_price, durationMinutes),
    [selectedVenue?.hourly_price, durationMinutes],
  );

  /**
   * When the user hasn't manually overridden the cost yet (cost_source = "venue_auto"),
   * recalculate it whenever venue/start/end change.
   */
  useEffect(() => {
    if (form.cost_source !== "venue_auto") return;
    const next = autoCost != null ? String(autoCost) : "";
    if (next !== form.total_cost) {
      setForm((s) => ({ ...s, total_cost: next }));
    }
  }, [autoCost, form.cost_source, form.total_cost]);

  function handleVenueChange(venueId: string) {
    setForm((s) => {
      // If the user hasn't manually set a cost yet and the new venue has hourly_price,
      // switch the source to "venue_auto" so the auto-cost effect picks it up.
      const newVenue = venues.find((v) => v.id === venueId) ?? null;
      const hasManual = s.cost_source === "manual" && s.total_cost.trim() !== "";
      const next: FormState = { ...s, venue_id: venueId };
      if (!hasManual && newVenue?.hourly_price != null) {
        next.cost_source = "venue_auto";
      }
      return next;
    });
  }

  function handleTotalCostChange(value: string) {
    // Any manual edit flips cost_source to "manual" and protects the value
    // from being overwritten on subsequent venue/time changes.
    setForm((s) => ({ ...s, total_cost: value, cost_source: "manual" }));
  }

  function handleRecalculate() {
    if (autoCost == null) return;
    setForm((s) => ({
      ...s,
      total_cost: String(autoCost),
      cost_source: "venue_auto",
    }));
  }

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
        end_time: form.end_time || null,
        total_cost: parseNumber(form.total_cost),
        cost_source: form.cost_source,
        max_players: parseIntOrNull(form.max_players_str),
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

  const venueHourlyHint =
    selectedVenue?.hourly_price != null
      ? `Цена площадки: ${formatAmount(selectedVenue.hourly_price)} ${selectedVenue.currency}/час`
      : null;

  const autoHint =
    autoCost != null && form.cost_source === "venue_auto"
      ? `Стоимость рассчитана автоматически по цене площадки${
          selectedVenue?.hourly_price != null
            ? `: ${formatAmount(selectedVenue.hourly_price)} ${selectedVenue.currency}/час`
            : ""
        }`
      : null;

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
          onChange={(v) => handleVenueChange(v ?? "")}
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

        <div className="flex flex-col gap-1">
          <AppInput
            type="number"
            inputMode="decimal"
            label="Общая стоимость игры"
            placeholder="например, 3000"
            value={form.total_cost}
            onChange={handleTotalCostChange}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              Стоимость делится между игроками автоматически по сыгранному времени.
            </span>
            {autoCost != null && (
              <Button
                size="sm"
                variant="ghost"
                onPress={handleRecalculate}
                isDisabled={
                  form.cost_source === "venue_auto" &&
                  parseNumber(form.total_cost) === autoCost
                }
              >
                Пересчитать по цене площадки
              </Button>
            )}
          </div>
          {autoHint && (
            <div className="text-xs text-accent">{autoHint}</div>
          )}
          {!autoHint && venueHourlyHint && (
            <div className="text-xs text-muted">{venueHourlyHint}</div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <AppInput
            type="number"
            inputMode="numeric"
            label="Лимит игроков"
            value={form.max_players_str}
            onChange={(v) => setForm((s) => ({ ...s, max_players_str: v }))}
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
  const v = value.trim().replace(",", ".");
  if (v.length === 0) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseIntOrNull(value: string): number | null {
  const v = value.trim();
  if (v.length === 0) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
