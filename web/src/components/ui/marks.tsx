import type { TaskPriority, TaskStatus } from '@/lib/api/types';
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';

// Shapes carry the meaning; colour only reinforces it.

function PriorityShape({ priority }: { priority: TaskPriority }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0" fill="none">
      {priority === 'HIGH' && <path d="M6 1.5 11 10.5H1Z" className="fill-danger" />}
      {priority === 'MEDIUM' && <rect x="2" y="2" width="8" height="8" className="fill-warning" />}
      {priority === 'LOW' && (
        <path d="M6 10.5 1 1.5H11Z" className="stroke-secondary" strokeWidth="1.25" />
      )}
    </svg>
  );
}

export type PriorityMarkProps = { priority: TaskPriority; className?: string };

/** ▲ Alta / ■ Média / ▽ Baixa: shape and text, never colour alone. */
export function PriorityMark({ priority, className }: PriorityMarkProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-ink', className)}
    >
      <PriorityShape priority={priority} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function StatusShape({ status }: { status: TaskStatus }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0" fill="none">
      {status === 'TODO' && (
        <rect
          x="1.5"
          y="1.5"
          width="9"
          height="9"
          className="stroke-secondary"
          strokeWidth="1.25"
        />
      )}
      {status === 'IN_PROGRESS' && (
        <>
          <rect x="1.5" y="1.5" width="9" height="9" className="stroke-accent" strokeWidth="1.25" />
          <rect x="1.5" y="6" width="9" height="4.5" className="fill-accent" />
        </>
      )}
      {status === 'DONE' && <rect x="1" y="1" width="10" height="10" className="fill-success" />}
    </svg>
  );
}

export type StatusMarkProps = { status: TaskStatus; className?: string };

/** Empty, half-filled or filled square with the status name. */
export function StatusMark({ status, className }: StatusMarkProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-ink', className)}
    >
      <StatusShape status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}
