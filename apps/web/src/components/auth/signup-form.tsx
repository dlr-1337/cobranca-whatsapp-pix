"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  Banner,
  InputField,
  PrimaryButton,
  SecondaryButton,
  SelectField,
} from "@/components/ui/primitives";

interface SignupState {
  businessName: string;
  primaryEmail: string;
  ownerEmail: string;
  password: string;
  confirmPassword: string;
  whatsappPhone: string;
  timezone: string;
  defaultDueDay: string;
}

const INITIAL_STATE: SignupState = {
  businessName: "",
  primaryEmail: "",
  ownerEmail: "",
  password: "",
  confirmPassword: "",
  whatsappPhone: "",
  timezone: "America/Sao_Paulo",
  defaultDueDay: "5",
};

export function SignupForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [state, setState] = useState<SignupState>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);

  function updateField<Key extends keyof SignupState>(
    key: Key,
    value: SignupState[Key],
  ) {
    setState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateCurrentStep() {
    if (step === 1 && state.password !== state.confirmPassword) {
      return "As senhas precisam ser iguais.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateCurrentStep();
    setErrorMessage(validationMessage);

    if (validationMessage) {
      return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          businessName: state.businessName,
          primaryEmail: state.primaryEmail,
          ownerEmail: state.ownerEmail,
          password: state.password,
          whatsappPhone: state.whatsappPhone,
          timezone: state.timezone,
          defaultDueDay: Number(state.defaultDueDay),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.message ?? "Não foi possível criar a conta.");
        return;
      }

      setConfirmationPending(true);
      setErrorMessage(null);
    });
  }

  return (
    <AuthShell
      eyebrow="Criar conta"
      title="Abra a operação da sua empresa em dois passos."
      description="Primeiro definimos o responsável da conta. Depois registramos os dados básicos da empresa para cobrança."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Já tem acesso?</span>
          <Link
            href="/entrar"
            className="font-semibold text-accent hover:text-accent-strong"
          >
            Entrar no painel
          </Link>
        </div>
      }
    >
      {confirmationPending ? (
        <div className="space-y-4">
          <Banner tone="success">
            Confirme seu email para entrar no painel. O link foi preparado para
            o responsável da conta.
          </Banner>
          <p className="text-sm leading-6 text-foreground-muted">
            Depois da confirmação, o login já libera a empresa no painel sem
            precisar informar contexto extra.
          </p>
          <Link
            href="/entrar"
            className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            {[1, 2].map((currentStep) => (
              <div
                key={currentStep}
                className="flex items-center gap-3"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                    currentStep === step
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface text-foreground-muted"
                  }`}
                >
                  0{currentStep}
                </div>
                {currentStep === 1 ? (
                  <span className="text-sm text-foreground-muted">
                    Sua conta
                  </span>
                ) : (
                  <span className="text-sm text-foreground-muted">
                    Dados da empresa
                  </span>
                )}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <InputField
                id="ownerEmail"
                label="Email do responsável"
                type="email"
                autoComplete="email"
                value={state.ownerEmail}
                onChange={(event) =>
                  updateField("ownerEmail", event.target.value)
                }
                placeholder="responsavel@empresa.com.br"
              />
              <InputField
                id="password"
                label="Senha"
                type="password"
                autoComplete="new-password"
                value={state.password}
                onChange={(event) => updateField("password", event.target.value)}
                hint="Use pelo menos 8 caracteres."
              />
              <InputField
                id="confirmPassword"
                label="Confirmar senha"
                type="password"
                autoComplete="new-password"
                value={state.confirmPassword}
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              <InputField
                id="businessName"
                label="Nome da empresa"
                value={state.businessName}
                onChange={(event) =>
                  updateField("businessName", event.target.value)
                }
                placeholder="Academia Centro"
              />
              <InputField
                id="primaryEmail"
                label="Email principal da empresa"
                type="email"
                value={state.primaryEmail}
                onChange={(event) =>
                  updateField("primaryEmail", event.target.value)
                }
                placeholder="financeiro@empresa.com.br"
              />
              <InputField
                id="whatsappPhone"
                label="WhatsApp da empresa"
                value={state.whatsappPhone}
                onChange={(event) =>
                  updateField("whatsappPhone", event.target.value)
                }
                placeholder="+55 11 99999-9999"
              />
              <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
                <SelectField
                  id="timezone"
                  label="Fuso horário"
                  value={state.timezone}
                  onChange={(event) =>
                    updateField("timezone", event.target.value)
                  }
                >
                  <option value="America/Sao_Paulo">
                    America/Sao_Paulo
                  </option>
                </SelectField>
                <SelectField
                  id="defaultDueDay"
                  label="Vencimento padrão"
                  value={state.defaultDueDay}
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
            </div>
          )}

          {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}

          <div className="flex flex-col-reverse gap-3 md:flex-row">
            {step === 2 ? (
              <SecondaryButton
                className="w-full md:w-auto"
                disabled={isPending}
                type="button"
                onClick={() => setStep(1)}
              >
                Voltar
              </SecondaryButton>
            ) : null}
            <PrimaryButton className="w-full" disabled={isPending} type="submit">
              {step === 1
                ? "Continuar"
                : isPending
                  ? "Criando conta..."
                  : "Criar conta da empresa"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
