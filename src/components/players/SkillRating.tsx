import { cn } from "@/lib/utils";
import { PLAYER_SKILL_MAX } from "@/types/domain";

interface SkillRatingProps {
  label: string;
  /** Current rating (0-5) or null when not rated. */
  value: number | null;
  onChange: (value: number | null) => void;
}

/** Segmented 0-5 rating control. Clicking the active value again clears it. */
export function SkillRating({ label, value, onChange }: SkillRatingProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        {Array.from({ length: PLAYER_SKILL_MAX + 1 }, (_, n) => {
          // 0 is only highlighted when the value is exactly 0; any value > 0
          // leaves it inactive. Other cells fill cumulatively up to the value.
          const selected =
            n === 0 ? value === 0 : value != null && value > 0 && n <= value;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${label}: ${n}`}
              aria-pressed={value === n}
              onClick={() => onChange(value === n ? null : n)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                selected
                  ? n === 0
                    ? "border-accent bg-accent-soft text-accent-soft-foreground"
                    : "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted hover:bg-surface-secondary",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
