import { z } from 'zod';

/**
 * Server-only environment for the web app, validated on first use (SEC-18).
 * Never import this from a client component — nothing here may reach the browser bundle.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_INTERNAL_URL: z.url().default('http://localhost:4000'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= serverEnvSchema.parse(process.env);
  return cached;
}
