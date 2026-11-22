import type { ReactNode } from 'react';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Wordmark } from '@/components/shell/wordmark';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Wordmark className="text-center" />
        <DemoBadge />
      </div>
      <div className="rounded-card border border-edge bg-surface p-6 sm:p-8">{children}</div>
    </main>
  );
}
