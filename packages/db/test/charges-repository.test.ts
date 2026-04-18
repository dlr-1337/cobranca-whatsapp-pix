import { describe, expect, it } from "vitest";

import { createTestAuthDatabase } from "../src/testing/test-auth-database.js";

interface ChargeRecord {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string | null;
  subscriptionId: string | null;
  origin: "manual" | "recurring";
  status: "open" | "paid" | "canceled" | "replaced" | "expired";
  amountCents: number;
  dueDate: Date;
  competenceKey: string | null;
  description: string | null;
  notes: string | null;
  replacesChargeId: string | null;
  replacedByChargeId: string | null;
  paidAt: Date | null;
  paidAmountCents: number | null;
  canceledAt: Date | null;
  customerName?: string;
  customerWhatsappPhoneDisplay?: string;
  planName?: string | null;
}

interface ChargeEventRecord {
  id: string;
  tenantId: string;
  chargeId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  occurredAt: Date;
}

interface ChargesRepository {
  createCustomer(input: {
    tenantId: string;
    name: string;
    whatsappPhone: string;
    status?: string;
  }): Promise<{ id: string }>;
  createBillingPlan(input: {
    tenantId: string;
    name: string;
    amountCents: number;
    billingInterval: string;
    defaultDueDay: number;
    reminderProfile: string;
    status?: string;
  }): Promise<{ id: string }>;
  createSubscription(input: {
    tenantId: string;
    customerId: string;
    planId: string;
    startDate: Date;
    nextCycleStart: Date;
    anchorDueDay: number;
    overrideAmountCents?: number | null;
    overrideDueDay?: number | null;
    transitionReason?: string | null;
    actorUserId?: string | null;
    actorEmail?: string | null;
  }): Promise<{ id: string; nextCycleStart: Date }>;
  createManualCharge(input: {
    tenantId: string;
    customerId: string;
    planId?: string | null;
    amountCents: number;
    dueDate: Date;
    description?: string | null;
    notes?: string | null;
  }): Promise<ChargeRecord>;
  listCharges(input: {
    tenantId: string;
    customerId?: string;
    status?: string;
    origin?: string;
  }): Promise<ChargeRecord[]>;
  getChargesOverview(input: {
    tenantId: string;
  }): Promise<{
    summary: {
      receivedCount: number;
      receivedCents: number;
      dueSoonCount: number;
      dueSoonCents: number;
      overdueCount: number;
      overdueCents: number;
    };
    charges: ChargeRecord[];
    chargeEvents: ChargeEventRecord[];
  }>;
  listChargeEvents(input: {
    tenantId: string;
    chargeId?: string;
  }): Promise<ChargeEventRecord[]>;
  generateRecurringCharges(input: {
    tenantId: string;
    referenceDate: Date;
    actorUserId?: string | null;
    actorEmail?: string | null;
  }): Promise<{
    referenceDate: Date;
    generatedCount: number;
    processedSubscriptions: number;
    charges: ChargeRecord[];
  }>;
  markChargePaid(input: {
    tenantId: string;
    chargeId: string;
    occurredAt: Date;
    reason?: string | null;
  }): Promise<ChargeRecord | null>;
  cancelCharge(input: {
    tenantId: string;
    chargeId: string;
    occurredAt: Date;
    reason: string;
  }): Promise<ChargeRecord | null>;
  replaceCharge(input: {
    tenantId: string;
    chargeId: string;
    occurredAt: Date;
    reason: string;
    amountCents?: number;
    dueDate?: Date;
  }): Promise<{
    replacedCharge: ChargeRecord | null;
    replacementCharge: ChargeRecord;
  } | null>;
}

async function createHarness() {
  const harness = await createTestAuthDatabase();

  return {
    ...harness,
    charges: harness.repository as typeof harness.repository & ChargesRepository,
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

describe("charges repository", () => {
  it("creates manual charges and keeps tenant-scoped operational lists", async () => {
    const harness = await createHarness();

    try {
      const tenantA = await bootstrapTenant(harness.repository, "1111");
      const tenantB = await bootstrapTenant(harness.repository, "2222");
      const customerA = await harness.charges.createCustomer({
        tenantId: tenantA.tenantId,
        name: "Helena Prado",
        whatsappPhone: "+55 11 99876-5432",
      });
      const customerB = await harness.charges.createCustomer({
        tenantId: tenantB.tenantId,
        name: "Bruno Costa",
        whatsappPhone: "+55 11 97777-1111",
      });

      const manualCharge = await harness.charges.createManualCharge({
        tenantId: tenantA.tenantId,
        customerId: customerA.id,
        amountCents: 17990,
        dueDate: new Date("2026-04-25T00:00:00.000Z"),
        description: "Cobranca avulsa de adesao",
      });

      await harness.charges.createManualCharge({
        tenantId: tenantB.tenantId,
        customerId: customerB.id,
        amountCents: 9900,
        dueDate: new Date("2026-04-27T00:00:00.000Z"),
      });

      const tenantACharges = await harness.charges.listCharges({
        tenantId: tenantA.tenantId,
      });
      const tenantBCharges = await harness.charges.listCharges({
        tenantId: tenantB.tenantId,
      });

      expect(manualCharge.origin).toBe("manual");
      expect(manualCharge.status).toBe("open");
      expect(tenantACharges).toHaveLength(1);
      expect(tenantACharges[0]?.id).toBe(manualCharge.id);
      expect(tenantACharges[0]?.customerName).toBe("Helena Prado");
      expect(tenantBCharges).toHaveLength(1);
      expect(tenantBCharges[0]?.tenantId).toBe(tenantB.tenantId);
    } finally {
      await harness.close();
    }
  });

  it("generates recurring charges once per competence and advances the subscription cursor", async () => {
    const harness = await createHarness();

    try {
      const tenant = await bootstrapTenant(harness.repository, "3333");
      const customer = await harness.charges.createCustomer({
        tenantId: tenant.tenantId,
        name: "Julia Teles",
        whatsappPhone: "+55 11 95555-4444",
      });
      const plan = await harness.charges.createBillingPlan({
        tenantId: tenant.tenantId,
        name: "Plano Mensal Gold",
        amountCents: 24990,
        billingInterval: "monthly",
        defaultDueDay: 10,
        reminderProfile: "standard",
        status: "active",
      });
      const subscription = await harness.charges.createSubscription({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        planId: plan.id,
        startDate: new Date("2026-01-10T00:00:00.000Z"),
        nextCycleStart: new Date("2026-02-10T00:00:00.000Z"),
        anchorDueDay: 10,
        actorUserId: tenant.userId,
        actorEmail: "owner-3333@tenant.com.br",
      });

      const firstRun = await harness.charges.generateRecurringCharges({
        tenantId: tenant.tenantId,
        referenceDate: new Date("2026-04-12T00:00:00.000Z"),
        actorUserId: tenant.userId,
      });
      const secondRun = await harness.charges.generateRecurringCharges({
        tenantId: tenant.tenantId,
        referenceDate: new Date("2026-04-12T00:00:00.000Z"),
      });
      const allCharges = await harness.charges.listCharges({
        tenantId: tenant.tenantId,
        origin: "recurring",
      });
      const refreshedSubscription = await harness.repository.getSubscriptionById({
        tenantId: tenant.tenantId,
        subscriptionId: subscription.id,
      });

      expect(firstRun.generatedCount).toBe(3);
      expect(firstRun.processedSubscriptions).toBe(1);
      expect(firstRun.charges.map((charge) => charge.competenceKey)).toEqual([
        "2026-02",
        "2026-03",
        "2026-04",
      ]);
      expect(secondRun.generatedCount).toBe(0);
      expect(allCharges).toHaveLength(3);
      expect(refreshedSubscription?.nextCycleStart.toISOString()).toBe(
        "2026-05-10T00:00:00.000Z",
      );
    } finally {
      await harness.close();
    }
  });

  it("marks charges as paid, cancels open charges, and replaces non-paid charges without losing history", async () => {
    const harness = await createHarness();

    try {
      const tenant = await bootstrapTenant(harness.repository, "4444");
      const customer = await harness.charges.createCustomer({
        tenantId: tenant.tenantId,
        name: "Pedro Luz",
        whatsappPhone: "+55 11 94444-3333",
      });
      const baseEvent = new Date();
      const paidAt = new Date(baseEvent.getTime() + 60_000);
      const replacedAt = new Date(baseEvent.getTime() + 120_000);
      const canceledAt = new Date(baseEvent.getTime() + 180_000);

      const overdueCharge = await harness.charges.createManualCharge({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        amountCents: 12000,
        dueDate: new Date("2026-04-01T00:00:00.000Z"),
        description: "Mensalidade abril",
      });
      const dueSoonCharge = await harness.charges.createManualCharge({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        amountCents: 15000,
        dueDate: new Date("2026-12-15T00:00:00.000Z"),
        description: "Mensalidade futura",
      });

      const paid = await harness.charges.markChargePaid({
        tenantId: tenant.tenantId,
        chargeId: dueSoonCharge.id,
        occurredAt: paidAt,
        reason: "Pagamento confirmado manualmente",
      });
      const replacement = await harness.charges.replaceCharge({
        tenantId: tenant.tenantId,
        chargeId: overdueCharge.id,
        occurredAt: replacedAt,
        reason: "Reemissao com novo vencimento",
        amountCents: 13500,
        dueDate: new Date("2026-04-30T00:00:00.000Z"),
      });
      const canceled = await harness.charges.cancelCharge({
        tenantId: tenant.tenantId,
        chargeId: replacement?.replacementCharge.id ?? "",
        occurredAt: canceledAt,
        reason: "Acordo fechado fora do sistema",
      });

      const overview = await harness.charges.getChargesOverview({
        tenantId: tenant.tenantId,
      });
      const replacementEvents = await harness.charges.listChargeEvents({
        tenantId: tenant.tenantId,
        chargeId: replacement?.replacementCharge.id,
      });
      const originalEvents = await harness.charges.listChargeEvents({
        tenantId: tenant.tenantId,
        chargeId: overdueCharge.id,
      });

      expect(paid?.status).toBe("paid");
      expect(replacement?.replacedCharge?.status).toBe("replaced");
      expect(replacement?.replacementCharge.origin).toBe("manual");
      expect(replacement?.replacementCharge.replacesChargeId).toBe(overdueCharge.id);
      expect(canceled?.status).toBe("canceled");
      expect(overview.summary.receivedCents).toBe(15000);
      expect(overview.summary.overdueCount).toBe(0);
      expect(overview.summary.dueSoonCount).toBe(0);
      expect(replacementEvents.map((event) => event.eventType)).toEqual([
        "canceled",
        "created",
      ]);
      expect(originalEvents.map((event) => event.eventType)).toEqual([
        "replaced",
        "created",
      ]);
    } finally {
      await harness.close();
    }
  });
});
