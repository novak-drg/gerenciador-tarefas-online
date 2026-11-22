import type { Task, TaskStatus } from '@/lib/api/types';
import { STATUS_ORDER } from '@/lib/labels';

/**
 * Client-side mirror of the API's move rule, used for the optimistic update: take the task out,
 * insert it in the target column at `position` (clamped to the end), renumber both columns from 0
 * and return the list ordered by status then position. The server's answer replaces this result.
 */
export function applyMove<T extends Task>(
  tasks: readonly T[],
  taskId: string,
  status: TaskStatus,
  position: number,
  now: string = new Date().toISOString(),
): T[] {
  const moving = tasks.find((t) => t.id === taskId);
  if (!moving) return [...tasks];

  const columns = new Map<TaskStatus, T[]>(STATUS_ORDER.map((s) => [s, [] as T[]]));
  const ordered = [...tasks].sort((a, b) => a.position - b.position);
  for (const task of ordered) {
    if (task.id === taskId) continue;
    columns.get(task.status)?.push(task);
  }

  const target = columns.get(status) ?? [];
  // same rule as the API: outside the column (negative or past the end) means the end
  const index = position >= 0 && position <= target.length ? Math.trunc(position) : target.length;
  const moved: T = {
    ...moving,
    status,
    completedAt: status === 'DONE' ? (moving.completedAt ?? now) : null,
  };
  target.splice(index, 0, moved);
  columns.set(status, target);

  const result: T[] = [];
  for (const column of STATUS_ORDER) {
    (columns.get(column) ?? []).forEach((task, i) => result.push({ ...task, position: i }));
  }
  return result;
}
