import { useProjectColor } from '@/features/projects/use-project-color';
import { cn } from '@/lib/utils';

export type ProjectTagProps = {
  project: { id: string; name: string };
  className?: string;
};

/** Project name behind its identity square. Truncates inside a flex or grid cell. */
export function ProjectTag({ project, className }: ProjectTagProps) {
  const color = useProjectColor(project.id);
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-1.5 text-xs text-secondary', className)}
    >
      <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate">{project.name}</span>
    </span>
  );
}

/** Where a task opens: the board of its project with the task dialog on top. */
export function taskHref(task: { id: string; projectId: string }): string {
  return `/projetos/${task.projectId}?tarefa=${task.id}`;
}
