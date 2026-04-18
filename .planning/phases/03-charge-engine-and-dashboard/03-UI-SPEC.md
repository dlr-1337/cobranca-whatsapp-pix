# Phase 3 UI Spec

## Screen

- Nova rota: `/painel/cobrancas`
- Mesmo shell visual de `configuracoes`, `auditoria` e `carteira`

## Sections

1. KPI cards com `Recebido`, `A vencer`, `Vencido`
2. Formulario de cobranca avulsa
3. Acao manual para gerar recorrencia a partir de uma data de referencia
4. Lista operacional com filtros, badges de status e acoes de `Marcar pago`, `Cancelar`, `Substituir`

## Interaction rules

- Substituicao so aparece para cobrancas abertas.
- Cobrancas canceladas ou pagas nao mostram acoes destrutivas repetidas.
- Erros de idempotencia devem voltar como mensagem explicita de operacao segura, nao como falha generica.
