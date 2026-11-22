import type { TaskWithProject } from '@/lib/api/types';
import { diffInDays } from '@/lib/dates';

export type TaskFilter = 'abertas' | 'concluidas' | 'todas';

export const FILTERS: readonly TaskFilter[] = ['abertas', 'concluidas', 'todas'];

export function parseFilter(value: string | null | undefined): TaskFilter {
  return FILTERS.find((f) => f === value) ?? 'abertas';
}

export type TaskGroupId = 'overdue' | 'today' | 'week' | 'later' | 'none';

export const GROUP_LABEL: Record<TaskGroupId, string> = {
  overdue: 'Atrasadas',
  today: 'Hoje',
  week: 'Próximos 7 dias',
  later: 'Depois',
  none: 'Sem prazo',
};

const GROUP_ORDER: readonly TaskGroupId[] = ['overdue', 'today', 'week', 'later', 'none'];

export type TaskGroup = { id: TaskGroupId; label: string; tasks: TaskWithProject[] };

export function groupOf(dueDate: string | null, today: string): TaskGroupId {
  if (dueDate === null) return 'none';
  const days = diffInDays(dueDate, today);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'week';
  return 'later';
}

export function isOpen(task: TaskWithProject): boolean {
  return task.status !== 'DONE';
}

/** Open tasks grouped by urgency, in display order; empty groups are left out. */
export function groupOpenTasks(tasks: readonly TaskWithProject[], today: string): TaskGroup[] {
  const buckets = new Map<TaskGroupId, TaskWithProject[]>();
  for (const task of tasks) {
    if (!isOpen(task)) continue;
    const id = groupOf(task.dueDate, today);
    const list = buckets.get(id);
    if (list) list.push(task);
    else buckets.set(id, [task]);
  }
  return GROUP_ORDER.flatMap((id) => {
    const list = buckets.get(id);
    if (!list) return [];
    const sorted = [...list].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    return [{ id, label: GROUP_LABEL[id], tasks: sorted }];
  });
}

/** Finished tasks, most recently completed first. */
export function sortCompleted(tasks: readonly TaskWithProject[]): TaskWithProject[] {
  return tasks
    .filter((t) => t.status === 'DONE')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export function countByFilter(tasks: readonly TaskWithProject[]): Record<TaskFilter, number> {
  const open = tasks.filter(isOpen).length;
  return { abertas: open, concluidas: tasks.length - open, todas: tasks.length };
}
