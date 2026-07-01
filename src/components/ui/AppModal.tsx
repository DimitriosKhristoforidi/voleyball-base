import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

interface AppModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  isDismissable?: boolean;
  dialogClassName?: string;
  /** Reserved for API parity; body always scrolls when content overflows. */
  scroll?: "inside" | "outside";
}

const SIZE_CLASS: Record<NonNullable<AppModalProps["size"]>, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  cover: "max-w-4xl",
  full: "max-w-[95vw]",
};

/**
 * Controlled, headless modal (no built-in trigger) built on Radix Dialog.
 * Preserves the previous AppModal API.
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
}: AppModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(SIZE_CLASS[size], dialogClassName)}
        onInteractOutside={(e) => {
          if (!isDismissable) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!isDismissable) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
