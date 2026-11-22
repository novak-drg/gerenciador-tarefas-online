import { createZodDto } from 'nestjs-zod';
import { z } from '@/common/zod';

export const searchUsersSchema = z
  .object({
    search: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres').optional(),
  })
  .strict();

export class SearchUsersDto extends createZodDto(searchUsersSchema) {}
