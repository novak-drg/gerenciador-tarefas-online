import Link from 'next/link';
import { useProjectColor } from '@/features/projects/use-project-color';
import type { CalendarEvent } from '@/lib/api/types';
import { formatLong, isOverdue } from '@/lib/dates';
import { cn } from '@/lib/utils';

export function eventHref(event: CalendarEvent): string {
  return event.kind === 'TASK'
    ? `/projetos/${event.task.projectId}?tarefa=${event.task.id}`
    : `/projetos/${event.project.id}`;
}

function eventProject(event: CalendarEvent): { id: string; name: string } {
  return event.kind === 'TASK' ? event.task.project : event.project;
}

/** Visible text of an event: the task title, or "Prazo · <project>". */
export function eventText(event: CalendarEvent): string {
  return event.kind === 'TASK' ? event.task.title : `Prazo · ${event.project.name}`;
}

type EventState = 'late' | 'done' | 'open';

function stateOf(event: CalendarEvent, today: string): EventState {
  if (event.kind !== 'TASK') return 'open';
  if (event.task.status === 'DONE') return 'done';
  return isOverdue(event.date, event.task.status, today) ? 'late' : 'open';
}

/** Full spoken name: starts with the visible text, then project, date and state. */
export function eventLabel(event: CalendarEvent, today: string): string {
  const date = formatLong(event.date);
  if (event.kind === 'PROJECT_DEADLINE') return `${eventText(event)}, ${date}`;
  const state = stateOf(event, today);
  const suffix = state === 'late' ? ', atrasada' : state === 'done' ? ', concluída' : '';
  return `${event.task.title}, ${event.task.project.name}, ${date}${suffix}`;
}

export type CalendarEventLinkProps = {
  event: CalendarEvent;
  today: string;
  /** `cell`: one dense line for the month grid. `list`: roomy rows for the agenda and the day dialog. */
  layout: 'cell' | 'list';
};

export function CalendarEventLink({ event, today, layout }: CalendarEventLinkProps) {
  const state = stateOf(event, today);
  const project = eventProject(event);
  const color = useProjectColor(project.id);
  const label = eventLabel(event, today);
  const text = eventText(event);

  const textClass = cn(
    event.kind === 'PROJECT_DEADLINE' && 'font-semibold',
    state === 'done' && 'text-secondary line-through',
    state === 'late' && 'text-danger-text',
  );

  return (
    <Link
      href={eventHref(event)}
      title={label}
      aria-label={label}
      className={cn(
        'flex items-center gap-2 rounded-chip transition-colors duration-150 ease-out hover:bg-pressed',
        layout === 'cell' ? 'min-h-9 px-1.5 text-xs' : 'min-h-11 px-2 py-1.5 text-sm',
      )}
    >
      <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: color }} />
      {layout === 'cell' ? (
        <span className={cn('min-w-0 flex-1 truncate', textClass)}>{text}</span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className={cn('break-words', textClass)}>{text}</span>
          {event.kind === 'TASK' && (
            <span className="truncate text-xs text-secondary">{project.name}</span>
          )}
        </span>
      )}
    </Link>
  );
}
