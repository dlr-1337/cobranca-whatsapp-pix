# Phase 2: Wallet and Recurring Catalog - Research

## Goal

Definir como encaixar clientes, consentimento, planos e assinaturas no baseline multi-tenant da Phase 1 sem relaxar tenant scoping, auditoria e prontidao para o motor de cobrancas.

## Current Codebase Findings

- O repositorio central (`createAppRepository`) ja e o ponto correto para expor capacidades de carteira sem abrir bypasses de tenant.
- O pacote `domain` ja concentra validacoes Zod e enums de auth; a mesma estrategia funciona bem para input/output de clientes, planos e assinaturas.
- O frontend autenticado atual usa rota same-origin + fetch client-side. Isso permite adicionar carteira sem introduzir server actions ou um novo stack de estado.
- A auditoria append-only ja esta funcional e deve ser reaproveitada em todas as mutacoes da carteira.

## Recommended Model

### Customers
- Tabela `customers` tenant-scoped para snapshot atual.
- Tabela `customer_channel_consent_events` tenant-scoped e append-only para historico de opt-in/opt-out.
- Validacao de telefone com normalizacao deterministica e bloqueio de duplicidade obvia por tenant.

### Plans
- Tabela `billing_plans` tenant-scoped com status, amount em centavos e contratos simples de mensagem/lembrete.
- Arquivamento em vez de delete.

### Subscriptions
- Tabela `subscriptions` tenant-scoped para estado atual.
- Tabela `subscription_events` append-only para transicoes de lifecycle.
- Campos minimos que preparem a competencia da Phase 3 (`nextCycleStart`, `anchorDueDay`, `overrideAmountCents`).

## Risks and Mitigations

| Risk | Why it matters | Mitigation |
|------|----------------|------------|
| Duplicidade de cliente por telefone | Pode quebrar dispatch e cobranca depois | Normalizar telefone e exigir `allowDuplicatePhone` explicito para sobrescrever |
| Historico fraco de consentimento | LGPD e operacao ficam sem lastro | Consentimento append-only com evidencia, timestamp e ator |
| Planos muito ricos cedo demais | Inflam escopo antes de cobrancas | Guardar apenas contrato simples de mensagem e reminder profile |
| Assinaturas sem campos de ancoragem | Phase 3 teria que migrar estado critico | Persistir `anchorDueDay` e `nextCycleStart` agora |
| Vazamento cross-tenant em listagens | Invalida o milestone | Reutilizar `tenantScopedWhere` e manter services autenticados com sessao |

## Verification Strategy

- Repository tests cobrindo duplicidade de telefone, derivacao do ultimo consentimento e lifecycle de assinatura.
- E2E da API cobrindo CRUD minimo tenant-scoped para clientes, planos e assinaturas.
- `pnpm test`, `pnpm typecheck` e `pnpm --filter @cobrazap/web build` como smoke da fase.
