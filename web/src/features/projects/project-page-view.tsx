'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AvatarStack } from '@/components/ui/avatar';
import { Button, buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Label } from '@/components/ui/label';
import { ScrollFade } from '@/components/ui/scroll-fade';
import { Skeleton } from '@/components/ui/skeleton';
import { TabPanel, Tabs, type TabItem } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { Board } from '@/features/board/board';
import { TaskList } from '@/features/board/task-list';
import { useProjectTasks } from '@/features/tasks/api';
import { TaskDialog } from '@/features/tasks/components/task-dialog';
import { ApiError } from '@/lib/api/client';
import type { Project, Task, TaskStatus } from '@/lib/api/types';
import { formatPeriod, todayAndDueParts, todayInSaoPaulo } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useProject } from './api';
import { useProjectColor } from './use-project-color';
import { MembersPanel } from './members-panel';
import { SettingsPanel } from './settings-panel';

const NBSP = ' ';
const TAB_PREFIX = 'project';
type TabId = 'quadro' | 'lista' | 'membros' | 'configuracoes';
const TAB_IDS: readonly TabId[] = ['quadro', 'lista', 'membros', 'configuracoes'];

/**
 * `?aba=` and `?tarefa=` live in the URL. Writes go through history.replaceState, which Next
 * keeps in sync with useSearchParams, so changing them never refetches the route.
 */
function useUrlState() {
  const params = useSearchParams();
  const setParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    // state must be null: Next treats a state it wrote itself as its own navigation and skips the sync
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, []);
  return { aba: params.get('aba'), tarefa: params.get('tarefa'), setParams };
}

function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando projeto" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-2/5" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[22rem] w-full" />
    </div>
  );
}

export function ProjectPageView({ projectId }: { projectId: string }) {
  const project = useProject(projectId);

  if (project.isPending) return <PageSkeleton />;

  if (project.isError) {
    if (project.error instanceof ApiError && project.error.status === 404) {
      return (
        <EmptyState
          title="Projeto não encontrado"
          description="Ele pode ter sido excluído, ou você não participa dele."
          action={
            <Link href="/projetos" className={buttonStyles({ variant: 'secondary' })}>
              Voltar para projetos
            </Link>
          }
        />
      );
    }
    return (
      <ErrorState
        title="Não foi possível carregar o projeto"
        message={
          project.error instanceof ApiError
            ? project.error.message
            : 'Verifique sua conexão e tente de novo.'
        }
        onRetry={() => void project.refetch()}
      />
    );
  }

  return <LoadedProject project={project.data} />;
}

function LoadedProject({ project }: { project: Project }) {
  const color = useProjectColor(project.id);
  const toast = useToast();
  const { aba, tarefa, setParams } = useUrlState();
  const tasks = useProjectTasks(project.id);
  const [creatingIn, setCreatingIn] = useState<TaskStatus | null>(null);
  const [leaving, setLeaving] = useState(false);

  const isOwner = project.role === 'OWNER';
  const today = todayInSaoPaulo();
  const late = project.dueDate < today;
  const [todayText, dueText] = todayAndDueParts(project.dueDate, today);

  const tabs = useMemo<TabItem[]>(
    () => [
      { id: 'quadro', label: 'Quadro' },
      { id: 'lista', label: 'Lista' },
      { id: 'membros', label: 'Membros', count: project.members.length },
      ...(isOwner ? [{ id: 'configuracoes', label: 'Configurações' }] : []),
    ],
    [project.members.length, isOwner],
  );
  const requested = TAB_IDS.find((id) => id === aba) ?? 'quadro';
  const tab = tabs.some((t) => t.id === requested) ? requested : 'quadro';

  const selectedTask = useMemo(
    () => (tarefa ? (tasks.data?.find((t) => t.id === tarefa) ?? null) : null),
    [tarefa, tasks.data],
  );

  // A link to a task that is gone (or never was in this project): say so and drop the parameter
  const tasksLoaded = tasks.isSuccess;
  const missing = Boolean(tarefa) && tasksLoaded && selectedTask === null;
  useEffect(() => {
    if (!missing) return;
    toast.error('Tarefa não encontrada neste projeto.');
    setParams({ tarefa: null });
  }, [missing, toast, setParams]);

  const openTask = useCallback((task: Task) => setParams({ tarefa: task.id }), [setParams]);
  const createTask = useCallback((status: TaskStatus) => setCreatingIn(status), []);

  if (leaving) return <PageSkeleton />;

  const dialogOpen = creatingIn !== null || selectedTask !== null;
  function closeDialog() {
    setCreatingIn(null);
    if (tarefa) setParams({ tarefa: null });
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-3 size-4 shrink-0" style={{ backgroundColor: color }} />
            <h1 className="text-3xl font-semibold text-balance break-words">{project.name}</h1>
          </div>
          <Label as="p" className="mt-2">
            <span className="whitespace-nowrap">
              {formatPeriod(project.startDate, project.dueDate).replaceAll(' ', NBSP)} ·
            </span>{' '}
            <span className="whitespace-nowrap">{todayText} ·</span>{' '}
            <span className={cn('whitespace-nowrap', late && 'font-semibold text-danger-text')}>
              {dueText}
            </span>
          </Label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <AvatarStack users={project.members.map((m) => m.user)} />
          <Button leadingIcon={<Plus className="size-4" />} onClick={() => setCreatingIn('TODO')}>
            Nova tarefa
          </Button>
        </div>
      </header>

      <ScrollFade className="-mx-1 px-1">
        <Tabs
          tabs={tabs}
          value={tab}
          idPrefix={TAB_PREFIX}
          aria-label="Seções do projeto"
          className="min-w-max"
          onChange={(id) => setParams({ aba: id === 'quadro' ? null : id })}
        />
      </ScrollFade>

      <div className="pt-6">
        <TabPanel id="quadro" value={tab} idPrefix={TAB_PREFIX}>
          <TasksState tasks={tasks}>
            {(list) => (
              <Board
                project={project}
                tasks={list}
                today={today}
                onOpenTask={openTask}
                onCreateTask={createTask}
              />
            )}
          </TasksState>
        </TabPanel>
        <TabPanel id="lista" value={tab} idPrefix={TAB_PREFIX}>
          <TasksState tasks={tasks}>
            {(list) => (
              <TaskList project={project} tasks={list} today={today} onOpenTask={openTask} />
            )}
          </TasksState>
        </TabPanel>
        <TabPanel id="membros" value={tab} idPrefix={TAB_PREFIX}>
          <MembersPanel project={project} />
        </TabPanel>
        {isOwner && (
          <TabPanel id="configuracoes" value={tab} idPrefix={TAB_PREFIX}>
            <SettingsPanel project={project} onDeleted={() => setLeaving(true)} />
          </TabPanel>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={closeDialog}
        project={project}
        task={selectedTask}
        defaultStatus={creatingIn ?? 'TODO'}
      />
    </>
  );
}

function TasksState({
  tasks,
  children,
}: {
  tasks: ReturnType<typeof useProjectTasks>;
  children: (list: readonly Task[]) => React.ReactNode;
}) {
  if (tasks.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando tarefas">
        <Skeleton className="h-[22rem] w-full" />
      </div>
    );
  }
  if (tasks.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar as tarefas"
        message={
          tasks.error instanceof ApiError
            ? tasks.error.message
            : 'Verifique sua conexão e tente de novo.'
        }
        onRetry={() => void tasks.refetch()}
      />
    );
  }
  return <>{children(tasks.data)}</>;
}
