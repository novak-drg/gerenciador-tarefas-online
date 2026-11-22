'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { useUserSearch } from '@/features/users/api';
import { ApiError } from '@/lib/api/client';
import type { User } from '@/lib/api/types';
import { todayInSaoPaulo } from '@/lib/dates';
import { useCreateProject } from './api';
import { projectFormSchema, type ProjectFormValues } from './schemas';

const FIELDS = ['name', 'description', 'startDate', 'dueDate'] as const;

export type NewProjectDialogProps = { open: boolean; onClose: () => void };

export function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo projeto"
      description="Defina o período e convide quem vai participar. Você será o dono do projeto."
      size="lg"
    >
      <NewProjectForm onClose={onClose} />
    </Dialog>
  );
}

function NewProjectForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { user: me } = useSession();
  const createProject = useCreateProject();
  const [formError, setFormError] = useState<string | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: '', description: '', startDate: todayInSaoPaulo(), dueDate: '' },
  });
  const startDate = useWatch({ control, name: 'startDate' });

  const found = useUserSearch(search);
  const chosenIds = new Set(members.map((m) => m.id));
  const matches = (found.data ?? []).filter((u) => u.id !== me.id && !chosenIds.has(u.id));

  function addMember(user: User) {
    setMembers((current) => [...current, user]);
    setSearch('');
    searchRef.current?.focus();
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.preventDefault(); // Enter searches, it does not submit the form
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const project = await createProject.mutateAsync({
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
        startDate: values.startDate,
        dueDate: values.dueDate,
        ...(members.length > 0 ? { memberIds: members.map((m) => m.id) } : {}),
      });
      toast.success('Projeto criado');
      onClose();
      router.push(`/projetos/${project.id}`);
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
        setFormError('Não foi possível criar o projeto. Tente novamente.');
      }
    }
  });

  const searchStatus = !found.enabled
    ? ''
    : found.isFetching || !found.settled
      ? 'Buscando…'
      : matches.length === 0
        ? 'Nenhuma pessoa encontrada.'
        : `${matches.length} ${matches.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}.`;

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
        <Input type="text" autoFocus autoComplete="off" {...register('name')} />
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

      <div className="flex flex-col gap-2">
        <Field
          label="Membros"
          optional
          hint="Busque pelo nome ou pelo e-mail. Mínimo de 2 caracteres."
        >
          <Input
            ref={searchRef}
            type="search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
        </Field>

        <p aria-live="polite" className="min-h-4 text-xs text-secondary">
          {searchStatus}
        </p>

        {matches.length > 0 && (
          <ul className="divide-y divide-hairline rounded-control border border-hairline bg-surface">
            {matches.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-secondary">{user.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Adicionar ${user.name}`}
                  onClick={() => addMember(user)}
                >
                  Adicionar
                </Button>
              </li>
            ))}
          </ul>
        )}

        {members.length > 0 && (
          <ul aria-label="Membros escolhidos" className="flex flex-wrap gap-2">
            {members.map((user) => (
              <li
                key={user.id}
                className="flex items-center gap-1 rounded-chip border border-control bg-surface py-0.5 pr-0.5 pl-2.5 text-sm"
              >
                <span>{user.name}</span>
                <button
                  type="button"
                  aria-label={`Remover ${user.name}`}
                  onClick={() => setMembers((current) => current.filter((m) => m.id !== user.id))}
                  className="inline-flex size-7 items-center justify-center rounded-chip transition-colors duration-150 ease-out hover:bg-pressed"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogActions>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={createProject.isPending}>
          Criar projeto
        </Button>
      </DialogActions>
    </form>
  );
}
