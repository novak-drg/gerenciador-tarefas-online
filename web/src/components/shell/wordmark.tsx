import Link from 'next/link';
import { cn } from '@/lib/utils';

// Inlined at build time; empty means "do not show"
const ORG_NAME = (process.env.NEXT_PUBLIC_ORG_NAME ?? '').trim();

export function Wordmark({ href, className }: { href?: string; className?: string }) {
  const content = (
    <>
      <span className="block text-lg leading-tight font-semibold whitespace-nowrap">
        Tarefas Online
      </span>
      {ORG_NAME && <span className="mt-0.5 block text-xs text-secondary">{ORG_NAME}</span>}
    </>
  );

  if (!href) return <div className={className}>{content}</div>;
  return (
    <Link href={href} className={cn('-mx-2 -my-1 block rounded-control px-2 py-1', className)}>
      {content}
    </Link>
  );
}
