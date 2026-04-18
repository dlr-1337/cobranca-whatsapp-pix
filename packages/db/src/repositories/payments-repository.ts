import {
  getChargePaymentByChargeIdInputSchema,
  getChargePaymentByProviderPaymentIdInputSchema,
  getPaymentProviderCustomerInputSchema,
  ingestPaymentProviderEventInputSchema,
  linkPaymentProviderCustomerInputSchema,
  listPaymentReconciliationRunsInputSchema,
  listPendingPaymentProviderEventsInputSchema,
  markPaymentProviderEventFailedInputSchema,
  markPaymentProviderEventProcessedInputSchema,
  recordPaymentReconciliationRunInputSchema,
  upsertChargePaymentInputSchema,
} from "@cobrazap/domain";
import {
  and,
  asc,
  desc,
  eq,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  chargePayments,
  charges,
  customers,
  paymentProviderCustomers,
  paymentProviderEvents,
  paymentReconciliationItems,
  paymentReconciliationRuns,
} from "../schema/index.js";
import * as schema from "../schema/index.js";
import { requireTenantId, tenantScopedWhere } from "./tenant-scope.js";

type PaymentsDatabase = NodePgDatabase<typeof schema>;
type DatabaseExecutor = Parameters<PaymentsDatabase["transaction"]>[0] extends (
  tx: infer T,
) => Promise<unknown>
  ? T
  : PaymentsDatabase;

function createId() {
  return crypto.randomUUID();
}

async function getScopedCustomer(
  db: PaymentsDatabase | DatabaseExecutor,
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

async function getScopedCharge(
  db: PaymentsDatabase | DatabaseExecutor,
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

export function createPaymentsRepository(db: PaymentsDatabase) {
  return {
    async linkPaymentProviderCustomer(
      rawInput: Parameters<typeof linkPaymentProviderCustomerInputSchema.parse>[0],
    ) {
      const input = linkPaymentProviderCustomerInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      const customer = await getScopedCustomer(db, tenantId, input.customerId);

      if (!customer) {
        throw new Error("Customer not found for tenant");
      }

      const existing = await this.getPaymentProviderCustomer({
        tenantId,
        customerId: input.customerId,
        provider: input.provider,
      });

      if (existing) {
        const [updated] = await db
          .update(paymentProviderCustomers)
          .set({
            providerCustomerId: input.providerCustomerId,
            customerNameSnapshot: input.customerNameSnapshot,
            whatsappPhoneSnapshot: input.whatsappPhoneSnapshot,
            updatedAt: new Date(),
          })
          .where(
            tenantScopedWhere(
              paymentProviderCustomers.tenantId,
              tenantId,
              eq(paymentProviderCustomers.id, existing.id),
            ),
          )
          .returning();

        if (!updated) {
          throw new Error("Failed to update payment provider customer");
        }

        return updated;
      }

      const [created] = await db
        .insert(paymentProviderCustomers)
        .values({
          id: createId(),
          tenantId,
          customerId: input.customerId,
          provider: input.provider,
          providerCustomerId: input.providerCustomerId,
          customerNameSnapshot: input.customerNameSnapshot,
          whatsappPhoneSnapshot: input.whatsappPhoneSnapshot,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create payment provider customer");
      }

      return created;
    },

    async getPaymentProviderCustomer(
      rawInput: Parameters<typeof getPaymentProviderCustomerInputSchema.parse>[0],
    ) {
      const input = getPaymentProviderCustomerInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      const [mapping] = await db
        .select()
        .from(paymentProviderCustomers)
        .where(
          tenantScopedWhere(
            paymentProviderCustomers.tenantId,
            tenantId,
            eq(paymentProviderCustomers.customerId, input.customerId),
            eq(paymentProviderCustomers.provider, input.provider),
          ),
        )
        .limit(1);

      return mapping ?? null;
    },

    async upsertChargePayment(
      rawInput: Parameters<typeof upsertChargePaymentInputSchema.parse>[0],
    ) {
      const input = upsertChargePaymentInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      const charge = await getScopedCharge(db, tenantId, input.chargeId);

      if (!charge) {
        throw new Error("Charge not found for tenant");
      }

      const existing = await this.getChargePaymentByChargeId({
        tenantId,
        chargeId: input.chargeId,
      });

      if (existing) {
        const [updated] = await db
          .update(chargePayments)
          .set({
            provider: input.provider,
            providerCustomerId: input.providerCustomerId,
            providerPaymentId: input.providerPaymentId,
            externalReference: input.externalReference,
            status: input.status,
            pixCopyPasteCode:
              input.pixCopyPasteCode === undefined
                ? existing.pixCopyPasteCode
                : input.pixCopyPasteCode,
            qrCodeBase64:
              input.qrCodeBase64 === undefined
                ? existing.qrCodeBase64
                : input.qrCodeBase64,
            expiresAt:
              input.expiresAt === undefined ? existing.expiresAt : input.expiresAt,
            lastSyncedAt:
              input.lastSyncedAt === undefined
                ? existing.lastSyncedAt
                : input.lastSyncedAt,
            rawChargePayload:
              input.rawChargePayload === undefined
                ? existing.rawChargePayload
                : input.rawChargePayload,
            rawQrCodePayload:
              input.rawQrCodePayload === undefined
                ? existing.rawQrCodePayload
                : input.rawQrCodePayload,
            updatedAt: new Date(),
          })
          .where(
            tenantScopedWhere(
              chargePayments.tenantId,
              tenantId,
              eq(chargePayments.id, existing.id),
            ),
          )
          .returning();

        if (!updated) {
          throw new Error("Failed to update charge payment");
        }

        return updated;
      }

      const [created] = await db
        .insert(chargePayments)
        .values({
          id: createId(),
          tenantId,
          chargeId: input.chargeId,
          provider: input.provider,
          providerCustomerId: input.providerCustomerId,
          providerPaymentId: input.providerPaymentId,
          externalReference: input.externalReference,
          status: input.status,
          pixCopyPasteCode: input.pixCopyPasteCode ?? null,
          qrCodeBase64: input.qrCodeBase64 ?? null,
          expiresAt: input.expiresAt ?? null,
          lastSyncedAt: input.lastSyncedAt ?? null,
          rawChargePayload: input.rawChargePayload ?? null,
          rawQrCodePayload: input.rawQrCodePayload ?? null,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create charge payment");
      }

      return created;
    },

    async getChargePaymentByChargeId(
      rawInput: Parameters<typeof getChargePaymentByChargeIdInputSchema.parse>[0],
    ) {
      const input = getChargePaymentByChargeIdInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      const [chargePayment] = await db
        .select()
        .from(chargePayments)
        .where(
          tenantScopedWhere(
            chargePayments.tenantId,
            tenantId,
            eq(chargePayments.chargeId, input.chargeId),
          ),
        )
        .limit(1);

      return chargePayment ?? null;
    },

    async getChargePaymentByProviderPaymentId(
      rawInput: Parameters<typeof getChargePaymentByProviderPaymentIdInputSchema.parse>[0],
    ) {
      const input = getChargePaymentByProviderPaymentIdInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      const [chargePayment] = await db
        .select()
        .from(chargePayments)
        .where(
          tenantScopedWhere(
            chargePayments.tenantId,
            tenantId,
            eq(chargePayments.provider, input.provider),
            eq(chargePayments.providerPaymentId, input.providerPaymentId),
          ),
        )
        .limit(1);

      return chargePayment ?? null;
    },

    async findChargePaymentByProviderPaymentId(rawInput: {
      provider: "asaas";
      providerPaymentId: string;
    }) {
      const [chargePayment] = await db
        .select()
        .from(chargePayments)
        .where(
          and(
            eq(chargePayments.provider, rawInput.provider),
            eq(chargePayments.providerPaymentId, rawInput.providerPaymentId),
          ),
        )
        .limit(1);

      return chargePayment ?? null;
    },

    async findChargeById(rawInput: { chargeId: string }) {
      const [charge] = await db
        .select()
        .from(charges)
        .where(eq(charges.id, rawInput.chargeId))
        .limit(1);

      return charge ?? null;
    },

    async ingestPaymentProviderEvent(
      rawInput: Parameters<typeof ingestPaymentProviderEventInputSchema.parse>[0],
    ) {
      const input = ingestPaymentProviderEventInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      const [existing] = await db
        .select()
        .from(paymentProviderEvents)
        .where(
          tenantScopedWhere(
            paymentProviderEvents.tenantId,
            tenantId,
            eq(paymentProviderEvents.provider, input.provider),
            eq(paymentProviderEvents.providerEventId, input.providerEventId),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          event: existing,
          inserted: false,
        };
      }

      const [inserted] = await db
        .insert(paymentProviderEvents)
        .values({
          id: createId(),
          tenantId,
          provider: input.provider,
          providerEventId: input.providerEventId,
          eventType: input.eventType,
          providerPaymentId: input.providerPaymentId ?? null,
          externalReference: input.externalReference ?? null,
          rawPayload: input.rawPayload,
          processingStatus: "pending",
        })
        .returning();

      if (!inserted) {
        throw new Error("Failed to create payment provider event");
      }

      return {
        event: inserted,
        inserted: true,
      };
    },

    async listPendingPaymentProviderEvents(
      rawInput: Parameters<typeof listPendingPaymentProviderEventsInputSchema.parse>[0],
    ) {
      const input = listPendingPaymentProviderEventsInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      return db
        .select()
        .from(paymentProviderEvents)
        .where(
          tenantScopedWhere(
            paymentProviderEvents.tenantId,
            tenantId,
            eq(paymentProviderEvents.processingStatus, "pending"),
            input.provider
              ? eq(paymentProviderEvents.provider, input.provider)
              : undefined,
          ),
        )
        .orderBy(asc(paymentProviderEvents.createdAt))
        .limit(input.limit ?? 100);
    },

    async getPaymentProviderEvent(rawInput: {
      tenantId: string;
      providerEventId: string;
    }) {
      const tenantId = requireTenantId(rawInput.tenantId);

      const [event] = await db
        .select()
        .from(paymentProviderEvents)
        .where(
          tenantScopedWhere(
            paymentProviderEvents.tenantId,
            tenantId,
            eq(paymentProviderEvents.providerEventId, rawInput.providerEventId),
          ),
        )
        .limit(1);

      return event ?? null;
    },

    async listPaymentProviderEvents(rawInput: {
      tenantId: string;
      provider?: "asaas";
      limit?: number;
    }) {
      const tenantId = requireTenantId(rawInput.tenantId);

      return db
        .select()
        .from(paymentProviderEvents)
        .where(
          tenantScopedWhere(
            paymentProviderEvents.tenantId,
            tenantId,
            rawInput.provider
              ? eq(paymentProviderEvents.provider, rawInput.provider)
              : undefined,
          ),
        )
        .orderBy(desc(paymentProviderEvents.createdAt))
        .limit(rawInput.limit ?? 20);
    },

    async markPaymentProviderEventProcessed(
      rawInput: Parameters<typeof markPaymentProviderEventProcessedInputSchema.parse>[0],
    ) {
      const input = markPaymentProviderEventProcessedInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      const [event] = await db
        .update(paymentProviderEvents)
        .set({
          processingStatus: "processed",
          processingSummary: input.processingSummary,
          processedAt: input.processedAt,
          updatedAt: new Date(),
        })
        .where(
          tenantScopedWhere(
            paymentProviderEvents.tenantId,
            tenantId,
            eq(paymentProviderEvents.providerEventId, input.providerEventId),
          ),
        )
        .returning();

      return event ?? null;
    },

    async markPaymentProviderEventFailed(
      rawInput: Parameters<typeof markPaymentProviderEventFailedInputSchema.parse>[0],
    ) {
      const input = markPaymentProviderEventFailedInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      const [event] = await db
        .update(paymentProviderEvents)
        .set({
          processingStatus: "failed",
          processingSummary: input.processingSummary,
          processedAt: input.processedAt,
          updatedAt: new Date(),
        })
        .where(
          tenantScopedWhere(
            paymentProviderEvents.tenantId,
            tenantId,
            eq(paymentProviderEvents.providerEventId, input.providerEventId),
          ),
        )
        .returning();

      return event ?? null;
    },

    async recordPaymentReconciliationRun(
      rawInput: Parameters<typeof recordPaymentReconciliationRunInputSchema.parse>[0],
    ) {
      const input = recordPaymentReconciliationRunInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      return db.transaction(async (tx) => {
        const [run] = await tx
          .insert(paymentReconciliationRuns)
          .values({
            id: createId(),
            tenantId,
            provider: input.provider,
            trigger: input.trigger,
            matchedCount: input.matchedCount,
            updatedCount: input.updatedCount,
            divergenceCount: input.divergenceCount,
            failedCount: input.failedCount,
            startedAt: input.startedAt,
            finishedAt: input.finishedAt,
          })
          .returning();

        if (!run) {
          throw new Error("Failed to create payment reconciliation run");
        }

        const items = input.items.length
          ? await tx
              .insert(paymentReconciliationItems)
              .values(
                input.items.map((item) => ({
                  id: createId(),
                  tenantId,
                  runId: run.id,
                  chargeId: item.chargeId,
                  providerPaymentId: item.providerPaymentId,
                  outcome: item.outcome,
                  internalStatus: item.internalStatus,
                  providerStatus: item.providerStatus,
                  summary: item.summary,
                })),
              )
              .returning()
          : [];

        return {
          run,
          items,
        };
      });
    },

    async listPaymentReconciliationRuns(
      rawInput: Parameters<typeof listPaymentReconciliationRunsInputSchema.parse>[0],
    ) {
      const input = listPaymentReconciliationRunsInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId ?? "");

      return db
        .select()
        .from(paymentReconciliationRuns)
        .where(
          tenantScopedWhere(
            paymentReconciliationRuns.tenantId,
            tenantId,
            input.provider
              ? eq(paymentReconciliationRuns.provider, input.provider)
              : undefined,
          ),
        )
        .orderBy(desc(paymentReconciliationRuns.startedAt));
    },

    async listChargePayments(rawInput: {
      tenantId: string;
      provider?: "asaas";
    }) {
      const tenantId = requireTenantId(rawInput.tenantId);

      return db
        .select()
        .from(chargePayments)
        .where(
          tenantScopedWhere(
            chargePayments.tenantId,
            tenantId,
            rawInput.provider ? eq(chargePayments.provider, rawInput.provider) : undefined,
          ),
        )
        .orderBy(desc(chargePayments.updatedAt), desc(chargePayments.createdAt));
    },
  };
}

export type PaymentsRepository = ReturnType<typeof createPaymentsRepository>;
