# Project Research Summary

**Project:** CobraZap
**Domain:** micro-SaaS B2B de cobranca recorrente por WhatsApp + Pix
**Researched:** 2026-04-17
**Confidence:** MEDIUM-HIGH

## Executive Summary

CobraZap e um produto operacional de cobranca, nao um ERP financeiro. A pesquisa confirma que a melhor abordagem para esse dominio e separar painel web, API de dominio e workers assincronos desde cedo, porque o produto depende de webhooks, retries, reconciliacao e integracoes externas que nao cabem bem em um request HTTP linear.

O stack recomendado combina Next.js App Router para o painel, NestJS para a API e workers, PostgreSQL como base transacional e Redis/BullMQ para orquestrar cobrancas, lembretes e reprocessamentos. A documentacao oficial do Banco Central reforca que cobrancas Pix com vencimento dependem da API do PSP e incluem criacao/atualizacao estruturada, enquanto a documentacao oficial da Meta mostra que templates, webhooks, quality signals e limites operacionais nao sao detalhes opcionais.

Os maiores riscos sao: vazamento cross-tenant, eventos duplicados, acoplamento excessivo a um provedor e overbuilding antes de validar o ICP. Por isso, o roadmap recomendado parte de fundacoes multi-tenant, depois monta a carteira e o motor de cobrancas, e so entao fecha o loop com Pix, WhatsApp assistido e hardening operacional.

## Key Findings

### Recommended Stack

Next.js App Router e adequado para o painel porque o ecossistema oficial atual concentra routing, auth guidance, multi-tenant guidance e deployment em um unico framework. NestJS e BullMQ formam uma boa camada de backend/worker porque o proprio Nest oferece suporte oficial a queues e o BullMQ entrega jobs distribuidos, delays e retries sobre Redis. PostgreSQL continua sendo a melhor base para o dominio por constraints, consistencia transacional e opcao de row-level security para hardening multi-tenant.

**Core technologies:**
- **Next.js App Router**: painel operacional e onboarding - bom fit para UI web-first e BFF leve
- **NestJS**: API modular, webhooks e orchestration - separa claramente dominio e integracoes
- **PostgreSQL**: transacoes, auditoria e consultas operacionais - forte consistencia para cobranca e historico
- **Redis + BullMQ**: filas, retries e reminders - necessario para jobs atrasados e integracoes externas

### Expected Features

O escopo do usuario ja esta bem alinhado com o que seria esperado no dominio: tenant onboarding, clientes, planos, assinaturas, cobrancas, Pix, historico e dashboard. O diferencial mais forte para o milestone inicial e combinar isso com envio manual assistido por WhatsApp e reconciliacao operacional, sem tentar entrar cedo demais em ERP, omnichannel ou Pix Automatico.

**Must have (table stakes):**
- Tenant onboarding, auth basica e isolamento de dados
- Clientes, planos, assinaturas e cobrancas recorrentes
- Pix com vencimento, webhook de pagamento e historico confiavel
- Dashboard operacional simples e trilha de auditoria

**Should have (competitive):**
- Envio manual assistido por WhatsApp com preview de template
- Regras basicas de lembrete
- Reconciliacao entre status interno e PSP

**Defer (v2+):**
- WhatsApp automatico completo via API oficial/BSP
- Billing do proprio SaaS
- Pix Automatico, API publica e multiunidade

### Architecture Approach

A arquitetura recomendada e um monorepo com `apps/web`, `apps/api` e `apps/worker`, mais pacotes compartilhados de dominio, schema e integracoes. O fluxo ideal e: painel chama API, API persiste estado interno, efeitos externos vao para filas, webhooks entram em inbox de eventos, workers processam idempotentemente e atualizam cobrancas/dashboard.

**Major components:**
1. **Painel web** - onboarding, carteira, cobrancas e visao operacional
2. **API de dominio** - auth, regras de negocio, webhooks e contratos internos
3. **Worker(s)** - reminders, retries, dispatch, reconciliacao e processamento pesado
4. **Camada de integracao** - PSP Pix e Meta/BSP via adapters

### Critical Pitfalls

1. **Ignorar a governanca do WhatsApp** - modelar template, consentimento e fallback manual desde o MVP
2. **Nao tratar idempotencia seriamente** - usar unique keys, inbox de eventos e `jobId`
3. **Subestimar multi-tenant** - tornar `tenant_id` e auditoria regras de arquitetura, nao detalhes de controller
4. **Acoplar ao primeiro PSP** - encapsular a integracao em adapters e modelo interno estavel
5. **Expandir escopo cedo demais** - validar Pix Cobranca + WhatsApp assistido em um nicho antes de abrir V1.5/V2

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundations and tenancy
**Rationale:** multi-tenant e auditoria sao pre-condicoes do produto inteiro
**Delivers:** auth, tenant, schema base e guards
**Addresses:** table stakes de onboarding e seguranca
**Avoids:** vazamento cross-tenant

### Phase 2: Customer wallet and recurring catalog
**Rationale:** antes de cobrar, e preciso estruturar clientes, consentimento e recorrencia
**Delivers:** customers, consent, plans e subscriptions
**Uses:** schema relacional e regras de dominio
**Implements:** carteira operacional do tenant

### Phase 3: Charge engine and visibility
**Rationale:** cobranca recorrente e o coracao do produto; precisa existir antes da integracao de pagamento
**Delivers:** charges recorrentes/avulsas e dashboard basico
**Uses:** jobs de recorrencia e historico auditavel
**Implements:** lifecycle interno da cobranca

### Phase 4: Pix integration and reconciliation
**Rationale:** pagamento confirmado e a ponte entre cobranca criada e valor real entregue ao cliente
**Delivers:** adapter PSP, webhook e reconciliacao
**Implements:** componente financeiro-operacional do dominio

### Phase 5: Assisted WhatsApp and reminders
**Rationale:** fecha o loop do valor principal no canal certo, sem depender cedo demais da API oficial automatica
**Delivers:** preview, dispatch assistido, historico e lembretes basicos
**Implements:** camada de mensageria do produto

### Phase 6: Beta operations and hardening
**Rationale:** o beta fechado precisa de filtros, exportacao, replay seguro e quality gates
**Delivers:** CSV, operacao de falhas, testes e readiness
**Implements:** capacidade de operar com 10-20 clientes reais

### Phase Ordering Rationale

- Cobranca recorrente depende de fundacoes de tenant, carteira e motor de charges antes da integracao PSP/canal.
- Pix vem antes da automacao mais sofisticada de WhatsApp porque a mensagem precisa sair com payload financeiro valido.
- Hardening operacional nao fica para o fim absoluto; ele consolida o milestone beta apos o loop principal ja existir.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4:** escolha de PSP, autenticacao, webhook signature, limites de sandbox/producao
- **Phase 5:** processo de templates, opt-in/opt-out e estrategia BSP vs Cloud API direta
- **Phase 6:** playbook de operacao beta, observabilidade e capacidade de replay

Phases with standard patterns (skip research-phase):
- **Phase 1:** tenancy/auth/audit patterns sao bem conhecidos
- **Phase 2:** customers/plans/subscriptions sao modelagem de CRUD + dominio recorrente

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Baseado em documentacao oficial atual de Next.js, NestJS, BullMQ e PostgreSQL |
| Features | HIGH | O documento do usuario ja oferece um escopo rico e coerente |
| Architecture | HIGH | O dominio exige separacao clara entre UI, API, worker e integracoes |
| Pitfalls | MEDIUM-HIGH | Fortemente sustentado por padroes do dominio, mas a operacao real dependera do PSP/BSP escolhidos |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- Escolher um PSP inicial especifico e validar sandbox, webhook e cobranca com vencimento.
- Decidir se o canal vai iniciar com Cloud API direta da Meta ou com BSP homologado.
- Fixar estrategia de auth e sessoes (cookie session vs token) ao detalhar o scaffold da Fase 1.

## Sources

### Primary (HIGH confidence)
- [Next.js App Router docs](https://nextjs.org/docs/app)
- [Next.js Deploying docs](https://nextjs.org/docs/app/getting-started/deploying)
- [NestJS queues docs](https://docs.nestjs.com/techniques/queues)
- [BullMQ guide](https://docs.bullmq.io/guide/queues)
- [PostgreSQL CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
- [Manual de Padroes do Pix - Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf)
- [Meta WhatsApp Business Platform docs](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

### Secondary (MEDIUM confidence)
- Escopo executivo-tecnico fornecido pelo usuario

---
*Research completed: 2026-04-17*
*Ready for roadmap: yes*
