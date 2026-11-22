'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button, buttonStyles } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { PageHeader } from '@/components/ui/page-header';
import { ApiError } from '@/lib/api/client';
import { formatLong, formatMonthYear, todayInSaoPaulo } from '@/lib/dates';
import { useCalendar } from './api';
import { CalendarEventLink } from './calendar-event';
import {
  buildMonthGrid,
  eventKey,
  groupEventsByDay,
  parseMonthParam,
  shiftMonth,
  toMonthParam,
} from './grid';
import { IcsHelp } from './ics-help';
import { MonthAgenda } from './month-agenda';
import { MonthGridView } from './month-grid';

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function CalendarView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openDay, setOpenDay] = useState<string | null>(null);

  const today = todayInSaoPaulo();
  const month = parseMonthParam(searchParams.get('mes'), today);
  const grid = useMemo(() => buildMonthGrid(month), [month]);

  const { data, isPending, isError, isPlaceholderData, error, refetch } = useCalendar(
    grid.from,
    grid.to,
  );
  const byDay = useMemo(() => groupEventsByDay(data ?? []), [data]);

  const loading = isPending || isPlaceholderData;
  const monthPrefix = month.slice(0, 7);
  const monthHasEvents = (data ?? []).some((event) => event.date.startsWith(monthPrefix));

  function goTo(target: string) {
    router.replace(`${pathname}?mes=${toMonthParam(target)}`, { scroll: false });
  }

  const exportLink = (
    <a href="/api/calendar.ics" download className={buttonStyles({ variant: 'secondary' })}>
      Exportar .ics
    </a>
  );

  return (
    <>
      <PageHeader
        title="Calendário"
        description="Prazos das tarefas e dos projetos de que você participa."
        actions={exportLink}
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2
          aria-live="polite"
          className="order-first basis-full text-xl font-semibold min-[720px]:order-none min-[720px]:basis-auto"
        >
          {capitalize(formatMonthYear(month))}
        </h2>
        <div className="flex items-center gap-1 min-[720px]:order-first">
          <IconButton
            aria-label="Mês anterior"
            variant="secondary"
            onClick={() => goTo(shiftMonth(month, -1))}
          >
            <ChevronLeft className="size-5" />
          </IconButton>
          <IconButton
            aria-label="Próximo mês"
            variant="secondary"
            onClick={() => goTo(shiftMonth(month, 1))}
          >
            <ChevronRight className="size-5" />
          </IconButton>
        </div>
        <Button
          variant="secondary"
          className="min-[720px]:order-first"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          Hoje
        </Button>
      </div>

      {isError && !data ? (
        <ErrorState
          title="Não foi possível carregar o calendário"
          message={
            error instanceof ApiError ? error.message : 'Verifique sua conexão e tente de novo.'
          }
          onRetry={() => void refetch()}
        />
      ) : (
        <div aria-busy={loading || undefined}>
          {!loading && !monthHasEvents && (
            <p className="mb-3 text-sm text-secondary">Nenhum prazo neste mês.</p>
          )}
          <div className="hidden min-[720px]:block">
            <MonthGridView
              grid={grid}
              byDay={byDay}
              today={today}
              loading={loading}
              onOpenDay={setOpenDay}
            />
          </div>
          <div className="min-[720px]:hidden">
            <MonthAgenda grid={grid} byDay={byDay} today={today} loading={loading} />
          </div>
        </div>
      )}

      <IcsHelp />

      <Dialog
        open={openDay !== null}
        onClose={() => setOpenDay(null)}
        title={openDay ? formatLong(openDay) : ''}
      >
        <ul className="-mx-2 flex flex-col divide-y divide-hairline">
          {(openDay ? (byDay.get(openDay) ?? []) : []).map((event) => (
            <li key={eventKey(event)} className="px-2">
              <CalendarEventLink event={event} today={today} layout="list" />
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
