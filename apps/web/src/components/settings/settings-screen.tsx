"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";

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
    primaryEmail: string;
    whatsappPhone: string;
    timezone: string;
    defaultDueDay: number;
    whatsappTemplateChargeInitial: string;
    whatsappTemplateReminder: string;
    whatsappTemplatePaymentConfirmation: string;
    reminderWindowStartHour: number;
    reminderWindowEndHour: number;
  };
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface SettingsFormState {
  businessName: string;
  primaryEmail: string;
  whatsappPhone: string;
  timezone: string;
  defaultDueDay: string;
  whatsappTemplateChargeInitial: string;
  whatsappTemplateReminder: string;
  whatsappTemplatePaymentConfirmation: string;
  reminderWindowStartHour: string;
  reminderWindowEndHour: string;
}

const EMPTY_FORM: SettingsFormState = {
  businessName: "",
  primaryEmail: "",
  whatsappPhone: "",
  timezone: "America/Sao_Paulo",
  defaultDueDay: "5",
  whatsappTemplateChargeInitial: "",
  whatsappTemplateReminder: "",
  whatsappTemplatePaymentConfirmation: "",
  reminderWindowStartHour: "9",
  reminderWindowEndHour: "18",
};

const COMMERCIAL_WINDOW_HOURS = Array.from({ length: 24 }, (_, index) => {
  const hour = String(index).padStart(2, "0");
  return {
    value: String(index),
    label: `${hour}:00`,
  };
});

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
        rows={5}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        className="rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-foreground-muted/80 focus:border-accent focus:accent-ring"
      />
    </label>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"loading" | "ready" | "expired">(
    "loading",
  );
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [formState, setFormState] = useState<SettingsFormState>(EMPTY_FORM);
  const [savedSnapshot, setSavedSnapshot] =
    useState<SettingsFormState>(EMPTY_FORM);
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();

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
      const settingsResponse = await fetch("/api/tenant-settings/current", {
        cache: "no-store",
      });

      if (!settingsResponse.ok) {
        if (!cancelled) {
          setLoadState("expired");
        }
        return;
      }

      const settingsPayload =
        (await settingsResponse.json()) as SessionPayload["tenant"];
      const nextState: SettingsFormState = {
        businessName: settingsPayload.businessName,
        primaryEmail: settingsPayload.primaryEmail,
        whatsappPhone: settingsPayload.whatsappPhone,
        timezone: settingsPayload.timezone,
        defaultDueDay: String(settingsPayload.defaultDueDay),
        whatsappTemplateChargeInitial:
          settingsPayload.whatsappTemplateChargeInitial,
        whatsappTemplateReminder: settingsPayload.whatsappTemplateReminder,
        whatsappTemplatePaymentConfirmation:
          settingsPayload.whatsappTemplatePaymentConfirmation,
        reminderWindowStartHour: String(settingsPayload.reminderWindowStartHour),
        reminderWindowEndHour: String(settingsPayload.reminderWindowEndHour),
      };

      if (cancelled) {
        return;
      }

      setSession(sessionPayload);
      setFormState(nextState);
      setSavedSnapshot(nextState);
      setLoadState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(savedSnapshot),
    [formState, savedSnapshot],
  );

  function updateField<Key extends keyof SettingsFormState>(
    key: Key,
    value: SettingsFormState[Key],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startSaveTransition(async () => {
      const response = await fetch("/api/tenant-settings/current", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          businessName: formState.businessName,
          primaryEmail: formState.primaryEmail,
          whatsappPhone: formState.whatsappPhone,
          timezone: formState.timezone,
          defaultDueDay: Number(formState.defaultDueDay),
          whatsappTemplateChargeInitial: formState.whatsappTemplateChargeInitial,
          whatsappTemplateReminder: formState.whatsappTemplateReminder,
          whatsappTemplatePaymentConfirmation:
            formState.whatsappTemplatePaymentConfirmation,
          reminderWindowStartHour: Number(formState.reminderWindowStartHour),
          reminderWindowEndHour: Number(formState.reminderWindowEndHour),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | SessionPayload["tenant"]
        | null;

      if (!response.ok) {
        setMessage({
          tone: "danger",
          text:
            (payload as { message?: string } | null)?.message ??
            "Nao foi possivel concluir esta acao agora. Revise os dados e tente novamente.",
        });
        return;
      }

      const savedTenant = payload as SessionPayload["tenant"];
      const savedState: SettingsFormState = {
        businessName: savedTenant.businessName,
        primaryEmail: savedTenant.primaryEmail,
        whatsappPhone: savedTenant.whatsappPhone,
        timezone: savedTenant.timezone,
        defaultDueDay: String(savedTenant.defaultDueDay),
        whatsappTemplateChargeInitial: savedTenant.whatsappTemplateChargeInitial,
        whatsappTemplateReminder: savedTenant.whatsappTemplateReminder,
        whatsappTemplatePaymentConfirmation:
          savedTenant.whatsappTemplatePaymentConfirmation,
        reminderWindowStartHour: String(savedTenant.reminderWindowStartHour),
        reminderWindowEndHour: String(savedTenant.reminderWindowEndHour),
      };

      setFormState(savedState);
      setSavedSnapshot(savedState);
      setSession((current) =>
        current
          ? {
              ...current,
              tenant: {
                ...current.tenant,
                ...savedState,
                defaultDueDay: Number(savedState.defaultDueDay),
                reminderWindowStartHour: Number(
                  savedState.reminderWindowStartHour,
                ),
                reminderWindowEndHour: Number(savedState.reminderWindowEndHour),
              },
            }
          : current,
      );
      setMessage({
        tone: "success",
        text: "Configuracoes salvas com sucesso.",
      });
    });
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/entrar");
      router.refresh();
    });
  }

  if (loadState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="soft-panel w-full max-w-xl rounded-[2rem] border border-white/70 px-6 py-7 text-sm text-foreground-muted">
          Carregando contexto da empresa...
        </div>
      </div>
    );
  }

  if (loadState === "expired" || !session) {
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
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="soft-panel flex flex-col gap-4 rounded-[2rem] border border-white/70 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Empresa atual
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground-muted">
                CobraZap
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
              <Link
                href="/painel/cobrancas"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Cobrancas
              </Link>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
                Configuracoes
              </span>
              <Link
                href="/painel/auditoria"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Auditoria
              </Link>
            </nav>
            <p className="max-w-2xl text-sm leading-6 text-foreground-muted">
              Ajuste os dados operacionais da empresa, o vencimento padrao e os
              templates que sustentam o envio assistido de cobrancas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground-muted">
              <span className="font-semibold text-foreground">
                {session.user.email}
              </span>
            </div>
            <SecondaryButton disabled={isLoggingOut} onClick={handleLogout}>
              {isLoggingOut ? "Saindo..." : "Sair"}
            </SecondaryButton>
          </div>
        </header>

        <form className="space-y-6" onSubmit={handleSave}>
          <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Dados da empresa
              </h2>
              <p className="text-sm leading-6 text-foreground-muted">
                Esta alteracao entra na trilha de auditoria.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InputField
                id="businessName"
                label="Nome da empresa"
                value={formState.businessName}
                onChange={(event) =>
                  updateField("businessName", event.target.value)
                }
              />
              <InputField
                id="primaryEmail"
                label="Email principal"
                type="email"
                value={formState.primaryEmail}
                onChange={(event) =>
                  updateField("primaryEmail", event.target.value)
                }
              />
              <InputField
                id="whatsappPhone"
                label="WhatsApp da empresa"
                value={formState.whatsappPhone}
                onChange={(event) =>
                  updateField("whatsappPhone", event.target.value)
                }
                className="md:col-span-2"
              />
            </div>
          </section>

          <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Cobranca padrao
              </h2>
              <p className="text-sm leading-6 text-foreground-muted">
                Defina fuso e dia de vencimento para a operacao inicial.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
              <SelectField
                id="timezone"
                label="Fuso horario"
                value={formState.timezone}
                onChange={(event) =>
                  updateField("timezone", event.target.value)
                }
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
              </SelectField>
              <SelectField
                id="defaultDueDay"
                label="Vencimento padrao"
                value={formState.defaultDueDay}
                onChange={(event) =>
                  updateField("defaultDueDay", event.target.value)
                }
              >
                {Array.from({ length: 28 }, (_, index) => index + 1).map(
                  (day) => (
                    <option key={day} value={String(day)}>
                      Dia {day}
                    </option>
                  ),
                )}
              </SelectField>
            </div>
          </section>

          <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                WhatsApp assistido
              </h2>
              <p className="text-sm leading-6 text-foreground-muted">
                Ajuste os templates usados no preview e mantenha reminders dentro
                da janela comercial do tenant.
              </p>
            </div>
            <div className="mt-6 grid gap-4">
              <TextAreaField
                id="whatsappTemplateChargeInitial"
                label="Template de cobranca inicial"
                value={formState.whatsappTemplateChargeInitial}
                onChange={(value) =>
                  updateField("whatsappTemplateChargeInitial", value)
                }
              />
              <TextAreaField
                id="whatsappTemplateReminder"
                label="Template de reminder"
                value={formState.whatsappTemplateReminder}
                onChange={(value) =>
                  updateField("whatsappTemplateReminder", value)
                }
              />
              <TextAreaField
                id="whatsappTemplatePaymentConfirmation"
                label="Template de confirmacao de pagamento"
                value={formState.whatsappTemplatePaymentConfirmation}
                onChange={(value) =>
                  updateField("whatsappTemplatePaymentConfirmation", value)
                }
              />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  id="reminderWindowStartHour"
                  label="Inicio da janela comercial"
                  value={formState.reminderWindowStartHour}
                  onChange={(event) =>
                    updateField("reminderWindowStartHour", event.target.value)
                  }
                >
                  {COMMERCIAL_WINDOW_HOURS.map((hour) => (
                    <option key={hour.value} value={hour.value}>
                      {hour.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  id="reminderWindowEndHour"
                  label="Fim da janela comercial"
                  value={formState.reminderWindowEndHour}
                  onChange={(event) =>
                    updateField("reminderWindowEndHour", event.target.value)
                  }
                >
                  {COMMERCIAL_WINDOW_HOURS.map((hour) => (
                    <option key={hour.value} value={hour.value}>
                      {hour.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </section>

          <div className="sticky bottom-0 z-10 pt-6">
            <div className="sticky-fade absolute inset-0 -z-10 rounded-[2rem]" />
            <div className="soft-panel flex flex-col gap-4 rounded-[1.75rem] border border-white/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Esta alteracao entra na trilha de auditoria.
                </p>
                <p className="text-sm text-foreground-muted">
                  A empresa permanece isolada do restante da operacao.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:min-w-[18rem]">
                {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
                <PrimaryButton disabled={!isDirty || isSaving} type="submit">
                  {isSaving ? "Salvando..." : "Salvar configuracoes"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
