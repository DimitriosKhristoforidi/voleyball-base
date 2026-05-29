import { Chip, cn } from "@heroui/react";
import { PLAYER_POSITION_LABEL_RU, isPlayerPosition } from "@/types/domain";
import { useEffect, useState } from "react";

interface PositionChipsProps {
  positions: string[] | null | undefined;
  size?: "sm" | "md";
  preserveUnknown?: boolean;
  collapsed?: boolean;
  className?: string;
}

export function PositionChips({
  positions,
  size = "sm",
  preserveUnknown = true,
  collapsed = false,
  className,
}: PositionChipsProps) {
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    if (collapsed) {
      setClamped(true);
    }
  }, [collapsed]);

  const toggleClamped = () => setClamped((prev) => !prev);

  if (!positions || positions.length === 0) {
    return <span className="text-xs text-muted">-</span>;
  }

  return (
    <div
      className={cn("flex gap-1 flex-wrap max-w-xs", className, {
        "line-clamp-1": clamped,
      })}
      onClick={toggleClamped}
      role="button"
      tabIndex={0}
    >
      {positions.map((p) => {
        const label = isPlayerPosition(p)
          ? PLAYER_POSITION_LABEL_RU[p]
          : preserveUnknown
            ? p
            : null;
        if (label == null) return null;
        return (
          <Chip key={p} size={size} variant="soft" color="accent">
            {label}
          </Chip>
        );
      })}
    </div>
  );
}
