# Phase 4 UI Spec

## Screen

- Reutilizar `/painel/cobrancas` como surface principal da fase.
- Nao criar pagina separada para Pix; o operador deve continuar dentro do fluxo de cobranca existente.

## Sections

1. Card ou bloco Pix no detalhe da cobranca com:
   - status do Pix;
   - `external_id`;
   - expiracao;
   - copia e cola;
   - QR Code renderizado a partir do Base64.
2. Acao "Gerar Pix" apenas para cobrancas abertas que ainda nao possuem vinculacao PSP.
3. Acao "Reconciliar" para reconsultar o PSP e refletir divergencias.
4. Lista operacional de eventos/falhas recentes do PSP com timestamp e motivo.

## Interaction Rules

- "Gerar Pix" deve ser idempotente: se a cobranca ja tiver Pix ativo, a UI deve mostrar os dados existentes em vez de tentar criar outro.
- Falha de webhook ou de reconciliacao deve aparecer como estado operacional explicito, nao como erro generico de carregamento.
- A cobranca paga via webhook deve refletir status atualizado sem esconder o historico anterior.
- Acoes de reconciliacao nao podem vazar eventos de outro tenant.
