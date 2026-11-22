import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectSummary } from '@/lib/api/types';
import { projectKeys, useProjects } from './api';
import { PROJECT_COLORS } from './color';
import { useProjectColor } from './use-project-color';

const summary = (id: string, name: string): ProjectSummary => ({
  id,
  name,
  description: null,
  startDate: '2026-10-20',
  dueDate: '2026-12-12',
  role: 'OWNER',
  memberCount: 1,
  taskCounts: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
});

function ProjectNames() {
  const projects = useProjects();
  if (projects.isError) return <p>erro</p>;
  return <p>{(projects.data ?? []).map((project) => project.name).join(', ')}</p>;
}

// Rendered after the list on purpose: the query keeps the options of the last observer.
function Swatch({ id }: { id: string }) {
  return <span data-testid={`swatch-${id}`}>{useProjectColor(id)}</span>;
}

function renderBoth(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <ProjectNames />
      <Swatch id="p-a" />
      <Swatch id="p-b" />
    </QueryClientProvider>,
  );
}

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useProjectColor', () => {
  it('ranks colours over the list the shell loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse([summary('p-b', 'Beta'), summary('p-a', 'Alfa')])),
    );
    renderBoth(new QueryClient());

    await screen.findByText('Beta, Alfa');
    expect(screen.getByTestId('swatch-p-a')).toHaveTextContent(PROJECT_COLORS[0]);
    expect(screen.getByTestId('swatch-p-b')).toHaveTextContent(PROJECT_COLORS[1]);
  });

  it('does not start a request when nothing else loads the list', () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Swatch id="p-a" />
      </QueryClientProvider>,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the list refetchable after an invalidation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([summary('p-a', 'Alfa')]))
      .mockResolvedValueOnce(jsonResponse([summary('p-a', 'Alfa'), summary('p-b', 'Beta')]));
    vi.stubGlobal('fetch', fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderBoth(client);
    await screen.findByText('Alfa');

    await client.invalidateQueries({ queryKey: projectKeys.list() });

    await waitFor(() => expect(screen.getByText('Alfa, Beta')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.getQueryState(projectKeys.list())?.status).toBe('success');
  });
});
