import { z } from "zod";

const nodeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  SESSION_COOKIE_NAME: z.string().min(1).default("czp_session"),
  LOG_LEVEL: z.string().min(1).default("info"),
});

type NodeEnv = z.infer<typeof nodeEnvSchema>;

function parseRedisUrl(redisUrl: string) {
  const parsed = new URL(redisUrl);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
  };
}

export function loadNodeEnv(input: NodeJS.ProcessEnv): NodeEnv {
  return nodeEnvSchema.parse(input);
}

export function loadWorkerEnv(input: NodeJS.ProcessEnv) {
  const env = loadNodeEnv(input);

  return {
    ...env,
    redisConnection: parseRedisUrl(env.REDIS_URL),
  };
}
