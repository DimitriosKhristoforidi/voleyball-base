import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "primary" | "secondary";
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-variant={variant}
        className={cn(
          "flex min-h-20 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
          "placeholder:text-muted/70",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

/** Alias kept for HeroUI import compatibility. */
export const TextArea = Textarea;
