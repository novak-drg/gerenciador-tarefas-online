import type { Metadata } from 'next';
import { DashboardView } from '@/features/dashboard/dashboard-view';

export const metadata: Metadata = { title: 'Início' };

export default function HomePage() {
  return <DashboardView />;
}
