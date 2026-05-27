import { Label, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import {
  PLAYER_POSITION_LABEL_RU,
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "@/types/domain";

interface PositionsFieldProps {
  label?: string;
  value: PlayerPosition[];
  onChange: (value: PlayerPosition[]) => void;
  isDisabled?: boolean;
}

/**
 * Multi-select for volleyball positions rendered as a row of toggle chips.
 * Backed by HeroUI's ToggleButtonGroup in `multiple` selection mode.
 */
export function PositionsField({
  label = "Позиции",
  value,
  onChange,
  isDisabled,
}: PositionsFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <ToggleButtonGroup
        selectionMode="multiple"
        selectedKeys={value}
        onSelectionChange={(keys) => {
          const next: PlayerPosition[] = [];
          // Preserve the canonical order from PLAYER_POSITIONS for stable output.
          for (const pos of PLAYER_POSITIONS) {
            if (keys.has(pos)) next.push(pos);
          }
          onChange(next);
        }}
        isDisabled={isDisabled}
        isDetached
        className="flex flex-wrap gap-2"
      >
        {PLAYER_POSITIONS.map((pos) => (
          <ToggleButton
            key={pos}
            id={pos}
            size="sm"
            variant="default"
          >
            {PLAYER_POSITION_LABEL_RU[pos]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
