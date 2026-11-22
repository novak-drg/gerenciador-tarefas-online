'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Crosshair } from '@/components/ui/crosshair';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { useDeleteTask, useMoveTask } from '@/features/tasks/api';
import type { Project, Task, TaskStatus } from '@/lib/api/types';
import { STATUS_LABEL, STATUS_ORDER } from '@/lib/labels';
import { BoardColumn } from './board-column';
import {
  findContainer,
  groupByStatus,
  isColumnId,
  locate,
  moveAcross,
  resolveDrop,
  settleDrop,
  toColumnIds,
  type ColumnIds,
} from './board-logic';
import { StaticMenuButton, TaskCardBody } from './task-card';
import { useReducedMotion } from './use-reduced-motion';

const INSTRUCTIONS =
  'Para mover a tarefa, pressione Espaço, use as setas para escolher o lugar e pressione Espaço para soltar. ' +
  'Escape cancela. Enter abre a tarefa.';

const SETTLE_MS = 180;

export type BoardProps = {
  project: Project;
  tasks: readonly Task[];
  today: string;
  onOpenTask: (task: Task) => void;
  onCreateTask: (status: TaskStatus) => void;
};

export function Board({ project, tasks, today, onOpenTask, onCreateTask }: BoardProps) {
  const { user: me } = useSession();
  const toast = useToast();
  const reducedMotion = useReducedMotion();
  const moveTask = useMoveTask(project.id);
  const deleteTask = useDeleteTask(project.id);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const serverColumns = useMemo(() => groupByStatus(tasks), [tasks]);
  const serverIds = useMemo(() => toColumnIds(serverColumns), [serverColumns]);

  // While dragging (and until the server list catches up) the board shows this order instead
  const [override, setOverride] = useState<{ basedOn: readonly Task[]; ids: ColumnIds } | null>(
    null,
  );
  const ids = override && override.basedOn === tasks ? override.ids : serverIds;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const idsRef = useRef(ids);
  useEffect(() => {
    idsRef.current = ids;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const columnsByStatus = useMemo(() => {
    const result = {} as Record<TaskStatus, Task[]>;
    for (const status of STATUS_ORDER) {
      result[status] = ids[status].flatMap((id) => {
        const task = tasksById.get(id);
        return task ? [task] : [];
      });
    }
    return result;
  }, [ids, tasksById]);

  const canDelete = useCallback(
    (task: Task) => project.role === 'OWNER' || task.createdBy.id === me.id,
    [project.role, me.id],
  );

  const sendMove = useCallback(
    (id: string, status: TaskStatus, position: number) => {
      moveTask.mutate(
        { id, status, position },
        { onError: () => toast.error('Não foi possível mover a tarefa. Tente de novo.') },
      );
    },
    [moveTask, toast],
  );

  const onMoveFromMenu = useCallback(
    (task: Task, status: TaskStatus) => {
      if (task.status === status) return;
      sendMove(task.id, status, serverIds[status].length);
    },
    [sendMove, serverIds],
  );

  // Pointer over a card: that card. Over a column's gaps or empty space: the nearest card of that
  // column, or the column itself below its last card.
  const detectCollisions = useCallback<CollisionDetection>((args) => {
    const within = pointerWithin(args);
    const cards = within.filter((c) => !isColumnId(String(c.id)));
    if (cards.length > 0) return cards;

    const column = within[0];
    if (column && args.pointerCoordinates) {
      const status = findContainer(idsRef.current, String(column.id));
      const columnIds = status ? idsRef.current[status] : [];
      const pointerY = args.pointerCoordinates.y;
      let best: { id: string; distance: number } | null = null;
      let lowest = -Infinity;
      for (const container of args.droppableContainers) {
        const id = String(container.id);
        if (!columnIds.includes(id)) continue;
        const rect = args.droppableRects.get(container.id);
        if (!rect) continue;
        lowest = Math.max(lowest, rect.top + rect.height);
        const distance = Math.abs(pointerY - (rect.top + rect.height / 2));
        if (!best || distance < best.distance) best = { id, distance };
      }
      if (best && pointerY <= lowest) return [{ id: best.id }];
      return [{ id: column.id }];
    }

    const fallback = closestCorners(args);
    const fallbackCards = fallback.filter((c) => !isColumnId(String(c.id)));
    return fallbackCards.length > 0 ? fallbackCards : fallback;
  }, []);

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const rect = active.rect.current.translated;
    // compare centres: the dragged card is below once its middle passes the middle of the card it is over
    const isBelow = rect
      ? rect.top + rect.height / 2 > over.rect.top + over.rect.height / 2
      : false;
    const next = moveAcross(ids, String(active.id), String(over.id), isBelow);
    if (next !== ids) setOverride({ basedOn: tasks, ids: next });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const id = String(active.id);
    const result = resolveDrop(serverIds, ids, id, over ? String(over.id) : null);
    if (!result) {
      setOverride(null);
      return;
    }
    // keep the dropped order on screen until the optimistic update lands
    setOverride({ basedOn: tasks, ids: result.ids });
    sendMove(id, result.target.status, result.target.position);
  }

  function onDragCancel() {
    setActiveId(null);
    setOverride(null);
  }

  const announcements = useMemo<Announcements>(() => {
    const title = (id: string | number) => `"${tasksById.get(String(id))?.title ?? 'tarefa'}"`;
    const where = (current: ColumnIds, id: string) => {
      const spot = locate(current, id);
      if (!spot) return '';
      return `${STATUS_LABEL[spot.status]}, posição ${spot.position + 1} de ${current[spot.status].length}`;
    };
    return {
      onDragStart: ({ active }) =>
        `Tarefa ${title(active.id)} pega. ${where(ids, String(active.id))}.`,
      onDragOver: ({ active, over }) => {
        if (!over) return `Tarefa ${title(active.id)} fora das colunas.`;
        if (isColumnId(String(over.id))) {
          const status = findContainer(ids, String(over.id));
          return status
            ? `Tarefa ${title(active.id)} sobre a coluna ${STATUS_LABEL[status]}.`
            : undefined;
        }
        return `Tarefa ${title(active.id)} sobre ${where(ids, String(over.id))}.`;
      },
      onDragEnd: ({ active, over }) => {
        if (!over)
          return `Tarefa ${title(active.id)} solta fora das colunas. Ela voltou ao lugar de origem.`;
        const final = settleDrop(ids, String(active.id), String(over.id));
        return `Tarefa ${title(active.id)} solta. ${where(final, String(active.id))}.`;
      },
      onDragCancel: ({ active }) =>
        `Movimento cancelado. Tarefa ${title(active.id)} voltou ao lugar de origem.`,
    };
  }, [ids, tasksById]);

  const dropAnimation: DropAnimation | null = reducedMotion
    ? null
    : { duration: SETTLE_MS, easing: 'ease-out' };

  const activeTask = activeId ? tasksById.get(activeId) : undefined;

  return (
    <>
      <DndContext
        id="board"
        sensors={sensors}
        collisionDetection={detectCollisions}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: INSTRUCTIONS },
        }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="@container">
          <div className="relative grid grid-cols-1 border border-hairline @min-[840px]:grid-cols-3">
            <Crosshair className="absolute -top-[6px] -left-[6px] z-10" />
            <Crosshair className="absolute -top-[6px] -right-[6px] z-10" />
            <Crosshair className="absolute -bottom-[6px] -left-[6px] z-10" />
            <Crosshair className="absolute -right-[6px] -bottom-[6px] z-10" />
            {STATUS_ORDER.map((status, index) => (
              <BoardColumn
                key={status}
                index={index}
                status={status}
                tasks={columnsByStatus[status]}
                today={today}
                canDelete={canDelete}
                reducedMotion={reducedMotion}
                onCreate={onCreateTask}
                onOpen={onOpenTask}
                onMove={onMoveFromMenu}
                onDelete={setDeleting}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <TaskCardBody
              task={activeTask}
              today={today}
              menu={<StaticMenuButton />}
              className="cursor-grabbing border-control shadow-float"
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Excluir tarefa?"
        description={`${deleting?.title ?? ''} será removida do projeto. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir tarefa"
        destructive
        loading={deleteTask.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteTask.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Tarefa excluída');
              setDeleting(null);
            },
            onError: (error) => {
              toast.error(error.message);
              setDeleting(null);
            },
          });
        }}
      />
    </>
  );
}
