import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, QrCode } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Link as HeroLink,
  Table,
} from "@/components/ui/hero";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  GameStatusChip,
  ParticipantStatusChip,
  PaymentStatusChip,
} from "@/components/common/StatusChips";
import { PositionChips } from "@/components/players/PositionChips";
import { AppCheckbox } from "@/components/ui/AppCheckbox";
import { AppSelect } from "@/components/ui/AppSelect";
import { AddParticipantsModal } from "@/components/games/AddParticipantsModal";
import { TelegramMessageModal } from "@/components/games/TelegramMessageModal";
import { gameParticipantsService, gamesService } from "@/services/gamesService";
import { playersService } from "@/services/playersService";
import { telegramService } from "@/services/telegramService";
import { formatDateRu, formatMinutesRu, formatTimeRange } from "@/lib/date";
import { getPublicGameUrl } from "@/lib/publicGameUrl";
import {
  calculateParticipantPayments,
  defaultBillableForStatus,
  formatAmount,
  hoursStringToMinutes,
  minutesToHoursString,
  type ParticipantPayment,
} from "@/lib/payments";
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

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [activePlayers, setActivePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [reminderSending, setReminderSending] = useState<
    "text" | "image" | null
  >(null);
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

  const breakdown = useMemo(
    () => (game ? calculateParticipantPayments(game) : null),
    [game],
  );

  const paymentsByParticipantId = useMemo(() => {
    const map = new Map<string, ParticipantPayment>();
    breakdown?.participants.forEach((row) => map.set(row.participant_id, row));
    return map;
  }, [breakdown]);

  const currency = game?.venue?.currency ?? "KGS";

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
    // Status change also adjusts is_billable based on sensible defaults.
    const is_billable = defaultBillableForStatus(status);
    void patchParticipant(
      p.id,
      { status, is_billable },
      { status, is_billable },
    );
  }

  // function handleAttendedToggle(p: ParticipantWithPlayer, attended: boolean) {
  //   const status: ParticipantStatus = attended
  //     ? "attended"
  //     : p.status === "attended"
  //       ? "confirmed"
  //       : p.status;
  //   const is_billable = defaultBillableForStatus(status);
  //   void patchParticipant(
  //     p.id,
  //     { status, is_billable },
  //     { status, is_billable },
  //   );
  // }

  // function handleAbsentToggle(p: ParticipantWithPlayer, absent: boolean) {
  //   const status: ParticipantStatus = absent
  //     ? "absent"
  //     : p.status === "absent"
  //       ? "confirmed"
  //       : p.status;
  //   const is_billable = defaultBillableForStatus(status);
  //   void patchParticipant(
  //     p.id,
  //     { status, is_billable },
  //     { status, is_billable },
  //   );
  // }

  function handleBillableToggle(p: ParticipantWithPlayer, value: boolean) {
    void patchParticipant(p.id, { is_billable: value }, { is_billable: value });
  }

  function handlePlayedHoursBlur(p: ParticipantWithPlayer, rawValue: string) {
    const minutes = hoursStringToMinutes(rawValue);
    if (minutes === p.played_minutes) return;
    void patchParticipant(p.id, { played_minutes: minutes });
  }

  function handlePlayedResetToFull(p: ParticipantWithPlayer) {
    if (!breakdown?.game_duration_minutes) return;
    const minutes = breakdown.game_duration_minutes;
    void patchParticipant(
      p.id,
      { played_minutes: minutes },
      { played_minutes: minutes },
    );
  }

  function handlePaidToggle(p: ParticipantWithPlayer, paid: boolean) {
    const payload: GameParticipantUpdate = { has_paid: paid };
    // When marking as paid and amount is empty, default to the calculated owed amount.
    if (paid && p.paid_amount == null) {
      const calc = paymentsByParticipantId.get(p.id);
      if (calc && calc.owed_amount > 0) {
        payload.paid_amount = calc.owed_amount;
      }
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
    const trimmed = rawValue.trim().replace(",", ".");
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

  async function handleAddPlayers(playerIds: string[]) {
    if (!id) return;
    await gameParticipantsService.addMany(id, playerIds, "invited");
    await refresh();
  }

  async function handleRemove(p: ParticipantWithPlayer) {
    await gameParticipantsService.remove(p.id);
    await refresh();
  }

  async function handleSendTelegramReminder(withImage: boolean) {
    if (!game) return;
    setReminderSending(withImage ? "image" : "text");
    setError(null);
    try {
      await telegramService.sendGameReminder(game.id, withImage);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить напоминание",
      );
    } finally {
      setReminderSending(null);
    }
  }

  if (loading) return <LoadingState />;
  if (!game || !breakdown) {
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
            <Button
              variant="secondary"
              onPress={async () => {
                if (!game) return;
                try {
                  await navigator.clipboard.writeText(
                    getPublicGameUrl(game.id),
                  );
                  setLinkCopied(true);
                  window.setTimeout(() => setLinkCopied(false), 1500);
                } catch {
                  // ignore
                }
              }}
            >
              {linkCopied ? "Ссылка скопирована ✓" : "Ссылка для игроков"}
            </Button>
            {/* <Button variant="secondary" onPress={() => setTelegramOpen(true)}>
              Сообщение в Telegram
            </Button> */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  isPending={reminderSending !== null}
                  isDisabled={game.status === "cancelled"}
                >
                  Напоминание
                  <ChevronDown className="size-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => handleSendTelegramReminder(false)}
                >
                  Без QR
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleSendTelegramReminder(true)}
                >
                  <QrCode />С QR
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      {game.telegram_reminder_sent_at && (
        <div className="mb-3 rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-muted">
          Напоминание в Telegram отправлено:{" "}
          {new Date(game.telegram_reminder_sent_at).toLocaleString("ru-RU")}
        </div>
      )}

      {/* Two consolidated cards: game info + finance */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <Card.Content>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Об игре
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <DetailRow label="Статус">
                <GameStatusChip status={game.status} />
              </DetailRow>
              <DetailRow label="Длительность">
                {formatMinutesRu(breakdown.game_duration_minutes)}
                {game.max_players != null && (
                  <span className="text-muted"> · лимит {game.max_players}</span>
                )}
              </DetailRow>
              <DetailRow label="Площадка" className="sm:col-span-2">
                {game.venue?.name ?? "-"}
                {game.venue?.address && (
                  <span className="block text-xs text-muted">
                    {game.venue.address}
                  </span>
                )}
                {game.venue?.map_url && (
                  <HeroLink
                    href={game.venue.map_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 text-xs"
                  >
                    На карте
                    <HeroLink.Icon />
                  </HeroLink>
                )}
              </DetailRow>
            </dl>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Финансы
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <StatItem
                label="Общая стоимость"
                value={
                  game.total_cost != null
                    ? `${formatAmount(game.total_cost)} ${currency}`
                    : "-"
                }
                hint={
                  game.cost_source === "venue_auto" && game.total_cost != null
                    ? "Авто из цены площадки"
                    : undefined
                }
              />
              <StatItem
                label="Игровое время"
                value={formatMinutesRu(breakdown.total_billable_minutes)}
              />
              <StatItem
                label="Оплачено"
                value={`${formatAmount(breakdown.collected)} ${currency}`}
                tone="success"
              />
              <StatItem
                label="Осталось собрать"
                value={
                  breakdown.remaining != null
                    ? `${formatAmount(breakdown.remaining)} ${currency}`
                    : "-"
                }
                tone={
                  breakdown.remaining != null && breakdown.remaining > 0
                    ? "warning"
                    : "default"
                }
              />
              <StatItem label="Оплатили" value={breakdown.paid_count} />
              <StatItem
                label="Не оплатили"
                value={breakdown.unpaid_count}
                tone={breakdown.unpaid_count > 0 ? "warning" : "default"}
              />
            </div>
          </Card.Content>
        </Card>
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
            <Table.Content aria-label="Участники" className="min-w-[1400px]">
              <Table.Header>
                <Table.Column isRowHeader>Игрок</Table.Column>
                <Table.Column>Позиции</Table.Column>
                <Table.Column>Статус</Table.Column>
                <Table.Column>Сыграл (ч)</Table.Column>
                <Table.Column>Учитывать</Table.Column>
                <Table.Column>Должен</Table.Column>
                <Table.Column>Оплатил</Table.Column>
                <Table.Column>Сумма</Table.Column>
                <Table.Column>Способ</Table.Column>
                <Table.Column>Остаток</Table.Column>
                <Table.Column>Оплата</Table.Column>
                <Table.Column>Действия</Table.Column>
              </Table.Header>
              <Table.Body>
                {game.participants.map((p) => {
                  const calc = paymentsByParticipantId.get(p.id);
                  return (
                    <Table.Row key={p.id}>
                      <Table.Cell>
                        <div className="font-medium">{p.player.full_name}</div>
                        <div className="text-xs text-muted">
                          <TelegramInline player={p.player} />
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <PositionChips
                          collapsed
                          positions={p.player.positions}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <div className="min-w-[150px]">
                          <AppSelect<ParticipantStatus>
                            ariaLabel="Статус"
                            value={p.status}
                            onChange={(v) => v && handleStatusChange(p, v)}
                            options={STATUS_OPTIONS}
                            variant="secondary"
                            renderValue={(v) =>
                              v ? <ParticipantStatusChip status={v} /> : null
                            }
                          />
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            inputMode="decimal"
                            aria-label="Сыграл часов"
                            className="w-20"
                            variant="secondary"
                            step="0.25"
                            min="0"
                            defaultValue={minutesToHoursString(
                              p.played_minutes,
                            )}
                            onBlur={(e) =>
                              handlePlayedHoursBlur(p, e.currentTarget.value)
                            }
                          />
                          {breakdown.game_duration_minutes != null && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => handlePlayedResetToFull(p)}
                              aria-label="Полное время игры"
                            >
                              ↻
                            </Button>
                          )}
                        </div>
                        {calc && calc.played_minutes_raw == null && (
                          <div className="mt-1 text-[10px] text-muted">
                            по умолчанию {formatMinutesRu(calc.played_minutes)}
                          </div>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <AppCheckbox
                          isSelected={p.is_billable}
                          onChange={(v) => handleBillableToggle(p, v)}
                          ariaLabel="Учитывать в оплате"
                        />
                      </Table.Cell>
                      <Table.Cell>
                        {calc?.is_billable && calc.owed_amount > 0
                          ? `${formatAmount(calc.owed_amount)} ${currency}`
                          : "-"}
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
                            placeholder="-"
                          />
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        {calc?.is_billable
                          ? `${formatAmount(calc.remaining_amount)} ${currency}`
                          : "-"}
                      </Table.Cell>
                      <Table.Cell>
                        {calc && (
                          <PaymentStatusChip status={calc.payment_status} />
                        )}
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
                  );
                })}
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

function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "success";
  hint?: string;
}

function StatItem({ label, value, tone = "default", hint }: StatItemProps) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : "text-foreground";
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-base font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-accent">{hint}</div>}
    </div>
  );
}

function TelegramInline({ player }: { player: Player }) {
  const url = telegramHref(player);
  const label = player.telegram_username || "";
  if (!url || !label) return <span>-</span>;
  return (
    <HeroLink href={url} target="_blank" rel="noreferrer noopener">
      {label}
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
