import type { ChargePaymentStatus } from "@cobrazap/domain";

export interface AsaasCustomerRecord {
  id: string;
  name: string;
  mobilePhone: string | null;
}

export interface AsaasPaymentSnapshot {
  provider: "asaas";
  providerCustomerId: string;
  providerPaymentId: string;
  externalReference: string | null;
  status: ChargePaymentStatus;
  valueCents: number | null;
  pixCopyPasteCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: Date | null;
  rawChargePayload: Record<string, unknown>;
  rawQrCodePayload: Record<string, unknown> | null;
}

export interface AsaasWebhookEvent {
  provider: "asaas";
  providerEventId: string;
  eventType: string;
  providerPaymentId: string | null;
  providerCustomerId: string | null;
  externalReference: string | null;
  paymentStatus: ChargePaymentStatus;
  paidAmountCents: number | null;
  occurredAt: Date;
  rawPayload: Record<string, unknown>;
  rawChargePayload: Record<string, unknown> | null;
}

export interface CreateAsaasCustomerInput {
  name: string;
  mobilePhone?: string | null;
  externalReference?: string | null;
}

export interface CreateAsaasPixPaymentInput {
  providerCustomerId: string;
  valueCents: number;
  dueDate: Date;
  externalReference: string;
  description?: string | null;
}

export interface AsaasClient {
  createCustomer(input: CreateAsaasCustomerInput): Promise<AsaasCustomerRecord>;
  createPixPayment(input: CreateAsaasPixPaymentInput): Promise<AsaasPaymentSnapshot>;
  getPayment(providerPaymentId: string): Promise<AsaasPaymentSnapshot>;
}

export interface AsaasHttpClientConfig {
  apiKey: string;
  baseUrl?: string;
  userAgent?: string;
  fetchImpl?: typeof fetch;
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}-03:00`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function moneyToCents(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 100);
}

function getRecordValue(record: Record<string, unknown>, key: string) {
  return record[key];
}

export function mapAsaasPaymentStatus(input: {
  eventType?: string | null;
  paymentStatus?: string | null;
}): ChargePaymentStatus {
  const normalizedEvent = input.eventType?.trim().toUpperCase() ?? null;
  const normalizedStatus = input.paymentStatus?.trim().toUpperCase() ?? null;

  if (normalizedEvent === "PAYMENT_RECEIVED" || normalizedEvent === "PAYMENT_CONFIRMED") {
    return "received";
  }

  if (normalizedEvent === "PAYMENT_OVERDUE") {
    return "overdue";
  }

  if (
    normalizedEvent === "PAYMENT_REFUNDED" ||
    normalizedEvent === "PAYMENT_REFUND_IN_PROGRESS"
  ) {
    return "refunded";
  }

  if (
    normalizedEvent === "PAYMENT_DELETED" ||
    normalizedEvent === "PAYMENT_RESTORED" ||
    normalizedEvent === "PAYMENT_CANCELED"
  ) {
    return "canceled";
  }

  switch (normalizedStatus) {
    case "PENDING":
      return "awaiting_payment";
    case "CONFIRMED":
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
      return "received";
    case "OVERDUE":
      return "overdue";
    case "REFUNDED":
      return "refunded";
    case "CANCELLED":
    case "CANCELED":
      return "canceled";
    case "FAILED":
      return "failed";
    default:
      return "awaiting_payment";
  }
}

function asaasPaymentSnapshotFromObjects(input: {
  payment: Record<string, unknown>;
  qrCodePayload?: Record<string, unknown> | null;
}): AsaasPaymentSnapshot {
  return {
    provider: "asaas",
    providerCustomerId: String(getRecordValue(input.payment, "customer") ?? ""),
    providerPaymentId: String(getRecordValue(input.payment, "id") ?? ""),
    externalReference:
      typeof getRecordValue(input.payment, "externalReference") === "string"
        ? String(getRecordValue(input.payment, "externalReference"))
        : null,
    status: mapAsaasPaymentStatus({
      paymentStatus:
        typeof getRecordValue(input.payment, "status") === "string"
          ? String(getRecordValue(input.payment, "status"))
          : null,
    }),
    valueCents: moneyToCents(getRecordValue(input.payment, "value")),
    pixCopyPasteCode:
      typeof input.qrCodePayload?.payload === "string" ? input.qrCodePayload.payload : null,
    qrCodeBase64:
      typeof input.qrCodePayload?.encodedImage === "string"
        ? input.qrCodePayload.encodedImage
        : null,
    expiresAt: parseDate(input.qrCodePayload?.expirationDate),
    rawChargePayload: input.payment,
    rawQrCodePayload: input.qrCodePayload ?? null,
  };
}

export function parseAsaasWebhookEvent(
  payload: Record<string, unknown>,
): AsaasWebhookEvent {
  const payment =
    payload.payment && typeof payload.payment === "object"
      ? (payload.payment as Record<string, unknown>)
      : null;
  const eventType = typeof payload.event === "string" ? payload.event : "UNKNOWN";

  return {
    provider: "asaas",
    providerEventId: String(payload.id ?? ""),
    eventType,
    providerPaymentId:
      typeof payment?.id === "string" ? payment.id : null,
    providerCustomerId:
      typeof payment?.customer === "string" ? payment.customer : null,
    externalReference:
      typeof payment?.externalReference === "string"
        ? payment.externalReference
        : null,
    paymentStatus: mapAsaasPaymentStatus({
      eventType,
      paymentStatus: typeof payment?.status === "string" ? payment.status : null,
    }),
    paidAmountCents: moneyToCents(payment?.value),
    occurredAt: parseDate(payload.dateCreated) ?? new Date(),
    rawPayload: payload,
    rawChargePayload: payment,
  };
}

export class HttpAsaasClient implements AsaasClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: AsaasHttpClientConfig) {
    this.baseUrl = config.baseUrl ?? "https://api-sandbox.asaas.com";
    this.userAgent = config.userAgent ?? "cobrazap";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async createCustomer(input: CreateAsaasCustomerInput): Promise<AsaasCustomerRecord> {
    const response = await this.request("/v3/customers", {
      method: "POST",
      body: {
        name: input.name,
        mobilePhone: input.mobilePhone ?? undefined,
        externalReference: input.externalReference ?? undefined,
      },
    });

    return {
      id: String(response.id),
      name: typeof response.name === "string" ? response.name : input.name,
      mobilePhone:
        typeof response.mobilePhone === "string" ? response.mobilePhone : input.mobilePhone ?? null,
    };
  }

  async createPixPayment(
    input: CreateAsaasPixPaymentInput,
  ): Promise<AsaasPaymentSnapshot> {
    const payment = await this.request("/v3/payments", {
      method: "POST",
      body: {
        customer: input.providerCustomerId,
        billingType: "PIX",
        value: input.valueCents / 100,
        dueDate: formatDateOnly(input.dueDate),
        externalReference: input.externalReference,
        description: input.description ?? undefined,
      },
    });
    const qrCode = await this.request(`/v3/payments/${String(payment.id)}/pixQrCode`, {
      method: "GET",
    });

    return asaasPaymentSnapshotFromObjects({
      payment,
      qrCodePayload: qrCode,
    });
  }

  async getPayment(providerPaymentId: string): Promise<AsaasPaymentSnapshot> {
    const payment = await this.request(`/v3/payments/${providerPaymentId}`, {
      method: "GET",
    });

    let qrCodePayload: Record<string, unknown> | null = null;

    try {
      qrCodePayload = await this.request(`/v3/payments/${providerPaymentId}/pixQrCode`, {
        method: "GET",
      });
    } catch {
      qrCodePayload = null;
    }

    return asaasPaymentSnapshotFromObjects({
      payment,
      qrCodePayload,
    });
  }

  private async request(
    path: string,
    input: {
      method: "GET" | "POST";
      body?: Record<string, unknown>;
    },
  ): Promise<Record<string, unknown>> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: input.method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": this.userAgent,
        access_token: this.config.apiKey,
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Asaas request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return payload;
  }
}

interface InMemoryPaymentRecord extends AsaasPaymentSnapshot {
  dueDate: Date;
  description: string | null;
}

export class InMemoryAsaasClient implements AsaasClient {
  private customerCounter = 0;
  private paymentCounter = 0;
  private eventCounter = 0;
  private readonly customers = new Map<string, AsaasCustomerRecord>();
  private readonly payments = new Map<string, InMemoryPaymentRecord>();

  async createCustomer(input: CreateAsaasCustomerInput): Promise<AsaasCustomerRecord> {
    this.customerCounter += 1;
    const customer: AsaasCustomerRecord = {
      id: `cus_test_${String(this.customerCounter).padStart(4, "0")}`,
      name: input.name,
      mobilePhone: input.mobilePhone ?? null,
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async createPixPayment(
    input: CreateAsaasPixPaymentInput,
  ): Promise<AsaasPaymentSnapshot> {
    this.paymentCounter += 1;
    const paymentId = `pay_test_${String(this.paymentCounter).padStart(4, "0")}`;
    const record: InMemoryPaymentRecord = {
      provider: "asaas",
      providerCustomerId: input.providerCustomerId,
      providerPaymentId: paymentId,
      externalReference: input.externalReference,
      status: "awaiting_payment",
      valueCents: input.valueCents,
      pixCopyPasteCode: `00020126580014br.gov.bcb.pix0111${paymentId}`,
      qrCodeBase64: `base64:${paymentId}`,
      expiresAt: new Date(
        Date.UTC(
          input.dueDate.getUTCFullYear() + 1,
          input.dueDate.getUTCMonth(),
          input.dueDate.getUTCDate(),
        ),
      ),
      rawChargePayload: {
        object: "payment",
        id: paymentId,
        customer: input.providerCustomerId,
        externalReference: input.externalReference,
        status: "PENDING",
        value: input.valueCents / 100,
      },
      rawQrCodePayload: {
        encodedImage: `base64:${paymentId}`,
        payload: `00020126580014br.gov.bcb.pix0111${paymentId}`,
        expirationDate: new Date(
          Date.UTC(
            input.dueDate.getUTCFullYear() + 1,
            input.dueDate.getUTCMonth(),
            input.dueDate.getUTCDate(),
          ),
        ).toISOString(),
      },
      dueDate: input.dueDate,
      description: input.description ?? null,
    };

    this.payments.set(paymentId, record);
    return record;
  }

  async getPayment(providerPaymentId: string): Promise<AsaasPaymentSnapshot> {
    const payment = this.payments.get(providerPaymentId);

    if (!payment) {
      throw new Error(`In-memory Asaas payment not found: ${providerPaymentId}`);
    }

    return payment;
  }

  setPaymentStatus(providerPaymentId: string, status: ChargePaymentStatus) {
    const payment = this.payments.get(providerPaymentId);

    if (!payment) {
      throw new Error(`In-memory Asaas payment not found: ${providerPaymentId}`);
    }

    payment.status = status;
    payment.rawChargePayload = {
      ...payment.rawChargePayload,
      status: mapChargePaymentStatusToAsaas(status),
    };
  }

  buildWebhookPayload(providerPaymentId: string, eventType?: string) {
    const payment = this.payments.get(providerPaymentId);

    if (!payment) {
      throw new Error(`In-memory Asaas payment not found: ${providerPaymentId}`);
    }

    this.eventCounter += 1;

    return {
      id: `evt_test_${String(this.eventCounter).padStart(4, "0")}`,
      event: eventType ?? mapChargePaymentStatusToAsaasEvent(payment.status),
      dateCreated: new Date().toISOString(),
      payment: {
        object: "payment",
        id: payment.providerPaymentId,
        customer: payment.providerCustomerId,
        externalReference: payment.externalReference,
        status: mapChargePaymentStatusToAsaas(payment.status),
        value: (payment.valueCents ?? 0) / 100,
      },
    };
  }
}

function mapChargePaymentStatusToAsaas(status: ChargePaymentStatus) {
  switch (status) {
    case "received":
      return "RECEIVED";
    case "overdue":
      return "OVERDUE";
    case "refunded":
      return "REFUNDED";
    case "canceled":
      return "CANCELLED";
    case "failed":
      return "FAILED";
    default:
      return "PENDING";
  }
}

function mapChargePaymentStatusToAsaasEvent(status: ChargePaymentStatus) {
  switch (status) {
    case "received":
      return "PAYMENT_RECEIVED";
    case "overdue":
      return "PAYMENT_OVERDUE";
    case "refunded":
      return "PAYMENT_REFUNDED";
    case "canceled":
      return "PAYMENT_DELETED";
    case "failed":
      return "PAYMENT_REPROVED_BY_RISK_ANALYSIS";
    default:
      return "PAYMENT_CREATED";
  }
}
