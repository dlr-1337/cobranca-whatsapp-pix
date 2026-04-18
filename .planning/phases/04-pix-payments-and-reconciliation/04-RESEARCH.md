# Phase 4 Research Notes

## PSP inicial

- O Asaas cobre o fluxo minimo do milestone com criacao de cliente, criacao de cobranca Pix e recuperacao de QR Code dinamico.
- O fluxo oficial documentado e:
  1. criar/recuperar cliente (`POST /v3/customers`);
  2. criar cobranca com `billingType=PIX` (`POST /v3/payments`);
  3. recuperar QR Code e copia e cola (`GET /v3/payments/{id}/pixQrCode`).
- A documentacao oficial indica que a criacao de clientes duplicados e permitida; por isso precisamos persistir o ID remoto por cliente local para evitar novos registros desnecessarios.

## Webhooks

- O Asaas opera com semantica "at least once", entao o mesmo webhook pode chegar repetido.
- A estrategia recomendada pelo proprio provedor e persistir cada evento com ID unico em uma tabela de inbox e responder `200` apenas depois da persistencia.
- O token configurado no webhook chega no header `asaas-access-token`; ele deve ser validado antes de aceitar o evento.
- A documentacao tambem recomenda processamento assíncrono dos eventos e retorno rapido de `200`, o que bate com a arquitetura do projeto.

## Eventos Pix relevantes

- Para Pix no prazo: `PAYMENT_CREATED -> PAYMENT_RECEIVED`.
- Para Pix em atraso: `PAYMENT_CREATED -> PAYMENT_OVERDUE -> PAYMENT_RECEIVED`.
- Para estorno depois do recebimento: `PAYMENT_CREATED -> PAYMENT_RECEIVED -> PAYMENT_REFUNDED`.
- Eventos como `PAYMENT_UPDATED`, `PAYMENT_DELETED` e `PAYMENT_RESTORED` nao representam liquidacao, mas devem permanecer auditados quando afetarem o estado exibido ao operador.

## Modelagem interna recomendada

- Separar:
  - mapeamento de cliente remoto do PSP;
  - registro estavel de Pix por cobranca;
  - inbox de eventos brutos;
  - execucoes de reconciliacao e divergencias encontradas.
- O modelo interno de Pix deve guardar pelo menos: provider, `external_id`, status interno do Pix, QR Code Base64, copia e cola, expiracao, ultimo sync e referencias para a cobranca local.
- A reconciliacao deve consultar o PSP por `external_id`, comparar com a cobranca local e registrar se houve `matched`, `updated` ou `divergence`.

## Surface operacional

- A tela de cobrancas ja existe e deve ganhar:
  - bloco Pix por cobranca com status, `external_id`, expiracao, QR Code e copia e cola;
  - acao de "Gerar Pix" para cobrancas abertas sem vinculacao PSP;
  - acao de "Reconciliar" para reconsultar o PSP;
  - visao de falhas/eventos pendentes para a operacao.

## Fontes oficiais

- Asaas Pix: https://docs.asaas.com/docs/payments-via-pix-or-dynamic-qr-code
- Asaas eventos de cobranca: https://docs.asaas.com/docs/payment-events
- Asaas idempotencia em webhooks: https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks
- Asaas clientes: https://docs.asaas.com/docs/creating-customers
- Asaas seguranca de webhook: https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint
