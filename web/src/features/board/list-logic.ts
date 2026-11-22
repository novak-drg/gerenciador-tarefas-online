import type { Task, TaskStatus } from '@/lib/api/types';
import { PRIORITY_ORDER, STATUS_ORDER } from '@/lib/labels';

export type SortKey = 'title' | 'status' | 'priority' | 'assignee' | 'dueDate';
export type SortDirection = 'asc' | 'desc';
export type SortState = { key: SortKey; direction: SortDirection };

/** Status then position: the order of the board read column by column. */
export const DEFAULT_SORT: SortState = { key: 'status', direction: 'asc' };

export const ALL = 'ALL';
export const NO_ASSIGNEE = 'NONE';

export type TaskFilters = {
  status: TaskStatus | typeof ALL;
  /** ALL, NO_ASSIGNEE or a user id */
  assignee: string;
};

export const NO_FILTERS: TaskFilters = { status: ALL, assignee: ALL };

export function hasActiveFilters(filters: TaskFilters): boolean {
  return filters.status !== ALL || filters.assignee !== ALL;
}

export function filterTasks(tasks: readonly Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    if (filters.status !== ALL && task.status !== filters.status) return false;
    if (filters.assignee === ALL) return true;
    if (filters.assignee === NO_ASSIGNEE) return task.assignee === null;
    return task.assignee?.id === filters.assignee;
  });
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const statusRank = (task: Task) => STATUS_ORDER.indexOf(task.status);

function byBoardOrder(a: Task, b: Task): number {
  return statusRank(a) - statusRank(b) || a.position - b.position;
}

/**
 * Sorts a copy. Empty values (no due date, nobody assigned) always go last, whatever the
 * direction. Ties fall back to board order so the result is stable and predictable.
 */
export function sortTasks(tasks: readonly Task[], sort: SortState): Task[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  const compare = (a: Task, b: Task): number => {
    switch (sort.key) {
      case 'status':
        return sign * (statusRank(a) - statusRank(b)) || sign * (a.position - b.position);
      case 'title':
        return sign * collator.compare(a.title, b.title) || byBoardOrder(a, b);
      case 'priority':
        return (
          sign * (PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)) ||
          byBoardOrder(a, b)
        );
      case 'assignee': {
        if (!a.assignee || !b.assignee) {
          if (a.assignee === b.assignee) return byBoardOrder(a, b);
          return a.assignee ? -1 : 1;
        }
        return sign * collator.compare(a.assignee.name, b.assignee.name) || byBoardOrder(a, b);
      }
      case 'dueDate': {
        if (!a.dueDate || !b.dueDate) {
          if (a.dueDate === b.dueDate) return byBoardOrder(a, b);
          return a.dueDate ? -1 : 1;
        }
        if (a.dueDate === b.dueDate) return byBoardOrder(a, b);
        return sign * (a.dueDate < b.dueDate ? -1 : 1);
      }
    }
  };
  return [...tasks].sort(compare);
}

/** Clicking the active header flips the direction; a new header starts ascending. */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: 'asc' };
}
