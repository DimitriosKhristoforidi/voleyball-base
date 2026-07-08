import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Star } from "lucide-react";
import { Button, Card, Chip, Link as HeroLink } from "@/components/ui/hero";

import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { PositionChips } from "@/components/players/PositionChips";
import { SkillRadar } from "@/components/players/SkillRadar";
import { PlayerFormModal } from "@/components/players/PlayerFormModal";
import { playersService } from "@/services/playersService";
import { cn } from "@/lib/utils";
import {
  PLAYER_SKILL_FIELDS,
  PLAYER_SKILL_LABEL_RU,
  PLAYER_SKILL_MAX,
  playerHasSkills,
  playerSkillAverage,
  type Player,
  type PlayerInsert,
} from "@/types/domain";

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await playersService.getById(id);
      if (!data) setError("Игрок не найден");
      setPlayer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSubmit(payload: PlayerInsert) {
    if (!player) return;
    await playersService.update(player.id, payload);
    await refresh();
  }

  if (loading) return <LoadingState />;
  if (!player) {
    return (
      <EmptyState
        title="Игрок не найден"
        description={error ?? undefined}
        action={
          <Button onPress={() => navigate("/players")}>К списку игроков</Button>
        }
      />
    );
  }

  const average = playerSkillAverage(player);
  const hasSkills = playerHasSkills(player);
  const telegram = telegramHref(player);

  return (
    <div>
      <PageHeader
        title={player.full_name}
        description={player.is_active ? "Активный игрок" : "Неактивный игрок"}
        actions={
          <>
            <Button variant="secondary" onPress={() => navigate("/players")}>
              Назад
            </Button>
            <Button
              variant="primary"
              startContent={<Pencil className="size-4" />}
              onPress={() => setEditOpen(true)}
            >
              Редактировать
            </Button>
          </>
        }
      />

      {error && (
        <div className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Skills / radar */}
        <Card className="lg:col-span-2">
          <Card.Content className="gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold uppercase tracking-wide text-muted">
                Навыки
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="size-4 text-amber-500" />
                <span className="text-lg font-semibold">
                  {average != null ? average.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-muted">/ {PLAYER_SKILL_MAX}</span>
              </div>
            </div>

            {hasSkills ? (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                <div className="flex justify-center">
                  <SkillRadar player={player} />
                </div>
                <div className="flex flex-col gap-2.5">
                  {PLAYER_SKILL_FIELDS.map((field) => (
                    <SkillBar
                      key={field}
                      label={PLAYER_SKILL_LABEL_RU[field]}
                      value={player[field]}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center">
                <p className="text-sm font-medium">Навыки не заданы</p>
                <p className="mt-1 text-sm text-muted">
                  Оцените игрока (0–5), чтобы построить диаграмму и балансировать
                  команды.
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="primary"
                  startContent={<Pencil className="size-4" />}
                  onPress={() => setEditOpen(true)}
                >
                  Оценить навыки
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Info */}
        <Card>
          <Card.Content className="gap-3">
            <div className="text-sm font-semibold uppercase tracking-wide text-muted">
              Профиль
            </div>
            <dl className="flex flex-col gap-3 text-sm">
              <InfoRow label="Статус">
                {player.is_active ? (
                  <Chip color="success" variant="soft" size="sm">
                    Активный
                  </Chip>
                ) : (
                  <Chip color="default" variant="soft" size="sm">
                    Неактивный
                  </Chip>
                )}
              </InfoRow>
              <InfoRow label="Telegram">
                {telegram ? (
                  <HeroLink
                    href={telegram}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {player.telegram_username || player.telegram_url}
                    <HeroLink.Icon />
                  </HeroLink>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Телефон">{player.phone || "—"}</InfoRow>
              <InfoRow label="Позиции">
                <PositionChips positions={player.positions} />
              </InfoRow>
              {player.notes && (
                <InfoRow label="Заметки">
                  <span className="whitespace-pre-wrap">{player.notes}</span>
                </InfoRow>
              )}
            </dl>
          </Card.Content>
        </Card>
      </div>

      <PlayerFormModal
        isOpen={editOpen}
        initialValue={player}
        onClose={() => setEditOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number | null }) {
  const pct = value != null ? (value / PLAYER_SKILL_MAX) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-secondary">
        <div
          className={cn(
            "h-full rounded-full bg-accent transition-[width]",
            value == null && "bg-transparent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-sm font-medium tabular-nums">
        {value ?? "—"}
      </span>
    </div>
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
