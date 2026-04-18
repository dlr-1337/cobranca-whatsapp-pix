# Phase 2: Wallet and Recurring Catalog - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Mode:** Auto-generated (`workflow.skip_discuss=true`)

<domain>
## Phase Boundary

Permitir que o operador monte a carteira do tenant com clientes, consentimento por canal, planos recorrentes e assinaturas ativas, mantendo isolamento multi-tenant, trilha auditavel e contratos prontos para o motor de cobrancas das fases seguintes.

</domain>

<decisions>
## Implementation Decisions

### Clientes e Status Operacional
- **D-01:** Clientes ficam em tabela tenant-scoped propria com nome, telefone WhatsApp exibivel, telefone normalizado, observacoes livres e status operacional (`active`, `inactive`, `delinquent`, `canceled`, `blocked`).
- **D-02:** O backend normaliza telefone para um formato estavel de comparacao e bloqueia duplicidade obvia por `tenant_id` + telefone normalizado, a menos que o operador envie confirmacao explicita para sobrescrever o alerta.
- **D-03:** A listagem de clientes precisa suportar busca por nome/telefone e exibir o ultimo estado de consentimento para WhatsApp no mesmo payload para evitar round-trips desnecessarios no painel.

### Consentimento por Canal
- **D-04:** Consentimento sera append-only em eventos tenant-scoped por cliente/canal (`whatsapp`, `email`), sempre com status (`opted-in`, `opted-out`), evidencia textual, timestamp efetivo e ator que registrou a mudanca.
- **D-05:** O estado atual de consentimento sera derivado do evento mais recente por cliente/canal; nao havera update destrutivo do historico.
- **D-06:** Mudancas de consentimento precisam gerar auditoria funcional para que suporte e operacao consigam explicar porque um cliente esta ou nao elegivel a mensagens.

### Planos e Regras Recorrentes
- **D-07:** Planos recorrentes ficam em catalogo tenant-scoped com nome, valor em centavos BRL, periodicidade (`weekly`, `monthly`, `quarterly`, `yearly`), dia padrao de vencimento e status (`draft`, `active`, `archived`).
- **D-08:** A mensagem padrao do plano e o perfil de lembrete entram como contratos simples nesta fase (`messageTemplate`, `reminderProfile`) para alimentar Pix/WhatsApp nas proximas fases sem acoplar a implementacao final agora.
- **D-09:** Planos nao sao apagados fisicamente; quando substituidos, ficam arquivados para preservar assinatura e cobranca historica.

### Assinaturas e Historico
- **D-10:** Assinaturas tenant-scoped vinculam cliente + plano e guardam data de inicio, proxima competencia prevista, override de valor, override de vencimento e status (`active`, `paused`, `canceled`).
- **D-11:** Pausar, reativar e cancelar assinatura cria evento append-only em `subscription_events`, preservando historico sem depender apenas de colunas mutaveis.
- **D-12:** A modelagem deve deixar pronta a geracao idempotente de cobrancas por competencia na Phase 3, entao a assinatura precisa persistir `nextCycleStart`, `anchorDueDay` e o ultimo motivo de transicao.

### Operacao e Superficie Web
- **D-13:** O painel da fase sera uma rota unica de carteira (`/painel/carteira`) com tres secoes coordenadas: clientes, planos e assinaturas, reaproveitando o shell visual da fundacao.
- **D-14:** A API exposta para o painel sera tenant-scoped e same-origin via route handlers do Next, seguindo o mesmo padrao de auth/settings/auditoria ja existente.
- **D-15:** Toda mutacao relevante de cliente, consentimento, plano e assinatura precisa gerar audit trail com resumo operacional legivel.

### the agent's Discretion
- **D-16:** Detalhes de copy, agrupamento visual das secoes e refinamentos menores de UX podem seguir o padrao visual ja existente no `apps/web`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope
- `.planning/PROJECT.md` - proposta do produto, restricoes do milestone e backlog validado
- `.planning/REQUIREMENTS.md` - requisitos `CUST-01` a `CUST-04`, `PLAN-01`, `PLAN-02`, `SUBS-01` e `SUBS-02`
- `.planning/ROADMAP.md` - objetivo, criterios de sucesso e planos da Phase 2
- `.planning/STATE.md` - fase atual, bloqueios conhecidos e decisoes acumuladas

### Prior Foundations
- `.planning/phases/01-foundations-and-tenancy/01-CONTEXT.md` - decisoes travadas sobre auth, tenant scoping e auditoria
- `.planning/phases/01-foundations-and-tenancy/01-03-SUMMARY.md` - composicao do repository compartilhado, tenant context service e trilha append-only

### Technical Conventions
- `AGENTS.md` - convencoes obrigatorias de `tenant_id`, auditoria e side-effects fora de requests inline

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/db/src/repositories/app-repository.ts` ja compoe auth + audit em um repositorio compartilhado e pode ser expandido para carteira sem introduzir acesso generico nao tenant-scoped.
- `packages/db/src/repositories/tenant-scope.ts` centraliza helpers de filtro tenant-aware e busca textual reaproveitaveis para clientes/listagens.
- `apps/web/src/components/ui/primitives.tsx` e o shell de `/painel/configuracoes` formam a base visual para a tela de carteira.
- `apps/web/src/lib/backend-proxy.ts` e os route handlers de `apps/web/src/app/api/**` ja entregam o padrao BFF same-origin a reutilizar.

### Established Patterns
- Controllers Nest leem a sessao pelo cookie HttpOnly e delegam tenant resolution para services.
- Repositories usam Drizzle e devem continuar append-only onde houver historico operacional.
- O painel usa fetch client-side com `cache: "no-store"` para telas autenticadas e mantem mensagens inline simples.

### Integration Points
- `packages/domain` precisa receber os schemas/input contracts de clientes, planos, assinaturas e filtros.
- `packages/db` precisa receber novas tabelas, migration e repositorio tenant-scoped.
- `apps/api` precisa expor endpoints autenticados de carteira.
- `apps/web` precisa criar a nova rota `/painel/carteira` e proxies para os novos endpoints.

</code_context>

<specifics>
## Specific Ideas

Priorizar uma experiencia operacional enxuta: o operador entra, cadastra cliente, registra consentimento, cria plano, vincula assinatura e consegue enxergar tudo na mesma superficie antes de chegar no motor de cobranca.

</specifics>

<deferred>
## Deferred Ideas

- Workflows automatizados de lembrete ficam para a Phase 5; nesta fase apenas o contrato do perfil de lembrete precisa existir.
- Regras avancadas de ciclo e prorrogacao ficam para a Phase 3, quando o motor de cobrancas entrar em cena.
- Importacao CSV, multiusuario e segmentacao ficam fora desta fase.

</deferred>

---
*Phase: 02-wallet-and-recurring-catalog*
*Context gathered: 2026-04-17*
