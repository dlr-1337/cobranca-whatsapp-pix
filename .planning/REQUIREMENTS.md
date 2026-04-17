# Requirements: CobraZap

**Defined:** 2026-04-17
**Core Value:** Micro e pequenos negocios conseguem cobrar recorrencias por WhatsApp com Pix e enxergar com confianca quem pagou, sem retrabalho manual e sem risco de vazamento entre tenants.

## v1 Requirements

### Authentication and Tenant

- [ ] **AUTH-01**: Proprietario do tenant pode criar conta da empresa com nome, email principal, telefone e timezone
- [ ] **AUTH-02**: Proprietario e operador autorizado podem entrar e sair do painel com email e senha
- [ ] **AUTH-03**: Usuario pode redefinir senha por email sem suporte manual
- [ ] **AUTH-04**: Proprietario pode configurar dados basicos do negocio e politica padrao de vencimento

### Customers and Consent

- [ ] **CUST-01**: Operador pode cadastrar e editar cliente com nome, telefone WhatsApp e observacoes
- [ ] **CUST-02**: Sistema valida telefone compativel com WhatsApp e evita duplicidade obvia por tenant sem confirmacao explicita
- [ ] **CUST-03**: Operador pode marcar cliente como ativo, inativo, inadimplente, cancelado ou bloqueado
- [ ] **CUST-04**: Operador pode registrar opt-in ou opt-out por canal com evidencia e timestamp

### Plans and Subscriptions

- [ ] **PLAN-01**: Operador pode criar e editar plano recorrente com nome, valor, periodicidade e dia padrao de vencimento
- [ ] **PLAN-02**: Operador pode associar mensagem padrao e perfil de lembrete a um plano
- [ ] **SUBS-01**: Operador pode vincular cliente a um plano com data de inicio e override de valor ou vencimento
- [ ] **SUBS-02**: Operador pode pausar, reativar ou cancelar assinatura sem perder historico
- [ ] **SUBS-03**: Sistema gera a proxima cobranca de uma assinatura ativa apenas uma vez por competencia

### Charges

- [ ] **CHRG-01**: Operador pode criar cobranca avulsa fora de uma assinatura
- [ ] **CHRG-02**: Operador pode visualizar cobrancas com status, valor, vencimento, origem, cliente e historico
- [ ] **CHRG-03**: Operador pode cancelar ou substituir cobranca nao paga sem apagar historico anterior
- [ ] **CHRG-04**: Operador pode reenviar a mesma cobranca sem criar duplicidade financeira
- [ ] **CHRG-05**: Painel mostra totais basicos de recebido, a vencer e vencido por tenant

### Pix

- [ ] **PIX-01**: Sistema gera cobranca Pix com vencimento em pelo menos um PSP e armazena `external_id`, QR Code e Pix Copia e Cola
- [ ] **PIX-02**: Sistema recebe webhook de pagamento do PSP e atualiza status da cobranca de forma idempotente
- [ ] **PIX-03**: Sistema registra eventos de expiracao, falha, cancelamento ou devolucao quando o PSP os disponibilizar
- [ ] **PIX-04**: Operacao consegue executar conciliacao para comparar status interno com status retornado pelo PSP

### WhatsApp and Messaging

- [ ] **MSG-01**: Operador pode visualizar preview da mensagem de cobranca com variaveis de cliente, valor, vencimento e Pix
- [ ] **MSG-02**: Operador pode abrir envio manual assistido por WhatsApp a partir de uma cobranca valida
- [ ] **MSG-03**: Sistema registra historico de dispatch por cobranca com timestamp, template e resultado do transporte
- [ ] **MSG-04**: Sistema suporta o mesmo modelo de template para cobranca inicial, lembrete e confirmacao de pagamento

### Automation

- [ ] **AUTO-01**: Operador pode configurar regras basicas de lembrete (D-1, D0 e D+1) por tenant
- [ ] **AUTO-02**: Sistema agenda lembretes apenas dentro da janela comercial configurada pelo tenant
- [ ] **AUTO-03**: Sistema cancela lembretes futuros quando a cobranca e marcada como paga

### Reports and Export

- [ ] **REPT-01**: Operador pode filtrar cobrancas por periodo, status, plano e cliente
- [ ] **REPT-02**: Operador pode exportar dados operacionais de cobrancas em CSV

### Operations and Security

- [ ] **OPS-01**: Sistema mantem trilha imutavel de auditoria para login, alteracoes de cobranca, dispatches e webhooks
- [ ] **OPS-02**: Sistema impede acesso a dados de outro tenant em API, painel e jobs internos
- [ ] **OPS-03**: Operacao pode inspecionar falhas de webhook ou job e reenfileirar processamento de forma segura

## v2 Requirements

### Authentication and Access

- **AUTH-05**: Proprietario pode convidar multiplos usuarios internos com papeis distintos
- **AUTH-06**: Usuario pode habilitar dois fatores de autenticacao
- **AUTH-07**: Suporte interno pode usar impersonacao auditada quando o recurso estiver ativado

### WhatsApp Official Automation

- **MSG-05**: Sistema envia mensagens automaticamente via Cloud API ou BSP homologado
- **MSG-06**: Sistema acompanha entrega, leitura e qualidade de template quando o provedor disponibilizar
- **MSG-07**: Sistema processa opt-out automatico por eventos inbound do canal

### Billing and Growth

- **BILL-01**: Tenant pode iniciar trial e contratar plano do proprio SaaS
- **BILL-02**: Proprietario pode fazer upgrade, downgrade e cancelamento do plano do SaaS
- **BILL-03**: Produto aplica limites por clientes, usuarios e automacoes conforme plano contratado
- **GROW-01**: Operador pode importar clientes via CSV
- **GROW-02**: Produto oferece relatorios comparativos e segmentacao por tags

### Payments Expansion

- **PIX-05**: Produto suporta Pix Automatico com parceiro compativel
- **PIX-06**: Produto suporta multiplos PSPs/contas recebedoras por tenant
- **API-01**: Produto oferece API publica para integracoes outbound

## Out of Scope

| Feature | Reason |
|---------|--------|
| Emissao fiscal completa | Nao e o problema principal de cobranca recorrente |
| ERP financeiro ou contabilidade geral | Aumenta muito escopo e dilui o ICP inicial |
| Cartao de credito e boleto no milestone inicial | Complicam operacao e suporte antes da validacao com Pix |
| Omnichannel alem de WhatsApp | O produto precisa fazer um canal muito bem antes de abrir varios |
| App mobile nativo | Web responsivo cobre o caso inicial com menor custo |
| Marketplace, split e custodia de recursos | Fora do posicionamento do produto e aumenta risco regulatorio |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| CUST-01 | Phase 2 | Pending |
| CUST-02 | Phase 2 | Pending |
| CUST-03 | Phase 2 | Pending |
| CUST-04 | Phase 2 | Pending |
| PLAN-01 | Phase 2 | Pending |
| PLAN-02 | Phase 2 | Pending |
| SUBS-01 | Phase 2 | Pending |
| SUBS-02 | Phase 2 | Pending |
| SUBS-03 | Phase 3 | Pending |
| CHRG-01 | Phase 3 | Pending |
| CHRG-02 | Phase 3 | Pending |
| CHRG-03 | Phase 3 | Pending |
| CHRG-04 | Phase 5 | Pending |
| CHRG-05 | Phase 3 | Pending |
| PIX-01 | Phase 4 | Pending |
| PIX-02 | Phase 4 | Pending |
| PIX-03 | Phase 4 | Pending |
| PIX-04 | Phase 4 | Pending |
| MSG-01 | Phase 5 | Pending |
| MSG-02 | Phase 5 | Pending |
| MSG-03 | Phase 5 | Pending |
| MSG-04 | Phase 5 | Pending |
| AUTO-01 | Phase 5 | Pending |
| AUTO-02 | Phase 5 | Pending |
| AUTO-03 | Phase 5 | Pending |
| REPT-01 | Phase 6 | Pending |
| REPT-02 | Phase 6 | Pending |
| OPS-01 | Phase 1 | Pending |
| OPS-02 | Phase 1 | Pending |
| OPS-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-17*
*Last updated: 2026-04-17 after initial definition*
