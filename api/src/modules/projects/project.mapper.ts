import type { ApiMember, ApiProject, ApiProjectSummary } from '@/common/contract';
import { formatDateOnly } from '@/common/dates';
import { userSelect } from '@/common/user-select';
import type { MemberRole, Prisma } from '@/generated/prisma/client';

export type TaskCounts = ApiProjectSummary['taskCounts'];

export const emptyTaskCounts = (): TaskCounts => ({ TODO: 0, IN_PROGRESS: 0, DONE: 0 });

export const projectSummarySelect = {
  id: true,
  name: true,
  description: true,
  startDate: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { members: true } },
} satisfies Prisma.ProjectSelect;

export const memberSelect = {
  role: true,
  addedAt: true,
  user: { select: userSelect },
} satisfies Prisma.ProjectMemberSelect;

type SummaryRow = Prisma.ProjectGetPayload<{ select: typeof projectSummarySelect }>;
type MemberRow = Prisma.ProjectMemberGetPayload<{ select: typeof memberSelect }>;

export function toMember(row: MemberRow): ApiMember {
  return { user: row.user, role: row.role, addedAt: row.addedAt.toISOString() };
}

export function toProjectSummary(
  row: SummaryRow,
  role: MemberRole,
  taskCounts: TaskCounts,
): ApiProjectSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: formatDateOnly(row.startDate),
    dueDate: formatDateOnly(row.dueDate),
    role,
    memberCount: row._count.members,
    taskCounts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toProject(
  row: SummaryRow,
  role: MemberRole,
  taskCounts: TaskCounts,
  members: MemberRow[],
): ApiProject {
  return { ...toProjectSummary(row, role, taskCounts), members: members.map(toMember) };
}
