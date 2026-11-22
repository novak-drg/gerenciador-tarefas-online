import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail')
  .max(254, 'O e-mail é longo demais')
  .pipe(z.email('Informe um e-mail válido'));

export const loginSchema = z.strictObject({
  email,
  password: z
    .string()
    .min(1, 'Informe a senha')
    .max(72, 'A senha pode ter no máximo 72 caracteres'),
});

export const registerSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, 'O nome precisa ter ao menos 2 caracteres')
    .max(80, 'O nome pode ter no máximo 80 caracteres'),
  email,
  password: z
    .string()
    .min(8, 'A senha precisa ter ao menos 8 caracteres')
    .max(72, 'A senha pode ter no máximo 72 caracteres'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
