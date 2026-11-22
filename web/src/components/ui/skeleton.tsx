import { cn } from '@/lib/utils';

/** Loading placeholder block; size it with className. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-chip bg-recess', className)} />;
}
