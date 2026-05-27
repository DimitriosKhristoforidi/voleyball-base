import { Label, Switch } from "@heroui/react";
import type { ReactNode } from "react";

interface AppSwitchProps {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  isDisabled?: boolean;
  label?: ReactNode;
  ariaLabel?: string;
}

/** Thin wrapper around HeroUI v3 Switch compound API. */
export function AppSwitch({
  isSelected,
  onChange,
  isDisabled,
  label,
  ariaLabel,
}: AppSwitchProps) {
  return (
    <Switch
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      aria-label={!label ? ariaLabel : undefined}
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      {label && (
        <Switch.Content>
          <Label>{label}</Label>
        </Switch.Content>
      )}
    </Switch>
  );
}
