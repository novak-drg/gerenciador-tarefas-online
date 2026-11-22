import { describe, expect, it } from 'vitest';
import type { TaskStatus } from '@/common/contract';
import { reorderTasks, type TaskPlacement } from './reorder';

const task = (id: string, status: TaskStatus, position: number): TaskPlacement => ({
  id,
  status,
  position,
});

/** Applies the returned placements and reads the resulting order of each column. */
function apply(tasks: TaskPlacement[], changes: TaskPlacement[]): Record<TaskStatus, string[]> {
  const byId = new Map(tasks.map((item) => [item.id, { ...item }]));
  for (const change of changes) byId.set(change.id, change);
  const columns: Record<TaskStatus, TaskPlacement[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const item of byId.values()) columns[item.status].push(item);
  for (const list of Object.values(columns)) {
    list.sort((a, b) => a.position - b.position);
    expect(list.map((item) => item.position)).toEqual(list.map((_, index) => index));
  }
  return {
    TODO: columns.TODO.map((item) => item.id),
    IN_PROGRESS: columns.IN_PROGRESS.map((item) => item.id),
    DONE: columns.DONE.map((item) => item.id),
  };
}

const board = (): TaskPlacement[] => [
  task('a', 'TODO', 0),
  task('b', 'TODO', 1),
  task('c', 'TODO', 2),
  task('d', 'IN_PROGRESS', 0),
  task('e', 'IN_PROGRESS', 1),
];

describe('reorderTasks', () => {
  it('moves a task down inside the same column', () => {
    const tasks = board();
    const result = apply(tasks, reorderTasks(tasks, 'a', 'TODO', 2));
    expect(result.TODO).toEqual(['b', 'c', 'a']);
  });

  it('moves a task up inside the same column', () => {
    const tasks = board();
    const result = apply(tasks, reorderTasks(tasks, 'c', 'TODO', 0));
    expect(result.TODO).toEqual(['c', 'a', 'b']);
  });

  it('only returns the tasks whose placement changed', () => {
    const changes = reorderTasks(board(), 'a', 'TODO', 1);
    expect(changes.map((change) => change.id).sort()).toEqual(['a', 'b']);
  });

  it('returns nothing when the task stays where it is', () => {
    expect(reorderTasks(board(), 'b', 'TODO', 1)).toEqual([]);
  });

  it('moves across columns, closing the gap and opening a slot', () => {
    const tasks = board();
    const result = apply(tasks, reorderTasks(tasks, 'a', 'IN_PROGRESS', 1));
    expect(result.TODO).toEqual(['b', 'c']);
    expect(result.IN_PROGRESS).toEqual(['d', 'a', 'e']);
  });

  it('moves to the top of another column', () => {
    const tasks = board();
    const result = apply(tasks, reorderTasks(tasks, 'e', 'TODO', 0));
    expect(result.TODO).toEqual(['e', 'a', 'b', 'c']);
    expect(result.IN_PROGRESS).toEqual(['d']);
  });

  it('clamps a position past the end to the end of the column', () => {
    const tasks = board();
    const result = apply(tasks, reorderTasks(tasks, 'a', 'IN_PROGRESS', 99));
    expect(result.IN_PROGRESS).toEqual(['d', 'e', 'a']);
    const same = apply(tasks, reorderTasks(tasks, 'a', 'TODO', 99));
    expect(same.TODO).toEqual(['b', 'c', 'a']);
  });

  it('puts a negative position at the end of the column', () => {
    const tasks = board();
    const result = apply(tasks, reorderTasks(tasks, 'd', 'TODO', -3));
    expect(result.TODO).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles a column with a single task', () => {
    const tasks = [task('a', 'TODO', 0)];
    expect(reorderTasks(tasks, 'a', 'TODO', 0)).toEqual([]);
    expect(reorderTasks(tasks, 'a', 'TODO', 5)).toEqual([]);
  });

  it('moves into an empty column and empties the origin', () => {
    const tasks = [task('a', 'TODO', 0)];
    const changes = reorderTasks(tasks, 'a', 'DONE', 0);
    expect(changes).toEqual([{ id: 'a', status: 'DONE', position: 0 }]);
    const result = apply(tasks, changes);
    expect(result).toEqual({ TODO: [], IN_PROGRESS: [], DONE: ['a'] });
  });

  it('does not depend on the order of the input list', () => {
    const tasks = board().reverse();
    const result = apply(tasks, reorderTasks(tasks, 'a', 'TODO', 2));
    expect(result.TODO).toEqual(['b', 'c', 'a']);
  });

  it('rejects an unknown task id', () => {
    expect(() => reorderTasks(board(), 'zzz', 'TODO', 0)).toThrow();
  });
});
