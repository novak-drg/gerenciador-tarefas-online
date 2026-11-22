import { Injectable } from '@nestjs/common';
import type { ApiCalendarEvent } from '@/common/contract';
import { formatDateOnly, parseDateOnly } from '@/common/dates';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { taskWithProjectInclude, toTaskWithProject } from '../tasks/task.mapper';
import { buildIcs } from './ics';

export interface DateRange {
  from: string;
  to: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /** Task due dates and project deadlines of the user's projects; every date when no range is given. */
  async events(userId: string, range?: DateRange): Promise<ApiCalendarEvent[]> {
    const dueDate = range
      ? { gte: parseDateOnly(range.from), lte: parseDateOnly(range.to) }
      : undefined;
    const membership = { members: { some: { userId } } };

    const [tasks, projects] = await Promise.all([
      this.prisma.task.findMany({
        where: { project: membership, dueDate: dueDate ?? { not: null } },
        include: taskWithProjectInclude,
      }),
      this.prisma.project.findMany({
        where: { ...membership, dueDate },
        select: { id: true, name: true, dueDate: true },
      }),
    ]);

    const events: ApiCalendarEvent[] = [
      ...projects.map((project): ApiCalendarEvent => ({
        kind: 'PROJECT_DEADLINE',
        date: formatDateOnly(project.dueDate),
        project: { id: project.id, name: project.name },
      })),
      ...tasks.flatMap((task): ApiCalendarEvent[] =>
        task.dueDate
          ? [{ kind: 'TASK', date: formatDateOnly(task.dueDate), task: toTaskWithProject(task) }]
          : [],
      ),
    ];
    return events.sort(compareEvents);
  }

  async ics(userId: string): Promise<string> {
    return buildIcs(await this.events(userId));
  }
}

function compareEvents(a: ApiCalendarEvent, b: ApiCalendarEvent): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.kind !== b.kind) return a.kind === 'PROJECT_DEADLINE' ? -1 : 1;
  const titleA = a.kind === 'TASK' ? a.task.title : a.project.name;
  const titleB = b.kind === 'TASK' ? b.task.title : b.project.name;
  return titleA.localeCompare(titleB, 'pt-BR');
}
