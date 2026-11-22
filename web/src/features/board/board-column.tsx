'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Crosshair } from '@/components/ui/crosshair';
import { Label } from '@/components/ui/label';
import { Seal } from '@/components/ui/seal';
import type { Task, TaskStatus } from '@/lib/api/types';
import { STATUS_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { columnDroppableId } from './board-logic';
import { SortableTaskCard, type TaskCardHandlers } from './task-card';

export type BoardColumnProps = TaskCardHandlers & {
  index: number;
  status: TaskStatus;
  tasks: readonly Task[];
  today: string;
  canDelete: (task: Task) => boolean;
  reducedMotion: boolean;
  onCreate: (status: TaskStatus) => void;
};

/** One third of the plate: no box of its own, only the hairline that divides it from its neighbour. */
export function BoardColumn({
  index,
  status,
  tasks,
  today,
  canDelete,
  reducedMotion,
  onCreate,
  onOpen,
  onMove,
  onDelete,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: columnDroppableId(status) });
  const label = STATUS_LABEL[status];
  const count = tasks.length;

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        'relative flex flex-col border-hairline @min-[840px]:min-h-[22rem]',
        index > 0 && 'border-t @min-[840px]:border-t-0 @min-[840px]:border-l',
      )}
    >
      {index > 0 && (
        <>
          <Crosshair className="absolute -top-[6px] -left-[6px]" />
          {/* wide: the divider's lower end; stacked: the divider's right end */}
          <Crosshair className="absolute -bottom-[6px] -left-[6px] hidden @min-[840px]:block" />
          <Crosshair className="absolute -top-[6px] -right-[6px] @min-[840px]:hidden" />
        </>
      )}

      <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <Label as="h2" className="text-ink">
          {String(index + 1).padStart(2, '0')} {label}
        </Label>
        <Seal value={count} label={`${count} ${count === 1 ? 'tarefa' : 'tarefas'}`} />
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              today={today}
              canDelete={canDelete(task)}
              reducedMotion={reducedMotion}
              onOpen={onOpen}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {count === 0 && (
          <p className="py-6 text-center text-sm text-secondary">Nenhuma tarefa aqui</p>
        )}
      </div>

      <div className="px-2 pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          aria-label={`Nova tarefa em ${label}`}
          leadingIcon={<Plus className="size-4" />}
          onClick={() => onCreate(status)}
        >
          Nova tarefa
        </Button>
      </div>
    </section>
  );
}
