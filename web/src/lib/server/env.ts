import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  API_URL: z
    .url({ protocol: /^https?$/ })
    .default('http://127.0.0.1:3333')
    .transform((value) => value.replace(/\/+$/, '')),
});

let cached: z.infer<typeof envSchema> | undefined;

/** Validated server environment. Fails loudly on a malformed API_URL. */
export function getEnv() {
  if (!cached) {
    const raw = process.env.API_URL;
    const parsed = envSchema.safeParse({
      API_URL: raw && raw.trim() !== '' ? raw.trim() : undefined,
    });
    if (!parsed.success) {
      throw new Error('API_URL must be an http(s) URL, e.g. http://127.0.0.1:3333');
    }
    cached = parsed.data;
  }
  return cached;
}

export function getApiUrl(): string {
  return getEnv().API_URL;
}
