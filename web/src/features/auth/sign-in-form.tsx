'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { hardNavigate } from '@/lib/navigate';
import { safeNext } from '@/lib/safe-next';
import { useLogin } from './api';
import { loginSchema, type LoginValues } from './schemas';

export function SignInForm({ next }: { next?: string }) {
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submitting = login.isPending || login.isSuccess;
  const target = safeNext(next);
  const signUpHref =
    target === '/inicio' ? '/cadastro' : `/cadastro?next=${encodeURIComponent(target)}`;

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return;
    setFormError(null);
    try {
      await login.mutateAsync(values);
      hardNavigate(target);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Não foi possível entrar. Tente novamente.',
      );
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Entrar</h1>

      {formError && (
        <div
          role="alert"
          className="mt-4 rounded-control border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
        >
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" autoFocus {...register('email')} />
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" loading={submitting} className="mt-2 w-full">
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary">
        Ainda não tem conta?{' '}
        <Link href={signUpHref} className="font-medium text-accent underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
