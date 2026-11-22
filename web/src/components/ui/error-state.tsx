import { cn } from '@/lib/utils';
import { Button } from './button';

export type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = 'Algo deu errado',
  message = 'Não foi possível carregar os dados. Verifique sua conexão e tente de novo.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-card border border-edge bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-[44ch] text-sm text-secondary">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
