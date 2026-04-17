# Stack Research

**Domain:** micro-SaaS de cobranca recorrente por WhatsApp + Pix
**Researched:** 2026-04-17
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js App Router | 16.2.x | Painel web, onboarding e views operacionais | A documentacao oficial atual posiciona App Router como caminho padrao para apps novos, com Server Components, Route Handlers e guia de multi-tenant/production no mesmo ecossistema. |
| NestJS | current stable | API de dominio, webhooks e integracoes | O ecossistema oficial tem suporte maduro para modulos, validacao, queues e separacao limpa entre controllers, services e workers. |
| PostgreSQL | 17/18 | Fonte transacional principal | O produto precisa de integridade relacional, constraints fortes, boas consultas analiticas e politicas de seguranca por linha quando necessario. |
| Redis | 7.x | Filas, locks, rate limiting e idempotencia de curta duracao | E o backend esperado para BullMQ e simplifica retries, delays e throttling para mensageria e webhooks. |
| BullMQ | 5.x | Jobs assincronos para cobrancas, lembretes e reconciliacao | A documentacao oficial enfatiza filas persistidas em Redis, job ids unicos e processamento distribuido, o que encaixa no dominio. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM + drizzle-kit | current stable | Schema em TypeScript e migrations SQL versionadas | Quando o time quer tipagem forte e SQL explicito sem esconder a modelagem multi-tenant. |
| Zod | current stable | Validacao de payloads e contratos | Para requests HTTP, webhooks externos e configuracoes internas de regras. |
| TanStack Query | current stable | Estado remoto no painel | Quando o front precisar de tabelas operacionais, filtros e invalidacao previsivel. |
| Playwright | current stable | Testes end-to-end dos fluxos criticos | Para onboarding, cobranca, pagamento confirmado e isolamento entre tenants. |
| Vitest + Supertest | current stable | Testes unitarios e de integracao | Para regras de recorrencia, webhooks e APIs do backend. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm workspaces | Monorepo para web/api/worker/packages | Mantem dependencias compartilhadas sem fragmentar o projeto cedo demais. |
| Docker Compose | Ambiente local com Postgres e Redis | Facilita bootstrap consistente para app, worker e testes. |
| GitHub Actions | CI para lint, testes e migrations | Fluxo simples para um projeto novo com entregas incrementais. |

## Installation

```bash
# Core runtime
pnpm add next react react-dom @nestjs/common @nestjs/core @nestjs/platform-express
pnpm add drizzle-orm pg bullmq ioredis zod

# Tooling
pnpm add -D drizzle-kit vitest @playwright/test supertest typescript eslint
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js + NestJS | Next.js full-stack monolito | Use se o time quiser reduzir moving parts e aceitar colocar webhooks/workers no mesmo runtime no inicio. |
| Drizzle | Prisma | Use Prisma se produtividade em CRUD e ecossistema do team pesarem mais do que SQL explicito e controle fino de migrations. |
| BullMQ + Redis | Banco + cron simples | Aceitavel apenas para um prototipo local sem retries, observabilidade e rate limiting de mensageria. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Acoplar payloads do PSP diretamente ao dominio | Troca de PSP fica cara e regressiva | Adaptadores por provedor + modelo interno de charge/evento |
| Automacoes por cron no processo web | Reinicios, deploys e picos podem perder jobs | Worker dedicado com filas e retries |
| ORM sem migrations SQL auditaveis | Dificulta evolucao segura do schema financeiro | Drizzle/SQL versionado em repositorio |
| Uma unica app sem boundary claro entre painel e jobs | Mistura UX com integracao externa e dificulta scaling | `web`, `api` e `worker` com contratos compartilhados |

## Stack Patterns by Variant

**Se o beta ficar muito pequeno (10-20 clientes concierge):**
- Pode iniciar com um worker unico e uma instancia da API
- Porque o gargalo ainda e confiabilidade, nao throughput bruto

**Se a taxa de mensagens crescer rapido ou houver varios PSPs/BSPs:**
- Separar workers por fila/concern (`billing`, `pix`, `messaging`, `reconciliation`)
- Porque o isolamento operacional melhora retries, observabilidade e rate limiting

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16 App Router | React 19 stack | Documentacao oficial atualizada em 2026; seguir scaffold novo do framework. |
| NestJS queues | BullMQ | A documentacao do Nest destaca `@nestjs/bullmq` como caminho atual, enquanto `bull` esta em manutencao. |
| Drizzle ORM | PostgreSQL | Fluxo codebase-first com `generate` + `migrate` encaixa bem no modelo transacional. |

## Sources

- [Next.js App Router docs](https://nextjs.org/docs/app) - App Router, Route Handlers, multi-tenant guide e features de producao
- [Next.js Deploying docs](https://nextjs.org/docs/app/getting-started/deploying) - `output: "standalone"` para imagem Docker enxuta
- [NestJS queues docs](https://docs.nestjs.com/techniques/queues) - integracao oficial com BullMQ e processamento distribuido
- [BullMQ guide](https://docs.bullmq.io/guide/queues) - filas, delays e job lifecycle em Redis
- [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html) - row-level security para hardening multi-tenant
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations) - fluxo `generate` + `migrate` e SQL versionado

---
*Stack research for: micro-SaaS de cobranca recorrente por WhatsApp + Pix*
*Researched: 2026-04-17*
