import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApiMember, ApiProject, ApiProjectSummary } from '@/common/contract';
import { formatDateOnly, parseDateOnly } from '@/common/dates';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { AddMemberDto, CreateProjectDto, UpdateProjectDto } from './dto/projects.dto';
import { DATE_ORDER_MESSAGE } from './dto/projects.dto';
import { ProjectAccessService, PROJECT_NOT_FOUND } from './project-access.service';
import {
  emptyTaskCounts,
  memberSelect,
  projectSummarySelect,
  toMember,
  toProject,
  toProjectSummary,
  type TaskCounts,
} from './project.mapper';

const USER_NOT_FOUND = 'Usuário não encontrado';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async list(userId: string): Promise<ApiProjectSummary[]> {
    const rows = await this.prisma.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      select: { ...projectSummarySelect, members: { where: { userId }, select: { role: true } } },
    });
    const counts = await this.countTasks(rows.map((row) => row.id));
    return rows.map((row) =>
      toProjectSummary(
        row,
        row.members[0]?.role ?? 'MEMBER',
        counts.get(row.id) ?? emptyTaskCounts(),
      ),
    );
  }

  async create(userId: string, dto: CreateProjectDto): Promise<ApiProject> {
    const memberIds = [...new Set(dto.memberIds ?? [])].filter((id) => id !== userId);
    await this.assertUsersExist(memberIds);

    const created = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        startDate: parseDateOnly(dto.startDate),
        dueDate: parseDateOnly(dto.dueDate),
        ownerId: userId,
        members: {
          create: [
            { userId, role: 'OWNER' },
            ...memberIds.map((id) => ({ userId: id, role: 'MEMBER' as const })),
          ],
        },
      },
      select: { id: true },
    });
    return this.getOne(created.id, userId);
  }

  async getOne(projectId: string, userId: string): Promise<ApiProject> {
    const role = await this.access.requireMember(projectId, userId);
    const [row, members, counts] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId }, select: projectSummarySelect }),
      this.prisma.projectMember.findMany({
        where: { projectId },
        select: memberSelect,
        orderBy: [{ role: 'asc' }, { addedAt: 'asc' }],
      }),
      this.countTasks([projectId]),
    ]);
    if (!row) throw new NotFoundException(PROJECT_NOT_FOUND);
    return toProject(row, role, counts.get(projectId) ?? emptyTaskCounts(), members);
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto): Promise<ApiProject> {
    await this.access.requireOwner(projectId, userId);

    const current = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { startDate: true, dueDate: true },
    });
    if (!current) throw new NotFoundException(PROJECT_NOT_FOUND);

    const startDate = dto.startDate ?? formatDateOnly(current.startDate);
    const dueDate = dto.dueDate ?? formatDateOnly(current.dueDate);
    if (dueDate < startDate) throw new BadRequestException(DATE_ORDER_MESSAGE);

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        description: dto.description === undefined ? undefined : dto.description || null,
        startDate: dto.startDate === undefined ? undefined : parseDateOnly(dto.startDate),
        dueDate: dto.dueDate === undefined ? undefined : parseDateOnly(dto.dueDate),
      },
    });
    return this.getOne(projectId, userId);
  }

  async remove(projectId: string, userId: string): Promise<void> {
    await this.access.requireOwner(projectId, userId);
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  async addMember(projectId: string, userId: string, dto: AddMemberDto): Promise<ApiMember> {
    await this.access.requireOwner(projectId, userId);
    await this.assertUsersExist([dto.userId]);

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
      select: { userId: true },
    });
    if (existing) throw new ConflictException('Este usuário já é membro do projeto');

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId: dto.userId, role: 'MEMBER' },
      select: memberSelect,
    });
    return toMember(member);
  }

  async removeMember(projectId: string, userId: string, memberId: string): Promise<void> {
    await this.access.requireOwner(projectId, userId);

    const target = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberId } },
      select: { role: true },
    });
    if (!target) throw new NotFoundException('Membro não encontrado');
    if (target.role === 'OWNER') {
      throw new ConflictException('O dono do projeto não pode ser removido');
    }

    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { projectId, assigneeId: memberId },
        data: { assigneeId: null },
      }),
      this.prisma.projectMember.delete({
        where: { projectId_userId: { projectId, userId: memberId } },
      }),
    ]);
  }

  private async assertUsersExist(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const found = await this.prisma.user.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException(USER_NOT_FOUND);
  }

  private async countTasks(projectIds: string[]): Promise<Map<string, TaskCounts>> {
    const grouped = await this.prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    });
    const counts = new Map<string, TaskCounts>();
    for (const row of grouped) {
      const entry = counts.get(row.projectId) ?? emptyTaskCounts();
      entry[row.status] = row._count._all;
      counts.set(row.projectId, entry);
    }
    return counts;
  }
}
