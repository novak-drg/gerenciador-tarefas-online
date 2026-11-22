'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Seal } from '@/components/ui/seal';
import { Skeleton } from '@/components/ui/skeleton';
import { TabPanel, Tabs, type TabItem } from '@/components/ui/tabs';
import { ApiError } from '@/lib/api/client';
import type { TaskWithProject } from '@/lib/api/types';
import { todayInSaoPaulo } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useMyTasks } from './api';
import {
  countByFilter,
  groupOpenTasks,
  parseFilter,
  sortCompleted,
  type TaskFilter,
} from './grouping';
import { TaskRow } from './task-row';

const TAB_PREFIX = 'my-tasks';

const TAB_LABEL: Record<TaskFilter, string> = {
  abertas: 'Abertas',
  concluidas: 'Concluídas',
  todas: 'Todas',
};

const FILTER_ORDER: readonly TaskFilter[] = ['abertas', 'concluidas', 'todas'];

const PANEL = 'rounded-card border border-edge bg-surface';

function TaskList({ tasks, today }: { tasks: readonly TaskWithProject[]; today: string }) {
  return (
    <ul className={cn(PANEL, 'divide-y divide-hairline')}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} today={today} />
      ))}
    </ul>
  );
}

function GroupHeading({ label, count, late }: { label: string; count: number; late?: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Label as="h2" className={cn(late && 'text-danger-text')}>
        {label}
      </Label>
      <Seal value={count} label={`${count} ${count === 1 ? 'tarefa' : 'tarefas'}`} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando tarefas" className="flex flex-col gap-8">
      {[3, 2].map((rows, group) => (
        <div key={group}>
          <Skeleton className="mb-3 h-6 w-40" />
          <div className={cn(PANEL, 'divide-y divide-hairline')}>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-4 w-24" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="hidden h-4 w-16 min-[720px]:block" />
                <Skeleton className="h-9 w-36" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function emptyStateFor(filter: TaskFilter) {
  if (filter === 'abertas') {
    return (
      <EmptyState
        title="Nenhuma tarefa aberta"
        description="Você está em dia. Novas tarefas atribuídas a você aparecem aqui."
      />
    );
  }
  if (filter === 'concluidas') return <EmptyState title="Nenhuma tarefa concluída ainda" />;
  return <EmptyState title="Nenhuma tarefa atribuída a você" />;
}

export function MyTasksView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get('filtro'));

  const { data, isPending, isError, error, refetch } = useMyTasks();
  const today = todayInSaoPaulo();

  const counts = useMemo(() => (data ? countByFilter(data) : null), [data]);
  const groups = useMemo(() => (data ? groupOpenTasks(data, today) : []), [data, today]);
  const completed = useMemo(() => (data ? sortCompleted(data) : []), [data]);

  const tabs: TabItem[] = FILTER_ORDER.map((id) => ({
    id,
    label: TAB_LABEL[id],
    count: counts?.[id],
  }));

  function changeFilter(id: string) {
    router.replace(`${pathname}?filtro=${parseFilter(id)}`, { scroll: false });
  }

  let content;
  if (isPending) {
    content = <ListSkeleton />;
  } else if (isError) {
    content = (
      <ErrorState
        title="Não foi possível carregar as tarefas"
        message={
          error instanceof ApiError ? error.message : 'Verifique sua conexão e tente de novo.'
        }
        onRetry={() => void refetch()}
      />
    );
  } else if (filter === 'abertas') {
    content =
      groups.length === 0 ? (
        emptyStateFor(filter)
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.id}>
              <GroupHeading
                label={group.label}
                count={group.tasks.length}
                late={group.id === 'overdue'}
              />
              <TaskList tasks={group.tasks} today={today} />
            </section>
          ))}
        </div>
      );
  } else if (filter === 'concluidas') {
    content =
      completed.length === 0 ? emptyStateFor(filter) : <TaskList tasks={completed} today={today} />;
  } else {
    content =
      data.length === 0 ? (
        emptyStateFor(filter)
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.id}>
              <GroupHeading
                label={group.label}
                count={group.tasks.length}
                late={group.id === 'overdue'}
              />
              <TaskList tasks={group.tasks} today={today} />
            </section>
          ))}
          {completed.length > 0 && (
            <section>
              <GroupHeading label="Concluídas" count={completed.length} />
              <TaskList tasks={completed} today={today} />
            </section>
          )}
        </div>
      );
  }

  return (
    <>
      <PageHeader
        title="Minhas tarefas"
        description="Tudo o que está atribuído a você, em todos os projetos."
      />
      <Tabs
        tabs={tabs}
        value={filter}
        onChange={changeFilter}
        aria-label="Filtrar tarefas"
        idPrefix={TAB_PREFIX}
        className="mb-6"
      />
      {FILTER_ORDER.map((id) => (
        <TabPanel key={id} id={id} value={filter} idPrefix={TAB_PREFIX}>
          {content}
        </TabPanel>
      ))}
    </>
  );
}
