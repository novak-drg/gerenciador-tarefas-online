import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap ' +
  'transition-colors duration-150 ease-out select-none disabled:cursor-not-allowed';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-on-ink hover:bg-ink-hover active:bg-ink-hover disabled:bg-disabled disabled:text-surface',
  secondary:
    'border border-control bg-transparent text-ink hover:bg-pressed active:bg-pressed disabled:border-hairline disabled:text-disabled',
  ghost: 'bg-transparent text-ink hover:bg-pressed active:bg-pressed disabled:text-disabled',
  danger:
    'border border-control bg-transparent text-danger-text hover:bg-danger-bg active:bg-danger-bg disabled:border-hairline disabled:text-disabled',
};

// 40px for the default size (primary actions), 36px for the compact one
const sizes: Record<ButtonSize, string> = {
  md: 'min-h-10 px-4 text-sm',
  sm: 'min-h-9 px-3 text-sm',
};

/** Class names of a button, for links that must look like one. */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button */
  loading?: boolean;
  leadingIcon?: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden className="size-4 animate-spin" />
      ) : (
        leadingIcon && (
          <span aria-hidden className="inline-flex">
            {leadingIcon}
          </span>
        )
      )}
      {children}
    </button>
  );
}
