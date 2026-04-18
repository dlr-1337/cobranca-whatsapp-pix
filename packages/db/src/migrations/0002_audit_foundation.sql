CREATE TABLE "audit_events" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "actor_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "actor_email" text,
  "event_type" text NOT NULL,
  "summary" text NOT NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "audit_events_tenant_occurred_idx" ON "audit_events" ("tenant_id", "occurred_at");
--> statement-breakpoint
CREATE INDEX "audit_events_tenant_type_idx" ON "audit_events" ("tenant_id", "event_type");
