import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap w-fit",
  {
    variants: {
      tone: {
        default:
          "border-transparent bg-surface-secondary text-muted",
        accent:
          "border-transparent bg-accent-soft text-accent-soft-foreground",
        success:
          "border-transparent bg-success-soft text-success-soft-foreground",
        warning:
          "border-transparent bg-warning-soft text-warning-soft-foreground",
        danger:
          "border-transparent bg-danger-soft text-danger-soft-foreground",
        outline: "border-border bg-transparent text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: { tone: "default", size: "md" },
  },
);

type ChipColor = "default" | "accent" | "success" | "warning" | "danger";

export interface ChipProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  /** HeroUI-compatible semantic color. */
  color?: ChipColor;
  /** HeroUI-compatible visual style. `secondary`/`outline` render outlined. */
  variant?: "soft" | "solid" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

/** Badge / chip compatible with the previous HeroUI Chip API. */
export function Chip({
  className,
  color = "default",
  variant = "soft",
  size = "md",
  ...props
}: ChipProps) {
  const tone: VariantProps<typeof badgeVariants>["tone"] =
    variant === "secondary" || variant === "outline" ? "outline" : color;
  return (
    <span
      className={cn(badgeVariants({ tone, size }), className)}
      {...props}
    />
  );
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: VariantProps<typeof badgeVariants>["tone"];
  size?: "sm" | "md" | "lg";
}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
  );
}

export { badgeVariants };
