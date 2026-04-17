# Feature Research

**Domain:** micro-SaaS de cobranca recorrente por WhatsApp + Pix
**Researched:** 2026-04-17
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Onboarding do tenant e login | Ninguem aceita operar cobranca em planilha dentro do produto | LOW | Precisa ser rapido e sem friccao excessiva no beta |
| Cadastro de clientes com telefone valido | O canal principal e WhatsApp; sem telefone confiavel nada acontece | LOW | Validacao E.164/compatibilidade WhatsApp desde o inicio |
| Planos e assinaturas recorrentes | O problema central e recorrencia simples | MEDIUM | Periodicidade e vencimento padrao precisam ser first-class |
| Cobranca Pix com QR/Copia e Cola | E o meio de pagamento principal do mercado alvo | MEDIUM | Armazenar `external_id`, QR, payload e expiracao |
| Confirmacao de pagamento por webhook | O operador precisa confiar no status financeiro | MEDIUM | Idempotencia e trilha de eventos sao obrigatorias |
| Historico de cobranca por cliente | O pequeno negocio quer saber "quem pagou e quem nao pagou" | LOW | Aparece em lista, detalhe do cliente e detalhe da cobranca |
| Dashboard simples de recebido / a vencer / vencido | E a visao operacional minima esperada | LOW | Mobile-friendly e sem BI pesado |
| Auditoria minima | O produto mexe com pagamento, mensagens e suporte | MEDIUM | Log imutavel de eventos criticos |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Envio manual assistido por WhatsApp no MVP | De-risca operacao antes de automacao completa | LOW | Reduz dependencia inicial de template/API |
| Regras de lembrete por tenant | Diminui inadimplencia sem aumentar trabalho manual | MEDIUM | Comecar com D-1, D0, D+1 |
| Consentimento auditavel e opt-out operacional | Evita abuso do canal e prepara escala | MEDIUM | Necessario para automacao futura e compliance |
| Reconciliacao Pix | Evita divergencias silenciosas entre PSP e sistema | MEDIUM | Diferencial operacional importante para confianca |
| Abstracao de PSP e canal | Permite trocar parceiro sem reescrever dominio | HIGH | Deve entrar cedo na arquitetura, nao como refactor tardio |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Virar ERP financeiro completo | Parece aumentar ticket e retencao | Dilui foco, infla escopo e atrasa validacao | Manter foco em cobranca recorrente e operacao de recebimento |
| Omnichannel desde o dia 1 | Soa mais "enterprise" | Multiplica integracoes e regras de compliance | Entregar WhatsApp muito bem antes de abrir outros canais |
| Pix Automatico no MVP | Parece mais "automatico" e moderno | Exige maturidade maior de parceiro, jornada e operacao | Pix Cobranca com vencimento + lembretes bem executados |
| Chat de atendimento completo | Confunde cobranca com helpdesk | Alto custo de UX, notificacao e suporte | Historico de dispatch e fallback manual assistido |

## Feature Dependencies

```text
[Tenant + Auth]
    └──requires──> [Customers + Consent]
                      └──requires──> [Plans + Subscriptions]
                                            └──requires──> [Charges]
                                                                  └──requires──> [Pix]
                                                                                        └──requires──> [WhatsApp Dispatch]

[Reminder Rules] ──requires──> [Charges]
[Reminder Rules] ──requires──> [Consent]
[Reconciliation] ──requires──> [Pix Webhooks]
[Dashboard] ──enhances──> [Charges]
[Pix Automatico] ──conflicts──> [MVP scope discipline]
```

### Dependency Notes

- **Customers + Consent require Tenant + Auth:** sem isolamento e ownership nao existe carteira segura.
- **Plans + Subscriptions require Customers:** recorrencia precisa de um cliente-alvo concreto e regras conhecidas.
- **Charges require Plans + Subscriptions:** a fatura recorrente nasce de uma assinatura ativa ou de cobranca avulsa.
- **Pix requires Charges:** o PSP gera instrucao de pagamento a partir de uma cobranca interna.
- **WhatsApp Dispatch requires Pix:** a mensagem precisa de valor, vencimento e payload de pagamento validos.
- **Reminder Rules require Consent:** automacao sem opt-in verificavel vira risco operacional e de canal.

## MVP Definition

### Launch With (v1)

- [ ] Onboarding do tenant com auth basica - sem isso nao ha produto utilizavel
- [ ] Clientes, consentimento e planos recorrentes - base da operacao
- [ ] Assinaturas e geracao de cobrancas - motor central do produto
- [ ] Pix Cobranca com webhook de pagamento - valor real para o cliente
- [ ] Envio manual assistido por WhatsApp - menor caminho para provar utilidade
- [ ] Dashboard operacional basico - visibilidade minima para tomada de acao
- [ ] Auditoria, idempotencia e reconciliacao inicial - confiabilidade beta

### Add After Validation (v1.x)

- [ ] Envio automatico via API oficial/BSP - adicionar quando templates e operacao estiverem maduros
- [ ] Multiusuario com RBAC - entrar quando o uso deixar de ser solo
- [ ] Importacao CSV e exportacoes ampliadas - acelerar onboardings maiores
- [ ] Billing do proprio SaaS - monetizacao operacional depois de validar valor

### Future Consideration (v2+)

- [ ] Pix Automatico - so depois de fit operacional com parceiro
- [ ] Relatorios comparativos e cobranca inteligente - quando houver massa de dados
- [ ] API publica e integracoes externas - apos consolidar o dominio
- [ ] Multiunidade e multiplas contas recebedoras - quando o ICP pedir de forma recorrente

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Tenant + auth basica | HIGH | MEDIUM | P1 |
| Clientes + planos + assinaturas | HIGH | MEDIUM | P1 |
| Charges recorrentes | HIGH | MEDIUM | P1 |
| Pix com webhook | HIGH | HIGH | P1 |
| WhatsApp manual assistido | HIGH | LOW | P1 |
| Dashboard basico | HIGH | LOW | P1 |
| Regras basicas de lembrete | MEDIUM | MEDIUM | P2 |
| Reconciliacao | HIGH | MEDIUM | P2 |
| WhatsApp automatico oficial | HIGH | HIGH | P2 |
| Billing do SaaS | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competidor A (SaaS de cobranca) | Competidor B (CRM/BSP WhatsApp) | Our Approach |
|---------|----------------------------------|----------------------------------|--------------|
| Cobranca recorrente | Forte em boleto/cartao e gestao financeira | Fraco ou indireto | Priorizar Pix recorrente simples e operacao enxuta |
| Mensageria WhatsApp | Geralmente secundario | Forte, mas pouco financeiro | Tratar cobranca + canal como um unico fluxo operacional |
| Reconciliacao | Variavel conforme PSP | Normalmente fora do foco | Fazer reconciliacao como feature de confianca, nao apenas suporte |
| UX do operador | Muitas vezes carregada | Conversacional, mas pouco financeira | Painel curto, status claros e foco em carteira |

## Sources

- Escopo executivo-tecnico fornecido pelo usuario
- [Meta WhatsApp Business Platform docs](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Meta template guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)
- [Meta webhook setup docs](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
- [Manual de Padroes do Pix - Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf)

---
*Feature research for: micro-SaaS de cobranca recorrente por WhatsApp + Pix*
*Researched: 2026-04-17*
