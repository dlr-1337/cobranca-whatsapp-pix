import { z } from "zod";

const nodeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  SESSION_COOKIE_NAME: z.string().min(1).default("czp_session"),
  LOG_LEVEL: z.string().min(1).default("info"),
});

const paymentsEnvSchema = z.object({
  ASAAS_API_BASE_URL: z.url().default("https://api-sandbox.asaas.com"),
  ASAAS_API_KEY: z.string().trim().min(1).optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().trim().min(1).optional(),
  ASAAS_USER_AGENT: z.string().trim().min(1).default("cobrazap"),
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

export function loadPaymentsEnv(input: NodeJS.ProcessEnv) {
  const env = paymentsEnvSchema.parse(input);

  return {
    apiBaseUrl: env.ASAAS_API_BASE_URL,
    apiKey: env.ASAAS_API_KEY ?? null,
    webhookToken: env.ASAAS_WEBHOOK_TOKEN ?? null,
    userAgent: env.ASAAS_USER_AGENT,
  };
}
