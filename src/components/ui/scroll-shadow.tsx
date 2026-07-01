import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Lightweight scroll container replacing HeroUI's ScrollShadow. */
export function ScrollShadow({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-y-auto overscroll-contain [scrollbar-width:thin]",
        className,
      )}
      {...props}
    />
  );
}
