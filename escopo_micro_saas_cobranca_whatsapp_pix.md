
# Escopo completo do projeto
## Micro-SaaS de cobrança recorrente por WhatsApp + Pix

**Nome provisório do produto:** CobraZap  
**Versão deste documento:** 1.0  
**Tipo do documento:** PRD + BRD + SRS resumidos em um único escopo executivo-técnico  
**Mercado-alvo inicial:** Brasil  
**Público inicial:** autônomos e pequenos negócios com cobrança recorrente simples

---

## 1. Resumo executivo

O produto é um micro-SaaS B2B para ajudar autônomos e pequenos negócios a **cadastrar clientes, criar cobranças recorrentes, gerar cobrança Pix, enviar lembretes por WhatsApp e acompanhar recebimentos**.

A proposta central é reduzir o trabalho manual de cobrança e aumentar a taxa de pagamento no prazo.

O sistema não será banco, carteira digital nem ERP completo. Ele será uma camada operacional de cobrança e acompanhamento, integrada a um PSP/provedor de cobrança Pix e à API do WhatsApp Business.

---

## 2. Premissas do projeto

1. O projeto será desenhado para **micro e pequenas operações**.
2. O caso de uso principal é **cobrança recorrente simples**, não faturamento corporativo complexo.
3. O canal principal de cobrança será **WhatsApp**.
4. O meio principal de pagamento será **Pix**.
5. O produto será **multi-tenant**, permitindo várias empresas dentro da mesma plataforma.
6. O escopo inicial será compatível com o mercado brasileiro.
7. A v1 deve funcionar com **Pix Cobrança**.
8. **Pix Automático** entra como trilha opcional/fase 2, dependendo de PSP parceiro e maturidade operacional.
9. O sistema precisa nascer pronto para:
   - LGPD
   - trilha de auditoria
   - consentimento/opt-in e opt-out
   - webhooks
   - fila assíncrona
   - conciliação de pagamento
10. O produto será web-first, responsivo, com painel administrativo e automações server-side.

---

## 3. Objetivos de negócio

### 3.1 Objetivos principais
- Reduzir atrasos de pagamento.
- Reduzir o tempo gasto com cobrança manual.
- Aumentar previsibilidade de recebimento.
- Criar receita recorrente para o SaaS.
- Validar um produto de baixo ticket e alta utilidade.

### 3.2 Metas de negócio iniciais
- MRR mensal crescente.
- Churn mensal controlado.
- CAC recuperado em até 3 meses.
- Payback rápido por canal orgânico e indicação.
- LTV/CAC maior que 3.

### 3.3 Hipóteses de valor
- Pequenos negócios preferem resolver cobrança no WhatsApp.
- A dor principal é operacional, não analítica.
- Usuários pagam por solução que economiza tempo e evita constrangimento manual.
- Uma cobrança enviada no canal certo, na hora certa, melhora taxa de recebimento.

---

## 4. Problema que o produto resolve

Hoje, o microempreendedor costuma:
- cobrar manualmente cliente por cliente;
- esquecer vencimentos;
- perder tempo montando mensagens;
- não saber quem pagou e quem está atrasado;
- misturar cobrança com conversa pessoal no WhatsApp;
- não ter histórico claro de cobrança;
- não conseguir automatizar a rotina.

O produto resolve isso centralizando:
- cadastro
- recorrência
- geração de cobrança
- envio da mensagem
- confirmação de pagamento
- lembrete
- histórico

---

## 5. Público-alvo e personas

### 5.1 Segmentos prioritários
- professores particulares
- personal trainers
- clínicas pequenas e terapeutas
- escolas de reforço
- academias de bairro
- prestadores de manutenção recorrente
- assinaturas locais simples
- consultorias de ticket baixo ou médio

### 5.2 Persona 1: Autônomo solo
- Faz tudo sozinho
- Pouco tempo
- Pouca paciência para sistema complexo
- Quer ver “quem pagou e quem não pagou”

### 5.3 Persona 2: Pequeno negócio com assistente
- Possui 1 ou 2 pessoas operando
- Precisa de vários acessos
- Quer relatórios básicos e histórico
- Precisa de padronização de cobrança

### 5.4 Persona 3: Cliente pagador
- Recebe mensagem no WhatsApp
- Quer pagar rápido
- Não quer fricção
- Pode aceitar pagamento recorrente quando confiar no negócio

---

## 6. Proposta de valor

**Promessa principal:**  
“Crie cobranças recorrentes, envie cobrança Pix por WhatsApp em poucos cliques e acompanhe quem pagou sem planilha e sem vergonha alheia digital.”

### 6.1 Benefícios funcionais
- cobrança mais rápida
- menos esquecimento
- menos retrabalho
- histórico centralizado
- confirmação automática por webhook
- lembretes configuráveis

### 6.2 Benefícios emocionais
- menos constrangimento
- menos ansiedade com recebimento
- sensação de controle
- operação mais profissional

---

## 7. Escopo do produto

### 7.1 Dentro do escopo
- cadastro de empresa/tenant
- cadastro de usuários internos
- autenticação
- cadastro de clientes
- cadastro de serviços/planos
- criação de assinaturas/recorrências
- geração de cobranças Pix
- envio de mensagens por WhatsApp
- templates aprováveis
- controle de opt-in/opt-out
- dashboard financeiro básico
- conciliação via webhook
- reprocessamento de eventos
- auditoria
- exportação CSV
- cobrança do próprio SaaS

### 7.2 Fora do escopo inicial
- contabilidade completa
- emissão fiscal completa
- folha de pagamento
- CRM comercial completo
- automação de marketing pesada
- suporte omnichannel
- call center
- app mobile nativo
- conciliação bancária universal
- cartão de crédito
- boleto no MVP
- split de pagamento
- antifraude avançado próprio
- marketplace
- múltiplos países no MVP

---

## 8. Fases do produto

### 8.1 MVP
- onboarding simples
- cadastro de clientes
- cadastro de plano recorrente
- geração de cobrança Pix
- envio manual assistido por WhatsApp
- lembretes básicos
- webhook de pagamento
- painel básico

### 8.2 V1
- envio automático via API WhatsApp
- templates configuráveis
- fila de mensagens
- múltiplas regras de lembrete
- relatórios
- perfis de acesso
- billing do SaaS
- importação CSV

### 8.3 V1.5
- automações mais avançadas
- segmentação por tags
- NPS básico
- recuperação de inadimplência
- relatórios comparativos

### 8.4 V2
- Pix Automático com PSP parceiro
- multiunidade
- múltiplas contas recebedoras
- dunning inteligente
- integrações externas adicionais
- API pública

---

## 9. Requisitos funcionais

---

### 9.1 Módulo de autenticação, conta e empresa

**RF-AUT-001** O sistema deve permitir criação de conta da empresa com nome, CNPJ opcional, e-mail principal, telefone e fuso horário.  
**RF-AUT-002** O sistema deve permitir login por e-mail e senha.  
**RF-AUT-003** O sistema deve permitir redefinição de senha por e-mail.  
**RF-AUT-004** O sistema deve permitir autenticação em dois fatores como recurso opcional.  
**RF-AUT-005** O sistema deve permitir gestão de usuários por tenant.  
**RF-AUT-006** O sistema deve suportar os papéis: proprietário, administrador, operador, financeiro e suporte interno.  
**RF-AUT-007** O sistema deve registrar trilha de auditoria de login, logout, falhas de acesso e alterações sensíveis.  
**RF-AUT-008** O sistema deve bloquear acesso de usuário inativo.  
**RF-AUT-009** O sistema deve permitir troca de plano do SaaS.  
**RF-AUT-010** O sistema deve permitir cancelamento da conta com fluxo guiado e política de retenção.

---

### 9.2 Módulo de clientes

**RF-CLI-001** O sistema deve permitir cadastrar cliente com nome, telefone, e-mail opcional, CPF opcional, documento alternativo opcional e observações.  
**RF-CLI-002** O sistema deve validar telefone em formato compatível com WhatsApp.  
**RF-CLI-003** O sistema deve permitir marcar status do cliente como ativo, inativo, inadimplente, cancelado ou bloqueado.  
**RF-CLI-004** O sistema deve permitir aplicar tags aos clientes.  
**RF-CLI-005** O sistema deve permitir busca por nome, telefone, e-mail, tag e status.  
**RF-CLI-006** O sistema deve impedir duplicidade óbvia por telefone dentro do tenant, salvo confirmação manual.  
**RF-CLI-007** O sistema deve permitir importar clientes por CSV.  
**RF-CLI-008** O sistema deve manter histórico resumido de cobranças do cliente.  
**RF-CLI-009** O sistema deve registrar status de opt-in e opt-out por canal.  
**RF-CLI-010** O sistema deve permitir anonimização/exclusão lógica do cliente conforme regra LGPD e retenção aplicável.

---

### 9.3 Módulo de catálogo de serviços/planos

**RF-PLN-001** O sistema deve permitir cadastrar serviço ou plano com nome, descrição, valor, periodicidade e dia de vencimento padrão.  
**RF-PLN-002** O sistema deve suportar periodicidade semanal, quinzenal, mensal, trimestral, semestral e anual.  
**RF-PLN-003** O sistema deve permitir configurar taxa de adesão opcional.  
**RF-PLN-004** O sistema deve permitir configurar carência ou início futuro.  
**RF-PLN-005** O sistema deve permitir desativar plano sem apagar histórico.  
**RF-PLN-006** O sistema deve permitir duplicar plano existente.  
**RF-PLN-007** O sistema deve permitir definir mensagem padrão associada ao plano.  
**RF-PLN-008** O sistema deve permitir associar regras de lembrete padrão ao plano.

---

### 9.4 Módulo de assinaturas/recorrências

**RF-REC-001** O sistema deve permitir vincular um cliente a um plano recorrente.  
**RF-REC-002** O sistema deve permitir sobrescrever valor, vencimento, início e observações por assinatura.  
**RF-REC-003** O sistema deve permitir pausar assinatura.  
**RF-REC-004** O sistema deve permitir reativar assinatura pausada.  
**RF-REC-005** O sistema deve permitir cancelar assinatura sem apagar histórico.  
**RF-REC-006** O sistema deve permitir gerar cobranças futuras automaticamente conforme periodicidade.  
**RF-REC-007** O sistema deve impedir geração duplicada da mesma cobrança na mesma competência, salvo ação administrativa autorizada.  
**RF-REC-008** O sistema deve permitir assinatura recorrente de valor fixo no MVP.  
**RF-REC-009** O sistema deve prever suporte a variação de valor em fases futuras.  
**RF-REC-010** O sistema deve registrar motivo de pausa, cancelamento ou alteração relevante.

---

### 9.5 Módulo de cobranças

**RF-COB-001** O sistema deve permitir criar cobrança avulsa.  
**RF-COB-002** O sistema deve permitir criar cobrança recorrente automaticamente a partir da assinatura.  
**RF-COB-003** O sistema deve permitir status de cobrança: rascunho, agendada, gerada, enviada, visualizada, paga, vencida, cancelada, falha e contestada/manual.  
**RF-COB-004** O sistema deve exibir valor, vencimento, cliente, origem, canal de envio e histórico.  
**RF-COB-005** O sistema deve permitir cancelar cobrança antes do pagamento.  
**RF-COB-006** O sistema deve permitir regenerar uma nova cobrança substituta quando aplicável.  
**RF-COB-007** O sistema deve permitir aplicar desconto manual.  
**RF-COB-008** O sistema deve permitir registrar acréscimo manual quando a operação permitir.  
**RF-COB-009** O sistema deve permitir anexar nota interna à cobrança.  
**RF-COB-010** O sistema deve permitir exportar cobranças em CSV.  
**RF-COB-011** O sistema deve permitir filtros por status, período, cliente, plano, valor e operador.  
**RF-COB-012** O sistema deve permitir reenvio de cobrança por WhatsApp.  
**RF-COB-013** O sistema deve impedir exclusão física de cobrança já enviada ou paga.  
**RF-COB-014** O sistema deve manter histórico imutável de alterações críticas.  
**RF-COB-015** O sistema deve oferecer visão mensal e visão por cliente.

---

### 9.6 Módulo Pix

**RF-PIX-001** O sistema deve integrar com pelo menos um PSP/provedor de cobrança Pix no MVP.  
**RF-PIX-002** O sistema deve gerar instrução de cobrança Pix associada à cobrança.  
**RF-PIX-003** O sistema deve armazenar identificador externo, payload Pix Copia e Cola, QR Code e metadados retornados pelo PSP.  
**RF-PIX-004** O sistema deve permitir cobrança com vencimento.  
**RF-PIX-005** O sistema deve receber webhook de confirmação de pagamento.  
**RF-PIX-006** O sistema deve validar assinatura/autenticidade do webhook quando o provedor oferecer esse recurso.  
**RF-PIX-007** O sistema deve atualizar status da cobrança após pagamento confirmado.  
**RF-PIX-008** O sistema deve registrar eventos de cancelamento, expiração, falha e devolução quando recebidos do PSP.  
**RF-PIX-009** O sistema deve executar rotina de reconciliação para comparar status interno e status do PSP.  
**RF-PIX-010** O sistema deve tratar idempotência de webhooks.  
**RF-PIX-011** O sistema deve permitir troca futura de PSP por camada de abstração.  
**RF-PIX-012** O sistema deve prever suporte a Pix Automático como módulo posterior.

---

### 9.7 Módulo WhatsApp

**RF-WPP-001** O sistema deve permitir integração com WhatsApp Business Platform via API oficial ou BSP homologado.  
**RF-WPP-002** O sistema deve cadastrar modelos de mensagem por evento.  
**RF-WPP-003** O sistema deve suportar variáveis em template, como nome do cliente, valor, vencimento, link e código Pix.  
**RF-WPP-004** O sistema deve permitir pré-visualização da mensagem antes do envio.  
**RF-WPP-005** O sistema deve permitir envio manual pelo operador.  
**RF-WPP-006** O sistema deve permitir envio automático por regra.  
**RF-WPP-007** O sistema deve controlar fila de envio, tentativas e falhas.  
**RF-WPP-008** O sistema deve receber status de entrega/lido quando disponibilizados pelo provedor.  
**RF-WPP-009** O sistema deve registrar histórico de mensagens enviadas por cobrança.  
**RF-WPP-010** O sistema deve impedir envio automático para cliente sem opt-in válido quando exigido pela política do canal.  
**RF-WPP-011** O sistema deve disponibilizar mecanismo de opt-out.  
**RF-WPP-012** O sistema deve permitir desativar o envio automático por cliente.  
**RF-WPP-013** O sistema deve suportar mensagens de: cobrança inicial, lembrete pré-vencimento, lembrete no vencimento, pós-vencimento, confirmação de pagamento, confirmação de opt-in e confirmação de opt-out.  
**RF-WPP-014** O sistema deve manter trilha com timestamp, template usado, operador ou job automático e resposta do provedor.  
**RF-WPP-015** O sistema deve permitir modo “manual assistido” por link do WhatsApp como fallback operacional.

---

### 9.8 Módulo de regras de lembrete e automação

**RF-AUTM-001** O sistema deve permitir configurar lembretes por tenant.  
**RF-AUTM-002** O sistema deve permitir regras como D-3, D-1, D0, D+1, D+3, D+7.  
**RF-AUTM-003** O sistema deve permitir horários comerciais configuráveis.  
**RF-AUTM-004** O sistema deve impedir envio em horário proibido definido pelo tenant.  
**RF-AUTM-005** O sistema deve cancelar lembretes futuros quando a cobrança for paga.  
**RF-AUTM-006** O sistema deve permitir desligar uma regra por cliente, por plano ou por cobrança.  
**RF-AUTM-007** O sistema deve registrar qual automação gerou cada envio.  
**RF-AUTM-008** O sistema deve permitir simulação prévia de regras antes da ativação.

---

### 9.9 Módulo de dashboard e relatórios

**RF-REP-001** O sistema deve exibir valor recebido no período.  
**RF-REP-002** O sistema deve exibir valor a vencer.  
**RF-REP-003** O sistema deve exibir valor vencido.  
**RF-REP-004** O sistema deve exibir taxa de pagamento no prazo.  
**RF-REP-005** O sistema deve exibir taxa de recuperação após lembrete.  
**RF-REP-006** O sistema deve exibir clientes inadimplentes.  
**RF-REP-007** O sistema deve permitir exportar dados em CSV.  
**RF-REP-008** O sistema deve permitir filtros por período, plano, operador e status.  
**RF-REP-009** O sistema deve exibir funil básico: gerada > enviada > paga.  
**RF-REP-010** O sistema deve permitir dashboard simplificado em mobile.

---

### 9.10 Módulo de suporte/admin interno

**RF-ADM-001** O sistema deve possuir painel interno para suporte operacional.  
**RF-ADM-002** O sistema deve permitir impersonação controlada e auditada para suporte, se ativada.  
**RF-ADM-003** O sistema deve permitir consulta de eventos técnicos por tenant.  
**RF-ADM-004** O sistema deve permitir reprocessar webhooks falhos.  
**RF-ADM-005** O sistema deve permitir reencaminhar jobs de fila.  
**RF-ADM-006** O sistema deve permitir suspender tenant por inadimplência ou abuso.  
**RF-ADM-007** O sistema deve registrar todas as ações administrativas críticas.

---

### 9.11 Módulo de billing do próprio SaaS

**RF-BIL-001** O sistema deve permitir planos do SaaS com limite por número de clientes ativos, usuários e automações.  
**RF-BIL-002** O sistema deve permitir trial.  
**RF-BIL-003** O sistema deve permitir cobrança recorrente do SaaS por gateway externo.  
**RF-BIL-004** O sistema deve permitir cancelamento, downgrade e upgrade.  
**RF-BIL-005** O sistema deve bloquear recursos premium quando houver inadimplência do tenant, respeitando política definida.  
**RF-BIL-006** O sistema deve emitir avisos de cobrança do próprio SaaS.  
**RF-BIL-007** O sistema deve manter histórico de faturas do SaaS.

---

## 10. Regras de negócio

**RN-001** O tenant é a unidade de isolamento lógico de dados.  
**RN-002** Cada cliente pertence a exatamente um tenant.  
**RN-003** Uma assinatura pertence a um cliente e a um tenant.  
**RN-004** Uma cobrança só pode ser enviada se tiver cliente válido, canal habilitado e meio de pagamento gerado.  
**RN-005** Uma cobrança paga não pode voltar para rascunho.  
**RN-006** O pagamento confirmado pelo PSP é a principal fonte de verdade financeira operacional.  
**RN-007** Webhooks devem ser idempotentes.  
**RN-008** Se houver divergência entre webhook e base interna, a rotina de reconciliação deve prevalecer após validação.  
**RN-009** Toda automação deve ser auditável.  
**RN-010** O opt-out deve ter efeito imediato para novas comunicações automatizadas.  
**RN-011** O sistema deve operar em America/Sao_Paulo por padrão no mercado brasileiro.  
**RN-012** Cobrança recorrente mensal com dia inexistente no mês deve seguir política configurável, com padrão “último dia útil/último dia do mês”, a ser definido na configuração do tenant.  
**RN-013** Assinatura pausada não gera novas cobranças enquanto durar a pausa.  
**RN-014** Assinatura cancelada não gera novas cobranças, mas preserva histórico.  
**RN-015** Cliente bloqueado não deve receber novos envios automáticos.  
**RN-016** O reenvio de cobrança não cria automaticamente uma nova cobrança; apenas reenvia a cobrança existente, salvo ação explícita de substituição.  
**RN-017** Toda exclusão operacional deve ser preferencialmente lógica.  
**RN-018** Logs de auditoria são imutáveis para usuários comuns.  
**RN-019** Falha temporária de envio deve entrar em retry conforme política de fila.  
**RN-020** Templates devem ser versionados.

---

## 11. Requisitos não funcionais

### 11.1 Segurança
**RNF-SEG-001** Criptografia em trânsito com TLS.  
**RNF-SEG-002** Criptografia em repouso para dados sensíveis quando cabível.  
**RNF-SEG-003** Hash seguro de senha.  
**RNF-SEG-004** Controle de acesso por papel.  
**RNF-SEG-005** Registro de auditoria para ações críticas.  
**RNF-SEG-006** Proteção CSRF, rate limiting, proteção contra brute force e validação de entrada.  
**RNF-SEG-007** Segredos e chaves em cofre seguro.  
**RNF-SEG-008** Rotação periódica de credenciais.  
**RNF-SEG-009** Backups cifrados.  
**RNF-SEG-010** Política de sessão com expiração configurável.

### 11.2 Performance
**RNF-PERF-001** Resposta média do painel abaixo de 2 segundos para consultas comuns em base pequena/média.  
**RNF-PERF-002** Processamento assíncrono para envios, webhooks e geração em lote.  
**RNF-PERF-003** Suporte a lote de geração mensal sem travar a interface.  
**RNF-PERF-004** Paginação obrigatória em listas extensas.

### 11.3 Disponibilidade e continuidade
**RNF-DISP-001** Meta de disponibilidade mínima de 99,5% no MVP.  
**RNF-DISP-002** Backups diários automatizados.  
**RNF-DISP-003** Restauração testável.  
**RNF-DISP-004** Fila resiliente a falhas transitórias.  
**RNF-DISP-005** Monitoramento de jobs e webhooks.

### 11.4 Escalabilidade
**RNF-ESC-001** Arquitetura preparada para multi-tenant.  
**RNF-ESC-002** Separação entre app web, workers e banco de dados.  
**RNF-ESC-003** Camada de abstração para PSP e WhatsApp.  
**RNF-ESC-004** Suporte a sharding futuro por tenant grande, se necessário.

### 11.5 Observabilidade
**RNF-OBS-001** Logs estruturados.  
**RNF-OBS-002** Métricas de filas, latência, erro e webhook.  
**RNF-OBS-003** Alertas para falhas de integração.  
**RNF-OBS-004** Correlation ID por requisição e job.

### 11.6 Usabilidade
**RNF-UX-001** Onboarding em até 10 minutos para primeiro uso.  
**RNF-UX-002** Interface mobile-friendly.  
**RNF-UX-003** Fluxo principal em até 5 passos: cadastrar cliente > vincular plano > gerar cobrança > enviar > acompanhar.  
**RNF-UX-004** Mensagens e status em linguagem simples.  
**RNF-UX-005** Feedback claro de sucesso, falha e próximos passos.

### 11.7 Acessibilidade
**RNF-ACC-001** Contraste mínimo adequado.  
**RNF-ACC-002** Navegação por teclado nas funções centrais.  
**RNF-ACC-003** Rótulos acessíveis em formulários.  
**RNF-ACC-004** Suporte básico a leitores de tela nas áreas críticas.

---

## 12. Requisitos legais e de compliance

### 12.1 LGPD
O projeto deve nascer com:
- mapeamento de dados pessoais tratados;
- finalidade definida por fluxo;
- base legal revisada com apoio jurídico;
- política de privacidade;
- termo de uso;
- registro de consentimento quando aplicável;
- canal para direitos do titular;
- política de retenção e descarte;
- processo de resposta a incidente.

### 12.2 Privacidade por padrão
- coletar apenas o necessário;
- evitar campos excessivos;
- permitir anonimização;
- separar dados operacionais de dados analíticos;
- mascarar dados em telas e logs quando possível.

### 12.3 Compliance de mensageria
- registrar opt-in;
- registrar opt-out;
- respeitar regras do canal;
- usar templates aprovados em fluxos automatizados;
- limitar frequência de envio;
- bloquear tenant abusivo.

### 12.4 Compliance financeiro operacional
- não custodiar dinheiro;
- não se posicionar como instituição financeira;
- delegar liquidação ao PSP;
- manter trilha de conciliação;
- tratar devoluções e estornos apenas como eventos operacionais recebidos do parceiro.

---

## 13. Arquitetura recomendada

### 13.1 Visão geral
Arquitetura web SaaS multi-tenant com componentes desacoplados:

1. **Frontend web**  
   Painel administrativo responsivo.

2. **API backend**  
   Regras de negócio, autenticação, módulos centrais e integrações.

3. **Banco relacional**  
   Fonte principal de dados transacionais.

4. **Fila/Workers**  
   Envio de mensagens, geração em lote, reconciliação, retries, webhooks.

5. **Cache/Redis**  
   Sessões, rate limiting, filas, idempotência.

6. **Object storage**  
   Exportações, arquivos temporários, evidências.

7. **Serviço de mensageria**  
   Integração WhatsApp.

8. **Serviço PSP/Pix**  
   Geração e confirmação de cobrança.

9. **Observabilidade**  
   Logging, métricas e alertas.

### 13.2 Stack sugerida
- Frontend: React/Next.js
- Backend: Node.js com framework estruturado
- Banco: PostgreSQL
- Fila e cache: Redis
- Jobs: worker assíncrono
- Infra: containers
- Hospedagem: cloud com ambiente app + worker + banco gerenciado
- Monitoramento: logs centralizados + erro + métricas

### 13.3 Princípios arquiteturais
- multi-tenant desde o início
- separação de responsabilidades
- idempotência
- observabilidade
- baixo acoplamento com parceiros
- segurança por padrão
- automação assíncrona
- feature flags

---

## 14. Modelo de dados principal

### 14.1 Entidades

**Tenant**
- id
- nome
- documento
- timezone
- plano_saas
- status

**User**
- id
- tenant_id
- nome
- email
- senha_hash
- papel
- status
- ultimo_login_at

**Customer**
- id
- tenant_id
- nome
- telefone
- email
- cpf
- status
- notes

**CustomerConsent**
- id
- tenant_id
- customer_id
- canal
- status
- origem
- granted_at
- revoked_at
- evidencia

**Plan**
- id
- tenant_id
- nome
- descricao
- valor
- periodicidade
- dia_vencimento
- ativo

**Subscription**
- id
- tenant_id
- customer_id
- plan_id
- valor_override
- inicio
- fim
- status
- paused_until

**Charge**
- id
- tenant_id
- customer_id
- subscription_id
- competencia
- valor
- vencimento
- status
- origin_type
- sent_at
- paid_at

**PixCharge**
- id
- charge_id
- psp_name
- external_id
- qr_code
- copia_cola
- expires_at
- payload_json
- status

**MessageTemplate**
- id
- tenant_id
- event_type
- nome
- corpo
- provider_template_name
- status

**MessageDispatch**
- id
- tenant_id
- charge_id
- customer_id
- template_id
- channel
- trigger_type
- provider_message_id
- status
- sent_at
- delivered_at
- read_at
- error_reason

**ReminderRule**
- id
- tenant_id
- nome
- event_type
- offset_days
- send_time
- active

**WebhookEvent**
- id
- tenant_id
- provider
- event_type
- external_id
- payload_json
- processed_at
- status

**AuditLog**
- id
- tenant_id
- actor_type
- actor_id
- action
- target_type
- target_id
- metadata_json
- created_at

**InvoiceSaaS**
- id
- tenant_id
- plano
- valor
- vencimento
- status

### 14.2 Relacionamentos
- Tenant 1:N Users
- Tenant 1:N Customers
- Customer 1:N Subscriptions
- Subscription 1:N Charges
- Charge 1:1 PixCharge
- Charge 1:N MessageDispatch
- Customer 1:N CustomerConsent
- Tenant 1:N ReminderRule
- Tenant 1:N AuditLog

---

## 15. Fluxos principais do usuário

### 15.1 Onboarding
1. Criar conta da empresa  
2. Confirmar e-mail  
3. Configurar dados do negócio  
4. Conectar PSP  
5. Conectar WhatsApp ou ativar modo manual assistido  
6. Criar primeiro plano  
7. Importar ou cadastrar clientes  
8. Criar primeira assinatura  
9. Gerar primeira cobrança  
10. Enviar primeira cobrança

### 15.2 Fluxo principal de cobrança recorrente
1. Usuário cria plano mensal  
2. Usuário vincula cliente ao plano  
3. Sistema gera cobrança da competência  
4. Sistema solicita/recebe geração Pix do PSP  
5. Sistema disponibiliza mensagem  
6. Operador envia ou automação agenda envio  
7. Cliente recebe mensagem e paga  
8. PSP envia webhook  
9. Sistema marca cobrança como paga  
10. Sistema cancela lembretes futuros  
11. Dashboard atualiza

### 15.3 Fluxo de inadimplência
1. Cobrança vence sem pagamento  
2. Sistema muda status para vencida  
3. Regra dispara lembrete D+1  
4. Se não pagar, dispara D+3 e D+7  
5. Operador pode renegociar ou pausar cobrança  
6. Histórico permanece auditável

### 15.4 Fluxo de opt-out
1. Cliente pede parar mensagens  
2. Operador registra opt-out ou sistema reconhece evento  
3. Canal é bloqueado para envios automáticos  
4. Histórico do consentimento é preservado  
5. Próximas automações não podem usar esse canal

---

## 16. Integrações

### 16.1 Integração PSP/Pix
Requisitos:
- autenticação segura
- geração de cobrança
- recuperação de status
- recebimento de webhook
- cancelamento quando aplicável
- reconciliação programada
- abstração por adaptador

### 16.2 Integração WhatsApp
Requisitos:
- envio de template
- envio manual assistido
- status de mensagem
- fila e retry
- webhooks do canal
- controle de opt-in/opt-out
- versionamento de templates

### 16.3 Integrações futuras
- CRM simples
- planilhas
- contabilidade
- API pública
- webhooks outbound do produto

---

## 17. API do produto (alto nível)

### 17.1 Endpoints principais
**Auth**
- POST /auth/register
- POST /auth/login
- POST /auth/forgot-password
- POST /auth/reset-password

**Customers**
- GET /customers
- POST /customers
- GET /customers/{id}
- PATCH /customers/{id}
- POST /customers/import

**Plans**
- GET /plans
- POST /plans
- PATCH /plans/{id}

**Subscriptions**
- GET /subscriptions
- POST /subscriptions
- PATCH /subscriptions/{id}
- POST /subscriptions/{id}/pause
- POST /subscriptions/{id}/resume
- POST /subscriptions/{id}/cancel

**Charges**
- GET /charges
- POST /charges
- GET /charges/{id}
- POST /charges/{id}/send
- POST /charges/{id}/cancel
- POST /charges/{id}/replace

**Pix**
- POST /charges/{id}/pix/generate
- GET /charges/{id}/pix
- POST /webhooks/psp/{provider}

**WhatsApp**
- GET /templates
- POST /templates
- POST /messages/send
- POST /webhooks/whatsapp/{provider}

**Reports**
- GET /reports/summary
- GET /reports/charges
- GET /reports/recovery

**Consent**
- POST /customers/{id}/consents
- PATCH /customers/{id}/consents/{consent_id}

**Admin**
- GET /admin/tenants
- POST /admin/jobs/reprocess
- GET /admin/events

---

## 18. Templates de mensagem mínimos

1. Cobrança criada
2. Lembrete pré-vencimento
3. Lembrete no dia do vencimento
4. Lembrete pós-vencimento
5. Confirmação de pagamento
6. Confirmação de opt-in
7. Confirmação de opt-out

### 18.1 Variáveis mínimas
- {{nome_cliente}}
- {{nome_empresa}}
- {{descricao_servico}}
- {{valor}}
- {{vencimento}}
- {{pix_copia_cola}}
- {{link_pagamento}}
- {{telefone_suporte}}

---

## 19. Painéis e telas

### 19.1 Telas do tenant
- login
- recuperação de senha
- onboarding
- dashboard
- clientes
- detalhe do cliente
- planos
- assinaturas
- cobranças
- detalhe da cobrança
- templates
- automações
- relatórios
- configurações de integração
- usuários e permissões
- perfil e faturamento do SaaS

### 19.2 Telas de admin interno
- lista de tenants
- saúde das integrações
- fila/jobs
- webhooks
- auditoria
- suporte

---

## 20. Backlog por prioridade

### 20.1 Prioridade P0
- autenticação
- tenant
- clientes
- planos
- assinaturas
- cobranças
- geração Pix
- webhook de pagamento
- envio manual assistido
- dashboard básico
- auditoria mínima

### 20.2 Prioridade P1
- automação de lembretes
- integração oficial WhatsApp
- templates
- importação CSV
- billing do SaaS
- perfis de acesso
- reconciliação automática

### 20.3 Prioridade P2
- relatórios avançados
- multiunidade
- API pública
- Pix Automático
- integrações externas
- inteligência de cobrança

---

## 21. Critérios de aceite do MVP

O MVP será considerado aceito quando:
1. Um usuário conseguir criar conta e acessar o painel.
2. Um cliente puder ser cadastrado com telefone válido.
3. Um plano recorrente puder ser criado.
4. Uma assinatura puder ser vinculada ao cliente.
5. Uma cobrança da competência puder ser gerada.
6. A integração Pix retornar código/QR válido.
7. O usuário puder enviar a cobrança por WhatsApp em modo manual assistido.
8. O webhook de pagamento atualizar a cobrança corretamente.
9. O dashboard refletir pagamento confirmado.
10. Os lembretes manuais/assistidos puderem ser reenviados.
11. Logs e trilhas mínimas de auditoria estiverem disponíveis.
12. O sistema impedir acesso entre tenants.

---

## 22. Critérios de aceite da V1

A V1 será considerada aceita quando, além do MVP:
1. O envio automático via WhatsApp estiver funcional.
2. Templates estiverem cadastrados e versionados.
3. Regras de lembrete estiverem executando em fila.
4. Opt-in/opt-out estiverem auditáveis.
5. A reconciliação diária estiver funcional.
6. O painel de relatórios básicos estiver disponível.
7. Houver billing do próprio SaaS.
8. RBAC estiver funcional.
9. Reprocessamento de webhook falho estiver disponível.

---

## 23. Métricas e KPIs do produto

### 23.1 KPIs do negócio
- MRR
- churn logo
- churn líquido
- CAC
- LTV
- ARPA/ARPU
- taxa de trial para pago

### 23.2 KPIs operacionais do cliente
- % de cobranças pagas no prazo
- % de cobranças recuperadas após lembrete
- tempo médio até pagamento
- % de cobranças enviadas com sucesso
- % de webhooks processados com sucesso
- % de clientes com opt-in válido
- inadimplência por carteira

### 23.3 KPIs técnicos
- taxa de erro de integração PSP
- taxa de erro de integração WhatsApp
- latência média de API
- atraso de fila
- sucesso de backup
- indisponibilidade mensal

---

## 24. Roadmap de implementação sugerido

### Sprint 0
- discovery
- arquitetura
- desenho de dados
- UX principal
- escolha de PSP
- escolha do parceiro WhatsApp
- políticas de privacidade e termos

### Sprint 1
- autenticação
- tenant
- usuários
- clientes
- planos

### Sprint 2
- assinaturas
- cobranças
- dashboard básico

### Sprint 3
- integração Pix
- webhook
- reconciliação inicial

### Sprint 4
- envio manual assistido
- templates internos
- histórico de mensagens

### Sprint 5
- automações
- filas
- logs
- auditoria
- exportações

### Sprint 6
- integração oficial WhatsApp
- opt-in/opt-out
- relatórios
- hardening

---

## 25. Equipe mínima recomendada

### Opção enxuta
- 1 fundador full-stack
- 1 designer part-time
- 1 QA part-time
- 1 jurídico consultivo
- 1 suporte/CS inicial (acumulado)

### Opção ideal mínima
- 1 PM/fundador
- 1 backend
- 1 frontend/full-stack
- 1 designer/produto
- 1 QA
- 1 DevOps fracionado
- 1 CS/suporte

---

## 26. Estimativa de custo operacional do SaaS

### Custos fixos previstos
- hospedagem app
- banco gerenciado
- redis/filas
- monitoramento
- e-mail transacional
- storage
- domínio
- suporte

### Custos variáveis
- mensagens WhatsApp/API/BSP
- taxas do provedor de cobrança
- processamento do billing do próprio SaaS
- suporte proporcional ao volume
- eventuais custos de compliance

### Estratégia de monetização sugerida
- plano de entrada barato
- limite por clientes ativos
- plano intermediário com automação
- plano premium com mais integrações e multiusuário

---

## 27. Plano comercial sugerido

### 27.1 Pricing de teste
- Starter: baixo ticket, envio manual assistido, poucos clientes
- Pro: automações, integração oficial, relatórios
- Business: multiusuário, múltiplas regras, suporte prioritário

### 27.2 Gatilhos de upgrade
- quantidade de clientes ativos
- número de cobranças/mês
- automações ativas
- usuários internos
- integrações adicionais

---

## 28. Riscos do projeto

### 28.1 Riscos de produto
- usuário achar que já resolve com planilha
- baixa percepção de valor se a dor não for urgente
- nicho amplo demais no início

### 28.2 Riscos técnicos
- rejeição de template
- falhas de webhook
- indisponibilidade de PSP
- alta dependência de terceiros
- inconsistência entre status externos e internos

### 28.3 Riscos legais/compliance
- tratamento inadequado de consentimento
- retenção excessiva de dados
- envio abusivo de mensagens
- resposta insuficiente a incidentes

### 28.4 Mitigações
- foco em 1 nicho
- abstração de provedores
- logs e reconciliação
- política forte de opt-in/opt-out
- revisão jurídica mínima
- rollout controlado

---

## 29. Estratégia de lançamento

### 29.1 Go-to-market inicial
- nicho único primeiro
- landing page simples
- prova social real
- captação via comunidade local e indicações
- onboarding concierge nos primeiros clientes

### 29.2 Beta fechado
- 10 a 20 clientes
- acompanhamento manual próximo
- medir recuperação de recebimento
- ajustar templates e UX

### 29.3 Métrica de validação
- usuários cobrando de forma recorrente toda semana/mês
- retenção superior a curiosidade de teste
- percepção clara de economia de tempo
- aumento medido da taxa de pagamento no prazo

---

## 30. Itens técnicos obrigatórios para produção

- ambientes separados (dev, staging, prod)
- CI/CD
- migrations versionadas
- backup automatizado
- feature flags
- alertas de erro
- plano de rollback
- testes automatizados mínimos
- testes manuais dos fluxos críticos
- monitoramento de filas
- monitoramento de webhook
- documentação operacional

---

## 31. Testes mínimos obrigatórios

### 31.1 Testes unitários
- regras de geração recorrente
- status de cobrança
- cálculo de lembrete
- permissões

### 31.2 Testes de integração
- criação de cobrança Pix
- webhook PSP
- envio WhatsApp
- webhook WhatsApp
- billing do SaaS

### 31.3 Testes end-to-end
- onboarding até cobrança enviada
- pagamento confirmado até dashboard atualizado
- opt-out bloqueando automação
- tenant isolado

### 31.4 Testes de segurança
- controle de acesso
- brute force
- validação de input
- SSRF/open redirect se houver
- assinatura de webhook
- exposição de dados em logs

---

## 32. Definição de pronto (Definition of Done)

Uma funcionalidade só entra em produção quando:
1. requisito aceito pelo PO/fundador;
2. código revisado;
3. testes passando;
4. logs e métricas incluídos;
5. tratamento de erro definido;
6. impacto LGPD analisado quando houver dado pessoal novo;
7. documentação mínima atualizada;
8. rollout previsto;
9. tela validada;
10. sem vazamento cross-tenant.

---

## 33. Escopo final consolidado

Em termos práticos, o projeto completo inclui:

1. **Plataforma SaaS multi-tenant**
2. **Cadastro de clientes**
3. **Planos/serviços recorrentes**
4. **Assinaturas**
5. **Cobranças avulsas e recorrentes**
6. **Integração Pix**
7. **Integração WhatsApp**
8. **Automação de lembretes**
9. **Dashboard e relatórios**
10. **Consentimento e compliance**
11. **Billing do próprio SaaS**
12. **Admin operacional**
13. **Arquitetura pronta para escala moderada**
14. **Trilha de auditoria**
15. **Plano de testes**
16. **Roadmap até V2 com Pix Automático**

---

## 34. Recomendação estratégica final

O erro mais comum aqui seria tentar virar “plataforma financeira completa para todo tipo de negócio”. Isso costuma ser a rota mais eficiente para fazer algo caro, lento e desnecessariamente bonito.

A recomendação correta é:

1. lançar com **1 nicho**;
2. usar **Pix Cobrança** primeiro;
3. começar com **envio manual assistido + automação gradual**;
4. provar ganho real de pagamento;
5. só depois abrir **Pix Automático**, API pública e integrações maiores.

---

## 35. Entregáveis finais deste escopo

Este escopo já deixa definido:
- visão do produto
- objetivos
- público
- módulos
- requisitos funcionais
- regras de negócio
- requisitos não funcionais
- compliance
- arquitetura
- modelo de dados
- fluxos
- integrações
- endpoints
- backlog
- critérios de aceite
- roadmap
- KPIs
- riscos
- operação

Ou seja: dá para usar este material como base direta para:
- PRD
- backlog no Jira/Trello/Linear
- wireframes
- arquitetura técnica
- kickoff com time
- orçamento
- cronograma executivo
- landing page comercial
- plano de validação

