import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, QrCode, RotateCcw, Send } from "lucide-react";
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
import { TeamsBoard } from "@/components/games/TeamsBoard";
import { TelegramPreviewModal } from "@/components/games/TelegramPreviewModal";
import { gameParticipantsService, gamesService } from "@/services/gamesService";
import { playersService } from "@/services/playersService";
import { telegramService } from "@/services/telegramService";
import { formatDateRu, formatMinutesRu, formatTimeRange } from "@/lib/date";
import { getPublicGameUrl } from "@/lib/publicGameUrl";
import {
  buildReminderPreview,
  buildTeamsPreview,
} from "@/lib/telegramPreview";
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
  const [linkCopied, setLinkCopied] = useState(false);
  const [reminderSending, setReminderSending] = useState<
    "text" | "image" | null
  >(null);
  const [removeTarget, setRemoveTarget] =
    useState<ParticipantWithPlayer | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<
    Record<string, { message: string; retry: () => void }>
  >({});
  const [billableNotes, setBillableNotes] = useState<Record<string, string>>(
    {},
  );
  const [preview, setPreview] = useState<null | {
    title: string;
    text: string;
    run: () => Promise<void>;
  }>(null);
  const [teamsNotice, setTeamsNotice] = useState<string | null>(null);
  const [teamsSending, setTeamsSending] = useState(false);
  const loadedId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    const first = loadedId.current !== id;
    if (first) {
      setLoading(true);
      setError(null);
    }
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
        loadedId.current = id;
      }
      setActivePlayers(players);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      if (first) setLoading(false);
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
    setPendingIds((current) => new Set(current).add(pid));
    setRowErrors((current) => {
      if (!current[pid]) return current;
      const next = { ...current };
      delete next[pid];
      return next;
    });
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
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка обновления";
      setRowErrors((current) => ({
        ...current,
        [pid]: {
          message,
          retry: () => {
            void patchParticipant(pid, payload, optimistic);
          },
        },
      }));
      await refresh();
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(pid);
        return next;
      });
    }
  }

  function handleStatusChange(
    p: ParticipantWithPlayer,
    status: ParticipantStatus,
  ) {
    const is_billable = defaultBillableForStatus(status);
    if (is_billable !== p.is_billable) {
      setBillableNotes((current) => ({
        ...current,
        [p.id]: is_billable
          ? "Теперь учитывается в оплате"
          : "Теперь не учитывается",
      }));
    }
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
      setPreview(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить напоминание",
      );
    } finally {
      setReminderSending(null);
    }
  }

  async function handleSendTeams() {
    if (!game) return;
    setTeamsSending(true);
    setError(null);
    setTeamsNotice(null);
    try {
      await telegramService.sendGameTeams(game.id);
      setPreview(null);
      setTeamsNotice("Составы отправлены в Telegram");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить составы",
      );
    } finally {
      setTeamsSending(false);
    }
  }

  function openReminderPreview(withImage: boolean) {
    if (!game) return;
    setPreview({
      title: withImage ? "Напоминание с QR" : "Напоминание без QR",
      text: buildReminderPreview(game, withImage),
      run: () => handleSendTelegramReminder(withImage),
    });
  }

  function openTeamsPreview() {
    if (!game) return;
    setPreview({
      title: "Составы команд",
      text: buildTeamsPreview(game),
      run: handleSendTeams,
    });
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

  const canSendTeams = game.participants.some(
    (p) => p.team_id != null && game.teams.some((t) => t.id === p.team_id),
  );
  const due = breakdown.remaining;

  return (
    <div className="pb-24 lg:pb-0">
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
                  setError("Не удалось скопировать ссылку");
                }
              }}
            >
              {linkCopied ? "Ссылка скопирована" : "Ссылка для игроков"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="hidden min-h-11 lg:inline-flex"
                  isPending={reminderSending !== null}
                  isDisabled={game.status === "cancelled"}
                >
                  Напоминание
                  <ChevronDown className="size-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openReminderPreview(false)}>
                  Без QR
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openReminderPreview(true)}>
                  <QrCode />С QR
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="primary"
              className="hidden min-h-11 lg:inline-flex"
              onPress={() => setAddOpen(true)}
            >
              Добавить участников
            </Button>
          </>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
        >
          {error}
        </div>
      )}

      {teamsNotice && (
        <div
          role="status"
          className="mb-3 rounded-md bg-success-soft px-3 py-2 text-sm text-success-soft-foreground"
        >
          {teamsNotice}
        </div>
      )}

      {game.status === "cancelled" && (
        <div className="mb-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          Игра отменена.
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
            <div className="text-sm font-semibold">Об игре</div>
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
            <div className="text-sm font-semibold">Финансы</div>
            {due != null && due > 0 && (
              <div className="mt-1">
                <div className="text-3xl font-semibold tabular-nums tracking-tight text-warning">
                  {formatAmount(due)} {currency}
                </div>
                <div className="text-sm text-muted">Осталось собрать</div>
              </div>
            )}
            {due === 0 && (
              <div className="mt-1 text-sm font-medium text-success">
                Всё собрано
              </div>
            )}
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
              {!(due != null && due > 0) && (
                <StatItem
                  label="Осталось собрать"
                  value={
                    breakdown.remaining != null
                      ? `${formatAmount(breakdown.remaining)} ${currency}`
                      : "-"
                  }
                />
              )}
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

      <TeamsBoard
        gameId={game.id}
        teams={game.teams}
        participants={game.participants}
        onChanged={refresh}
        onSendTeams={openTeamsPreview}
        teamsSending={teamsSending}
      />

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
        <>
        <div className="flex flex-col gap-3 lg:hidden">
          {game.participants.map((p) => {
            const calc = paymentsByParticipantId.get(p.id);
            const pending = pendingIds.has(p.id);
            const rowError = rowErrors[p.id];
            const owed =
              calc?.is_billable && calc.owed_amount > 0
                ? `${formatAmount(calc.owed_amount)} ${currency}`
                : "—";
            return (
              <article
                key={p.id}
                aria-busy={pending}
                className={`rounded-xl border border-border bg-surface p-3 ${pending ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.player.full_name}</div>
                    <div className="text-sm text-muted">{teamLabel(game, p)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{owed}</div>
                    <div className="text-xs text-muted">должен</div>
                  </div>
                </div>
                <div className="mt-3">
                  <AppSelect<ParticipantStatus>
                    ariaLabel="Статус"
                    value={p.status}
                    onChange={(v) => v && handleStatusChange(p, v)}
                    options={STATUS_OPTIONS}
                    variant="secondary"
                    isDisabled={pending}
                    renderValue={(v) =>
                      v ? <ParticipantStatusChip status={v} /> : null
                    }
                  />
                </div>
                {billableNotes[p.id] && (
                  <p className="mt-1 text-sm text-muted">{billableNotes[p.id]}</p>
                )}
                <div className="mt-2 flex min-h-11 items-center justify-between gap-3">
                  <span className="text-sm">Оплатил</span>
                  <AppCheckbox
                    touch
                    isSelected={p.has_paid}
                    isDisabled={pending}
                    onChange={(v) => handlePaidToggle(p, v)}
                    ariaLabel="Оплатил"
                  />
                </div>
                {rowError && (
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm text-danger">
                    <span>{rowError.message}</span>
                    <Button size="sm" variant="secondary" className="min-h-11" onPress={rowError.retry}>
                      Повторить
                    </Button>
                  </div>
                )}
                <details className="mt-1">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted">
                    Часы, способ, убрать
                  </summary>
                  <div className="flex flex-col gap-3 pb-1">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      Сыграл, часы
                      <CommitField
                        value={minutesToHoursString(p.played_minutes)}
                        ariaLabel="Сыграл часов"
                        className="w-24"
                        step="0.25"
                        min="0"
                        disabled={pending}
                        onCommit={(raw) => handlePlayedHoursBlur(p, raw)}
                      />
                    </label>
                    <div className="flex min-h-11 items-center justify-between">
                      <span className="text-sm">Учитывать в оплате</span>
                      <AppCheckbox
                        touch
                        isSelected={p.is_billable}
                        isDisabled={pending}
                        onChange={(v) => handleBillableToggle(p, v)}
                        ariaLabel="Учитывать в оплате"
                      />
                    </div>
                    <AppSelect<PaymentMethod>
                      ariaLabel="Способ оплаты"
                      value={p.payment_method}
                      onChange={(v) => handlePaymentMethodChange(p, v)}
                      options={PAYMENT_OPTIONS}
                      isDisabled={!p.has_paid || pending}
                      variant="secondary"
                      placeholder="Способ оплаты"
                    />
                    <Button
                      variant="danger-soft"
                      className="min-h-11"
                      isDisabled={pending}
                      onPress={() => setRemoveTarget(p)}
                    >
                      Убрать
                    </Button>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
        <Table className="hidden lg:block">
          <Table.ScrollContainer>
            <Table.Content aria-label="Участники" className="min-w-[1400px]">
              <Table.Header>
                <Table.Column isRowHeader className="sticky left-0 z-20 bg-card normal-case tracking-normal">Игрок</Table.Column>
                <Table.Column className="normal-case tracking-normal">Команда</Table.Column>
                <Table.Column className="normal-case tracking-normal">Позиции</Table.Column>
                <Table.Column className="normal-case tracking-normal">Статус</Table.Column>
                <Table.Column className="normal-case tracking-normal">Сыграл, ч</Table.Column>
                <Table.Column className="normal-case tracking-normal">Учитывать</Table.Column>
                <Table.Column className="normal-case tracking-normal">Должен</Table.Column>
                <Table.Column className="normal-case tracking-normal">Оплатил</Table.Column>
                <Table.Column className="normal-case tracking-normal">Сумма</Table.Column>
                <Table.Column className="normal-case tracking-normal">Способ</Table.Column>
                <Table.Column className="normal-case tracking-normal">Остаток</Table.Column>
                <Table.Column className="normal-case tracking-normal">Оплата</Table.Column>
                <Table.Column className="normal-case tracking-normal">Действия</Table.Column>
              </Table.Header>
              <Table.Body>
                {game.participants.map((p) => {
                  const calc = paymentsByParticipantId.get(p.id);
                  const pending = pendingIds.has(p.id);
                  const rowError = rowErrors[p.id];
                  return (
                    <Table.Row key={p.id} aria-busy={pending} className={`group ${pending ? "opacity-60" : ""}`}>
                      <Table.Cell className="sticky left-0 z-10 bg-card group-hover:bg-surface-secondary">
                        <div className="font-medium">{p.player.full_name}</div>
                        <div className="text-xs text-muted">
                          <TelegramInline player={p.player} />
                        </div>
                        {billableNotes[p.id] && (
                          <div className="mt-1 text-xs text-muted">{billableNotes[p.id]}</div>
                        )}
                        {rowError && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-danger">
                            <span>{rowError.message}</span>
                            <Button size="sm" variant="ghost" onPress={rowError.retry}>
                              Повторить
                            </Button>
                          </div>
                        )}
                      </Table.Cell>
                      <Table.Cell>{teamLabel(game, p)}</Table.Cell>
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
                            isDisabled={pending}
                            renderValue={(v) =>
                              v ? <ParticipantStatusChip status={v} /> : null
                            }
                          />
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-1">
                          <CommitField
                            value={minutesToHoursString(p.played_minutes)}
                            ariaLabel="Сыграл часов"
                            className="w-24"
                            step="0.25"
                            min="0"
                            disabled={pending}
                            onCommit={(raw) => handlePlayedHoursBlur(p, raw)}
                          />
                          {breakdown.game_duration_minutes != null && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="size-11"
                              isDisabled={pending}
                              onPress={() => handlePlayedResetToFull(p)}
                              aria-label="Полное время игры"
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          )}
                        </div>
                        {calc && calc.played_minutes_raw == null && (
                          <div className="mt-1 text-xs text-muted">
                            по умолчанию {formatMinutesRu(calc.played_minutes)}
                          </div>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <AppCheckbox
                          touch
                          isSelected={p.is_billable}
                          isDisabled={pending}
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
                          touch
                          isSelected={p.has_paid}
                          isDisabled={pending}
                          onChange={(v) => handlePaidToggle(p, v)}
                          ariaLabel="Оплатил"
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <CommitField
                          value={p.paid_amount != null ? String(p.paid_amount) : ""}
                          ariaLabel="Сумма"
                          className="w-24"
                          disabled={!p.has_paid || pending}
                          onCommit={(raw) => handlePaidAmountBlur(p, raw)}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <div className="min-w-[140px]">
                          <AppSelect<PaymentMethod>
                            ariaLabel="Способ оплаты"
                            value={p.payment_method}
                            onChange={(v) => handlePaymentMethodChange(p, v)}
                            options={PAYMENT_OPTIONS}
                            isDisabled={!p.has_paid || pending}
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
                            className="min-h-11"
                            isDisabled={pending}
                            onPress={() => setRemoveTarget(p)}
                          >
                            Убрать
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
        </>
      )}

      <AddParticipantsModal
        isOpen={addOpen}
        allActivePlayers={activePlayers}
        existingPlayerIds={existingPlayerIds}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddPlayers}
      />

      <ConfirmDialog
        isOpen={removeTarget != null}
        title="Убрать участника из игры?"
        description={
          removeTarget
            ? `${removeTarget.player.full_name}. Отметка о приходе и оплата по этой игре тоже пропадут.`
            : undefined
        }
        destructive
        confirmLabel="Убрать"
        onConfirm={async () => {
          if (removeTarget) await handleRemove(removeTarget);
        }}
        onClose={() => setRemoveTarget(null)}
      />

      <TelegramPreviewModal
        isOpen={preview != null}
        title={preview?.title ?? "Telegram"}
        text={preview?.text ?? ""}
        pending={reminderSending !== null || teamsSending}
        onClose={() => setPreview(null)}
        onConfirm={() => {
          if (preview) void preview.run();
        }}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="min-h-11 flex-1"
                isPending={reminderSending !== null}
                isDisabled={game.status === "cancelled"}
              >
                Напоминание
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => openReminderPreview(false)}>
                Без QR
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openReminderPreview(true)}>
                С QR
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="secondary"
            className="min-h-11"
            isDisabled={game.status === "cancelled" || !canSendTeams}
            isPending={teamsSending}
            aria-label="Отправить составы в Telegram"
            onPress={openTeamsPreview}
          >
            <Send className="size-4" />
          </Button>
          <Button
            variant="primary"
            className="min-h-11 flex-1"
            onPress={() => setAddOpen(true)}
          >
            Участники
          </Button>
        </div>
      </div>
    </div>
  );
}

function teamLabel(game: GameDetail, participant: ParticipantWithPlayer): string {
  if (!participant.team_id) return "Без команды";
  return (
    game.teams.find((team) => team.id === participant.team_id)?.name ??
    "Без команды"
  );
}

function CommitField({
  value,
  onCommit,
  ariaLabel,
  className,
  disabled,
  step,
  min,
}: {
  value: string;
  onCommit: (raw: string) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  step?: string;
  min?: string;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  return (
    <Input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      className={`h-11 ${className ?? ""}`}
      variant="secondary"
      step={step}
      min={min}
      disabled={disabled}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        if (draft !== value) onCommit(draft);
      }}
    />
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
      <dt className="text-sm text-muted">{label}</dt>
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
      <div className="text-sm text-muted">{label}</div>
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
