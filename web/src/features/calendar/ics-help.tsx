import { ChevronDown } from 'lucide-react';

export function IcsHelp() {
  return (
    <details className="group mt-8 rounded-card border border-edge bg-surface">
      <summary className="flex min-h-11 list-none items-center justify-between gap-3 rounded-card px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Como usar o arquivo .ics
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-secondary transition-transform duration-150 ease-out group-open:rotate-180"
        />
      </summary>
      <ol className="flex list-decimal flex-col gap-2 border-t border-hairline py-4 pr-4 pl-9 text-sm text-secondary marker:text-ink">
        <li>Baixe o arquivo com o botão &ldquo;Exportar .ics&rdquo;, no alto desta página.</li>
        <li>
          No Google Agenda: Configurações &gt; Importar e exportar &gt; Importar, e escolha o
          arquivo baixado.
        </li>
        <li>
          No Outlook: Adicionar calendário &gt; Carregar do arquivo, e escolha o arquivo baixado.
        </li>
      </ol>
    </details>
  );
}
