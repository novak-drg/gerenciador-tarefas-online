import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ApiTask, ApiTaskWithProject, TaskStatus } from '@/common/contract';
import { parseDateOnly } from '@/common/dates';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { Prisma } from '@/generated/prisma/client';
import { ProjectAccessService, TASK_NOT_FOUND } from '../projects/project-access.service';
import type { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/tasks.dto';
import { reorderTasks } from './reorder';
import { taskInclude, taskWithProjectInclude, toTask, toTaskWithProject } from './task.mapper';

const ASSIGNEE_NOT_MEMBER = 'O responsável precisa ser membro do projeto';
const COLUMN_ORDER = [
  { status: 'asc' },
  { position: 'asc' },
] satisfies Prisma.TaskOrderByWithRelationInput[];

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async listByProject(projectId: string, userId: string): Promise<ApiTask[]> {
    await this.access.requireMember(projectId, userId);
    const rows = await this.prisma.task.findMany({
      where: { projectId },
      include: taskInclude,
      orderBy: COLUMN_ORDER,
    });
    return rows.map(toTask);
  }

  async create(projectId: string, userId: string, dto: CreateTaskDto): Promise<ApiTask> {
    await this.access.requireMember(projectId, userId);
    if (dto.assigneeId) await this.assertAssigneeIsMember(projectId, dto.assigneeId);

    const status = dto.status ?? 'TODO';
    return this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, projectId);
      const position = await tx.task.count({ where: { projectId, status } });
      const row = await tx.task.create({
        data: {
          projectId,
          title: dto.title,
          description: dto.description || null,
          status,
          priority: dto.priority ?? 'MEDIUM',
          position,
          dueDate: dto.dueDate ? parseDateOnly(dto.dueDate) : null,
          assigneeId: dto.assigneeId ?? null,
          createdById: userId,
          completedAt: status === 'DONE' ? new Date() : null,
        },
        include: taskInclude,
      });
      return toTask(row);
    });
  }

  async getOne(taskId: string, userId: string): Promise<ApiTask> {
    await this.access.requireTask(taskId, userId);
    const row = await this.prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
    if (!row) throw new NotFoundException(TASK_NOT_FOUND);
    return toTask(row);
  }

  async update(taskId: string, userId: string, dto: UpdateTaskDto): Promise<ApiTask> {
    const { task } = await this.access.requireTask(taskId, userId);
    if (dto.assigneeId) await this.assertAssigneeIsMember(task.projectId, dto.assigneeId);

    const row = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description === undefined ? undefined : dto.description || null,
        priority: dto.priority,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate === null
              ? null
              : parseDateOnly(dto.dueDate),
        assigneeId: dto.assigneeId,
      },
      include: taskInclude,
    });
    return toTask(row);
  }

  async move(taskId: string, userId: string, dto: MoveTaskDto): Promise<ApiTask[]> {
    const { task } = await this.access.requireTask(taskId, userId);
    const { projectId } = task;

    return this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, projectId);

      const current = await tx.task.findMany({
        where: { projectId },
        select: { id: true, status: true, position: true },
      });
      const moving = current.find((item) => item.id === taskId);
      if (!moving) throw new NotFoundException(TASK_NOT_FOUND);

      for (const change of reorderTasks(current, taskId, dto.status, dto.position)) {
        await tx.task.update({
          where: { id: change.id },
          data: {
            status: change.status,
            position: change.position,
            ...(change.id === taskId ? completionChange(moving.status, dto.status) : {}),
          },
        });
      }

      const rows = await tx.task.findMany({
        where: { projectId },
        include: taskInclude,
        orderBy: COLUMN_ORDER,
      });
      return rows.map(toTask);
    });
  }

  async remove(taskId: string, userId: string): Promise<void> {
    const { task, role } = await this.access.requireTask(taskId, userId);
    if (role !== 'OWNER' && task.createdById !== userId) {
      throw new ForbiddenException(
        'Apenas o dono do projeto ou quem criou a tarefa pode excluí-la',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.lockProject(tx, task.projectId);
      const current = await tx.task.findUnique({
        where: { id: taskId },
        select: { status: true, position: true },
      });
      if (!current) throw new NotFoundException(TASK_NOT_FOUND);

      await tx.task.delete({ where: { id: taskId } });
      await tx.task.updateMany({
        where: {
          projectId: task.projectId,
          status: current.status,
          position: { gt: current.position },
        },
        data: { position: { decrement: 1 } },
      });
    });
  }

  async listAssignedTo(
    userId: string,
    status: TaskStatus | undefined,
  ): Promise<ApiTaskWithProject[]> {
    const rows = await this.prisma.task.findMany({
      where: { assigneeId: userId, status },
      include: taskWithProjectInclude,
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });
    return rows.map(toTaskWithProject);
  }

  /** Serializes position changes inside one project; released automatically at commit/rollback. */
  private lockProject(tx: Prisma.TransactionClient, projectId: string): Promise<unknown> {
    return tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${projectId}))::text AS locked`;
  }

  private async assertAssigneeIsMember(projectId: string, assigneeId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
      select: { userId: true },
    });
    if (!membership) throw new BadRequestException(ASSIGNEE_NOT_MEMBER);
  }
}

function completionChange(from: TaskStatus, to: TaskStatus): { completedAt?: Date | null } {
  if (from === to) return {};
  if (to === 'DONE') return { completedAt: new Date() };
  if (from === 'DONE') return { completedAt: null };
  return {};
}
