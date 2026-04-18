import { describe, expect, it } from "vitest";

import { createTestAuthDatabase } from "../src/testing/test-auth-database.js";

interface ChargeRecord {
  id: string;
  tenantId: string;
  customerId: string;
  status: string;
  amountCents: number;
  dueDate: Date;
}

interface PaymentProviderCustomerRecord {
  id: string;
  tenantId: string;
  customerId: string;
  provider: "asaas";
  providerCustomerId: string;
  customerNameSnapshot: string;
  whatsappPhoneSnapshot: string;
}

interface ChargePaymentRecord {
  id: string;
  tenantId: string;
  chargeId: string;
  provider: "asaas";
  providerCustomerId: string;
  providerPaymentId: string;
  externalReference: string;
  status:
    | "pending"
    | "awaiting_payment"
    | "received"
    | "overdue"
    | "refunded"
    | "canceled"
    | "failed";
  pixCopyPasteCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: Date | null;
  lastSyncedAt: Date | null;
}

interface PaymentProviderEventRecord {
  id: string;
  tenantId: string;
  provider: "asaas";
  providerEventId: string;
  eventType: string;
  providerPaymentId: string | null;
  externalReference: string | null;
  processingStatus: "pending" | "processed" | "failed";
  processingSummary: string | null;
  processedAt: Date | null;
}

interface PaymentReconciliationRunRecord {
  id: string;
  tenantId: string;
  provider: "asaas";
  trigger: "manual";
  matchedCount: number;
  updatedCount: number;
  divergenceCount: number;
  failedCount: number;
}

interface PaymentReconciliationItemRecord {
  id: string;
  tenantId: string;
  runId: string;
  chargeId: string;
  providerPaymentId: string;
  outcome: "matched" | "updated" | "diverged" | "failed";
  internalStatus: string;
  providerStatus: string;
}

interface PaymentsRepository {
  createCustomer(input: {
    tenantId: string;
    name: string;
    whatsappPhone: string;
    status?: string;
  }): Promise<{ id: string }>;
  createManualCharge(input: {
    tenantId: string;
    customerId: string;
    amountCents: number;
    dueDate: Date;
    description?: string | null;
  }): Promise<ChargeRecord>;
  linkPaymentProviderCustomer(input: {
    tenantId: string;
    customerId: string;
    provider: "asaas";
    providerCustomerId: string;
    customerNameSnapshot: string;
    whatsappPhoneSnapshot: string;
  }): Promise<PaymentProviderCustomerRecord>;
  getPaymentProviderCustomer(input: {
    tenantId: string;
    customerId: string;
    provider: "asaas";
  }): Promise<PaymentProviderCustomerRecord | null>;
  upsertChargePayment(input: {
    tenantId: string;
    chargeId: string;
    provider: "asaas";
    providerCustomerId: string;
    providerPaymentId: string;
    externalReference: string;
    status:
      | "pending"
      | "awaiting_payment"
      | "received"
      | "overdue"
      | "refunded"
      | "canceled"
      | "failed";
    pixCopyPasteCode?: string | null;
    qrCodeBase64?: string | null;
    expiresAt?: Date | null;
    lastSyncedAt?: Date | null;
    rawChargePayload?: Record<string, unknown> | null;
    rawQrCodePayload?: Record<string, unknown> | null;
  }): Promise<ChargePaymentRecord>;
  getChargePaymentByChargeId(input: {
    tenantId: string;
    chargeId: string;
  }): Promise<ChargePaymentRecord | null>;
  ingestPaymentProviderEvent(input: {
    tenantId: string;
    provider: "asaas";
    providerEventId: string;
    eventType: string;
    providerPaymentId?: string | null;
    externalReference?: string | null;
    rawPayload: Record<string, unknown>;
  }): Promise<{ event: PaymentProviderEventRecord; inserted: boolean }>;
  listPendingPaymentProviderEvents(input: {
    tenantId: string;
    provider?: "asaas";
    limit?: number;
  }): Promise<PaymentProviderEventRecord[]>;
  markPaymentProviderEventProcessed(input: {
    tenantId: string;
    providerEventId: string;
    processingSummary: string;
    processedAt: Date;
  }): Promise<PaymentProviderEventRecord | null>;
  recordPaymentReconciliationRun(input: {
    tenantId: string;
    provider: "asaas";
    trigger: "manual";
    matchedCount: number;
    updatedCount: number;
    divergenceCount: number;
    failedCount: number;
    startedAt: Date;
    finishedAt: Date;
    items: Array<{
      chargeId: string;
      providerPaymentId: string;
      outcome: "matched" | "updated" | "diverged" | "failed";
      internalStatus: string;
      providerStatus: string;
      summary: string;
    }>;
  }): Promise<{
    run: PaymentReconciliationRunRecord;
    items: PaymentReconciliationItemRecord[];
  }>;
  listPaymentReconciliationRuns(input: {
    tenantId: string;
    provider?: "asaas";
  }): Promise<PaymentReconciliationRunRecord[]>;
}

async function createHarness() {
  const harness = await createTestAuthDatabase();

  return {
    ...harness,
    payments: harness.repository as typeof harness.repository & PaymentsRepository,
  };
}

async function bootstrapTenant(
  repository: Awaited<ReturnType<typeof createHarness>>["repository"],
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

describe("payments repository", () => {
  it("links provider customers and persists Pix charge state per tenant", async () => {
    const harness = await createHarness();

    try {
      const tenantA = await bootstrapTenant(harness.repository, "5511");
      const tenantB = await bootstrapTenant(harness.repository, "6611");
      const customerA = await harness.payments.createCustomer({
        tenantId: tenantA.tenantId,
        name: "Marina Souza",
        whatsappPhone: "+55 11 99876-9999",
      });
      const customerB = await harness.payments.createCustomer({
        tenantId: tenantB.tenantId,
        name: "Caio Nunes",
        whatsappPhone: "+55 11 97777-8888",
      });
      const chargeA = await harness.payments.createManualCharge({
        tenantId: tenantA.tenantId,
        customerId: customerA.id,
        amountCents: 25990,
        dueDate: new Date("2026-04-30T00:00:00.000Z"),
        description: "Mensalidade abril",
      });
      await harness.payments.createManualCharge({
        tenantId: tenantB.tenantId,
        customerId: customerB.id,
        amountCents: 15990,
        dueDate: new Date("2026-04-30T00:00:00.000Z"),
        description: "Mensalidade abril tenant B",
      });

      const providerCustomer = await harness.payments.linkPaymentProviderCustomer({
        tenantId: tenantA.tenantId,
        customerId: customerA.id,
        provider: "asaas",
        providerCustomerId: "cus_asaas_a",
        customerNameSnapshot: "Marina Souza",
        whatsappPhoneSnapshot: "5511998769999",
      });
      const pixCharge = await harness.payments.upsertChargePayment({
        tenantId: tenantA.tenantId,
        chargeId: chargeA.id,
        provider: "asaas",
        providerCustomerId: providerCustomer.providerCustomerId,
        providerPaymentId: "pay_asaas_a",
        externalReference: chargeA.id,
        status: "awaiting_payment",
        pixCopyPasteCode: "00020126330014br.gov.bcb.pix0111payload",
        qrCodeBase64: "iVBORw0KGgoAAAANSUhEUgAA",
        expiresAt: new Date("2027-04-30T00:00:00.000Z"),
        lastSyncedAt: new Date("2026-04-17T12:00:00.000Z"),
        rawChargePayload: { id: "pay_asaas_a", status: "PENDING" },
        rawQrCodePayload: { payload: "00020126330014br.gov.bcb.pix0111payload" },
      });

      const fetchedMapping = await harness.payments.getPaymentProviderCustomer({
        tenantId: tenantA.tenantId,
        customerId: customerA.id,
        provider: "asaas",
      });
      const fetchedPixCharge = await harness.payments.getChargePaymentByChargeId({
        tenantId: tenantA.tenantId,
        chargeId: chargeA.id,
      });
      const crossTenantLookup = await harness.payments.getChargePaymentByChargeId({
        tenantId: tenantB.tenantId,
        chargeId: chargeA.id,
      });

      expect(fetchedMapping).toMatchObject({
        id: providerCustomer.id,
        providerCustomerId: "cus_asaas_a",
        customerNameSnapshot: "Marina Souza",
      });
      expect(fetchedPixCharge).toMatchObject({
        id: pixCharge.id,
        providerPaymentId: "pay_asaas_a",
        externalReference: chargeA.id,
        status: "awaiting_payment",
      });
      expect(fetchedPixCharge?.pixCopyPasteCode).toContain("000201");
      expect(crossTenantLookup).toBeNull();
    } finally {
      await harness.close();
    }
  });

  it("stores webhook inbox idempotently and records reconciliation outcomes", async () => {
    const harness = await createHarness();

    try {
      const tenant = await bootstrapTenant(harness.repository, "7711");
      const customer = await harness.payments.createCustomer({
        tenantId: tenant.tenantId,
        name: "Ricardo Melo",
        whatsappPhone: "+55 11 96666-7777",
      });
      const charge = await harness.payments.createManualCharge({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        amountCents: 18990,
        dueDate: new Date("2026-04-29T00:00:00.000Z"),
        description: "Mensalidade piloto",
      });

      await harness.payments.linkPaymentProviderCustomer({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        provider: "asaas",
        providerCustomerId: "cus_asaas_b",
        customerNameSnapshot: "Ricardo Melo",
        whatsappPhoneSnapshot: "5511966667777",
      });
      await harness.payments.upsertChargePayment({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        provider: "asaas",
        providerCustomerId: "cus_asaas_b",
        providerPaymentId: "pay_asaas_b",
        externalReference: charge.id,
        status: "awaiting_payment",
      });

      const firstEvent = await harness.payments.ingestPaymentProviderEvent({
        tenantId: tenant.tenantId,
        provider: "asaas",
        providerEventId: "evt_asaas_1",
        eventType: "PAYMENT_RECEIVED",
        providerPaymentId: "pay_asaas_b",
        externalReference: charge.id,
        rawPayload: {
          event: "PAYMENT_RECEIVED",
          payment: { id: "pay_asaas_b", externalReference: charge.id },
        },
      });
      const duplicateEvent = await harness.payments.ingestPaymentProviderEvent({
        tenantId: tenant.tenantId,
        provider: "asaas",
        providerEventId: "evt_asaas_1",
        eventType: "PAYMENT_RECEIVED",
        providerPaymentId: "pay_asaas_b",
        externalReference: charge.id,
        rawPayload: {
          event: "PAYMENT_RECEIVED",
          payment: { id: "pay_asaas_b", externalReference: charge.id },
        },
      });

      const pendingEvents = await harness.payments.listPendingPaymentProviderEvents({
        tenantId: tenant.tenantId,
        provider: "asaas",
      });
      const processedEvent = await harness.payments.markPaymentProviderEventProcessed({
        tenantId: tenant.tenantId,
        providerEventId: "evt_asaas_1",
        processingSummary: "Charge marked as paid from webhook",
        processedAt: new Date("2026-04-17T13:00:00.000Z"),
      });
      const reconciliation = await harness.payments.recordPaymentReconciliationRun({
        tenantId: tenant.tenantId,
        provider: "asaas",
        trigger: "manual",
        matchedCount: 0,
        updatedCount: 1,
        divergenceCount: 1,
        failedCount: 0,
        startedAt: new Date("2026-04-17T14:00:00.000Z"),
        finishedAt: new Date("2026-04-17T14:01:00.000Z"),
        items: [
          {
            chargeId: charge.id,
            providerPaymentId: "pay_asaas_b",
            outcome: "updated",
            internalStatus: "open",
            providerStatus: "RECEIVED",
            summary: "Webhook atrasado, reconciliacao corrigiu status para pago",
          },
          {
            chargeId: charge.id,
            providerPaymentId: "pay_asaas_b",
            outcome: "diverged",
            internalStatus: "paid",
            providerStatus: "REFUNDED",
            summary: "Estorno detectado e pendente de tratamento",
          },
        ],
      });
      const runs = await harness.payments.listPaymentReconciliationRuns({
        tenantId: tenant.tenantId,
        provider: "asaas",
      });

      expect(firstEvent.inserted).toBe(true);
      expect(duplicateEvent.inserted).toBe(false);
      expect(pendingEvents).toHaveLength(1);
      expect(pendingEvents[0]?.providerEventId).toBe("evt_asaas_1");
      expect(processedEvent).toMatchObject({
        providerEventId: "evt_asaas_1",
        processingStatus: "processed",
      });
      expect(reconciliation.run).toMatchObject({
        provider: "asaas",
        updatedCount: 1,
        divergenceCount: 1,
      });
      expect(reconciliation.items.map((item) => item.outcome)).toEqual([
        "updated",
        "diverged",
      ]);
      expect(runs).toHaveLength(1);
      expect(runs[0]?.id).toBe(reconciliation.run.id);
    } finally {
      await harness.close();
    }
  });
});
