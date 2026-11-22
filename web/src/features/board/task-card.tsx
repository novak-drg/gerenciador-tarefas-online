'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal } from 'lucide-react';
import { memo, type KeyboardEvent, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Crosshair } from '@/components/ui/crosshair';
import { PriorityMark } from '@/components/ui/marks';
import type { Task, TaskStatus } from '@/lib/api/types';
import { dueLabel, formatShort, isOverdue } from '@/lib/dates';
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { ActionMenu, type MenuEntry } from './action-menu';
import { instantToDate } from './format';

export type TaskCardHandlers = {
  onOpen: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onDelete: (task: Task) => void;
};

function cardLabel(task: Task): string {
  const parts = [task.title, `prioridade ${PRIORITY_LABEL[task.priority].toLowerCase()}`];
  parts.push(task.assignee ? `responsável ${task.assignee.name}` : 'sem responsável');
  if (task.status === 'DONE') parts.push('concluída');
  else if (task.dueDate) parts.push(`prazo ${formatShort(task.dueDate)}`);
  return parts.join(', ');
}

/** The card as drawn: also what the drag overlay shows. */
export function TaskCardBody({
  task,
  today,
  menu,
  className,
}: {
  task: Task;
  today: string;
  /** The menu button; the drag overlay passes a static stand-in */
  menu: ReactNode;
  className?: string;
}) {
  const done = task.status === 'DONE';
  const late = isOverdue(task.dueDate, task.status, today);

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-card border border-edge bg-surface p-3.5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            'line-clamp-3 min-w-0 text-[15px] leading-snug font-medium break-words',
            done && 'text-secondary line-through',
          )}
        >
          {task.title}
        </p>
        <div className="-mt-2 -mr-2.5 shrink-0">{menu}</div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <PriorityMark priority={task.priority} />
        {task.assignee ? (
          <Avatar name={task.assignee.name} size="sm" />
        ) : (
          <span className="rounded-chip border border-dashed border-control px-2 py-0.5 text-xs text-secondary">
            sem responsável
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 text-xs">
        {done ? (
          <span className="text-secondary">
            {task.completedAt
              ? `concluída em ${formatShort(instantToDate(task.completedAt))}`
              : 'concluída'}
          </span>
        ) : task.dueDate ? (
          <>
            <span className={cn(late ? 'font-medium text-danger-text' : 'text-ink')}>
              {formatShort(task.dueDate)}
            </span>
            <span className={cn(late ? 'font-medium text-danger-text' : 'text-secondary')}>
              {dueLabel(task.dueDate, today)}
            </span>
          </>
        ) : (
          <span className="text-secondary">sem prazo</span>
        )}
      </div>
    </div>
  );
}

/** Non-interactive menu button for the drag overlay. */
export function StaticMenuButton() {
  return (
    <span aria-hidden className="inline-flex size-9 items-center justify-center">
      <MoreHorizontal className="size-5" />
    </span>
  );
}

type SortableTaskCardProps = TaskCardHandlers & {
  task: Task;
  today: string;
  canDelete: boolean;
  reducedMotion: boolean;
};

function SortableTaskCardImpl({
  task,
  today,
  canDelete,
  reducedMotion,
  onOpen,
  onMove,
  onDelete,
}: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    transition: reducedMotion ? null : { duration: 180, easing: 'ease-out' },
    attributes: { role: 'group', roleDescription: 'tarefa arrastável' },
  });

  const entries: MenuEntry[] = [
    ...STATUS_ORDER.map<MenuEntry>((status) => ({
      type: 'item',
      key: `move-${status}`,
      label: `Mover para ${STATUS_LABEL[status]}`,
      disabled: status === task.status,
      onSelect: () => onMove(task, status),
    })),
    { type: 'separator', key: 'sep' },
    { type: 'item', key: 'edit', label: 'Editar', onSelect: () => onOpen(task) },
    ...(canDelete
      ? [
          {
            type: 'item',
            key: 'delete',
            label: 'Excluir',
            danger: true,
            onSelect: () => onDelete(task),
          } satisfies MenuEntry,
        ]
      : []),
  ];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    listeners?.onKeyDown?.(event);
    if (event.key === 'Enter' && event.target === event.currentTarget) {
      event.preventDefault();
      onOpen(task);
    }
  }

  const style = { transform: CSS.Translate.toString(transform), transition };

  if (isDragging) {
    // The slot the card would land in: invisible content keeps its height, crosshairs mark it
    return (
      <div ref={setNodeRef} style={style} className="relative">
        <div aria-hidden className="invisible">
          <TaskCardBody task={task} today={today} menu={<StaticMenuButton />} />
        </div>
        <div className="absolute inset-0 rounded-card border border-dashed border-accent-mid bg-accent-subtle/45" />
        <Crosshair tone="accent" className="absolute -top-[8.5px] -left-[8.5px] size-[17px]" />
        <Crosshair tone="accent" className="absolute -top-[8.5px] -right-[8.5px] size-[17px]" />
        <Crosshair tone="accent" className="absolute -bottom-[8.5px] -left-[8.5px] size-[17px]" />
        <Crosshair tone="accent" className="absolute -right-[8.5px] -bottom-[8.5px] size-[17px]" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={() => onOpen(task)}
      aria-label={cardLabel(task)}
      className="cursor-pointer rounded-card transition-colors duration-150 ease-out [&>div]:hover:border-control"
    >
      <TaskCardBody
        task={task}
        today={today}
        menu={<ActionMenu label="Mais ações" entries={entries} />}
      />
    </div>
  );
}

export const SortableTaskCard = memo(SortableTaskCardImpl);
