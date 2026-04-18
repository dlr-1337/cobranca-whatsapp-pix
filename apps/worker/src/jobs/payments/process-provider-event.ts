import { type AppRepository } from "@cobrazap/db";
import { syncChargePaymentWithProviderSnapshot } from "@cobrazap/domain";
import { parseAsaasWebhookEvent } from "@cobrazap/integrations";

import {
  assertTenantJobPayload,
  runTenantAwareJob,
  type TenantJobPayload,
} from "../tenant-job.js";

export interface ProcessProviderEventJobPayload extends TenantJobPayload {
  providerEventId: string;
}

export async function processProviderEventJob(
  input: {
    repository: AppRepository;
  },
  payload: ProcessProviderEventJobPayload,
) {
  assertTenantJobPayload(payload);

  if (!payload.providerEventId.trim()) {
    throw new Error("provider_event_id is required");
  }

  return runTenantAwareJob(
    payload,
    async (tenantId) => Boolean(await input.repository.getTenantById(tenantId)),
    async (validatedPayload) => {
      const storedEvent = await input.repository.getPaymentProviderEvent({
        tenantId: validatedPayload.tenantId,
        providerEventId: validatedPayload.providerEventId,
      });

      if (!storedEvent) {
        throw new Error("Payment provider event not found");
      }

      const parsedEvent = parseAsaasWebhookEvent(
        storedEvent.rawPayload as Record<string, unknown>,
      );

      try {
        const result = await syncChargePaymentWithProviderSnapshot(input.repository, {
          tenantId: validatedPayload.tenantId,
          provider: "asaas",
          providerPaymentId: parsedEvent.providerPaymentId ?? "",
          externalReference: parsedEvent.externalReference,
          providerCustomerId: parsedEvent.providerCustomerId,
          status: parsedEvent.paymentStatus,
          lastSyncedAt: parsedEvent.occurredAt,
          rawChargePayload: parsedEvent.rawChargePayload,
          paidAmountCents: parsedEvent.paidAmountCents,
        });

        await input.repository.markPaymentProviderEventProcessed({
          tenantId: validatedPayload.tenantId,
          providerEventId: validatedPayload.providerEventId,
          processingSummary: `Evento aplicado com resultado ${result.outcome}.`,
          processedAt: new Date(),
        });

        return result;
      } catch (error) {
        await input.repository.markPaymentProviderEventFailed({
          tenantId: validatedPayload.tenantId,
          providerEventId: validatedPayload.providerEventId,
          processingSummary:
            error instanceof Error
              ? error.message
              : "Falha desconhecida ao processar evento Pix.",
          processedAt: new Date(),
        });
        throw error;
      }
    },
  );
}
