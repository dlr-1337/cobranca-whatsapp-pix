# CobraZap

## What This Is

CobraZap e um micro-SaaS B2B, web-first e multi-tenant para cobranca recorrente por WhatsApp + Pix no mercado brasileiro. O produto atende autonomos e pequenos negocios que precisam cadastrar clientes, gerar cobrancas com vencimento, enviar mensagens de cobranca no canal certo e acompanhar quem pagou sem operacao manual fragmentada.

## Core Value

Micro e pequenos negocios conseguem cobrar recorrencias por WhatsApp com Pix e enxergar com confianca quem pagou, sem retrabalho manual e sem risco de vazamento entre tenants.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Onboarding do tenant com autenticacao basica e isolamento multi-tenant.
- [ ] Cadastro de clientes, consentimento e status operacional por cliente.
- [ ] Catalogo de planos e assinaturas recorrentes com ciclo simples e previsivel.
- [ ] Motor de cobrancas avulsas e recorrentes com historico auditavel.
- [ ] Integracao Pix com cobranca de vencimento, webhook e reconciliacao.
- [ ] Envio manual assistido por WhatsApp com templates e historico por cobranca.
- [ ] Lembretes basicos por regra e dashboard operacional de recebimentos.
- [ ] Observabilidade, auditoria e capacidade minima de recuperar falhas operacionais.

### Out of Scope

- Contabilidade completa e emissao fiscal completa - desviam do problema central de cobranca recorrente.
- Cartao de credito e boleto no lancamento inicial - aumentam integracoes e suporte antes da validacao do canal Pix.
- Omnichannel, call center e inbox conversacional completo - o foco inicial e cobranca via WhatsApp.
- App mobile nativo - o produto nasce web-first e responsivo.
- Marketplace, split de pagamento e custodia financeira - o produto nao deve se posicionar como instituicao financeira.
- Multi-pais no MVP - a primeira versao precisa ser otimizada para operacao no Brasil.

## Context

- O escopo fonte define um micro-SaaS de cobranca recorrente com foco no Brasil, Pix Cobranca e WhatsApp como canal principal.
- A estrategia correta e validar um nicho por vez, com Pix Cobranca antes de Pix Automatico e com envio manual assistido antes de automacoes mais sofisticadas.
- O produto precisa nascer pronto para LGPD, trilha de auditoria, opt-in/opt-out, webhooks, filas assincronas e conciliacao de pagamentos.
- A arquitetura recomendada separa painel web, API/backend, workers, banco relacional e Redis para filas e idempotencia.
- A pesquisa tecnica desta inicializacao priorizou documentacao oficial de Next.js, NestJS, BullMQ, PostgreSQL, Meta WhatsApp Business Platform e Banco Central do Brasil.

## Constraints

- **Mercado**: Brasil - timezone padrao `America/Sao_Paulo`, UX em portugues e aderencia a Pix/WhatsApp locais.
- **Canal**: WhatsApp como canal principal - templates, opt-in/opt-out e historico de entrega sao requisitos centrais.
- **Pagamento**: Pix Cobranca primeiro - Pix Automatico fica para milestone posterior.
- **Arquitetura**: Multi-tenant desde o inicio - todo dado transacional relevante precisa carregar `tenant_id`.
- **Operacao**: Web-first com workers - webhooks, lembretes, retries e reconciliacao nao podem depender de processamento inline.
- **Compliance**: LGPD, auditoria e nao-custodia - minimizar coleta, preservar rastreabilidade e delegar liquidacao ao PSP.
- **Produto**: MVP enxuto e nichado - evitar virar ERP financeiro generalista no primeiro ciclo.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Comecar com Pix Cobranca com vencimento, nao Pix Automatico | Reduz risco regulatorio e operacional, e e compativel com o principal caso de uso do documento | - Pending |
| Tratar envio manual assistido como fallback obrigatorio desde o inicio | Permite operar antes da maturidade completa de templates e automacoes do canal | - Pending |
| Separar `web`, `api` e `worker` em uma arquitetura unica de produto | O dominio exige webhooks, filas, retries e reconciliacao fora do request/response do painel | - Pending |
| Aplicar isolamento multi-tenant no modelo de dados e nos acessos desde o MVP | Vazamento cross-tenant invalida o produto para cobranca B2B | - Pending |
| Tratar auditoria, idempotencia e reconciliacao como escopo funcional, nao hardening tardio | Cobranca, pagamento e mensageria precisam de confiabilidade operacional desde o beta | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-17 after initialization*
