import type { ChangeEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  as?: "input" | "textarea" | "select";
  children?: ReactNode;
  helper?: string;
  value?: string;
  name?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url";
  maxLength?: number;
  onChange?: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
};

export function Field({
  id,
  label,
  type = "text",
  autoComplete,
  required,
  disabled,
  readOnly,
  as = "input",
  children,
  helper,
  value,
  name,
  placeholder,
  inputMode,
  maxLength,
  onChange,
}: FieldProps) {
  const controlClass = cn(
    "w-full rounded-lg border border-border bg-background px-3.5 py-3 text-sm text-foreground shadow-sm outline-none transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/25",
    (disabled || readOnly) && "cursor-not-allowed bg-muted/60 text-muted-foreground"
  );

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}{required ? <span className="ml-1 text-destructive" aria-hidden="true">*</span> : null}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          name={name ?? id}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          rows={5}
          {...(value !== undefined ? { value } : {})}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(controlClass, "min-h-32 resize-y")}
        />
      ) : as === "select" ? (
        <select
          id={id}
          name={name ?? id}
          required={required}
          disabled={disabled}
          {...(value !== undefined ? { value } : {})}
          onChange={onChange}
          className={controlClass}
        >
          {children}
        </select>
      ) : (
        <input
          id={id}
          name={name ?? id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          {...(value !== undefined ? { value } : {})}
          onChange={onChange}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          className={controlClass}
        />
      )}
      {helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
