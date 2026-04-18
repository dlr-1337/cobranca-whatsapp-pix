import {
  advanceRecurringCycle,
  cancelChargeInputSchema,
  chargeEventFiltersSchema,
  chargeFiltersSchema,
  createManualChargeInputSchema,
  deriveRecurringDueDate,
  formatRecurringCompetenceKey,
  generateRecurringChargesInputSchema,
  isOpenChargeOverdue,
  markChargePaidInputSchema,
  replaceChargeInputSchema,
  type ChargeEventType,
  type ChargeOrigin,
  type ChargeStatus,
} from "@cobrazap/domain";
import {
  and,
  desc,
  eq,
  inArray,
  lte,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  billingPlans,
  chargeEvents,
  charges,
  customers,
  subscriptions,
} from "../schema/index.js";
import * as schema from "../schema/index.js";
import { requireTenantId, tenantScopedWhere } from "./tenant-scope.js";

type ChargesDatabase = NodePgDatabase<typeof schema>;
type DatabaseExecutor = Parameters<ChargesDatabase["transaction"]>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : ChargesDatabase;

type ChargeRow = typeof charges.$inferSelect;
type BillingPlanRow = typeof billingPlans.$inferSelect;

function createId() {
  return crypto.randomUUID();
}

function chargeStateTransitionError(action: string, status: string) {
  return new Error(`Cannot ${action} charge from status ${status}`);
}

async function getScopedCharge(
  db: ChargesDatabase | DatabaseExecutor,
  tenantId: string,
  chargeId: string,
) {
  const [charge] = await db
    .select()
    .from(charges)
    .where(tenantScopedWhere(charges.tenantId, tenantId, eq(charges.id, chargeId)))
    .limit(1);

  return charge ?? null;
}

async function getScopedCustomer(
  db: ChargesDatabase | DatabaseExecutor,
  tenantId: string,
  customerId: string,
) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      tenantScopedWhere(customers.tenantId, tenantId, eq(customers.id, customerId)),
    )
    .limit(1);

  return customer ?? null;
}

async function getScopedPlan(
  db: ChargesDatabase | DatabaseExecutor,
  tenantId: string,
  planId: string,
) {
  const [plan] = await db
    .select()
    .from(billingPlans)
    .where(
      tenantScopedWhere(billingPlans.tenantId, tenantId, eq(billingPlans.id, planId)),
    )
    .limit(1);

  return plan ?? null;
}

async function getScopedSubscription(
  db: ChargesDatabase | DatabaseExecutor,
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

async function getRecurringChargeByCompetence(
  db: ChargesDatabase | DatabaseExecutor,
  input: {
    tenantId: string;
    subscriptionId: string;
    competenceKey: string;
  },
) {
  const [charge] = await db
    .select()
    .from(charges)
    .where(
      tenantScopedWhere(
        charges.tenantId,
        input.tenantId,
        eq(charges.subscriptionId, input.subscriptionId),
        eq(charges.competenceKey, input.competenceKey),
      ),
    )
    .limit(1);

  return charge ?? null;
}

async function appendChargeEvent(
  db: DatabaseExecutor,
  input: {
    tenantId: string;
    chargeId: string;
    eventType: ChargeEventType;
    fromStatus: ChargeStatus | null;
    toStatus: ChargeStatus;
    occurredAt: Date;
    reason?: string | null;
    actorUserId?: string | null;
    actorEmail?: string | null;
  },
) {
  const [event] = await db
    .insert(chargeEvents)
    .values({
      id: createId(),
      tenantId: input.tenantId,
      chargeId: input.chargeId,
      eventType: input.eventType,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      occurredAt: input.occurredAt,
      reason: input.reason ?? null,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
    })
    .returning();

  return event;
}

function chargeDescription(
  input: {
    explicitDescription?: string | null;
    planName?: string | null;
    competenceKey?: string | null;
  },
) {
  if (input.explicitDescription?.trim()) {
    return input.explicitDescription.trim();
  }

  if (input.planName && input.competenceKey) {
    return `${input.planName} - ${input.competenceKey}`;
  }

  if (input.planName) {
    return input.planName;
  }

  return null;
}

function mapChargeSummary(chargeList: Array<{ status: ChargeStatus; dueDate: Date; amountCents: number }>) {
  return chargeList.reduce(
    (summary, item) => {
      if (item.status === "paid") {
        summary.receivedCount += 1;
        summary.receivedCents += item.amountCents;
        return summary;
      }

      if (isOpenChargeOverdue(item)) {
        summary.overdueCount += 1;
        summary.overdueCents += item.amountCents;
        return summary;
      }

      if (item.status === "open") {
        summary.dueSoonCount += 1;
        summary.dueSoonCents += item.amountCents;
      }

      return summary;
    },
    {
      receivedCount: 0,
      receivedCents: 0,
      dueSoonCount: 0,
      dueSoonCents: 0,
      overdueCount: 0,
      overdueCents: 0,
    },
  );
}

async function listChargeRows(
  db: ChargesDatabase | DatabaseExecutor,
  tenantId: string,
  filters: {
    customerId?: string;
    subscriptionId?: string;
    planId?: string;
    origin?: ChargeOrigin;
    status?: ChargeStatus;
  } = {},
) {
  return db
    .select({
      id: charges.id,
      tenantId: charges.tenantId,
      customerId: charges.customerId,
      planId: charges.planId,
      subscriptionId: charges.subscriptionId,
      origin: charges.origin,
      status: charges.status,
      amountCents: charges.amountCents,
      dueDate: charges.dueDate,
      competenceKey: charges.competenceKey,
      description: charges.description,
      notes: charges.notes,
      replacesChargeId: charges.replacesChargeId,
      replacedByChargeId: charges.replacedByChargeId,
      paidAt: charges.paidAt,
      paidAmountCents: charges.paidAmountCents,
      canceledAt: charges.canceledAt,
      createdAt: charges.createdAt,
      updatedAt: charges.updatedAt,
      customerName: customers.name,
      customerWhatsappPhoneDisplay: customers.whatsappPhoneDisplay,
      planName: billingPlans.name,
    })
    .from(charges)
    .innerJoin(
      customers,
      and(
        eq(customers.id, charges.customerId),
        eq(customers.tenantId, charges.tenantId),
      ),
    )
    .leftJoin(
      billingPlans,
      and(
        eq(billingPlans.id, charges.planId),
        eq(billingPlans.tenantId, charges.tenantId),
      ),
    )
    .where(
      tenantScopedWhere(
        charges.tenantId,
        tenantId,
        filters.customerId ? eq(charges.customerId, filters.customerId) : undefined,
        filters.subscriptionId
          ? eq(charges.subscriptionId, filters.subscriptionId)
          : undefined,
        filters.planId ? eq(charges.planId, filters.planId) : undefined,
        filters.origin ? eq(charges.origin, filters.origin) : undefined,
        filters.status ? eq(charges.status, filters.status) : undefined,
      ),
    )
    .orderBy(desc(charges.dueDate), desc(charges.createdAt));
}

async function listEventsByChargeIds(
  db: ChargesDatabase | DatabaseExecutor,
  tenantId: string,
  chargeIds: string[],
) {
  if (!chargeIds.length) {
    return [];
  }

  return db
    .select()
    .from(chargeEvents)
    .where(
      tenantScopedWhere(
        chargeEvents.tenantId,
        tenantId,
        inArray(chargeEvents.chargeId, chargeIds),
      ),
    )
    .orderBy(desc(chargeEvents.occurredAt), desc(chargeEvents.createdAt));
}

async function createChargeRecord(
  db: DatabaseExecutor,
  input: {
    tenantId: string;
    customerId: string;
    planId?: string | null;
    subscriptionId?: string | null;
    origin: ChargeOrigin;
    amountCents: number;
    dueDate: Date;
    competenceKey?: string | null;
    description?: string | null;
    notes?: string | null;
    replacesChargeId?: string | null;
    actorUserId?: string | null;
    actorEmail?: string | null;
    createdAt?: Date;
  },
) {
  const [charge] = await db
    .insert(charges)
    .values({
      id: createId(),
      tenantId: input.tenantId,
      customerId: input.customerId,
      planId: input.planId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      origin: input.origin,
      status: "open",
      amountCents: input.amountCents,
      dueDate: input.dueDate,
      competenceKey: input.competenceKey ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      replacesChargeId: input.replacesChargeId ?? null,
      createdAt: input.createdAt ?? new Date(),
      updatedAt: input.createdAt ?? new Date(),
    })
    .returning();

  if (!charge) {
    throw new Error("Failed to create charge");
  }

  await appendChargeEvent(db, {
    tenantId: input.tenantId,
    chargeId: charge.id,
    eventType: "created",
    fromStatus: null,
    toStatus: "open",
    occurredAt: input.createdAt ?? new Date(),
    actorUserId: input.actorUserId ?? null,
    actorEmail: input.actorEmail ?? null,
    reason: input.replacesChargeId ? "Replacement created" : null,
  });

  return charge;
}

async function replaceChargeLifecycle(
  db: ChargesDatabase,
  rawInput: Parameters<typeof replaceChargeInputSchema.parse>[0],
) {
  const input = replaceChargeInputSchema.parse(rawInput);

  if (!input.tenantId || !input.chargeId) {
    throw new Error("tenant_id and charge_id are required");
  }

  return db.transaction(async (tx) => {
    const existing = await getScopedCharge(tx, input.tenantId!, input.chargeId!);

    if (!existing) {
      return null;
    }

    if (existing.status !== "open") {
      throw chargeStateTransitionError("replace", existing.status);
    }

    const replacement = await createChargeRecord(tx, {
      tenantId: input.tenantId!,
      customerId: existing.customerId,
      planId: existing.planId,
      subscriptionId: existing.subscriptionId,
      origin: "manual",
      amountCents: input.amountCents ?? existing.amountCents,
      dueDate: input.dueDate ?? existing.dueDate,
      description:
        input.description === undefined ? existing.description : input.description,
      notes: input.notes === undefined ? existing.notes : input.notes,
      replacesChargeId: existing.id,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      createdAt: input.occurredAt,
    });

    const [updated] = await tx
      .update(charges)
      .set({
        status: "replaced",
        replacedByChargeId: replacement.id,
        updatedAt: input.occurredAt,
      })
      .where(
        tenantScopedWhere(
          charges.tenantId,
          input.tenantId!,
          eq(charges.id, existing.id),
        ),
      )
      .returning();

    await appendChargeEvent(tx, {
      tenantId: input.tenantId!,
      chargeId: existing.id,
      eventType: "replaced",
      fromStatus: existing.status,
      toStatus: "replaced",
      occurredAt: input.occurredAt,
      reason: input.reason,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
    });

    return {
      replacedCharge: updated ?? null,
      replacementCharge: replacement,
    };
  });
}

export function createChargesRepository(db: ChargesDatabase) {
  return {
    async createManualCharge(
      rawInput: Parameters<typeof createManualChargeInputSchema.parse>[0],
    ) {
      const input = createManualChargeInputSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      return db.transaction(async (tx) => {
        const customer = await getScopedCustomer(tx, input.tenantId!, input.customerId);

        if (!customer) {
          throw new Error("Customer not found for tenant");
        }

        let plan: BillingPlanRow | null = null;

        if (input.planId) {
          plan = await getScopedPlan(tx, input.tenantId!, input.planId);

          if (!plan) {
            throw new Error("Billing plan not found for tenant");
          }
        }

        const charge = await createChargeRecord(tx, {
          tenantId: input.tenantId!,
          customerId: input.customerId,
          planId: input.planId ?? null,
          origin: "manual",
          amountCents: input.amountCents,
          dueDate: input.dueDate,
          description: chargeDescription({
            explicitDescription: input.description ?? null,
            planName: plan?.name ?? null,
          }),
          notes: input.notes ?? null,
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail ?? null,
          createdAt: new Date(),
        });

        return charge;
      });
    },

    async getChargeById(rawInput: { tenantId: string; chargeId: string }) {
      const tenantId = requireTenantId(rawInput.tenantId);
      const rows = await listChargeRows(db, tenantId, {});
      return rows.find((row) => row.id === rawInput.chargeId) ?? null;
    },

    async listCharges(rawInput: Parameters<typeof chargeFiltersSchema.parse>[0]) {
      const input = chargeFiltersSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      return listChargeRows(db, input.tenantId, input);
    },

    async listChargeEvents(rawInput: Parameters<typeof chargeEventFiltersSchema.parse>[0]) {
      const input = chargeEventFiltersSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      return db
        .select()
        .from(chargeEvents)
        .where(
          tenantScopedWhere(
            chargeEvents.tenantId,
            input.tenantId,
            input.chargeId ? eq(chargeEvents.chargeId, input.chargeId) : undefined,
          ),
        )
        .orderBy(desc(chargeEvents.occurredAt), desc(chargeEvents.createdAt));
    },

    async getChargesOverview(rawInput: { tenantId: string }) {
      const tenantId = requireTenantId(rawInput.tenantId);
      const chargeList = await listChargeRows(db, tenantId);
      const eventList = await listEventsByChargeIds(
        db,
        tenantId,
        chargeList.map((item) => item.id),
      );

      return {
        summary: mapChargeSummary(
          chargeList.map((item) => ({
            status: item.status,
            dueDate: item.dueDate,
            amountCents: item.amountCents,
          })),
        ),
        charges: chargeList,
        chargeEvents: eventList,
      };
    },

    async generateRecurringCharges(
      rawInput: Parameters<typeof generateRecurringChargesInputSchema.parse>[0],
    ) {
      const input = generateRecurringChargesInputSchema.parse(rawInput);

      if (!input.tenantId) {
        throw new Error("tenant_id is required");
      }

      const dueSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          tenantScopedWhere(
            subscriptions.tenantId,
            input.tenantId,
            eq(subscriptions.status, "active"),
            lte(subscriptions.nextCycleStart, input.referenceDate),
          ),
        )
        .orderBy(subscriptions.nextCycleStart);

      const processedCharges: ChargeRow[] = [];

      for (const subscription of dueSubscriptions) {
        const generatedForSubscription = await db.transaction(async (tx) => {
          const current = await getScopedSubscription(tx, input.tenantId!, subscription.id);

          if (!current || current.status !== "active") {
            return [];
          }

          const plan = await getScopedPlan(tx, input.tenantId!, current.planId);

          if (!plan) {
            throw new Error("Billing plan not found for subscription");
          }

          if (!(await getScopedCustomer(tx, input.tenantId!, current.customerId))) {
            throw new Error("Customer not found for subscription");
          }

          const generated: ChargeRow[] = [];
          let cursor = current.nextCycleStart;

          while (cursor.getTime() <= input.referenceDate.getTime()) {
            const competenceKey = formatRecurringCompetenceKey(
              cursor,
              plan.billingInterval,
            );
            const existingCharge = await getRecurringChargeByCompetence(tx, {
              tenantId: input.tenantId!,
              subscriptionId: current.id,
              competenceKey,
            });

            if (existingCharge) {
              generated.push(existingCharge);
              cursor = advanceRecurringCycle(cursor, plan.billingInterval);
              continue;
            }

            const charge = await createChargeRecord(tx, {
              tenantId: input.tenantId!,
              customerId: current.customerId,
              planId: current.planId,
              subscriptionId: current.id,
              origin: "recurring",
              amountCents: current.overrideAmountCents ?? plan.amountCents,
              dueDate: deriveRecurringDueDate({
                cycleStart: cursor,
                interval: plan.billingInterval,
                dueDay: current.overrideDueDay ?? current.anchorDueDay,
              }),
              competenceKey,
              description: chargeDescription({
                planName: plan.name,
                competenceKey,
              }),
              actorUserId: input.actorUserId ?? null,
              actorEmail: input.actorEmail ?? null,
              createdAt: cursor,
            });

            generated.push(charge);
            cursor = advanceRecurringCycle(cursor, plan.billingInterval);
          }

          if (cursor.getTime() > current.nextCycleStart.getTime()) {
            await tx
              .update(subscriptions)
              .set({
                nextCycleStart: cursor,
                updatedAt: new Date(),
              })
              .where(
                tenantScopedWhere(
                  subscriptions.tenantId,
                  input.tenantId!,
                  eq(subscriptions.id, current.id),
                ),
              );
          }

          return generated;
        });

        processedCharges.push(...generatedForSubscription);
      }

      return {
        referenceDate: input.referenceDate,
        generatedCount: processedCharges.filter((charge) => charge.origin === "recurring")
          .length,
        processedSubscriptions: dueSubscriptions.length,
        charges: processedCharges,
      };
    },

    async markChargePaid(rawInput: Parameters<typeof markChargePaidInputSchema.parse>[0]) {
      const input = markChargePaidInputSchema.parse(rawInput);

      if (!input.tenantId || !input.chargeId) {
        throw new Error("tenant_id and charge_id are required");
      }

      return db.transaction(async (tx) => {
        const existing = await getScopedCharge(tx, input.tenantId!, input.chargeId!);

        if (!existing) {
          return null;
        }

        if (existing.status !== "open") {
          throw chargeStateTransitionError("mark paid", existing.status);
        }

        const [updated] = await tx
          .update(charges)
          .set({
            status: "paid",
            paidAt: input.occurredAt,
            paidAmountCents: input.paidAmountCents ?? existing.amountCents,
            updatedAt: input.occurredAt,
          })
          .where(
            tenantScopedWhere(
              charges.tenantId,
              input.tenantId!,
              eq(charges.id, existing.id),
            ),
          )
          .returning();

        await appendChargeEvent(tx, {
          tenantId: input.tenantId!,
          chargeId: existing.id,
          eventType: "paid",
          fromStatus: existing.status,
          toStatus: "paid",
          occurredAt: input.occurredAt,
          reason: input.reason ?? null,
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail ?? null,
        });

        return updated ?? null;
      });
    },

    async cancelCharge(rawInput: Parameters<typeof cancelChargeInputSchema.parse>[0]) {
      const input = cancelChargeInputSchema.parse(rawInput);

      if (!input.tenantId || !input.chargeId) {
        throw new Error("tenant_id and charge_id are required");
      }

      return db.transaction(async (tx) => {
        const existing = await getScopedCharge(tx, input.tenantId!, input.chargeId!);

        if (!existing) {
          return null;
        }

        if (existing.status !== "open") {
          throw chargeStateTransitionError("cancel", existing.status);
        }

        const [updated] = await tx
          .update(charges)
          .set({
            status: "canceled",
            canceledAt: input.occurredAt,
            updatedAt: input.occurredAt,
          })
          .where(
            tenantScopedWhere(
              charges.tenantId,
              input.tenantId!,
              eq(charges.id, existing.id),
            ),
          )
          .returning();

        await appendChargeEvent(tx, {
          tenantId: input.tenantId!,
          chargeId: existing.id,
          eventType: "canceled",
          fromStatus: existing.status,
          toStatus: "canceled",
          occurredAt: input.occurredAt,
          reason: input.reason,
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail ?? null,
        });

        return updated ?? null;
      });
    },

    async replaceCharge(rawInput: Parameters<typeof replaceChargeInputSchema.parse>[0]) {
      return replaceChargeLifecycle(db, rawInput);
    },
  };
}

export type ChargesRepository = ReturnType<typeof createChargesRepository>;
