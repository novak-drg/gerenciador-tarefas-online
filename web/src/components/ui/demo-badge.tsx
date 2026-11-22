import { cn } from '@/lib/utils';

// Inlined at build time
const DEMO_DATA = process.env.NEXT_PUBLIC_DEMO_DATA === 'true';

/** Quiet chip that says the people and projects on screen are demonstration data. */
export function DemoBadge({ className }: { className?: string }) {
  if (!DEMO_DATA) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip border border-edge px-1.5 py-0.5',
        'font-mono text-label font-medium tracking-[0.08em] whitespace-nowrap text-secondary uppercase',
        className,
      )}
    >
      Dados de demonstração
    </span>
  );
}
