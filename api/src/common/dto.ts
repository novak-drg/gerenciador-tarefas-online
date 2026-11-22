import { createZodDto } from 'nestjs-zod';
import { isValidDateOnly } from '@/common/dates';
import { z } from '@/common/zod';

export const uuidSchema = z.string().uuid('Identificador inválido');

export const dateOnlySchema = z
  .string()
  .refine(isValidDateOnly, 'Data inválida. Use o formato AAAA-MM-DD');

export class IdParamsDto extends createZodDto(z.object({ id: uuidSchema }).strict()) {}
