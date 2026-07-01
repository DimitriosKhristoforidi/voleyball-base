import { useId, type ReactNode } from "react";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export interface AppSelectOption<T extends string = string> {
  id: T;
  label: string;
  isDisabled?: boolean;
}

interface AppSelectProps<T extends string> {
  label?: string;
  ariaLabel?: string;
  value: T | null;
  onChange: (value: T | null) => void;
  options: readonly AppSelectOption<T>[];
  placeholder?: string;
  isDisabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  /** Render override for the trigger value. */
  renderValue?: (value: T | null) => ReactNode;
}

/**
 * Single-value select over a flat `{ id, label }` list, backed by Radix.
 * Preserves the previous HeroUI-era AppSelect API.
 */
export function AppSelect<T extends string>({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder = "Выберите",
  isDisabled,
  className,
  renderValue,
}: AppSelectProps<T>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select
        value={value ?? undefined}
        onValueChange={(v) => onChange((v as T) ?? null)}
        disabled={isDisabled}
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel ?? label}
          className={className}
        >
          {renderValue ? (
            value ? (
              renderValue(value)
            ) : (
              <span className="text-muted/80">{placeholder}</span>
            )
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id} disabled={opt.isDisabled}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
