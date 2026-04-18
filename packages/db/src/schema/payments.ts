import {
  CHARGE_PAYMENT_STATUSES,
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDER_EVENT_PROCESSING_STATUSES,
  PAYMENT_RECONCILIATION_OUTCOMES,
  PAYMENT_RECONCILIATION_TRIGGERS,
} from "@cobrazap/domain";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { tenants } from "./auth.js";
import { charges } from "./charges.js";
import { customers } from "./wallet.js";

export const paymentProviderCustomers = pgTable(
  "payment_provider_customers",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: PAYMENT_PROVIDERS,
    }).notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    customerNameSnapshot: text("customer_name_snapshot").notNull(),
    whatsappPhoneSnapshot: text("whatsapp_phone_snapshot").notNull(),
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
    index("payment_provider_customers_tenant_customer_idx").on(
      table.tenantId,
      table.customerId,
    ),
    uniqueIndex("payment_provider_customers_tenant_customer_provider_uidx").on(
      table.tenantId,
      table.customerId,
      table.provider,
    ),
    uniqueIndex("payment_provider_customers_tenant_provider_customer_uidx").on(
      table.tenantId,
      table.provider,
      table.providerCustomerId,
    ),
  ],
);

export const chargePayments = pgTable(
  "charge_payments",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    chargeId: text("charge_id")
      .notNull()
      .references(() => charges.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: PAYMENT_PROVIDERS,
    }).notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    externalReference: text("external_reference").notNull(),
    status: text("status", {
      enum: CHARGE_PAYMENT_STATUSES,
    }).notNull(),
    pixCopyPasteCode: text("pix_copy_paste_code"),
    qrCodeBase64: text("qr_code_base64"),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true,
    }),
    lastSyncedAt: timestamp("last_synced_at", {
      mode: "date",
      withTimezone: true,
    }),
    rawChargePayload: jsonb("raw_charge_payload").$type<Record<string, unknown> | null>(),
    rawQrCodePayload: jsonb("raw_qr_code_payload").$type<Record<string, unknown> | null>(),
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
    index("charge_payments_tenant_status_idx").on(table.tenantId, table.status),
    index("charge_payments_tenant_reference_idx").on(
      table.tenantId,
      table.externalReference,
    ),
    uniqueIndex("charge_payments_tenant_charge_uidx").on(table.tenantId, table.chargeId),
    uniqueIndex("charge_payments_tenant_provider_payment_uidx").on(
      table.tenantId,
      table.provider,
      table.providerPaymentId,
    ),
  ],
);

export const paymentProviderEvents = pgTable(
  "payment_provider_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: PAYMENT_PROVIDERS,
    }).notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    providerPaymentId: text("provider_payment_id"),
    externalReference: text("external_reference"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    processingStatus: text("processing_status", {
      enum: PAYMENT_PROVIDER_EVENT_PROCESSING_STATUSES,
    })
      .notNull()
      .default("pending"),
    processingSummary: text("processing_summary"),
    processedAt: timestamp("processed_at", {
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
    index("payment_provider_events_tenant_processing_idx").on(
      table.tenantId,
      table.processingStatus,
      table.createdAt,
    ),
    index("payment_provider_events_tenant_provider_payment_idx").on(
      table.tenantId,
      table.provider,
      table.providerPaymentId,
    ),
    uniqueIndex("payment_provider_events_tenant_provider_event_uidx").on(
      table.tenantId,
      table.provider,
      table.providerEventId,
    ),
  ],
);

export const paymentReconciliationRuns = pgTable(
  "payment_reconciliation_runs",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: PAYMENT_PROVIDERS,
    }).notNull(),
    trigger: text("trigger", {
      enum: PAYMENT_RECONCILIATION_TRIGGERS,
    }).notNull(),
    matchedCount: integer("matched_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    divergenceCount: integer("divergence_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    startedAt: timestamp("started_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    finishedAt: timestamp("finished_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_reconciliation_runs_tenant_provider_started_idx").on(
      table.tenantId,
      table.provider,
      table.startedAt,
    ),
  ],
);

export const paymentReconciliationItems = pgTable(
  "payment_reconciliation_items",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => paymentReconciliationRuns.id, { onDelete: "cascade" }),
    chargeId: text("charge_id")
      .notNull()
      .references(() => charges.id, { onDelete: "cascade" }),
    providerPaymentId: text("provider_payment_id").notNull(),
    outcome: text("outcome", {
      enum: PAYMENT_RECONCILIATION_OUTCOMES,
    }).notNull(),
    internalStatus: text("internal_status").notNull(),
    providerStatus: text("provider_status").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_reconciliation_items_tenant_run_idx").on(table.tenantId, table.runId),
    index("payment_reconciliation_items_tenant_charge_idx").on(
      table.tenantId,
      table.chargeId,
    ),
  ],
);
