import { Button } from "@heroui/react";
import { useEffect, useState, type FormEvent } from "react";
import type { Venue, VenueInsert } from "@/types/domain";
import { AppModal } from "@/components/ui/AppModal";
import { AppInput, AppTextarea } from "@/components/ui/AppField";

interface VenueFormModalProps {
  isOpen: boolean;
  initialValue: Venue | null;
  onClose: () => void;
  onSubmit: (payload: VenueInsert) => Promise<void>;
}

interface FormState {
  name: string;
  address: string;
  map_url: string;
  notes: string;
}

const EMPTY: FormState = { name: "", address: "", map_url: "", notes: "" };

function toFormState(v: Venue | null): FormState {
  if (!v) return EMPTY;
  return {
    name: v.name,
    address: v.address ?? "",
    map_url: v.map_url ?? "",
    notes: v.notes ?? "",
  };
}

export function VenueFormModal({
  isOpen,
  initialValue,
  onClose,
  onSubmit,
}: VenueFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(toFormState(initialValue));
      setError(null);
    }
  }, [isOpen, initialValue]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: VenueInsert = {
        name: form.name.trim(),
        address: emptyToNull(form.address),
        map_url: emptyToNull(form.map_url),
        notes: emptyToNull(form.notes),
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
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
      size="lg"
      title={initialValue ? "Редактировать площадку" : "Новая площадка"}
      footer={
        <>
          <Button variant="secondary" onPress={onClose} isDisabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            isPending={loading}
            onPress={() =>
              (
                document.getElementById("venue-form") as HTMLFormElement
              )?.requestSubmit()
            }
          >
            Сохранить
          </Button>
        </>
      }
    >
      <form
        id="venue-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <AppInput
          label="Название"
          value={form.name}
          onChange={(v) => setForm((s) => ({ ...s, name: v }))}
          isRequired
          autoFocus
        />
        <AppInput
          label="Адрес"
          value={form.address}
          onChange={(v) => setForm((s) => ({ ...s, address: v }))}
        />
        <AppInput
          label="Ссылка на карту"
          placeholder="https://go.2gis.com/..."
          value={form.map_url}
          onChange={(v) => setForm((s) => ({ ...s, map_url: v }))}
        />
        <AppTextarea
          label="Заметки"
          value={form.notes}
          onChange={(v) => setForm((s) => ({ ...s, notes: v }))}
          rows={2}
        />
        {error && <div className="text-sm text-danger">{error}</div>}
      </form>
    </AppModal>
  );
}

function emptyToNull(value: string): string | null {
  const v = value.trim();
  return v.length === 0 ? null : v;
}
