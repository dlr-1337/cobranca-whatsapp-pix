import { z } from "zod";

export const CUSTOMER_STATUSES = [
  "active",
  "inactive",
  "delinquent",
  "canceled",
  "blocked",
] as const;
export const CUSTOMER_CHANNELS = ["whatsapp", "email"] as const;
export const CUSTOMER_CONSENT_STATUSES = ["opted-in", "opted-out"] as const;
export const BILLING_PLAN_STATUSES = ["draft", "active", "archived"] as const;
export const BILLING_INTERVALS = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;
export const REMINDER_PROFILES = ["manual", "standard"] as const;
export const SUBSCRIPTION_STATUSES = ["active", "paused", "canceled"] as const;
export const SUBSCRIPTION_ACTIONS = ["pause", "reactivate", "cancel"] as const;
export const SUBSCRIPTION_EVENT_TYPES = [
  "created",
  "paused",
  "reactivated",
  "canceled",
] as const;

export const CONSENT_CHANNELS = CUSTOMER_CHANNELS;
export const CONSENT_STATUSES = CUSTOMER_CONSENT_STATUSES;
export const PLAN_INTERVALS = BILLING_INTERVALS;
export const PLAN_STATUSES = BILLING_PLAN_STATUSES;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export type CustomerChannel = (typeof CUSTOMER_CHANNELS)[number];
export type CustomerConsentStatus = (typeof CUSTOMER_CONSENT_STATUSES)[number];
export type BillingPlanStatus = (typeof BILLING_PLAN_STATUSES)[number];
export type BillingInterval = (typeof BILLING_INTERVALS)[number];
export type ReminderProfile = (typeof REMINDER_PROFILES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type SubscriptionAction = (typeof SUBSCRIPTION_ACTIONS)[number];
export type SubscriptionEventType = (typeof SUBSCRIPTION_EVENT_TYPES)[number];

export type ConsentChannel = CustomerChannel;
export type ConsentStatus = CustomerConsentStatus;
export type PlanInterval = BillingInterval;
export type PlanStatus = BillingPlanStatus;

export function phoneDigitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeBrazilianWhatsappPhone(value: string) {
  const digits = phoneDigitsOnly(value);

  if (!digits) {
    throw new Error("Invalid WhatsApp phone");
  }

  if (digits.startsWith("55")) {
    if (digits.length === 12 || digits.length === 13) {
      return digits;
    }

    throw new Error("Invalid WhatsApp phone");
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  throw new Error("Invalid WhatsApp phone");
}

export const normalizeWhatsappPhone = normalizeBrazilianWhatsappPhone;

const trimmedText = z.string().trim().min(1);
const optionalTrimmedText = z.string().trim().min(1);

export const customerStatusSchema = z.enum(CUSTOMER_STATUSES);
export const customerChannelSchema = z.enum(CUSTOMER_CHANNELS);
export const customerConsentStatusSchema = z.enum(CUSTOMER_CONSENT_STATUSES);
export const billingPlanStatusSchema = z.enum(BILLING_PLAN_STATUSES);
export const billingIntervalSchema = z.enum(BILLING_INTERVALS);
export const reminderProfileSchema = z.enum(REMINDER_PROFILES);
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export const subscriptionActionSchema = z.enum(SUBSCRIPTION_ACTIONS);
export const subscriptionEventTypeSchema = z.enum(SUBSCRIPTION_EVENT_TYPES);

export const createCustomerInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).max(120),
  whatsappPhone: z.string().trim().min(8).max(32),
  notes: optionalTrimmedText.max(1_000).nullable().optional(),
  status: customerStatusSchema.default("active"),
  allowDuplicatePhone: z.boolean().default(false),
});

export const updateCustomerInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  whatsappPhone: z.string().trim().min(8).max(32).optional(),
  notes: optionalTrimmedText.max(1_000).nullable().optional(),
  status: customerStatusSchema.optional(),
  allowDuplicatePhone: z.boolean().default(false),
});

export const customerFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  search: trimmedText.max(120).optional(),
  status: customerStatusSchema.optional(),
});

export const customerListFiltersSchema = customerFiltersSchema.pick({
  search: true,
});

export const appendCustomerConsentEventInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1).optional(),
  channel: customerChannelSchema,
  status: customerConsentStatusSchema,
  evidence: z.string().trim().min(3).max(500),
  effectiveAt: z.coerce.date(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorEmail: z.email().trim().toLowerCase().nullable().optional(),
});

export const appendConsentEventInputSchema = appendCustomerConsentEventInputSchema.pick({
  channel: true,
  status: true,
  evidence: true,
  effectiveAt: true,
});

export const customerConsentFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1).optional(),
  channel: customerChannelSchema.optional(),
});

export const createBillingPlanInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).max(120),
  amountCents: z.number().int().positive(),
  billingInterval: billingIntervalSchema.optional(),
  interval: billingIntervalSchema.optional(),
  defaultDueDay: z.number().int().min(1).max(31),
  messageTemplate: optionalTrimmedText.max(1_000).nullable().optional(),
  reminderProfile: reminderProfileSchema,
  status: billingPlanStatusSchema.default("draft"),
});

export const updateBillingPlanInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  planId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  amountCents: z.number().int().positive().optional(),
  billingInterval: billingIntervalSchema.optional(),
  interval: billingIntervalSchema.optional(),
  defaultDueDay: z.number().int().min(1).max(31).optional(),
  messageTemplate: optionalTrimmedText.max(1_000).nullable().optional(),
  reminderProfile: reminderProfileSchema.optional(),
  status: billingPlanStatusSchema.optional(),
});

export const billingPlanFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  search: trimmedText.max(120).optional(),
  status: billingPlanStatusSchema.optional(),
});

export const createSubscriptionInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1),
  planId: z.string().trim().min(1),
  startDate: z.coerce.date(),
  nextCycleStart: z.coerce.date().optional(),
  anchorDueDay: z.number().int().min(1).max(31).optional(),
  overrideAmountCents: z.number().int().positive().nullable().optional(),
  overrideDueDay: z.number().int().min(1).max(31).nullable().optional(),
  transitionReason: z.string().trim().min(3).max(300).nullable().optional(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorEmail: z.email().trim().toLowerCase().nullable().optional(),
});

export const updateSubscriptionInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  subscriptionId: z.string().trim().min(1).optional(),
  nextCycleStart: z.coerce.date().optional(),
  anchorDueDay: z.number().int().min(1).max(31).optional(),
  overrideAmountCents: z.number().int().positive().nullable().optional(),
  overrideDueDay: z.number().int().min(1).max(31).nullable().optional(),
});

export const subscriptionFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1).optional(),
  planId: z.string().trim().min(1).optional(),
  status: subscriptionStatusSchema.optional(),
});

export const subscriptionLifecycleCommandSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  subscriptionId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(3).max(300),
  effectiveAt: z.coerce.date(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorEmail: z.email().trim().toLowerCase().nullable().optional(),
});

export const transitionSubscriptionInputSchema = z.object({
  action: subscriptionActionSchema,
  occurredAt: z.coerce.date().optional(),
  reason: z.string().trim().min(3).max(300).optional(),
});

export const subscriptionEventFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  subscriptionId: z.string().trim().min(1).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;
export type CustomerFiltersInput = z.infer<typeof customerFiltersSchema>;
export type CustomerListFiltersInput = z.infer<typeof customerListFiltersSchema>;
export type AppendCustomerConsentEventInput = z.infer<
  typeof appendCustomerConsentEventInputSchema
>;
export type AppendConsentEventInput = z.infer<typeof appendConsentEventInputSchema>;
export type CustomerConsentFiltersInput = z.infer<
  typeof customerConsentFiltersSchema
>;
export type CreateBillingPlanInput = z.infer<typeof createBillingPlanInputSchema>;
export type UpdateBillingPlanInput = z.infer<typeof updateBillingPlanInputSchema>;
export type BillingPlanFiltersInput = z.infer<typeof billingPlanFiltersSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionInputSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionInputSchema>;
export type SubscriptionFiltersInput = z.infer<typeof subscriptionFiltersSchema>;
export type SubscriptionLifecycleCommandInput = z.infer<
  typeof subscriptionLifecycleCommandSchema
>;
export type TransitionSubscriptionInput = z.infer<
  typeof transitionSubscriptionInputSchema
>;
export type SubscriptionEventFiltersInput = z.infer<
  typeof subscriptionEventFiltersSchema
>;

export interface CustomerConsentSnapshot<T> {
  whatsapp: T | null;
  email: T | null;
}

export function emptyCustomerConsentSnapshot<T>(): CustomerConsentSnapshot<T> {
  return {
    whatsapp: null,
    email: null,
  };
}

export function deriveLatestCustomerConsentByChannel<T extends { channel: CustomerChannel }>(
  events: T[],
): CustomerConsentSnapshot<T> {
  const latest = emptyCustomerConsentSnapshot<T>();

  for (const event of events) {
    if (!latest[event.channel]) {
      latest[event.channel] = event;
    }
  }

  return latest;
}
