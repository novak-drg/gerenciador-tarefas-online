import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { MemberRole } from '@/generated/prisma/client';

export const PROJECT_NOT_FOUND = 'Projeto não encontrado';
export const TASK_NOT_FOUND = 'Tarefa não encontrada';

export interface TaskAccess {
  task: { id: string; projectId: string; createdById: string };
  role: MemberRole;
}

/**
 * Membership is visibility: every project and task route goes through here, so a
 * non-member cannot tell a project or task apart from one that does not exist.
 */
@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMember(projectId: string, userId: string): Promise<MemberRole> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException(PROJECT_NOT_FOUND);
    return membership.role;
  }

  async requireOwner(projectId: string, userId: string): Promise<void> {
    const role = await this.requireMember(projectId, userId);
    if (role !== 'OWNER') {
      throw new ForbiddenException('Apenas o dono do projeto pode realizar esta ação');
    }
  }

  async requireTask(taskId: string, userId: string): Promise<TaskAccess> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, createdById: true },
    });
    if (!task) throw new NotFoundException(TASK_NOT_FOUND);

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId } },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException(TASK_NOT_FOUND);
    return { task, role: membership.role };
  }
}
