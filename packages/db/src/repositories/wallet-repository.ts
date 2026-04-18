import {
  appendCustomerConsentEventInputSchema,
  billingPlanFiltersSchema,
  createBillingPlanInputSchema,
  createCustomerInputSchema,
  createSubscriptionInputSchema,
  customerConsentFiltersSchema,
  customerFiltersSchema,
  deriveLatestCustomerConsentByChannel,
  emptyCustomerConsentSnapshot,
  normalizeBrazilianWhatsappPhone,
  phoneDigitsOnly,
  subscriptionEventFiltersSchema,
  subscriptionFiltersSchema,
  subscriptionLifecycleCommandSchema,
  updateBillingPlanInputSchema,
  updateCustomerInputSchema,
  updateSubscriptionInputSchema,
  type SubscriptionEventType,
  type SubscriptionStatus,
} from "@cobrazap/domain";
import {
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  billingPlans,
  customerChannelConsentEvents,
  customers,
  subscriptions,
  subscriptionEvents,
} from "../schema/index.js";
import * as schema from "../schema/index.js";
import { tenantScopedWhere } from "./tenant-scope.js";

type WalletDatabase = NodePgDatabase<typeof schema>;
type DatabaseExecutor = Parameters<WalletDatabase["transaction"]>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : WalletDatabase;
type CustomerRow = typeof customers.$inferSelect;
type ConsentEventRow = typeof customerChannelConsentEvents.$inferSelect;

function createId() {
  return crypto.randomUUID();
}

function duplicateCustomerPhoneError(phone: string) {
  const error = new Error(`Duplicate customer phone: ${phone}`);
  (error as Error & { code?: string }).code = "DUPLICATE_CUSTOMER_PHONE";
  return error;
}

function textSearchClause(
  column:
    | typeof customers.name
    | typeof customers.whatsappPhoneDisplay
    | typeof customers.whatsappPhoneNormalized
    | typeof billingPlans.name,
  value?: string,
) {
  if (!value?.trim()) {
    return undefined;
  }

  return ilike(column, `%${value.trim()}%`);
}

function orIfPresent(...clauses: Array<SQL | undefined>) {
  const filtered = clauses.filter((clause): clause is SQL => Boolean(clause));

  if (!filtered.length) {
    return undefined;
  }

  return or(...filtered);
}

async function getScopedCustomer(
  db: WalletDatabase | DatabaseExecutor,
  tenantId: string,
  customerId: string,
) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(tenantScopedWhere(customers.tenantId, tenantId, eq(customers.id, customerId)))
    .limit(1);

  return customer ?? null;
}

async function getScopedBillingPlan(
  db: WalletDatabase | DatabaseExecutor,
  tenantId: string,
  planId: string,
) {
  const [plan] = await db
    .select()
    .from(billingPlans)
    .where(tenantScopedWhere(billingPlans.tenantId, tenantId, eq(billingPlans.id, planId)))
    .limit(1);

  return plan ?? null;
}

async function getScopedSubscription(
  db: WalletDatabase | DatabaseExecutor,
  tenantId: string,
  subscriptionId: string,
) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      tenantScopedWhere(
        subscriptions.tenantId,
        tenantId,
        eq(subscriptions.id, subscriptionId),
      ),
    )
    .limit(1);

  return subscription ?? null;
}

async function assertUniqueCustomerPhone(
  db: WalletDatabase | DatabaseExecutor,
  tenantId: string,
  normalizedPhone: string,
  excludeCustomerId?: string,
) {
  const [existing] = await db
    .select({
      id: customers.id,
    })
    .from(customers)
    .where(
      tenantScopedWhere(
        customers.tenantId,
        tenantId,
        eq(customers.whatsappPhoneNormalized, normalizedPhone),
        excludeCustomerId ? ne(customers.id, excludeCustomerId) : undefined,
      ),
    )
    .limit(1);

  if (existing) {
    throw duplicateCustomerPhoneError(normalizedPhone);
  }
}

async function loadLatestConsentMap(
  db: WalletDatabase | DatabaseExecutor,
  tenantId: string,
  customerIds: string[],
) {
  if (!customerIds.length) {
    return new Map<string, ReturnType<typeof emptyCustomerConsentSnapshot<ConsentEventRow>>>();
  }

  const events = await db
    .select()
    .from(customerChannelConsentEvents)
    .where(
      tenantScopedWhere(
        customerChannelConsentEvents.tenantId,
        tenantId,
        inArray(customerChannelConsentEvents.customerId, customerIds),
      ),
    )
    .orderBy(
      desc(customerChannelConsentEvents.effectiveAt),
      desc(customerChannelConsentEvents.createdAt),
    );

  const grouped = new Map<string, ConsentEventRow[]>();

  for (const event of events) {
    const current = grouped.get(event.customerId) ?? [];
    current.push(event);
    grouped.set(event.customerId, current);
  }

  return new Map(
    customerIds.map((customerId) => [
      customerId,
      deriveLatestCustomerConsentByChannel(grouped.get(customerId) ?? []),
    ]),
  );
}

async function hydrateCustomers(
  db: WalletDatabase | DatabaseExecutor,
  tenantId: string,
  rows: CustomerRow[],
) {
  const consentMap = await loadLatestConsentMap(
    db,
    tenantId,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    latestConsentByChannel:
      consentMap.get(row.id) ?? emptyCustomerConsentSnapshot<ConsentEventRow>(),
  }));
}

async function appendSubscriptionEvent(
  db: DatabaseExecutor,
  input: {
    tenantId: string;
    subscriptionId: string;
    eventType: SubscriptionEventType;
    fromStatus: SubscriptionStatus | null;
    toStatus: SubscriptionStatus;
    reason?: string | null;
    effectiveAt: Date;
    actorUserId?: string | null;
    actorEmail?: string | null;
  },
) {
  const [event] = await db
    .insert(subscriptionEvents)
    .values({
      id: createId(),
      tenantId: input.tenantId,
      subscriptionId: input.subscriptionId,
      eventType: input.eventType,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      reason: input.reason ?? null,
      effectiveAt: input.effectiveAt,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
    })
    .returning();

  return event;
}

export function createWalletRepository(db: WalletDatabase) {
  return {
    async createCustomer(rawInput: Parameters<typeof createCustomerInputSchema.parse>[0]) {
      const input = createCustomerInputSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      const normalizedPhone = normalizeBrazilianWhatsappPhone(input.whatsappPhone);

      if (!input.allowDuplicatePhone) {
        await assertUniqueCustomerPhone(db, input.tenantId, normalizedPhone);
      }

      const [customer] = await db
        .insert(customers)
        .values({
          id: createId(),
          tenantId: input.tenantId,
          name: input.name,
          whatsappPhoneDisplay: input.whatsappPhone.trim(),
          whatsappPhoneNormalized: normalizedPhone,
          notes: input.notes ?? null,
          status: input.status,
        })
        .returning();

      if (!customer) {
        throw new Error("Failed to create customer");
      }

      const [hydrated] = await hydrateCustomers(db, input.tenantId, [customer]);
      return hydrated;
    },

    async updateCustomer(rawInput: Parameters<typeof updateCustomerInputSchema.parse>[0]) {
      const input = updateCustomerInputSchema.parse(rawInput);

      if (!input.tenantId || !input.customerId) {
        throw new Error("tenant_id and customer_id are required");
      }

      const existing = await getScopedCustomer(db, input.tenantId, input.customerId);

      if (!existing) {
        return null;
      }

      const normalizedPhone = input.whatsappPhone
        ? normalizeBrazilianWhatsappPhone(input.whatsappPhone)
        : existing.whatsappPhoneNormalized;

      if (!input.allowDuplicatePhone) {
        await assertUniqueCustomerPhone(
          db,
          input.tenantId,
          normalizedPhone,
          existing.id,
        );
      }

      const [updated] = await db
        .update(customers)
        .set({
          name: input.name ?? existing.name,
          whatsappPhoneDisplay: input.whatsappPhone?.trim() ?? existing.whatsappPhoneDisplay,
          whatsappPhoneNormalized: normalizedPhone,
          notes: input.notes === undefined ? existing.notes : input.notes,
          status: input.status ?? existing.status,
          updatedAt: new Date(),
        })
        .where(
          tenantScopedWhere(
            customers.tenantId,
            input.tenantId,
            eq(customers.id, existing.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Failed to update customer");
      }

      const [hydrated] = await hydrateCustomers(db, input.tenantId, [updated]);
      return hydrated;
    },

    async getCustomerById(rawInput: { tenantId: string; customerId: string }) {
      const customer = await getScopedCustomer(db, rawInput.tenantId, rawInput.customerId);

      if (!customer) {
        return null;
      }

      const [hydrated] = await hydrateCustomers(db, rawInput.tenantId, [customer]);
      return hydrated;
    },

    async listCustomers(rawInput: Parameters<typeof customerFiltersSchema.parse>[0]) {
      const input = customerFiltersSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      const digits = phoneDigitsOnly(input.search ?? "");
      const searchClause = orIfPresent(
        textSearchClause(customers.name, input.search),
        textSearchClause(customers.whatsappPhoneDisplay, input.search),
        digits ? textSearchClause(customers.whatsappPhoneNormalized, digits) : undefined,
      );

      const rows = await db
        .select()
        .from(customers)
        .where(
          tenantScopedWhere(
            customers.tenantId,
            input.tenantId,
            input.status ? eq(customers.status, input.status) : undefined,
            searchClause,
          ),
        )
        .orderBy(customers.name);

      return hydrateCustomers(db, input.tenantId, rows);
    },

    async appendCustomerConsentEvent(
      rawInput: Parameters<typeof appendCustomerConsentEventInputSchema.parse>[0],
    ) {
      const input = appendCustomerConsentEventInputSchema.parse(rawInput);

      if (!input.tenantId || !input.customerId) {
        throw new Error("tenant_id and customer_id are required");
      }

      const customer = await getScopedCustomer(db, input.tenantId, input.customerId);

      if (!customer) {
        throw new Error("Customer not found for tenant");
      }

      const [event] = await db
        .insert(customerChannelConsentEvents)
        .values({
          id: createId(),
          tenantId: input.tenantId,
          customerId: input.customerId,
          channel: input.channel,
          status: input.status,
          evidence: input.evidence,
          effectiveAt: input.effectiveAt,
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail ?? null,
        })
        .returning();

      return event;
    },

    async listCustomerConsentEvents(
      rawInput: Parameters<typeof customerConsentFiltersSchema.parse>[0],
    ) {
      const input = customerConsentFiltersSchema.parse(rawInput);

      if (!input.tenantId || !input.customerId) {
        throw new Error("tenant_id and customer_id are required");
      }

      return db
        .select()
        .from(customerChannelConsentEvents)
        .where(
          tenantScopedWhere(
            customerChannelConsentEvents.tenantId,
            input.tenantId,
            eq(customerChannelConsentEvents.customerId, input.customerId),
            input.channel
              ? eq(customerChannelConsentEvents.channel, input.channel)
              : undefined,
          ),
        )
        .orderBy(
          desc(customerChannelConsentEvents.effectiveAt),
          desc(customerChannelConsentEvents.createdAt),
        );
    },

    async listConsentEvents(
      rawInput: Parameters<typeof customerConsentFiltersSchema.parse>[0],
    ) {
      const input = customerConsentFiltersSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      if (input.customerId) {
        return this.listCustomerConsentEvents(input);
      }

      return db
        .select()
        .from(customerChannelConsentEvents)
        .where(
          tenantScopedWhere(
            customerChannelConsentEvents.tenantId,
            input.tenantId,
            input.channel
              ? eq(customerChannelConsentEvents.channel, input.channel)
              : undefined,
          ),
        )
        .orderBy(
          desc(customerChannelConsentEvents.effectiveAt),
          desc(customerChannelConsentEvents.createdAt),
        );
    },

    async createBillingPlan(rawInput: Parameters<typeof createBillingPlanInputSchema.parse>[0]) {
      const input = createBillingPlanInputSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      const [plan] = await db
        .insert(billingPlans)
        .values({
          id: createId(),
          tenantId: input.tenantId,
          name: input.name,
          amountCents: input.amountCents,
          billingInterval: input.billingInterval ?? input.interval ?? "monthly",
          defaultDueDay: input.defaultDueDay,
          messageTemplate: input.messageTemplate ?? null,
          reminderProfile: input.reminderProfile,
          status: input.status,
        })
        .returning();

      return plan;
    },

    async updateBillingPlan(rawInput: Parameters<typeof updateBillingPlanInputSchema.parse>[0]) {
      const input = updateBillingPlanInputSchema.parse(rawInput);

      if (!input.tenantId || !input.planId) {
        throw new Error("tenant_id and plan_id are required");
      }

      const existing = await getScopedBillingPlan(db, input.tenantId, input.planId);

      if (!existing) {
        return null;
      }

      const [updated] = await db
        .update(billingPlans)
        .set({
          name: input.name ?? existing.name,
          amountCents: input.amountCents ?? existing.amountCents,
          billingInterval:
            input.billingInterval ?? input.interval ?? existing.billingInterval,
          defaultDueDay: input.defaultDueDay ?? existing.defaultDueDay,
          messageTemplate:
            input.messageTemplate === undefined
              ? existing.messageTemplate
              : input.messageTemplate,
          reminderProfile: input.reminderProfile ?? existing.reminderProfile,
          status: input.status ?? existing.status,
          updatedAt: new Date(),
        })
        .where(
          tenantScopedWhere(
            billingPlans.tenantId,
            input.tenantId,
            eq(billingPlans.id, existing.id),
          ),
        )
        .returning();

      return updated ?? null;
    },

    async archiveBillingPlan(rawInput: { tenantId: string; planId: string }) {
      return this.updateBillingPlan({
        tenantId: rawInput.tenantId,
        planId: rawInput.planId,
        status: "archived",
      });
    },

    async getBillingPlanById(rawInput: { tenantId: string; planId: string }) {
      return getScopedBillingPlan(db, rawInput.tenantId, rawInput.planId);
    },

    async listBillingPlans(rawInput: Parameters<typeof billingPlanFiltersSchema.parse>[0]) {
      const input = billingPlanFiltersSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      return db
        .select()
        .from(billingPlans)
        .where(
          tenantScopedWhere(
            billingPlans.tenantId,
            input.tenantId,
            input.status ? eq(billingPlans.status, input.status) : undefined,
            textSearchClause(billingPlans.name, input.search),
          ),
        )
        .orderBy(billingPlans.name);
    },

    async createSubscription(rawInput: Parameters<typeof createSubscriptionInputSchema.parse>[0]) {
      const input = createSubscriptionInputSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      return db.transaction(async (tx) => {
        const customer = await getScopedCustomer(tx, input.tenantId!, input.customerId);
        const plan = await getScopedBillingPlan(tx, input.tenantId!, input.planId);

        if (!customer) {
          throw new Error("Customer not found for tenant");
        }

        if (!plan) {
          throw new Error("Billing plan not found for tenant");
        }

        const [subscription] = await tx
          .insert(subscriptions)
          .values({
            id: createId(),
            tenantId: input.tenantId!,
            customerId: input.customerId,
            planId: input.planId,
            status: "active",
            startDate: input.startDate,
            nextCycleStart: input.nextCycleStart ?? input.startDate,
            anchorDueDay: input.anchorDueDay ?? input.overrideDueDay ?? plan.defaultDueDay,
            overrideAmountCents: input.overrideAmountCents ?? null,
            overrideDueDay: input.overrideDueDay ?? null,
            lastTransitionReason: input.transitionReason ?? null,
          })
          .returning();

        if (!subscription) {
          throw new Error("Failed to create subscription");
        }

        await appendSubscriptionEvent(tx, {
          tenantId: input.tenantId!,
          subscriptionId: subscription.id,
          eventType: "created",
          fromStatus: null,
          toStatus: "active",
          reason: input.transitionReason ?? null,
          effectiveAt: input.startDate,
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail ?? null,
        });

        return subscription;
      });
    },

    async updateSubscription(rawInput: Parameters<typeof updateSubscriptionInputSchema.parse>[0]) {
      const input = updateSubscriptionInputSchema.parse(rawInput);

      if (!input.tenantId || !input.subscriptionId) {
        throw new Error("tenant_id and subscription_id are required");
      }

      const existing = await getScopedSubscription(db, input.tenantId, input.subscriptionId);

      if (!existing) {
        return null;
      }

      const [updated] = await db
        .update(subscriptions)
        .set({
          nextCycleStart: input.nextCycleStart ?? existing.nextCycleStart,
          anchorDueDay: input.anchorDueDay ?? existing.anchorDueDay,
          overrideAmountCents:
            input.overrideAmountCents === undefined
              ? existing.overrideAmountCents
              : input.overrideAmountCents,
          overrideDueDay:
            input.overrideDueDay === undefined
              ? existing.overrideDueDay
              : input.overrideDueDay,
          updatedAt: new Date(),
        })
        .where(
          tenantScopedWhere(
            subscriptions.tenantId,
            input.tenantId,
            eq(subscriptions.id, existing.id),
          ),
        )
        .returning();

      return updated ?? null;
    },

    async getSubscriptionById(rawInput: { tenantId: string; subscriptionId: string }) {
      return getScopedSubscription(db, rawInput.tenantId, rawInput.subscriptionId);
    },

    async listSubscriptions(rawInput: Parameters<typeof subscriptionFiltersSchema.parse>[0]) {
      const input = subscriptionFiltersSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      return db
        .select()
        .from(subscriptions)
        .where(
          tenantScopedWhere(
            subscriptions.tenantId,
            input.tenantId,
            input.status ? eq(subscriptions.status, input.status) : undefined,
            input.customerId ? eq(subscriptions.customerId, input.customerId) : undefined,
            input.planId ? eq(subscriptions.planId, input.planId) : undefined,
          ),
        )
        .orderBy(desc(subscriptions.updatedAt));
    },

    async listSubscriptionEvents(
      rawInput: Parameters<typeof subscriptionEventFiltersSchema.parse>[0],
    ) {
      const input = subscriptionEventFiltersSchema.parse(rawInput);

      if (!input.tenantId || !input.subscriptionId) {
        throw new Error("tenant_id and subscription_id are required");
      }

      return db
        .select()
        .from(subscriptionEvents)
        .where(
          tenantScopedWhere(
            subscriptionEvents.tenantId,
            input.tenantId,
            eq(subscriptionEvents.subscriptionId, input.subscriptionId),
          ),
        )
        .orderBy(desc(subscriptionEvents.effectiveAt), desc(subscriptionEvents.createdAt));
    },

    async getWalletOverview(rawInput: { tenantId: string }) {
      const tenantId = rawInput.tenantId?.trim();

      if (!tenantId) {
        throw new Error("tenant_id is required");
      }

      const [customersList, consentEvents, billingPlansList, subscriptionsList] =
        await Promise.all([
          this.listCustomers({ tenantId }),
          this.listConsentEvents({ tenantId }),
          this.listBillingPlans({ tenantId }),
          this.listSubscriptions({ tenantId }),
        ]);

      return {
        customers: customersList,
        consentEvents,
        plans: billingPlansList,
        subscriptions: subscriptionsList,
      };
    },

    async pauseSubscription(
      rawInput: Parameters<typeof subscriptionLifecycleCommandSchema.parse>[0],
    ) {
      return transitionSubscription(db, "pause", rawInput);
    },

    async reactivateSubscription(
      rawInput: Parameters<typeof subscriptionLifecycleCommandSchema.parse>[0],
    ) {
      return transitionSubscription(db, "reactivate", rawInput);
    },

    async cancelSubscription(
      rawInput: Parameters<typeof subscriptionLifecycleCommandSchema.parse>[0],
    ) {
      return transitionSubscription(db, "cancel", rawInput);
    },
  };
}

async function transitionSubscription(
  db: WalletDatabase,
  action: "pause" | "reactivate" | "cancel",
  rawInput: Parameters<typeof subscriptionLifecycleCommandSchema.parse>[0],
) {
  const input = subscriptionLifecycleCommandSchema.parse(rawInput);

  if (!input.tenantId || !input.subscriptionId) {
    throw new Error("tenant_id and subscription_id are required");
  }

  const transition = {
    pause: {
      eventType: "paused" as const,
      nextStatus: "paused" as const,
      allowedFrom: ["active"] as const,
    },
    reactivate: {
      eventType: "reactivated" as const,
      nextStatus: "active" as const,
      allowedFrom: ["paused"] as const,
    },
    cancel: {
      eventType: "canceled" as const,
      nextStatus: "canceled" as const,
      allowedFrom: ["active", "paused"] as const,
    },
  }[action];

  return db.transaction(async (tx) => {
    const existing = await getScopedSubscription(tx, input.tenantId!, input.subscriptionId!);

    if (!existing) {
      return null;
    }

    if (!(transition.allowedFrom as readonly SubscriptionStatus[]).includes(existing.status)) {
      throw new Error(`Cannot ${action} subscription from status ${existing.status}`);
    }

    const [updated] = await tx
      .update(subscriptions)
      .set({
        status: transition.nextStatus,
        lastTransitionReason: input.reason,
        updatedAt: new Date(),
      })
      .where(
        tenantScopedWhere(
          subscriptions.tenantId,
          input.tenantId!,
          eq(subscriptions.id, existing.id),
        ),
      )
      .returning();

    await appendSubscriptionEvent(tx, {
      tenantId: input.tenantId!,
      subscriptionId: existing.id,
      eventType: transition.eventType,
      fromStatus: existing.status,
      toStatus: transition.nextStatus,
      reason: input.reason,
      effectiveAt: input.effectiveAt,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
    });

    return updated ?? null;
  });
}

export type WalletRepository = ReturnType<typeof createWalletRepository>;
