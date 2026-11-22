import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { QueryProvider } from '@/lib/query-client';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Tarefas Online', template: '%s | Tarefas Online' },
  description: 'Projetos, quadro de tarefas e calendário da equipe.',
};

export const viewport: Viewport = {
  themeColor: '#E9E2D3',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body>
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
