'use client';

import Link from 'next/link';
import { PriorityMark, StatusMark } from '@/components/ui/marks';
import { Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useMoveTask } from '@/features/tasks/api';
import type { TaskStatus, TaskWithProject } from '@/lib/api/types';
import { dueLabel, formatShort, isOverdue, todayInSaoPaulo } from '@/lib/dates';
import { STATUS_LABEL, STATUS_ORDER } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { ProjectTag, taskHref } from './project-tag';

// The API places an out-of-range position at the end of the column.
const END_OF_COLUMN = 9999;

function DueCell({ task, today }: { task: TaskWithProject; today: string }) {
  if (task.status === 'DONE') {
    const done = task.completedAt ? formatShort(todayInSaoPaulo(new Date(task.completedAt))) : null;
    return <span className="text-secondary">{done ? `concluída em ${done}` : 'concluída'}</span>;
  }
  if (!task.dueDate) return <span className="text-secondary">Sem prazo</span>;

  const late = isOverdue(task.dueDate, task.status, today);
  return (
    <span
      className={cn(
        'flex flex-wrap items-baseline gap-x-2 min-[720px]:flex-col min-[720px]:items-end min-[720px]:gap-x-0',
        late && 'text-danger-text',
      )}
    >
      <span className="font-medium">{formatShort(task.dueDate)}</span>
      <span className={cn('text-xs', !late && 'text-secondary')}>
        {dueLabel(task.dueDate, today)}
      </span>
    </span>
  );
}

export function TaskRow({ task, today }: { task: TaskWithProject; today: string }) {
  const move = useMoveTask(task.projectId);
  const toast = useToast();
  const done = task.status === 'DONE';

  function changeStatus(status: TaskStatus) {
    if (status === task.status) return;
    // mutateAsync: the row may leave the list before a per-call callback would run
    move
      .mutateAsync({ id: task.id, status, position: END_OF_COLUMN })
      .then(() => toast.success(status === 'DONE' ? 'Tarefa concluída' : 'Status atualizado'))
      .catch(() => toast.error('Não foi possível atualizar a tarefa. Tente de novo.'));
  }

  return (
    <li
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-3',
        'min-[720px]:grid-cols-[7.5rem_minmax(0,1fr)_4.5rem_8rem_9.5rem] min-[720px]:items-center min-[720px]:gap-x-4',
      )}
    >
      <StatusMark status={task.status} className="hidden min-[720px]:inline-flex" />

      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={taskHref(task)}
          className={cn(
            'w-fit max-w-full rounded-chip text-sm font-medium break-words underline-offset-4 hover:underline',
            done && 'text-secondary line-through',
          )}
        >
          {task.title}
        </Link>
        <ProjectTag project={task.project} />
      </div>

      <div className="order-3 col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs min-[720px]:contents">
        <PriorityMark priority={task.priority} />
        <div className="text-xs min-[720px]:text-right">
          <DueCell task={task} today={today} />
        </div>
      </div>

      <Select
        aria-label={`Status de ${task.title}`}
        value={task.status}
        disabled={move.isPending}
        onChange={(event) => changeStatus(event.target.value as TaskStatus)}
        className="min-h-9 w-36 text-xs min-[720px]:w-full"
      >
        {STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </Select>
    </li>
  );
}
