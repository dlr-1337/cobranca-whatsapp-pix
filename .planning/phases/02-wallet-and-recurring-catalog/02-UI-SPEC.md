# Phase 2: Wallet and Recurring Catalog - UI Spec

## Surface

- Nova rota autenticada: `/painel/carteira`
- Navegacao secundaria ao lado de `Configuracoes` e `Auditoria`

## Layout Contract

- Hero/header seguindo o mesmo shell visual da fundacao.
- Tres secoes no mesmo scroll, nesta ordem: `Clientes`, `Planos`, `Assinaturas`.
- Cada secao combina lista resumida + formulario inline de criacao/edicao.
- Estados vazios devem orientar a sequencia operacional: primeiro cliente, depois plano, depois assinatura.

## Interaction Contract

- Mutacoes exibem banner inline de sucesso/erro no mesmo padrao de `SettingsScreen`.
- Duplicidade obvia de telefone deve aparecer como aviso acionavel, permitindo confirmar sobrescrita conscientemente.
- Assinaturas devem exibir claramente status atual e ultimo evento de lifecycle.
- O consentimento de WhatsApp precisa ficar visivel na tabela/lista de clientes sem abrir modal separado.

## Visual Direction

- Reusar `soft-panel`, `PrimaryButton`, `SecondaryButton`, `InputField`, `SelectField`, `Banner`.
- Manter densidade operacional, sem cards decorativos extras.
- Copys em portugues, diretas e orientadas a operacao.

## Non-negotiables

- Nenhuma acao sensivel depende de `tenant_id` vindo do cliente.
- A tela deve permanecer usavel em desktop e tablet sem esconder informacoes criticas de status.
