import type { ApiTask, ApiTaskWithProject } from '@/common/contract';
import { formatDateOnly } from '@/common/dates';
import { userSelect } from '@/common/user-select';
import type { Prisma } from '@/generated/prisma/client';

export const taskInclude = {
  assignee: { select: userSelect },
  createdBy: { select: userSelect },
} satisfies Prisma.TaskInclude;

export const taskWithProjectInclude = {
  ...taskInclude,
  project: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
type TaskWithProjectRow = Prisma.TaskGetPayload<{ include: typeof taskWithProjectInclude }>;

export function toTask(row: TaskRow): ApiTask {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    position: row.position,
    dueDate: row.dueDate ? formatDateOnly(row.dueDate) : null,
    assignee: row.assignee,
    createdBy: row.createdBy,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTaskWithProject(row: TaskWithProjectRow): ApiTaskWithProject {
  return { ...toTask(row), project: row.project };
}
