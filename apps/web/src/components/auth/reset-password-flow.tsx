"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  Banner,
  InputField,
  PrimaryButton,
} from "@/components/ui/primitives";

export function ResetPasswordFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return token ? (
    <ResetPasswordCompletion token={token} />
  ) : (
    <ResetPasswordRequest />
  );
}

function ResetPasswordRequest() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      setSubmitted(true);
      setMessage(
        payload?.message ??
          "Se o email existir, você receberá um link para redefinir a senha.",
      );
    });
  }

  return (
    <AuthShell
      eyebrow="Redefinir acesso"
      title="Envie um novo link de redefinição."
      description="A resposta é sempre genérica para proteger a conta da empresa. O restante do fluxo continua por email."
      footer={
        <div className="flex justify-between gap-3">
          <span>Quer voltar agora?</span>
          <Link
            href="/entrar"
            className="font-semibold text-accent hover:text-accent-strong"
          >
            Entrar no painel
          </Link>
        </div>
      }
    >
      {submitted ? (
        <Banner tone="success">{message}</Banner>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <InputField
            id="reset-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="responsavel@empresa.com.br"
          />
          <PrimaryButton className="w-full" disabled={isPending} type="submit">
            {isPending ? "Enviando..." : "Enviar link de redefinição"}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}

function ResetPasswordCompletion(props: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "danger">("success");
  const [isPending, startTransition] = useTransition();
  const rules = useMemo(
    () => [
      "Use pelo menos 8 caracteres.",
      "Guarde a senha apenas com o responsável da conta.",
      "As outras sessões ativas serão encerradas após a troca.",
    ],
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          token: props.token,
          password,
          confirmPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setTone("danger");
        setMessage(
          payload?.message ??
            "Este link não é mais válido. Solicite um novo link.",
        );
        return;
      }

      setTone("success");
      setMessage("Senha atualizada. Volte ao login para entrar novamente.");
    });
  }

  return (
    <AuthShell
      eyebrow="Nova senha"
      title="Defina uma nova senha para a empresa."
      description="A alteração invalida sessões antigas e entra na trilha de auditoria."
      footer={
        <div className="flex justify-between gap-3">
          <span>Preferiu não continuar?</span>
          <Link
            href="/entrar"
            className="font-semibold text-accent hover:text-accent-strong"
          >
            Voltar para o login
          </Link>
        </div>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Banner>
          <ul className="space-y-2">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </Banner>
        <InputField
          id="new-password"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <InputField
          id="confirm-new-password"
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {message ? <Banner tone={tone}>{message}</Banner> : null}

        <PrimaryButton className="w-full" disabled={isPending} type="submit">
          {isPending ? "Redefinindo..." : "Redefinir senha"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
