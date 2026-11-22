import type { ApiCalendarEvent, ApiTaskWithProject } from '@/common/contract';
import { addDays } from '@/common/dates';

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;
const UID_DOMAIN = 'gerenciador-tarefas';
const PRODID = '-//Gerenciador de Tarefas//Calendario//PT-BR';

const STATUS_LABEL: Record<ApiTaskWithProject['status'], string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluído',
};

const PRIORITY_LABEL: Record<ApiTaskWithProject['priority'], string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

/** RFC 5545 section 3.3.11 TEXT escaping. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a content line so no physical line exceeds 75 octets, never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= MAX_LINE_OCTETS) return line;

  const physical: string[] = [];
  let current = '';
  let currentOctets = 0;
  // Continuation lines start with one space, which counts toward the limit.
  let limit = MAX_LINE_OCTETS;

  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
    if (currentOctets + size > limit) {
      physical.push(current);
      current = ' ';
      currentOctets = 1;
      limit = MAX_LINE_OCTETS;
    }
    current += char;
    currentOctets += size;
  }
  physical.push(current);
  return physical.join(CRLF);
}

function formatUtcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

const compactDate = (value: string): string => value.replace(/-/g, '');

function taskDescription(task: ApiTaskWithProject): string {
  const lines = [
    `Projeto: ${task.project.name}`,
    `Status: ${STATUS_LABEL[task.status]}`,
    `Prioridade: ${PRIORITY_LABEL[task.priority]}`,
  ];
  if (task.assignee) lines.push(`Responsável: ${task.assignee.name}`);
  if (task.description) lines.push('', task.description);
  return lines.join('\n');
}

function eventLines(event: ApiCalendarEvent, stamp: string): string[] {
  const common = [
    'BEGIN:VEVENT',
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
    `DTEND;VALUE=DATE:${compactDate(addDays(event.date, 1))}`,
  ];

  if (event.kind === 'TASK') {
    return [
      ...common,
      `UID:task-${event.task.id}@${UID_DOMAIN}`,
      `SUMMARY:${escapeText(event.task.title)}`,
      `DESCRIPTION:${escapeText(taskDescription(event.task))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ];
  }

  return [
    ...common,
    `UID:project-${event.project.id}@${UID_DOMAIN}`,
    `SUMMARY:${escapeText(`Prazo do projeto: ${event.project.name}`)}`,
    `DESCRIPTION:${escapeText(`Data de término do projeto ${event.project.name}`)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ];
}

export function buildIcs(events: readonly ApiCalendarEvent[], now: Date = new Date()): string {
  const stamp = formatUtcStamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Gerenciador de Tarefas',
    ...events.flatMap((event) => eventLines(event, stamp)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}
