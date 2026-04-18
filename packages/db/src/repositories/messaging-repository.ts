import {
  cancelScheduledMessageDispatchesInputSchema,
  createMessageDispatchInputSchema,
  getChargeMessagingContextInputSchema,
  getMessageDispatchByIdInputSchema,
  listMessageDispatchesInputSchema,
  markMessageDispatchOpenedInputSchema,
  ensureScheduledMessageDispatchInputSchema,
} from "@cobrazap/domain";
import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  chargePayments,
  charges,
  customers,
  messageDispatches,
  tenantSettings,
} from "../schema/index.js";
import * as schema from "../schema/index.js";
import { requireTenantId, tenantScopedWhere } from "./tenant-scope.js";

type MessagingDatabase = NodePgDatabase<typeof schema>;

function createId() {
  return crypto.randomUUID();
}

export function createMessagingRepository(db: MessagingDatabase) {
  return {
    async getChargeMessagingContext(
      rawInput: Parameters<typeof getChargeMessagingContextInputSchema.parse>[0],
    ) {
      const input = getChargeMessagingContextInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId);

      const [record] = await db
        .select({
          chargeId: charges.id,
          chargeStatus: charges.status,
          amountCents: charges.amountCents,
          dueDate: charges.dueDate,
          customerName: customers.name,
          customerWhatsappPhoneDisplay: customers.whatsappPhoneDisplay,
          customerWhatsappPhoneNormalized: customers.whatsappPhoneNormalized,
          businessName: tenantSettings.businessName,
          timezone: tenantSettings.timezone,
          pixCopyPasteCode: chargePayments.pixCopyPasteCode,
          paymentStatus: chargePayments.status,
          whatsappTemplateChargeInitial:
            tenantSettings.whatsappTemplateChargeInitial,
          whatsappTemplateReminder: tenantSettings.whatsappTemplateReminder,
          whatsappTemplatePaymentConfirmation:
            tenantSettings.whatsappTemplatePaymentConfirmation,
          reminderWindowStartHour: tenantSettings.reminderWindowStartHour,
          reminderWindowEndHour: tenantSettings.reminderWindowEndHour,
        })
        .from(charges)
        .innerJoin(
          customers,
          and(
            eq(customers.id, charges.customerId),
            eq(customers.tenantId, charges.tenantId),
          ),
        )
        .innerJoin(tenantSettings, eq(tenantSettings.tenantId, charges.tenantId))
        .leftJoin(
          chargePayments,
          and(
            eq(chargePayments.chargeId, charges.id),
            eq(chargePayments.tenantId, charges.tenantId),
          ),
        )
        .where(
          tenantScopedWhere(charges.tenantId, tenantId, eq(charges.id, input.chargeId)),
        )
        .limit(1);

      return record ?? null;
    },

    async createMessageDispatch(
      rawInput: Parameters<typeof createMessageDispatchInputSchema.parse>[0],
    ) {
      const input = createMessageDispatchInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId);

      const [dispatch] = await db
        .insert(messageDispatches)
        .values({
          id: createId(),
          tenantId,
          chargeId: input.chargeId,
          templateKind: input.templateKind,
          trigger: input.trigger,
          reminderSlot: input.reminderSlot ?? null,
          dispatchKey: input.dispatchKey,
          status: input.status,
          renderedMessage: input.renderedMessage,
          templateSnapshot: input.templateSnapshot,
          recipientWhatsappPhone: input.recipientWhatsappPhone,
          transportUrl: input.transportUrl ?? null,
          scheduledFor: input.scheduledFor ?? null,
          openedAt: input.openedAt ?? null,
        })
        .returning();

      if (!dispatch) {
        throw new Error("Failed to create message dispatch");
      }

      return dispatch;
    },

    async ensureScheduledMessageDispatch(
      rawInput: Parameters<typeof ensureScheduledMessageDispatchInputSchema.parse>[0],
    ) {
      const input = ensureScheduledMessageDispatchInputSchema.parse({
        ...(rawInput as Record<string, unknown>),
        trigger: "scheduled",
        status: "scheduled",
      });
      const tenantId = requireTenantId(input.tenantId);
      const [existing] = await db
        .select()
        .from(messageDispatches)
        .where(
          tenantScopedWhere(
            messageDispatches.tenantId,
            tenantId,
            eq(messageDispatches.dispatchKey, input.dispatchKey),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          dispatch: existing,
          inserted: false,
        };
      }

      const dispatch = await this.createMessageDispatch({
        ...input,
        tenantId,
      });

      return {
        dispatch,
        inserted: true,
      };
    },

    async getMessageDispatchById(
      rawInput: Parameters<typeof getMessageDispatchByIdInputSchema.parse>[0],
    ) {
      const input = getMessageDispatchByIdInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId);

      const [dispatch] = await db
        .select()
        .from(messageDispatches)
        .where(
          tenantScopedWhere(
            messageDispatches.tenantId,
            tenantId,
            eq(messageDispatches.id, input.dispatchId),
          ),
        )
        .limit(1);

      return dispatch ?? null;
    },

    async listMessageDispatches(
      rawInput: Parameters<typeof listMessageDispatchesInputSchema.parse>[0],
    ) {
      const input = listMessageDispatchesInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId);

      return db
        .select()
        .from(messageDispatches)
        .where(
          tenantScopedWhere(
            messageDispatches.tenantId,
            tenantId,
            input.chargeId ? eq(messageDispatches.chargeId, input.chargeId) : undefined,
          ),
        )
        .orderBy(desc(messageDispatches.createdAt))
        .limit(input.limit ?? 100);
    },

    async markMessageDispatchOpened(
      rawInput: Parameters<typeof markMessageDispatchOpenedInputSchema.parse>[0],
    ) {
      const input = markMessageDispatchOpenedInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId);

      const [dispatch] = await db
        .update(messageDispatches)
        .set({
          status: "opened",
          transportUrl: input.transportUrl,
          openedAt: input.openedAt,
          updatedAt: new Date(),
        })
        .where(
          tenantScopedWhere(
            messageDispatches.tenantId,
            tenantId,
            eq(messageDispatches.id, input.dispatchId),
          ),
        )
        .returning();

      return dispatch ?? null;
    },

    async cancelScheduledMessageDispatches(
      rawInput: Parameters<typeof cancelScheduledMessageDispatchesInputSchema.parse>[0],
    ) {
      const input = cancelScheduledMessageDispatchesInputSchema.parse(rawInput);
      const tenantId = requireTenantId(input.tenantId);

      return db
        .update(messageDispatches)
        .set({
          status: "canceled",
          canceledAt: input.canceledAt,
          cancelReason: input.cancelReason,
          updatedAt: new Date(),
        })
        .where(
          tenantScopedWhere(
            messageDispatches.tenantId,
            tenantId,
            eq(messageDispatches.chargeId, input.chargeId),
            eq(messageDispatches.status, "scheduled"),
          ),
        )
        .returning();
    },
  };
}

export type MessagingRepository = ReturnType<typeof createMessagingRepository>;
