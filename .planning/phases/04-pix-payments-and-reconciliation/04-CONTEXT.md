# Phase 4 Context - Pix Payments and Reconciliation

## Goal

Fechar o loop financeiro com um PSP inicial, suportando geracao de cobranca Pix, webhook idempotente e reconciliacao operacional.

## Inputs from Phase 3

- O produto ja possui `charges` e `charge_events` tenant-scoped, com lifecycle interno e historico append-only.
- O painel de cobrancas ja existe em `/painel/cobrancas` com shell operacional e BFF same-origin.
- O worker ja exige `tenant_id` em payloads e o projeto assume processamento assíncrono para webhooks e retries.

## Scope

- Integrar um PSP inicial para criar cobrancas Pix com `external_id`, QR Code e copia e cola.
- Persistir um modelo interno estavel de Pix desacoplado do payload bruto do PSP.
- Receber eventos do PSP em inbox auditavel antes de atualizar o estado da cobranca.
- Reconciliar divergencias entre status interno e status do PSP a partir do painel operacional.

## Non-Goals

- Pix Automatico ou recorrencia nativa no PSP.
- Automacao oficial de WhatsApp.
- Multi-PSP ou split de recebimento.

## Constraints

- Toda tabela transacional nova deve carregar `tenant_id`.
- Payload bruto do PSP deve ficar preservado em tabelas/eventos auditaveis; o dominio usa campos internos estaveis.
- O endpoint de webhook deve responder `200` somente depois de persistir o evento recebido.
- Atualizacao de pagamento, expiracao, devolucao e reconciliacao deve ser idempotente.

## Implementation Defaults

- PSP inicial: Asaas, usando `POST /v3/customers`, `POST /v3/payments` com `billingType=PIX` e `GET /v3/payments/{id}/pixQrCode`.
- Como o Asaas permite clientes duplicados, o sistema vai manter mapeamento local `tenant/customer -> remote customer id`.
- O token recebido no header `asaas-access-token` sera validado no webhook.
- Eventos do Asaas entram em inbox persistente e sao processados pelo worker; o controller nao faz reconciliacao inline.
- A surface operacional reaproveita `/painel/cobrancas` em vez de criar um modulo novo.
