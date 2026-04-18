import { z } from "zod";
export const DEFAULT_TENANT_TIMEZONE = "America/Sao_Paulo";
export const AUTH_COOKIE_NAME = "czp_session";
export const AUTH_EMAIL_TOKEN_KINDS = [
    "email-confirmation",
    "password-reset",
];
export const MEMBERSHIP_ROLES = ["owner"];
export const SESSION_REVOCATION_REASONS = [
    "logout",
    "password-change",
    "password-reset",
    "admin-revoke",
];
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
export const signupOwnerTenantSchema = z.object({
    businessName: z.string().trim().min(2).max(120),
    primaryEmail: emailSchema,
    whatsappPhone: z.string().trim().min(8).max(20),
    timezone: z.string().trim().min(2).default(DEFAULT_TENANT_TIMEZONE),
    defaultDueDay: z.number().int().min(1).max(31),
    ownerEmail: emailSchema,
    ownerPasswordHash: z.string().min(10),
});
export const loginInputSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});
export const forgotPasswordInputSchema = z.object({
    email: emailSchema,
});
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
export const confirmEmailInputSchema = z.object({
    token: z.string().min(16),
});
export const tenantSettingsInputSchema = z.object({
    businessName: z.string().trim().min(2).max(120),
    primaryEmail: emailSchema,
    whatsappPhone: z.string().trim().min(8).max(20),
    timezone: z.string().trim().min(2),
    defaultDueDay: z.number().int().min(1).max(31),
});
export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
export function slugifyTenantName(value) {
    return value
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
