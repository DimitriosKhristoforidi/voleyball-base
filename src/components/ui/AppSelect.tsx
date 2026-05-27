import { Label, ListBox, Select } from "@heroui/react";
import type { ReactNode } from "react";

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
  /** Render override for the value chip. */
  renderValue?: (value: T | null) => ReactNode;
}

/**
 * Thin wrapper around HeroUI v3 Select compound API for the common case:
 * single-value selection from a flat list of `{ id, label }` items.
 */
export function AppSelect<T extends string>({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder = "Выберите",
  isDisabled,
  variant,
  className,
  renderValue,
}: AppSelectProps<T>) {
  return (
    <Select
      aria-label={ariaLabel}
      value={value}
      onChange={(v) => onChange((v as T | null) ?? null)}
      isDisabled={isDisabled}
      variant={variant}
      placeholder={placeholder}
      className={className}
    >
      {label && <Label>{label}</Label>}
      <Select.Trigger>
        {renderValue ? (
          <Select.Value>
            {(rp) => (rp.isPlaceholder ? placeholder : renderValue(value))}
          </Select.Value>
        ) : (
          <Select.Value />
        )}
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((opt) => (
            <ListBox.Item
              key={opt.id}
              id={opt.id}
              textValue={opt.label}
              isDisabled={opt.isDisabled}
            >
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
