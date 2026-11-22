import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Required: the icon alone says nothing to a screen reader */
  'aria-label': string;
  children: ReactNode;
  variant?: 'ghost' | 'secondary';
  size?: 'md' | 'sm';
};

export function IconButton({
  variant = 'ghost',
  size = 'md',
  className,
  children,
  type = 'button',
  title,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      title={title ?? props['aria-label']}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control text-ink',
        'transition-colors duration-150 ease-out hover:bg-pressed active:bg-pressed',
        'disabled:text-disabled disabled:hover:bg-transparent',
        variant === 'secondary' && 'border border-control',
        size === 'md' ? 'size-10' : 'size-9',
        className,
      )}
      {...props}
    >
      <span aria-hidden className="inline-flex">
        {children}
      </span>
    </button>
  );
}
