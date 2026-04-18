import { z } from "zod";

export const AUDIT_EVENT_TYPES = [
  "auth.signup_requested",
  "auth.email_confirmed",
  "auth.login_succeeded",
  "auth.login_failed",
  "auth.logout",
  "auth.password_reset_requested",
  "auth.password_reset_completed",
  "tenant.settings_updated",
] as const;

export const AUDIT_PERIOD_OPTIONS = ["7d", "30d", "90d"] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];
export type AuditPeriod = (typeof AUDIT_PERIOD_OPTIONS)[number];

export const auditFiltersSchema = z.object({
  period: z.enum(AUDIT_PERIOD_OPTIONS).default("7d"),
  actor: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional(),
  type: z.enum(AUDIT_EVENT_TYPES).optional(),
});

export type AuditFiltersInput = z.infer<typeof auditFiltersSchema>;
