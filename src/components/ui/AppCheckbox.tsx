import { useId, type ReactNode } from "react";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

interface AppCheckboxProps {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  isDisabled?: boolean;
  label?: ReactNode;
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Checkbox with an optional inline label. */
export function AppCheckbox({
  isSelected,
  onChange,
  isDisabled,
  label,
  ariaLabel,
  className,
}: AppCheckboxProps) {
  const id = useId();
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Checkbox
        id={id}
        checked={isSelected}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={isDisabled}
        aria-label={!label ? ariaLabel : undefined}
      />
      {label && (
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {label}
        </Label>
      )}
    </div>
  );
}
