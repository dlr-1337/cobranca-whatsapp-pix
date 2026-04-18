CREATE TABLE IF NOT EXISTS "tenants" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending-email-confirmation',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tenants_status_check" CHECK ("status" IN ('pending-email-confirmation', 'active'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_unique_idx" ON "tenants" USING btree ("slug");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "email_verified" boolean NOT NULL DEFAULT false,
  "email_verified_at" timestamp with time zone,
  "password_changed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_unique_idx" ON "users" USING btree (lower("email"));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memberships" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "role" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "memberships_role_check" CHECK ("role" IN ('owner'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_tenant_user_unique_idx" ON "memberships" USING btree ("tenant_id", "user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "tenant_id" text PRIMARY KEY NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "business_name" text NOT NULL,
  "primary_email" text NOT NULL,
  "whatsapp_phone" text NOT NULL,
  "timezone" text NOT NULL,
  "default_due_day" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_settings_default_due_day_check" CHECK ("default_due_day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "membership_id" text NOT NULL REFERENCES "memberships"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
  "idle_timeout_minutes" integer NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoked_reason" text,
  "user_agent" text,
  "ip_address" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "auth_sessions_revoked_reason_check" CHECK ("revoked_reason" IS NULL OR "revoked_reason" IN ('logout', 'password-change', 'password-reset', 'admin-revoke'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_token_hash_unique_idx" ON "auth_sessions" USING btree ("token_hash");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_email_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "auth_email_tokens_kind_check" CHECK ("kind" IN ('email-confirmation', 'password-reset'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_email_tokens_token_hash_unique_idx" ON "auth_email_tokens" USING btree ("token_hash");
