import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type LabelProps = HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'div' | 'p' | 'h2' | 'h3' | 'dt' | 'dd';
};

/** Small mono caption: column heads, metadata lines, group names. */
export function Label({ as: Tag = 'span', className, ...props }: LabelProps) {
  return (
    <Tag
      className={cn(
        'font-mono text-label font-medium tracking-[0.12em] text-secondary uppercase tabular-nums',
        className,
      )}
      {...props}
    />
  );
}
