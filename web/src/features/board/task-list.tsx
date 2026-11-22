'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/input';
import { PriorityMark, StatusMark } from '@/components/ui/marks';
import type { Project, Task, TaskStatus } from '@/lib/api/types';
import { dueLabel, formatShort, isOverdue } from '@/lib/dates';
import { STATUS_LABEL, STATUS_ORDER } from '@/lib/labels';
import { cn } from '@/lib/utils';
import {
  ALL,
  DEFAULT_SORT,
  NO_ASSIGNEE,
  NO_FILTERS,
  filterTasks,
  hasActiveFilters,
  nextSort,
  sortTasks,
  type SortKey,
  type SortState,
  type TaskFilters,
} from './list-logic';

const COLUMNS: readonly { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Tarefa' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'assignee', label: 'Responsável' },
  { key: 'dueDate', label: 'Prazo' },
];

function ariaSort(sort: SortState, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

export type TaskListProps = {
  project: Project;
  tasks: readonly Task[];
  today: string;
  onOpenTask: (task: Task) => void;
};

export function TaskList({ project, tasks, today, onOpenTask }: TaskListProps) {
  const [filters, setFilters] = useState<TaskFilters>(NO_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const rows = useMemo(() => sortTasks(filterTasks(tasks, filters), sort), [tasks, filters, sort]);
  const members = useMemo(
    () => [...project.members].sort((a, b) => a.user.name.localeCompare(b.user.name, 'pt-BR')),
    [project.members],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Status" className="w-full sm:w-52">
          <Select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value as TaskStatus | typeof ALL }))
            }
          >
            <option value={ALL}>Todos</option>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsável" className="w-full sm:w-64">
          <Select
            value={filters.assignee}
            onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
          >
            <option value={ALL}>Todos</option>
            {members.map(({ user }) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
            <option value={NO_ASSIGNEE}>Sem responsável</option>
          </Select>
        </Field>
        <p aria-live="polite" className="pb-2.5 text-sm text-secondary">
          {rows.length} {rows.length === 1 ? 'tarefa' : 'tarefas'}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilters(filters) ? 'Nenhuma tarefa com esses filtros' : 'Nenhuma tarefa ainda'
          }
          description={
            hasActiveFilters(filters)
              ? undefined
              : 'Crie a primeira tarefa para começar a organizar o projeto.'
          }
          action={
            hasActiveFilters(filters) ? (
              <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-edge bg-surface">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <caption className="sr-only">Tarefas do projeto</caption>
            <thead>
              <tr className="border-b border-hairline">
                {COLUMNS.map(({ key, label }) => {
                  const active = sort.key === key;
                  const Icon = !active
                    ? ChevronsUpDown
                    : sort.direction === 'asc'
                      ? ArrowUp
                      : ArrowDown;
                  return (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={ariaSort(sort, key)}
                      className={cn('px-4 py-1 font-normal', key === 'title' && 'w-[38%]')}
                    >
                      <button
                        type="button"
                        onClick={() => setSort((current) => nextSort(current, key))}
                        className={cn(
                          'inline-flex min-h-9 items-center gap-1.5 rounded-chip font-mono text-label font-medium tracking-[0.12em] uppercase',
                          active ? 'text-ink' : 'text-secondary hover:text-ink',
                        )}
                      >
                        {label}
                        <Icon aria-hidden className={cn('size-3.5', !active && 'opacity-60')} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => {
                const late = isOverdue(task.dueDate, task.status, today);
                return (
                  <tr
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className="cursor-pointer border-b border-hairline transition-colors duration-150 ease-out last:border-b-0 hover:bg-pressed"
                  >
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenTask(task);
                        }}
                        className={cn(
                          'min-h-9 rounded-chip text-left text-[15px] font-medium break-words',
                          task.status === 'DONE' && 'text-secondary line-through',
                        )}
                      >
                        {task.title}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <StatusMark status={task.status} />
                    </td>
                    <td className="px-4 py-2">
                      <PriorityMark priority={task.priority} />
                    </td>
                    <td className="px-4 py-2">
                      {task.assignee ? (
                        <span className="inline-flex items-center gap-2">
                          <Avatar name={task.assignee.name} size="sm" />
                          <span>{task.assignee.name}</span>
                        </span>
                      ) : (
                        <span className="text-secondary">Sem responsável</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {task.dueDate ? (
                        <span className={cn(late && 'font-medium text-danger-text')}>
                          {formatShort(task.dueDate)}
                          {task.status !== 'DONE' && (
                            <span className={cn('ml-2 text-xs', !late && 'text-secondary')}>
                              {dueLabel(task.dueDate, today)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-secondary">sem prazo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
