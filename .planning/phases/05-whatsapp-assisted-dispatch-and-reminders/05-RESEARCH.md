# Research - Phase 5

## Goal

Entregar o menor fluxo confiavel de WhatsApp assistido que satisfaça os requisitos operacionais do milestone sem introduzir a complexidade prematura de um BSP oficial.

## Findings

### 1. O milestone ja escolheu envio assistido como caminho de menor risco

O roadmap e o estado do projeto ja fixaram que o primeiro ciclo de cobranca usa WhatsApp manual assistido, nao automacao oficial. Isso significa que Phase 5 deve priorizar:

- preview robusto
- transporte simples e previsivel
- historico auditavel
- lembretes operacionais com cancelamento por pagamento

### 2. Template simples por tenant e suficiente nesta etapa

Os requisitos pedem o mesmo modelo para cobranca inicial, lembrete e confirmacao de pagamento, mas nao exigem versionamento enterprise. Um contrato tenant-level com tres templates textuais atende o milestone desde que cada dispatch persista:

- qual template foi usado
- qual mensagem foi renderizada
- quando foi aberta/disparada

### 3. Reminder precisa ser tratado como agenda operacional, nao como envio oficial

Como o canal continua assistido, o worker deve gerar e manter reminder intents/jobs. A entrega final continua sendo uma acao do operador, mas:

- D-1, D0 e D+1 precisam existir com horario valido
- reminders futuros precisam sumir quando a cobranca e paga
- reminders cancelados precisam ser auditaveis

### 4. O ponto de verdade continua sendo a cobranca + pagamento

Reminder nao pode viver isolado. O scheduler precisa depender de:

- charge aberta/nao encerrada
- Pix existente para a cobranca
- timezone e janela comercial do tenant
- cancelamento quando o pagamento chega via painel ou webhook

## Chosen Direction

- Transport: `wa.me` deep link com mensagem pre-renderizada.
- Persistence: tabela append-only-ish de dispatch com snapshots e status operacionais.
- Settings: templates e janela comercial no escopo de `tenant_settings`.
- Scheduling: worker sincroniza reminder jobs/records a partir do estado da cobranca e do pagamento.

## Risks and Mitigations

| Risk | Why it matters | Mitigation |
|------|----------------|------------|
| Operador abrir link sem historico | Perde rastreabilidade do envio | Registrar o dispatch antes de devolver a URL |
| Template mudar e apagar contexto historico | Auditoria fica inconsistente | Persistir `rendered_message` e `template_snapshot` por dispatch |
| Reminder rodar fora do horario comercial | Gera atrito operacional e risco de spam | Persistir janela comercial no tenant e alinhar `scheduled_for` a ela |
| Payment webhook chegar apos o reminder ser criado | Pode haver lembrete indevido | Cancelar reminders pendentes em toda transicao para pago/recebido |
| Fase 5 crescer para BSP oficial | Estoura milestone e compliance | Manter apenas deep link assistido nesta fase |
