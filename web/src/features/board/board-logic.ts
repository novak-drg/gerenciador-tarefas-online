import type { Task, TaskStatus } from '@/lib/api/types';
import { STATUS_ORDER } from '@/lib/labels';

/** Task ids per column, in display order. */
export type ColumnIds = Record<TaskStatus, string[]>;

const COLUMN_PREFIX = 'column:';

export const columnDroppableId = (status: TaskStatus) => `${COLUMN_PREFIX}${status}`;

export function isColumnId(id: string): boolean {
  return id.startsWith(COLUMN_PREFIX);
}

function statusOfColumnId(id: string): TaskStatus | undefined {
  const status = id.slice(COLUMN_PREFIX.length);
  return STATUS_ORDER.find((s) => s === status);
}

/** Tasks per column, ordered by position. Does not mutate the input. */
export function groupByStatus(tasks: readonly Task[]): Record<TaskStatus, Task[]> {
  const columns: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const task of tasks) columns[task.status].push(task);
  for (const status of STATUS_ORDER) columns[status].sort((a, b) => a.position - b.position);
  return columns;
}

export function toColumnIds(columns: Record<TaskStatus, readonly Task[]>): ColumnIds {
  return {
    TODO: columns.TODO.map((t) => t.id),
    IN_PROGRESS: columns.IN_PROGRESS.map((t) => t.id),
    DONE: columns.DONE.map((t) => t.id),
  };
}

/** The column that holds `id`; a column droppable id resolves to its own status. */
export function findContainer(ids: ColumnIds, id: string): TaskStatus | undefined {
  if (isColumnId(id)) return statusOfColumnId(id);
  return STATUS_ORDER.find((status) => ids[status].includes(id));
}

/**
 * While dragging over another column the card is moved there at once, so the target slot (and the
 * count seals) follow the pointer. Returns the same object when nothing changes.
 * Over the column itself (its empty space) the card goes to the end.
 * `isBelowOver` is true when the dragged card sits past the middle of the card it is over.
 */
export function moveAcross(
  ids: ColumnIds,
  activeId: string,
  overId: string,
  isBelowOver: boolean,
): ColumnIds {
  const from = findContainer(ids, activeId);
  const to = findContainer(ids, overId);
  if (!from || !to) return ids;

  if (from === to) {
    // over the empty space below the last card of its own column: go to the end
    const column = ids[from];
    if (!isColumnId(overId) || column[column.length - 1] === activeId) return ids;
    return { ...ids, [from]: [...column.filter((id) => id !== activeId), activeId] };
  }

  const target = ids[to];
  const overIndex = target.indexOf(overId);
  const index = overIndex < 0 ? target.length : overIndex + (isBelowOver ? 1 : 0);
  return {
    ...ids,
    [from]: ids[from].filter((id) => id !== activeId),
    [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
  };
}

/** Final order after a drop: reorders inside the column the card ended in. */
export function settleDrop(ids: ColumnIds, activeId: string, overId: string): ColumnIds {
  const from = findContainer(ids, activeId);
  const to = findContainer(ids, overId);
  if (!from || !to || from !== to || isColumnId(overId)) return ids;

  const column = ids[from];
  const oldIndex = column.indexOf(activeId);
  const newIndex = column.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return ids;

  const next = [...column];
  next.splice(oldIndex, 1);
  next.splice(newIndex, 0, activeId);
  return { ...ids, [from]: next };
}

export type MoveTarget = { status: TaskStatus; position: number };

/** Where `id` sits in `ids`: the status and index to send to the move endpoint. */
export function locate(ids: ColumnIds, id: string): MoveTarget | undefined {
  const status = findContainer(ids, id);
  if (!status) return undefined;
  const position = ids[status].indexOf(id);
  return position < 0 ? undefined : { status, position };
}

/**
 * What to send to the API after a drop, or null when the card did not change place.
 * `original` is the order before the drag started, `current` the order while dragging.
 */
export function resolveDrop(
  original: ColumnIds,
  current: ColumnIds,
  activeId: string,
  overId: string | null,
): { ids: ColumnIds; target: MoveTarget } | null {
  if (!overId) return null;
  const ids = settleDrop(current, activeId, overId);
  const target = locate(ids, activeId);
  const before = locate(original, activeId);
  if (!target || !before) return null;
  if (target.status === before.status && target.position === before.position) return null;
  return { ids, target };
}
