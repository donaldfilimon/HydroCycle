import type { ChangeEvent, ReactNode } from "react";

interface NumberFieldProps {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  nullable?: boolean;
  help?: ReactNode;
  onChange: (value: number | null) => void;
}

export function NumberField({
  id,
  label,
  value,
  unit,
  min,
  max,
  step = 0.1,
  nullable = false,
  help,
  onChange,
}: NumberFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.currentTarget.value;
    if (nullable && raw === "") {
      onChange(null);
      return;
    }
    const next = Number(raw);
    if (Number.isFinite(next)) onChange(next);
  }

  return (
    <div className="number-field">
      <label htmlFor={id}>{label}</label>
      <span className="number-field__control">
        <input
          id={id}
          type="number"
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
        />
        <span>{unit}</span>
      </span>
      {help ? <small>{help}</small> : null}
    </div>
  );
}
