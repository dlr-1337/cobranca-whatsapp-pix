# Roadmap: CobraZap

## Overview

O primeiro milestone de CobraZap deve provar que um pequeno negocio consegue sair do cadastro do cliente para uma cobranca Pix enviada por WhatsApp e depois enxergar o pagamento confirmado no painel. O caminho mais seguro e construir fundacoes multi-tenant e de auditoria primeiro, estruturar a carteira recorrente, consolidar o motor de cobrancas, fechar o loop com Pix e WhatsApp assistido, e entao endurecer a operacao para um beta fechado com clientes reais.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundations and Tenancy** - Base do produto com auth, tenant, auditoria e isolamento de dados
- [ ] **Phase 2: Wallet and Recurring Catalog** - Clientes, consentimento, planos e assinaturas
- [ ] **Phase 3: Charge Engine and Dashboard** - Cobrancas recorrentes/avulsas e visibilidade operacional
- [ ] **Phase 4: Pix Payments and Reconciliation** - Integracao PSP, webhook e reconciliacao confiavel
- [ ] **Phase 5: WhatsApp Assisted Dispatch and Reminders** - Preview, envio assistido e automacoes basicas
- [ ] **Phase 6: Beta Operations and Hardening** - Exportacoes, replay seguro e readiness para beta fechado

## Phase Details

### Phase 1: Foundations and Tenancy
**Goal**: Entregar a base segura do produto com tenant onboarding, login, configuracao inicial e trilha imutavel de eventos criticos.
**Depends on**: Nothing (first phase)
**Requirements**: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, OPS-01, OPS-02]
**Success Criteria** (what must be TRUE):
  1. Proprietario consegue criar conta da empresa, entrar no painel e configurar dados basicos do tenant.
  2. Login, logout e alteracoes sensiveis aparecem em trilha de auditoria consultavel.
  3. Testes e guards impedem acesso a dados de outro tenant em API e jobs.
**Plans**: 3 plans

Plans:
- [x] 01-01: Scaffold do monorepo, ambientes locais e baseline de observabilidade
- [x] 01-02: Schema inicial de tenant/auth e fluxos de sessao/recuperacao de senha
- [x] 01-03: Guardrails de multi-tenant, auditoria e quality gates da fundacao

### Phase 2: Wallet and Recurring Catalog
**Goal**: Permitir que o operador monte a carteira do tenant com clientes, consentimento, planos e assinaturas recorrentes.
**Depends on**: Phase 1
**Requirements**: [CUST-01, CUST-02, CUST-03, CUST-04, PLAN-01, PLAN-02, SUBS-01, SUBS-02]
**Success Criteria** (what must be TRUE):
  1. Operador consegue cadastrar clientes validos e registrar consentimento por canal.
  2. Operador consegue criar planos recorrentes e associar mensagens/regras padrao.
  3. Operador consegue pausar, reativar e cancelar assinaturas sem perder historico.
**Plans**: 3 plans

Plans:
- [ ] 02-01: Modulo de clientes, validacao de telefone e consentimento
- [ ] 02-02: Modulo de planos, assinaturas e regras basicas de dominio recorrente
- [ ] 02-03: Fluxos de onboarding operacional e telas de gestao da carteira

### Phase 3: Charge Engine and Dashboard
**Goal**: Entregar o motor interno de cobrancas com recorrencia idempotente, cobranca avulsa e visao operacional minima.
**Depends on**: Phase 2
**Requirements**: [SUBS-03, CHRG-01, CHRG-02, CHRG-03, CHRG-05]
**Success Criteria** (what must be TRUE):
  1. Assinaturas ativas geram uma unica cobranca por competencia sem duplicidade.
  2. Operador consegue criar, visualizar, cancelar e substituir cobrancas nao pagas.
  3. O painel mostra recebido, a vencer e vencido por tenant com filtros operacionais basicos.
**Plans**: 3 plans

Plans:
- [ ] 03-01: Motor de recorrencia, competencia e garantias de idempotencia
- [ ] 03-02: API e UI do lifecycle de cobrancas avulsas e recorrentes
- [ ] 03-03: Dashboard operacional inicial e filtros essenciais

### Phase 4: Pix Payments and Reconciliation
**Goal**: Fechar o loop financeiro com um PSP inicial, suportando cobranca com vencimento, webhooks e conciliacao operacional.
**Depends on**: Phase 3
**Requirements**: [PIX-01, PIX-02, PIX-03, PIX-04]
**Success Criteria** (what must be TRUE):
  1. Cada cobranca valida pode gerar Pix com QR Code, copia e cola e `external_id`.
  2. Webhooks do PSP atualizam o status de pagamento de forma idempotente e auditavel.
  3. Operacao consegue reconciliar divergencias entre estado interno e estado do PSP.
**Plans**: 3 plans

Plans:
- [ ] 04-01: Adapter do PSP inicial e persistencia do modelo interno de Pix
- [ ] 04-02: Ingestao de webhooks, inbox de eventos e atualizacao de status
- [ ] 04-03: Rotinas de reconciliacao, falhas e playbook de divergencias

### Phase 5: WhatsApp Assisted Dispatch and Reminders
**Goal**: Permitir cobranca assistida no WhatsApp com preview de template, historico de dispatch e lembretes basicos.
**Depends on**: Phase 4
**Requirements**: [CHRG-04, MSG-01, MSG-02, MSG-03, MSG-04, AUTO-01, AUTO-02, AUTO-03]
**Success Criteria** (what must be TRUE):
  1. Operador consegue visualizar e reenviar uma cobranca por WhatsApp sem duplicar o financeiro.
  2. Cada dispatch fica associado a cobranca, template e timestamp correspondente.
  3. Lembretes D-1, D0 e D+1 respeitam janela comercial e param quando a cobranca e paga.
**Plans**: 3 plans

Plans:
- [ ] 05-01: Modelo de template, preview e montagem de mensagem
- [ ] 05-02: Envio manual assistido, historico e eventos de dispatch
- [ ] 05-03: Scheduler de lembretes, cancelamento por pagamento e regras por tenant

### Phase 6: Beta Operations and Hardening
**Goal**: Preparar o produto para beta fechado com filtros/exportacao, replay seguro de falhas e quality gates de operacao.
**Depends on**: Phase 5
**Requirements**: [REPT-01, REPT-02, OPS-03]
**Success Criteria** (what must be TRUE):
  1. Operador consegue filtrar cobrancas por periodo, status, plano e cliente, e exportar CSV operacional.
  2. A operacao consegue inspecionar eventos falhos e reenfileirar processamento sem corromper estados.
  3. Os fluxos criticos do beta estao cobertos por testes e checklist operacional.
**Plans**: 3 plans

Plans:
- [ ] 06-01: Filtros operacionais, exportacao CSV e ajustes de dashboard
- [ ] 06-02: Painel minimo de falhas, replay seguro e telemetria
- [ ] 06-03: Testes criticos, documentacao operacional e readiness do beta fechado

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundations and Tenancy | 3/3 | Complete | 2026-04-17 |
| 2. Wallet and Recurring Catalog | 0/3 | Not started | - |
| 3. Charge Engine and Dashboard | 0/3 | Not started | - |
| 4. Pix Payments and Reconciliation | 0/3 | Not started | - |
| 5. WhatsApp Assisted Dispatch and Reminders | 0/3 | Not started | - |
| 6. Beta Operations and Hardening | 0/3 | Not started | - |
