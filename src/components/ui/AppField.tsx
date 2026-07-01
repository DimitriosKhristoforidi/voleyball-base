import type { HTMLInputTypeAttribute } from "react";
import { useId } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

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

/** Labeled text input. */
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
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label htmlFor={id}>
          {label}
          {isRequired && <span className="ml-0.5 text-danger">*</span>}
        </Label>
      )}
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        required={isRequired}
        disabled={isDisabled}
        variant={variant}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    </div>
  );
}

interface AppTextareaProps extends BaseFieldProps {
  rows?: number;
  variant?: "primary" | "secondary";
}

/** Labeled textarea. */
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
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label htmlFor={id}>
          {label}
          {isRequired && <span className="ml-0.5 text-danger">*</span>}
        </Label>
      )}
      <Textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        required={isRequired}
        disabled={isDisabled}
        variant={variant}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        style={{ resize: "vertical" }}
      />
    </div>
  );
}
