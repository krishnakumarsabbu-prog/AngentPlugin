import { useId } from "react";

interface InputProps {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  hint?: string;
  placeholder?: string;
  invalid?: boolean;
  errorText?: string;
  disabled?: boolean;
}

export function Input({
  label,
  value,
  onChange,
  hint,
  placeholder,
  invalid,
  errorText,
  disabled,
}: InputProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`input${invalid ? " invalid" : ""}`}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={[hint ? hintId : null, errorText ? errorId : null].filter(Boolean).join(" ") || undefined}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {hint && <span className="field-hint" id={hintId}>{hint}</span>}
      {errorText && <span className="field-error" id={errorId}>{errorText}</span>}
    </div>
  );
}
