import {
  MESSAGE_DISPATCH_STATUSES,
  MESSAGE_DISPATCH_TRIGGERS,
  MESSAGE_TEMPLATE_KINDS,
  REMINDER_SLOTS,
} from "@cobrazap/domain";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { tenants } from "./auth.js";
import { charges } from "./charges.js";

export const messageDispatches = pgTable(
  "message_dispatches",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    chargeId: text("charge_id")
      .notNull()
      .references(() => charges.id, { onDelete: "cascade" }),
    templateKind: text("template_kind", {
      enum: MESSAGE_TEMPLATE_KINDS,
    }).notNull(),
    trigger: text("trigger", {
      enum: MESSAGE_DISPATCH_TRIGGERS,
    }).notNull(),
    reminderSlot: text("reminder_slot", {
      enum: REMINDER_SLOTS,
    }),
    dispatchKey: text("dispatch_key").notNull(),
    status: text("status", {
      enum: MESSAGE_DISPATCH_STATUSES,
    }).notNull(),
    renderedMessage: text("rendered_message").notNull(),
    templateSnapshot: text("template_snapshot").notNull(),
    recipientWhatsappPhone: text("recipient_whatsapp_phone").notNull(),
    transportUrl: text("transport_url"),
    scheduledFor: timestamp("scheduled_for", {
      mode: "date",
      withTimezone: true,
    }),
    openedAt: timestamp("opened_at", {
      mode: "date",
      withTimezone: true,
    }),
    canceledAt: timestamp("canceled_at", {
      mode: "date",
      withTimezone: true,
    }),
    cancelReason: text("cancel_reason"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("message_dispatches_tenant_charge_idx").on(table.tenantId, table.chargeId),
    index("message_dispatches_tenant_status_idx").on(table.tenantId, table.status),
    index("message_dispatches_tenant_scheduled_idx").on(
      table.tenantId,
      table.status,
      table.scheduledFor,
    ),
    uniqueIndex("message_dispatches_tenant_dispatch_key_uidx").on(
      table.tenantId,
      table.dispatchKey,
    ),
  ],
);
