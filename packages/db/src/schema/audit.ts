import { AUDIT_EVENT_TYPES, type AuditEventType } from "@cobrazap/domain";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { tenants, users } from "./auth.js";

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorEmail: text("actor_email"),
    eventType: text("event_type", {
      enum: AUDIT_EVENT_TYPES satisfies readonly [AuditEventType, ...AuditEventType[]],
    }).notNull(),
    summary: text("summary").notNull(),
    occurredAt: timestamp("occurred_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_events_tenant_occurred_idx").on(table.tenantId, table.occurredAt),
    index("audit_events_tenant_type_idx").on(table.tenantId, table.eventType),
  ],
);
