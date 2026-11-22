import { createZodDto } from 'nestjs-zod';
import { taskPrioritySchema, taskStatusSchema } from '@/common/contract';
import { dateOnlySchema, uuidSchema } from '@/common/dto';
import { z } from '@/common/zod';

const titleSchema = z
  .string()
  .trim()
  .min(2, 'O título deve ter entre 2 e 120 caracteres')
  .max(120, 'O título deve ter entre 2 e 120 caracteres');

const descriptionSchema = z
  .string()
  .trim()
  .max(2000, 'A descrição deve ter no máximo 2000 caracteres');

export const createTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.nullish(),
    priority: taskPrioritySchema.optional(),
    dueDate: dateOnlySchema.nullish(),
    assigneeId: uuidSchema.nullish(),
    status: taskStatusSchema.optional(),
  })
  .strict();

/** Status and position are intentionally absent: they only change through the move route. */
export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: dateOnlySchema.nullable().optional(),
    assigneeId: uuidSchema.nullable().optional(),
  })
  .strict();

export const moveTaskSchema = z
  .object({
    status: taskStatusSchema,
    position: z
      .number({ invalid_type_error: 'A posição deve ser um número inteiro' })
      .int('A posição deve ser um número inteiro')
      .min(-1_000_000)
      .max(1_000_000),
  })
  .strict();

export const myTasksQuerySchema = z.object({ status: taskStatusSchema.optional() }).strict();

export class CreateTaskDto extends createZodDto(createTaskSchema) {}
export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
export class MoveTaskDto extends createZodDto(moveTaskSchema) {}
export class MyTasksQueryDto extends createZodDto(myTasksQuerySchema) {}
