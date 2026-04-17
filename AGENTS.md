<!-- GSD:project-start source:PROJECT.md -->
## Project

CobraZap e um micro-SaaS B2B, web-first e multi-tenant para cobranca recorrente por WhatsApp + Pix no mercado brasileiro. O milestone atual busca validar o loop principal cliente -> assinatura -> cobranca -> Pix -> envio assistido -> pagamento confirmado.

Prioridades atuais:
- isolamento multi-tenant sem vazamento cross-tenant
- Pix Cobranca com webhook e reconciliacao
- envio manual assistido por WhatsApp antes de automacao completa
- auditoria, idempotencia e operabilidade como parte do escopo funcional
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

- **Frontend:** Next.js App Router (painel web e onboarding)
- **Backend:** NestJS (API de dominio, webhooks e integracoes)
- **Workers:** BullMQ sobre Redis para reminders, retries e reconciliacao
- **Database:** PostgreSQL com migrations SQL e `tenant_id` em entidades transacionais
- **Data access:** Drizzle ORM + drizzle-kit
- **Testing:** Vitest, Supertest e Playwright para fluxos criticos
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

- Toda entidade transacional relevante deve carregar `tenant_id`, e toda query deve ser tenant-scoped.
- Payload bruto de PSP/BSP fica em tabelas/eventos auditaveis; o dominio trabalha com modelos internos estaveis.
- Webhooks, reminders, reconciliacao e bulk generation nao devem depender de processamento inline no request web.
- Idempotencia e audit trail fazem parte do definition of done de qualquer fluxo financeiro ou de mensageria.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Estrutura recomendada:
- `apps/web` para o painel Next.js
- `apps/api` para a API NestJS
- `apps/worker` para filas BullMQ
- `packages/domain`, `packages/db` e `packages/integrations` para separar dominio de fornecedores

Fluxo principal:
1. O painel cria/consulta estado interno via API.
2. A API persiste primeiro e dispara side effects por fila.
3. Webhooks entram em inbox de eventos antes de atualizar estado de cobranca.
4. Workers processam reminders, dispatches e reconciliacao com retries seguros.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `$gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `$gsd-debug` for investigation and bug fixing
- `$gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `$gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` - do not edit manually.
<!-- GSD:profile-end -->
