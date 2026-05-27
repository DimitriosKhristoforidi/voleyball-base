import { useCallback, useEffect, useState } from "react";
import { Button, Link as HeroLink, Table } from "@heroui/react";

import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { VenueFormModal } from "@/components/venues/VenueFormModal";
import { venuesService } from "@/services/venuesService";
import { formatAmount } from "@/lib/payments";
import type { Venue, VenueInsert } from "@/types/domain";

export function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Venue | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Venue | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await venuesService.list();
      setVenues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(venue: Venue) {
    setEditing(venue);
    setFormOpen(true);
  }

  async function handleSubmit(payload: VenueInsert) {
    if (editing) {
      await venuesService.update(editing.id, payload);
    } else {
      await venuesService.create(payload);
    }
    await refresh();
  }

  async function handleDelete(venue: Venue) {
    setDeleteError(null);
    try {
      await venuesService.remove(venue.id);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось удалить";
      setDeleteError(
        /foreign key/i.test(msg)
          ? "Нельзя удалить: площадка используется в играх."
          : msg,
      );
      throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="Площадки"
        description="Места проведения игр"
        actions={
          <Button variant="primary" onPress={openCreate}>
            Добавить площадку
          </Button>
        }
      />

      {error && (
        <div className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          {error}
        </div>
      )}
      {deleteError && (
        <div className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          {deleteError}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : venues.length === 0 ? (
        <EmptyState
          title="Площадок ещё нет"
          description="Добавьте первую площадку"
          action={
            <Button variant="primary" onPress={openCreate}>
              Добавить площадку
            </Button>
          }
          icon="📍"
        />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Площадки" className="min-w-[720px]">
              <Table.Header>
                <Table.Column isRowHeader>Название</Table.Column>
                <Table.Column>Адрес</Table.Column>
                <Table.Column>Цена за час</Table.Column>
                <Table.Column>Карта</Table.Column>
                <Table.Column>Действия</Table.Column>
              </Table.Header>
              <Table.Body>
                {venues.map((v) => (
                  <Table.Row key={v.id}>
                    <Table.Cell>
                      <div className="font-medium">{v.name}</div>
                      {v.notes && (
                        <div className="text-xs text-muted">{v.notes}</div>
                      )}
                    </Table.Cell>
                    <Table.Cell>{v.address ?? "—"}</Table.Cell>
                    <Table.Cell>
                      {v.hourly_price != null
                        ? `${formatAmount(v.hourly_price)} ${v.currency}`
                        : "—"}
                    </Table.Cell>
                    <Table.Cell>
                      {v.map_url ? (
                        <HeroLink
                          href={v.map_url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Открыть карту
                          <HeroLink.Icon />
                        </HeroLink>
                      ) : (
                        "—"
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => openEdit(v)}
                        >
                          Изменить
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onPress={() => setConfirmTarget(v)}
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

      <VenueFormModal
        isOpen={formOpen}
        initialValue={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={confirmTarget != null}
        title="Удалить площадку?"
        description="Если площадка используется в играх, удаление будет отклонено базой данных."
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
