import { z } from 'zod';

const ttl = z.string().regex(/^\d+[smhd]$/, 'use a number plus s, m, h or d (e.g. 15m, 30d)');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_ACCESS_TTL: ttl.default('15m'),
  REFRESH_TOKEN_TTL: ttl.default('30d'),

  TWO_FACTOR_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64-encoded'),
});

export type TEnv = z.infer<typeof envSchema>;

/** Used by ConfigModule.forRoot({ validate }). The app refuses to boot on a bad .env. */
export function validateEnv(raw: Record<string, unknown>): TEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${lines.join('\n')}`);
  }
  return result.data;
}

const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** '15m' -> 900000. Used to compute expiresAt for sessions and refresh tokens. */
export function ttlToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid TTL: ${value}`);
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}