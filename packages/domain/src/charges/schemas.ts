import { z } from "zod";

import { BILLING_INTERVALS, type BillingInterval } from "../wallet/schemas.js";

export const CHARGE_ORIGINS = ["manual", "recurring"] as const;
export const CHARGE_STATUSES = [
  "open",
  "paid",
  "canceled",
  "replaced",
  "expired",
] as const;
export const CHARGE_EVENT_TYPES = [
  "created",
  "paid",
  "canceled",
  "replaced",
] as const;
export const CHARGE_ACTIONS = ["mark-paid", "cancel", "replace"] as const;

export type ChargeOrigin = (typeof CHARGE_ORIGINS)[number];
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];
export type ChargeEventType = (typeof CHARGE_EVENT_TYPES)[number];
export type ChargeAction = (typeof CHARGE_ACTIONS)[number];

const trimmedText = z.string().trim().min(1);
const optionalTrimmedText = z.string().trim().min(1);

export const chargeOriginSchema = z.enum(CHARGE_ORIGINS);
export const chargeStatusSchema = z.enum(CHARGE_STATUSES);
export const chargeEventTypeSchema = z.enum(CHARGE_EVENT_TYPES);
export const chargeActionSchema = z.enum(CHARGE_ACTIONS);

export const createManualChargeInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1),
  planId: z.string().trim().min(1).nullable().optional(),
  amountCents: z.number().int().positive(),
  dueDate: z.coerce.date(),
  description: optionalTrimmedText.max(240).nullable().optional(),
  notes: optionalTrimmedText.max(1_000).nullable().optional(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorEmail: z.email().trim().toLowerCase().nullable().optional(),
});

export const chargeFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1).optional(),
  subscriptionId: z.string().trim().min(1).optional(),
  planId: z.string().trim().min(1).optional(),
  origin: chargeOriginSchema.optional(),
  status: chargeStatusSchema.optional(),
});

export const chargeEventFiltersSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  chargeId: z.string().trim().min(1).optional(),
});

export const generateRecurringChargesInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  referenceDate: z.coerce.date(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorEmail: z.email().trim().toLowerCase().nullable().optional(),
});

export const cancelChargeInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  chargeId: z.string().trim().min(1).optional(),
  occurredAt: z.coerce.date(),
  reason: trimmedText.max(300),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorEmail: z.email().trim().toLowerCase().nullable().optional(),
});

export const markChargePaidInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  chargeId: z.string().trim().min(1).optional(),
  occurredAt: z.coerce.date(),
  paidAmountCents: z.number().int().positive().nullable().optional(),
  reason: optionalTrimmedText.max(300).nullable().optional(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorEmail: z.email().trim().toLowerCase().nullable().optional(),
});

export const replaceChargeInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  chargeId: z.string().trim().min(1).optional(),
  occurredAt: z.coerce.date(),
  reason: trimmedText.max(300),
  dueDate: z.coerce.date().optional(),
  amountCents: z.number().int().positive().optional(),
  description: optionalTrimmedText.max(240).nullable().optional(),
  notes: optionalTrimmedText.max(1_000).nullable().optional(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
  actorEmail: z.email().trim().toLowerCase().nullable().optional(),
});

export const transitionChargeInputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("mark-paid"),
    occurredAt: z.coerce.date(),
    paidAmountCents: z.number().int().positive().nullable().optional(),
    reason: optionalTrimmedText.max(300).nullable().optional(),
  }),
  z.object({
    action: z.literal("cancel"),
    occurredAt: z.coerce.date(),
    reason: trimmedText.max(300),
  }),
  z.object({
    action: z.literal("replace"),
    occurredAt: z.coerce.date(),
    reason: trimmedText.max(300),
    dueDate: z.coerce.date().optional(),
    amountCents: z.number().int().positive().optional(),
    description: optionalTrimmedText.max(240).nullable().optional(),
    notes: optionalTrimmedText.max(1_000).nullable().optional(),
  }),
]);

export type CreateManualChargeInput = z.infer<typeof createManualChargeInputSchema>;
export type ChargeFiltersInput = z.infer<typeof chargeFiltersSchema>;
export type ChargeEventFiltersInput = z.infer<typeof chargeEventFiltersSchema>;
export type GenerateRecurringChargesInput = z.infer<
  typeof generateRecurringChargesInputSchema
>;
export type CancelChargeInput = z.infer<typeof cancelChargeInputSchema>;
export type MarkChargePaidInput = z.infer<typeof markChargePaidInputSchema>;
export type ReplaceChargeInput = z.infer<typeof replaceChargeInputSchema>;
export type TransitionChargeInput = z.infer<typeof transitionChargeInputSchema>;

function toUtcDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function clampDayOfMonth(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

function startOfIsoWeek(date: Date) {
  const normalized = toUtcDate(date);
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() - day + 1);
  return normalized;
}

function isoWeekParts(date: Date) {
  const weekStart = startOfIsoWeek(date);
  const thursday = new Date(weekStart);
  thursday.setUTCDate(weekStart.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstWeekStart = startOfIsoWeek(firstThursday);
  const diffDays =
    (weekStart.getTime() - firstWeekStart.getTime()) / (24 * 60 * 60 * 1_000);
  const week = Math.floor(diffDays / 7) + 1;

  return {
    isoYear,
    isoWeek: week,
  };
}

export function formatRecurringCompetenceKey(
  cycleStart: Date,
  interval: BillingInterval,
) {
  const normalized = toUtcDate(cycleStart);
  const year = normalized.getUTCFullYear();

  switch (interval) {
    case "weekly": {
      const { isoYear, isoWeek } = isoWeekParts(normalized);
      return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
    }
    case "monthly":
      return `${year}-${String(normalized.getUTCMonth() + 1).padStart(2, "0")}`;
    case "quarterly":
      return `${year}-Q${Math.floor(normalized.getUTCMonth() / 3) + 1}`;
    case "yearly":
      return String(year);
  }
}

export function deriveRecurringDueDate(input: {
  cycleStart: Date;
  interval: BillingInterval;
  dueDay: number;
}) {
  const normalized = toUtcDate(input.cycleStart);

  if (input.interval === "weekly") {
    return normalized;
  }

  const year = normalized.getUTCFullYear();
  const monthIndex = normalized.getUTCMonth();
  const day = clampDayOfMonth(year, monthIndex, input.dueDay);

  return new Date(Date.UTC(year, monthIndex, day));
}

export function advanceRecurringCycle(
  cycleStart: Date,
  interval: BillingInterval,
) {
  const next = new Date(cycleStart);

  switch (interval) {
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    case "monthly":
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    case "quarterly":
      next.setUTCMonth(next.getUTCMonth() + 3);
      return next;
    case "yearly":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      return next;
  }
}

export function isOpenChargeOverdue(charge: {
  status: ChargeStatus;
  dueDate: Date;
}, referenceDate = new Date()) {
  if (charge.status !== "open") {
    return false;
  }

  return toUtcDate(charge.dueDate).getTime() < toUtcDate(referenceDate).getTime();
}
