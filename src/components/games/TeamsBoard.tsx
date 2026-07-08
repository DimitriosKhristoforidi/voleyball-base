import { ArrowLeftRight, Plus, Send, Shuffle, Users, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { gameParticipantsService, teamsService } from "@/services/gamesService";
import { telegramService } from "@/services/telegramService";
import { computeAutoSplit } from "@/lib/teams";
import { cn } from "@/lib/utils";
import {
  nextTeamColor,
  nextTeamName,
  playerSkillTotal,
  type GameTeam,
  type ParticipantWithPlayer,
} from "@/types/domain";

interface TeamsBoardProps {
  gameId: string;
  teams: GameTeam[];
  participants: ParticipantWithPlayer[];
  onChanged: () => Promise<void> | void;
}

const TEAM_COLOR: Record<string, { dot: string; accent: string }> = {
  blue: { dot: "bg-blue-500", accent: "before:bg-blue-500" },
  red: { dot: "bg-red-500", accent: "before:bg-red-500" },
  emerald: { dot: "bg-emerald-500", accent: "before:bg-emerald-500" },
  amber: { dot: "bg-amber-500", accent: "before:bg-amber-500" },
  violet: { dot: "bg-violet-500", accent: "before:bg-violet-500" },
  rose: { dot: "bg-rose-500", accent: "before:bg-rose-500" },
  cyan: { dot: "bg-cyan-500", accent: "before:bg-cyan-500" },
  orange: { dot: "bg-orange-500", accent: "before:bg-orange-500" },
};

function colorOf(color: string) {
  return TEAM_COLOR[color] ?? TEAM_COLOR.blue;
}

export function TeamsBoard({
  gameId,
  teams,
  participants,
  onChanged,
}: TeamsBoardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const membersByTeam = useMemo(() => {
    const map = new Map<string, ParticipantWithPlayer[]>();
    for (const t of teams) map.set(t.id, []);
    const bench: ParticipantWithPlayer[] = [];
    for (const p of participants) {
      if (p.team_id && map.has(p.team_id)) map.get(p.team_id)!.push(p);
      else bench.push(p);
    }
    return { map, bench };
  }, [teams, participants]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  function addTeam() {
    void run(async () => {
      await teamsService.create({
        game_id: gameId,
        name: nextTeamName(teams.length),
        color: nextTeamColor(teams.length),
        sort_order: teams.length,
      });
    });
  }

  function removeTeam(id: string) {
    void run(() => teamsService.remove(id));
  }

  function move(participantId: string, teamId: string | null) {
    void run(() => gameParticipantsService.assignTeam(participantId, teamId));
  }

  function shuffle() {
    if (teams.length < 2) return;
    const assignments = computeAutoSplit(
      participants,
      teams.map((t) => t.id),
    );
    if (assignments.length === 0) return;
    void run(() => gameParticipantsService.assignTeamMany(assignments));
  }

  const assignedCount = teams.reduce(
    (n, t) => n + (membersByTeam.map.get(t.id)?.length ?? 0),
    0,
  );
  const canShuffle = teams.length >= 2 && participants.length > 0 && !busy;
  const canSendTeams = assignedCount > 0 && !busy && !sending;

  function sendTeams() {
    setSending(true);
    setError(null);
    setNotice(null);
    telegramService
      .sendGameTeams(gameId)
      .then(() => setNotice("Составы отправлены в Telegram"))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Не удалось отправить"),
      )
      .finally(() => setSending(false));
  }

  return (
    <section className="mb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Команды</h2>
          {teams.length > 0 && (
            <span className="text-sm text-muted">{teams.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            title="Отправить составы команд в Telegram-группу"
            startContent={<Send className="size-4" />}
            isDisabled={!canSendTeams}
            isPending={sending}
            onPress={sendTeams}
          >
            В Telegram
          </Button>
          <Button
            size="sm"
            variant="secondary"
            title="Разбить по силе игроков (или случайно, если навыки не заданы)"
            startContent={<Shuffle className="size-4" />}
            isDisabled={!canShuffle}
            onPress={shuffle}
          >
            Разбить
          </Button>
          <Button
            size="sm"
            variant="primary"
            startContent={<Plus className="size-4" />}
            isDisabled={busy}
            onPress={addTeam}
          >
            Команда
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success-soft-foreground">
          {notice}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-8 text-center">
          <p className="text-sm font-medium">Команд пока нет</p>
          <p className="mt-1 text-sm text-muted">
            Создайте команды и распределите игроков из состава игры.
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="primary"
            startContent={<Plus className="size-4" />}
            isDisabled={busy}
            onPress={addTeam}
          >
            Добавить команду
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team) => (
            <TeamColumn
              key={team.id}
              team={team}
              members={membersByTeam.map.get(team.id) ?? []}
              teams={teams}
              busy={busy}
              onMove={move}
              onRemove={() => removeTeam(team.id)}
            />
          ))}
          <BenchColumn
            members={membersByTeam.bench}
            teams={teams}
            busy={busy}
            onMove={move}
          />
        </div>
      )}
    </section>
  );
}

interface TeamColumnProps {
  team: GameTeam;
  members: ParticipantWithPlayer[];
  teams: GameTeam[];
  busy: boolean;
  onMove: (participantId: string, teamId: string | null) => void;
  onRemove: () => void;
}

function TeamColumn({
  team,
  members,
  teams,
  busy,
  onMove,
  onRemove,
}: TeamColumnProps) {
  const c = colorOf(team.color);
  const skillTotal = members.reduce(
    (acc, m) => acc + playerSkillTotal(m.player),
    0,
  );
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        c.accent,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 pl-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2.5 shrink-0 rounded-full", c.dot)} />
          <span className="truncate text-sm font-semibold">{team.name}</span>
          <span className="text-xs text-muted">{members.length}</span>
          {skillTotal > 0 && (
            <span
              className="rounded bg-surface-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted"
              title="Суммарная сила команды"
            >
              Σ{skillTotal}
            </span>
          )}
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={`Удалить ${team.name}`}
          isDisabled={busy}
          onPress={onRemove}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex min-h-16 flex-col gap-1 p-2 pl-3">
        {members.length === 0 ? (
          <p className="px-1 py-3 text-center text-xs text-muted">
            Нет игроков. Выберите команду в списке рядом с игроком.
          </p>
        ) : (
          members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              busy={busy}
              currentTeamId={team.id}
              teams={teams}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface BenchColumnProps {
  members: ParticipantWithPlayer[];
  teams: GameTeam[];
  busy: boolean;
  onMove: (participantId: string, teamId: string | null) => void;
}

function BenchColumn({ members, teams, busy, onMove }: BenchColumnProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-dashed border-border bg-surface-secondary/40">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Users className="size-4 text-muted" />
        <span className="truncate text-sm font-semibold text-muted">
          На скамейке
        </span>
        <span className="text-xs text-muted">{members.length}</span>
      </div>
      <div className="flex min-h-16 flex-col gap-1 p-2">
        {members.length === 0 ? (
          <p className="px-1 py-3 text-center text-xs text-muted">
            Все игроки распределены
          </p>
        ) : (
          members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              busy={busy}
              currentTeamId={null}
              teams={teams}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface MemberRowProps {
  member: ParticipantWithPlayer;
  busy: boolean;
  currentTeamId: string | null;
  teams: GameTeam[];
  onMove: (participantId: string, teamId: string | null) => void;
}

function MemberRow({
  member,
  busy,
  currentTeamId,
  teams,
  onMove,
}: MemberRowProps) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-md border border-border bg-background px-2 py-1.5">
      <span className="truncate text-sm">{member.player.full_name}</span>
      <MoveMenu
        label={member.player.full_name}
        currentTeamId={currentTeamId}
        teams={teams}
        disabled={busy}
        onMove={(teamId) => onMove(member.id, teamId)}
      />
    </div>
  );
}

interface MoveMenuProps {
  label: string;
  currentTeamId: string | null;
  teams: GameTeam[];
  disabled: boolean;
  onMove: (teamId: string | null) => void;
}

/**
 * Custom (non-Radix) dropdown that reliably opens on touch and in an installed
 * PWA. The menu is portaled to <body> with fixed positioning so the parent
 * column's `overflow-hidden` cannot clip it.
 */
function MoveMenu({
  label,
  currentTeamId,
  teams,
  disabled,
  onMove,
}: MoveMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const options = teams.filter((t) => t.id !== currentTeamId);
  const itemCount = options.length + (currentTeamId !== null ? 1 : 0);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuW = 192;
    const gap = 6;
    const estH = 34 + itemCount * 38 + 8;
    let left = rect.right - menuW;
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    const below = rect.bottom + gap;
    const top =
      below + estH > window.innerHeight - 8 && rect.top - gap - estH > 8
        ? rect.top - gap - estH
        : below;
    setPos({ top, left });
  }, [itemCount]);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  function select(teamId: string | null) {
    setOpen(false);
    onMove(teamId);
  }

  return (
    <>
      <Button
        ref={triggerRef}
        isIconOnly
        size="sm"
        variant="ghost"
        className="touch-manipulation"
        aria-label={`Переместить: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        isDisabled={disabled}
        onPress={() => setOpen((v) => !v)}
      >
        <ArrowLeftRight className="size-4" />
      </Button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 min-w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg animate-popover"
          >
            <div className="px-2.5 py-1.5 text-xs font-medium text-muted">
              Переместить в
            </div>
            {options.map((t) => (
              <MenuButton key={t.id} onSelect={() => select(t.id)}>
                <span
                  className={cn("size-2.5 rounded-full", colorOf(t.color).dot)}
                />
                {t.name}
              </MenuButton>
            ))}
            {currentTeamId !== null && (
              <>
                <div className="-mx-1 my-1 h-px bg-border" />
                <MenuButton onSelect={() => select(null)}>
                  <Users className="size-4" />
                  На скамейку
                </MenuButton>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuButton({
  onSelect,
  children,
}: {
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-accent-soft hover:text-accent-soft-foreground [&_svg]:size-4 [&_svg]:shrink-0"
    >
      {children}
    </button>
  );
}
