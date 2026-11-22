import type { Metadata } from 'next';
import { SignInForm } from '@/features/auth/sign-in-form';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <SignInForm next={typeof next === 'string' ? next : undefined} />;
}
