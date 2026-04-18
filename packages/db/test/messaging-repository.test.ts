import { describe, expect, it } from "vitest";

import { createTestAuthDatabase } from "../src/testing/test-auth-database.js";

interface MessageDispatchRecord {
  id: string;
  tenantId: string;
  chargeId: string;
  templateKind: "charge_initial" | "charge_reminder" | "payment_confirmation";
  trigger: "manual" | "scheduled";
  reminderSlot: "d-1" | "d0" | "d+1" | null;
  dispatchKey: string;
  status: "scheduled" | "opened" | "canceled" | "failed";
  renderedMessage: string;
  templateSnapshot: string;
  recipientWhatsappPhone: string;
  transportUrl: string | null;
  scheduledFor: Date | null;
  openedAt: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
}

interface MessagingContextRecord {
  chargeId: string;
  chargeStatus: string;
  customerName: string;
  customerWhatsappPhoneDisplay: string;
  customerWhatsappPhoneNormalized: string;
  pixCopyPasteCode: string | null;
  businessName: string;
  timezone: string;
  whatsappTemplateChargeInitial: string;
  whatsappTemplateReminder: string;
  whatsappTemplatePaymentConfirmation: string;
}

interface MessagingRepository {
  createCustomer(input: {
    tenantId: string;
    name: string;
    whatsappPhone: string;
    status?: string;
  }): Promise<{ id: string }>;
  createManualCharge(input: {
    tenantId: string;
    customerId: string;
    amountCents: number;
    dueDate: Date;
    description?: string | null;
  }): Promise<{ id: string }>;
  updateTenantSettings(
    tenantId: string,
    input: {
      businessName: string;
      primaryEmail: string;
      whatsappPhone: string;
      timezone: string;
      defaultDueDay: number;
      whatsappTemplateChargeInitial: string;
      whatsappTemplateReminder: string;
      whatsappTemplatePaymentConfirmation: string;
      reminderWindowStartHour: number;
      reminderWindowEndHour: number;
    },
  ): Promise<unknown>;
  upsertChargePayment(input: {
    tenantId: string;
    chargeId: string;
    provider: "asaas";
    providerCustomerId: string;
    providerPaymentId: string;
    externalReference: string;
    status:
      | "pending"
      | "awaiting_payment"
      | "received"
      | "overdue"
      | "refunded"
      | "canceled"
      | "failed";
    pixCopyPasteCode?: string | null;
  }): Promise<unknown>;
  getChargeMessagingContext(input: {
    tenantId: string;
    chargeId: string;
  }): Promise<MessagingContextRecord | null>;
  createMessageDispatch(input: {
    tenantId: string;
    chargeId: string;
    templateKind: "charge_initial" | "charge_reminder" | "payment_confirmation";
    trigger: "manual" | "scheduled";
    reminderSlot?: "d-1" | "d0" | "d+1" | null;
    dispatchKey: string;
    status: "scheduled" | "opened";
    renderedMessage: string;
    templateSnapshot: string;
    recipientWhatsappPhone: string;
    transportUrl?: string | null;
    scheduledFor?: Date | null;
    openedAt?: Date | null;
  }): Promise<MessageDispatchRecord>;
  ensureScheduledMessageDispatch(input: {
    tenantId: string;
    chargeId: string;
    templateKind: "charge_reminder";
    reminderSlot: "d-1" | "d0" | "d+1";
    dispatchKey: string;
    renderedMessage: string;
    templateSnapshot: string;
    recipientWhatsappPhone: string;
    scheduledFor: Date;
  }): Promise<{ dispatch: MessageDispatchRecord; inserted: boolean }>;
  listMessageDispatches(input: {
    tenantId: string;
    chargeId?: string;
  }): Promise<MessageDispatchRecord[]>;
  markMessageDispatchOpened(input: {
    tenantId: string;
    dispatchId: string;
    transportUrl: string;
    openedAt: Date;
  }): Promise<MessageDispatchRecord | null>;
  cancelScheduledMessageDispatches(input: {
    tenantId: string;
    chargeId: string;
    canceledAt: Date;
    cancelReason: string;
  }): Promise<MessageDispatchRecord[]>;
}

async function createHarness() {
  const harness = await createTestAuthDatabase();

  return {
    ...harness,
    messaging: harness.repository as typeof harness.repository & MessagingRepository,
  };
}

async function bootstrapTenant(
  repository: Awaited<ReturnType<typeof createHarness>>["repository"],
  suffix: string,
) {
  return repository.bootstrapOwnerTenant({
    businessName: `Tenant ${suffix}`,
    primaryEmail: `financeiro-${suffix}@tenant.com.br`,
    whatsappPhone: `+55118888${suffix.padStart(4, "0")}`,
    timezone: "America/Sao_Paulo",
    defaultDueDay: 7,
    ownerEmail: `owner-${suffix}@tenant.com.br`,
    ownerPasswordHash: `argon2-hash-${suffix}`,
  });
}

describe("messaging repository", () => {
  it("builds tenant-scoped messaging context and stores manual dispatch history", async () => {
    const harness = await createHarness();

    try {
      const tenant = await bootstrapTenant(harness.repository, "8811");
      const customer = await harness.messaging.createCustomer({
        tenantId: tenant.tenantId,
        name: "Larissa Prado",
        whatsappPhone: "+55 11 99876-1010",
      });
      const charge = await harness.messaging.createManualCharge({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        amountCents: 24990,
        dueDate: new Date("2026-05-03T00:00:00.000Z"),
        description: "Mensalidade maio",
      });

      await harness.messaging.updateTenantSettings(tenant.tenantId, {
        businessName: "Larissa Studio",
        primaryEmail: "financeiro@larissastudio.com.br",
        whatsappPhone: "+55 11 98888-0000",
        timezone: "America/Sao_Paulo",
        defaultDueDay: 7,
        whatsappTemplateChargeInitial:
          "Oi {{customer_name}}, sua cobrança {{charge_id}} de {{amount_brl}} vence em {{due_date}}. Pix: {{pix_code}}",
        whatsappTemplateReminder:
          "Lembrete {{reminder_slot}}: cobrança {{charge_id}} ainda está em aberto.",
        whatsappTemplatePaymentConfirmation:
          "Pagamento {{charge_id}} confirmado. Obrigado!",
        reminderWindowStartHour: 9,
        reminderWindowEndHour: 18,
      });
      await harness.messaging.upsertChargePayment({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        provider: "asaas",
        providerCustomerId: "cus_msg_1",
        providerPaymentId: "pay_msg_1",
        externalReference: charge.id,
        status: "awaiting_payment",
        pixCopyPasteCode: "00020126580014BR.GOV.BCB.PIX0136pix-code-manual",
      });

      const context = await harness.messaging.getChargeMessagingContext({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
      });
      const dispatch = await harness.messaging.createMessageDispatch({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        templateKind: "charge_initial",
        trigger: "manual",
        dispatchKey: `charge-initial:${charge.id}:manual-1`,
        status: "opened",
        renderedMessage:
          "Oi Larissa Prado, sua cobrança está pronta. Pix: 00020126580014BR.GOV.BCB.PIX0136pix-code-manual",
        templateSnapshot:
          "Oi {{customer_name}}, sua cobrança {{charge_id}} de {{amount_brl}} vence em {{due_date}}. Pix: {{pix_code}}",
        recipientWhatsappPhone: "5511998761010",
        transportUrl:
          "https://wa.me/5511998761010?text=Oi%20Larissa%20Prado%2C%20sua%20cobran%C3%A7a",
        openedAt: new Date("2026-04-17T15:00:00.000Z"),
      });
      const dispatches = await harness.messaging.listMessageDispatches({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
      });

      expect(context).toMatchObject({
        chargeId: charge.id,
        customerName: "Larissa Prado",
        customerWhatsappPhoneNormalized: "5511998761010",
        pixCopyPasteCode: "00020126580014BR.GOV.BCB.PIX0136pix-code-manual",
        businessName: "Larissa Studio",
        whatsappTemplateChargeInitial: expect.stringContaining("{{pix_code}}"),
      });
      expect(dispatch).toMatchObject({
        chargeId: charge.id,
        templateKind: "charge_initial",
        trigger: "manual",
        status: "opened",
        recipientWhatsappPhone: "5511998761010",
      });
      expect(dispatches).toHaveLength(1);
      expect(dispatches[0]?.id).toBe(dispatch.id);
    } finally {
      await harness.close();
    }
  });

  it("keeps reminder dispatch scheduling idempotent and cancelable per charge", async () => {
    const harness = await createHarness();

    try {
      const tenant = await bootstrapTenant(harness.repository, "9911");
      const customer = await harness.messaging.createCustomer({
        tenantId: tenant.tenantId,
        name: "Bruno Costa",
        whatsappPhone: "+55 11 97777-2020",
      });
      const charge = await harness.messaging.createManualCharge({
        tenantId: tenant.tenantId,
        customerId: customer.id,
        amountCents: 12990,
        dueDate: new Date("2026-05-10T00:00:00.000Z"),
      });

      const first = await harness.messaging.ensureScheduledMessageDispatch({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        templateKind: "charge_reminder",
        reminderSlot: "d-1",
        dispatchKey: `reminder:${charge.id}:d-1`,
        renderedMessage: "Lembrete D-1",
        templateSnapshot: "Reminder template",
        recipientWhatsappPhone: "5511977772020",
        scheduledFor: new Date("2026-05-09T12:00:00.000Z"),
      });
      const duplicate = await harness.messaging.ensureScheduledMessageDispatch({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        templateKind: "charge_reminder",
        reminderSlot: "d-1",
        dispatchKey: `reminder:${charge.id}:d-1`,
        renderedMessage: "Lembrete D-1",
        templateSnapshot: "Reminder template",
        recipientWhatsappPhone: "5511977772020",
        scheduledFor: new Date("2026-05-09T12:00:00.000Z"),
      });
      const opened = await harness.messaging.markMessageDispatchOpened({
        tenantId: tenant.tenantId,
        dispatchId: first.dispatch.id,
        transportUrl: "https://wa.me/5511977772020?text=Lembrete",
        openedAt: new Date("2026-05-09T12:05:00.000Z"),
      });
      const second = await harness.messaging.ensureScheduledMessageDispatch({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        templateKind: "charge_reminder",
        reminderSlot: "d0",
        dispatchKey: `reminder:${charge.id}:d0`,
        renderedMessage: "Lembrete D0",
        templateSnapshot: "Reminder template",
        recipientWhatsappPhone: "5511977772020",
        scheduledFor: new Date("2026-05-10T12:00:00.000Z"),
      });

      const canceled = await harness.messaging.cancelScheduledMessageDispatches({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
        canceledAt: new Date("2026-05-10T15:00:00.000Z"),
        cancelReason: "Charge paid",
      });
      const dispatches = await harness.messaging.listMessageDispatches({
        tenantId: tenant.tenantId,
        chargeId: charge.id,
      });

      expect(first.inserted).toBe(true);
      expect(duplicate.inserted).toBe(false);
      expect(opened).toMatchObject({
        id: first.dispatch.id,
        status: "opened",
      });
      expect(second.inserted).toBe(true);
      expect(canceled).toHaveLength(1);
      expect(canceled[0]).toMatchObject({
        id: second.dispatch.id,
        status: "canceled",
        cancelReason: "Charge paid",
      });
      expect(dispatches.map((dispatch) => dispatch.status)).toEqual([
        "canceled",
        "opened",
      ]);
    } finally {
      await harness.close();
    }
  });
});
