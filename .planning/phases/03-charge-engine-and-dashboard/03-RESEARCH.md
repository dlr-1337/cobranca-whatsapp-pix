# Phase 3 Research Notes

## Charge model

- `charges` precisa suportar origem `manual` e `recurring`.
- Cobranca recorrente deve ligar para `subscription_id` e carregar uma `competence_key` para garantir unicidade por competencia.
- Cobranca manual pode ter `subscription_id` nulo e `replaces_charge_id` para substituicao operacional.

## Idempotent generation

- O caminho mais simples para a fase e combinar verificacao por repositorio com constraint unica em `(tenant_id, subscription_id, competence_key)`.
- A geracao deve:
  1. Ler assinaturas ativas cujo `nextCycleStart` esteja vencido em relacao a uma data de referencia.
  2. Criar uma unica cobranca por competencia.
  3. Avancar `nextCycleStart` para a proxima competencia apenas quando a cobranca e criada/encontrada.

## Dashboard

- Totais minimos:
  - `received`
  - `dueSoon`
  - `overdue`
- Lista precisa de filtros basicos por `status`, `customerId` e `origin`.

## Temporary operational bridge

- Ate a fase Pix, o painel pode registrar recebimento manual para validar o dashboard e o lifecycle interno.
