'use client';

import type { ReactNode } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { useSession } from '@/features/auth/session';
import { useProjects } from '@/features/projects/api';
import { ApiError } from '@/lib/api/client';
import { formatLong, todayInSaoPaulo } from '@/lib/dates';
import { useDashboardSummary } from './api';
import { KpiRow, KpiRowSkeleton } from './kpi-row';
import { ProjectsPanel, ProjectsSkeleton } from './projects-panel';
import { UpcomingList, UpcomingSkeleton } from './upcoming-list';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Verifique sua conexão e tente de novo.';
}

export function DashboardView() {
  const { user } = useSession();
  const summary = useDashboardSummary();
  const projects = useProjects();
  const today = todayInSaoPaulo();
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  return (
    <>
      <PageHeader title={`Olá, ${firstName}`} meta={<Label>{formatLong(today)}</Label>} />

      <div className="mb-10">
        {summary.isPending ? (
          <KpiRowSkeleton />
        ) : summary.isError ? (
          <ErrorState
            className="py-8"
            title="Não foi possível carregar o resumo"
            message={messageOf(summary.error)}
            onRetry={() => void summary.refetch()}
          />
        ) : (
          <KpiRow summary={summary.data} today={today} />
        )}
      </div>

      <div className="grid gap-x-8 gap-y-10 min-[900px]:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
        <Section title="Próximas entregas">
          {summary.isPending ? (
            <UpcomingSkeleton />
          ) : summary.isError ? (
            <ErrorState
              className="py-8"
              title="Não foi possível carregar as entregas"
              message={messageOf(summary.error)}
              onRetry={() => void summary.refetch()}
            />
          ) : (
            <UpcomingList tasks={summary.data.upcoming} today={today} />
          )}
        </Section>

        <Section title="Seus projetos">
          {projects.isPending ? (
            <ProjectsSkeleton />
          ) : projects.isError ? (
            <ErrorState
              className="py-8"
              title="Não foi possível carregar os projetos"
              message={messageOf(projects.error)}
              onRetry={() => void projects.refetch()}
            />
          ) : (
            <ProjectsPanel projects={projects.data} today={today} />
          )}
        </Section>
      </div>
    </>
  );
}
