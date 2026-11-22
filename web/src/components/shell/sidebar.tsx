'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { IconButton } from '@/components/ui/icon-button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useLogout } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { useProjects } from '@/features/projects/api';
import { useProjectColors } from '@/features/projects/use-project-color';
import { cn } from '@/lib/utils';
import { Wordmark } from './wordmark';

const NAV = [
  { href: '/inicio', label: 'Início', exact: false },
  { href: '/projetos', label: 'Projetos', exact: true },
  { href: '/minhas-tarefas', label: 'Minhas tarefas', exact: false },
  { href: '/calendario', label: 'Calendário', exact: false },
] as const;

function NavLink({
  href,
  active,
  onNavigate,
  children,
  leading,
}: {
  href: string;
  active: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-9 items-center gap-2.5 rounded-control px-3 text-sm text-ink transition-colors duration-150 ease-out',
        active ? 'bg-recess font-semibold' : 'font-normal hover:bg-pressed',
      )}
    >
      {leading}
      <span className="min-w-0 truncate">{children}</span>
    </Link>
  );
}

/** `onNavigate` closes the drawer after a link is followed; `onClose` adds a close button (drawer only). */
export function SidebarContent({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useSession();
  const projects = useProjects();
  const colorOf = useProjectColors();
  const logout = useLogout();
  const toast = useToast();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 px-5 pt-6 pb-4">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <Wordmark href="/inicio" />
          <DemoBadge />
        </div>
        {onClose && (
          <IconButton aria-label="Fechar menu" size="sm" className="-mt-1 -mr-2" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        )}
      </div>

      <nav
        aria-label="Principal"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4"
      >
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <NavLink href={item.href} active={active} onNavigate={onNavigate}>
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <Label as="h2" className="mt-8 mb-2 px-3">
          Projetos
        </Label>

        {projects.isPending ? (
          <div
            className="flex flex-col gap-2 px-3"
            aria-busy="true"
            aria-label="Carregando projetos"
          >
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : projects.isError ? (
          <div className="px-3 text-sm text-secondary">
            <p>Não foi possível carregar.</p>
            <button
              type="button"
              onClick={() => void projects.refetch()}
              className="mt-1 font-medium text-accent underline underline-offset-4"
            >
              Tentar de novo
            </button>
          </div>
        ) : projects.data.length === 0 ? (
          <p className="px-3 text-sm text-secondary">Nenhum projeto ainda.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {projects.data.map((project) => {
              const href = `/projetos/${project.id}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={project.id}>
                  <NavLink
                    href={href}
                    active={active}
                    onNavigate={onNavigate}
                    leading={
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0"
                        style={{ backgroundColor: colorOf(project.id) }}
                      />
                    }
                  >
                    {project.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-hairline px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-secondary">{user.email}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          loading={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, {
              onError: () => toast.error('Não foi possível sair. Tente novamente.'),
            })
          }
        >
          Sair
        </Button>
      </div>
    </div>
  );
}

/** Fixed 248px column on wide screens. */
export function Sidebar() {
  return (
    <aside className="hidden w-62 shrink-0 border-r border-hairline bg-drawer shell:block">
      <SidebarContent />
    </aside>
  );
}
