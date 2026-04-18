import { z } from "zod";

export const PAYMENT_PROVIDERS = ["asaas"] as const;
export const PAYMENTS_QUEUE_NAME = "payments" as const;
export const PROCESS_PROVIDER_EVENT_JOB = "process-provider-event" as const;
export const CHARGE_PAYMENT_STATUSES = [
  "pending",
  "awaiting_payment",
  "received",
  "overdue",
  "refunded",
  "canceled",
  "failed",
] as const;
export const PAYMENT_PROVIDER_EVENT_PROCESSING_STATUSES = [
  "pending",
  "processed",
  "failed",
] as const;
export const PAYMENT_RECONCILIATION_TRIGGERS = ["manual", "scheduled"] as const;
export const PAYMENT_RECONCILIATION_OUTCOMES = [
  "matched",
  "updated",
  "diverged",
  "failed",
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type ChargePaymentStatus = (typeof CHARGE_PAYMENT_STATUSES)[number];
export type PaymentProviderEventProcessingStatus =
  (typeof PAYMENT_PROVIDER_EVENT_PROCESSING_STATUSES)[number];
export type PaymentReconciliationTrigger =
  (typeof PAYMENT_RECONCILIATION_TRIGGERS)[number];
export type PaymentReconciliationOutcome =
  (typeof PAYMENT_RECONCILIATION_OUTCOMES)[number];

const trimmedText = z.string().trim().min(1);
const optionalTrimmedText = z.string().trim().min(1);
const jsonRecordSchema = z.record(z.string(), z.unknown());

export const paymentProviderSchema = z.enum(PAYMENT_PROVIDERS);
export const chargePaymentStatusSchema = z.enum(CHARGE_PAYMENT_STATUSES);
export const paymentProviderEventProcessingStatusSchema = z.enum(
  PAYMENT_PROVIDER_EVENT_PROCESSING_STATUSES,
);
export const paymentReconciliationTriggerSchema = z.enum(
  PAYMENT_RECONCILIATION_TRIGGERS,
);
export const paymentReconciliationOutcomeSchema = z.enum(
  PAYMENT_RECONCILIATION_OUTCOMES,
);

export const linkPaymentProviderCustomerInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1),
  provider: paymentProviderSchema,
  providerCustomerId: trimmedText.max(120),
  customerNameSnapshot: trimmedText.max(160),
  whatsappPhoneSnapshot: trimmedText.max(40),
});

export const getPaymentProviderCustomerInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1),
  provider: paymentProviderSchema,
});

export const upsertChargePaymentInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  chargeId: z.string().trim().min(1),
  provider: paymentProviderSchema,
  providerCustomerId: trimmedText.max(120),
  providerPaymentId: trimmedText.max(120),
  externalReference: trimmedText.max(120),
  status: chargePaymentStatusSchema,
  pixCopyPasteCode: optionalTrimmedText.max(4_096).nullable().optional(),
  qrCodeBase64: optionalTrimmedText.max(50_000).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  lastSyncedAt: z.coerce.date().nullable().optional(),
  rawChargePayload: jsonRecordSchema.nullable().optional(),
  rawQrCodePayload: jsonRecordSchema.nullable().optional(),
});

export const getChargePaymentByChargeIdInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  chargeId: z.string().trim().min(1),
});

export const getChargePaymentByProviderPaymentIdInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  provider: paymentProviderSchema,
  providerPaymentId: z.string().trim().min(1),
});

export const ingestPaymentProviderEventInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  provider: paymentProviderSchema,
  providerEventId: trimmedText.max(120),
  eventType: trimmedText.max(120),
  providerPaymentId: optionalTrimmedText.max(120).nullable().optional(),
  externalReference: optionalTrimmedText.max(120).nullable().optional(),
  rawPayload: jsonRecordSchema,
});

export const listPendingPaymentProviderEventsInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  provider: paymentProviderSchema.optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export const markPaymentProviderEventProcessedInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  providerEventId: z.string().trim().min(1),
  processingSummary: trimmedText.max(1_000),
  processedAt: z.coerce.date(),
});

export const markPaymentProviderEventFailedInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  providerEventId: z.string().trim().min(1),
  processingSummary: trimmedText.max(1_000),
  processedAt: z.coerce.date(),
});

export const recordPaymentReconciliationRunInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  provider: paymentProviderSchema,
  trigger: paymentReconciliationTriggerSchema,
  matchedCount: z.number().int().min(0),
  updatedCount: z.number().int().min(0),
  divergenceCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date(),
  items: z.array(
    z.object({
      chargeId: z.string().trim().min(1),
      providerPaymentId: trimmedText.max(120),
      outcome: paymentReconciliationOutcomeSchema,
      internalStatus: trimmedText.max(60),
      providerStatus: trimmedText.max(60),
      summary: trimmedText.max(1_000),
    }),
  ),
});

export const listPaymentReconciliationRunsInputSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  provider: paymentProviderSchema.optional(),
});

export type LinkPaymentProviderCustomerInput = z.infer<
  typeof linkPaymentProviderCustomerInputSchema
>;
export type GetPaymentProviderCustomerInput = z.infer<
  typeof getPaymentProviderCustomerInputSchema
>;
export type UpsertChargePaymentInput = z.infer<
  typeof upsertChargePaymentInputSchema
>;
export type GetChargePaymentByChargeIdInput = z.infer<
  typeof getChargePaymentByChargeIdInputSchema
>;
export type GetChargePaymentByProviderPaymentIdInput = z.infer<
  typeof getChargePaymentByProviderPaymentIdInputSchema
>;
export type IngestPaymentProviderEventInput = z.infer<
  typeof ingestPaymentProviderEventInputSchema
>;
export type ListPendingPaymentProviderEventsInput = z.infer<
  typeof listPendingPaymentProviderEventsInputSchema
>;
export type MarkPaymentProviderEventProcessedInput = z.infer<
  typeof markPaymentProviderEventProcessedInputSchema
>;
export type MarkPaymentProviderEventFailedInput = z.infer<
  typeof markPaymentProviderEventFailedInputSchema
>;
export type RecordPaymentReconciliationRunInput = z.infer<
  typeof recordPaymentReconciliationRunInputSchema
>;
export type ListPaymentReconciliationRunsInput = z.infer<
  typeof listPaymentReconciliationRunsInputSchema
>;
