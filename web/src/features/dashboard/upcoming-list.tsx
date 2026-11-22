import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { PriorityMark } from '@/components/ui/marks';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectTag, taskHref } from '@/features/my-tasks/project-tag';
import type { TaskWithProject } from '@/lib/api/types';
import { dueLabel, formatShort, isOverdue } from '@/lib/dates';
import { cn } from '@/lib/utils';

export const SECTION_LINK =
  'inline-flex min-h-9 items-center rounded-chip text-sm font-medium text-accent underline-offset-4 hover:underline';

function UpcomingRow({ task, today }: { task: TaskWithProject; today: string }) {
  const late = isOverdue(task.dueDate, task.status, today);
  return (
    <li>
      <Link
        href={taskHref(task)}
        className="flex items-start justify-between gap-4 px-4 py-3 transition-colors duration-150 ease-out hover:bg-pressed"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium break-words">{task.title}</span>
          <span className="flex min-w-0 items-center gap-x-4">
            <ProjectTag project={task.project} />
            <PriorityMark priority={task.priority} className="shrink-0" />
          </span>
        </span>
        {task.dueDate && (
          <span
            className={cn(
              'flex shrink-0 flex-col items-end text-right',
              late && 'text-danger-text',
            )}
          >
            <span className="text-sm font-medium">{formatShort(task.dueDate)}</span>
            <span className={cn('text-xs', !late && 'text-secondary')}>
              {dueLabel(task.dueDate, today)}
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}

export function UpcomingList({
  tasks,
  today,
}: {
  tasks: readonly TaskWithProject[];
  today: string;
}) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nada com prazo por aqui"
        description="Quando uma tarefa com prazo for atribuída a você, ela aparece nesta lista."
      />
    );
  }
  return (
    <>
      <ul className="divide-y divide-hairline rounded-card border border-edge bg-surface">
        {tasks.map((task) => (
          <UpcomingRow key={task.id} task={task} today={today} />
        ))}
      </ul>
      <Link href="/minhas-tarefas" className={cn(SECTION_LINK, 'mt-2 px-1')}>
        Ver todas as minhas tarefas
      </Link>
    </>
  );
}

export function UpcomingSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="Carregando próximas entregas"
      className="divide-y divide-hairline rounded-card border border-edge bg-surface"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-start justify-between gap-4 px-4 py-3.5">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}
