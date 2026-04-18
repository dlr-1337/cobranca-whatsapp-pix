CREATE TABLE IF NOT EXISTS "payment_provider_customers" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "customer_id" text NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "provider_customer_id" text NOT NULL,
  "customer_name_snapshot" text NOT NULL,
  "whatsapp_phone_snapshot" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_provider_customers_provider_check" CHECK ("provider" IN ('asaas'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_provider_customers_tenant_customer_idx"
  ON "payment_provider_customers" USING btree ("tenant_id", "customer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_provider_customers_tenant_customer_provider_uidx"
  ON "payment_provider_customers" USING btree ("tenant_id", "customer_id", "provider");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_provider_customers_tenant_provider_customer_uidx"
  ON "payment_provider_customers" USING btree ("tenant_id", "provider", "provider_customer_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "charge_payments" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "charge_id" text NOT NULL REFERENCES "charges"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "provider_customer_id" text NOT NULL,
  "provider_payment_id" text NOT NULL,
  "external_reference" text NOT NULL,
  "status" text NOT NULL,
  "pix_copy_paste_code" text,
  "qr_code_base64" text,
  "expires_at" timestamptz,
  "last_synced_at" timestamptz,
  "raw_charge_payload" jsonb,
  "raw_qr_code_payload" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "charge_payments_provider_check" CHECK ("provider" IN ('asaas')),
  CONSTRAINT "charge_payments_status_check" CHECK (
    "status" IN ('pending', 'awaiting_payment', 'received', 'overdue', 'refunded', 'canceled', 'failed')
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "charge_payments_tenant_status_idx"
  ON "charge_payments" USING btree ("tenant_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "charge_payments_tenant_reference_idx"
  ON "charge_payments" USING btree ("tenant_id", "external_reference");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "charge_payments_tenant_charge_uidx"
  ON "charge_payments" USING btree ("tenant_id", "charge_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "charge_payments_tenant_provider_payment_uidx"
  ON "charge_payments" USING btree ("tenant_id", "provider", "provider_payment_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_provider_events" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "provider_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "provider_payment_id" text,
  "external_reference" text,
  "raw_payload" jsonb NOT NULL,
  "processing_status" text NOT NULL DEFAULT 'pending',
  "processing_summary" text,
  "processed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_provider_events_provider_check" CHECK ("provider" IN ('asaas')),
  CONSTRAINT "payment_provider_events_processing_status_check" CHECK (
    "processing_status" IN ('pending', 'processed', 'failed')
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_provider_events_tenant_processing_idx"
  ON "payment_provider_events" USING btree ("tenant_id", "processing_status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_provider_events_tenant_provider_payment_idx"
  ON "payment_provider_events" USING btree ("tenant_id", "provider", "provider_payment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_provider_events_tenant_provider_event_uidx"
  ON "payment_provider_events" USING btree ("tenant_id", "provider", "provider_event_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_reconciliation_runs" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "trigger" text NOT NULL,
  "matched_count" integer NOT NULL DEFAULT 0,
  "updated_count" integer NOT NULL DEFAULT 0,
  "divergence_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "started_at" timestamptz NOT NULL,
  "finished_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_reconciliation_runs_provider_check" CHECK ("provider" IN ('asaas')),
  CONSTRAINT "payment_reconciliation_runs_trigger_check" CHECK ("trigger" IN ('manual', 'scheduled'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_reconciliation_runs_tenant_provider_started_idx"
  ON "payment_reconciliation_runs" USING btree ("tenant_id", "provider", "started_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_reconciliation_items" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "run_id" text NOT NULL REFERENCES "payment_reconciliation_runs"("id") ON DELETE CASCADE,
  "charge_id" text NOT NULL REFERENCES "charges"("id") ON DELETE CASCADE,
  "provider_payment_id" text NOT NULL,
  "outcome" text NOT NULL,
  "internal_status" text NOT NULL,
  "provider_status" text NOT NULL,
  "summary" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_reconciliation_items_outcome_check" CHECK (
    "outcome" IN ('matched', 'updated', 'diverged', 'failed')
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_reconciliation_items_tenant_run_idx"
  ON "payment_reconciliation_items" USING btree ("tenant_id", "run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_reconciliation_items_tenant_charge_idx"
  ON "payment_reconciliation_items" USING btree ("tenant_id", "charge_id");
