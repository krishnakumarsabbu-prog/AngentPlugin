import { useId } from "react";

interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ label, description, checked, onChange, disabled }: CheckboxProps) {
  const id = useId();
  return (
    <div className="checkbox-row">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} style={{ cursor: "pointer" }}>
        <span className="settings-row-title">{label}</span>
        {description && <span className="settings-row-desc" style={{ display: "block" }}>{description}</span>}
      </label>
    </div>
  );
}
