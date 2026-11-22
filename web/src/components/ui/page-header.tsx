import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Line under the title, e.g. a Label with the period */
  meta?: ReactNode;
  /** Buttons aligned to the right of the title */
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6', className)}
    >
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold text-balance">{title}</h1>
        {meta && <div className="mt-2">{meta}</div>}
        {description && <p className="mt-2 max-w-[65ch] text-sm text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
