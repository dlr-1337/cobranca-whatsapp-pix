CREATE TABLE IF NOT EXISTS "charges" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "customer_id" text NOT NULL REFERENCES "customers"("id"),
  "plan_id" text REFERENCES "billing_plans"("id") ON DELETE SET NULL,
  "subscription_id" text REFERENCES "subscriptions"("id") ON DELETE SET NULL,
  "origin" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "amount_cents" integer NOT NULL,
  "due_date" timestamptz NOT NULL,
  "competence_key" text,
  "description" text,
  "notes" text,
  "replaces_charge_id" text,
  "replaced_by_charge_id" text,
  "paid_at" timestamptz,
  "paid_amount_cents" integer,
  "canceled_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "charges_origin_check" CHECK ("origin" IN ('manual', 'recurring')),
  CONSTRAINT "charges_status_check" CHECK ("status" IN ('open', 'paid', 'canceled', 'replaced', 'expired'))
);
--> statement-breakpoint
ALTER TABLE "charges"
  ADD CONSTRAINT "charges_replaces_charge_id_fk"
  FOREIGN KEY ("replaces_charge_id") REFERENCES "charges"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "charges"
  ADD CONSTRAINT "charges_replaced_by_charge_id_fk"
  FOREIGN KEY ("replaced_by_charge_id") REFERENCES "charges"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "charges_tenant_status_idx" ON "charges" USING btree ("tenant_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "charges_tenant_due_idx" ON "charges" USING btree ("tenant_id", "due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "charges_tenant_customer_idx" ON "charges" USING btree ("tenant_id", "customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "charges_tenant_origin_idx" ON "charges" USING btree ("tenant_id", "origin");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "charges_tenant_subscription_competence_uidx"
  ON "charges" USING btree ("tenant_id", "subscription_id", "competence_key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "charge_events" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "charge_id" text NOT NULL REFERENCES "charges"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "from_status" text,
  "to_status" text NOT NULL,
  "reason" text,
  "occurred_at" timestamptz NOT NULL,
  "actor_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "actor_email" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "charge_events_type_check" CHECK ("event_type" IN ('created', 'paid', 'canceled', 'replaced')),
  CONSTRAINT "charge_events_from_status_check" CHECK (
    "from_status" IS NULL OR "from_status" IN ('open', 'paid', 'canceled', 'replaced', 'expired')
  ),
  CONSTRAINT "charge_events_to_status_check" CHECK (
    "to_status" IN ('open', 'paid', 'canceled', 'replaced', 'expired')
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "charge_events_tenant_charge_idx"
  ON "charge_events" USING btree ("tenant_id", "charge_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "charge_events_tenant_occurred_idx"
  ON "charge_events" USING btree ("tenant_id", "occurred_at");
