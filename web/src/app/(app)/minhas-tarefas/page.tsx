import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MyTasksView } from '@/features/my-tasks/my-tasks-view';

export const metadata: Metadata = { title: 'Minhas tarefas' };

export default function MyTasksPage() {
  return (
    <Suspense fallback={null}>
      <MyTasksView />
    </Suspense>
  );
}
