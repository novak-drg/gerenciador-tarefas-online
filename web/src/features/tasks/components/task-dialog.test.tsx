import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import { SessionProvider } from '@/features/auth/session';
import type { Project, Task, User } from '@/lib/api/types';
import { TaskDialog } from './task-dialog';

const helena: User = { id: 'u-helena', name: 'Helena Martins', email: 'helena@demo.local' };
const rafael: User = { id: 'u-rafael', name: 'Rafael Costa', email: 'rafael@demo.local' };

const project: Project = {
  id: 'p1',
  name: 'Campanha',
  description: null,
  startDate: '2026-10-20',
  dueDate: '2026-12-12',
  role: 'OWNER',
  memberCount: 2,
  taskCounts: { TODO: 1, IN_PROGRESS: 0, DONE: 0 },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  members: [
    { user: helena, role: 'OWNER', addedAt: '2026-10-01T00:00:00.000Z' },
    { user: rafael, role: 'MEMBER', addedAt: '2026-10-02T00:00:00.000Z' },
  ],
};

const task: Task = {
  id: 't1',
  projectId: 'p1',
  title: 'Definir roteiro',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  position: 0,
  dueDate: '2026-11-30',
  assignee: null,
  createdBy: rafael,
  completedAt: null,
  createdAt: '2026-11-20T15:00:00.000Z',
  updatedAt: '2026-11-20T15:00:00.000Z',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn();

function writes() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method && init.method !== 'GET')
    .map(([url, init]) => ({
      method: init.method as string,
      url: url as string,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    }));
}

function renderDialog(
  props: {
    task?: Task | null;
    viewer?: User;
    role?: Project['role'];
    defaultStatus?: Task['status'];
  } = {},
) {
  const onClose = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SessionProvider user={props.viewer ?? helena}>
        <ToastProvider>
          <TaskDialog
            open
            onClose={onClose}
            project={{ ...project, role: props.role ?? 'OWNER' }}
            task={props.task ?? null}
            defaultStatus={props.defaultStatus}
          />
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>,
  );
  return { onClose };
}

describe('TaskDialog', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url === '/api/projects/p1/tasks') return jsonResponse(200, [task]);
      if (method === 'POST') return jsonResponse(201, { ...task, id: 't2' });
      if (url.endsWith('/move')) return jsonResponse(200, [task]);
      if (method === 'PATCH') return jsonResponse(200, task);
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for a title before creating anything', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    expect(await screen.findByText('Informe o título da tarefa')).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it('rejects a one character title', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText('Título'), 'a');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    expect(
      await screen.findByText('O título precisa ter ao menos 2 caracteres'),
    ).toBeInTheDocument();
  });

  it('creates a task in the preselected column with the right body', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({ defaultStatus: 'IN_PROGRESS' });

    expect(screen.getByRole('dialog', { name: 'Nova tarefa' })).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toHaveValue('IN_PROGRESS');

    await user.type(screen.getByLabelText('Título'), '  Escrever textos  ');
    await user.selectOptions(screen.getByLabelText('Prioridade'), 'HIGH');
    await user.selectOptions(screen.getByLabelText('Responsável'), 'u-rafael');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(writes()).toEqual([
      {
        method: 'POST',
        url: '/api/projects/p1/tasks',
        body: {
          title: 'Escrever textos',
          priority: 'HIGH',
          assigneeId: 'u-rafael',
          status: 'IN_PROGRESS',
        },
      },
    ]);
  });

  it('maps field errors from the API to the fields', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? jsonResponse(400, {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Dados inválidos',
            details: [{ path: 'title', message: 'Título já usado' }],
          })
        : jsonResponse(200, []),
    );
    const user = userEvent.setup();
    const { onClose } = renderDialog();
    await user.type(screen.getByLabelText('Título'), 'Repetida');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    expect(await screen.findByText('Título já usado')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('edits only what changed and shows who created the task', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({ task });

    expect(screen.getByRole('dialog', { name: 'Editar tarefa' })).toBeInTheDocument();
    expect(screen.getByText(/Criada por Rafael Costa em 20 nov/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Definir roteiro final');
    await user.click(screen.getByRole('button', { name: 'Limpar prazo' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(writes()).toEqual([
      {
        method: 'PATCH',
        url: '/api/tasks/t1',
        body: {
          title: 'Definir roteiro final',
          description: null,
          priority: 'MEDIUM',
          dueDate: null,
          assigneeId: null,
        },
      },
    ]);
  });

  it('moves the task to the end of the new column when the status changes', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({ task });
    await user.selectOptions(screen.getByLabelText('Status'), 'DONE');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(writes()).toEqual([
      { method: 'PATCH', url: '/api/tasks/t1/move', body: { status: 'DONE', position: 0 } },
    ]);
  });

  it('offers to delete to the project owner', () => {
    renderDialog({ task, viewer: helena, role: 'OWNER' });
    expect(screen.getByRole('button', { name: 'Excluir tarefa' })).toBeInTheDocument();
  });

  it('offers to delete to the person who created the task', () => {
    renderDialog({ task, viewer: rafael, role: 'MEMBER' });
    expect(screen.getByRole('button', { name: 'Excluir tarefa' })).toBeInTheDocument();
  });

  it('hides delete from a member who did not create the task', () => {
    renderDialog({ task: { ...task, createdBy: helena }, viewer: rafael, role: 'MEMBER' });
    expect(screen.queryByRole('button', { name: 'Excluir tarefa' })).not.toBeInTheDocument();
  });

  it('confirms before deleting and then deletes', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({ task, viewer: helena, role: 'OWNER' });

    await user.click(screen.getByRole('button', { name: 'Excluir tarefa' }));
    const confirm = await screen.findByRole('dialog', { name: 'Excluir tarefa?' });
    expect(
      screen.getByText(
        'Definir roteiro será removida do projeto. Esta ação não pode ser desfeita.',
      ),
    ).toBeInTheDocument();
    expect(writes()).toEqual([]);

    await user.click(within(confirm).getByRole('button', { name: 'Excluir tarefa' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(writes()).toEqual([{ method: 'DELETE', url: '/api/tasks/t1', body: undefined }]);
  });
});
