import { cn } from "@/lib/utils";
import {
  PLAYER_SKILL_LABEL_RU,
  PLAYER_SKILL_MAX,
  type PlayerSkillField,
} from "@/types/domain";

type Skills = Partial<Record<PlayerSkillField, number | null>>;

interface SkillRadarProps {
  player: Skills;
  className?: string;
}

// Longest labels (Выносливость / Интеллект) go top & bottom where they are
// center-anchored with symmetric room; shorter ones sit on the diagonals so
// nothing overflows the viewBox horizontally.
const AXES: PlayerSkillField[] = [
  "skill_stamina", // top (Выносливость)
  "skill_power", // top-right (Сила)
  "skill_jumping", // bottom-right (Прыжок)
  "skill_intelligence", // bottom (Интеллект)
  "skill_technique", // bottom-left (Техника)
  "skill_speed", // top-left (Скорость)
];

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

function polygon(radiusForAxis: (i: number) => number): string {
  return AXES.map((_, i) => {
    const [x, y] = point(-90 + 60 * i, radiusForAxis(i));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

/** Hexagonal radar chart of a player's six skills (0-5). */
export function SkillRadar({ player, className }: SkillRadarProps) {
  const values = AXES.map((f) => player[f] ?? 0);

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
      {AXES.map((_, i) => {
        const [x, y] = point(-90 + 60 * i, R);
        return (
          <line
            key={i}
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
      {AXES.map((_, i) => {
        const [x, y] = point(-90 + 60 * i, (R * values[i]) / PLAYER_SKILL_MAX);
        return <circle key={i} cx={x} cy={y} r={3} className="fill-accent" />;
      })}

      {/* Labels (name only; values live in the sliders / bars next to it) */}
      {AXES.map((field, i) => {
        const angle = -90 + 60 * i;
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
            {PLAYER_SKILL_LABEL_RU[field]}
          </text>
        );
      })}
    </svg>
  );
}
