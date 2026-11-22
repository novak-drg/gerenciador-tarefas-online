import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-secondary">
        O endereço não existe ou a página ainda não foi publicada.
      </p>
      <Link href="/inicio" className={buttonStyles({ className: 'mt-6' })}>
        Voltar ao início
      </Link>
    </main>
  );
}
