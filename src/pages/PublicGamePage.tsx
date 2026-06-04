import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Link as HeroLink, Spinner } from "@heroui/react";

import { gamesService } from "@/services/gamesService";
import { formatDateRu, formatTimeRange } from "@/lib/date";
import type { PublicGameView } from "@/types/domain";

export default function PublicGamePage() {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<PublicGameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Ссылка недействительна");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    gamesService
      .getPublicView(id)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError("Игра не найдена");
          setGame(null);
        } else {
          setGame(data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
        setGame(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-16">
          <Spinner size="lg" color="accent" />
          <span className="text-sm text-muted">Загрузка…</span>
        </div>
      </PageShell>
    );
  }

  if (error || !game) {
    return (
      <PageShell>
        <Card className="mx-auto max-w-md">
          <Card.Content className="py-8 text-center">
            <p className="text-lg font-medium">{error ?? "Игра не найдена"}</p>
          </Card.Content>
        </Card>
      </PageShell>
    );
  }

  const title = game.title?.trim() || "Волейбол";

  return (
    <PageShell>
      <Card className="mx-auto w-full max-w-lg">
        <Card.Content className="gap-4">
          <div className="text-center">
            <div className="text-3xl" aria-hidden>
              🏐
            </div>
            <h1 className="mt-2 text-xl font-semibold">{title}</h1>
          </div>

          {game.status === "cancelled" && (
            <div className="rounded-md border border-danger bg-danger-soft px-3 py-2 text-center text-sm text-danger-soft-foreground">
              Игра отменена
            </div>
          )}

          <dl className="flex flex-col gap-3 text-sm">
            <Row label="Дата" value={formatDateRu(game.game_date)} />
            <Row
              label="Время"
              value={
                formatTimeRange(game.start_time, game.end_time) || "—"
              }
            />
            {game.venue && (
              <Row
                label="Место"
                value={
                  <>
                    <span className="font-medium">{game.venue.name}</span>
                    {game.venue.address && (
                      <span className="block text-muted">
                        {game.venue.address}
                      </span>
                    )}
                    {game.venue.map_url && (
                      <HeroLink
                        href={game.venue.map_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 inline-flex"
                      >
                        Открыть на карте
                        <HeroLink.Icon />
                      </HeroLink>
                    )}
                  </>
                }
              />
            )}
          </dl>

          <div>
            <h2 className="mb-2 text-sm font-medium text-muted">
              Участники ({game.players.length})
            </h2>
            {game.players.length === 0 ? (
              <p className="text-sm text-muted">Пока никого нет</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {game.players.map((p, i) => (
                  <li key={`${p.full_name}-${i}`}>
                    <span className="font-medium">{p.full_name}</span>
                    {p.telegram_username && (
                      <span className="text-muted">
                        {" "}
                        {formatTelegram(p.telegram_username)}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {game.max_players != null && (
              <p className="mt-2 text-xs text-muted">
                Лимит: {game.players.length}/{game.max_players}
              </p>
            )}
          </div>
        </Card.Content>
      </Card>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background px-4 py-8 sm:py-12">
      {children}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function formatTelegram(username: string): string {
  const h = username.trim();
  return h.startsWith("@") ? h : `@${h}`;
}
