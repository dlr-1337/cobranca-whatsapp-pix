# Pitfalls Research

**Domain:** micro-SaaS de cobranca recorrente por WhatsApp + Pix
**Researched:** 2026-04-17
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Tratar template e politica do WhatsApp como detalhe de transporte

**What goes wrong:**
O produto envia mensagens como se fossem textos livres, mas a operacao real depende de templates, qualidade, limites e opt-in.

**Why it happens:**
Times focam no "link do WhatsApp abre" e subestimam as regras do canal oficial.

**How to avoid:**
Modelar template, preview, historico de dispatch, consentimento e fallback manual assistido desde o MVP.

**Warning signs:**
- Template nao tem versionamento ou tipo de evento
- Nao existe registro de opt-out
- A equipe considera automacao "so mais um endpoint"

**Phase to address:**
Phase 5

---

### Pitfall 2: Webhooks e jobs sem idempotencia real

**What goes wrong:**
Pagamentos, cobrancas ou reminders sao duplicados quando PSP/BSP reenviam eventos ou quando workers reiniciam.

**Why it happens:**
O fluxo parece funcionar em ambiente feliz, mas nao define `jobId`, chave externa unica ou tabela de eventos processados.

**How to avoid:**
Persistir evento recebido antes de processar, usar unique constraints e deduplicacao por `external_id`/competencia/job key.

**Warning signs:**
- Jobs sem `jobId`
- Webhooks atualizam a charge direto sem trilha de evento
- Nao existe unique constraint por assinatura + competencia

**Phase to address:**
Phase 3 e Phase 4

---

### Pitfall 3: Vazamento cross-tenant por esquecimento de filtro

**What goes wrong:**
Um operador visualiza dados de outro tenant, ou suporte consegue agir sem trilha suficiente.

**Why it happens:**
O projeto trata multi-tenant como detalhe de controller, nao como regra de schema e dominio.

**How to avoid:**
Obrigar `tenant_id` em todas as entidades de negocio, usar policies/guards e auditar overrides administrativos.

**Warning signs:**
- Tabelas transacionais sem `tenant_id`
- Queries sem filtro de tenant
- Ferramentas internas com "listar tudo" sem justificativa

**Phase to address:**
Phase 1

---

### Pitfall 4: Acoplamento forte a um unico PSP

**What goes wrong:**
Trocar provedor, operar sandbox/producao ou corrigir um bug especifico de integracao exige refactor amplo.

**Why it happens:**
O primeiro adapter e escrito dentro do service principal e vira padrao acidental.

**How to avoid:**
Introduzir interface de gateway e modelo interno para Pix desde a primeira integracao.

**Warning signs:**
- Campo interno com nomes exatamente iguais ao payload do PSP
- Controllers conhecendo token, assinatura ou endpoint do parceiro
- Sem camada de traducao entre charge interna e payload externo

**Phase to address:**
Phase 4

---

### Pitfall 5: Tentar entregar ERP, billing e automacao completa antes de validar o ICP

**What goes wrong:**
O roadmap cresce demais, a validacao do problema principal atrasa e o produto perde foco.

**Why it happens:**
Parece "mais profissional" cobrir tudo logo, mas o ICP inicial quer resultado operacional rapido.

**How to avoid:**
Fixar o milestone inicial em cobranca recorrente simples, Pix Cobranca e envio manual assistido + lembretes basicos.

**Warning signs:**
- Billing do SaaS disputando prioridade com cobranca do cliente final
- Multiunidade e API publica entrando antes do beta fechado
- Backlog dominado por edge cases nao observados ainda

**Phase to address:**
Phase 6 (go/no-go para expandir)

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Jobs executados no processo web | Menos servicos no inicio | Perda de retries, timeout e deploys perigosos | So em prova de conceito local, nunca no beta |
| Salvar apenas status final, sem evento bruto | Schema menor | Sem replay, sem diagnostico e sem auditoria | Nunca |
| Queries multi-tenant sem policy/guard compartilhado | Entrega rapida | Alto risco de vazamento cross-tenant | Nunca |
| Template como string hard-coded | Menos modelagem | Nao suporta preview, versionamento nem governanca | Aceitavel apenas para um spike descartavel |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PSP Pix | Confiar apenas no webhook e nunca reconciliar | Webhook-first + job de reconciliacao + trilha de divergencia |
| PSP Pix | Nao guardar `external_id` e payload original | Persistir metadados minimos e raw payload auditavel |
| WhatsApp | Ignorar qualidade/review de template | Modelar ciclo de vida do template e fallback manual |
| WhatsApp | Nao normalizar telefone | Validar telefone em formato compativel antes de criar customer/disparo |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Gerar carteira mensal toda em request | Tela trava e timeouts aparecem | Geracao em lote por worker | Ja incomoda com poucas centenas de cobrancas |
| Dashboard baseado em joins sem indices | Lentidao em filtros por status e vencimento | Indices por `tenant_id`, `status`, `due_date`, `paid_at` | Algumas dezenas de milhares de linhas |
| Logs e historicos sem paginacao | Telas administrativas inutilizaveis | Cursor/paginacao e filtros desde o inicio | Cresce continuamente |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Webhook sem verificacao/autenticidade | Fraude de status e eventos falsos | Validar assinatura ou fonte confiavel por provedor |
| Opt-out sem efeito operacional imediato | Envio abusivo e risco de conta/bloqueio | Usar consentimento como gate do reminder automation |
| Suporte sem trilha de auditoria | Acoes sensiveis sem rastreio | Logar ator, alvo, motivo e timestamp |
| Dados sensiveis completos em logs | Vazamento de PII e segredos | Mascarar payloads e separar logs tecnicos de dados pessoais |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Excesso de estados e jargoes financeiros | Operador pequeno se perde | Status curtos, linguagem simples e proximas acoes claras |
| Fluxo principal espalhado em telas demais | Baixa adocao no onboarding | Caminho curto: cliente -> plano -> assinatura -> cobranca -> envio |
| Exigir automacao completa para primeiro valor | Beta trava por dependencia externa | Oferecer envio manual assistido e depois escalar |

## "Looks Done But Isn't" Checklist

- [ ] **Pix webhook:** muitas demos marcam pago, mas nao tratam duplicidade - verificar idempotencia e replay seguro
- [ ] **Reminder engine:** muitas implantacoes agendam lembretes, mas nao os cancelam apos pagamento - verificar cancelamento por status
- [ ] **Assistive send:** muitas telas abrem WhatsApp, mas nao registram historico - verificar `message_dispatch`
- [ ] **Multi-tenant:** muitas queries filtram no front, nao no back - verificar guards, repo scoping e constraints
- [ ] **Operacao beta:** muitas integracoes funcionam em sandbox, mas nao tem dashboard de falha - verificar fila/evento/replay

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Webhook duplicado gerou estado incorreto | MEDIUM | Reprocessar evento original, recalcular status e travar duplicates por chave unica |
| Template reprovado ou pausado | LOW | Fallback para modo manual assistido e revisao do template |
| Vazamento cross-tenant | HIGH | Corrigir filtro/policy, auditar acesso, rotacionar logs e revisar impacto LGPD |
| Divergencia com PSP | MEDIUM | Executar reconciliacao, reconsultar API do provedor e registrar motivo da correcao |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cross-tenant leakage | Phase 1 | Testes de isolamento, schema com `tenant_id`, audit trail |
| Duplicidade de cobranca/job | Phase 3 | Unique constraints, `jobId`, teste de reexecucao |
| Acoplamento a PSP | Phase 4 | Adapter interface e testes por provider |
| Template/governanca do WhatsApp | Phase 5 | Preview, versionamento, consentimento e fallback manual |
| Scope explosion antes do ICP | Phase 6 | Checklist de beta e revisao de milestone |

## Sources

- Escopo executivo-tecnico fornecido pelo usuario
- [Meta WhatsApp Business Platform docs](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [NestJS queues docs](https://docs.nestjs.com/techniques/queues)
- [BullMQ guide](https://docs.bullmq.io/guide/queues)
- [Manual de Padroes do Pix - Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf)

---
*Pitfalls research for: micro-SaaS de cobranca recorrente por WhatsApp + Pix*
*Researched: 2026-04-17*
