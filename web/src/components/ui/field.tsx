'use client';

import { createContext, useContext, useId, type AriaAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type FieldControlContext = {
  id: string;
  describedBy?: string;
  invalid: boolean;
};

const FieldContext = createContext<FieldControlContext | null>(null);

/** Props that Input, Textarea and Select take from the surrounding Field. */
export function useFieldControl(
  own: {
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: AriaAttributes['aria-invalid'];
  } = {},
) {
  const ctx = useContext(FieldContext);
  const describedBy =
    [own['aria-describedby'], ctx?.describedBy].filter(Boolean).join(' ') || undefined;
  const invalid = own['aria-invalid'] === true || own['aria-invalid'] === 'true' || ctx?.invalid;
  return {
    id: own.id ?? ctx?.id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid ? (true as const) : undefined,
    invalid: Boolean(invalid),
  };
}

export type FieldProps = {
  label: string;
  /** Helper text under the control */
  hint?: ReactNode;
  /** Error message; marks the control invalid */
  error?: string;
  /** Appends "(opcional)" to the caption */
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Caption + control + hint + error, wired with htmlFor, aria-describedby and aria-invalid. */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const uid = useId();
  const id = `${uid}-control`;
  const hintId = hint ? `${uid}-hint` : undefined;
  const errorId = error ? `${uid}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="font-mono text-label font-medium tracking-[0.12em] text-secondary uppercase"
      >
        {label}
        {optional && <span className="tracking-normal normal-case"> (opcional)</span>}
      </label>
      <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
        {children}
      </FieldContext.Provider>
      {hint && (
        <p id={hintId} className="text-xs text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
