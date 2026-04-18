import { createAppRepository, createDatabase } from "@cobrazap/db";
import {
  MESSAGING_QUEUE_NAME,
  PAYMENTS_QUEUE_NAME,
  PROCESS_PROVIDER_EVENT_JOB,
  SYNC_CHARGE_REMINDERS_JOB,
} from "@cobrazap/domain";
import { Queue, Worker } from "bullmq";
import pino from "pino";

import { loadWorkerEnv } from "@cobrazap/config";

import { syncChargeRemindersJob } from "./jobs/messaging/sync-charge-reminders.js";
import { processProviderEventJob } from "./jobs/payments/process-provider-event.js";

const logger = pino({ name: "cobrazap-worker" });

async function bootstrap() {
  const env = loadWorkerEnv(process.env);
  const { db, pool } = createDatabase(env.DATABASE_URL);
  const repository = createAppRepository(db);
  const queue = new Queue(PAYMENTS_QUEUE_NAME, {
    connection: env.redisConnection,
  });
  const messagingQueue = new Queue(MESSAGING_QUEUE_NAME, {
    connection: env.redisConnection,
  });
  const worker = new Worker(
    PAYMENTS_QUEUE_NAME,
    async (job) => {
      if (job.name === PROCESS_PROVIDER_EVENT_JOB) {
        return processProviderEventJob(
          { repository },
          job.data as Parameters<typeof processProviderEventJob>[1],
        );
      }

      throw new Error(`Unsupported worker job: ${job.name}`);
    },
    {
      connection: env.redisConnection,
    },
  );
  const messagingWorker = new Worker(
    MESSAGING_QUEUE_NAME,
    async (job) => {
      if (job.name === SYNC_CHARGE_REMINDERS_JOB) {
        return syncChargeRemindersJob(
          { repository },
          job.data as Parameters<typeof syncChargeRemindersJob>[1],
        );
      }

      throw new Error(`Unsupported worker job: ${job.name}`);
    },
    {
      connection: env.redisConnection,
    },
  );

  const shutdown = async () => {
    await messagingWorker.close();
    await worker.close();
    await messagingQueue.close();
    await queue.close();
    await pool.end();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  logger.info(
    {
      queues: [PAYMENTS_QUEUE_NAME, MESSAGING_QUEUE_NAME],
      redisHost: env.redisConnection.host,
    },
    "worker bootstrap ready",
  );
}

void bootstrap().catch((error: unknown) => {
  logger.error({ error }, "worker bootstrap failed");
  process.exitCode = 1;
});
