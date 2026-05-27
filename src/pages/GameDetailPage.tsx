import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Chip,
  Input,
  Link as HeroLink,
  Table,
} from "@heroui/react";

import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  GameStatusChip,
  ParticipantStatusChip,
} from "@/components/common/StatusChips";
import { AppCheckbox } from "@/components/ui/AppCheckbox";
import { AppSelect } from "@/components/ui/AppSelect";
import { AddParticipantsModal } from "@/components/games/AddParticipantsModal";
import { TelegramMessageModal } from "@/components/games/TelegramMessageModal";
import {
  gameParticipantsService,
  gamesService,
} from "@/services/gamesService";
import { playersService } from "@/services/playersService";
import { formatDateRu, formatTimeRange } from "@/lib/date";
import {
  PARTICIPANT_STATUS_LABEL_RU,
  PARTICIPANT_STATUSES,
  PAYMENT_METHOD_LABEL_RU,
  PAYMENT_METHODS,
  type GameDetail,
  type GameParticipantUpdate,
  type ParticipantStatus,
  type ParticipantWithPlayer,
  type PaymentMethod,
  type Player,
} from "@/types/domain";

const STATUS_OPTIONS = PARTICIPANT_STATUSES.map((s) => ({
  id: s,
  label: PARTICIPANT_STATUS_LABEL_RU[s],
}));

const PAYMENT_OPTIONS = PAYMENT_METHODS.map((m) => ({
  id: m,
  label: PAYMENT_METHOD_LABEL_RU[m],
}));

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [activePlayers, setActivePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [removeTarget, setRemoveTarget] =
    useState<ParticipantWithPlayer | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, players] = await Promise.all([
        gamesService.getDetail(id),
        playersService.list({ onlyActive: true }),
      ]);
      if (!detail) {
        setError("Игра не найдена");
        setGame(null);
      } else {
        setGame(detail);
      }
      setActivePlayers(players);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const existingPlayerIds = useMemo(() => {
    return new Set((game?.participants ?? []).map((p) => p.player_id));
  }, [game]);

  const totals = useMemo(() => computeTotals(game), [game]);

  async function patchParticipant(
    pid: string,
    payload: GameParticipantUpdate,
    optimistic?: Partial<ParticipantWithPlayer>,
  ) {
    if (optimistic && game) {
      setGame({
        ...game,
        participants: game.participants.map((p) =>
          p.id === pid ? { ...p, ...optimistic } : p,
        ),
      });
    }
    try {
      await gameParticipantsService.update(pid, payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления");
    }
    await refresh();
  }

  function handleStatusChange(
    p: ParticipantWithPlayer,
    status: ParticipantStatus,
  ) {
    void patchParticipant(p.id, { status }, { status });
  }

  function handleAttendedToggle(p: ParticipantWithPlayer, attended: boolean) {
    const status: ParticipantStatus = attended
      ? "attended"
      : p.status === "attended"
        ? "confirmed"
        : p.status;
    void patchParticipant(p.id, { status }, { status });
  }

  function handleAbsentToggle(p: ParticipantWithPlayer, absent: boolean) {
    const status: ParticipantStatus = absent
      ? "absent"
      : p.status === "absent"
        ? "confirmed"
        : p.status;
    void patchParticipant(p.id, { status }, { status });
  }

  function handlePaidToggle(p: ParticipantWithPlayer, paid: boolean) {
    const payload: GameParticipantUpdate = { has_paid: paid };
    if (paid && p.paid_amount == null && game?.price_per_player != null) {
      payload.paid_amount = game.price_per_player;
    }
    if (!paid) {
      payload.paid_amount = null;
      payload.payment_method = null;
    }
    void patchParticipant(p.id, payload, {
      has_paid: paid,
      paid_amount: payload.paid_amount ?? p.paid_amount,
      payment_method: paid ? p.payment_method : null,
    });
  }

  function handlePaidAmountBlur(p: ParticipantWithPlayer, rawValue: string) {
    const trimmed = rawValue.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value != null && !Number.isFinite(value)) return;
    void patchParticipant(p.id, { paid_amount: value });
  }

  function handlePaymentMethodChange(
    p: ParticipantWithPlayer,
    method: PaymentMethod | null,
  ) {
    void patchParticipant(
      p.id,
      { payment_method: method },
      { payment_method: method },
    );
  }

  function handleNoteBlur(p: ParticipantWithPlayer, note: string) {
    const value = note.trim() === "" ? null : note.trim();
    void patchParticipant(p.id, { payment_note: value });
  }

  async function handleAddPlayers(playerIds: string[]) {
    if (!id) return;
    await gameParticipantsService.addMany(id, playerIds, "invited");
    await refresh();
  }

  async function handleRemove(p: ParticipantWithPlayer) {
    await gameParticipantsService.remove(p.id);
    await refresh();
  }

  if (loading) return <LoadingState />;
  if (!game) {
    return (
      <EmptyState
        title="Игра не найдена"
        description={error ?? undefined}
        action={
          <Button onPress={() => navigate("/games")}>К списку игр</Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={game.title?.trim() || "Игра"}
        description={`${formatDateRu(game.game_date)} · ${formatTimeRange(
          game.start_time,
          game.end_time,
        )}`}
        actions={
          <>
            <Button variant="secondary" onPress={() => navigate("/games")}>
              Назад
            </Button>
            <Button variant="secondary" onPress={() => setTelegramOpen(true)}>
              Сообщение в Telegram
            </Button>
            <Button variant="primary" onPress={() => setAddOpen(true)}>
              Добавить участников
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Статус">
          <GameStatusChip status={game.status} />
        </InfoCard>
        <InfoCard label="Площадка">
          <div className="text-sm">
            {game.venue?.name ?? "—"}
            {game.venue?.address && (
              <div className="text-xs text-muted">{game.venue.address}</div>
            )}
          </div>
          {game.venue?.map_url && (
            <HeroLink
              href={game.venue.map_url}
              target="_blank"
              rel="noreferrer noopener"
            >
              На карте
              <HeroLink.Icon />
            </HeroLink>
          )}
        </InfoCard>
        <InfoCard label="Цена с человека">
          <div className="text-sm">
            {game.price_per_player != null
              ? `${formatAmount(game.price_per_player)} сом`
              : "—"}
          </div>
          {game.max_players && (
            <div className="text-xs text-muted">Лимит: {game.max_players}</div>
          )}
        </InfoCard>
        <InfoCard label="Итоги">
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip size="sm" variant="soft" color="accent">
              Подтв.: {totals.confirmed}
            </Chip>
            <Chip size="sm" variant="soft" color="success">
              Пришли: {totals.attended}
            </Chip>
            <Chip size="sm" variant="soft" color="success">
              Оплат.: {totals.paid}
            </Chip>
            <Chip size="sm" variant="soft" color="warning">
              Не опл.: {totals.unpaid}
            </Chip>
          </div>
          <div className="mt-1 text-xs text-muted">
            Собрано: {formatAmount(totals.collected)} сом
            {totals.expected != null && (
              <> из {formatAmount(totals.expected)} сом</>
            )}
          </div>
        </InfoCard>
      </div>

      {game.status === "cancelled" && (
        <div className="mb-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          Игра отменена.
        </div>
      )}

      {game.participants.length === 0 ? (
        <EmptyState
          title="Участников пока нет"
          description="Добавьте игроков из списка"
          icon="👥"
          action={
            <Button variant="primary" onPress={() => setAddOpen(true)}>
              Добавить участников
            </Button>
          }
        />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Участники"
              className="min-w-[1200px]"
            >
              <Table.Header>
                <Table.Column isRowHeader>Игрок</Table.Column>
                <Table.Column>Telegram</Table.Column>
                <Table.Column>Статус</Table.Column>
                <Table.Column>Пришёл</Table.Column>
                <Table.Column>Не пришёл</Table.Column>
                <Table.Column>Оплатил</Table.Column>
                <Table.Column>Сумма</Table.Column>
                <Table.Column>Способ</Table.Column>
                <Table.Column>Заметка</Table.Column>
                <Table.Column>Действия</Table.Column>
              </Table.Header>
              <Table.Body>
                {game.participants.map((p) => (
                  <Table.Row key={p.id}>
                    <Table.Cell>
                      <div className="font-medium">{p.player.full_name}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <TelegramCell player={p.player} />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="min-w-[150px]">
                        <AppSelect<ParticipantStatus>
                          ariaLabel="Статус"
                          value={p.status}
                          onChange={(v) =>
                            v && handleStatusChange(p, v)
                          }
                          options={STATUS_OPTIONS}
                          variant="secondary"
                          renderValue={(v) =>
                            v ? <ParticipantStatusChip status={v} /> : null
                          }
                        />
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <AppCheckbox
                        isSelected={p.status === "attended"}
                        onChange={(v) => handleAttendedToggle(p, v)}
                        ariaLabel="Пришёл"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <AppCheckbox
                        isSelected={p.status === "absent"}
                        onChange={(v) => handleAbsentToggle(p, v)}
                        ariaLabel="Не пришёл"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <AppCheckbox
                        isSelected={p.has_paid}
                        onChange={(v) => handlePaidToggle(p, v)}
                        ariaLabel="Оплатил"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="number"
                        inputMode="decimal"
                        aria-label="Сумма"
                        className="w-24"
                        variant="secondary"
                        defaultValue={
                          p.paid_amount != null ? String(p.paid_amount) : ""
                        }
                        onBlur={(e) =>
                          handlePaidAmountBlur(p, e.currentTarget.value)
                        }
                        disabled={!p.has_paid}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="min-w-[140px]">
                        <AppSelect<PaymentMethod>
                          ariaLabel="Способ оплаты"
                          value={p.payment_method}
                          onChange={(v) => handlePaymentMethodChange(p, v)}
                          options={PAYMENT_OPTIONS}
                          isDisabled={!p.has_paid}
                          variant="secondary"
                          placeholder="—"
                        />
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        aria-label="Заметка по оплате"
                        className="min-w-[140px]"
                        variant="secondary"
                        defaultValue={p.payment_note ?? ""}
                        onBlur={(e) =>
                          handleNoteBlur(p, e.currentTarget.value)
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="danger-soft"
                          onPress={() => setRemoveTarget(p)}
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

      <AddParticipantsModal
        isOpen={addOpen}
        allActivePlayers={activePlayers}
        existingPlayerIds={existingPlayerIds}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddPlayers}
      />

      <TelegramMessageModal
        isOpen={telegramOpen}
        game={game}
        onClose={() => setTelegramOpen(false)}
      />

      <ConfirmDialog
        isOpen={removeTarget != null}
        title="Убрать участника из игры?"
        description={removeTarget?.player.full_name}
        destructive
        confirmLabel="Убрать"
        onConfirm={async () => {
          if (removeTarget) await handleRemove(removeTarget);
        }}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
}

function InfoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="default">
      <Card.Content className="gap-1">
        <div className="text-xs uppercase tracking-wide text-muted">
          {label}
        </div>
        {children}
      </Card.Content>
    </Card>
  );
}

interface Totals {
  confirmed: number;
  attended: number;
  paid: number;
  unpaid: number;
  collected: number;
  expected: number | null;
}

function computeTotals(game: GameDetail | null): Totals {
  const t: Totals = {
    confirmed: 0,
    attended: 0,
    paid: 0,
    unpaid: 0,
    collected: 0,
    expected: null,
  };
  if (!game) return t;
  for (const p of game.participants) {
    if (p.status === "confirmed") t.confirmed++;
    if (p.status === "attended") {
      t.attended++;
      t.confirmed++;
    }
    if (p.has_paid) {
      t.paid++;
      t.collected += Number(p.paid_amount ?? 0);
    } else if (p.status === "confirmed" || p.status === "attended") {
      t.unpaid++;
    }
  }
  if (game.price_per_player != null) {
    t.expected = game.price_per_player * t.confirmed;
  }
  return t;
}

function TelegramCell({ player }: { player: Player }) {
  const url = telegramHref(player);
  const label = player.telegram_username || "—";
  if (!url) return <span>{label}</span>;
  return (
    <HeroLink href={url} target="_blank" rel="noreferrer noopener">
      {label || "Открыть"}
      <HeroLink.Icon />
    </HeroLink>
  );
}

function telegramHref(player: Player): string | null {
  if (player.telegram_url) return player.telegram_url;
  if (player.telegram_username) {
    const h = player.telegram_username.replace(/^@/, "");
    if (h.length === 0) return null;
    return `https://t.me/${h}`;
  }
  return null;
}

function formatAmount(amount: number): string {
  const fixed = amount.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}
