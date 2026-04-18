"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  Banner,
  InputField,
  PrimaryButton,
} from "@/components/ui/primitives";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        setErrorMessage(payload?.message ?? "Não foi possível entrar agora.");
        return;
      }

      router.push("/painel/configuracoes");
      router.refresh();
    });
  }

  return (
    <AuthShell
      eyebrow="Entrar no painel"
      title="Acesse a operação da sua empresa."
      description="Use o email do responsável da conta para continuar. O acesso permanece vinculado à empresa atual."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Primeiro acesso?</span>
          <Link
            href="/criar-conta"
            className="font-semibold text-accent hover:text-accent-strong"
          >
            Criar conta da empresa
          </Link>
        </div>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <InputField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="financeiro@empresa.com.br"
        />
        <div className="space-y-2">
          <InputField
            id="password"
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite sua senha"
          />
          <div className="flex justify-end">
            <Link
              href="/redefinir-senha"
              className="text-sm font-semibold text-accent hover:text-accent-strong"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}

        <PrimaryButton className="w-full" disabled={isPending} type="submit">
          {isPending ? "Entrando..." : "Entrar no painel"}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
