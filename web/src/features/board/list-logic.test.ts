import { describe, expect, it } from 'vitest';
import type { Task, TaskPriority, TaskStatus, User } from '@/lib/api/types';
import {
  ALL,
  DEFAULT_SORT,
  NO_ASSIGNEE,
  filterTasks,
  hasActiveFilters,
  nextSort,
  sortTasks,
} from './list-logic';

const helena: User = { id: 'u1', name: 'Helena Martins', email: 'h@x.dev' };
const rafael: User = { id: 'u2', name: 'Rafael Souza', email: 'r@x.dev' };

function task(id: string, status: TaskStatus, position: number, extra: Partial<Task> = {}): Task {
  return {
    id,
    projectId: 'p1',
    title: id,
    description: null,
    status,
    priority: 'MEDIUM' as TaskPriority,
    position,
    dueDate: null,
    assignee: null,
    createdBy: helena,
    completedAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...extra,
  };
}

const tasks = [
  task('Revisar texto', 'DONE', 0, { priority: 'LOW', assignee: rafael, dueDate: '2026-11-10' }),
  task('Árvore de decisão', 'TODO', 1, {
    priority: 'HIGH',
    assignee: helena,
    dueDate: '2026-12-01',
  }),
  task('Briefing', 'TODO', 0, { priority: 'MEDIUM' }),
  task('Protótipo', 'IN_PROGRESS', 0, {
    priority: 'HIGH',
    assignee: rafael,
    dueDate: '2026-11-20',
  }),
];

const ids = (list: Task[]) => list.map((t) => t.id);

describe('filterTasks', () => {
  it('keeps everything with no filters', () => {
    expect(filterTasks(tasks, { status: ALL, assignee: ALL })).toHaveLength(4);
  });

  it('filters by status', () => {
    expect(ids(filterTasks(tasks, { status: 'TODO', assignee: ALL }))).toEqual([
      'Árvore de decisão',
      'Briefing',
    ]);
  });

  it('filters by assignee, including nobody', () => {
    expect(ids(filterTasks(tasks, { status: ALL, assignee: 'u2' }))).toEqual([
      'Revisar texto',
      'Protótipo',
    ]);
    expect(ids(filterTasks(tasks, { status: ALL, assignee: NO_ASSIGNEE }))).toEqual(['Briefing']);
  });

  it('combines both filters', () => {
    expect(filterTasks(tasks, { status: 'DONE', assignee: 'u1' })).toEqual([]);
  });

  it('reports whether any filter is active', () => {
    expect(hasActiveFilters({ status: ALL, assignee: ALL })).toBe(false);
    expect(hasActiveFilters({ status: 'DONE', assignee: ALL })).toBe(true);
  });
});

describe('sortTasks', () => {
  it('defaults to status then position', () => {
    expect(ids(sortTasks(tasks, DEFAULT_SORT))).toEqual([
      'Briefing',
      'Árvore de decisão',
      'Protótipo',
      'Revisar texto',
    ]);
  });

  it('reverses the board order for status descending', () => {
    expect(ids(sortTasks(tasks, { key: 'status', direction: 'desc' }))[0]).toBe('Revisar texto');
  });

  it('sorts titles with Portuguese collation, ignoring accents', () => {
    expect(ids(sortTasks(tasks, { key: 'title', direction: 'asc' }))).toEqual([
      'Árvore de decisão',
      'Briefing',
      'Protótipo',
      'Revisar texto',
    ]);
  });

  it('puts the highest priority first when ascending', () => {
    const sorted = sortTasks(tasks, { key: 'priority', direction: 'asc' });
    expect(ids(sorted)).toEqual(['Árvore de decisão', 'Protótipo', 'Briefing', 'Revisar texto']);
  });

  it('keeps empty due dates last in both directions', () => {
    expect(ids(sortTasks(tasks, { key: 'dueDate', direction: 'asc' }))).toEqual([
      'Revisar texto',
      'Protótipo',
      'Árvore de decisão',
      'Briefing',
    ]);
    expect(ids(sortTasks(tasks, { key: 'dueDate', direction: 'desc' }))).toEqual([
      'Árvore de decisão',
      'Protótipo',
      'Revisar texto',
      'Briefing',
    ]);
  });

  it('keeps unassigned tasks last when sorting by assignee', () => {
    const sorted = sortTasks(tasks, { key: 'assignee', direction: 'asc' });
    expect(ids(sorted)).toEqual(['Árvore de decisão', 'Protótipo', 'Revisar texto', 'Briefing']);
    expect(ids(sortTasks(tasks, { key: 'assignee', direction: 'desc' })).at(-1)).toBe('Briefing');
  });

  it('does not mutate its input', () => {
    const before = ids(tasks);
    sortTasks(tasks, { key: 'title', direction: 'desc' });
    expect(ids(tasks)).toEqual(before);
  });
});

describe('nextSort', () => {
  it('flips the active column and resets a new one to ascending', () => {
    expect(nextSort(DEFAULT_SORT, 'status')).toEqual({ key: 'status', direction: 'desc' });
    expect(nextSort({ key: 'status', direction: 'desc' }, 'title')).toEqual({
      key: 'title',
      direction: 'asc',
    });
  });
});
