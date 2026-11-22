import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectColor } from '@/features/projects/use-project-color';
import type { ProjectSummary } from '@/lib/api/types';
import { dueLabel } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { SECTION_LINK } from './upcoming-list';

const MAX_PROJECTS = 5;

function ProjectRow({ project, today }: { project: ProjectSummary; today: string }) {
  const color = useProjectColor(project.id);
  const { TODO, IN_PROGRESS, DONE } = project.taskCounts;
  const total = TODO + IN_PROGRESS + DONE;
  const late = project.dueDate < today;

  return (
    <li>
      <Link
        href={`/projetos/${project.id}`}
        className="flex flex-col gap-1 px-4 py-3 transition-colors duration-150 ease-out hover:bg-pressed"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: color }} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
          <span
            className={cn(
              'shrink-0 text-xs',
              late ? 'font-medium text-danger-text' : 'text-secondary',
            )}
          >
            {dueLabel(project.dueDate, today)}
          </span>
        </span>
        <span className="pl-5 text-xs text-secondary">
          {total === 0
            ? 'Nenhuma tarefa ainda'
            : `${DONE} de ${total} ${total === 1 ? 'concluída' : 'concluídas'}`}
        </span>
      </Link>
    </li>
  );
}

export function ProjectsPanel({
  projects,
  today,
}: {
  projects: readonly ProjectSummary[];
  today: string;
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="Você ainda não participa de nenhum projeto"
        action={
          <Link href="/projetos" className={buttonStyles()}>
            Criar projeto
          </Link>
        }
      />
    );
  }
  return (
    <>
      <ul className="divide-y divide-hairline rounded-card border border-edge bg-surface">
        {projects.slice(0, MAX_PROJECTS).map((project) => (
          <ProjectRow key={project.id} project={project} today={today} />
        ))}
      </ul>
      <Link href="/projetos" className={cn(SECTION_LINK, 'mt-2 px-1')}>
        Ver todos os projetos
      </Link>
    </>
  );
}

export function ProjectsSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="Carregando projetos"
      className="divide-y divide-hairline rounded-card border border-edge bg-surface"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex flex-col gap-2 px-4 py-3.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="ml-5 h-3 w-1/3" />
        </li>
      ))}
    </ul>
  );
}
