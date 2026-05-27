import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Table } from "@heroui/react";

import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { GameStatusChip } from "@/components/common/StatusChips";
import { AppSelect } from "@/components/ui/AppSelect";
import { GameFormModal } from "@/components/games/GameFormModal";
import { gamesService } from "@/services/gamesService";
import { venuesService } from "@/services/venuesService";
import { formatDateShortRu, formatTimeRange } from "@/lib/date";
import {
  GAME_STATUS_LABEL_RU,
  GAME_STATUSES,
  type GameInsert,
  type GameStatus,
  type GameWithVenue,
  type Venue,
} from "@/types/domain";

type StatusFilter = GameStatus | "all";
type RangeFilter = "all" | "upcoming" | "past";

const RANGE_OPTIONS: { id: RangeFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "upcoming", label: "Предстоящие" },
  { id: "past", label: "Прошедшие" },
];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Все статусы" },
  ...GAME_STATUSES.map((s) => ({ id: s, label: GAME_STATUS_LABEL_RU[s] })),
];

export function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameWithVenue[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [range, setRange] = useState<RangeFilter>("upcoming");

  const [editing, setEditing] = useState<GameWithVenue | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<GameWithVenue | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, v] = await Promise.all([
        gamesService.list({ status, range }),
        venuesService.list(),
      ]);
      setGames(g);
      setVenues(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [status, range]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(game: GameWithVenue) {
    setEditing(game);
    setFormOpen(true);
  }

  async function handleSubmit(payload: GameInsert) {
    if (editing) {
      await gamesService.update(editing.id, payload);
    } else {
      await gamesService.create(payload);
    }
    await refresh();
  }

  async function handleDelete(game: GameWithVenue) {
    await gamesService.remove(game.id);
    await refresh();
  }

  return (
    <div>
      <PageHeader
        title="Игры"
        description="Создавайте игры и управляйте составами"
        actions={
          <Button variant="primary" onPress={openCreate}>
            Новая игра
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full md:max-w-[300px]">
          <AppSelect
            label="Период"
            value={range}
            onChange={(v) => v && setRange(v)}
            options={RANGE_OPTIONS}
          />
        </div>
        <div className="w-full md:max-w-[300px]">
          <AppSelect
            label="Статус"
            value={status}
            onChange={(v) => v && setStatus(v)}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : games.length === 0 ? (
        <EmptyState
          title="Игр пока нет"
          description="Создайте первую игру и добавьте участников"
          action={
            <Button variant="primary" onPress={openCreate}>
              Новая игра
            </Button>
          }
          icon="🏐"
        />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Игры" className="min-w-[800px]">
              <Table.Header>
                <Table.Column isRowHeader>Дата</Table.Column>
                <Table.Column>Время</Table.Column>
                <Table.Column>Название</Table.Column>
                <Table.Column>Площадка</Table.Column>
                <Table.Column>Цена</Table.Column>
                <Table.Column>Статус</Table.Column>
                <Table.Column>Действия</Table.Column>
              </Table.Header>
              <Table.Body>
                {games.map((g) => (
                  <Table.Row
                    key={g.id}
                    className={
                      g.status === "cancelled" ? "opacity-60" : undefined
                    }
                  >
                    <Table.Cell>{formatDateShortRu(g.game_date)}</Table.Cell>
                    <Table.Cell>
                      {formatTimeRange(g.start_time, g.end_time)}
                    </Table.Cell>
                    <Table.Cell>{g.title ?? "—"}</Table.Cell>
                    <Table.Cell>{g.venue?.name ?? "—"}</Table.Cell>
                    <Table.Cell>
                      {g.price_per_player != null
                        ? `${formatPrice(g.price_per_player)} сом`
                        : "—"}
                    </Table.Cell>
                    <Table.Cell>
                      <GameStatusChip status={g.status} />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => navigate(`/games/${g.id}`)}
                        >
                          Открыть
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => openEdit(g)}
                        >
                          Изменить
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onPress={() => setConfirmTarget(g)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <GameFormModal
        isOpen={formOpen}
        initialValue={editing}
        venues={venues}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={confirmTarget != null}
        title="Удалить игру?"
        description="Игра и все её участники будут удалены."
        destructive
        confirmLabel="Удалить"
        onConfirm={async () => {
          if (confirmTarget) await handleDelete(confirmTarget);
        }}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}

function formatPrice(price: number): string {
  const fixed = price.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}
