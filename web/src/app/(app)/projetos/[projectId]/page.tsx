import type { Metadata } from 'next';
import { ProjectPageView } from '@/features/projects/project-page-view';

export const metadata: Metadata = { title: 'Projeto' };

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectPageView projectId={projectId} />;
}
