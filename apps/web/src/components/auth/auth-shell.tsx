import type { ReactNode } from "react";

export function AuthShell(props: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-1 overflow-hidden bg-background px-5 py-8 text-foreground md:px-8 xl:px-12">
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(15,122,103,0.14),_transparent_54%)]" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="grain-panel hidden min-h-[calc(100vh-4rem)] overflow-hidden rounded-[2rem] border border-white/50 px-10 py-10 text-foreground xl:flex xl:flex-col xl:justify-between">
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-accent/20 bg-white/65 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Cobrança assistida
              </span>
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground-muted">
                  CobraZap
                </p>
                <h1 className="max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-foreground">
                  Cobrança recorrente com WhatsApp, Pix e trilha operacional.
                </h1>
                <p className="max-w-lg text-lg leading-8 text-foreground-muted">
                  A base da empresa já nasce com autenticação segura, contexto
                  único por empresa e visibilidade para cada ação sensível.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                "Cadastro único com dados da empresa e do responsável.",
                "Sessões revogáveis e recuperação de acesso sem expor segredos.",
                "Configurações operacionais prontas para Pix e WhatsApp.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-white/55 bg-white/70 p-5 backdrop-blur"
                >
                  <p className="text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-panel rounded-[1.75rem] border border-white/75 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
              Operação preparada
            </p>
            <div className="mt-4 grid gap-3 text-sm text-foreground-muted md:grid-cols-3">
              <p>
                <span className="status-dot font-semibold text-accent">
                  Empresa única
                </span>
                Sem seletor ambíguo nem mistura entre contas.
              </p>
              <p>
                <span className="status-dot font-semibold text-accent">
                  Sessão centralizada
                </span>
                Logout explícito e expiração controlada.
              </p>
              <p>
                <span className="status-dot font-semibold text-accent">
                  Base auditável
                </span>
                Cada mudança sensível já nasce pronta para rastreio.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="soft-panel w-full max-w-[32.5rem] rounded-[2rem] border border-white/70 px-6 py-7 md:px-8 md:py-9">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-accent/15 bg-accent/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {props.eyebrow}
              </div>
              <div className="space-y-3">
                <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.04em] text-foreground">
                  {props.title}
                </h2>
                <p className="text-base leading-7 text-foreground-muted">
                  {props.description}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-6">{props.children}</div>

            {props.footer ? (
              <div className="mt-8 border-t border-border/70 pt-5 text-sm text-foreground-muted">
                {props.footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
