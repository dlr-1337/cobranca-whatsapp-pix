import {
  CHARGE_EVENT_TYPES,
  CHARGE_ORIGINS,
  CHARGE_STATUSES,
} from "@cobrazap/domain";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { tenants, users } from "./auth.js";
import { billingPlans, customers, subscriptions } from "./wallet.js";

export const charges = pgTable(
  "charges",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    planId: text("plan_id").references(() => billingPlans.id, {
      onDelete: "set null",
    }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    origin: text("origin", {
      enum: CHARGE_ORIGINS,
    }).notNull(),
    status: text("status", {
      enum: CHARGE_STATUSES,
    })
      .notNull()
      .default("open"),
    amountCents: integer("amount_cents").notNull(),
    dueDate: timestamp("due_date", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    competenceKey: text("competence_key"),
    description: text("description"),
    notes: text("notes"),
    replacesChargeId: text("replaces_charge_id"),
    replacedByChargeId: text("replaced_by_charge_id"),
    paidAt: timestamp("paid_at", {
      mode: "date",
      withTimezone: true,
    }),
    paidAmountCents: integer("paid_amount_cents"),
    canceledAt: timestamp("canceled_at", {
      mode: "date",
      withTimezone: true,
    }),
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
    index("charges_tenant_status_idx").on(table.tenantId, table.status),
    index("charges_tenant_due_idx").on(table.tenantId, table.dueDate),
    index("charges_tenant_customer_idx").on(table.tenantId, table.customerId),
    index("charges_tenant_origin_idx").on(table.tenantId, table.origin),
    uniqueIndex("charges_tenant_subscription_competence_uidx").on(
      table.tenantId,
      table.subscriptionId,
      table.competenceKey,
    ),
  ],
);

export const chargeEvents = pgTable(
  "charge_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    chargeId: text("charge_id")
      .notNull()
      .references(() => charges.id, { onDelete: "cascade" }),
    eventType: text("event_type", {
      enum: CHARGE_EVENT_TYPES,
    }).notNull(),
    fromStatus: text("from_status", {
      enum: CHARGE_STATUSES,
    }),
    toStatus: text("to_status", {
      enum: CHARGE_STATUSES,
    }).notNull(),
    reason: text("reason"),
    occurredAt: timestamp("occurred_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorEmail: text("actor_email"),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("charge_events_tenant_charge_idx").on(table.tenantId, table.chargeId),
    index("charge_events_tenant_occurred_idx").on(table.tenantId, table.occurredAt),
  ],
);
