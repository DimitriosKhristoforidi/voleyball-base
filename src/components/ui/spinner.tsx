import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  /** Kept for HeroUI parity; brand color is used by default. */
  color?: "accent" | "default" | "current";
  className?: string;
}

const SIZE: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

export function Spinner({ size = "md", color = "accent", className }: SpinnerProps) {
  return (
    <Loader2
      aria-label="Загрузка"
      className={cn(
        "animate-spin",
        SIZE[size],
        color === "accent" ? "text-accent" : "text-current",
        className,
      )}
    />
  );
}
