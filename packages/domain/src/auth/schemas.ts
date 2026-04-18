import { z } from "zod";

export const DEFAULT_TENANT_TIMEZONE = "America/Sao_Paulo";
export const DEFAULT_WHATSAPP_TEMPLATE_CHARGE_INITIAL =
  "Oi {{customer_name}}, aqui e {{business_name}}. Sua cobranca {{charge_id}} de {{amount_brl}} vence em {{due_date}}. Pix copia e cola: {{pix_code}}";
export const DEFAULT_WHATSAPP_TEMPLATE_REMINDER =
  "Lembrete {{reminder_slot}}: a cobranca {{charge_id}} de {{amount_brl}} segue em aberto. Pix: {{pix_code}}";
export const DEFAULT_WHATSAPP_TEMPLATE_PAYMENT_CONFIRMATION =
  "Pagamento da cobranca {{charge_id}} confirmado com sucesso. Obrigado, {{customer_name}}.";
export const DEFAULT_REMINDER_WINDOW_START_HOUR = 9;
export const DEFAULT_REMINDER_WINDOW_END_HOUR = 18;
export const AUTH_COOKIE_NAME = "czp_session";
export const AUTH_EMAIL_TOKEN_KINDS = [
  "email-confirmation",
  "password-reset",
] as const;
export const MEMBERSHIP_ROLES = ["owner"] as const;
export const SESSION_REVOCATION_REASONS = [
  "logout",
  "password-change",
  "password-reset",
  "admin-revoke",
] as const;

export type AuthEmailTokenKind = (typeof AUTH_EMAIL_TOKEN_KINDS)[number];
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];
export type SessionRevocationReason =
  (typeof SESSION_REVOCATION_REASONS)[number];

export type TenantId = string;
export type UserId = string;
export type MembershipId = string;
export type SessionId = string;

export interface TenantScopedRecord {
  tenantId: TenantId;
}

const emailSchema = z.email().transform((value) => value.trim().toLowerCase());
const passwordSchema = z.string().min(8).max(128);

export const signupRequestSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  primaryEmail: emailSchema,
  ownerEmail: emailSchema,
  password: passwordSchema,
  whatsappPhone: z.string().trim().min(8).max(20),
  timezone: z.string().trim().min(2).default(DEFAULT_TENANT_TIMEZONE),
  defaultDueDay: z.number().int().min(1).max(31),
});

export type SignupRequestInput = z.infer<typeof signupRequestSchema>;

export const signupOwnerTenantSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  primaryEmail: emailSchema,
  whatsappPhone: z.string().trim().min(8).max(20),
  timezone: z.string().trim().min(2).default(DEFAULT_TENANT_TIMEZONE),
  defaultDueDay: z.number().int().min(1).max(31),
  ownerEmail: emailSchema,
  ownerPasswordHash: z.string().min(10),
});

export type SignupOwnerTenantInput = z.infer<typeof signupOwnerTenantSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z
  .object({
    token: z.string().min(16),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const confirmEmailInputSchema = z.object({
  token: z.string().min(16),
});

export type ConfirmEmailInput = z.infer<typeof confirmEmailInputSchema>;

export const tenantSettingsInputSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  primaryEmail: emailSchema,
  whatsappPhone: z.string().trim().min(8).max(20),
  timezone: z.string().trim().min(2),
  defaultDueDay: z.number().int().min(1).max(31),
  whatsappTemplateChargeInitial: z
    .string()
    .trim()
    .min(10)
    .max(2_000)
    .default(DEFAULT_WHATSAPP_TEMPLATE_CHARGE_INITIAL),
  whatsappTemplateReminder: z
    .string()
    .trim()
    .min(10)
    .max(2_000)
    .default(DEFAULT_WHATSAPP_TEMPLATE_REMINDER),
  whatsappTemplatePaymentConfirmation: z
    .string()
    .trim()
    .min(10)
    .max(2_000)
    .default(DEFAULT_WHATSAPP_TEMPLATE_PAYMENT_CONFIRMATION),
  reminderWindowStartHour: z
    .number()
    .int()
    .min(0)
    .max(23)
    .default(DEFAULT_REMINDER_WINDOW_START_HOUR),
  reminderWindowEndHour: z
    .number()
    .int()
    .min(0)
    .max(23)
    .default(DEFAULT_REMINDER_WINDOW_END_HOUR),
}).refine((value) => value.reminderWindowStartHour < value.reminderWindowEndHour, {
  message: "A janela comercial precisa terminar depois do inicio.",
  path: ["reminderWindowEndHour"],
});

export type TenantSettingsInput = z.infer<typeof tenantSettingsInputSchema>;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function slugifyTenantName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
