import { describe, expect, it } from "vitest";

import { createTestAuthDatabase } from "../src/testing/test-auth-database.js";

interface CustomerRecord {
  id: string;
  tenantId: string;
  name: string;
  whatsappPhoneDisplay: string;
  whatsappPhoneNormalized: string;
  notes: string | null;
  status: string;
  latestConsentByChannel: {
    whatsapp: ConsentRecord | null;
    email: ConsentRecord | null;
  };
}

interface ConsentRecord {
  id: string;
  tenantId: string;
  customerId: string;
  channel: string;
  status: string;
  evidence: string;
  effectiveAt: Date;
  actorUserId: string | null;
  actorEmail: string | null;
}

interface BillingPlanRecord {
  id: string;
  tenantId: string;
  name: string;
  amountCents: number;
  billingInterval: string;
  defaultDueDay: number;
  messageTemplate: string | null;
  reminderProfile: string;
  status: string;
}

interface SubscriptionRecord {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  status: string;
  anchorDueDay: number;
  nextCycleStart: Date;
  overrideAmountCents: number | null;
  overrideDueDay: number | null;
  lastTransitionReason: string | null;
}

interface SubscriptionEventRecord {
  id: string;
  tenantId: string;
  subscriptionId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  effectiveAt: Date;
}

interface WalletRepository {
  createCustomer(input: {
    tenantId: string;
    name: string;
    whatsappPhone: string;
    notes?: string | null;
    status?: string;
    allowDuplicatePhone?: boolean;
  }): Promise<CustomerRecord>;
  updateCustomer(input: {
    tenantId: string;
    customerId: string;
    name?: string;
    whatsappPhone?: string;
    notes?: string | null;
    status?: string;
    allowDuplicatePhone?: boolean;
  }): Promise<CustomerRecord | null>;
  getCustomerById(input: {
    tenantId: string;
    customerId: string;
  }): Promise<CustomerRecord | null>;
  listCustomers(input: {
    tenantId: string;
    search?: string;
    status?: string;
  }): Promise<CustomerRecord[]>;
  appendCustomerConsentEvent(input: {
    tenantId: string;
    customerId: string;
    channel: string;
    status: string;
    evidence: string;
    effectiveAt: Date;
    actorUserId?: string | null;
    actorEmail?: string | null;
  }): Promise<ConsentRecord>;
  listCustomerConsentEvents(input: {
    tenantId: string;
    customerId: string;
    channel?: string;
  }): Promise<ConsentRecord[]>;
  createBillingPlan(input: {
    tenantId: string;
    name: string;
    amountCents: number;
    billingInterval: string;
    defaultDueDay: number;
    messageTemplate?: string | null;
    reminderProfile: string;
    status?: string;
  }): Promise<BillingPlanRecord>;
  updateBillingPlan(input: {
    tenantId: string;
    planId: string;
    name?: string;
    amountCents?: number;
    billingInterval?: string;
    defaultDueDay?: number;
    messageTemplate?: string | null;
    reminderProfile?: string;
    status?: string;
  }): Promise<BillingPlanRecord | null>;
  archiveBillingPlan(input: {
    tenantId: string;
    planId: string;
  }): Promise<BillingPlanRecord | null>;
  listBillingPlans(input: {
    tenantId: string;
    search?: string;
    status?: string;
  }): Promise<BillingPlanRecord[]>;
  getBillingPlanById(input: {
    tenantId: string;
    planId: string;
  }): Promise<BillingPlanRecord | null>;
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
  }): Promise<SubscriptionRecord>;
  pauseSubscription(input: {
    tenantId: string;
    subscriptionId: string;
    reason: string;
    effectiveAt: Date;
    actorUserId?: string | null;
    actorEmail?: string | null;
  }): Promise<SubscriptionRecord | null>;
  reactivateSubscription(input: {
    tenantId: string;
    subscriptionId: string;
    reason: string;
    effectiveAt: Date;
    actorUserId?: string | null;
    actorEmail?: string | null;
  }): Promise<SubscriptionRecord | null>;
  cancelSubscription(input: {
    tenantId: string;
    subscriptionId: string;
    reason: string;
    effectiveAt: Date;
    actorUserId?: string | null;
    actorEmail?: string | null;
  }): Promise<SubscriptionRecord | null>;
  getSubscriptionById(input: {
    tenantId: string;
    subscriptionId: string;
  }): Promise<SubscriptionRecord | null>;
  listSubscriptions(input: {
    tenantId: string;
    status?: string;
    customerId?: string;
  }): Promise<SubscriptionRecord[]>;
  listSubscriptionEvents(input: {
    tenantId: string;
    subscriptionId: string;
  }): Promise<SubscriptionEventRecord[]>;
}

async function createHarness() {
  const harness = await createTestAuthDatabase();

  return {
    ...harness,
    wallet: harness.repository as typeof harness.repository & WalletRepository,
  };
}

async function bootstrapTenant(
  repository: Awaited<ReturnType<typeof createHarness>>["repository"],
  suffix: string,
) {
  return repository.bootstrapOwnerTenant({
    businessName: `Tenant ${suffix}`,
    primaryEmail: `financeiro-${suffix}@tenant.com.br`,
    whatsappPhone: `+55119999${suffix.padStart(4, "0")}`,
    timezone: "America/Sao_Paulo",
    defaultDueDay: 7,
    ownerEmail: `owner-${suffix}@tenant.com.br`,
    ownerPasswordHash: `argon2-hash-${suffix}`,
  });
}

describe("wallet repository", () => {
  it("normalizes whatsapp phones, blocks duplicate customers per tenant, and keeps search tenant-scoped", async () => {
    const harness = await createHarness();

    try {
      const tenantA = await bootstrapTenant(harness.repository, "1001");
      const tenantB = await bootstrapTenant(harness.repository, "2002");

      const firstCustomer = await harness.wallet.createCustomer({
        tenantId: tenantA.tenantId,
        name: "Marina Silva",
        whatsappPhone: "+55 (11) 99876-5432",
        notes: "Cliente recorrente",
      });
      const updatedCustomer = await harness.wallet.updateCustomer({
        tenantId: tenantA.tenantId,
        customerId: firstCustomer.id,
        status: "delinquent",
        notes: "Atrasou a competencia de abril",
      });

      expect(firstCustomer.whatsappPhoneNormalized).toBe("5511998765432");
      expect(updatedCustomer).toMatchObject({
        id: firstCustomer.id,
        status: "delinquent",
        notes: "Atrasou a competencia de abril",
      });

      await expect(
        harness.wallet.createCustomer({
          tenantId: tenantA.tenantId,
          name: "Marina Duplicada",
          whatsappPhone: "11 99876-5432",
        }),
      ).rejects.toThrow(/duplicate/i);

      const duplicateOverride = await harness.wallet.createCustomer({
        tenantId: tenantA.tenantId,
        name: "Marina Override",
        whatsappPhone: "11998765432",
        allowDuplicatePhone: true,
      });

      const otherTenantCustomer = await harness.wallet.createCustomer({
        tenantId: tenantB.tenantId,
        name: "Marina Outro Tenant",
        whatsappPhone: "11 99876-5432",
      });

      const tenantAResults = await harness.wallet.listCustomers({
        tenantId: tenantA.tenantId,
        search: "Marina",
      });
      const tenantBResults = await harness.wallet.listCustomers({
        tenantId: tenantB.tenantId,
      });

      expect(tenantAResults.map((customer) => customer.id)).toEqual(
        expect.arrayContaining([firstCustomer.id, duplicateOverride.id]),
      );
      expect(tenantAResults.every((customer) => customer.tenantId === tenantA.tenantId)).toBe(
        true,
      );
      expect(tenantBResults).toHaveLength(1);
      expect(tenantBResults[0]?.id).toBe(otherTenantCustomer.id);
    } finally {
      await harness.close();
    }
  });

  it("derives the latest consent state per channel from append-only events", async () => {
    const harness = await createHarness();

    try {
      const tenant = await bootstrapTenant(harness.repository, "3003");
      const otherTenant = await bootstrapTenant(harness.repository, "4004");
      const customer = await harness.wallet.createCustomer({
        tenantId: tenant.tenantId,
        name: "Carlos Lima",
        whatsappPhone: "+55 11 91234-5678",
      });

      await harness.wallet.appendCustomerConsentEvent({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        channel: "whatsapp",
        status: "opted-in",
        evidence: "Opt-in capturado no onboarding",
        effectiveAt: new Date("2026-04-17T11:00:00.000Z"),
        actorUserId: tenant.userId,
        actorEmail: "owner-3003@tenant.com.br",
      });
      await harness.wallet.appendCustomerConsentEvent({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        channel: "whatsapp",
        status: "opted-out",
        evidence: "Cliente pediu pausa temporaria",
        effectiveAt: new Date("2026-04-17T09:00:00.000Z"),
        actorUserId: tenant.userId,
        actorEmail: "owner-3003@tenant.com.br",
      });
      await harness.wallet.appendCustomerConsentEvent({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        channel: "email",
        status: "opted-out",
        evidence: "Sem contato por email",
        effectiveAt: new Date("2026-04-17T08:00:00.000Z"),
        actorUserId: tenant.userId,
      });

      const customerSnapshot = await harness.wallet.getCustomerById({
        tenantId: tenant.tenantId,
        customerId: customer.id,
      });
      const customerHistory = await harness.wallet.listCustomerConsentEvents({
        tenantId: tenant.tenantId,
        customerId: customer.id,
      });
      const crossTenantRead = await harness.wallet.getCustomerById({
        tenantId: otherTenant.tenantId,
        customerId: customer.id,
      });

      expect(customerSnapshot?.latestConsentByChannel.whatsapp?.status).toBe("opted-in");
      expect(customerSnapshot?.latestConsentByChannel.email?.status).toBe("opted-out");
      expect(customerHistory.map((event) => `${event.channel}:${event.status}`)).toEqual([
        "whatsapp:opted-in",
        "whatsapp:opted-out",
        "email:opted-out",
      ]);
      expect(crossTenantRead).toBeNull();
    } finally {
      await harness.close();
    }
  });

  it("creates, updates, and archives billing plans without leaking across tenants", async () => {
    const harness = await createHarness();

    try {
      const tenant = await bootstrapTenant(harness.repository, "5005");
      const otherTenant = await bootstrapTenant(harness.repository, "6006");

      const plan = await harness.wallet.createBillingPlan({
        tenantId: tenant.tenantId,
        name: "Plano Mensal",
        amountCents: 15990,
        billingInterval: "monthly",
        defaultDueDay: 12,
        messageTemplate: "Oi {{customerName}}, segue sua cobranca Pix.",
        reminderProfile: "manual",
      });

      const updatedPlan = await harness.wallet.updateBillingPlan({
        tenantId: tenant.tenantId,
        planId: plan.id,
        amountCents: 16990,
        defaultDueDay: 15,
        status: "active",
        reminderProfile: "standard",
      });

      expect(updatedPlan).toMatchObject({
        id: plan.id,
        amountCents: 16990,
        defaultDueDay: 15,
        status: "active",
        reminderProfile: "standard",
      });

      const archived = await harness.wallet.archiveBillingPlan({
        tenantId: tenant.tenantId,
        planId: plan.id,
      });
      const archivedList = await harness.wallet.listBillingPlans({
        tenantId: tenant.tenantId,
        status: "archived",
      });
      const crossTenantRead = await harness.wallet.getBillingPlanById({
        tenantId: otherTenant.tenantId,
        planId: plan.id,
      });

      expect(archived?.status).toBe("archived");
      expect(archivedList).toHaveLength(1);
      expect(archivedList[0]?.id).toBe(plan.id);
      expect(crossTenantRead).toBeNull();
    } finally {
      await harness.close();
    }
  });

  it("persists subscription lifecycle snapshots and append-only history", async () => {
    const harness = await createHarness();

    try {
      const tenant = await bootstrapTenant(harness.repository, "7007");
      const otherTenant = await bootstrapTenant(harness.repository, "8008");
      const customer = await harness.wallet.createCustomer({
        tenantId: tenant.tenantId,
        name: "Patricia Gomes",
        whatsappPhone: "+55 (11) 93456-7890",
      });
      const plan = await harness.wallet.createBillingPlan({
        tenantId: tenant.tenantId,
        name: "Plano Trimestral",
        amountCents: 45990,
        billingInterval: "quarterly",
        defaultDueDay: 20,
        reminderProfile: "standard",
        status: "active",
      });

      const subscription = await harness.wallet.createSubscription({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        planId: plan.id,
        startDate: new Date("2026-04-17T00:00:00.000Z"),
        nextCycleStart: new Date("2026-07-17T00:00:00.000Z"),
        anchorDueDay: 20,
        overrideAmountCents: 42990,
        overrideDueDay: 22,
        transitionReason: "Contrato fechado no balcao",
        actorUserId: tenant.userId,
        actorEmail: "owner-7007@tenant.com.br",
      });

      expect(subscription.status).toBe("active");
      expect(subscription.lastTransitionReason).toBe("Contrato fechado no balcao");

      const paused = await harness.wallet.pauseSubscription({
        tenantId: tenant.tenantId,
        subscriptionId: subscription.id,
        reason: "Cliente pediu ferias",
        effectiveAt: new Date("2026-05-01T00:00:00.000Z"),
        actorUserId: tenant.userId,
      });
      const reactivated = await harness.wallet.reactivateSubscription({
        tenantId: tenant.tenantId,
        subscriptionId: subscription.id,
        reason: "Cliente voltou do periodo de pausa",
        effectiveAt: new Date("2026-05-15T00:00:00.000Z"),
      });
      const canceled = await harness.wallet.cancelSubscription({
        tenantId: tenant.tenantId,
        subscriptionId: subscription.id,
        reason: "Encerramento definitivo",
        effectiveAt: new Date("2026-06-01T00:00:00.000Z"),
      });

      const tenantSubscriptions = await harness.wallet.listSubscriptions({
        tenantId: tenant.tenantId,
        status: "canceled",
      });
      const lifecycleEvents = await harness.wallet.listSubscriptionEvents({
        tenantId: tenant.tenantId,
        subscriptionId: subscription.id,
      });
      const crossTenantRead = await harness.wallet.getSubscriptionById({
        tenantId: otherTenant.tenantId,
        subscriptionId: subscription.id,
      });

      expect(paused?.status).toBe("paused");
      expect(reactivated?.status).toBe("active");
      expect(canceled?.status).toBe("canceled");
      expect(canceled?.lastTransitionReason).toBe("Encerramento definitivo");
      expect(tenantSubscriptions).toHaveLength(1);
      expect(tenantSubscriptions[0]?.id).toBe(subscription.id);
      expect(lifecycleEvents.map((event) => event.eventType)).toEqual([
        "canceled",
        "reactivated",
        "paused",
        "created",
      ]);
      expect(lifecycleEvents.map((event) => event.toStatus)).toEqual([
        "canceled",
        "active",
        "paused",
        "active",
      ]);
      expect(crossTenantRead).toBeNull();
    } finally {
      await harness.close();
    }
  });
});
