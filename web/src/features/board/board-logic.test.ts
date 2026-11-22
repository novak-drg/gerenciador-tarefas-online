import { describe, expect, it } from 'vitest';
import type { Task, TaskStatus } from '@/lib/api/types';
import {
  columnDroppableId,
  findContainer,
  groupByStatus,
  locate,
  moveAcross,
  resolveDrop,
  settleDrop,
  toColumnIds,
  type ColumnIds,
} from './board-logic';

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
    completedAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

const ids: ColumnIds = { TODO: ['a', 'b', 'c'], IN_PROGRESS: ['d'], DONE: [] };

describe('groupByStatus', () => {
  it('groups by status and orders by position', () => {
    const columns = groupByStatus([
      task('c', 'TODO', 2),
      task('a', 'TODO', 0),
      task('d', 'IN_PROGRESS', 0),
      task('b', 'TODO', 1),
    ]);
    expect(columns.TODO.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(columns.IN_PROGRESS.map((t) => t.id)).toEqual(['d']);
    expect(columns.DONE).toEqual([]);
    expect(toColumnIds(columns).TODO).toEqual(['a', 'b', 'c']);
  });
});

describe('findContainer', () => {
  it('finds a card and resolves a column droppable', () => {
    expect(findContainer(ids, 'd')).toBe('IN_PROGRESS');
    expect(findContainer(ids, columnDroppableId('DONE'))).toBe('DONE');
    expect(findContainer(ids, 'zzz')).toBeUndefined();
  });
});

describe('moveAcross', () => {
  it('inserts before the card it is over', () => {
    const next = moveAcross(ids, 'a', 'd', false);
    expect(next.TODO).toEqual(['b', 'c']);
    expect(next.IN_PROGRESS).toEqual(['a', 'd']);
  });

  it('inserts after it when the dragged card is past its middle', () => {
    expect(moveAcross(ids, 'a', 'd', true).IN_PROGRESS).toEqual(['d', 'a']);
  });

  it('appends when dropped on an empty column', () => {
    const next = moveAcross(ids, 'b', columnDroppableId('DONE'), false);
    expect(next.DONE).toEqual(['b']);
    expect(next.TODO).toEqual(['a', 'c']);
  });

  it('keeps the same object when over another card of its own column', () => {
    expect(moveAcross(ids, 'a', 'c', true)).toBe(ids);
  });

  it('sends the card to the end when over the empty space of its own column', () => {
    expect(moveAcross(ids, 'a', columnDroppableId('TODO'), false).TODO).toEqual(['b', 'c', 'a']);
    expect(moveAcross(ids, 'c', columnDroppableId('TODO'), false)).toBe(ids);
  });

  it('does not mutate its input', () => {
    moveAcross(ids, 'a', 'd', false);
    expect(ids.TODO).toEqual(['a', 'b', 'c']);
  });
});

describe('settleDrop', () => {
  it('moves the card to the index of the card it was dropped on', () => {
    expect(settleDrop(ids, 'a', 'c').TODO).toEqual(['b', 'c', 'a']);
    expect(settleDrop(ids, 'c', 'a').TODO).toEqual(['c', 'a', 'b']);
  });

  it('ignores drops on itself, on a column or across columns', () => {
    expect(settleDrop(ids, 'a', 'a')).toBe(ids);
    expect(settleDrop(ids, 'a', columnDroppableId('TODO'))).toBe(ids);
    expect(settleDrop(ids, 'a', 'd')).toBe(ids);
  });
});

describe('locate', () => {
  it('returns status and index', () => {
    expect(locate(ids, 'c')).toEqual({ status: 'TODO', position: 2 });
    expect(locate(ids, 'nope')).toBeUndefined();
  });
});

describe('resolveDrop', () => {
  it('returns the target for a reorder inside a column', () => {
    const result = resolveDrop(ids, ids, 'a', 'c');
    expect(result?.target).toEqual({ status: 'TODO', position: 2 });
    expect(result?.ids.TODO).toEqual(['b', 'c', 'a']);
  });

  it('returns the target for a move to another column', () => {
    const during = moveAcross(ids, 'b', 'd', false);
    const result = resolveDrop(ids, during, 'b', 'b');
    expect(result?.target).toEqual({ status: 'IN_PROGRESS', position: 0 });
  });

  it('returns the target for a move to an empty column', () => {
    const during = moveAcross(ids, 'a', columnDroppableId('DONE'), false);
    const result = resolveDrop(ids, during, 'a', columnDroppableId('DONE'));
    expect(result?.target).toEqual({ status: 'DONE', position: 0 });
  });

  it('returns null when nothing changed or there was no drop target', () => {
    expect(resolveDrop(ids, ids, 'a', 'a')).toBeNull();
    expect(resolveDrop(ids, ids, 'a', null)).toBeNull();
  });

  it('returns null when the card went away and came back to its slot', () => {
    const away = moveAcross(ids, 'a', 'd', false);
    const back = moveAcross(away, 'a', 'b', false);
    expect(resolveDrop(ids, back, 'a', 'a')).toBeNull();
  });
});
