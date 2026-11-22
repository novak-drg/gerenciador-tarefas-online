'use client';

import { Menu } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { DemoBadge } from '@/components/ui/demo-badge';
import { IconButton } from '@/components/ui/icon-button';
import { useModalDialog } from '@/components/ui/dialog';
import { Sidebar, SidebarContent } from './sidebar';
import { Wordmark } from './wordmark';

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogProps = useModalDialog(open, onClose);
  return (
    <dialog
      {...dialogProps}
      aria-label="Menu"
      className="m-0 h-dvh max-h-none w-[min(20rem,calc(100%-3rem))] max-w-none overflow-hidden border-r border-hairline bg-drawer p-0 shadow-float"
    >
      {open && <SidebarContent onNavigate={onClose} onClose={onClose} />}
    </dialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col shell:flex-row">
      <a
        href="#conteudo"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-control focus-visible:bg-ink focus-visible:px-4 focus-visible:py-2 focus-visible:text-on-ink"
      >
        Ir para o conteúdo
      </a>

      <header className="flex items-center gap-2 border-b border-hairline bg-drawer px-2 py-2 shell:hidden">
        <IconButton aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
          <Menu className="size-5" />
        </IconButton>
        <Wordmark href="/inicio" />
        <DemoBadge className="mr-2 ml-auto" />
      </header>

      <Sidebar />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto outline-none">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 shell:px-8 shell:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
