import { type AppRepository } from "@cobrazap/db";
import { syncChargeReminderDispatches } from "@cobrazap/domain";

import {
  assertTenantJobPayload,
  runTenantAwareJob,
  type TenantJobPayload,
} from "../tenant-job.js";

export interface SyncChargeRemindersJobPayload extends TenantJobPayload {
  chargeId: string;
}

export async function syncChargeRemindersJob(
  input: {
    repository: AppRepository;
  },
  payload: SyncChargeRemindersJobPayload,
) {
  assertTenantJobPayload(payload);

  if (!payload.chargeId.trim()) {
    throw new Error("charge_id is required");
  }

  return runTenantAwareJob(
    payload,
    async (tenantId) => Boolean(await input.repository.getTenantById(tenantId)),
    async (validatedPayload) => {
      const result = await syncChargeReminderDispatches(input.repository, {
        tenantId: validatedPayload.tenantId,
        chargeId: validatedPayload.chargeId,
      });

      if (result.insertedCount > 0 || result.canceledCount > 0) {
        await input.repository.appendAuditEvent({
          tenantId: validatedPayload.tenantId,
          actorEmail: "messaging-worker",
          eventType: "message.reminders_synced",
          summary: `Reminder sync ${result.mode} para cobranca ${validatedPayload.chargeId}.`,
        });
      }

      return result;
    },
  );
}
