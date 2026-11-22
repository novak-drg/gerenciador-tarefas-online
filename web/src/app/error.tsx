'use client';

import { ErrorState } from '@/components/ui/error-state';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center px-4">
      <ErrorState
        title="Não foi possível abrir a página"
        message="O serviço pode estar indisponível no momento. Tente de novo em instantes."
        onRetry={reset}
      />
    </main>
  );
}
