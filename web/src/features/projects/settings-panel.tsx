'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import type { Project } from '@/lib/api/types';
import { useDeleteProject, useUpdateProject } from './api';
import { projectFormSchema, type ProjectFormValues } from './schemas';

const FIELDS = ['name', 'description', 'startDate', 'dueDate'] as const;

function valuesOf(project: Project): ProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? '',
    startDate: project.startDate,
    dueDate: project.dueDate,
  };
}

export function SettingsPanel({ project, onDeleted }: { project: Project; onDeleted: () => void }) {
  return (
    <div className="flex max-w-xl flex-col gap-10">
      <SettingsForm project={project} />
      <DangerZone project={project} onDeleted={onDeleted} />
    </div>
  );
}

function SettingsForm({ project }: { project: Project }) {
  const toast = useToast();
  const updateProject = useUpdateProject(project.id);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: valuesOf(project),
  });
  const startDate = useWatch({ control, name: 'startDate' });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await updateProject.mutateAsync({
        name: values.name,
        description: values.description || null,
        startDate: values.startDate,
        dueDate: values.dueDate,
      });
      reset(valuesOf(updated));
      toast.success('Projeto atualizado');
    } catch (error) {
      if (error instanceof ApiError) {
        let mapped = false;
        for (const detail of error.details ?? []) {
          const field = FIELDS.find((f) => f === detail.path);
          if (field) {
            setError(field, { message: detail.message });
            mapped = true;
          }
        }
        if (!mapped) setFormError(error.message);
      } else {
        setFormError('Não foi possível salvar o projeto. Tente novamente.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <div
          role="alert"
          className="rounded-control border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
        >
          {formError}
        </div>
      )}

      <Field label="Nome" error={errors.name?.message}>
        <Input type="text" autoComplete="off" {...register('name')} />
      </Field>

      <Field label="Descrição" optional error={errors.description?.message}>
        <Textarea {...register('description')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início" error={errors.startDate?.message}>
          <Input type="date" {...register('startDate')} />
        </Field>
        <Field label="Prazo" error={errors.dueDate?.message}>
          <Input type="date" min={startDate || undefined} {...register('dueDate')} />
        </Field>
      </div>

      <div>
        <Button type="submit" loading={updateProject.isPending}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}

function DangerZone({ project, onDeleted }: { project: Project; onDeleted: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const deleteProject = useDeleteProject();
  const [confirming, setConfirming] = useState(false);

  return (
    <section
      aria-labelledby="danger-zone"
      className="flex flex-col gap-3 border-t border-hairline pt-6"
    >
      <Label as="h2" id="danger-zone" className="text-danger-text">
        Zona de perigo
      </Label>
      <p className="text-sm text-secondary">
        Excluir o projeto apaga todas as tarefas e os vínculos de membros.
      </p>
      <div>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          Excluir projeto
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Excluir o projeto ${project.name}?`}
        description="Todas as tarefas e vínculos de membros serão apagados. Esta ação não pode ser desfeita."
        confirmLabel="Excluir projeto"
        destructive
        loading={deleteProject.isPending}
        onConfirm={() =>
          deleteProject.mutate(project.id, {
            onSuccess: () => {
              toast.success('Projeto excluído');
              setConfirming(false);
              onDeleted();
              router.push('/projetos');
            },
            onError: (error) => {
              toast.error(error.message);
              setConfirming(false);
            },
          })
        }
      />
    </section>
  );
}
