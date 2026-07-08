import { cn } from "@/lib/utils";
import {
  PLAYER_SKILL_LABEL_ALL,
  PLAYER_SKILL_MAX,
  type PlayerSkillField,
} from "@/types/domain";

type Skills = Partial<Record<PlayerSkillField, number | null>>;

interface SkillRadarProps {
  player: Skills;
  /** Skills to plot, in clockwise order starting from the top vertex. */
  fields: readonly PlayerSkillField[];
  className?: string;
}

const W = 330;
const H = 260;
const CX = W / 2;
const CY = 128;
const R = 84;
const LABEL_R = R + 15;
const LEVELS = PLAYER_SKILL_MAX; // 5 rings

function point(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

/** Radar chart of the given player skills (0-5), one axis per field. */
export function SkillRadar({ player, fields, className }: SkillRadarProps) {
  const n = fields.length;
  const angleAt = (i: number) => -90 + (360 / n) * i;
  const values = fields.map((f) => player[f] ?? 0);

  const polygon = (radiusForAxis: (i: number) => number): string =>
    fields
      .map((_, i) => {
        const [x, y] = point(angleAt(i), radiusForAxis(i));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("h-auto w-full max-w-[330px] overflow-visible", className)}
      role="img"
      aria-label="Диаграмма навыков"
    >
      {/* Grid rings */}
      {Array.from({ length: LEVELS }, (_, l) => {
        const level = l + 1;
        return (
          <polygon
            key={level}
            points={polygon(() => (R * level) / LEVELS)}
            className="fill-none stroke-border"
            strokeWidth={1}
          />
        );
      })}

      {/* Spokes */}
      {fields.map((f, i) => {
        const [x, y] = point(angleAt(i), R);
        return (
          <line
            key={f}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            className="stroke-border"
            strokeWidth={1}
          />
        );
      })}

      {/* Value shape */}
      <polygon
        points={polygon((i) => (R * values[i]) / PLAYER_SKILL_MAX)}
        className="fill-accent/25 stroke-accent"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Vertices */}
      {fields.map((f, i) => {
        const [x, y] = point(angleAt(i), (R * values[i]) / PLAYER_SKILL_MAX);
        return <circle key={f} cx={x} cy={y} r={3} className="fill-accent" />;
      })}

      {/* Labels (name only; values live in the sliders / bars next to it) */}
      {fields.map((field, i) => {
        const angle = angleAt(i);
        const [lx, ly] = point(angle, LABEL_R);
        const cos = Math.cos((angle * Math.PI) / 180);
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        return (
          <text
            key={field}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-current text-[11px] font-medium text-muted"
          >
            {PLAYER_SKILL_LABEL_ALL[field]}
          </text>
        );
      })}
    </svg>
  );
}
