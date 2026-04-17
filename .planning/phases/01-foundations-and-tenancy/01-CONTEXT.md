# Phase 1: Foundations and Tenancy - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Entregar a fundacao segura do CobraZap com onboarding inicial do tenant, autenticacao basica do painel, configuracao inicial do negocio, trilha imutavel de auditoria e guardrails verificaveis de isolamento multi-tenant em API e jobs.

</domain>

<decisions>
## Implementation Decisions

### Conta e Tenant Inicial
- **D-01:** O onboarding inicial sera self-serve, criando `tenant` e usuario owner na mesma transacao, com timezone padrao `America/Sao_Paulo` e confirmacao por email.
- **D-02:** O milestone assume um owner unico operacional, mas a modelagem deve nascer pronta para membership futura sem introduzir RBAC completo agora.
- **D-03:** O tenant sera resolvido pela membership associada a sessao do usuario, sem seletor explicito de tenant no login.
- **D-04:** O setup inicial deve capturar nome do negocio, email principal, telefone WhatsApp, timezone e politica padrao de vencimento.

### Sessao, Login e Recuperacao
- **D-05:** A autenticacao inicial usara email e senha com sessao server-side e cookies HttpOnly.
- **D-06:** Recuperacao de senha usara token de uso unico com expiracao curta enviado por email, invalidado no consumo e auditado como evento sensivel.
- **D-07:** A politica minima de sessao inclui logout explicito, expiracao por inatividade e invalidacao de sessoes ao trocar senha.
- **D-08:** Erros de autenticacao devem ser genericos para o usuario; detalhes operacionais ficam restritos a auditoria e observabilidade.

### Auditoria e Trilho Imutavel
- **D-09:** O audit trail obrigatorio da fundacao cobre signup, login, logout, pedido de reset, reset concluido, alteracoes de perfil do tenant e falhas de autorizacao.
- **D-10:** A auditoria sera persistida em tabela append-only com actor, tenant, alvo, tipo, timestamp e payload resumido.
- **D-11:** O payload de auditoria deve guardar metadados estaveis e referencias seguras, sem armazenar senha, token ou segredo bruto.
- **D-12:** O milestone entrega consulta basica de auditoria no painel com filtros por periodo, ator e tipo de evento.

### Isolamento Multi-tenant e Guardrails
- **D-13:** `tenant_id` e obrigatorio em toda entidade transacional e de auditoria, inclusive em payloads de jobs e eventos internos.
- **D-14:** O tenant scoping da API sera centralizado em guard/interceptor de autenticacao e exigido em repositories/services.
- **D-15:** Todo job/worker deve receber `tenant_id` no payload e revalidar o contexto antes de ler ou escrever dados.
- **D-16:** A fundacao deve incluir testes automatizados contra acesso cross-tenant e helpers reutilizaveis de query scoping.

### the agent's Discretion
Nao houve respostas do tipo "voce decide" nesta discussao. As decisoes acima estao travadas para planejamento.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope
- `.planning/PROJECT.md` - proposta do produto, restricoes de mercado e decisoes-chave do milestone
- `.planning/REQUIREMENTS.md` - requisitos `AUTH-01` a `AUTH-04` e `OPS-01` a `OPS-02`, com traceabilidade da Phase 1
- `.planning/ROADMAP.md` - objetivo, criterios de sucesso e planos da Phase 1
- `.planning/STATE.md` - foco atual do projeto e preocupacoes operacionais abertas

### Technical Conventions
- `AGENTS.md` - stack alvo, convencoes obrigatorias de `tenant_id`, auditoria, idempotencia e arquitetura recomendada

### External Specs
- No external specs - requirements are fully captured in the project planning artifacts above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Nenhum asset de codigo reutilizavel existe ainda - a fundacao e greenfield e deve criar a espinha dorsal do monorepo.

### Established Patterns
- O produto deve seguir arquitetura monorepo com `apps/web`, `apps/api`, `apps/worker`, `packages/domain`, `packages/db` e `packages/integrations`.
- Entidades transacionais relevantes devem carregar `tenant_id`, e toda query deve nascer tenant-scoped.
- Webhooks, reminders, reconciliacao e bulk generation nao devem depender de processamento inline em requests web.
- Auditoria, idempotencia e operabilidade fazem parte do definition of done dos fluxos de autenticacao e dados sensiveis.

### Integration Points
- O painel Next.js consulta e muta estado interno via API NestJS.
- A API persiste primeiro e dispara side effects de forma assincrona.
- Workers BullMQ sobre Redis serao o ponto de extensao natural para jobs tenant-aware e retries seguros.
- O schema inicial em PostgreSQL + Drizzle precisa preparar o terreno para fases posteriores de cobranca, Pix e mensageria.

</code_context>

<specifics>
## Specific Ideas

Priorizar uma fundacao enxuta, mas que ja prove isolamento cross-tenant, trilha consultavel de auditoria e onboarding operacional do tenant sem depender de configuracoes avancadas de PSP ou WhatsApp.

</specifics>

<deferred>
## Deferred Ideas

- Selecao de PSP inicial fica para a Phase 4, quando a integracao Pix entrar no escopo funcional.
- Escolha entre Cloud API direta da Meta e BSP homologado fica para a Phase 5, junto com o envio assistido por WhatsApp.

</deferred>

---

*Phase: 01-foundations-and-tenancy*
*Context gathered: 2026-04-17*
