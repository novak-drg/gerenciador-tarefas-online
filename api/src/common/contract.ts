import { createZodDto } from 'nestjs-zod';
import { z } from '@/common/zod';

// Response shapes of docs/API.md. Mappers return these inferred types, so a drift fails typecheck.

export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const memberRoleSchema = z.enum(['OWNER', 'MEMBER']);

export const userSchema = z.object({ id: z.string().uuid(), name: z.string(), email: z.string() });

export const memberSchema = z.object({
  user: userSchema,
  role: memberRoleSchema,
  addedAt: z.string(),
});

export const projectSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.string(),
  dueDate: z.string(),
  role: memberRoleSchema,
  memberCount: z.number().int(),
  taskCounts: z.object({
    TODO: z.number().int(),
    IN_PROGRESS: z.number().int(),
    DONE: z.number().int(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectSchema = projectSummarySchema.extend({ members: z.array(memberSchema) });

export const taskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  position: z.number().int(),
  dueDate: z.string().nullable(),
  assignee: userSchema.nullable(),
  createdBy: userSchema,
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taskWithProjectSchema = taskSchema.extend({
  project: z.object({ id: z.string().uuid(), name: z.string() }),
});

export const calendarEventSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('TASK'), date: z.string(), task: taskWithProjectSchema }),
  z.object({
    kind: z.literal('PROJECT_DEADLINE'),
    date: z.string(),
    project: z.object({ id: z.string().uuid(), name: z.string() }),
  }),
]);

export const authResultSchema = z.object({ user: userSchema, accessToken: z.string() });

export const dashboardSummarySchema = z.object({
  projectCount: z.number().int(),
  openTaskCount: z.number().int(),
  overdueTaskCount: z.number().int(),
  dueThisWeekCount: z.number().int(),
  upcoming: z.array(taskWithProjectSchema),
});

export const errorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ApiUser = z.infer<typeof userSchema>;
export type ApiMember = z.infer<typeof memberSchema>;
export type ApiProjectSummary = z.infer<typeof projectSummarySchema>;
export type ApiProject = z.infer<typeof projectSchema>;
export type ApiTask = z.infer<typeof taskSchema>;
export type ApiTaskWithProject = z.infer<typeof taskWithProjectSchema>;
export type ApiCalendarEvent = z.infer<typeof calendarEventSchema>;
export type ApiDashboardSummary = z.infer<typeof dashboardSummarySchema>;

export class UserDto extends createZodDto(userSchema) {}
export class MemberDto extends createZodDto(memberSchema) {}
export class ProjectSummaryDto extends createZodDto(projectSummarySchema) {}
export class ProjectDto extends createZodDto(projectSchema) {}
export class TaskDto extends createZodDto(taskSchema) {}
export class TaskWithProjectDto extends createZodDto(taskWithProjectSchema) {}
// A union schema cannot be extended directly; the cast keeps the static OpenAPI metadata that Swagger reads.
export class CalendarEventDto extends (createZodDto(
  calendarEventSchema,
) as unknown as new () => object) {}
export class AuthResultDto extends createZodDto(authResultSchema) {}
export class DashboardSummaryDto extends createZodDto(dashboardSummarySchema) {}
export class ErrorResponseDto extends createZodDto(errorResponseSchema) {}
