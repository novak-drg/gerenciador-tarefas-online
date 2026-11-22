'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useUserSearch } from '@/features/users/api';
import type { Member, Project, User } from '@/lib/api/types';
import { formatShort, todayInSaoPaulo } from '@/lib/dates';
import { useAddMember, useRemoveMember } from './api';

export function MembersPanel({ project }: { project: Project }) {
  const isOwner = project.role === 'OWNER';
  const toast = useToast();
  const removeMember = useRemoveMember(project.id);
  const [removing, setRemoving] = useState<Member | null>(null);

  const members = [...project.members].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'OWNER' ? -1 : 1;
    return a.user.name.localeCompare(b.user.name, 'pt-BR');
  });

  return (
    <div className="flex flex-col gap-8">
      {isOwner && <AddMember project={project} />}

      <ul className="divide-y divide-hairline rounded-card border border-edge bg-surface">
        {members.map((member) => (
          <li
            key={member.user.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <Avatar name={member.user.name} />
            <div className="min-w-0 flex-1 basis-48">
              <p className="truncate text-sm font-medium">{member.user.name}</p>
              <p className="truncate text-xs text-secondary">{member.user.email}</p>
            </div>
            <span className="w-[4.5rem]">
              <span className="rounded-chip border border-hairline px-2 py-0.5 text-xs font-medium">
                {member.role === 'OWNER' ? 'Dono' : 'Membro'}
              </span>
            </span>
            <span className="w-24 text-xs text-secondary">
              desde {formatShort(todayInSaoPaulo(new Date(member.addedAt)))}
            </span>
            {isOwner && (
              <div className="w-24 text-right">
                {member.role !== 'OWNER' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Remover ${member.user.name}`}
                    onClick={() => setRemoving(member)}
                  >
                    Remover
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remover ${removing?.user.name ?? ''} do projeto?`}
        description={`As tarefas atribuídas a ${removing?.user.name ?? ''} ficarão sem responsável.`}
        confirmLabel="Remover"
        destructive
        loading={removeMember.isPending}
        onConfirm={() => {
          if (!removing) return;
          removeMember.mutate(removing.user.id, {
            onSuccess: () => {
              toast.success('Membro removido');
              setRemoving(null);
            },
            onError: (error) => {
              toast.error(error.message);
              setRemoving(null);
            },
          });
        }}
      />
    </div>
  );
}

function AddMember({ project }: { project: Project }) {
  const toast = useToast();
  const addMember = useAddMember(project.id);
  const [search, setSearch] = useState('');
  const found = useUserSearch(search);
  const memberIds = new Set(project.members.map((m) => m.user.id));

  const status = !found.enabled
    ? 'Digite ao menos 2 caracteres.'
    : found.isFetching || !found.settled
      ? 'Buscando…'
      : (found.data ?? []).length === 0
        ? 'Nenhuma pessoa encontrada.'
        : `${found.data?.length} ${found.data?.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}.`;

  function add(user: User) {
    addMember.mutate(user.id, {
      onSuccess: () => {
        toast.success('Membro adicionado');
        setSearch('');
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <section aria-labelledby="add-member" className="flex max-w-xl flex-col gap-2">
      <Label as="h2" className="text-ink" id="add-member">
        Adicionar membro
      </Label>
      <Field label="Nome ou e-mail">
        <Input
          type="search"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
        />
      </Field>
      <p aria-live="polite" className="min-h-4 text-xs text-secondary">
        {status}
      </p>
      {(found.data ?? []).length > 0 && (
        <ul className="divide-y divide-hairline rounded-control border border-edge bg-surface">
          {(found.data ?? []).map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-secondary">{user.email}</p>
              </div>
              {memberIds.has(user.id) ? (
                <span className="text-xs text-secondary">Já é membro</span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Adicionar ${user.name}`}
                  loading={addMember.isPending && addMember.variables === user.id}
                  onClick={() => add(user)}
                >
                  Adicionar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
