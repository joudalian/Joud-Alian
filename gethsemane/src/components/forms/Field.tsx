import type { HTMLInputTypeAttribute } from "react";

/** A labelled text input (server- or client-rendered). The hint, when given, is linked with aria-describedby. */
export function Field({
  name,
  label,
  type = "text",
  autoComplete,
  required = false,
  defaultValue,
  hint,
  minLength,
  maxLength,
  inputMode,
  id,
  pattern,
  optionalText,
}: {
  name: string;
  label: string;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  minLength?: number;
  maxLength?: number;
  inputMode?: "text" | "email" | "numeric" | "tel";
  id?: string;
  pattern?: string;
  /** Shown after the label of an optional field, e.g. "optional". */
  optionalText?: string;
}) {
  const fieldId = id ?? `f-${name}`;
  return (
    <div className="field">
      <label htmlFor={fieldId}>
        {label}
        {!required && optionalText && <span className="optional"> ({optionalText})</span>}
      </label>
      <input
        id={fieldId}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        minLength={minLength}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
        aria-describedby={hint ? `${fieldId}-hint` : undefined}
      />
      {hint && (
        <p className="note field-hint" id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}
