import { useId, type ReactNode } from "react";
import { Label } from "./label";
import { Switch } from "./switch";

interface AppSwitchProps {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  isDisabled?: boolean;
  label?: ReactNode;
  ariaLabel?: string;
}

/** Switch with an optional inline label. */
export function AppSwitch({
  isSelected,
  onChange,
  isDisabled,
  label,
  ariaLabel,
}: AppSwitchProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <Switch
        id={id}
        checked={isSelected}
        onCheckedChange={onChange}
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
