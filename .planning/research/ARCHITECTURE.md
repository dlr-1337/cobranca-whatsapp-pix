# Architecture Research

**Domain:** micro-SaaS de cobranca recorrente por WhatsApp + Pix
**Researched:** 2026-04-17
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                       Painel Web (Next.js)                 │
├─────────────────────────────────────────────────────────────┤
│  Onboarding  Clientes  Planos  Cobrancas  Dashboard Ops    │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTPS + session/cookies
┌───────────────▼─────────────────────────────────────────────┐
│                      API de Dominio (NestJS)               │
├─────────────────────────────────────────────────────────────┤
│ Auth │ Tenant │ Customers │ Plans │ Charges │ Pix │ WPP    │
└──────┬───────────────┬───────────────────────┬─────────────┘
       │               │                       │
       │               │ enqueue jobs          │ receive webhooks
       │               ▼                       ▼
┌──────▼──────────┐  ┌───────────────────┐  ┌───────────────────┐
│ PostgreSQL      │  │ Redis + BullMQ    │  │ Webhook Ingestion │
│ tenant data     │  │ retries/delays    │  │ PSP / Meta / BSP  │
└──────┬──────────┘  └─────────┬─────────┘  └─────────┬─────────┘
       │                       │                      │
       │                       ▼                      │
       │              ┌─────────────────────┐         │
       │              │ Worker(s)           │─────────┘
       │              │ messaging / pix /   │
       │              │ reconciliation      │
       │              └─────────┬───────────┘
       │                        │
       ▼                        ▼
┌───────────────┐        ┌───────────────┐
│ PSP Pix       │        │ WhatsApp API  │
│ charge/status │        │ template/send │
└───────────────┘        └───────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `web` | UI operacional, onboarding e consulta | Next.js App Router com Server Components e tabelas operacionais |
| `api` | Regras de negocio, auth, webhooks, orchestration | NestJS modular com controllers, services e adapters |
| `worker` | Jobs atrasados, retries, reminders e reconciliacao | BullMQ workers com filas dedicadas |
| `db` | Persistencia de dominio e auditoria | PostgreSQL com migrations SQL e constraints fortes |
| `integrations` | Encapsular PSP/BSP/Meta | Adaptadores por provedor + DTOs internos estaveis |

## Recommended Project Structure

```text
apps/
├── web/                 # painel Next.js
├── api/                 # API NestJS
└── worker/              # consumidores BullMQ

packages/
├── db/                  # schema, migrations, seed
├── domain/              # entidades, services puros, policies
├── integrations/        # adapters PSP/WhatsApp
├── ui/                  # componentes compartilhados do painel
└── config/              # env parsing, logging, constants

infra/
├── docker/              # compose e imagens locais
└── ci/                  # pipelines e scripts
```

### Structure Rationale

- **`apps/`**: separa runtime web, API e worker, o que reduz acoplamento entre request HTTP e jobs longos.
- **`packages/domain`**: protege o modelo central contra payloads especificos de fornecedores.
- **`packages/integrations`**: permite trocar PSP/BSP sem contaminar controllers e entities.
- **`packages/db`**: concentra schema, unique constraints e migrations auditaveis.

## Architectural Patterns

### Pattern 1: Adapters de provedor

**What:** Interfaces internas para PSP Pix e canal WhatsApp.
**When to use:** Sempre que um provider externo for chamado.
**Trade-offs:** Mais codigo inicial, mas muito menos retrabalho ao trocar parceiro ou adicionar sandbox/production.

**Example:**
```typescript
export interface PixGateway {
  createCharge(input: InternalPixChargeInput): Promise<InternalPixChargeResult>;
  getChargeStatus(externalId: string): Promise<InternalPixStatus>;
  validateWebhook(headers: Record<string, string>, body: string): boolean;
}
```

### Pattern 2: Inbox de eventos + processamento assincrono

**What:** Persistir webhooks primeiro, processar depois com idempotencia.
**When to use:** PSP, WhatsApp, retries e eventos com risco de duplicidade.
**Trade-offs:** Mais estados operacionais para acompanhar, porem recuperacao e replay ficam viaveis.

**Example:**
```typescript
await webhookEventsRepo.insert({
  provider: "pix",
  externalId,
  payloadJson: rawBody,
  status: "received",
});
await queue.add("process-pix-webhook", { eventId }, { jobId: `pix:${externalId}` });
```

### Pattern 3: Tenant scoping no dominio e no banco

**What:** `tenant_id` obrigatorio em tabelas, services e filtros.
**When to use:** Em qualquer entidade de negocio ou tela operacional.
**Trade-offs:** Exige disciplina em schema e queries, mas elimina a maior classe de falhas do produto.

## Data Flow

### Request Flow

```text
[Operador no painel]
    ↓
[Next.js route/page]
    ↓
[NestJS controller] -> [Domain service] -> [PostgreSQL]
    ↓                         ↓
[Response/UI]          [BullMQ enqueue when needed]
```

### State Management

```text
[PostgreSQL]
    ↓ query/invalidate
[API]
    ↓ HTTP
[TanStack Query / Server Components]
    ↔
[UI do painel]
```

### Key Data Flows

1. **Geracao de cobranca recorrente:** assinatura ativa -> job agendado -> charge interna -> Pix via PSP -> dispatch disponivel no painel.
2. **Confirmacao de pagamento:** webhook PSP -> `webhook_events` -> worker idempotente -> atualizacao de `charges` -> cancelamento de lembretes futuros -> dashboard atualizado.
3. **Envio assistido por WhatsApp:** operador abre detalhe da cobranca -> preview de template -> link/manual send -> registro de `message_dispatch`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k clientes ativos | Monorepo, uma API, um worker, Postgres e Redis gerenciados |
| 1k-20k clientes ativos | Filas separadas por concern, read replicas para relatorios e particionamento logico de eventos |
| 20k+ clientes ativos | Workers especializados por provider/tenant class, tuning de fila e possivel sharding por grandes tenants |

### Scaling Priorities

1. **First bottleneck:** filas de mensageria e reconciliacao - resolver com workers dedicados, rate limiting e observabilidade por fila.
2. **Second bottleneck:** consultas operacionais em charges/messages/audit - resolver com indices por `tenant_id`, status, vencimento e data de criacao.

## Anti-Patterns

### Anti-Pattern 1: Chamar PSP e WhatsApp direto do controller

**What people do:** Processam integracao critica dentro do request HTTP do painel.
**Why it's wrong:** Bloqueia UX, aumenta timeout e dificulta retries/idempotencia.
**Do this instead:** Gravar estado interno primeiro e delegar side effects a filas/workers.

### Anti-Pattern 2: Um unico modelo de dados para dominio e provider

**What people do:** Salvam o JSON bruto do parceiro como fonte de verdade do dominio.
**Why it's wrong:** O produto fica refem do payload do fornecedor e a troca de parceiro vira refactor sistico.
**Do this instead:** Modelo interno de `charge`, `pix_charge`, `message_dispatch` e `webhook_event`, com payload bruto apenas como anexo auditavel.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| PSP Pix | Adapter + webhook + reconciliacao | Precisa suportar cobranca com vencimento, autenticidade de webhook e consulta de status |
| Meta/BSP WhatsApp | Template engine + send endpoint + status webhooks | Tratar opt-in/opt-out, limites e qualidade de template como preocupacao de produto |
| Email transacional | Async notifications | Apenas para auth e operacao interna, nao como canal principal de cobranca |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `web` ↔ `api` | HTTP/JSON | Nunca chamar provider externo direto do front |
| `api` ↔ `worker` | BullMQ jobs | Side effects e reprocessamentos fluem por fila |
| `domain` ↔ `integrations` | Interfaces/DTOs | O dominio nao conhece payload bruto do fornecedor |

## Sources

- [Next.js App Router docs](https://nextjs.org/docs/app)
- [NestJS queues docs](https://docs.nestjs.com/techniques/queues)
- [BullMQ guide](https://docs.bullmq.io/guide/queues)
- [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Manual de Padroes do Pix - Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf)
- [Meta WhatsApp Business Platform docs](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

---
*Architecture research for: micro-SaaS de cobranca recorrente por WhatsApp + Pix*
*Researched: 2026-04-17*
