'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import {
  useCreateTask,
  useDeleteTask,
  useMoveTask,
  useProjectTasks,
  useUpdateTask,
} from '@/features/tasks/api';
import { ApiError } from '@/lib/api/client';
import type { Project, Task, TaskStatus } from '@/lib/api/types';
import { formatShort, todayInSaoPaulo } from '@/lib/dates';
import { PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL, STATUS_ORDER } from '@/lib/labels';
import { TASK_FORM_FIELDS, taskFormSchema, type TaskFormValues } from './task-form-schema';

export type TaskDialogProps = {
  open: boolean;
  onClose: () => void;
  project: Project;
  /** The task to edit; null opens the create form */
  task: Task | null;
  /** Status preselected when creating */
  defaultStatus?: TaskStatus;
};

export function TaskDialog({
  open,
  onClose,
  project,
  task,
  defaultStatus = 'TODO',
}: TaskDialogProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const toast = useToast();
  const deleteTask = useDeleteTask(project.id);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={task ? 'Editar tarefa' : 'Nova tarefa'}
        size="lg"
      >
        <TaskForm
          key={task?.id ?? `new-${defaultStatus}`}
          project={project}
          task={task}
          defaultStatus={defaultStatus}
          onClose={onClose}
          onRequestDelete={() => setConfirmingDelete(true)}
        />
      </Dialog>
      {/* A sibling, not a child: a nested <dialog> would pass its Escape on to this one */}
      <ConfirmDialog
        open={open && confirmingDelete && task !== null}
        onClose={() => setConfirmingDelete(false)}
        title="Excluir tarefa?"
        description={`${task?.title ?? ''} será removida do projeto. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir tarefa"
        destructive
        loading={deleteTask.isPending}
        onConfirm={() => {
          if (!task) return;
          deleteTask.mutate(task.id, {
            onSuccess: () => {
              toast.success('Tarefa excluída');
              setConfirmingDelete(false);
              onClose();
            },
            onError: (error) => {
              toast.error(error.message);
              setConfirmingDelete(false);
            },
          });
        }}
      />
    </>
  );
}

function valuesOf(task: Task | null, defaultStatus: TaskStatus): TaskFormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'MEDIUM',
    dueDate: task?.dueDate ?? '',
    assigneeId: task?.assignee?.id ?? '',
    status: task?.status ?? defaultStatus,
  };
}

function TaskForm({
  project,
  task,
  defaultStatus,
  onClose,
  onRequestDelete,
}: {
  project: Project;
  task: Task | null;
  defaultStatus: TaskStatus;
  onClose: () => void;
  onRequestDelete: () => void;
}) {
  const toast = useToast();
  const { user: me } = useSession();
  const tasks = useProjectTasks(project.id);
  const createTask = useCreateTask(project.id);
  const updateTask = useUpdateTask();
  const moveTask = useMoveTask(project.id);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initial = valuesOf(task, defaultStatus);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<TaskFormValues>({ resolver: zodResolver(taskFormSchema), defaultValues: initial });
  const dueDate = useWatch({ control, name: 'dueDate' });

  const canDelete = task !== null && (project.role === 'OWNER' || task.createdBy.id === me.id);

  const members = [...project.members].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'OWNER' ? -1 : 1;
    return a.user.name.localeCompare(b.user.name, 'pt-BR');
  });

  function showApiError(error: unknown) {
    if (error instanceof ApiError) {
      let mapped = false;
      for (const detail of error.details ?? []) {
        const field = TASK_FORM_FIELDS.find((f) => f === detail.path);
        if (field) {
          setError(field, { message: detail.message });
          mapped = true;
        }
      }
      if (!mapped) setFormError(error.message);
    } else {
      setFormError('Não foi possível salvar a tarefa. Tente novamente.');
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSaving(true);
    try {
      if (!task) {
        await createTask.mutateAsync({
          title: values.title,
          ...(values.description ? { description: values.description } : {}),
          priority: values.priority,
          ...(values.dueDate ? { dueDate: values.dueDate } : {}),
          ...(values.assigneeId ? { assigneeId: values.assigneeId } : {}),
          status: values.status,
        });
        toast.success('Tarefa criada');
        onClose();
        return;
      }

      const fieldsChanged =
        values.title !== initial.title ||
        values.description !== initial.description ||
        values.priority !== initial.priority ||
        values.dueDate !== initial.dueDate ||
        values.assigneeId !== initial.assigneeId;
      if (fieldsChanged) {
        await updateTask.mutateAsync({
          id: task.id,
          title: values.title,
          description: values.description || null,
          priority: values.priority,
          dueDate: values.dueDate || null,
          assigneeId: values.assigneeId || null,
        });
      }
      if (values.status !== task.status) {
        // a status change lands the task at the end of the new column
        const inTarget = (tasks.data ?? []).filter(
          (t) => t.status === values.status && t.id !== task.id,
        ).length;
        await moveTask.mutateAsync({ id: task.id, status: values.status, position: inTarget });
      }
      if (fieldsChanged || values.status !== task.status) toast.success('Tarefa salva');
      onClose();
    } catch (error) {
      showApiError(error);
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {task && (
        <Label as="p">
          Criada por {task.createdBy.name} em{' '}
          {formatShort(todayInSaoPaulo(new Date(task.createdAt)))}
        </Label>
      )}

      {formError && (
        <div
          role="alert"
          className="rounded-control border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
        >
          {formError}
        </div>
      )}

      <Field label="Título" error={errors.title?.message}>
        <Input type="text" autoFocus autoComplete="off" {...register('title')} />
      </Field>

      <Field label="Descrição" optional error={errors.description?.message}>
        <Textarea {...register('description')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prioridade" error={errors.priority?.message}>
          <Select {...register('priority')}>
            {PRIORITY_ORDER.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <Select {...register('status')}>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Responsável" error={errors.assigneeId?.message}>
          <Select {...register('assigneeId')}>
            <option value="">Sem responsável</option>
            {members.map(({ user }) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Prazo" optional error={errors.dueDate?.message}>
          <div className="flex items-center gap-1">
            <Input type="date" {...register('dueDate')} />
            {dueDate && (
              <Button
                size="sm"
                variant="ghost"
                aria-label="Limpar prazo"
                onClick={() => setValue('dueDate', '', { shouldDirty: true })}
              >
                Limpar
              </Button>
            )}
          </div>
        </Field>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          {canDelete && (
            <Button variant="danger" onClick={onRequestDelete}>
              Excluir tarefa
            </Button>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {task ? 'Salvar' : 'Criar tarefa'}
          </Button>
        </div>
      </div>
    </form>
  );
}
