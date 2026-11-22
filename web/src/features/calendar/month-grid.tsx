import { Label } from '@/components/ui/label';
import { Seal } from '@/components/ui/seal';
import { Skeleton } from '@/components/ui/skeleton';
import type { CalendarEvent } from '@/lib/api/types';
import { formatLong, formatShort } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { CalendarEventLink } from './calendar-event';
import { eventKey, WEEKDAY_HEADERS, type GridDay, type MonthGrid } from './grid';

const MAX_VISIBLE = 2;
const NO_EVENTS: CalendarEvent[] = [];

const dayNumberClass = 'inline-flex h-6 min-w-6 items-center justify-center text-xs font-medium';

function DayNumber({ day, today }: { day: GridDay; today: string }) {
  const isToday = day.date === today;
  const dayOfMonth = Number(day.date.slice(8));
  // the first of a month names the month, so a spill-over week stays readable
  const text = dayOfMonth === 1 ? formatShort(day.date) : String(dayOfMonth);

  return (
    <div className="flex items-center">
      <span aria-hidden>
        {isToday ? (
          <Seal value={text} />
        ) : (
          <span className={cn(dayNumberClass, day.inMonth ? 'text-ink' : 'text-secondary')}>
            {text}
          </span>
        )}
      </span>
      <span className="sr-only">
        {formatLong(day.date)}
        {isToday ? ', hoje' : ''}
      </span>
    </div>
  );
}

type DayCellProps = {
  day: GridDay;
  events: readonly CalendarEvent[];
  today: string;
  loading: boolean;
  onOpenDay: (date: string) => void;
};

function DayCell({ day, events, today, loading, onOpenDay }: DayCellProps) {
  const visible = events.slice(0, MAX_VISIBLE);
  const hidden = events.length - visible.length;

  return (
    <li
      className={cn(
        'flex min-h-28 min-w-0 flex-col gap-0.5 p-1',
        day.inMonth ? 'bg-surface' : 'bg-drawer',
      )}
    >
      {/* The overflow button shares the day-number row so six weeks fit a laptop viewport. */}
      <div className="flex min-h-7 items-center justify-between gap-1">
        <DayNumber day={day} today={today} />
        {!loading && hidden > 0 && (
          <button
            type="button"
            onClick={() => onOpenDay(day.date)}
            aria-label={`+${hidden} mais em ${formatLong(day.date)}`}
            className="relative rounded-chip px-1.5 py-1 text-xs font-medium text-accent before:absolute before:inset-x-0 before:-inset-y-1 hover:bg-pressed"
          >
            +{hidden} mais
          </button>
        )}
      </div>
      {loading ? (
        <Skeleton className="mx-1 h-4 w-4/5" />
      ) : (
        visible.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {visible.map((event) => (
              <li key={eventKey(event)} className="min-w-0">
                <CalendarEventLink event={event} today={today} layout="cell" />
              </li>
            ))}
          </ul>
        )
      )}
    </li>
  );
}

export type MonthGridViewProps = {
  grid: MonthGrid;
  byDay: ReadonlyMap<string, CalendarEvent[]>;
  today: string;
  loading: boolean;
  onOpenDay: (date: string) => void;
};

/** Six Sunday-first weeks. Shown from 720px up; narrower screens use the agenda instead. */
export function MonthGridView({ grid, byDay, today, loading, onOpenDay }: MonthGridViewProps) {
  return (
    <div>
      <div aria-hidden className="grid grid-cols-7 pb-2">
        {WEEKDAY_HEADERS.map((name) => (
          <Label key={name} className="px-2">
            {name}
          </Label>
        ))}
      </div>
      <ol className="grid auto-rows-fr grid-cols-7 gap-px overflow-hidden rounded-card border border-edge bg-hairline">
        {grid.days.map((day, index) => (
          <DayCell
            key={day.date}
            day={day}
            events={byDay.get(day.date) ?? NO_EVENTS}
            today={today}
            loading={loading && index % 4 === 1}
            onOpenDay={onOpenDay}
          />
        ))}
      </ol>
    </div>
  );
}
