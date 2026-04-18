import {
  BILLING_INTERVALS,
  BILLING_PLAN_STATUSES,
  CUSTOMER_CHANNELS,
  CUSTOMER_CONSENT_STATUSES,
  CUSTOMER_STATUSES,
  REMINDER_PROFILES,
  SUBSCRIPTION_EVENT_TYPES,
  SUBSCRIPTION_STATUSES,
} from "@cobrazap/domain";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { tenants, users } from "./auth.js";

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    whatsappPhoneDisplay: text("whatsapp_phone_display").notNull(),
    whatsappPhoneNormalized: text("whatsapp_phone_normalized").notNull(),
    notes: text("notes"),
    status: text("status", {
      enum: CUSTOMER_STATUSES,
    })
      .notNull()
      .default("active"),
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
    index("customers_tenant_status_idx").on(table.tenantId, table.status),
    index("customers_tenant_phone_idx").on(
      table.tenantId,
      table.whatsappPhoneNormalized,
    ),
    index("customers_tenant_created_idx").on(table.tenantId, table.createdAt),
  ],
);

export const customerChannelConsentEvents = pgTable(
  "customer_channel_consent_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    channel: text("channel", {
      enum: CUSTOMER_CHANNELS,
    }).notNull(),
    status: text("status", {
      enum: CUSTOMER_CONSENT_STATUSES,
    }).notNull(),
    evidence: text("evidence").notNull(),
    effectiveAt: timestamp("effective_at", {
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
    index("customer_consent_tenant_customer_idx").on(table.tenantId, table.customerId),
    index("customer_consent_tenant_channel_effective_idx").on(
      table.tenantId,
      table.channel,
      table.effectiveAt,
    ),
  ],
);

export const billingPlans = pgTable(
  "billing_plans",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    billingInterval: text("billing_interval", {
      enum: BILLING_INTERVALS,
    }).notNull(),
    defaultDueDay: integer("default_due_day").notNull(),
    messageTemplate: text("message_template"),
    reminderProfile: text("reminder_profile", {
      enum: REMINDER_PROFILES,
    })
      .notNull()
      .default("manual"),
    status: text("status", {
      enum: BILLING_PLAN_STATUSES,
    })
      .notNull()
      .default("draft"),
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
    index("billing_plans_tenant_status_idx").on(table.tenantId, table.status),
    index("billing_plans_tenant_created_idx").on(table.tenantId, table.createdAt),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    planId: text("plan_id")
      .notNull()
      .references(() => billingPlans.id),
    status: text("status", {
      enum: SUBSCRIPTION_STATUSES,
    })
      .notNull()
      .default("active"),
    startDate: timestamp("start_date", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    nextCycleStart: timestamp("next_cycle_start", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    anchorDueDay: integer("anchor_due_day").notNull(),
    overrideAmountCents: integer("override_amount_cents"),
    overrideDueDay: integer("override_due_day"),
    lastTransitionReason: text("last_transition_reason"),
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
    index("subscriptions_tenant_status_idx").on(table.tenantId, table.status),
    index("subscriptions_tenant_customer_idx").on(table.tenantId, table.customerId),
    index("subscriptions_tenant_plan_idx").on(table.tenantId, table.planId),
  ],
);

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    eventType: text("event_type", {
      enum: SUBSCRIPTION_EVENT_TYPES,
    }).notNull(),
    fromStatus: text("from_status", {
      enum: SUBSCRIPTION_STATUSES,
    }),
    toStatus: text("to_status", {
      enum: SUBSCRIPTION_STATUSES,
    }).notNull(),
    reason: text("reason"),
    effectiveAt: timestamp("effective_at", {
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
    index("subscription_events_tenant_subscription_idx").on(
      table.tenantId,
      table.subscriptionId,
    ),
    index("subscription_events_tenant_effective_idx").on(
      table.tenantId,
      table.effectiveAt,
    ),
  ],
);
