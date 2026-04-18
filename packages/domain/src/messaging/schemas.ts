import { z } from "zod";

export const MESSAGE_TEMPLATE_KINDS = [
  "charge_initial",
  "charge_reminder",
  "payment_confirmation",
] as const;
export const MESSAGE_DISPATCH_TRIGGERS = ["manual", "scheduled"] as const;
export const REMINDER_SLOTS = ["d-1", "d0", "d+1"] as const;
export const MESSAGE_DISPATCH_STATUSES = [
  "scheduled",
  "opened",
  "canceled",
  "failed",
] as const;
export const MESSAGING_QUEUE_NAME = "messaging";
export const SYNC_CHARGE_REMINDERS_JOB = "sync-charge-reminders";

export type MessageTemplateKind = (typeof MESSAGE_TEMPLATE_KINDS)[number];
export type MessageDispatchTrigger = (typeof MESSAGE_DISPATCH_TRIGGERS)[number];
export type ReminderSlot = (typeof REMINDER_SLOTS)[number];
export type MessageDispatchStatus = (typeof MESSAGE_DISPATCH_STATUSES)[number];

export interface ChargeMessageTemplateContext {
  chargeId: string;
  chargeStatus: string;
  amountCents: number;
  dueDate: Date;
  customerName: string;
  customerWhatsappPhoneNormalized: string;
  pixCopyPasteCode: string | null;
  businessName: string;
  timezone: string;
  paymentStatus:
    | "pending"
    | "awaiting_payment"
    | "received"
    | "overdue"
    | "refunded"
    | "canceled"
    | "failed"
    | null;
  whatsappTemplateChargeInitial: string;
  whatsappTemplateReminder: string;
  whatsappTemplatePaymentConfirmation: string;
  reminderWindowStartHour: number;
  reminderWindowEndHour: number;
}

const trimmedText = z.string().trim().min(1);

export const messageTemplateKindSchema = z.enum(MESSAGE_TEMPLATE_KINDS);
export const messageDispatchTriggerSchema = z.enum(MESSAGE_DISPATCH_TRIGGERS);
export const reminderSlotSchema = z.enum(REMINDER_SLOTS);
export const messageDispatchStatusSchema = z.enum(MESSAGE_DISPATCH_STATUSES);

export const getChargeMessagingContextInputSchema = z.object({
  tenantId: z.string().trim().min(1),
  chargeId: z.string().trim().min(1),
});

export const createMessageDispatchInputSchema = z.object({
  tenantId: z.string().trim().min(1),
  chargeId: z.string().trim().min(1),
  templateKind: messageTemplateKindSchema,
  trigger: messageDispatchTriggerSchema,
  reminderSlot: reminderSlotSchema.nullable().optional(),
  dispatchKey: trimmedText.max(160),
  status: z.enum(["scheduled", "opened"]),
  renderedMessage: trimmedText.max(4_000),
  templateSnapshot: trimmedText.max(2_000),
  recipientWhatsappPhone: trimmedText.max(32),
  transportUrl: z.string().trim().url().nullable().optional(),
  scheduledFor: z.coerce.date().nullable().optional(),
  openedAt: z.coerce.date().nullable().optional(),
});

export const ensureScheduledMessageDispatchInputSchema =
  createMessageDispatchInputSchema.extend({
    templateKind: z.literal("charge_reminder"),
    trigger: z.literal("scheduled"),
    reminderSlot: reminderSlotSchema,
    status: z.literal("scheduled"),
    scheduledFor: z.coerce.date(),
  });

export const listMessageDispatchesInputSchema = z.object({
  tenantId: z.string().trim().min(1),
  chargeId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(200).optional(),
});

export const getMessageDispatchByIdInputSchema = z.object({
  tenantId: z.string().trim().min(1),
  dispatchId: z.string().trim().min(1),
});

export const markMessageDispatchOpenedInputSchema = z.object({
  tenantId: z.string().trim().min(1),
  dispatchId: z.string().trim().min(1),
  transportUrl: z.string().trim().url(),
  openedAt: z.coerce.date(),
});

export const cancelScheduledMessageDispatchesInputSchema = z.object({
  tenantId: z.string().trim().min(1),
  chargeId: z.string().trim().min(1),
  canceledAt: z.coerce.date(),
  cancelReason: trimmedText.max(300),
});

export const previewChargeMessageInputSchema = z.object({
  templateKind: messageTemplateKindSchema,
  reminderSlot: reminderSlotSchema.optional(),
});

export const manualSendChargeMessageInputSchema = previewChargeMessageInputSchema.extend({
  dispatchId: z.string().trim().min(1).optional(),
});

export type GetChargeMessagingContextInput = z.infer<
  typeof getChargeMessagingContextInputSchema
>;
export type CreateMessageDispatchInput = z.infer<
  typeof createMessageDispatchInputSchema
>;
export type EnsureScheduledMessageDispatchInput = z.infer<
  typeof ensureScheduledMessageDispatchInputSchema
>;
export type ListMessageDispatchesInput = z.infer<
  typeof listMessageDispatchesInputSchema
>;
export type GetMessageDispatchByIdInput = z.infer<
  typeof getMessageDispatchByIdInputSchema
>;
export type MarkMessageDispatchOpenedInput = z.infer<
  typeof markMessageDispatchOpenedInputSchema
>;
export type CancelScheduledMessageDispatchesInput = z.infer<
  typeof cancelScheduledMessageDispatchesInputSchema
>;
export type PreviewChargeMessageInput = z.infer<
  typeof previewChargeMessageInputSchema
>;
export type ManualSendChargeMessageInput = z.infer<
  typeof manualSendChargeMessageInputSchema
>;

function isoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatReminderSlotLabel(slot: ReminderSlot) {
  switch (slot) {
    case "d-1":
      return "D-1";
    case "d0":
      return "D0";
    case "d+1":
      return "D+1";
  }
}

export function buildReminderDispatchKey(chargeId: string, slot: ReminderSlot) {
  return `reminder:${chargeId}:${slot}`;
}

export function formatAmountBrl(amountCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}

export function formatDueDateForMessage(date: Date) {
  const [year, month, day] = isoDateOnly(date).split("-");
  return `${day}/${month}/${year}`;
}

export function buildChargeMessageTemplateValues(
  context: ChargeMessageTemplateContext,
  reminderSlot?: ReminderSlot,
) {
  return {
    business_name: context.businessName,
    customer_name: context.customerName,
    charge_id: context.chargeId,
    amount_brl: formatAmountBrl(context.amountCents),
    due_date: formatDueDateForMessage(context.dueDate),
    pix_code: context.pixCopyPasteCode ?? "",
    reminder_slot: reminderSlot ? formatReminderSlotLabel(reminderSlot) : "",
  };
}

export function renderWhatsappTemplate(
  template: string,
  values: Record<string, string>,
) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key: string) => {
    return values[key] ?? "";
  });
}

export function buildWhatsappDeepLink(
  recipientWhatsappPhone: string,
  message: string,
) {
  return `https://wa.me/${recipientWhatsappPhone}?text=${encodeURIComponent(message)}`;
}

export function buildChargeMessagePreview(
  context: ChargeMessageTemplateContext,
  input: PreviewChargeMessageInput,
) {
  const parsed = previewChargeMessageInputSchema.parse(input);

  if (
    parsed.templateKind !== "payment_confirmation" &&
    !context.pixCopyPasteCode?.trim()
  ) {
    throw new Error("Pix ainda nao foi gerado para esta cobranca.");
  }

  if (
    parsed.templateKind === "payment_confirmation" &&
    context.chargeStatus !== "paid" &&
    context.paymentStatus !== "received"
  ) {
    throw new Error("A cobranca ainda nao esta paga para enviar confirmacao.");
  }

  const templateSnapshot =
    parsed.templateKind === "charge_initial"
      ? context.whatsappTemplateChargeInitial
      : parsed.templateKind === "charge_reminder"
        ? context.whatsappTemplateReminder
        : context.whatsappTemplatePaymentConfirmation;
  const renderedMessage = renderWhatsappTemplate(
    templateSnapshot,
    buildChargeMessageTemplateValues(context, parsed.reminderSlot),
  );
  const transportUrl = buildWhatsappDeepLink(
    context.customerWhatsappPhoneNormalized,
    renderedMessage,
  );

  return {
    chargeId: context.chargeId,
    templateKind: parsed.templateKind,
    reminderSlot: parsed.reminderSlot ?? null,
    templateSnapshot,
    renderedMessage,
    recipientWhatsappPhone: context.customerWhatsappPhoneNormalized,
    transportUrl,
  };
}
