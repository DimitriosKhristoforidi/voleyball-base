import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Chip, Input, Link as HeroLink, Table } from "@/components/ui/hero";

import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PlayerFormModal } from "@/components/players/PlayerFormModal";
import { PositionChips } from "@/components/players/PositionChips";
import { playersService } from "@/services/playersService";
import type { Player, PlayerInsert } from "@/types/domain";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Player | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Player | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await playersService.list();
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return players;
    return players.filter((p) => {
      return (
        p.full_name.toLowerCase().includes(term) ||
        (p.telegram_username ?? "").toLowerCase().includes(term) ||
        (p.telegram_url ?? "").toLowerCase().includes(term) ||
        (p.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [players, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(player: Player) {
    setEditing(player);
    setFormOpen(true);
  }

  async function handleSubmit(payload: PlayerInsert) {
    if (editing) {
      await playersService.update(editing.id, payload);
    } else {
      await playersService.create(payload);
    }
    await refresh();
  }

  async function handleDeactivate(player: Player) {
    await playersService.setActive(player.id, !player.is_active);
    await refresh();
  }

  return (
    <div>
      <PageHeader
        title="Игроки"
        description="Список игроков, которых можно добавлять в игры"
        actions={
          <Button variant="primary" onPress={openCreate}>
            Добавить игрока
          </Button>
        }
      />

      <div className="mb-4 w-full max-w-sm">
        <Input
          type="search"
          placeholder="Поиск по имени, Telegram или телефону"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "Игроки не найдены" : "Игроков ещё нет"}
          description={
            search ? "Попробуйте другой запрос" : "Добавьте первого игрока"
          }
          action={
            !search && (
              <Button variant="primary" onPress={openCreate}>
                Добавить игрока
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Игроки" className="min-w-[820px]">
              <Table.Header>
                <Table.Column isRowHeader>Имя</Table.Column>
                <Table.Column>Telegram</Table.Column>
                <Table.Column>Телефон</Table.Column>
                <Table.Column>Позиции</Table.Column>
                <Table.Column>Статус</Table.Column>
                <Table.Column>Действия</Table.Column>
              </Table.Header>
              <Table.Body>
                {filtered.map((player) => (
                  <Table.Row key={player.id}>
                    <Table.Cell>
                      <div className="font-medium">{player.full_name}</div>
                      {player.notes && (
                        <div className="text-xs text-muted">{player.notes}</div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <TelegramCell player={player} />
                    </Table.Cell>
                    <Table.Cell>{player.phone ?? "-"}</Table.Cell>
                    <Table.Cell>
                      <PositionChips positions={player.positions} />
                    </Table.Cell>
                    <Table.Cell>
                      {player.is_active ? (
                        <Chip color="success" variant="soft" size="sm">
                          Активный
                        </Chip>
                      ) : (
                        <Chip color="default" variant="soft" size="sm">
                          Неактивный
                        </Chip>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => openEdit(player)}
                        >
                          Изменить
                        </Button>
                        <Button
                          size="sm"
                          variant={player.is_active ? "outline" : "secondary"}
                          onPress={() => setConfirmTarget(player)}
                        >
                          {player.is_active ? "Деактивировать" : "Активировать"}
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

      <PlayerFormModal
        isOpen={formOpen}
        initialValue={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={confirmTarget != null}
        title={
          confirmTarget?.is_active
            ? "Деактивировать игрока?"
            : "Активировать игрока?"
        }
        description={
          confirmTarget?.is_active
            ? "Игрок не будет показываться при добавлении в игры. Его историю участия мы сохраним."
            : undefined
        }
        confirmLabel={
          confirmTarget?.is_active ? "Деактивировать" : "Активировать"
        }
        destructive={confirmTarget?.is_active}
        onConfirm={async () => {
          if (confirmTarget) await handleDeactivate(confirmTarget);
        }}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}

function TelegramCell({ player }: { player: Player }) {
  const url = telegramHref(player);
  const label = player.telegram_username || player.telegram_url || "-";
  if (!url) return <span>{label}</span>;
  return (
    <HeroLink href={url} target="_blank" rel="noreferrer noopener">
      {label}
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
