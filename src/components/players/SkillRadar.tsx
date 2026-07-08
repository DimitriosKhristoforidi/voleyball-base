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

/** Axis order chosen to match the classic stats hexagon layout. */
const AXES: PlayerSkillField[] = [
  "skill_power", // top
  "skill_jumping", // top-right
  "skill_stamina", // bottom-right
  "skill_intelligence", // bottom
  "skill_technique", // bottom-left
  "skill_speed", // top-left
];

const CX = 150;
const CY = 130;
const R = 92;
const LABEL_R = R + 26;
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

  const valuePolygon = polygon((i) => (R * values[i]) / PLAYER_SKILL_MAX);

  return (
    <svg
      viewBox="0 0 300 260"
      className={cn("h-auto w-full max-w-[320px]", className)}
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
        points={valuePolygon}
        className="fill-accent/25 stroke-accent"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Vertices */}
      {AXES.map((_, i) => {
        const [x, y] = point(-90 + 60 * i, (R * values[i]) / PLAYER_SKILL_MAX);
        return <circle key={i} cx={x} cy={y} r={3} className="fill-accent" />;
      })}

      {/* Labels */}
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
            <tspan className="fill-current">
              {PLAYER_SKILL_LABEL_RU[field]}
            </tspan>
            <tspan
              dx={4}
              className="fill-foreground font-semibold"
            >
              {player[field] ?? "—"}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
