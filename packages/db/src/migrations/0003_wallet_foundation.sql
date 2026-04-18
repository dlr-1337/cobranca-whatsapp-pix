CREATE TABLE "customers" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "whatsapp_phone_display" text NOT NULL,
  "whatsapp_phone_normalized" text NOT NULL,
  "notes" text,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "customers_tenant_status_idx" ON "customers" ("tenant_id", "status");
--> statement-breakpoint
CREATE INDEX "customers_tenant_phone_idx" ON "customers" ("tenant_id", "whatsapp_phone_normalized");
--> statement-breakpoint
CREATE INDEX "customers_tenant_created_idx" ON "customers" ("tenant_id", "created_at");
--> statement-breakpoint
CREATE TABLE "customer_channel_consent_events" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "customer_id" text NOT NULL REFERENCES "customers"("id") ON DELETE cascade,
  "channel" text NOT NULL,
  "status" text NOT NULL,
  "evidence" text NOT NULL,
  "effective_at" timestamptz NOT NULL,
  "actor_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "actor_email" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "customer_consent_tenant_customer_idx" ON "customer_channel_consent_events" ("tenant_id", "customer_id");
--> statement-breakpoint
CREATE INDEX "customer_consent_tenant_channel_effective_idx" ON "customer_channel_consent_events" ("tenant_id", "channel", "effective_at");
--> statement-breakpoint
CREATE TABLE "billing_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "billing_interval" text NOT NULL,
  "default_due_day" integer NOT NULL,
  "message_template" text,
  "reminder_profile" text NOT NULL DEFAULT 'manual',
  "status" text NOT NULL DEFAULT 'draft',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "billing_plans_tenant_status_idx" ON "billing_plans" ("tenant_id", "status");
--> statement-breakpoint
CREATE INDEX "billing_plans_tenant_created_idx" ON "billing_plans" ("tenant_id", "created_at");
--> statement-breakpoint
CREATE TABLE "subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "customer_id" text NOT NULL REFERENCES "customers"("id"),
  "plan_id" text NOT NULL REFERENCES "billing_plans"("id"),
  "status" text NOT NULL DEFAULT 'active',
  "start_date" timestamptz NOT NULL,
  "next_cycle_start" timestamptz NOT NULL,
  "anchor_due_day" integer NOT NULL,
  "override_amount_cents" integer,
  "override_due_day" integer,
  "last_transition_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_status_idx" ON "subscriptions" ("tenant_id", "status");
--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_customer_idx" ON "subscriptions" ("tenant_id", "customer_id");
--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_plan_idx" ON "subscriptions" ("tenant_id", "plan_id");
--> statement-breakpoint
CREATE TABLE "subscription_events" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "subscription_id" text NOT NULL REFERENCES "subscriptions"("id") ON DELETE cascade,
  "event_type" text NOT NULL,
  "from_status" text,
  "to_status" text NOT NULL,
  "reason" text,
  "effective_at" timestamptz NOT NULL,
  "actor_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "actor_email" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "subscription_events_tenant_subscription_idx" ON "subscription_events" ("tenant_id", "subscription_id");
--> statement-breakpoint
CREATE INDEX "subscription_events_tenant_effective_idx" ON "subscription_events" ("tenant_id", "effective_at");
