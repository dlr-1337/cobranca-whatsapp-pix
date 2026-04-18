import type { AuditEventType } from "@cobrazap/domain";
import { desc, eq, gte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { auditEvents } from "../schema/index.js";
import * as schema from "../schema/index.js";
import { ilikeIfPresent, tenantScopedWhere } from "./tenant-scope.js";

export interface AppendAuditEventInput {
  tenantId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  eventType: AuditEventType;
  summary: string;
  occurredAt?: Date;
}

export interface ListAuditEventsInput {
  tenantId: string;
  from: Date;
  actor?: string;
  type?: AuditEventType;
}

export type AuditDatabase = NodePgDatabase<typeof schema>;

function createId() {
  return crypto.randomUUID();
}

export function createAuditRepository(db: AuditDatabase) {
  return {
    async appendAuditEvent(input: AppendAuditEventInput) {
      const [event] = await db
        .insert(auditEvents)
        .values({
          id: createId(),
          tenantId: input.tenantId,
          actorUserId: input.actorUserId ?? null,
          actorEmail: input.actorEmail ?? null,
          eventType: input.eventType,
          summary: input.summary,
          occurredAt: input.occurredAt ?? new Date(),
        })
        .returning();

      return event;
    },

    async listAuditEvents(input: ListAuditEventsInput) {
      return db
        .select()
        .from(auditEvents)
        .where(
          tenantScopedWhere(
            auditEvents.tenantId,
            input.tenantId,
            gte(auditEvents.occurredAt, input.from),
            input.type ? eq(auditEvents.eventType, input.type) : undefined,
            ilikeIfPresent(auditEvents.actorEmail, input.actor),
          ),
        )
        .orderBy(desc(auditEvents.occurredAt));
    },
  };
}
