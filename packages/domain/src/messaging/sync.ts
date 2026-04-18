import {
  buildChargeMessagePreview,
  buildReminderDispatchKey,
  ensureScheduledMessageDispatchInputSchema,
  type ChargeMessageTemplateContext,
  type ReminderSlot,
} from "./schemas.js";

export interface ChargeReminderDispatchRecord {
  id: string;
  chargeId: string;
  reminderSlot: ReminderSlot | null;
  status: "scheduled" | "opened" | "canceled" | "failed";
}

export interface ChargeReminderSyncRepository {
  getChargeMessagingContext(input: {
    tenantId: string;
    chargeId: string;
  }): Promise<ChargeMessageTemplateContext | null>;
  ensureScheduledMessageDispatch(input: {
    tenantId: string;
    chargeId: string;
    templateKind: "charge_reminder";
    trigger: "scheduled";
    reminderSlot: ReminderSlot;
    dispatchKey: string;
    status: "scheduled";
    renderedMessage: string;
    templateSnapshot: string;
    recipientWhatsappPhone: string;
    scheduledFor: Date;
  }): Promise<{ dispatch: ChargeReminderDispatchRecord; inserted: boolean }>;
  cancelScheduledMessageDispatches(input: {
    tenantId: string;
    chargeId: string;
    canceledAt: Date;
    cancelReason: string;
  }): Promise<ChargeReminderDispatchRecord[]>;
}

export interface SyncChargeReminderDispatchesResult {
  chargeId: string;
  mode: "scheduled" | "canceled";
  scheduledCount: number;
  insertedCount: number;
  canceledCount: number;
}

function dateOnlyParts(date: Date) {
  const parts = date.toISOString().slice(0, 10).split("-");

  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
  };
}

function addDays(parts: { year: number; month: number; day: number }, days: number) {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  next.setUTCDate(next.getUTCDate() + days);
  return dateOnlyParts(next);
}

function timezoneOffsetMinutes(date: Date, timezone: string) {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName")?.value;

  const match = part?.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? "0");
  const minutes = Number(match[3] ?? "0");

  return sign * (hours * 60 + minutes);
}

function localDateTimeToUtc(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  timezone: string;
}) {
  const guess = new Date(
    Date.UTC(input.year, input.month - 1, input.day, input.hour, 0, 0, 0),
  );
  const offsetMinutes = timezoneOffsetMinutes(guess, input.timezone);

  return new Date(guess.getTime() - offsetMinutes * 60_000);
}

function reminderDateForSlot(dueDate: Date, slot: ReminderSlot) {
  const parts = dateOnlyParts(dueDate);

  switch (slot) {
    case "d-1":
      return addDays(parts, -1);
    case "d0":
      return parts;
    case "d+1":
      return addDays(parts, 1);
  }
}

function shouldCancelReminders(context: ChargeMessageTemplateContext) {
  if (context.chargeStatus !== "open") {
    return true;
  }

  return (
    context.paymentStatus === "received" ||
    context.paymentStatus === "refunded" ||
    context.paymentStatus === "canceled" ||
    context.paymentStatus === "failed"
  );
}

export async function syncChargeReminderDispatches(
  repository: ChargeReminderSyncRepository,
  input: {
    tenantId: string;
    chargeId: string;
    now?: Date;
  },
): Promise<SyncChargeReminderDispatchesResult> {
  const context = await repository.getChargeMessagingContext({
    tenantId: input.tenantId,
    chargeId: input.chargeId,
  });

  if (!context) {
    throw new Error("Charge messaging context not found");
  }

  if (shouldCancelReminders(context) || !context.pixCopyPasteCode?.trim()) {
    const canceled = await repository.cancelScheduledMessageDispatches({
      tenantId: input.tenantId,
      chargeId: input.chargeId,
      canceledAt: input.now ?? new Date(),
      cancelReason:
        shouldCancelReminders(context)
          ? "Charge no longer requires reminders"
          : "Charge is missing Pix payload",
    });

    return {
      chargeId: input.chargeId,
      mode: "canceled",
      scheduledCount: 0,
      insertedCount: 0,
      canceledCount: canceled.length,
    };
  }

  let insertedCount = 0;

  for (const slot of ["d-1", "d0", "d+1"] as const) {
    const preview = buildChargeMessagePreview(context, {
      templateKind: "charge_reminder",
      reminderSlot: slot,
    });
    const localDate = reminderDateForSlot(context.dueDate, slot);
    const scheduledFor = localDateTimeToUtc({
      year: localDate.year,
      month: localDate.month,
      day: localDate.day,
      hour: context.reminderWindowStartHour,
      timezone: context.timezone,
    });
    const result = await repository.ensureScheduledMessageDispatch(
      ensureScheduledMessageDispatchInputSchema.parse({
        tenantId: input.tenantId,
        chargeId: input.chargeId,
        templateKind: "charge_reminder",
        trigger: "scheduled",
        reminderSlot: slot,
        dispatchKey: buildReminderDispatchKey(input.chargeId, slot),
        status: "scheduled",
        renderedMessage: preview.renderedMessage,
        templateSnapshot: preview.templateSnapshot,
        recipientWhatsappPhone: preview.recipientWhatsappPhone,
        scheduledFor,
      }),
    );

    if (result.inserted) {
      insertedCount += 1;
    }
  }

  return {
    chargeId: input.chargeId,
    mode: "scheduled",
    scheduledCount: 3,
    insertedCount,
    canceledCount: 0,
  };
}
