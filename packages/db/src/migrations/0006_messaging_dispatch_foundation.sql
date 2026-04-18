ALTER TABLE "tenant_settings"
  ADD COLUMN IF NOT EXISTS "whatsapp_template_charge_initial" text NOT NULL DEFAULT 'Oi {{customer_name}}, aqui e {{business_name}}. Sua cobranca {{charge_id}} de {{amount_brl}} vence em {{due_date}}. Pix copia e cola: {{pix_code}}';
--> statement-breakpoint
ALTER TABLE "tenant_settings"
  ADD COLUMN IF NOT EXISTS "whatsapp_template_reminder" text NOT NULL DEFAULT 'Lembrete {{reminder_slot}}: a cobranca {{charge_id}} de {{amount_brl}} segue em aberto. Pix: {{pix_code}}';
--> statement-breakpoint
ALTER TABLE "tenant_settings"
  ADD COLUMN IF NOT EXISTS "whatsapp_template_payment_confirmation" text NOT NULL DEFAULT 'Pagamento da cobranca {{charge_id}} confirmado com sucesso. Obrigado, {{customer_name}}.';
--> statement-breakpoint
ALTER TABLE "tenant_settings"
  ADD COLUMN IF NOT EXISTS "reminder_window_start_hour" integer NOT NULL DEFAULT 9;
--> statement-breakpoint
ALTER TABLE "tenant_settings"
  ADD COLUMN IF NOT EXISTS "reminder_window_end_hour" integer NOT NULL DEFAULT 18;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_dispatches" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "charge_id" text NOT NULL REFERENCES "charges"("id") ON DELETE CASCADE,
  "template_kind" text NOT NULL,
  "trigger" text NOT NULL,
  "reminder_slot" text,
  "dispatch_key" text NOT NULL,
  "status" text NOT NULL,
  "rendered_message" text NOT NULL,
  "template_snapshot" text NOT NULL,
  "recipient_whatsapp_phone" text NOT NULL,
  "transport_url" text,
  "scheduled_for" timestamptz,
  "opened_at" timestamptz,
  "canceled_at" timestamptz,
  "cancel_reason" text,
  "failure_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "message_dispatches_template_kind_check" CHECK (
    "template_kind" IN ('charge_initial', 'charge_reminder', 'payment_confirmation')
  ),
  CONSTRAINT "message_dispatches_trigger_check" CHECK (
    "trigger" IN ('manual', 'scheduled')
  ),
  CONSTRAINT "message_dispatches_reminder_slot_check" CHECK (
    "reminder_slot" IS NULL OR "reminder_slot" IN ('d-1', 'd0', 'd+1')
  ),
  CONSTRAINT "message_dispatches_status_check" CHECK (
    "status" IN ('scheduled', 'opened', 'canceled', 'failed')
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_dispatches_tenant_charge_idx"
  ON "message_dispatches" USING btree ("tenant_id", "charge_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_dispatches_tenant_status_idx"
  ON "message_dispatches" USING btree ("tenant_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_dispatches_tenant_scheduled_idx"
  ON "message_dispatches" USING btree ("tenant_id", "status", "scheduled_for");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "message_dispatches_tenant_dispatch_key_uidx"
  ON "message_dispatches" USING btree ("tenant_id", "dispatch_key");
