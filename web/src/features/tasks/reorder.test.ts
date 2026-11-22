import { describe, expect, it } from 'vitest';
import type { Task, TaskStatus } from '@/lib/api/types';
import { applyMove } from './reorder';

const user = { id: 'u1', name: 'Helena', email: 'h@x.dev' };

function task(id: string, status: TaskStatus, position: number): Task {
  return {
    id,
    projectId: 'p1',
    title: id,
    description: null,
    status,
    priority: 'MEDIUM',
    position,
    dueDate: null,
    assignee: null,
    createdBy: user,
    completedAt: status === 'DONE' ? '2026-11-01T00:00:00.000Z' : null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

const board = [
  task('a', 'TODO', 0),
  task('b', 'TODO', 1),
  task('c', 'TODO', 2),
  task('d', 'IN_PROGRESS', 0),
  task('e', 'DONE', 0),
];

const summary = (tasks: Task[]) => tasks.map((t) => `${t.status}:${t.position}:${t.id}`);

describe('applyMove', () => {
  it('moves across columns and closes the gap', () => {
    const result = applyMove(board, 'a', 'IN_PROGRESS', 0);
    expect(summary(result)).toEqual([
      'TODO:0:b',
      'TODO:1:c',
      'IN_PROGRESS:0:a',
      'IN_PROGRESS:1:d',
      'DONE:0:e',
    ]);
  });

  it('reorders inside a column using the final index', () => {
    const result = applyMove(board, 'a', 'TODO', 2);
    expect(summary(result).slice(0, 3)).toEqual(['TODO:0:b', 'TODO:1:c', 'TODO:2:a']);
  });

  it('sends a position past the end, or negative, to the end', () => {
    expect(summary(applyMove(board, 'a', 'DONE', 99))).toContain('DONE:1:a');
    expect(summary(applyMove(board, 'a', 'DONE', -1))).toContain('DONE:1:a');
  });

  it('sets completedAt on entering DONE and clears it on leaving', () => {
    const done = applyMove(board, 'a', 'DONE', 0, '2026-11-22T10:00:00.000Z');
    expect(done.find((t) => t.id === 'a')?.completedAt).toBe('2026-11-22T10:00:00.000Z');
    const back = applyMove(board, 'e', 'TODO', 0);
    expect(back.find((t) => t.id === 'e')?.completedAt).toBeNull();
  });

  it('does not mutate its input and ignores unknown ids', () => {
    const before = JSON.stringify(board);
    applyMove(board, 'a', 'DONE', 0);
    expect(JSON.stringify(board)).toBe(before);
    expect(applyMove(board, 'zzz', 'DONE', 0)).toHaveLength(board.length);
  });
});
