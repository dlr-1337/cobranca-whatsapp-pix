import { createTestAuthDatabase } from "@cobrazap/db";
import { describe, expect, it } from "vitest";

import { processProviderEventJob } from "./process-provider-event.js";

async function bootstrapTenant(
  repository: Awaited<ReturnType<typeof createTestAuthDatabase>>["repository"],
  suffix: string,
) {
  return repository.bootstrapOwnerTenant({
    businessName: `Tenant ${suffix}`,
    primaryEmail: `financeiro-${suffix}@tenant.com.br`,
    whatsappPhone: `+55118888${suffix.padStart(4, "0")}`,
    timezone: "America/Sao_Paulo",
    defaultDueDay: 7,
    ownerEmail: `owner-${suffix}@tenant.com.br`,
    ownerPasswordHash: `argon2-hash-${suffix}`,
  });
}

describe("processProviderEventJob", () => {
  it("marks charge payment as overdue after PAYMENT_OVERDUE", async () => {
    const harness = await createTestAuthDatabase();

    try {
      const tenant = await bootstrapTenant(harness.repository, "8801");
      const customer = await harness.repository.createCustomer({
        tenantId: tenant.tenantId,
        name: "Larissa Campos",
        whatsappPhone: "+55 11 97777-1111",
      });
      const charge = await harness.repository.createManualCharge({
        tenantId: tenant.tenantId,
        customerId: customer!.id,
        amountCents: 18990,
        dueDate: new Date("2026-04-10T00:00:00.000Z"),
        description: "Mensalidade abril",
      });

      await harness.repository.linkPaymentProviderCustomer({
        tenantId: tenant.tenantId,
        customerId: customer!.id,
        provider: "asaas",
        providerCustomerId: "cus_asaas_worker_a",
        customerNameSnapshot: "Larissa Campos",
        whatsappPhoneSnapshot: "5511977771111",
      });
      await harness.repository.upsertChargePayment({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        provider: "asaas",
        providerCustomerId: "cus_asaas_worker_a",
        providerPaymentId: "pay_worker_a",
        externalReference: charge.id,
        status: "awaiting_payment",
      });
      await harness.repository.ingestPaymentProviderEvent({
        tenantId: tenant.tenantId,
        provider: "asaas",
        providerEventId: "evt_worker_a",
        eventType: "PAYMENT_OVERDUE",
        providerPaymentId: "pay_worker_a",
        externalReference: charge.id,
        rawPayload: {
          id: "evt_worker_a",
          event: "PAYMENT_OVERDUE",
          dateCreated: "2026-04-17 15:00:00",
          payment: {
            object: "payment",
            id: "pay_worker_a",
            customer: "cus_asaas_worker_a",
            externalReference: charge.id,
            status: "OVERDUE",
            value: 189.9,
          },
        },
      });

      const result = await processProviderEventJob(
        { repository: harness.repository },
        {
          tenantId: tenant.tenantId,
          correlationId: "evt_worker_a",
          providerEventId: "evt_worker_a",
        },
      );
      const payment = await harness.repository.getChargePaymentByChargeId({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
      });
      const event = await harness.repository.getPaymentProviderEvent({
        tenantId: tenant.tenantId,
        providerEventId: "evt_worker_a",
      });
      const currentCharge = await harness.repository.getChargeById({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
      });

      expect(result).toMatchObject({
        chargeId: charge.id,
        nextStatus: "overdue",
        outcome: "updated",
      });
      expect(payment).toMatchObject({
        providerPaymentId: "pay_worker_a",
        status: "overdue",
      });
      expect(event).toMatchObject({
        processingStatus: "processed",
      });
      expect(currentCharge).toMatchObject({
        id: charge.id,
        status: "open",
      });
    } finally {
      await harness.close();
    }
  });

  it("marks refunded Pix as divergence and keeps the charge paid", async () => {
    const harness = await createTestAuthDatabase();

    try {
      const tenant = await bootstrapTenant(harness.repository, "8802");
      const customer = await harness.repository.createCustomer({
        tenantId: tenant.tenantId,
        name: "Rafael Dias",
        whatsappPhone: "+55 11 96666-2222",
      });
      const charge = await harness.repository.createManualCharge({
        tenantId: tenant.tenantId,
        customerId: customer!.id,
        amountCents: 20990,
        dueDate: new Date("2026-04-25T00:00:00.000Z"),
        description: "Mensalidade premium",
      });

      await harness.repository.linkPaymentProviderCustomer({
        tenantId: tenant.tenantId,
        customerId: customer!.id,
        provider: "asaas",
        providerCustomerId: "cus_asaas_worker_b",
        customerNameSnapshot: "Rafael Dias",
        whatsappPhoneSnapshot: "5511966662222",
      });
      await harness.repository.upsertChargePayment({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        provider: "asaas",
        providerCustomerId: "cus_asaas_worker_b",
        providerPaymentId: "pay_worker_b",
        externalReference: charge.id,
        status: "received",
      });
      await harness.repository.markChargePaid({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        occurredAt: new Date("2026-04-17T12:00:00.000Z"),
        paidAmountCents: 20990,
        reason: "Pagamento confirmado anteriormente",
      });
      await harness.repository.ingestPaymentProviderEvent({
        tenantId: tenant.tenantId,
        provider: "asaas",
        providerEventId: "evt_worker_b",
        eventType: "PAYMENT_REFUNDED",
        providerPaymentId: "pay_worker_b",
        externalReference: charge.id,
        rawPayload: {
          id: "evt_worker_b",
          event: "PAYMENT_REFUNDED",
          dateCreated: "2026-04-18 10:00:00",
          payment: {
            object: "payment",
            id: "pay_worker_b",
            customer: "cus_asaas_worker_b",
            externalReference: charge.id,
            status: "REFUNDED",
            value: 209.9,
          },
        },
      });

      const result = await processProviderEventJob(
        { repository: harness.repository },
        {
          tenantId: tenant.tenantId,
          correlationId: "evt_worker_b",
          providerEventId: "evt_worker_b",
        },
      );
      const payment = await harness.repository.getChargePaymentByChargeId({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
      });
      const currentCharge = await harness.repository.getChargeById({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
      });
      const event = await harness.repository.getPaymentProviderEvent({
        tenantId: tenant.tenantId,
        providerEventId: "evt_worker_b",
      });

      expect(result).toMatchObject({
        chargeId: charge.id,
        nextStatus: "refunded",
        outcome: "diverged",
      });
      expect(payment).toMatchObject({
        providerPaymentId: "pay_worker_b",
        status: "refunded",
      });
      expect(currentCharge).toMatchObject({
        id: charge.id,
        status: "paid",
      });
      expect(event?.processingSummary).toContain("diverged");
    } finally {
      await harness.close();
    }
  });
});
