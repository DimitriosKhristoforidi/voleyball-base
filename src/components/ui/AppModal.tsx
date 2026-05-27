import { Modal } from "@heroui/react";
import type { ReactNode } from "react";

interface AppModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  isDismissable?: boolean;
  dialogClassName?: string;
  /**
   * Scroll behavior when content overflows.
   * - "inside" (default): body scrolls, header/footer stay fixed.
   * - "outside": entire dialog scrolls within the page.
   */
  scroll?: "inside" | "outside";
}

/**
 * Thin wrapper around HeroUI v3 Modal compound API for controlled, headless
 * modals (no built-in trigger).
 */
export function AppModal({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  size = "md",
  isDismissable = true,
  dialogClassName,
  scroll = "inside",
}: AppModalProps) {
  // `max-h-full` clamps the dialog to the container so the Modal.Body
  // (which has `flex-1 min-h-0 overflow-y-auto`) can actually scroll.
  const dialogClasses = ["max-h-full", dialogClassName].filter(Boolean).join(" ");

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
    >
      <Modal.Container size={size} scroll={scroll}>
        <Modal.Dialog className={dialogClasses}>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>{children}</Modal.Body>
          {footer && <Modal.Footer>{footer}</Modal.Footer>}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
