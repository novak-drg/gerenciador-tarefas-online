import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary } from '@/lib/api/types';
import { addDays, formatShort } from '@/lib/dates';
import { cn } from '@/lib/utils';

const GRID = 'grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4';
const BLOCK =
  'flex min-w-0 flex-col gap-1 rounded-card border border-edge bg-surface p-4 transition-colors duration-150 ease-out hover:border-control sm:p-5';

type Kpi = {
  label: string;
  value: number;
  description: string;
  href: string;
  danger?: boolean;
};

function buildKpis(summary: DashboardSummary, today: string): Kpi[] {
  const { projectCount, openTaskCount, overdueTaskCount, dueThisWeekCount } = summary;
  return [
    {
      label: 'Projetos',
      value: projectCount,
      description: 'de que você participa',
      href: '/projetos',
    },
    {
      label: 'Tarefas abertas',
      value: openTaskCount,
      description: 'atribuídas a você',
      href: '/minhas-tarefas',
    },
    {
      label: 'Atrasadas',
      value: overdueTaskCount,
      description: overdueTaskCount > 0 ? 'passaram do prazo' : 'nada em atraso',
      href: '/minhas-tarefas',
      danger: overdueTaskCount > 0,
    },
    {
      label: 'Próximos 7 dias',
      value: dueThisWeekCount,
      description: `com prazo até ${formatShort(addDays(today, 7))}`,
      href: '/minhas-tarefas',
    },
  ];
}

export function KpiRow({ summary, today }: { summary: DashboardSummary; today: string }) {
  return (
    <ul className={GRID}>
      {buildKpis(summary, today).map((kpi) => (
        <li key={kpi.label} className="min-w-0">
          <Link href={kpi.href} className={cn(BLOCK, 'h-full')}>
            <Label>{kpi.label}</Label>
            <span
              className={cn(
                'text-3xl leading-tight font-semibold tabular-nums',
                kpi.danger && 'text-danger-text',
              )}
            >
              {kpi.value}
            </span>
            <span className="text-sm text-secondary">{kpi.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function KpiRowSkeleton() {
  return (
    <ul className={GRID} aria-busy="true" aria-label="Carregando resumo">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className={cn(BLOCK, 'hover:border-edge')}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="my-1 h-9 w-14" />
          <Skeleton className="h-4 w-32" />
        </li>
      ))}
    </ul>
  );
}
