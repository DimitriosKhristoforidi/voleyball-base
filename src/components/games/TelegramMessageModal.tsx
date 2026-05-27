import { Button, TextArea } from "@heroui/react";
import { useMemo, useState } from "react";
import { AppCheckbox } from "@/components/ui/AppCheckbox";
import { AppModal } from "@/components/ui/AppModal";
import { buildTelegramMessage } from "@/lib/telegramMessage";
import {
  PARTICIPANT_STATUSES,
  PARTICIPANT_STATUS_LABEL_RU,
  type GameDetail,
  type ParticipantStatus,
} from "@/types/domain";

interface TelegramMessageModalProps {
  isOpen: boolean;
  game: GameDetail | null;
  onClose: () => void;
}

const DEFAULT_INCLUDED: ParticipantStatus[] = ["confirmed", "attended"];

export function TelegramMessageModal({
  isOpen,
  game,
  onClose,
}: TelegramMessageModalProps) {
  const [included, setIncluded] = useState<Set<ParticipantStatus>>(
    new Set(DEFAULT_INCLUDED),
  );
  const [includePerPlayer, setIncludePerPlayer] = useState(false);
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    if (!game) return "";
    return buildTelegramMessage(game, {
      includeStatuses: Array.from(included),
      includePerPlayerAmounts: includePerPlayer,
    });
  }, [game, included, includePerPlayer]);

  function toggle(status: ParticipantStatus) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable.
    }
  }

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      size="lg"
      title="Сообщение для Telegram"
      footer={
        <>
          <Button variant="secondary" onPress={onClose}>
            Закрыть
          </Button>
          <Button
            variant="primary"
            onPress={handleCopy}
            isDisabled={!message}
          >
            {copied ? "Скопировано ✓" : "Копировать"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Включить статусы:</span>
          {PARTICIPANT_STATUSES.map((s) => (
            <AppCheckbox
              key={s}
              isSelected={included.has(s)}
              onChange={() => toggle(s)}
              label={PARTICIPANT_STATUS_LABEL_RU[s]}
            />
          ))}
        </div>
        <AppCheckbox
          isSelected={includePerPlayer}
          onChange={setIncludePerPlayer}
          label="Добавить суммы по игрокам"
        />
        <TextArea
          value={message}
          readOnly
          rows={14}
          className="font-mono text-sm"
          style={{ resize: "vertical" }}
        />
      </div>
    </AppModal>
  );
}
