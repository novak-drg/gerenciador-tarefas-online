import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { CalendarEvent } from '@/lib/api/types';
import { formatShort, formatWeekdayShort } from '@/lib/dates';
import { CalendarEventLink } from './calendar-event';
import { eventKey, type MonthGrid } from './grid';

export type MonthAgendaProps = {
  grid: MonthGrid;
  byDay: ReadonlyMap<string, CalendarEvent[]>;
  today: string;
  loading: boolean;
};

/** The month as a list: only the days that have events. Shown under 720px. */
export function MonthAgenda({ grid, byDay, today, loading }: MonthAgendaProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {[2, 1, 2].map((rows, group) => (
          <div key={group}>
            <Skeleton className="mb-3 h-4 w-28" />
            <div className="divide-y divide-hairline rounded-card border border-edge bg-surface">
              {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="px-3 py-3.5">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const days = grid.days.filter((day) => day.inMonth && byDay.has(day.date));

  return (
    <div className="flex flex-col gap-6">
      {days.map(({ date }) => (
        <section key={date}>
          <Label as="h3" className="mb-2">
            {formatWeekdayShort(date)}, {formatShort(date)}
            {date === today ? ' · hoje' : ''}
          </Label>
          <ul className="divide-y divide-hairline rounded-card border border-edge bg-surface px-2">
            {(byDay.get(date) ?? []).map((event) => (
              <li key={eventKey(event)}>
                <CalendarEventLink event={event} today={today} layout="list" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
