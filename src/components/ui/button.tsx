import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,box-shadow,transform] outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90",
        secondary:
          "bg-surface text-surface-foreground border border-border shadow-xs hover:bg-surface-secondary",
        outline:
          "border border-border bg-transparent hover:bg-surface-secondary",
        ghost: "hover:bg-surface-secondary",
        danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        "danger-soft":
          "bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft/70",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  variant?: ButtonVariant | "default";
  size?: "sm" | "md" | "lg" | "icon";
  /** HeroUI-compatible click handler. */
  onPress?: () => void;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  isIconOnly?: boolean;
  isDisabled?: boolean;
  /** Shows a spinner and disables the button. */
  isPending?: boolean;
  fullWidth?: boolean;
  startContent?: ReactNode;
  asChild?: boolean;
}

const normalizeVariant = (v?: ButtonVariant | "default"): ButtonVariant =>
  !v || v === "default" ? "primary" : v;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      onPress,
      onClick,
      isIconOnly,
      isDisabled,
      isPending,
      fullWidth,
      startContent,
      asChild,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const resolvedSize = isIconOnly ? "icon" : (size ?? "md");
    const isOff = disabled || isDisabled || isPending;

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        disabled={asChild ? undefined : isOff}
        aria-busy={isPending || undefined}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          if (isOff) return;
          onClick?.(e);
          onPress?.();
        }}
        className={cn(
          buttonVariants({ variant: normalizeVariant(variant), size: resolvedSize }),
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              startContent
            )}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
