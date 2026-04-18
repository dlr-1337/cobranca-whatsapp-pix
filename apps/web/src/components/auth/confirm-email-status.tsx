"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Banner } from "@/components/ui/primitives";

type ConfirmationState = "loading" | "success" | "error";

export function ConfirmEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<ConfirmationState>("loading");
  const [message, setMessage] = useState("Confirmando o acesso da empresa...");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Não foi possível confirmar este acesso. Solicite um novo link.");
      return;
    }

    let cancelled = false;

    void (async () => {
      const response = await fetch("/api/auth/confirm-email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setState("error");
        setMessage(
          payload?.message ??
            "Não foi possível confirmar este acesso. Solicite um novo link.",
        );
        return;
      }

      setState("success");
      setMessage("Email confirmado. Agora você já pode entrar no painel.");
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell
      eyebrow="Confirmar email"
      title="Validando o acesso da empresa."
      description="A confirmação habilita o primeiro login do responsável e conclui a ativação inicial."
      footer={
        <div className="flex justify-between gap-3">
          <span>Precisa voltar depois?</span>
          <Link
            href="/entrar"
            className="font-semibold text-accent hover:text-accent-strong"
          >
            Ir para o login
          </Link>
        </div>
      }
    >
      <Banner tone={state === "error" ? "danger" : state === "success" ? "success" : "default"}>
        {message}
      </Banner>
      <Link
        href="/entrar"
        className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
      >
        {state === "success" ? "Entrar no painel" : "Voltar para o login"}
      </Link>
    </AuthShell>
  );
}
