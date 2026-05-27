import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Table } from "@heroui/react";

import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { GameStatusChip } from "@/components/common/StatusChips";
import { gameParticipantsService, gamesService } from "@/services/gamesService";
import { playersService } from "@/services/playersService";
import { formatDateShortRu, formatTimeRange } from "@/lib/date";
import type {
  GameWithVenue,
  ParticipantWithPlayer,
  Player,
} from "@/types/domain";

interface DashboardData {
  upcoming: GameWithVenue[];
  activePlayers: Player[];
  unpaid: ParticipantWithPlayer[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [upcoming, activePlayers, unpaid] = await Promise.all([
        gamesService.listUpcoming(10),
        playersService.list({ onlyActive: true }),
        gameParticipantsService.listUnpaidUpcoming(),
      ]);
      setData({ upcoming, activePlayers, unpaid });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) return <LoadingState />;
  if (!data) {
    return <EmptyState title="Нет данных" description={error ?? undefined} />;
  }

  const nextGame = data.upcoming[0];

  return (
    <div>
      <PageHeader
        title="Дашборд"
        description="Быстрый обзор предстоящих игр и оплат"
      />

      {error && (
        <div className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Предстоящие игры" value={data.upcoming.length} />
        <StatCard label="Активные игроки" value={data.activePlayers.length} />
        <StatCard
          label="Неоплаченные участия"
          value={data.unpaid.length}
          tone={data.unpaid.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Ближайшая игра"
          value={
            nextGame
              ? `${formatDateShortRu(nextGame.game_date)} · ${formatTimeRange(
                  nextGame.start_time,
                  nextGame.end_time,
                )}`
              : "-"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Card.Content>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Предстоящие игры</div>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => navigate("/games")}
              >
                Все игры →
              </Button>
            </div>
            {data.upcoming.length === 0 ? (
              <EmptyState
                title="Нет запланированных игр"
                description="Создайте новую игру на странице «Игры»"
                icon="🏐"
              />
            ) : (
              <Table>
                <Table.ScrollContainer>
                  <Table.Content
                    aria-label="Предстоящие игры"
                    className="min-w-[700px]"
                  >
                    <Table.Header>
                      <Table.Column isRowHeader>Дата</Table.Column>
                      <Table.Column>Время</Table.Column>
                      <Table.Column>Название</Table.Column>
                      <Table.Column>Площадка</Table.Column>
                      <Table.Column>Статус</Table.Column>
                      <Table.Column>Действия</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {data.upcoming.map((g) => (
                        <Table.Row key={g.id}>
                          <Table.Cell>
                            {formatDateShortRu(g.game_date)}
                          </Table.Cell>
                          <Table.Cell>
                            {formatTimeRange(g.start_time, g.end_time)}
                          </Table.Cell>
                          <Table.Cell>{g.title ?? "-"}</Table.Cell>
                          <Table.Cell>{g.venue?.name ?? "-"}</Table.Cell>
                          <Table.Cell>
                            <GameStatusChip status={g.status} />
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="primary"
                                onPress={() => navigate(`/games/${g.id}`)}
                              >
                                Открыть
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
          </Card.Content>
        </Card>

        <Card>
          <Card.Content>
            <div className="mb-3 text-base font-semibold">Неоплаченные</div>
            {data.unpaid.length === 0 ? (
              <EmptyState
                title="Все оплатили"
                description="Никаких долгов на предстоящие игры"
                icon="✅"
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {data.unpaid.slice(0, 8).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{p.player.full_name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => navigate(`/games/${p.game_id}`)}
                    >
                      К игре →
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  tone?: "default" | "warning";
}

function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <Card>
      <Card.Content className="gap-1">
        <div className="text-xs uppercase tracking-wide text-muted">
          {label}
        </div>
        <div
          className={
            tone === "warning" && Number(value) > 0
              ? "text-2xl font-semibold text-warning"
              : "text-2xl font-semibold"
          }
        >
          {value}
        </div>
      </Card.Content>
    </Card>
  );
}
