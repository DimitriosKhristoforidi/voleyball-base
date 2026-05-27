import { Input, Label, TextArea, TextField } from "@heroui/react";
import type { HTMLInputTypeAttribute } from "react";

interface BaseFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
}

interface AppInputProps extends BaseFieldProps {
  type?: HTMLInputTypeAttribute;
  inputMode?:
    | "decimal"
    | "email"
    | "none"
    | "numeric"
    | "search"
    | "tel"
    | "text"
    | "url";
  autoFocus?: boolean;
  autoComplete?: string;
  variant?: "primary" | "secondary";
}

/** TextField + Label + Input compound (HeroUI v3). */
export function AppInput({
  label,
  value,
  onChange,
  placeholder,
  isRequired,
  isDisabled,
  type = "text",
  inputMode,
  autoFocus,
  autoComplete,
  variant,
  className,
}: AppInputProps) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      className={className}
    >
      {label && <Label>{label}</Label>}
      <Input
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        variant={variant}
      />
    </TextField>
  );
}

interface AppTextareaProps extends BaseFieldProps {
  rows?: number;
  variant?: "primary" | "secondary";
}

/** TextField + Label + TextArea compound (HeroUI v3). */
export function AppTextarea({
  label,
  value,
  onChange,
  placeholder,
  isRequired,
  isDisabled,
  rows = 3,
  variant,
  className,
}: AppTextareaProps) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      isRequired={isRequired}
      isDisabled={isDisabled}
      className={className}
    >
      {label && <Label>{label}</Label>}
      <TextArea
        rows={rows}
        placeholder={placeholder}
        variant={variant}
        style={{ resize: "vertical" }}
      />
    </TextField>
  );
}
