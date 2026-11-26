import { Button } from "@/components/ui/hero";
import { AppModal } from "@/components/ui/AppModal";

interface TelegramPreviewModalProps {
  isOpen: boolean;
  title: string;
  text: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Shows the exact group message and sends only on the second tap. */
export function TelegramPreviewModal({
  isOpen,
  title,
  text,
  pending,
  onClose,
  onConfirm,
}: TelegramPreviewModalProps) {
  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={title}
      size="md"
      isDismissable={!pending}
      footer={
        <>
          <Button variant="secondary" onPress={onClose} isDisabled={pending}>
            Отмена
          </Button>
          <Button variant="primary" isPending={pending} onPress={onConfirm}>
            Отправить в группу
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">Так сообщение увидят в группе.</p>
      <pre className="mt-3 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-secondary p-3 font-sans text-sm leading-relaxed">
        {text}
      </pre>
    </AppModal>
  );
}
