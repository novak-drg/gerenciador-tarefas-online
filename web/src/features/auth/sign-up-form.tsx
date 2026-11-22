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
import { useRegister } from './api';
import { registerSchema, type RegisterValues } from './schemas';

export function SignUpForm({ next }: { next?: string }) {
  const signUp = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const submitting = signUp.isPending || signUp.isSuccess;
  const target = safeNext(next);
  const signInHref =
    target === '/inicio' ? '/entrar' : `/entrar?next=${encodeURIComponent(target)}`;

  const onSubmit = handleSubmit(async (values) => {
    if (submitting) return;
    setFormError(null);
    try {
      await signUp.mutateAsync(values);
      hardNavigate(target);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { message: 'Este e-mail já está cadastrado' }, { shouldFocus: true });
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível criar a conta. Tente novamente.',
      );
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Criar conta</h1>

      {formError && (
        <div
          role="alert"
          className="mt-4 rounded-control border border-danger bg-danger-bg px-3 py-2 text-sm text-danger-text"
        >
          {formError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Nome" error={errors.name?.message}>
          <Input type="text" autoComplete="name" autoFocus {...register('name')} />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Senha" error={errors.password?.message} hint="Mínimo de 8 caracteres">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pr-24"
              {...register('password')}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-1 min-h-9 -translate-y-1/2 rounded-control px-3 text-sm font-medium text-accent transition-colors duration-150 ease-out hover:bg-pressed"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </Field>
        <Button type="submit" loading={submitting} className="mt-2 w-full">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary">
        Já tem uma conta?{' '}
        <Link href={signInHref} className="font-medium text-accent underline underline-offset-4">
          Já tenho conta
        </Link>
      </p>
    </div>
  );
}
