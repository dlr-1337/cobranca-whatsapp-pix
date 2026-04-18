import { Queue } from "bullmq";
import pino from "pino";

import { loadWorkerEnv } from "@cobrazap/config";

const logger = pino({ name: "cobrazap-worker" });

async function bootstrap() {
  const env = loadWorkerEnv(process.env);
  const queue = new Queue("system-health", {
    connection: env.redisConnection,
  });

  logger.info(
    {
      queue: "system-health",
      redisHost: env.redisConnection.host,
    },
    "worker bootstrap ready",
  );

  await queue.close();
}

void bootstrap().catch((error: unknown) => {
  logger.error({ error }, "worker bootstrap failed");
  process.exitCode = 1;
});
