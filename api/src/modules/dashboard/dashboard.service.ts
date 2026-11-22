import { Injectable } from '@nestjs/common';
import type { ApiDashboardSummary } from '@/common/contract';
import { addDays, parseDateOnly, todayInSaoPaulo } from '@/common/dates';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { taskWithProjectInclude, toTaskWithProject } from '../tasks/task.mapper';

const UPCOMING_LIMIT = 8;
/** "This week" is the 7-day window that starts today. */
const WEEK_LAST_DAY_OFFSET = 6;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string, now: Date = new Date()): Promise<ApiDashboardSummary> {
    const today = todayInSaoPaulo(now);
    const todayDate = parseDateOnly(today);
    const weekEnd = parseDateOnly(addDays(today, WEEK_LAST_DAY_OFFSET));
    const mine = { assigneeId: userId, status: { not: 'DONE' as const } };

    const [projectCount, openTaskCount, overdueTaskCount, dueThisWeekCount, upcoming] =
      await Promise.all([
        this.prisma.projectMember.count({ where: { userId } }),
        this.prisma.task.count({ where: mine }),
        this.prisma.task.count({ where: { ...mine, dueDate: { lt: todayDate } } }),
        this.prisma.task.count({ where: { ...mine, dueDate: { gte: todayDate, lte: weekEnd } } }),
        this.prisma.task.findMany({
          where: { ...mine, dueDate: { not: null } },
          include: taskWithProjectInclude,
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
          take: UPCOMING_LIMIT,
        }),
      ]);

    return {
      projectCount,
      openTaskCount,
      overdueTaskCount,
      dueThisWeekCount,
      upcoming: upcoming.map(toTaskWithProject),
    };
  }
}
