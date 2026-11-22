'use client';

import type { InputHTMLAttributes, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFieldControl } from './field';

export const controlStyles =
  'w-full rounded-control border bg-elevated px-3 text-sm text-ink transition-colors duration-150 ease-out ' +
  'placeholder:text-placeholder hover:border-ink focus-visible:border-accent ' +
  'disabled:border-hairline disabled:bg-pressed disabled:text-disabled disabled:hover:border-hairline';

const borderFor = (invalid: boolean) => (invalid ? 'border-danger' : 'border-control');

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };

export function Input({ className, ...props }: InputProps) {
  const control = useFieldControl(props);
  return (
    <input
      {...props}
      id={control.id}
      aria-describedby={control['aria-describedby']}
      aria-invalid={control['aria-invalid']}
      className={cn(controlStyles, 'min-h-10', borderFor(control.invalid), className)}
    />
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  const control = useFieldControl(props);
  return (
    <textarea
      rows={rows}
      {...props}
      id={control.id}
      aria-describedby={control['aria-describedby']}
      aria-invalid={control['aria-invalid']}
      className={cn(controlStyles, 'min-h-20 resize-y py-2', borderFor(control.invalid), className)}
    />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  ref?: Ref<HTMLSelectElement>;
};

/** Native select with the control chrome. */
export function Select({ className, children, ...props }: SelectProps) {
  const control = useFieldControl(props);
  return (
    <div className="relative">
      <select
        {...props}
        id={control.id}
        aria-describedby={control['aria-describedby']}
        aria-invalid={control['aria-invalid']}
        className={cn(
          controlStyles,
          'min-h-10 appearance-none pr-9',
          borderFor(control.invalid),
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-secondary"
      />
    </div>
  );
}
