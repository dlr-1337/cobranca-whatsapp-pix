import type { ChargePaymentStatus, PaymentProvider } from "./schemas.js";

export interface ChargePaymentSyncRecord {
  chargeId: string;
  provider: PaymentProvider;
  providerCustomerId: string;
  providerPaymentId: string;
  externalReference: string;
  status: ChargePaymentStatus;
  pixCopyPasteCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: Date | null;
  lastSyncedAt: Date | null;
  rawChargePayload?: Record<string, unknown> | null;
  rawQrCodePayload?: Record<string, unknown> | null;
}

export interface ChargeSyncRecord {
  id: string;
  status: string;
  amountCents: number;
}

export interface ChargePaymentSnapshotInput {
  tenantId: string;
  provider: PaymentProvider;
  providerPaymentId: string;
  externalReference: string | null;
  status: ChargePaymentStatus;
  lastSyncedAt: Date;
  providerCustomerId?: string | null;
  pixCopyPasteCode?: string | null;
  qrCodeBase64?: string | null;
  expiresAt?: Date | null;
  rawChargePayload?: Record<string, unknown> | null;
  rawQrCodePayload?: Record<string, unknown> | null;
  paidAmountCents?: number | null;
}

export interface ChargePaymentSyncRepository {
  getChargePaymentByProviderPaymentId(input: {
    tenantId: string;
    provider: PaymentProvider;
    providerPaymentId: string;
  }): Promise<ChargePaymentSyncRecord | null>;
  getChargePaymentByChargeId(input: {
    tenantId: string;
    chargeId: string;
  }): Promise<ChargePaymentSyncRecord | null>;
  getChargeById(input: {
    tenantId: string;
    chargeId: string;
  }): Promise<ChargeSyncRecord | null>;
  upsertChargePayment(input: {
    tenantId: string;
    chargeId: string;
    provider: PaymentProvider;
    providerCustomerId: string;
    providerPaymentId: string;
    externalReference: string;
    status: ChargePaymentStatus;
    pixCopyPasteCode?: string | null;
    qrCodeBase64?: string | null;
    expiresAt?: Date | null;
    lastSyncedAt?: Date | null;
    rawChargePayload?: Record<string, unknown> | null;
    rawQrCodePayload?: Record<string, unknown> | null;
  }): Promise<ChargePaymentSyncRecord>;
  markChargePaid(input: {
    tenantId: string;
    chargeId: string;
    occurredAt: Date;
    paidAmountCents?: number | null;
    reason?: string | null;
  }): Promise<unknown>;
}

export interface ChargePaymentSyncResult {
  chargeId: string;
  previousStatus: ChargePaymentStatus | null;
  nextStatus: ChargePaymentStatus;
  chargeAction: "none" | "marked_paid";
  outcome: "matched" | "updated" | "diverged";
  paymentRecord: ChargePaymentSyncRecord;
}

function reconciliationOutcome(input: {
  previousStatus: ChargePaymentStatus | null;
  nextStatus: ChargePaymentStatus;
  chargeStatus: string | null;
}) {
  if (input.previousStatus === input.nextStatus) {
    return "matched" as const;
  }

  if (input.nextStatus === "refunded" && input.chargeStatus === "paid") {
    return "diverged" as const;
  }

  return "updated" as const;
}

export async function syncChargePaymentWithProviderSnapshot(
  repository: ChargePaymentSyncRepository,
  input: ChargePaymentSnapshotInput,
): Promise<ChargePaymentSyncResult> {
  const existing =
    (await repository.getChargePaymentByProviderPaymentId({
      tenantId: input.tenantId,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
    })) ??
    (input.externalReference
      ? await repository.getChargePaymentByChargeId({
          tenantId: input.tenantId,
          chargeId: input.externalReference,
        })
      : null);

  const chargeId = existing?.chargeId ?? input.externalReference;

  if (!chargeId) {
    throw new Error("Provider snapshot could not be matched to a charge");
  }

  const charge = await repository.getChargeById({
    tenantId: input.tenantId,
    chargeId,
  });

  if (!charge) {
    throw new Error("Charge not found for provider snapshot");
  }

  const providerCustomerId = input.providerCustomerId ?? existing?.providerCustomerId;

  if (!providerCustomerId) {
    throw new Error("Provider customer id is required to sync charge payment");
  }

  const paymentRecord = await repository.upsertChargePayment({
    tenantId: input.tenantId,
    chargeId,
    provider: input.provider,
    providerCustomerId,
    providerPaymentId: input.providerPaymentId,
    externalReference: chargeId,
    status: input.status,
    pixCopyPasteCode:
      input.pixCopyPasteCode === undefined
        ? existing?.pixCopyPasteCode
        : input.pixCopyPasteCode,
    qrCodeBase64:
      input.qrCodeBase64 === undefined ? existing?.qrCodeBase64 : input.qrCodeBase64,
    expiresAt: input.expiresAt === undefined ? existing?.expiresAt : input.expiresAt,
    lastSyncedAt: input.lastSyncedAt,
    rawChargePayload:
      input.rawChargePayload === undefined
        ? existing?.rawChargePayload ?? null
        : input.rawChargePayload,
    rawQrCodePayload:
      input.rawQrCodePayload === undefined
        ? existing?.rawQrCodePayload ?? null
        : input.rawQrCodePayload,
  });

  let chargeAction: ChargePaymentSyncResult["chargeAction"] = "none";

  if (input.status === "received" && charge.status === "open") {
    await repository.markChargePaid({
      tenantId: input.tenantId,
      chargeId,
      occurredAt: input.lastSyncedAt,
      paidAmountCents: input.paidAmountCents ?? charge.amountCents,
      reason: "Pagamento confirmado pelo PSP.",
    });
    chargeAction = "marked_paid";
  }

  return {
    chargeId,
    previousStatus: existing?.status ?? null,
    nextStatus: input.status,
    chargeAction,
    outcome: reconciliationOutcome({
      previousStatus: existing?.status ?? null,
      nextStatus: input.status,
      chargeStatus: charge.status,
    }),
    paymentRecord,
  };
}
