import { Checkbox, Label } from "@heroui/react";
import type { ReactNode } from "react";

interface AppCheckboxProps {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  isDisabled?: boolean;
  label?: ReactNode;
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Thin wrapper around HeroUI v3 Checkbox compound API. */
export function AppCheckbox({
  isSelected,
  onChange,
  isDisabled,
  label,
  ariaLabel,
  className,
}: AppCheckboxProps) {
  return (
    <Checkbox
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      aria-label={!label ? ariaLabel : undefined}
      className={className}
    >
      <Checkbox.Control>
        <Checkbox.Indicator />
      </Checkbox.Control>
      {label && (
        <Checkbox.Content>
          <Label>{label}</Label>
        </Checkbox.Content>
      )}
    </Checkbox>
  );
}
