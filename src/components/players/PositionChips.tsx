import { Chip } from "@heroui/react";
import { PLAYER_POSITION_LABEL_RU, isPlayerPosition } from "@/types/domain";

interface PositionChipsProps {
  positions: string[] | null | undefined;
  size?: "sm" | "md";
  /** When true, unknown values are rendered as-is (capitalised). */
  preserveUnknown?: boolean;
  className?: string;
}

/** Compact list of position chips for use inside tables and cards. */
export function PositionChips({
  positions,
  size = "sm",
  preserveUnknown = true,
  className,
}: PositionChipsProps) {
  if (!positions || positions.length === 0) {
    return <span className="text-xs text-muted">-</span>;
  }
  return (
    <div className={`flex flex-wrap gap-1 ${className ?? ""}`.trim()}>
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
