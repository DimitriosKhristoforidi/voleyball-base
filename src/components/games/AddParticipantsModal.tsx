import { Button, Input, ScrollShadow } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { AppCheckbox } from "@/components/ui/AppCheckbox";
import { AppModal } from "@/components/ui/AppModal";
import type { Player } from "@/types/domain";

interface AddParticipantsModalProps {
  isOpen: boolean;
  allActivePlayers: Player[];
  existingPlayerIds: Set<string>;
  onClose: () => void;
  onSubmit: (playerIds: string[]) => Promise<void>;
}

export function AddParticipantsModal({
  isOpen,
  allActivePlayers,
  existingPlayerIds,
  onClose,
  onSubmit,
}: AddParticipantsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set());
      setSearch("");
      setError(null);
    }
  }, [isOpen]);

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allActivePlayers.filter((p) => {
      if (existingPlayerIds.has(p.id)) return false;
      if (!term) return true;
      return (
        p.full_name.toLowerCase().includes(term) ||
        (p.telegram_username ?? "").toLowerCase().includes(term)
      );
    });
  }, [allActivePlayers, existingPlayerIds, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(Array.from(selected));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка добавления");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      size="md"
      title="Добавить участников"
      footer={
        <>
          <Button variant="secondary" onPress={onClose} isDisabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            isDisabled={selected.size === 0}
            isPending={loading}
          >
            Добавить
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          type="search"
          placeholder="Поиск игрока"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {candidates.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted">
            {existingPlayerIds.size > 0
              ? "Все подходящие игроки уже добавлены"
              : "Нет активных игроков"}
          </div>
        ) : (
          <ScrollShadow className="max-h-72">
            <div className="flex flex-col gap-1">
              {candidates.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-secondary"
                >
                  <AppCheckbox
                    isSelected={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    ariaLabel={p.full_name}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{p.full_name}</span>
                    {p.telegram_username && (
                      <span className="text-xs text-muted">
                        {formatTg(p.telegram_username)}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </ScrollShadow>
        )}
        {error && <div className="text-sm text-danger">{error}</div>}
        <div className="text-xs text-muted">Выбрано: {selected.size}</div>
      </div>
    </AppModal>
  );
}

function formatTg(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}
