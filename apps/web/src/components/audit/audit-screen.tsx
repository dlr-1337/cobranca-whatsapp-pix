"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  Banner,
  InputField,
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

interface AuditEventItem {
  id: string;
  tenantId: string;
  actorEmail: string | null;
  eventType: string;
  summary: string;
  occurredAt: string;
}

const PERIOD_OPTIONS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
] as const;

const EVENT_OPTIONS = [
  { value: "", label: "Todos os eventos" },
  { value: "auth.signup_requested", label: "Cadastro inicial" },
  { value: "auth.email_confirmed", label: "Email confirmado" },
  { value: "auth.login_succeeded", label: "Login concluído" },
  { value: "auth.login_failed", label: "Login rejeitado" },
  { value: "auth.logout", label: "Logout" },
  { value: "auth.password_reset_requested", label: "Pedido de redefinição" },
  { value: "auth.password_reset_completed", label: "Senha redefinida" },
  { value: "tenant.settings_updated", label: "Configurações atualizadas" },
] as const;

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AuditScreen() {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [items, setItems] = useState<AuditEventItem[]>([]);
  const [period, setPeriod] = useState("7d");
  const [actor, setActor] = useState("");
  const [eventType, setEventType] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "expired">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingOut, startLogoutTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (!sessionResponse.ok) {
        if (!cancelled) {
          setState("expired");
        }
        return;
      }

      const sessionPayload = (await sessionResponse.json()) as SessionPayload;

      if (!cancelled) {
        setSession(sessionPayload);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setErrorMessage(null);

      const query = new URLSearchParams({
        period,
      });

      if (actor.trim()) {
        query.set("actor", actor.trim());
      }

      if (eventType) {
        query.set("type", eventType);
      }

      const response = await fetch(`/api/audit-events?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        if (!cancelled) {
          if (response.status === 401) {
            setState("expired");
          } else {
            setState("ready");
            setErrorMessage(
              payload?.message ??
                "Não foi possível carregar a trilha de auditoria agora.",
            );
          }
        }

        return;
      }

      const payload = (await response.json()) as { items: AuditEventItem[] };

      if (!cancelled) {
        setItems(payload.items);
        setState("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, period, actor, eventType]);

  function handleLogout() {
    startLogoutTransition(async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/entrar");
      router.refresh();
    });
  }

  if (state === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="soft-panel w-full max-w-xl space-y-4 rounded-[2rem] border border-white/70 px-6 py-7">
          <Banner tone="danger">
            Sua sessão expirou. Entre novamente para continuar.
          </Banner>
          <Link
            href="/entrar"
            className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            Voltar para o login
          </Link>
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
              Trilha de auditoria
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground-muted">
                Empresa atual
              </p>
              <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
                {session?.tenant.businessName ?? "Carregando..."}
              </h1>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link
                href="/painel/configuracoes"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-accent/35 hover:text-foreground"
              >
                Configurações
              </Link>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
                Auditoria
              </span>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground-muted">
              <span className="font-semibold text-foreground">
                {session?.user.email ?? "Responsável"}
              </span>
            </div>
            <SecondaryButton disabled={isLoggingOut} onClick={handleLogout}>
              {isLoggingOut ? "Saindo..." : "Sair"}
            </SecondaryButton>
          </div>
        </header>

        <section className="soft-panel rounded-[2rem] border border-white/70 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
            <SelectField
              id="period"
              label="Período"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="eventType"
              label="Tipo de evento"
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
            >
              {EVENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <InputField
              id="actor"
              label="Ator"
              value={actor}
              onChange={(event) => setActor(event.target.value)}
              placeholder="responsavel@empresa.com.br"
            />
          </div>
          <p className="mt-4 text-sm text-foreground-muted">
            A lista sempre mostra apenas a empresa atual. Tokens, links e dados
            secretos ficam fora desta superfície.
          </p>
        </section>

        {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}

        {state === "loading" ? (
          <div className="soft-panel rounded-[2rem] border border-white/70 px-6 py-8 text-sm text-foreground-muted">
            Carregando eventos...
          </div>
        ) : items.length === 0 ? (
          <div className="soft-panel rounded-[2rem] border border-white/70 px-6 py-8">
            <h2 className="text-xl font-semibold text-foreground">
              Nenhum evento encontrado
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground-muted">
              Quando houver login, logout ou alteração sensível, os registros
              aparecem aqui. Ajuste os filtros ou realize uma ação na empresa
              atual.
            </p>
          </div>
        ) : (
          <>
            <section className="soft-panel hidden overflow-hidden rounded-[2rem] border border-white/70 md:block">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/45 text-sm text-foreground-muted">
                    <th className="px-6 py-4 font-semibold">Data</th>
                    <th className="px-6 py-4 font-semibold">Ator</th>
                    <th className="px-6 py-4 font-semibold">Evento</th>
                    <th className="px-6 py-4 font-semibold">Resumo</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border/70 text-sm">
                      <td className="px-6 py-4 font-mono text-xs text-foreground-muted">
                        {formatTimestamp(item.occurredAt)}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {item.actorEmail ?? "Sistema"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold text-accent">
                          {item.eventType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground-muted">
                        {item.summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="grid gap-4 md:hidden">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="soft-panel rounded-[1.75rem] border border-white/70 px-5 py-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.actorEmail ?? "Sistema"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-foreground-muted">
                        {formatTimestamp(item.occurredAt)}
                      </p>
                    </div>
                    <span className="rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-[11px] font-semibold text-accent">
                      {item.eventType}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-foreground-muted">
                    {item.summary}
                  </p>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
