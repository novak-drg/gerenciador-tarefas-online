import { describe, expect, it } from 'vitest';
import type { TaskWithProject } from '@/lib/api/types';
import { countByFilter, groupOf, groupOpenTasks, parseFilter, sortCompleted } from './grouping';

const today = '2026-11-22';

function task(
  id: string,
  dueDate: string | null,
  status: TaskWithProject['status'] = 'TODO',
  completedAt: string | null = null,
): TaskWithProject {
  return {
    id,
    projectId: 'p1',
    title: `Tarefa ${id}`,
    description: null,
    status,
    priority: 'MEDIUM',
    position: 0,
    dueDate,
    assignee: null,
    createdBy: { id: 'u', name: 'U', email: 'u@x.test' },
    completedAt,
    createdAt: '',
    updatedAt: '',
    project: { id: 'p1', name: 'Projeto' },
  };
}

describe('groupOf', () => {
  it('puts the boundaries in the right group', () => {
    expect(groupOf('2026-11-21', today)).toBe('overdue'); // yesterday
    expect(groupOf('2026-11-22', today)).toBe('today');
    expect(groupOf('2026-11-23', today)).toBe('week');
    expect(groupOf('2026-11-29', today)).toBe('week'); // +7
    expect(groupOf('2026-11-30', today)).toBe('later'); // +8
    expect(groupOf(null, today)).toBe('none');
  });
});

describe('groupOpenTasks', () => {
  it('orders groups and hides empty ones', () => {
    const groups = groupOpenTasks(
      [
        task('a', null),
        task('b', '2026-12-30'),
        task('c', '2026-11-21'),
        task('d', '2026-11-22', 'IN_PROGRESS'),
        task('e', '2026-11-29'),
      ],
      today,
    );
    expect(groups.map((g) => g.id)).toEqual(['overdue', 'today', 'week', 'later', 'none']);
    expect(groups.map((g) => g.label)).toEqual([
      'Atrasadas',
      'Hoje',
      'Próximos 7 dias',
      'Depois',
      'Sem prazo',
    ]);
    expect(groupOpenTasks([task('x', '2026-11-30')], today).map((g) => g.id)).toEqual(['later']);
  });

  it('ignores done tasks, even overdue ones', () => {
    const done = task('x', '2026-11-01', 'DONE', '2026-11-02T10:00:00Z');
    expect(groupOpenTasks([done], today)).toEqual([]);
  });

  it('sorts inside a group by due date', () => {
    const [group] = groupOpenTasks([task('late', '2026-11-28'), task('soon', '2026-11-24')], today);
    expect(group!.tasks.map((t) => t.id)).toEqual(['soon', 'late']);
  });
});

describe('sortCompleted / countByFilter / parseFilter', () => {
  const all = [
    task('a', null, 'DONE', '2026-11-10T12:00:00Z'),
    task('b', null, 'DONE', '2026-11-20T12:00:00Z'),
    task('c', '2026-11-25', 'TODO'),
    task('d', null, 'IN_PROGRESS'),
  ];

  it('orders completed tasks by most recent completion', () => {
    expect(sortCompleted(all).map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('counts per filter', () => {
    expect(countByFilter(all)).toEqual({ abertas: 2, concluidas: 2, todas: 4 });
  });

  it('falls back to "abertas" for unknown values', () => {
    expect(parseFilter('concluidas')).toBe('concluidas');
    expect(parseFilter('todas')).toBe('todas');
    expect(parseFilter('x')).toBe('abertas');
    expect(parseFilter(null)).toBe('abertas');
  });
});
