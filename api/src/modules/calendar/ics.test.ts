import { describe, expect, it } from 'vitest';
import type { ApiCalendarEvent, ApiTaskWithProject } from '@/common/contract';
import { buildIcs, escapeText, foldLine } from './ics';

const NOW = new Date('2026-11-22T15:04:05.678Z');

const user = { id: '00000000-0000-4000-8000-000000000001', name: 'Ana', email: 'ana@exemplo.com' };

function taskEvent(
  overrides: Partial<ApiTaskWithProject> = {},
  date = '2026-12-31',
): ApiCalendarEvent {
  return {
    kind: 'TASK',
    date,
    task: {
      id: '00000000-0000-4000-8000-0000000000aa',
      projectId: '00000000-0000-4000-8000-0000000000bb',
      title: 'Reservar o salão',
      description: null,
      status: 'TODO',
      priority: 'HIGH',
      position: 0,
      dueDate: date,
      assignee: user,
      createdBy: user,
      completedAt: null,
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
      project: { id: '00000000-0000-4000-8000-0000000000bb', name: 'Festa da vila' },
      ...overrides,
    },
  };
}

describe('escapeText', () => {
  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeText('a\\b;c,d\ne\r\nf\rg')).toBe('a\\\\b\\;c\\,d\\ne\\nf\\ng');
  });
});

describe('foldLine', () => {
  it('leaves short lines untouched', () => {
    expect(foldLine('SUMMARY:curto')).toBe('SUMMARY:curto');
  });

  it('folds at 75 octets with a leading space on continuations', () => {
    const folded = foldLine(`SUMMARY:${'x'.repeat(200)}`).split('\r\n');
    expect(folded.length).toBeGreaterThan(2);
    for (const physical of folded) {
      expect(Buffer.byteLength(physical, 'utf8')).toBeLessThanOrEqual(75);
    }
    expect(folded.slice(1).every((line) => line.startsWith(' '))).toBe(true);
    expect(folded.map((line, index) => (index === 0 ? line : line.slice(1))).join('')).toBe(
      `SUMMARY:${'x'.repeat(200)}`,
    );
  });

  it('never splits a multi-byte character', () => {
    const original = `SUMMARY:${'ção '.repeat(60)}`;
    const folded = foldLine(original).split('\r\n');
    for (const physical of folded) {
      expect(Buffer.byteLength(physical, 'utf8')).toBeLessThanOrEqual(75);
    }
    const unfolded = folded.map((line, index) => (index === 0 ? line : line.slice(1))).join('');
    expect(unfolded).toBe(original);
  });
});

describe('buildIcs', () => {
  it('produces a calendar with CRLF line endings and the required properties', () => {
    const ics = buildIcs([taskEvent()], NOW);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('writes all-day events whose DTEND is the next day', () => {
    const ics = buildIcs([taskEvent()], NOW);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n');
    expect(ics).toContain('DTSTAMP:20261122T150405Z\r\n');
  });

  it('uses stable UIDs for tasks and project deadlines', () => {
    const ics = buildIcs(
      [
        taskEvent(),
        {
          kind: 'PROJECT_DEADLINE',
          date: '2026-12-20',
          project: { id: '00000000-0000-4000-8000-0000000000bb', name: 'Festa da vila' },
        },
      ],
      NOW,
    );
    expect(ics).toContain('UID:task-00000000-0000-4000-8000-0000000000aa@gerenciador-tarefas\r\n');
    expect(ics).toContain(
      'UID:project-00000000-0000-4000-8000-0000000000bb@gerenciador-tarefas\r\n',
    );
    expect(ics).toContain('SUMMARY:Prazo do projeto: Festa da vila\r\n');
  });

  it('escapes special characters in titles and descriptions', () => {
    const ics = buildIcs(
      [taskEvent({ title: 'Comprar; lanches, bebidas', description: 'linha 1\nlinha 2' })],
      NOW,
    );
    expect(ics).toContain('SUMMARY:Comprar\\; lanches\\, bebidas\r\n');
    expect(ics).toContain('linha 1\\nlinha 2');
  });

  it('keeps every physical line within 75 octets', () => {
    const ics = buildIcs([taskEvent({ title: 'Título muito longo '.repeat(20) })], NOW);
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
  });

  it('rolls the day over month and year boundaries', () => {
    const ics = buildIcs([taskEvent({}, '2028-02-28')], NOW);
    expect(ics).toContain('DTEND;VALUE=DATE:20280229\r\n');
  });

  it('is a valid empty calendar when there are no events', () => {
    const ics = buildIcs([], NOW);
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR\r\n');
  });
});
