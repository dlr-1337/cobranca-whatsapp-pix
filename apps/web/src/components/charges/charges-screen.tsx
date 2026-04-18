"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  Banner,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SelectField,
} from "@/components/ui/primitives";

interface SessionPayload {
  authenticated: true;
  tenant: {
    id: string;
    businessName: string;
  };
  user: {
    email: string;
  };
}

interface WalletCustomerRecord {
  id: string;
  name: string;
}

interface WalletPlanRecord {
  id: string;
  name: string;
}

interface WalletSnapshot {
  customers: WalletCustomerRecord[];
  plans: WalletPlanRecord[];
}

interface ChargeRecord {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string | null;
  subscriptionId: string | null;
  origin: "manual" | "recurring";
  status: "open" | "paid" | "canceled" | "replaced" | "expired";
  amountCents: number;
  dueDate: string;
  competenceKey: string | null;
  description: string | null;
  notes: string | null;
  replacesChargeId: string | null;
  replacedByChargeId: string | null;
  paidAt: string | null;
  paidAmountCents: number | null;
  canceledAt: string | null;
  customerName?: string;
  customerWhatsappPhoneDisplay?: string;
  planName?: string | null;
}

interface ChargeEventRecord {
  id: string;
  tenantId: string;
  chargeId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  occurredAt: string;
}

interface ChargesSnapshot {
  summary: {
    receivedCount: number;
    receivedCents: number;
    dueSoonCount: number;
    dueSoonCents: number;
    overdueCount: number;
    overdueCents: number;
  };
  charges: ChargeRecord[];
  chargeEvents: ChargeEventRecord[];
}

interface ChargePaymentRecord {
  id: string;
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
  pixCopyPasteCode: string | null;
  qrCodeBase64: string | null;
  expiresAt: string | null;
  lastSyncedAt: string | null;
}

interface PaymentProviderEventRecord {
  id: string;
  tenantId: string;
  provider: "asaas";
  providerEventId: string;
  eventType: string;
  providerPaymentId: string | null;
  externalReference: string | null;
  processingStatus: "pending" | "processed" | "failed";
  processingSummary: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface PaymentReconciliationRunRecord {
  id: string;
  tenantId: string;
  provider: "asaas";
  trigger: "manual" | "scheduled";
  matchedCount: number;
  updatedCount: number;
  divergenceCount: number;
  failedCount: number;
  startedAt: string;
  finishedAt: string;
}

interface PaymentsOperationsSnapshot {
  chargePayments: ChargePaymentRecord[];
  providerEvents: PaymentProviderEventRecord[];
  reconciliationRuns: PaymentReconciliationRunRecord[];
}

type MessageTemplateKind =
  | "charge_initial"
  | "charge_reminder"
  | "payment_confirmation";
type MessageDispatchTrigger = "manual" | "scheduled";
type MessageDispatchStatus = "scheduled" | "opened" | "canceled" | "failed";
type ReminderSlot = "d-1" | "d0" | "d+1";

interface MessageDispatchRecord {
  id: string;
  tenantId: string;
  chargeId: string;
  templateKind: MessageTemplateKind;
  trigger: MessageDispatchTrigger;
  reminderSlot: ReminderSlot | null;
  dispatchKey: string;
  status: MessageDispatchStatus;
  renderedMessage: string;
  templateSnapshot: string;
  recipientWhatsappPhone: string;
  transportUrl: string | null;
  scheduledFor: string | null;
  openedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessagePreviewRecord {
  chargeId: string;
  templateKind: MessageTemplateKind;
  reminderSlot: ReminderSlot | null;
  templateSnapshot?: string;
  renderedMessage: string;
  recipientWhatsappPhone: string;
  transportUrl: string;
  dispatchId?: string | null;
  status?: MessageDispatchStatus | "opened";
}

interface MessagingSnapshot {
  dispatches: MessageDispatchRecord[];
}

interface ManualChargeFormState {
  customerId: string;
  planId: string;
  amountCents: string;
  dueDate: string;
  description: string;
  notes: string;
}

interface ReplaceFormState {
  chargeId: string;
  amountCents: string;
  dueDate: string;
  reason: string;
}

function currentDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyManualChargeForm(
  customerId = "",
  planId = "",
): ManualChargeFormState {
  return {
    customerId,
    planId,
    amountCents: "",
    dueDate: currentDateInputValue(),
    description: "",
    notes: "",
  };
}

function emptyReplaceForm(): ReplaceFormState {
  return {
    chargeId: "",
    amountCents: "",
    dueDate: currentDateInputValue(),
    reason: "",
  };
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function readMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }

  return typeof payload.message === "string" ? payload.message : null;
}

function formatTemplateKindLabel(templateKind: MessageTemplateKind) {
  switch (templateKind) {
    case "charge_initial":
      return "Cobranca inicial";
    case "charge_reminder":
      return "Reminder";
    case "payment_confirmation":
      return "Confirmacao de pagamento";
  }
}

function formatReminderSlotLabel(reminderSlot: ReminderSlot) {
  switch (reminderSlot) {
    case "d-1":
      return "D-1";
    case "d0":
      return "D0";
    case "d+1":
      return "D+1";
  }
}

function csvEscape(value: string | number | null | undefined) {
  const normalized = String(value ?? "");

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function TextAreaField(props: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2" htmlFor={props.id}>
      <span className="text-sm font-semibold text-foreground">{props.label}</span>
      <textarea
        id={props.id}
        rows={4}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-foreground-muted/80 focus:border-accent focus:accent-ring"
      />
    </label>
  );
}

function MetricCard(props: {
  label: string;
  amountCents: number;
  count: number;
}) {
  return (
    <article className="soft-panel rounded-[1.75rem] border border-white/70 px-5 py-5">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground-muted">
        {props.label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
        {formatCurrency(props.amountCents)}
      </p>
      <p className="mt-2 text-sm text-foreground-muted">
        {props.count} cobranca{props.count === 1 ? "" : "s"}
      </p>
    </article>
  );
}

export function ChargesScreen() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"loading" | "ready" | "expired">(
    "loading",
  );
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [snapshot, setSnapshot] = useState<ChargesSnapshot | null>(null);
  const [paymentsSnapshot, setPaymentsSnapshot] =
    useState<PaymentsOperationsSnapshot | null>(null);
  const [messagingSnapshot, setMessagingSnapshot] =
    useState<MessagingSnapshot | null>(null);
  const [messagePreviewByChargeId, setMessagePreviewByChargeId] = useState<
    Record<string, MessagePreviewRecord | null>
  >({});
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [manualChargeForm, setManualChargeForm] = useState<ManualChargeFormState>(
    emptyManualChargeForm(),
  );
  const [referenceDate, setReferenceDate] = useState(currentDateInputValue());
  const [statusFilter, setStatusFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [dueDateFromFilter, setDueDateFromFilter] = useState("");
  const [dueDateToFilter, setDueDateToFilter] = useState("");
  const [replaceForm, setReplaceForm] = useState<ReplaceFormState>(emptyReplaceForm());

  const chargeEventsByChargeId = useMemo(() => {
    const map = new Map<string, ChargeEventRecord[]>();

    for (const event of snapshot?.chargeEvents ?? []) {
      const current = map.get(event.chargeId) ?? [];
      current.push(event);
      map.set(event.chargeId, current);
    }

    return map;
  }, [snapshot?.chargeEvents]);

  const chargePaymentsByChargeId = useMemo(() => {
    return new Map(
      (paymentsSnapshot?.chargePayments ?? []).map((payment) => [
        payment.chargeId,
        payment,
      ]),
    );
  }, [paymentsSnapshot?.chargePayments]);

  const dispatchesByChargeId = useMemo(() => {
    const map = new Map<string, MessageDispatchRecord[]>();

    for (const dispatch of messagingSnapshot?.dispatches ?? []) {
      const current = map.get(dispatch.chargeId) ?? [];
      current.push(dispatch);
      map.set(dispatch.chargeId, current);
    }

    return map;
  }, [messagingSnapshot?.dispatches]);

  const providerEventSummary = useMemo(() => {
    return (paymentsSnapshot?.providerEvents ?? []).reduce(
      (summary, event) => {
        summary[event.processingStatus] += 1;
        return summary;
      },
      {
        pending: 0,
        processed: 0,
        failed: 0,
      },
    );
  }, [paymentsSnapshot?.providerEvents]);

  const failedProviderEvents = useMemo(() => {
    return (paymentsSnapshot?.providerEvents ?? []).filter(
      (event) => event.processingStatus === "failed",
    );
  }, [paymentsSnapshot?.providerEvents]);

  const filteredCharges = useMemo(() => {
    return (snapshot?.charges ?? []).filter((charge) => {
      const dueDateKey = charge.dueDate.slice(0, 10);

      if (statusFilter && charge.status !== statusFilter) {
        return false;
      }

      if (originFilter && charge.origin !== originFilter) {
        return false;
      }

      if (customerFilter && charge.customerId !== customerFilter) {
        return false;
      }

      if (planFilter && charge.planId !== planFilter) {
        return false;
      }

      if (dueDateFromFilter && dueDateKey < dueDateFromFilter) {
        return false;
      }

      if (dueDateToFilter && dueDateKey > dueDateToFilter) {
        return false;
      }

      return true;
    });
  }, [
    customerFilter,
    dueDateFromFilter,
    dueDateToFilter,
    originFilter,
    planFilter,
    snapshot?.charges,
    statusFilter,
  ]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [
        sessionResponse,
        walletResponse,
        chargesResponse,
        paymentsResponse,
        messagingResponse,
      ] = await Promise.all([
        fetch("/api/auth/session", {
          cache: "no-store",
        }),
        fetch("/api/wallet/current", {
          cache: "no-store",
        }),
        fetch("/api/charges/current", {
          cache: "no-store",
        }),
        fetch("/api/payments/current", {
          cache: "no-store",
        }),
        fetch("/api/messaging/current", {
          cache: "no-store",
        }),
      ]);

      if (
        !sessionResponse.ok ||
        !walletResponse.ok ||
        !chargesResponse.ok ||
        !paymentsResponse.ok ||
        !messagingResponse.ok
      ) {
        if (!cancelled) {
          if (
            sessionResponse.status === 401 ||
            walletResponse.status === 401 ||
            chargesResponse.status === 401 ||
            paymentsResponse.status === 401 ||
            messagingResponse.status === 401
          ) {
            setLoadState("expired");
          } else {
            setMessage({
              tone: "danger",
              text: "Nao foi possivel carregar o painel de cobrancas agora.",
            });
            setLoadState("ready");
          }
        }
        return;
      }

      const [
        sessionPayload,
        walletPayload,
        chargesPayload,
        paymentsPayload,
        messagingPayload,
      ] =
        (await Promise.all([
          sessionResponse.json(),
          walletResponse.json(),
          chargesResponse.json(),
          paymentsResponse.json(),
          messagingResponse.json(),
        ])) as [
        SessionPayload,
        WalletSnapshot,
        ChargesSnapshot,
        PaymentsOperationsSnapshot,
        MessagingSnapshot,
      ];

      if (cancelled) {
        return;
      }

      setSession(sessionPayload);
      setWallet(walletPayload);
      setSnapshot(chargesPayload);
      setPaymentsSnapshot(paymentsPayload);
      setMessagingSnapshot(messagingPayload);
      setLoadState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!wallet) {
      return;
    }

    setManualChargeForm((current) =>
      current.customerId || current.planId
        ? current
        : emptyManualChargeForm(wallet.customers[0]?.id ?? "", wallet.plans[0]?.id ?? ""),
    );
  }, [wallet]);

  async function refreshChargesSnapshot() {
    const [chargesResponse, paymentsResponse, messagingResponse] = await Promise.all([
      fetch("/api/charges/current", {
        cache: "no-store",
      }),
      fetch("/api/payments/current", {
        cache: "no-store",
      }),
      fetch("/api/messaging/current", {
        cache: "no-store",
      }),
    ]);

    if (!chargesResponse.ok || !paymentsResponse.ok || !messagingResponse.ok) {
      throw new Error("Falha ao atualizar operacao de cobrancas.");
    }

    const [chargesPayload, paymentsPayload, messagingPayload] = (await Promise.all([
      chargesResponse.json(),
      paymentsResponse.json(),
      messagingResponse.json(),
    ])) as [ChargesSnapshot, PaymentsOperationsSnapshot, MessagingSnapshot];

    setSnapshot(chargesPayload);
    setPaymentsSnapshot(paymentsPayload);
    setMessagingSnapshot(messagingPayload);
  }

  async function runMutation<T>(label: string, work: () => Promise<T>) {
    setPendingAction(label);
    setMessage(null);

    try {
      const result = await work();
      await refreshChargesSnapshot();
      return result;
    } finally {
      setPendingAction(null);
    }
  }

  async function handleManualChargeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await runMutation("manual-create", async () => {
        const response = await fetch("/api/charges", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            customerId: manualChargeForm.customerId,
            planId: manualChargeForm.planId || null,
            amountCents: Number(manualChargeForm.amountCents),
            dueDate: manualChargeForm.dueDate,
            description: manualChargeForm.description || null,
            notes: manualChargeForm.notes || null,
          }),
        });
        const payload = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(
            readMessage(payload) ?? "Nao foi possivel criar a cobranca avulsa.",
          );
        }

        setManualChargeForm(
          emptyManualChargeForm(
            manualChargeForm.customerId,
            manualChargeForm.planId,
          ),
        );
        setMessage({
          tone: "success",
          text: "Cobranca avulsa criada com sucesso.",
        });

        return payload;
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Falha ao criar cobranca.",
      });
    }
  }

  async function handleRecurringGeneration() {
    try {
      await runMutation("generate-recurring", async () => {
        const response = await fetch("/api/charges/generate-recurring", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            referenceDate,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { generatedCount?: number; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            payload?.message ?? "Nao foi possivel executar a geracao recorrente.",
          );
        }

        setMessage({
          tone: "success",
          text: `Geracao recorrente executada com ${payload?.generatedCount ?? 0} cobrancas.`,
        });

        return payload;
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Falha na geracao recorrente.",
      });
    }
  }

  async function handleChargeAction(
    chargeId: string,
    payload: Record<string, unknown>,
    successMessage: string,
    pendingKey: string,
  ) {
    try {
      await runMutation(pendingKey, async () => {
        const response = await fetch(`/api/charges/${chargeId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const body = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          throw new Error(readMessage(body) ?? "Falha ao atualizar cobranca.");
        }

        setMessage({
          tone: "success",
          text: successMessage,
        });

        return body;
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Falha ao atualizar cobranca.",
      });
    }
  }

  async function copyPixCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setMessage({
        tone: "success",
        text: "Codigo Pix copiado para a area de transferencia.",
      });
    } catch {
      setMessage({
        tone: "danger",
        text: "Nao foi possivel copiar o codigo Pix neste navegador.",
      });
    }
  }

  async function handleGeneratePix(chargeId: string) {
    try {
      await runMutation(`pix-${chargeId}`, async () => {
        const response = await fetch(`/api/payments/charges/${chargeId}/pix`, {
          method: "POST",
        });
        const payload = (await response.json().catch(() => null)) as
          | { providerPaymentId?: string; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? "Nao foi possivel gerar o Pix.");
        }

        setMessage({
          tone: "success",
          text: `Pix ${payload?.providerPaymentId ?? ""} pronto para operacao.`,
        });

        return payload;
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Falha ao gerar Pix.",
      });
    }
  }

  async function handlePreviewMessage(
    chargeId: string,
    templateKind: MessageTemplateKind,
    reminderSlot?: ReminderSlot,
  ) {
    const pendingKey = `preview-${chargeId}-${templateKind}-${reminderSlot ?? "none"}`;
    setPendingAction(pendingKey);
    setMessage(null);

    try {
      const searchParams = new URLSearchParams({
        templateKind,
      });

      if (reminderSlot) {
        searchParams.set("reminderSlot", reminderSlot);
      }

      const response = await fetch(
        `/api/messaging/charges/${chargeId}/preview?${searchParams.toString()}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | MessagePreviewRecord
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          readMessage(payload) ?? "Nao foi possivel renderizar o preview WhatsApp.",
        );
      }

      setMessagePreviewByChargeId((current) => ({
        ...current,
        [chargeId]: payload as MessagePreviewRecord,
      }));
    } catch (error) {
      setMessage({
        tone: "danger",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao carregar preview WhatsApp.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleManualSend(
    chargeId: string,
    body: {
      templateKind: MessageTemplateKind;
      reminderSlot?: ReminderSlot;
      dispatchId?: string;
    },
  ) {
    const pendingKey = `send-${chargeId}-${body.templateKind}-${body.reminderSlot ?? "none"}`;

    try {
      const payload = await runMutation(pendingKey, async () => {
        const response = await fetch(`/api/messaging/charges/${chargeId}/manual-send`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const responseBody = (await response.json().catch(() => null)) as
          | MessagePreviewRecord
          | { message?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            readMessage(responseBody) ??
              "Nao foi possivel abrir o envio assistido no WhatsApp.",
          );
        }

        return responseBody as MessagePreviewRecord;
      });

      setMessagePreviewByChargeId((current) => ({
        ...current,
        [chargeId]: payload,
      }));

      window.open(payload.transportUrl, "_blank", "noopener,noreferrer");

      setMessage({
        tone: "success",
        text:
          body.templateKind === "charge_reminder"
            ? "Reminder aberto no WhatsApp e historico atualizado."
            : "Envio assistido aberto no WhatsApp.",
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao abrir envio assistido no WhatsApp.",
      });
    }
  }

  function handleExportCsv() {
    if (filteredCharges.length === 0) {
      setMessage({
        tone: "danger",
        text: "Nao ha cobrancas no recorte atual para exportar.",
      });
      return;
    }

    const header = [
      "charge_id",
      "customer_name",
      "customer_whatsapp",
      "plan_name",
      "origin",
      "status",
      "amount_cents",
      "amount_brl",
      "due_date",
      "competence_key",
      "provider_payment_id",
      "payment_status",
      "paid_at",
      "canceled_at",
    ];
    const lines = filteredCharges.map((charge) => {
      const chargePayment = chargePaymentsByChargeId.get(charge.id) ?? null;

      return [
        charge.id,
        charge.customerName ?? "",
        charge.customerWhatsappPhoneDisplay ?? "",
        charge.planName ?? "",
        charge.origin,
        charge.status,
        charge.amountCents,
        formatCurrency(charge.amountCents),
        charge.dueDate.slice(0, 10),
        charge.competenceKey ?? "",
        chargePayment?.providerPaymentId ?? "",
        chargePayment?.status ?? "",
        charge.paidAt ? charge.paidAt.slice(0, 19) : "",
        charge.canceledAt ? charge.canceledAt.slice(0, 19) : "",
      ]
        .map(csvEscape)
        .join(",");
    });

    downloadCsv(
      `cobrazap-charges-${currentDateInputValue()}.csv`,
      [header.join(","), ...lines].join("\n"),
    );
    setMessage({
      tone: "success",
      text: `CSV exportado com ${filteredCharges.length} cobrancas do recorte atual.`,
    });
  }

  async function handleReplayProviderEvent(providerEventId: string) {
    try {
      await runMutation(`replay-${providerEventId}`, async () => {
        const response = await fetch(
          `/api/payments/provider-events/${providerEventId}/replay`,
          {
            method: "POST",
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | { accepted: boolean; mode: string; providerEventId: string }
          | null;

        if (!response.ok) {
          throw new Error(
            readMessage(payload) ?? "Nao foi possivel reenfileirar o evento Pix.",
          );
        }

        return payload;
      });

      setMessage({
        tone: "success",
        text: "Evento Pix reenfileirado com sucesso para reprocessamento.",
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao reenfileirar o evento Pix.",
      });
    }
  }

  async function handleManualReconciliation() {
    try {
      await runMutation("manual-reconciliation", async () => {
        const response = await fetch("/api/payments/reconciliation/manual", {
          method: "POST",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              run?: {
                updatedCount: number;
                divergenceCount: number;
                failedCount: number;
              };
              message?: string;
            }
          | null;

        if (!response.ok) {
          throw new Error(
            payload?.message ?? "Nao foi possivel executar a reconciliacao.",
          );
        }

        setMessage({
          tone: "success",
          text: `Reconciliacao concluida: ${payload?.run?.updatedCount ?? 0} atualizacoes, ${payload?.run?.divergenceCount ?? 0} divergencias e ${payload?.run?.failedCount ?? 0} falhas.`,
        });

        return payload;
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao reconciliar pagamentos Pix.",
      });
    }
  }

  async function handleReplaceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!replaceForm.chargeId) {
      return;
    }

    await handleChargeAction(
      replaceForm.chargeId,
      {
        action: "replace",
        occurredAt: new Date().toISOString(),
        amountCents: Number(replaceForm.amountCents),
        dueDate: replaceForm.dueDate,
        reason: replaceForm.reason,
      },
      "Cobranca substituida com sucesso.",
      `replace-${replaceForm.chargeId}`,
    );

    setReplaceForm(emptyReplaceForm());
  }

  function startReplace(charge: ChargeRecord) {
    setReplaceForm({
      chargeId: charge.id,
      amountCents: String(charge.amountCents),
      dueDate: charge.dueDate.slice(0, 10),
      reason: "Reemissao operacional",
    });
  }

  if (loadState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="soft-panel w-full max-w-xl rounded-[2rem] border border-white/70 px-6 py-7 text-sm text-foreground-muted">
          Carregando operacao de cobrancas...
        </div>
      </div>
    );
  }

  if (
    loadState === "expired" ||
    !session ||
    !wallet ||
    !snapshot ||
    !paymentsSnapshot ||
    !messagingSnapshot
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="soft-panel w-full max-w-xl space-y-4 rounded-[2rem] border border-white/70 px-6 py-7">
          <Banner tone="danger">
            Sua sessao expirou. Entre novamente para continuar.
          </Banner>
          <PrimaryButton className="w-full" onClick={() => router.push("/entrar")}>
            Voltar para o login
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="soft-panel flex flex-col gap-4 rounded-[2rem] border border-white/70 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Operacao de cobrancas
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground-muted">
                Empresa atual
              </p>
              <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
                {session.tenant.businessName}
              </h1>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link
                href="/painel/carteira"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Carteira
              </Link>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
                Cobrancas
              </span>
              <Link
                href="/painel/configuracoes"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Configuracoes
              </Link>
              <Link
                href="/painel/auditoria"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Auditoria
              </Link>
            </nav>
            <p className="max-w-3xl text-sm leading-6 text-foreground-muted">
              Valide o motor interno antes do Pix: crie cobrancas avulsas, gere
              recorrencia de forma idempotente e acompanhe recebido, a vencer e
              vencido por tenant.
            </p>
          </div>

          <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground-muted">
            <span className="font-semibold text-foreground">{session.user.email}</span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Recebido"
            amountCents={snapshot.summary.receivedCents}
            count={snapshot.summary.receivedCount}
          />
          <MetricCard
            label="A vencer"
            amountCents={snapshot.summary.dueSoonCents}
            count={snapshot.summary.dueSoonCount}
          />
          <MetricCard
            label="Vencido"
            amountCents={snapshot.summary.overdueCents}
            count={snapshot.summary.overdueCount}
          />
        </section>

        {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Cobranca avulsa
                </h2>
                <p className="text-sm leading-6 text-foreground-muted">
                  Lance uma cobranca fora da assinatura sem perder contexto de
                  cliente e plano.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleManualChargeSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="manualCustomer"
                    label="Cliente"
                    value={manualChargeForm.customerId}
                    onChange={(event) =>
                      setManualChargeForm((current) => ({
                        ...current,
                        customerId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {wallet.customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    id="manualPlan"
                    label="Plano opcional"
                    value={manualChargeForm.planId}
                    onChange={(event) =>
                      setManualChargeForm((current) => ({
                        ...current,
                        planId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sem plano</option>
                    {wallet.plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    id="manualAmount"
                    label="Valor em centavos"
                    inputMode="numeric"
                    value={manualChargeForm.amountCents}
                    onChange={(event) =>
                      setManualChargeForm((current) => ({
                        ...current,
                        amountCents: event.target.value,
                      }))
                    }
                  />
                  <InputField
                    id="manualDueDate"
                    label="Vencimento"
                    type="date"
                    value={manualChargeForm.dueDate}
                    onChange={(event) =>
                      setManualChargeForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <InputField
                  id="manualDescription"
                  label="Descricao"
                  value={manualChargeForm.description}
                  onChange={(event) =>
                    setManualChargeForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Ex.: cobranca de adesao"
                />
                <TextAreaField
                  id="manualNotes"
                  label="Observacoes"
                  value={manualChargeForm.notes}
                  onChange={(value) =>
                    setManualChargeForm((current) => ({
                      ...current,
                      notes: value,
                    }))
                  }
                  placeholder="Notas operacionais opcionais."
                />
                <PrimaryButton disabled={pendingAction === "manual-create"} type="submit">
                  {pendingAction === "manual-create"
                    ? "Criando cobranca..."
                    : "Criar cobranca avulsa"}
                </PrimaryButton>
              </form>
            </section>

            <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Geracao recorrente
                </h2>
                <p className="text-sm leading-6 text-foreground-muted">
                  Execute manualmente a recorrencia por data de referencia.
                  Rodadas repetidas sao seguras e nao duplicam competencia.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end">
                <InputField
                  id="referenceDate"
                  label="Referencia"
                  type="date"
                  value={referenceDate}
                  onChange={(event) => setReferenceDate(event.target.value)}
                />
                <PrimaryButton
                  disabled={pendingAction === "generate-recurring"}
                  onClick={handleRecurringGeneration}
                  type="button"
                >
                  {pendingAction === "generate-recurring"
                    ? "Gerando..."
                    : "Gerar recorrencia"}
                </PrimaryButton>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Filtros operacionais
                  </h2>
                  <p className="text-sm leading-6 text-foreground-muted">
                    Recorte por periodo, status, origem, cliente e plano com
                    exportacao CSV do que estiver visivel.
                  </p>
                </div>
                <SecondaryButton
                  disabled={filteredCharges.length === 0}
                  onClick={handleExportCsv}
                  type="button"
                >
                  Exportar CSV
                </SecondaryButton>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <SelectField
                  id="chargeStatusFilter"
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="open">Aberta</option>
                  <option value="paid">Paga</option>
                  <option value="canceled">Cancelada</option>
                  <option value="replaced">Substituida</option>
                  <option value="expired">Expirada</option>
                </SelectField>
                <SelectField
                  id="chargeOriginFilter"
                  label="Origem"
                  value={originFilter}
                  onChange={(event) => setOriginFilter(event.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="manual">Manual</option>
                  <option value="recurring">Recorrente</option>
                </SelectField>
                <SelectField
                  id="chargeCustomerFilter"
                  label="Cliente"
                  value={customerFilter}
                  onChange={(event) => setCustomerFilter(event.target.value)}
                >
                  <option value="">Todos</option>
                  {wallet.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  id="chargePlanFilter"
                  label="Plano"
                  value={planFilter}
                  onChange={(event) => setPlanFilter(event.target.value)}
                >
                  <option value="">Todos</option>
                  {wallet.plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </SelectField>
                <InputField
                  id="chargeDueDateFrom"
                  label="Vencimento de"
                  type="date"
                  value={dueDateFromFilter}
                  onChange={(event) => setDueDateFromFilter(event.target.value)}
                />
                <InputField
                  id="chargeDueDateTo"
                  label="Vencimento ate"
                  type="date"
                  value={dueDateToFilter}
                  onChange={(event) => setDueDateToFilter(event.target.value)}
                />
              </div>
            </section>

            {replaceForm.chargeId ? (
              <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Substituir cobranca
                  </h2>
                  <p className="text-sm leading-6 text-foreground-muted">
                    A cobranca original vira `replaced` e a nova segue aberta.
                  </p>
                </div>
                <form className="mt-6 space-y-4" onSubmit={handleReplaceSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      id="replaceAmount"
                      label="Novo valor em centavos"
                      inputMode="numeric"
                      value={replaceForm.amountCents}
                      onChange={(event) =>
                        setReplaceForm((current) => ({
                          ...current,
                          amountCents: event.target.value,
                        }))
                      }
                    />
                    <InputField
                      id="replaceDueDate"
                      label="Novo vencimento"
                      type="date"
                      value={replaceForm.dueDate}
                      onChange={(event) =>
                        setReplaceForm((current) => ({
                          ...current,
                          dueDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <TextAreaField
                    id="replaceReason"
                    label="Motivo"
                    value={replaceForm.reason}
                    onChange={(value) =>
                      setReplaceForm((current) => ({
                        ...current,
                        reason: value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-3">
                    <PrimaryButton
                      disabled={pendingAction === `replace-${replaceForm.chargeId}`}
                      type="submit"
                    >
                      {pendingAction === `replace-${replaceForm.chargeId}`
                        ? "Substituindo..."
                        : "Confirmar substituicao"}
                    </PrimaryButton>
                    <SecondaryButton
                      onClick={() => setReplaceForm(emptyReplaceForm())}
                      type="button"
                    >
                      Cancelar
                    </SecondaryButton>
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          {filteredCharges.length === 0 ? (
            <div className="soft-panel rounded-[2rem] border border-white/70 px-6 py-8">
              <h2 className="text-xl font-semibold text-foreground">
                Nenhuma cobranca encontrada
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground-muted">
                Ajuste os filtros ou gere a recorrencia para popular o dashboard.
              </p>
            </div>
          ) : (
            filteredCharges.map((charge) => {
              const events = chargeEventsByChargeId.get(charge.id) ?? [];
              const chargePayment = chargePaymentsByChargeId.get(charge.id) ?? null;
              const messagePreview = messagePreviewByChargeId[charge.id] ?? null;
              const chargeDispatches = dispatchesByChargeId.get(charge.id) ?? [];
              const isOpen = charge.status === "open";
              const canUsePixMessaging = Boolean(chargePayment?.pixCopyPasteCode);
              const reminderDispatchesBySlot = new Map<
                ReminderSlot,
                MessageDispatchRecord
              >();

              for (const dispatch of chargeDispatches) {
                if (
                  dispatch.templateKind === "charge_reminder" &&
                  dispatch.reminderSlot &&
                  !reminderDispatchesBySlot.has(dispatch.reminderSlot)
                ) {
                  reminderDispatchesBySlot.set(dispatch.reminderSlot, dispatch);
                }
              }

              return (
                <article
                  key={charge.id}
                  className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xl font-semibold text-foreground">
                            {charge.customerName ?? charge.customerId}
                          </p>
                          <span className="rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                            {charge.status}
                          </span>
                          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                            {charge.origin}
                          </span>
                        </div>
                        <p className="text-sm text-foreground-muted">
                          {formatCurrency(charge.amountCents)} · vence em{" "}
                          {formatDate(charge.dueDate)}
                        </p>
                        {charge.planName ? (
                          <p className="text-sm text-foreground-muted">{charge.planName}</p>
                        ) : null}
                        {charge.description ? (
                          <p className="text-sm leading-6 text-foreground-muted">
                            {charge.description}
                          </p>
                        ) : null}
                        {charge.notes ? (
                          <p className="text-sm leading-6 text-foreground-muted">
                            {charge.notes}
                          </p>
                        ) : null}
                        {charge.competenceKey ? (
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                            Competencia {charge.competenceKey}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isOpen ? (
                          <PrimaryButton
                            disabled={pendingAction === `pix-${charge.id}`}
                            onClick={() => handleGeneratePix(charge.id)}
                            type="button"
                          >
                            {pendingAction === `pix-${charge.id}`
                              ? "Gerando Pix..."
                              : chargePayment
                                ? "Atualizar Pix"
                                : "Gerar Pix"}
                          </PrimaryButton>
                        ) : null}
                        {isOpen ? (
                          <SecondaryButton
                            disabled={pendingAction === `paid-${charge.id}`}
                            onClick={() =>
                              handleChargeAction(
                                charge.id,
                                {
                                  action: "mark-paid",
                                  occurredAt: new Date().toISOString(),
                                  reason: "Pagamento registrado no painel",
                                },
                                "Cobranca marcada como paga.",
                                `paid-${charge.id}`,
                              )
                            }
                            type="button"
                          >
                            {pendingAction === `paid-${charge.id}`
                              ? "Marcando..."
                              : "Marcar pago"}
                          </SecondaryButton>
                        ) : null}
                        {isOpen ? (
                          <SecondaryButton
                            disabled={pendingAction === `cancel-${charge.id}`}
                            onClick={() =>
                              handleChargeAction(
                                charge.id,
                                {
                                  action: "cancel",
                                  occurredAt: new Date().toISOString(),
                                  reason: "Cancelada no painel operacional",
                                },
                                "Cobranca cancelada.",
                                `cancel-${charge.id}`,
                              )
                            }
                            type="button"
                          >
                            {pendingAction === `cancel-${charge.id}`
                              ? "Cancelando..."
                              : "Cancelar"}
                          </SecondaryButton>
                        ) : null}
                        {isOpen ? (
                          <SecondaryButton onClick={() => startReplace(charge)} type="button">
                            Substituir
                          </SecondaryButton>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[1.5rem] border border-border bg-surface px-4 py-4 text-sm text-foreground-muted">
                        <p className="font-semibold text-foreground">Origem e vinculos</p>
                        <p className="mt-2">Cliente: {charge.customerName ?? charge.customerId}</p>
                        <p>Plano: {charge.planName ?? "Sem plano"}</p>
                        <p>Assinatura: {charge.subscriptionId ?? "Sem assinatura"}</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-border bg-surface px-4 py-4 text-sm text-foreground-muted">
                        <p className="font-semibold text-foreground">Pix</p>
                        {chargePayment ? (
                          <div className="mt-2 space-y-2">
                            <p>
                              Status Pix:{" "}
                              <span className="font-medium text-foreground">
                                {chargePayment.status}
                              </span>
                            </p>
                            <p className="break-all">
                              PSP: {chargePayment.providerPaymentId}
                            </p>
                            {chargePayment.lastSyncedAt ? (
                              <p>
                                Ultima sincronizacao:{" "}
                                {formatDateTime(chargePayment.lastSyncedAt)}
                              </p>
                            ) : null}
                            {chargePayment.expiresAt ? (
                              <p>Expira em {formatDate(chargePayment.expiresAt)}</p>
                            ) : null}
                            {chargePayment.qrCodeBase64 ? (
                              <img
                                alt={`QR Code Pix da cobranca ${charge.id}`}
                                className="h-28 w-28 rounded-2xl border border-border bg-white p-2"
                                src={`data:image/png;base64,${chargePayment.qrCodeBase64}`}
                              />
                            ) : null}
                            {chargePayment.pixCopyPasteCode ? (
                              <>
                                <div className="break-all rounded-2xl border border-border bg-background px-3 py-3 text-xs leading-5 text-foreground">
                                  {chargePayment.pixCopyPasteCode}
                                </div>
                                <SecondaryButton
                                  onClick={() => copyPixCode(chargePayment.pixCopyPasteCode!)}
                                  type="button"
                                >
                                  Copiar codigo Pix
                                </SecondaryButton>
                              </>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-2 leading-6">
                            Nenhum Pix gerado para esta cobranca ainda.
                          </p>
                        )}
                      </div>
                      <div className="rounded-[1.5rem] border border-border bg-surface px-4 py-4 text-sm text-foreground-muted">
                        <p className="font-semibold text-foreground">Historico</p>
                        <div className="mt-2 space-y-2">
                          {events.length === 0 ? (
                            <p>Nenhum evento associado.</p>
                          ) : (
                            events.slice(0, 4).map((event) => (
                              <div key={event.id}>
                                <p className="font-medium text-foreground">
                                  {event.eventType} · {formatDateTime(event.occurredAt)}
                                </p>
                                <p>{event.reason ?? `Status final ${event.toStatus}`}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <section className="rounded-[1.5rem] border border-border bg-surface px-4 py-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground-muted">
                            WhatsApp
                          </p>
                          <h3 className="text-lg font-semibold text-foreground">
                            Preview, envio assistido e reminders
                          </h3>
                          <p className="max-w-2xl text-sm leading-6 text-foreground-muted">
                            Use o deep link para abrir a conversa no WhatsApp sem
                            perder o historico do dispatch. Reminders so ficam
                            abertos enquanto a cobranca segue ativa.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <SecondaryButton
                            disabled={
                              !canUsePixMessaging ||
                              pendingAction === `preview-${charge.id}-charge_initial-none`
                            }
                            onClick={() =>
                              handlePreviewMessage(charge.id, "charge_initial")
                            }
                            type="button"
                          >
                            {pendingAction ===
                            `preview-${charge.id}-charge_initial-none`
                              ? "Carregando preview..."
                              : "Preview cobranca"}
                          </SecondaryButton>
                          <PrimaryButton
                            disabled={
                              !canUsePixMessaging ||
                              pendingAction === `send-${charge.id}-charge_initial-none`
                            }
                            onClick={() =>
                              handleManualSend(charge.id, {
                                templateKind: "charge_initial",
                              })
                            }
                            type="button"
                          >
                            {pendingAction === `send-${charge.id}-charge_initial-none`
                              ? "Abrindo..."
                              : "Abrir cobranca"}
                          </PrimaryButton>
                          {charge.status === "paid" ? (
                            <>
                              <SecondaryButton
                                disabled={
                                  pendingAction ===
                                  `preview-${charge.id}-payment_confirmation-none`
                                }
                                onClick={() =>
                                  handlePreviewMessage(
                                    charge.id,
                                    "payment_confirmation",
                                  )
                                }
                                type="button"
                              >
                                {pendingAction ===
                                `preview-${charge.id}-payment_confirmation-none`
                                  ? "Carregando preview..."
                                  : "Preview confirmacao"}
                              </SecondaryButton>
                              <PrimaryButton
                                disabled={
                                  pendingAction ===
                                  `send-${charge.id}-payment_confirmation-none`
                                }
                                onClick={() =>
                                  handleManualSend(charge.id, {
                                    templateKind: "payment_confirmation",
                                  })
                                }
                                type="button"
                              >
                                {pendingAction ===
                                `send-${charge.id}-payment_confirmation-none`
                                  ? "Abrindo..."
                                  : "Enviar confirmacao"}
                              </PrimaryButton>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {!canUsePixMessaging && charge.status !== "paid" ? (
                        <p className="mt-4 text-sm text-foreground-muted">
                          Gere Pix para habilitar preview e envio assistido desta
                          cobranca.
                        </p>
                      ) : null}

                      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-4">
                          <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4 text-sm text-foreground-muted">
                            <p className="font-semibold text-foreground">
                              Preview atual
                            </p>
                            {messagePreview ? (
                              <div className="mt-3 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground-muted">
                                  {formatTemplateKindLabel(
                                    messagePreview.templateKind,
                                  )}
                                  {messagePreview.reminderSlot
                                    ? ` · ${formatReminderSlotLabel(messagePreview.reminderSlot)}`
                                    : ""}
                                </p>
                                <div className="whitespace-pre-wrap break-words rounded-2xl border border-border bg-surface px-3 py-3 leading-6 text-foreground">
                                  {messagePreview.renderedMessage}
                                </div>
                                <p>
                                  Destino:{" "}
                                  <span className="font-medium text-foreground">
                                    {messagePreview.recipientWhatsappPhone}
                                  </span>
                                </p>
                              </div>
                            ) : (
                              <p className="mt-2 leading-6">
                                Carregue um preview para revisar a mensagem antes
                                de abrir o WhatsApp.
                              </p>
                            )}
                          </div>

                          <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4 text-sm text-foreground-muted">
                            <p className="font-semibold text-foreground">
                              Historico de dispatch
                            </p>
                            <div className="mt-3 space-y-3">
                              {chargeDispatches.length === 0 ? (
                                <p>Nenhum dispatch registrado ainda.</p>
                              ) : (
                                chargeDispatches.slice(0, 4).map((dispatch) => (
                                  <article
                                    key={dispatch.id}
                                    className="rounded-2xl border border-border bg-surface px-3 py-3"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-foreground">
                                        {formatTemplateKindLabel(
                                          dispatch.templateKind,
                                        )}
                                        {dispatch.reminderSlot
                                          ? ` · ${formatReminderSlotLabel(dispatch.reminderSlot)}`
                                          : ""}
                                      </p>
                                      <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                                        {dispatch.status}
                                      </span>
                                    </div>
                                    <p className="mt-2">
                                      Criado em {formatDateTime(dispatch.createdAt)}
                                    </p>
                                    {dispatch.openedAt ? (
                                      <p>
                                        Aberto em {formatDateTime(dispatch.openedAt)}
                                      </p>
                                    ) : null}
                                    {dispatch.canceledAt ? (
                                      <p>
                                        Cancelado em{" "}
                                        {formatDateTime(dispatch.canceledAt)}
                                      </p>
                                    ) : null}
                                  </article>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4 text-sm text-foreground-muted">
                          <p className="font-semibold text-foreground">
                            Reminders por slot
                          </p>
                          <div className="mt-3 space-y-3">
                            {(["d-1", "d0", "d+1"] as ReminderSlot[]).map((slot) => {
                              const dispatch = reminderDispatchesBySlot.get(slot) ?? null;
                              const previewKey = `preview-${charge.id}-charge_reminder-${slot}`;
                              const sendKey = `send-${charge.id}-charge_reminder-${slot}`;

                              return (
                                <article
                                  key={slot}
                                  className="rounded-2xl border border-border bg-surface px-3 py-3"
                                >
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">
                                        Reminder {formatReminderSlotLabel(slot)}
                                      </p>
                                      <p>
                                        Status:{" "}
                                        <span className="font-medium text-foreground">
                                          {dispatch?.status ?? "nao agendado"}
                                        </span>
                                      </p>
                                      {dispatch?.scheduledFor ? (
                                        <p>
                                          Programado para{" "}
                                          {formatDateTime(dispatch.scheduledFor)}
                                        </p>
                                      ) : null}
                                      {dispatch?.openedAt ? (
                                        <p>
                                          Ultima abertura em{" "}
                                          {formatDateTime(dispatch.openedAt)}
                                        </p>
                                      ) : null}
                                      {dispatch?.cancelReason ? (
                                        <p>{dispatch.cancelReason}</p>
                                      ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <SecondaryButton
                                        disabled={!isOpen || !canUsePixMessaging || pendingAction === previewKey}
                                        onClick={() =>
                                          handlePreviewMessage(
                                            charge.id,
                                            "charge_reminder",
                                            slot,
                                          )
                                        }
                                        type="button"
                                      >
                                        {pendingAction === previewKey
                                          ? "Carregando..."
                                          : "Preview"}
                                      </SecondaryButton>
                                      {dispatch?.status === "scheduled" ? (
                                        <PrimaryButton
                                          disabled={!isOpen || !canUsePixMessaging || pendingAction === sendKey}
                                          onClick={() =>
                                            handleManualSend(charge.id, {
                                              templateKind: "charge_reminder",
                                              reminderSlot: slot,
                                              dispatchId: dispatch.id,
                                            })
                                          }
                                          type="button"
                                        >
                                          {pendingAction === sendKey
                                            ? "Abrindo..."
                                            : "Abrir lembrete"}
                                        </PrimaryButton>
                                      ) : null}
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Reconciliacao Pix
                </h2>
                <p className="text-sm leading-6 text-foreground-muted">
                  Compare o estado interno com o PSP e registre divergencias operacionais.
                </p>
              </div>
              <PrimaryButton
                disabled={pendingAction === "manual-reconciliation"}
                onClick={handleManualReconciliation}
                type="button"
              >
                {pendingAction === "manual-reconciliation"
                  ? "Reconciliando..."
                  : "Rodar reconciliacao"}
              </PrimaryButton>
            </div>

            <div className="mt-6 space-y-3">
              {paymentsSnapshot.reconciliationRuns.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  Nenhuma reconciliacao executada ainda.
                </p>
              ) : (
                paymentsSnapshot.reconciliationRuns.slice(0, 4).map((run) => (
                  <article
                    key={run.id}
                    className="rounded-[1.5rem] border border-border bg-surface px-4 py-4 text-sm text-foreground-muted"
                  >
                    <p className="font-semibold text-foreground">
                      {formatDateTime(run.finishedAt)} · {run.trigger}
                    </p>
                    <p className="mt-2">
                      {run.updatedCount} atualizacoes, {run.divergenceCount} divergencias,{" "}
                      {run.failedCount} falhas.
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Inbox PSP e falhas
              </h2>
              <p className="text-sm leading-6 text-foreground-muted">
                Priorize eventos falhos e reaplique o processamento sem sair do
                dashboard operacional.
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <article className="rounded-[1.5rem] border border-border bg-surface px-4 py-4 text-sm text-foreground-muted">
                <p className="font-semibold text-foreground">Pendentes</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {providerEventSummary.pending}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-border bg-surface px-4 py-4 text-sm text-foreground-muted">
                <p className="font-semibold text-foreground">Processados</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {providerEventSummary.processed}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-border bg-surface px-4 py-4 text-sm text-foreground-muted">
                <p className="font-semibold text-foreground">Falhos</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {providerEventSummary.failed}
                </p>
              </article>
            </div>

            <div className="mt-6 space-y-3">
              {paymentsSnapshot.providerEvents.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  Nenhum evento Pix recebido ainda.
                </p>
              ) : (
                (failedProviderEvents.length > 0
                  ? failedProviderEvents
                  : paymentsSnapshot.providerEvents
                )
                  .slice(0, 6)
                  .map((event) => (
                  <article
                    key={event.id}
                    className="rounded-[1.5rem] border border-border bg-surface px-4 py-4 text-sm text-foreground-muted"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">
                            {event.eventType}
                          </p>
                          <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                            {event.processingStatus}
                          </span>
                        </div>
                        <p className="break-all">Evento: {event.providerEventId}</p>
                        {event.processingSummary ? (
                          <p>{event.processingSummary}</p>
                        ) : null}
                        <p>Recebido em {formatDateTime(event.createdAt)}</p>
                      </div>
                      {event.processingStatus === "failed" ? (
                        <PrimaryButton
                          disabled={pendingAction === `replay-${event.providerEventId}`}
                          onClick={() => handleReplayProviderEvent(event.providerEventId)}
                          type="button"
                        >
                          {pendingAction === `replay-${event.providerEventId}`
                            ? "Reprocessando..."
                            : "Reprocessar"}
                        </PrimaryButton>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
