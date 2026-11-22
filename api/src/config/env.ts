import { z } from 'zod';

/** The value shipped in .env.example: public, so never acceptable as a real secret. */
export const JWT_SECRET_PLACEHOLDER = 'troque-este-segredo-com-pelo-menos-32-caracteres';

const envSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL é obrigatório' })
    .min(1, 'DATABASE_URL é obrigatório'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  HOST: z.string().min(1).default('127.0.0.1'),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET é obrigatório' })
    .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres')
    .refine(
      (value) => value !== JWT_SECRET_PLACEHOLDER,
      'JWT_SECRET ainda está com o valor de exemplo; gere um segredo próprio',
    ),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhdw]$/, 'JWT_EXPIRES_IN deve ter o formato 30m, 8h ou 7d')
    .default('8h'),
  THROTTLE_DEFAULT_LIMIT: z.coerce.number().int().positive().default(300),
  THROTTLE_AUTH_LIMIT: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Configuração inválida:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'EnvError';
  }
}

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  return result.data;
}
