import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInForm } from './sign-in-form';

const hardNavigate = vi.fn();
vi.mock('@/lib/navigate', () => ({ hardNavigate: (url: string) => hardNavigate(url) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderForm(next?: string) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SignInForm next={next} />
    </QueryClientProvider>,
  );
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SignInForm', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    hardNavigate.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows Portuguese validation messages without calling the API', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o e-mail')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the API message in an alert above the form on wrong credentials', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'E-mail ou senha inválidos',
      }),
    );
    renderForm();

    await user.type(screen.getByLabelText('E-mail'), 'helena@demo.local');
    await user.type(screen.getByLabelText('Senha'), 'errada123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('E-mail ou senha inválidos');
    expect(hardNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('disables the button while submitting, then goes to the safe next target', async () => {
    const user = userEvent.setup();
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    renderForm('/projetos');

    await user.type(screen.getByLabelText('E-mail'), 'helena@demo.local');
    await user.type(screen.getByLabelText('Senha'), 'demo12345');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const button = await screen.findByRole('button', { name: 'Entrar' });
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve(jsonResponse(200, { user: { id: '1', name: 'Helena', email: 'helena@demo.local' } }));
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/projetos'));
  });

  it('ignores an unsafe next target', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(200, { user: { id: '1', name: 'Helena', email: 'helena@demo.local' } }),
    );
    renderForm('//evil.example');

    await user.type(screen.getByLabelText('E-mail'), 'helena@demo.local');
    await user.type(screen.getByLabelText('Senha'), 'demo12345');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/inicio'));
  });
});
