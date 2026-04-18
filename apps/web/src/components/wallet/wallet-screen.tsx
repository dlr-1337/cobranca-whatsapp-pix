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

interface ConsentRecord {
  id: string;
  tenantId: string;
  customerId: string;
  channel: "whatsapp" | "email";
  status: "opted-in" | "opted-out";
  evidence: string;
  effectiveAt: string;
  actorUserId: string | null;
  actorEmail: string | null;
}

interface CustomerRecord {
  id: string;
  tenantId: string;
  name: string;
  whatsappPhoneDisplay: string;
  whatsappPhoneNormalized: string;
  notes: string | null;
  status: string;
  latestConsentByChannel: {
    whatsapp: ConsentRecord | null;
    email: ConsentRecord | null;
  };
}

interface BillingPlanRecord {
  id: string;
  tenantId: string;
  name: string;
  amountCents: number;
  billingInterval: string;
  defaultDueDay: number;
  messageTemplate: string | null;
  reminderProfile: string;
  status: string;
}

interface SubscriptionRecord {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  status: "active" | "paused" | "canceled";
  anchorDueDay: number;
  nextCycleStart: string;
  overrideAmountCents: number | null;
  overrideDueDay: number | null;
  lastTransitionReason: string | null;
}

interface WalletSnapshot {
  customers: CustomerRecord[];
  consentEvents: ConsentRecord[];
  plans: BillingPlanRecord[];
  subscriptions: SubscriptionRecord[];
}

interface CustomerFormState {
  name: string;
  whatsappPhone: string;
  notes: string;
  status: string;
}

interface ConsentFormState {
  customerId: string;
  channel: "whatsapp" | "email";
  status: "opted-in" | "opted-out";
  evidence: string;
  effectiveAt: string;
}

interface PlanFormState {
  name: string;
  amountCents: string;
  billingInterval: string;
  defaultDueDay: string;
  messageTemplate: string;
  reminderProfile: string;
  status: string;
}

interface SubscriptionFormState {
  customerId: string;
  planId: string;
  startDate: string;
  nextCycleStart: string;
  anchorDueDay: string;
  overrideAmountCents: string;
  overrideDueDay: string;
  transitionReason: string;
}

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: "",
  whatsappPhone: "",
  notes: "",
  status: "active",
};

const EMPTY_PLAN_FORM: PlanFormState = {
  name: "",
  amountCents: "",
  billingInterval: "monthly",
  defaultDueDay: "5",
  messageTemplate: "",
  reminderProfile: "manual",
  status: "draft",
};

function currentDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function currentDateTimeInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function emptyConsentForm(customerId = ""): ConsentFormState {
  return {
    customerId,
    channel: "whatsapp",
    status: "opted-in",
    evidence: "",
    effectiveAt: currentDateTimeInputValue(),
  };
}

function emptySubscriptionForm(customerId = "", planId = ""): SubscriptionFormState {
  const today = currentDateInputValue();

  return {
    customerId,
    planId,
    startDate: today,
    nextCycleStart: today,
    anchorDueDay: "5",
    overrideAmountCents: "",
    overrideDueDay: "",
    transitionReason: "",
  };
}

function formatCurrency(amountCents: number | null) {
  if (amountCents === null) {
    return "Sem override";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

async function readJson(response: Response) {
  return (await response.json().catch(() => null)) as
    | { message?: string; code?: string }
    | WalletSnapshot
    | CustomerRecord
    | ConsentRecord
    | BillingPlanRecord
    | SubscriptionRecord
    | null;
}

function messageFromPayload(payload: Awaited<ReturnType<typeof readJson>>) {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }

  return typeof payload.message === "string" ? payload.message : null;
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
        value={props.value}
        placeholder={props.placeholder}
        rows={4}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-foreground-muted/80 focus:border-accent focus:accent-ring"
      />
    </label>
  );
}

export function WalletScreen() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"loading" | "ready" | "expired">(
    "loading",
  );
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [consentForm, setConsentForm] = useState<ConsentFormState>(emptyConsentForm());
  const [planForm, setPlanForm] = useState<PlanFormState>(EMPTY_PLAN_FORM);
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionFormState>(
    emptySubscriptionForm(),
  );

  const customerNameById = useMemo(
    () =>
      new Map((wallet?.customers ?? []).map((customer) => [customer.id, customer.name])),
    [wallet?.customers],
  );
  const planNameById = useMemo(
    () => new Map((wallet?.plans ?? []).map((plan) => [plan.id, plan.name])),
    [wallet?.plans],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (!sessionResponse.ok) {
        if (!cancelled) {
          setLoadState("expired");
        }
        return;
      }

      const sessionPayload = (await sessionResponse.json()) as SessionPayload;
      const walletResponse = await fetch("/api/wallet/current", {
        cache: "no-store",
      });

      if (!walletResponse.ok) {
        if (!cancelled) {
          if (walletResponse.status === 401) {
            setLoadState("expired");
          } else {
            setMessage({
              tone: "danger",
              text: "Nao foi possivel carregar a carteira agora.",
            });
            setLoadState("ready");
          }
        }
        return;
      }

      const walletPayload = (await walletResponse.json()) as WalletSnapshot;

      if (cancelled) {
        return;
      }

      setSession(sessionPayload);
      setWallet(walletPayload);
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

    const nextCustomerId =
      wallet.customers.find((customer) => customer.id === consentForm.customerId)?.id ??
      wallet.customers[0]?.id ??
      "";
    const nextSubscriptionCustomerId =
      wallet.customers.find((customer) => customer.id === subscriptionForm.customerId)?.id ??
      wallet.customers[0]?.id ??
      "";
    const nextPlanId =
      wallet.plans.find((plan) => plan.id === subscriptionForm.planId)?.id ??
      wallet.plans[0]?.id ??
      "";

    setConsentForm((current) =>
      current.customerId === nextCustomerId
        ? current
        : { ...current, customerId: nextCustomerId },
    );
    setSubscriptionForm((current) =>
      current.customerId === nextSubscriptionCustomerId && current.planId === nextPlanId
        ? current
        : {
            ...current,
            customerId: nextSubscriptionCustomerId,
            planId: nextPlanId,
          },
    );
  }, [wallet, consentForm.customerId, subscriptionForm.customerId, subscriptionForm.planId]);

  async function refreshWallet() {
    const response = await fetch("/api/wallet/current", {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as WalletSnapshot | null;

    if (!response.ok || !payload) {
      if (response.status === 401) {
        setLoadState("expired");
      }
      throw new Error("refresh_failed");
    }

    setWallet(payload);
  }

  async function runAction(
    key: string,
    action: () => Promise<void>,
  ) {
    setPendingAction(key);
    setMessage(null);

    try {
      await action();
    } finally {
      setPendingAction(null);
    }
  }

  function handleLogout() {
    void runAction("logout", async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/entrar");
      router.refresh();
    });
  }

  function handleCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void runAction("customer-create", async () => {
      const response = await fetch("/api/wallet/customers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: customerForm.name,
          whatsappPhone: customerForm.whatsappPhone,
          notes: customerForm.notes.trim() || null,
          status: customerForm.status,
        }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setMessage({
          tone: "danger",
          text: messageFromPayload(payload) ?? "Nao foi possivel cadastrar o cliente agora.",
        });
        return;
      }

      setCustomerForm(EMPTY_CUSTOMER_FORM);
      await refreshWallet();
      setMessage({
        tone: "success",
        text: "Cliente salvo na carteira.",
      });
    });
  }

  function handleConsentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!consentForm.customerId) {
      setMessage({
        tone: "danger",
        text: "Selecione um cliente para registrar o consentimento.",
      });
      return;
    }

    void runAction("consent-create", async () => {
      const response = await fetch(
        `/api/wallet/customers/${consentForm.customerId}/consent-events`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            channel: consentForm.channel,
            status: consentForm.status,
            evidence: consentForm.evidence,
            effectiveAt: new Date(consentForm.effectiveAt).toISOString(),
          }),
        },
      );
      const payload = await readJson(response);

      if (!response.ok) {
        setMessage({
          tone: "danger",
          text:
            messageFromPayload(payload) ??
            "Nao foi possivel registrar o consentimento agora.",
        });
        return;
      }

      setConsentForm(emptyConsentForm(consentForm.customerId));
      await refreshWallet();
      setMessage({
        tone: "success",
        text: "Consentimento registrado no historico append-only.",
      });
    });
  }

  function handlePlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void runAction("plan-create", async () => {
      const response = await fetch("/api/wallet/plans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: planForm.name,
          amountCents: Number(planForm.amountCents),
          billingInterval: planForm.billingInterval,
          defaultDueDay: Number(planForm.defaultDueDay),
          messageTemplate: planForm.messageTemplate.trim() || null,
          reminderProfile: planForm.reminderProfile,
          status: planForm.status,
        }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setMessage({
          tone: "danger",
          text: messageFromPayload(payload) ?? "Nao foi possivel salvar o plano agora.",
        });
        return;
      }

      setPlanForm(EMPTY_PLAN_FORM);
      await refreshWallet();
      setMessage({
        tone: "success",
        text: "Plano salvo no catalogo recorrente.",
      });
    });
  }

  function handleSubscriptionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subscriptionForm.customerId || !subscriptionForm.planId) {
      setMessage({
        tone: "danger",
        text: "Selecione cliente e plano antes de criar a assinatura.",
      });
      return;
    }

    void runAction("subscription-create", async () => {
      const response = await fetch("/api/wallet/subscriptions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          customerId: subscriptionForm.customerId,
          planId: subscriptionForm.planId,
          startDate: `${subscriptionForm.startDate}T00:00:00.000Z`,
          nextCycleStart: `${subscriptionForm.nextCycleStart}T00:00:00.000Z`,
          anchorDueDay: Number(subscriptionForm.anchorDueDay),
          overrideAmountCents: subscriptionForm.overrideAmountCents
            ? Number(subscriptionForm.overrideAmountCents)
            : null,
          overrideDueDay: subscriptionForm.overrideDueDay
            ? Number(subscriptionForm.overrideDueDay)
            : null,
          transitionReason: subscriptionForm.transitionReason.trim() || null,
        }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setMessage({
          tone: "danger",
          text: messageFromPayload(payload) ?? "Nao foi possivel criar a assinatura agora.",
        });
        return;
      }

      setSubscriptionForm(
        emptySubscriptionForm(
          subscriptionForm.customerId,
          subscriptionForm.planId,
        ),
      );
      await refreshWallet();
      setMessage({
        tone: "success",
        text: "Assinatura criada com historico inicial.",
      });
    });
  }

  function handleSubscriptionAction(
    subscriptionId: string,
    action: "pause" | "reactivate" | "cancel",
  ) {
    const reasonByAction = {
      pause: "Pausa manual registrada no painel.",
      reactivate: "Reativacao manual registrada no painel.",
      cancel: "Cancelamento manual registrado no painel.",
    } as const;

    void runAction(`subscription-${action}-${subscriptionId}`, async () => {
      const response = await fetch(`/api/wallet/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action,
          effectiveAt: new Date().toISOString(),
          reason: reasonByAction[action],
        }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        setMessage({
          tone: "danger",
          text:
            messageFromPayload(payload) ??
            "Nao foi possivel atualizar a assinatura agora.",
        });
        return;
      }

      await refreshWallet();
      setMessage({
        tone: "success",
        text: "Assinatura atualizada com novo evento de lifecycle.",
      });
    });
  }

  if (loadState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="soft-panel w-full max-w-xl rounded-[2rem] border border-white/70 px-6 py-7 text-sm text-foreground-muted">
          Carregando carteira e catalogo recorrente...
        </div>
      </div>
    );
  }

  if (loadState === "expired" || !session || !wallet) {
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
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="soft-panel flex flex-col gap-4 rounded-[2rem] border border-white/70 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Carteira recorrente
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
              <span className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
                Carteira
              </span>
              <Link
                href="/painel/configuracoes"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Configuracoes
              </Link>
              <Link
                href="/painel/cobrancas"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Cobrancas
              </Link>
              <Link
                href="/painel/auditoria"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Auditoria
              </Link>
            </nav>
            <p className="max-w-3xl text-sm leading-6 text-foreground-muted">
              Cadastre clientes, capture consentimento append-only, monte o
              catalogo recorrente e controle assinaturas antes da automacao
              completa por WhatsApp e Pix.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground-muted">
              <span className="font-semibold text-foreground">
                {session.user.email}
              </span>
            </div>
            <SecondaryButton
              disabled={pendingAction === "logout"}
              onClick={handleLogout}
            >
              {pendingAction === "logout" ? "Saindo..." : "Sair"}
            </SecondaryButton>
          </div>
        </header>

        {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <article className="soft-panel rounded-[1.75rem] border border-white/70 px-5 py-5">
            <p className="text-sm text-foreground-muted">Clientes</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {wallet.customers.length}
            </p>
          </article>
          <article className="soft-panel rounded-[1.75rem] border border-white/70 px-5 py-5">
            <p className="text-sm text-foreground-muted">Consentimentos</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {wallet.consentEvents.length}
            </p>
          </article>
          <article className="soft-panel rounded-[1.75rem] border border-white/70 px-5 py-5">
            <p className="text-sm text-foreground-muted">Planos</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {wallet.plans.length}
            </p>
          </article>
          <article className="soft-panel rounded-[1.75rem] border border-white/70 px-5 py-5">
            <p className="text-sm text-foreground-muted">Assinaturas</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {wallet.subscriptions.length}
            </p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Clientes da carteira
                </h2>
                <p className="text-sm leading-6 text-foreground-muted">
                  Todo cliente fica tenant-scoped e o telefone e normalizado
                  no backend antes da cobranca.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleCustomerSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    id="customerName"
                    label="Nome do cliente"
                    value={customerForm.name}
                    onChange={(event) =>
                      setCustomerForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <InputField
                    id="customerPhone"
                    label="WhatsApp"
                    value={customerForm.whatsappPhone}
                    onChange={(event) =>
                      setCustomerForm((current) => ({
                        ...current,
                        whatsappPhone: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_0.45fr]">
                  <TextAreaField
                    id="customerNotes"
                    label="Notas operacionais"
                    value={customerForm.notes}
                    onChange={(value) =>
                      setCustomerForm((current) => ({
                        ...current,
                        notes: value,
                      }))
                    }
                    placeholder="Preferencias do atendimento e contexto manual."
                  />
                  <SelectField
                    id="customerStatus"
                    label="Status"
                    value={customerForm.status}
                    onChange={(event) =>
                      setCustomerForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="delinquent">Delinquente</option>
                    <option value="blocked">Bloqueado</option>
                    <option value="canceled">Cancelado</option>
                  </SelectField>
                </div>
                <PrimaryButton
                  disabled={pendingAction === "customer-create"}
                  type="submit"
                >
                  {pendingAction === "customer-create"
                    ? "Salvando cliente..."
                    : "Adicionar cliente"}
                </PrimaryButton>
              </form>

              <div className="mt-6 space-y-3">
                {wallet.customers.length === 0 ? (
                  <Banner>Nenhum cliente cadastrado ainda.</Banner>
                ) : (
                  wallet.customers.map((customer) => (
                    <article
                      key={customer.id}
                      className="rounded-[1.5rem] border border-border bg-surface px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-foreground">
                              {customer.name}
                            </p>
                            <span className="rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                              {customer.status}
                            </span>
                          </div>
                          <p className="text-sm text-foreground-muted">
                            {customer.whatsappPhoneDisplay} ·{" "}
                            <span className="font-mono text-xs">
                              {customer.whatsappPhoneNormalized}
                            </span>
                          </p>
                          {customer.notes ? (
                            <p className="text-sm leading-6 text-foreground-muted">
                              {customer.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="grid gap-2 text-sm text-foreground-muted md:min-w-[17rem]">
                          <p>
                            WhatsApp:{" "}
                            <span className="font-semibold text-foreground">
                              {customer.latestConsentByChannel.whatsapp?.status ?? "sem evento"}
                            </span>
                          </p>
                          <p>
                            Email:{" "}
                            <span className="font-semibold text-foreground">
                              {customer.latestConsentByChannel.email?.status ?? "sem evento"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Consentimento por canal
                </h2>
                <p className="text-sm leading-6 text-foreground-muted">
                  O estado atual e derivado de eventos append-only. Nunca existe
                  update in-place do consentimento.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleConsentSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="consentCustomer"
                    label="Cliente"
                    value={consentForm.customerId}
                    onChange={(event) =>
                      setConsentForm((current) => ({
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
                  <InputField
                    id="consentEffectiveAt"
                    label="Momento efetivo"
                    type="datetime-local"
                    value={consentForm.effectiveAt}
                    onChange={(event) =>
                      setConsentForm((current) => ({
                        ...current,
                        effectiveAt: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="consentChannel"
                    label="Canal"
                    value={consentForm.channel}
                    onChange={(event) =>
                      setConsentForm((current) => ({
                        ...current,
                        channel: event.target.value as "whatsapp" | "email",
                      }))
                    }
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </SelectField>
                  <SelectField
                    id="consentStatus"
                    label="Status"
                    value={consentForm.status}
                    onChange={(event) =>
                      setConsentForm((current) => ({
                        ...current,
                        status: event.target.value as "opted-in" | "opted-out",
                      }))
                    }
                  >
                    <option value="opted-in">Opt-in</option>
                    <option value="opted-out">Opt-out</option>
                  </SelectField>
                </div>
                <TextAreaField
                  id="consentEvidence"
                  label="Evidencia"
                  value={consentForm.evidence}
                  onChange={(value) =>
                    setConsentForm((current) => ({
                      ...current,
                      evidence: value,
                    }))
                  }
                  placeholder="Contexto do aceite manual e como ele foi obtido."
                />
                <PrimaryButton
                  disabled={pendingAction === "consent-create"}
                  type="submit"
                >
                  {pendingAction === "consent-create"
                    ? "Registrando..."
                    : "Registrar consentimento"}
                </PrimaryButton>
              </form>

              <div className="mt-6 space-y-3">
                {wallet.consentEvents.length === 0 ? (
                  <Banner>Nenhum consentimento registrado ainda.</Banner>
                ) : (
                  wallet.consentEvents.slice(0, 8).map((eventItem) => (
                    <article
                      key={eventItem.id}
                      className="rounded-[1.5rem] border border-border bg-surface px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="text-base font-semibold text-foreground">
                            {customerNameById.get(eventItem.customerId) ?? eventItem.customerId}
                          </p>
                          <p className="text-sm text-foreground-muted">
                            {eventItem.channel} · {eventItem.status}
                          </p>
                          <p className="text-sm leading-6 text-foreground-muted">
                            {eventItem.evidence}
                          </p>
                        </div>
                        <div className="text-sm text-foreground-muted">
                          {formatDateTime(eventItem.effectiveAt)}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Catalogo recorrente
                </h2>
                <p className="text-sm leading-6 text-foreground-muted">
                  O plano define periodicidade, vencimento base e perfil de
                  reminder manual ou padrao.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handlePlanSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    id="planName"
                    label="Nome do plano"
                    value={planForm.name}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <InputField
                    id="planAmount"
                    label="Valor em centavos"
                    inputMode="numeric"
                    value={planForm.amountCents}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        amountCents: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <SelectField
                    id="planInterval"
                    label="Intervalo"
                    value={planForm.billingInterval}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        billingInterval: event.target.value,
                      }))
                    }
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </SelectField>
                  <SelectField
                    id="planDueDay"
                    label="Vencimento base"
                    value={planForm.defaultDueDay}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        defaultDueDay: event.target.value,
                      }))
                    }
                  >
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={String(day)}>
                        Dia {day}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    id="planReminder"
                    label="Perfil de reminder"
                    value={planForm.reminderProfile}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        reminderProfile: event.target.value,
                      }))
                    }
                  >
                    <option value="manual">Manual</option>
                    <option value="standard">Padrao</option>
                  </SelectField>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_0.45fr]">
                  <TextAreaField
                    id="planTemplate"
                    label="Template de mensagem"
                    value={planForm.messageTemplate}
                    onChange={(value) =>
                      setPlanForm((current) => ({
                        ...current,
                        messageTemplate: value,
                      }))
                    }
                    placeholder="Ola {{customerName}}, segue sua cobranca Pix."
                  />
                  <SelectField
                    id="planStatus"
                    label="Status"
                    value={planForm.status}
                    onChange={(event) =>
                      setPlanForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Ativo</option>
                    <option value="archived">Arquivado</option>
                  </SelectField>
                </div>
                <PrimaryButton disabled={pendingAction === "plan-create"} type="submit">
                  {pendingAction === "plan-create" ? "Salvando plano..." : "Adicionar plano"}
                </PrimaryButton>
              </form>

              <div className="mt-6 space-y-3">
                {wallet.plans.length === 0 ? (
                  <Banner>Nenhum plano cadastrado ainda.</Banner>
                ) : (
                  wallet.plans.map((plan) => (
                    <article
                      key={plan.id}
                      className="rounded-[1.5rem] border border-border bg-surface px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-foreground">
                              {plan.name}
                            </p>
                            <span className="rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                              {plan.status}
                            </span>
                          </div>
                          <p className="text-sm text-foreground-muted">
                            {formatCurrency(plan.amountCents)} · {plan.billingInterval} · dia{" "}
                            {plan.defaultDueDay}
                          </p>
                          <p className="text-sm text-foreground-muted">
                            Reminder {plan.reminderProfile}
                          </p>
                          {plan.messageTemplate ? (
                            <p className="text-sm leading-6 text-foreground-muted">
                              {plan.messageTemplate}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Assinaturas
                </h2>
                <p className="text-sm leading-6 text-foreground-muted">
                  Crie a relacao cliente-plano e controle o lifecycle manual com
                  trilha append-only de eventos.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubscriptionSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    id="subscriptionCustomer"
                    label="Cliente"
                    value={subscriptionForm.customerId}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
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
                    id="subscriptionPlan"
                    label="Plano"
                    value={subscriptionForm.planId}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        planId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {wallet.plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <InputField
                    id="subscriptionStartDate"
                    label="Inicio"
                    type="date"
                    value={subscriptionForm.startDate}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                  />
                  <InputField
                    id="subscriptionNextCycle"
                    label="Proximo ciclo"
                    type="date"
                    value={subscriptionForm.nextCycleStart}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        nextCycleStart: event.target.value,
                      }))
                    }
                  />
                  <SelectField
                    id="subscriptionAnchor"
                    label="Dia ancora"
                    value={subscriptionForm.anchorDueDay}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        anchorDueDay: event.target.value,
                      }))
                    }
                  >
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={String(day)}>
                        Dia {day}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    id="subscriptionAmountOverride"
                    label="Override em centavos"
                    inputMode="numeric"
                    value={subscriptionForm.overrideAmountCents}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        overrideAmountCents: event.target.value,
                      }))
                    }
                  />
                  <InputField
                    id="subscriptionDueOverride"
                    label="Override do vencimento"
                    inputMode="numeric"
                    value={subscriptionForm.overrideDueDay}
                    onChange={(event) =>
                      setSubscriptionForm((current) => ({
                        ...current,
                        overrideDueDay: event.target.value,
                      }))
                    }
                  />
                </div>
                <TextAreaField
                  id="subscriptionReason"
                  label="Motivo inicial"
                  value={subscriptionForm.transitionReason}
                  onChange={(value) =>
                    setSubscriptionForm((current) => ({
                      ...current,
                      transitionReason: value,
                    }))
                  }
                  placeholder="Contexto de fechamento manual ou ajuste inicial."
                />
                <PrimaryButton
                  disabled={pendingAction === "subscription-create"}
                  type="submit"
                >
                  {pendingAction === "subscription-create"
                    ? "Criando assinatura..."
                    : "Adicionar assinatura"}
                </PrimaryButton>
              </form>

              <div className="mt-6 space-y-3">
                {wallet.subscriptions.length === 0 ? (
                  <Banner>Nenhuma assinatura cadastrada ainda.</Banner>
                ) : (
                  wallet.subscriptions.map((subscription) => (
                    <article
                      key={subscription.id}
                      className="rounded-[1.5rem] border border-border bg-surface px-4 py-4"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-foreground">
                                {customerNameById.get(subscription.customerId) ??
                                  subscription.customerId}
                              </p>
                              <span className="rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                                {subscription.status}
                              </span>
                            </div>
                            <p className="text-sm text-foreground-muted">
                              {planNameById.get(subscription.planId) ?? subscription.planId}
                            </p>
                            <p className="text-sm text-foreground-muted">
                              Proximo ciclo em {formatDate(subscription.nextCycleStart)} · dia{" "}
                              {subscription.anchorDueDay}
                            </p>
                            <p className="text-sm text-foreground-muted">
                              Valor override: {formatCurrency(subscription.overrideAmountCents)}
                            </p>
                            {subscription.lastTransitionReason ? (
                              <p className="text-sm leading-6 text-foreground-muted">
                                {subscription.lastTransitionReason}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {subscription.status === "active" ? (
                              <SecondaryButton
                                disabled={
                                  pendingAction ===
                                  `subscription-pause-${subscription.id}`
                                }
                                onClick={() =>
                                  handleSubscriptionAction(subscription.id, "pause")
                                }
                                type="button"
                              >
                                {pendingAction === `subscription-pause-${subscription.id}`
                                  ? "Pausando..."
                                  : "Pausar"}
                              </SecondaryButton>
                            ) : null}
                            {subscription.status === "paused" ? (
                              <SecondaryButton
                                disabled={
                                  pendingAction ===
                                  `subscription-reactivate-${subscription.id}`
                                }
                                onClick={() =>
                                  handleSubscriptionAction(subscription.id, "reactivate")
                                }
                                type="button"
                              >
                                {pendingAction === `subscription-reactivate-${subscription.id}`
                                  ? "Reativando..."
                                  : "Reativar"}
                              </SecondaryButton>
                            ) : null}
                            {subscription.status !== "canceled" ? (
                              <SecondaryButton
                                disabled={
                                  pendingAction ===
                                  `subscription-cancel-${subscription.id}`
                                }
                                onClick={() =>
                                  handleSubscriptionAction(subscription.id, "cancel")
                                }
                                type="button"
                              >
                                {pendingAction === `subscription-cancel-${subscription.id}`
                                  ? "Cancelando..."
                                  : "Cancelar"}
                              </SecondaryButton>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
