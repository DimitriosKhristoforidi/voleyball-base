import { Volleyball } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  subtitle?: boolean;
}

/** App wordmark with a gradient volleyball badge. */
export function Brand({ className, subtitle = true }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-violet-500 text-white shadow-sm shadow-accent/30">
        <Volleyball className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight">Волейбол</span>
        {subtitle && (
          <span className="text-xs text-muted">Админ-панель</span>
        )}
      </span>
    </div>
  );
}
