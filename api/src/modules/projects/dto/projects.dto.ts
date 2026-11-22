import { createZodDto } from 'nestjs-zod';
import { dateOnlySchema, uuidSchema } from '@/common/dto';
import { z } from '@/common/zod';

export const DATE_ORDER_MESSAGE = 'A data de término deve ser igual ou posterior à data de início';

const nameSchema = z
  .string()
  .trim()
  .min(2, 'O nome deve ter entre 2 e 80 caracteres')
  .max(80, 'O nome deve ter entre 2 e 80 caracteres');

const descriptionSchema = z
  .string()
  .trim()
  .max(500, 'A descrição deve ter no máximo 500 caracteres');

export const createProjectSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema.nullish(),
    startDate: dateOnlySchema,
    dueDate: dateOnlySchema,
    memberIds: z.array(uuidSchema).max(100, 'Informe no máximo 100 membros').optional(),
  })
  .strict()
  .refine((value) => value.dueDate >= value.startDate, {
    message: DATE_ORDER_MESSAGE,
    path: ['dueDate'],
  });

export const updateProjectSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    startDate: dateOnlySchema.optional(),
    dueDate: dateOnlySchema.optional(),
  })
  .strict()
  .refine((value) => !value.startDate || !value.dueDate || value.dueDate >= value.startDate, {
    message: DATE_ORDER_MESSAGE,
    path: ['dueDate'],
  });

export const addMemberSchema = z.object({ userId: uuidSchema }).strict();

export const memberParamsSchema = z.object({ id: uuidSchema, userId: uuidSchema }).strict();

export class CreateProjectDto extends createZodDto(createProjectSchema) {}
export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
export class AddMemberDto extends createZodDto(addMemberSchema) {}
export class MemberParamsDto extends createZodDto(memberParamsSchema) {}
