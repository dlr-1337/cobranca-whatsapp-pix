# Phase 3 Context - Charge Engine and Dashboard

## Goal

Entregar o primeiro motor interno de cobrancas com recorrencia idempotente, cobrancas avulsas e visibilidade operacional basica no painel.

## Inputs from Phase 2

- Clientes, consentimento, planos e assinaturas ja existem com isolamento multi-tenant.
- Assinaturas preservam lifecycle append-only e possuem `nextCycleStart`, `anchorDueDay` e overrides.
- O painel e a API ja usam o padrao same-origin BFF + leitura agregada tenant-scoped.

## Scope

- Criar modelo interno de cobranca recorrente e avulsa.
- Gerar cobrancas recorrentes sem duplicar competencia.
- Permitir cancelar, substituir e marcar recebimento manual de cobrancas nao liquidadas.
- Expor dashboard com totais e lista filtravel por status, cliente e tipo.

## Non-Goals

- Integracao real com PSP Pix.
- Dispatch por WhatsApp.
- Reconciliacao externa.

## Constraints

- Toda cobranca e evento financeiro precisa carregar `tenant_id`.
- Idempotencia e audit trail fazem parte do DoD.
- O corte deve permanecer compatível com Pix/webhook nas fases seguintes.
