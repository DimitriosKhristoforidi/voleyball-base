import {
  PLAYER_POSITION_LABEL_RU,
  PLAYER_POSITIONS,
  type PlayerPosition,
} from "@/types/domain";
import { Label } from "./label";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

interface PositionsFieldProps {
  label?: string;
  value: PlayerPosition[];
  onChange: (value: PlayerPosition[]) => void;
  isDisabled?: boolean;
}

/**
 * Multi-select for volleyball positions rendered as a row of toggle chips.
 * Backed by Radix ToggleGroup in `multiple` selection mode.
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
      <ToggleGroup
        type="multiple"
        value={value}
        onValueChange={(next: string[]) => {
          // Preserve the canonical order from PLAYER_POSITIONS for stable output.
          const ordered = PLAYER_POSITIONS.filter((pos) => next.includes(pos));
          onChange(ordered);
        }}
        disabled={isDisabled}
      >
        {PLAYER_POSITIONS.map((pos) => (
          <ToggleGroupItem key={pos} value={pos}>
            {PLAYER_POSITION_LABEL_RU[pos]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
