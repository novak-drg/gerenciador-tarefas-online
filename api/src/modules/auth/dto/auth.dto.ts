import { createZodDto } from 'nestjs-zod';
import { z } from '@/common/zod';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('E-mail inválido')
  .max(254, 'O e-mail deve ter no máximo 254 caracteres');

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter entre 2 e 80 caracteres')
      .max(80, 'O nome deve ter entre 2 e 80 caracteres'),
    email: emailSchema,
    password: z
      .string()
      .min(8, 'A senha deve ter entre 8 e 72 caracteres')
      .max(72, 'A senha deve ter entre 8 e 72 caracteres'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(1, 'Informe a senha')
      .max(72, 'A senha deve ter no máximo 72 caracteres'),
  })
  .strict();

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
