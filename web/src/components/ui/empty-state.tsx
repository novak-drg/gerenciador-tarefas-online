import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-edge bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-[44ch] text-sm text-secondary">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
