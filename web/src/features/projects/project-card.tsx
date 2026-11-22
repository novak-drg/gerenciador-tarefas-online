import Link from 'next/link';
import { Label } from '@/components/ui/label';
import type { ProjectSummary } from '@/lib/api/types';
import { dueLabel, formatPeriod } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useProjectColor } from './use-project-color';

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function ProjectCard({ project, today }: { project: ProjectSummary; today: string }) {
  const color = useProjectColor(project.id);
  const { TODO, IN_PROGRESS, DONE } = project.taskCounts;
  const total = TODO + IN_PROGRESS + DONE;
  const percent = total === 0 ? 0 : Math.round((DONE / total) * 100);
  const late = project.dueDate < today;

  return (
    <Link
      href={`/projetos/${project.id}`}
      className="flex min-h-full flex-col gap-4 rounded-card border border-edge bg-surface p-5 transition-colors duration-150 ease-out hover:border-control"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1.5 size-3 shrink-0" style={{ backgroundColor: color }} />
        <h2 className="min-w-0 flex-1 text-lg font-semibold break-words">{project.name}</h2>
        {project.role === 'OWNER' && (
          <span className="shrink-0 rounded-chip border border-hairline px-2 py-0.5 text-xs font-medium">
            Dono
          </span>
        )}
      </div>

      {project.description && (
        <p className="line-clamp-2 text-sm text-secondary">{project.description}</p>
      )}

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <Label>{formatPeriod(project.startDate, project.dueDate)}</Label>
          <span className={cn('text-sm', late ? 'font-medium text-danger-text' : 'text-secondary')}>
            {dueLabel(project.dueDate, today)}
          </span>
        </div>

        <div>
          <p className="text-sm">
            {total === 0
              ? 'Nenhuma tarefa ainda'
              : `${DONE} de ${total} ${total === 1 ? 'tarefa concluída' : 'tarefas concluídas'}`}
          </p>
          <div aria-hidden className="mt-2 h-1 overflow-hidden rounded-full bg-recess">
            <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <p className="text-sm text-secondary">{plural(project.memberCount, 'membro', 'membros')}</p>
      </div>
    </Link>
  );
}
