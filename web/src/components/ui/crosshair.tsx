import { cn } from '@/lib/utils';

export type CrosshairProps = {
  /** Position it from the parent, e.g. "absolute -top-[5px] -left-[5px]" */
  className?: string;
  /** ink for plate corners, accent while dragging */
  tone?: 'ink' | 'accent';
};

/** Registration mark: a "+" of two 1px lines, 11px wide. Decorative. */
export function Crosshair({ className, tone = 'ink' }: CrosshairProps) {
  const line = tone === 'ink' ? 'bg-ink' : 'bg-accent';
  return (
    <span aria-hidden className={cn('pointer-events-none relative block size-[11px]', className)}>
      <span className={cn('absolute top-1/2 left-0 h-px w-full -translate-y-1/2', line)} />
      <span className={cn('absolute top-0 left-1/2 h-full w-px -translate-x-1/2', line)} />
    </span>
  );
}
