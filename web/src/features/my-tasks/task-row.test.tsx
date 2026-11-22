import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import type { TaskWithProject } from '@/lib/api/types';
import { TaskRow } from './task-row';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const task: TaskWithProject = {
  id: 't-1',
  projectId: 'p-1',
  title: 'Reservar o salão',
  description: null,
  status: 'TODO',
  priority: 'HIGH',
  position: 0,
  dueDate: '2026-11-20',
  assignee: null,
  createdBy: { id: 'u-1', name: 'Helena', email: 'helena@demo.local' },
  completedAt: null,
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
  project: { id: 'p-1', name: 'Festa Comunitária' },
};

function renderRow(row: TaskWithProject = task) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ul>
          <TaskRow task={row} today="2026-11-22" />
        </ul>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TaskRow', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('links the title to the task on its board and flags lateness in words', () => {
    renderRow();
    expect(screen.getByRole('link', { name: 'Reservar o salão' })).toHaveAttribute(
      'href',
      '/projetos/p-1?tarefa=t-1',
    );
    expect(screen.getByText('atrasada há 2 dias')).toBeInTheDocument();
    expect(screen.getByText('Festa Comunitária')).toBeInTheDocument();
  });

  it('moves the task to the end of the new column and confirms', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/move') ? jsonResponse(200, []) : jsonResponse(200, null),
    );
    renderRow();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status de Reservar o salão' }),
      'DONE',
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/tasks/t-1/move');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ status: 'DONE', position: 9999 });
    expect(await screen.findByText('Tarefa concluída')).toBeInTheDocument();
  });

  it('says "Status atualizado" for a move that does not finish the task', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async () => jsonResponse(200, []));
    renderRow();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status de Reservar o salão' }),
      'IN_PROGRESS',
    );
    expect(await screen.findByText('Status atualizado')).toBeInTheDocument();
  });

  it('shows an error toast when the API refuses', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async () =>
      jsonResponse(404, { statusCode: 404, error: 'Not Found', message: 'Tarefa não encontrada' }),
    );
    renderRow();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status de Reservar o salão' }),
      'DONE',
    );
    expect(
      await screen.findByText('Não foi possível atualizar a tarefa. Tente de novo.'),
    ).toBeInTheDocument();
  });

  it('strikes through a finished task and shows when it was completed', () => {
    renderRow({
      ...task,
      status: 'DONE',
      completedAt: '2026-11-12T15:00:00Z',
    });
    expect(screen.getByRole('link', { name: 'Reservar o salão' })).toHaveClass('line-through');
    expect(screen.getByText('concluída em 12 nov')).toBeInTheDocument();
    expect(screen.queryByText(/atrasada/)).not.toBeInTheDocument();
  });
});
