'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { NewProjectDialog } from './new-project-dialog';
import { ProjectList } from './project-list';

export function ProjectsView() {
  const [creating, setCreating] = useState(false);

  const newProjectButton = (
    <Button leadingIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
      Novo projeto
    </Button>
  );

  return (
    <>
      <PageHeader title="Projetos" actions={newProjectButton} />
      <ProjectList emptyAction={newProjectButton} />
      <NewProjectDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
