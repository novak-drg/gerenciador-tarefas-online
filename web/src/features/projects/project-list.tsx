'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ApiError } from '@/lib/api/client';
import { todayInSaoPaulo } from '@/lib/dates';
import type { ReactNode } from 'react';
import { useProjects } from './api';
import { ProjectCard } from './project-card';

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4';

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-edge bg-surface p-5">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-1 w-full" />
    </div>
  );
}

export function ProjectList({ emptyAction }: { emptyAction: ReactNode }) {
  const { data, isPending, isError, error, refetch } = useProjects();

  if (isPending) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Carregando projetos">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar os projetos"
        message={
          error instanceof ApiError ? error.message : 'Verifique sua conexão e tente de novo.'
        }
        onRetry={() => void refetch()}
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="Nenhum projeto ainda"
        description="Crie o primeiro projeto para organizar as tarefas da equipe."
        action={emptyAction}
      />
    );
  }

  const today = todayInSaoPaulo();
  return (
    <ul className={GRID}>
      {data.map((project) => (
        <li key={project.id} className="min-w-0">
          <ProjectCard project={project} today={today} />
        </li>
      ))}
    </ul>
  );
}
