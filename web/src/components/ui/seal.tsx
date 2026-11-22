import { cn } from '@/lib/utils';

export type SealProps = {
  value: number | string;
  /** Spoken name, e.g. "3 tarefas"; the number alone is read otherwise */
  label?: string;
  className?: string;
};

/** Count seal: a number in ink on the mid accent disc, readable on the beige scene. */
export function Seal({ value, label, className }: SealProps) {
  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-accent-mid px-1.5',
        'text-[13px] leading-none font-semibold text-ink tabular-nums',
        className,
      )}
    >
      {value}
    </span>
  );
}
