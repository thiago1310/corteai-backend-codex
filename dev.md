# Plano de Desenvolvimento – Backend CorteAI Barbearia

## 1. Visão Geral

Objetivo: construir um backend robusto para gestão completa de barbearias, cobrindo:
- Cadastro e configuração da barbearia.
- Gestão de serviços, profissionais, clientes e produtos.
- Agendamentos funcionando como **comandas**.
- Módulo financeiro com previsões, relatórios e filtros avançados.
- Integração com agentes de IA e Evolution (já existente, a ser refinada depois).

Pilares:
- Multi-tenant por barbearia.
- Segurança via JWT + scopes/roles.
- Padronização de DTOs, validação e tratamento de erros.
- Regras comerciais configuráveis por barbearia (cupons, cashback, giftcards, taxas e políticas de cancelamento).

---

## 2. Estado Atual (Resumo)

Pronto ou considerado OK:
- Módulo de **configuração da barbearia**:
  - Dados básicos (nome, endereço, etc.).
  - Horário de funcionamento (nível barbearia).
  - Cadastro e alteração de senha.
- Módulo de **serviços**:
  - Cadastro de serviços da barbearia.
- Módulo **Evolution**:
  - Existe e será ajustado futuramente (sem alterações por enquanto).
- Estrutura geral NestJS + TypeORM, com módulos:
  - `auth`, `usuarios`, `barbearias`, `servicos`, `profissionais`, `agendamentos`, `clientes`, `lancamentos`, `faq`, `ai-agent`, `config`.

A lapidar / desenvolver:
- **Profissionais**: dados, serviços que executa, agenda padrão, métricas.
- **Clientes**: cadastro e histórico.
- **Agendamentos**: funcionar como **comanda** (itens, estados e vínculo com financeiro).
- **Produtos**: módulo novo.
- **Financeiro**: contas a pagar/receber, previsões, relatórios.
- **Formas de pagamento**: módulo novo.

---

## 3. Domínio por Módulo

### 3.1 Barbearias (Configuração)

Status: já implementado (apenas revisar integrações).

Responsabilidades:
- Dados da barbearia (nome, CNPJ/CPF, endereço, contatos).
- Horário de funcionamento padrão da barbearia.
- Configurações gerais (timezone, moeda, etc. se necessário).
- Cadastro/gestão de credenciais de acesso (em conjunto com `auth`/`usuarios`).

Próximos cuidados:
- Garantir que todos os módulos sempre filtrem por `barbearia_id`.
- Deixar pronto para suportar múltiplas barbearias no mesmo backend.

### 3.2 Serviços

Status: considerado OK.

Responsabilidades:
- Cadastro de serviços da barbearia:
  - Nome, descrição, duração padrão, preço.
  - Categoria (ex.: cabelo, barba, combo, etc.).
- Associação de serviços a barbearias.

Próximos cuidados:
- Garantir vínculo com:
  - Profissionais (quais serviços cada profissional executa).
  - Comandas (itens de tipo “serviço”).

### 3.3 Profissionais

Status: existe e precisa ser lapidado.

Responsabilidades:
- Dados do profissional:
  - Nome, contato, documento (opcional).
  - Vínculo a barbearia.
  - Serviços que executa (relação N:N com serviços).
- **Compensação**:
  - Salário base (fixo) opcional.
  - Comissão configurável (ex.: percentual por serviço/produto ou percentual padrão).
  - Fonte para cálculo de repasse no financeiro/folha (contas a pagar).
- Métricas por profissional:
  - Quantidade de atendimentos realizados.
  - Receita gerada para a barbearia (visível apenas para scope de barbearia).
- Agenda do profissional:
  - Definição de **padrão de agenda**:
    - Ex.: segunda a sexta, das 08:00 às 17:00.
    - Intervalos entre atendimentos (ex.: 30min, 1h).
  - Cadastro de **exceções** / ajustes manuais (dias específicos, folgas, horários diferentes).

#### Regra de agenda automática

- Cada profissional define um **padrão de agenda** no seu perfil:
  - Dias da semana que atende (ex.: seg–sex).
  - Horário inicial e final (ex.: 08h–17h).
- O sistema mantém uma janela de **7 dias para frente**:
  - Se não existir agenda configurada para um dia dentro desses 7 dias,
    o sistema cria automaticamente aquele dia, usando o padrão do profissional.
  - A criação é **somente automática**:
    - O sistema **não altera** o que já foi criado manualmente.
    - Ajustes manuais (horário reduzido, folga, etc.) são respeitados.
- Execução:
  - Pode ser implementado via:
    - Job em background (cron) que verifica agendas faltantes.
    - Ou lógica disparada quando o front solicita a agenda de um profissional
      (ao consultar, o backend garante que os próximos 7 dias existam).
- Prevenção de duplo agendamento:
  - Lock/pessimistic check ao criar agendamento (mesmo profissional + intervalo de horário).
- Feriados/bloqueios globais da barbearia:
  - Respeitar bloqueios gerais (feriados, eventos) além dos bloqueios do profissional.
- Encaixe/lista de espera:
  - Permitir encaixe automático/assistido se um horário for cancelado.

### 3.4 Clientes

Status: existe, precisa consolidar regras.

Responsabilidades:
- Cadastro básico de cliente:
  - Nome, telefone, e-mail (opcional), documento (opcional).
  - Vínculo à barbearia.
- Histórico:
  - Histórico de agendamentos/comandas.
  - Serviços já realizados, profissionais atendentes, valores pagos.

### 3.5 Produtos

Status: a ser criado.

Responsabilidades:
- Cadastro de produtos:
  - Nome, descrição, categoria.
  - Preço de venda.
  - Controle de estoque:
    - Saldo por barbearia.
    - Movimentações (entrada, saída por comanda/ajuste).
    - Alertas de estoque baixo (opcional).
    - Conciliação com compras (entradas) e saídas por comandas, integrado ao financeiro.
    - Devoluções/estornos: entrada de estoque quando item de comanda for cancelado/estornado.
    - Ajustes inventariais: registrar motivo (perda, quebra, inventário) e logar em auditoria.
- Vínculo:
  - Produtos vinculados à barbearia.
  - Itens de comanda podem ser de tipo “produto”.

### 3.6 Agendamentos / Comandas

Status: existe, precisa ser expandido para comportamento de **comanda**.

Responsabilidades:
- Representar um **atendimento** agendado para um cliente, com:
  - Cliente.
  - Profissional.
  - Barbearia.
  - Data e horário.
- Estados do agendamento:
  - `pendente`
  - `confirmado`
  - `cancelado`
  - `em_atendimento`
  - `finalizado`

#### Comanda vinculada ao agendamento

- Quando o agendamento entra em `em_atendimento`:
  - Passa a funcionar como **comanda ativa**.
  - A comanda é vinculada ao agendamento e ao profissional responsável.
- Itens da comanda:
  - Tipos de item:
    - Serviço (origem no módulo de serviços).
    - Produto (origem no módulo de produtos).
  - Campos:
    - Referência (serviço/produto).
    - Quantidade.
    - Preço unitário.
    - Descontos/cupons (configuráveis por barbearia) com motivo/justificativa.
    - Taxas extras (ex.: taxa de cancelamento ou taxa adicional; configuráveis por barbearia) com motivo/justificativa.
    - Comissão por item (serviço/produto) para cálculo de repasse correto.
- Operações:
  - Apenas o **profissional (atendente)** ou alguém com permissão equivalente
    pode:
    - Adicionar itens.
    - Remover itens.
    - Atualizar quantidade.
  - Quando o atendimento termina:
    - Muda o status para `finalizado`.
    - Gera um registro financeiro (conta a receber/receita).

#### Políticas de cancelamento e bloqueio de horários

- Cancelamento/No-show:
  - Definir regras por barbearia:
    - Janela mínima para cancelar sem multa.
    - Multa ou bloqueio de cliente em casos de no-show recorrente (opcional).
  - Possível cobrança de sinal/adiantamento (integra com formas de pagamento).
- Bloqueio de horários:
  - Profissional ou barbearia pode bloquear horários específicos (férias, folgas).
  - Sistema impede novos agendamentos nesses blocos.
  - Respeitar bloqueios ao gerar agenda automática.

### 3.7 Formas de Pagamento

Status: a ser criado (módulo separado).

Responsabilidades:
- Cadastro de formas de pagamento:
  - Dinheiro.
  - Cartão de crédito.
  - Cartão de débito.
  - Pix.
  - Outras formas personalizadas.
- Vínculo:
  - Comandas/agendamentos finalizados são liquidados usando uma ou mais formas de pagamento.
  - Permitir:
    - Pagamento único (ex.: só Pix).
    - Pagamento dividido (ex.: parte Pix, parte cartão).

### 3.8 Financeiro

Status: a ser ampliado.

Responsabilidades:
- **Contas a receber**:
  - Geradas a partir de comandas/agendamentos finalizados.
  - Campos:
    - Valor total.
    - Data do atendimento.
    - Cliente.
    - Profissional.
    - Formas de pagamento usadas.
- **Contas a pagar**:
  - Despesas fixas (aluguel, salário, internet, etc.).
  - Despesas variáveis (compra de produtos, manutenção, etc.).
  - Vínculo à barbearia, categoria de despesa.
  - Incluir repasses/salários de profissionais (comissão e fixo).
- **Previsão de receitas**:
  - Baseada em agendamentos futuros com status `confirmado`.
  - Possível somar por período (dia, semana, mês).
- **Relatórios e filtros**:
  - Filtros por:
    - Período (data inicial/final).
    - Profissional.
    - Serviço.
    - Produto.
    - Categoria (serviços/produtos/despesas).
  - Indicadores:
    - Faturamento por profissional.
    - Receita total da barbearia.
    - Ticket médio (valor médio por atendimento).
- **Fluxo de caixa**:
  - Visão diária/semanal/mensal de entradas/saídas.
  - Conciliação de recebíveis (cartão/pix) opcional.
  - Saldo projetado considerando contas a pagar + contas a receber.
- **Integração estoque/financeiro**:
  - Entradas de estoque (compras) geram contas a pagar.
  - Saídas de estoque por comandas impactam custo e margem.
  - Visão consolidada de margem por produto/serviço.
- **Estornos/reembolsos**:
  - Reversão de pagamentos impactando contas a receber e fluxo de caixa.
  - Ajuste de cashback/giftcards associados quando aplicável.
- **Categorias e centros de custo**:
  - Classificação de receitas/despesas por categoria e centro de custo para relatórios.

### 3.9 Auditoria e Logs

Status: a ser criado.

Responsabilidades:
- Registrar eventos-chave:
  - Criação/alteração de agenda e bloqueios.
  - Mudança de status de agendamento/comanda.
  - Inclusão/remoção de itens de comanda.
  - Baixa de pagamentos e ajustes financeiros.
- Guardar: usuário, barbearia, timestamp, payload resumido.
- Consultas filtradas por período, tipo de evento, usuário.

### 3.10 Cashback e Giftcards

Status: a ser criado.

Responsabilidades:
- **Cashback**:
  - Cliente acumula saldo de cashback a cada comanda (regra configurável por barbearia: percentual, valor mínimo, serviços/produtos elegíveis).
  - Cashback só é creditado após pagamento confirmado; se a comanda for cancelada ou estornada, o cashback é removido.
  - Limites/configurações por barbearia:
    - Percentual e valor mínimo.
    - Limite diário por cliente.
    - Elegibilidade por categoria de serviço/produto.
  - Saldo de cashback pode ser consultado e aplicado em novas comandas (segundo regras da barbearia).
- **Giftcards**:
  - Conversão de saldo de cashback em giftcards de empresas/parceiros.
  - Registro de emissão, código, valor, status (ativo, usado, expirado).
  - Expiração configurável e política de uso por barbearia.
- Integração com financeiro:
  - Cashback aplicado reduz receita líquida; rastrear como custo de fidelidade.
  - Emissão de giftcard faz baixa do saldo de cashback do cliente.
  - Auditoria de uso (quem emitiu, quando, para qual cliente).

---

## 4. Segurança, Scopes e Acesso

Roles/Scopes sugeridos:
- `barbearia` (dono/gestor):
  - Acesso completo à barbearia.
  - Pode ver receitas agregadas e por profissional.
  - Pode configurar horários padrão, profissionais, serviços, produtos.
- `profissional`:
  - Acessa sua própria agenda.
  - Acessa suas comandas/atendimentos.
  - Pode incluir/remover itens da comanda onde ele é o atendente.
  - **Não** visualiza receitas globais da barbearia (somente, no máximo, indicadores pessoais).
- (Opcional) `caixa` / `recepção`:
  - Gerencia agendamentos, confirmações, cancelamentos.
  - Faz baixa de pagamentos nas comandas.

Pontos técnicos:
- Guardas que validam:
  - JWT (usuário autenticado).
  - Scope/role (barbearia/profissional/etc.).
  - `barbearia_id` do usuário versus dados acessados.
- Todos os `repositories`/`services` devem aplicar filtro de tenant (barbearia).
- Rate limiting em rotas sensíveis (auth, criação de agendamento).
- Auditoria:
  - Política de retenção e quem pode consultar.
  - Trilhas para operações sensíveis (descontos, cashback, giftcards, estoque).
- Controle de acesso granular:
  - Mapear claramente o que cada papel pode fazer em cada módulo (incluindo promoções/financeiro/estoque).

Dados/Privacidade:
- Política de retenção/eliminação de dados de clientes e logs.
- Campos sensíveis (documento, contato) mascarados em logs/auditoria.

Observabilidade:
- Logs estruturados com correlação por `requestId`.
- Métricas de erros/latência por módulo; alertas para picos de erro ou indisponibilidade de agenda.

---

## 5. Fases de Implementação

### Fase 1 – Consolidar o que já existe

- Revisar módulos:
  - `barbearias`, `servicos`, `profissionais`, `clientes`, `agendamentos`.
- Garantir:
  - DTOs com validação completa (`class-validator`).
  - Uso consistente de `barbearia_id` em queries.
  - Respostas HTTP padronizadas (erros 4xx/5xx).

### Fase 2 – Profissionais e Agenda Inteligente

- Lapidar módulo de **profissionais**:
  - Garantir campos obrigatórios (nome, vínculo barbearia, serviços que executa).
  - Endpoints para associar/desassociar serviços.
- Implementar **agenda padrão**:
  - Entidade/configuração com dias da semana + horários.
  - Endpoint para definir/atualizar padrão.
- Implementar **criação automática de agenda nos próximos 7 dias**:
  - Escolher estratégia:
    - Job em background ou lógica on-demand ao consultar agenda.
  - Garantir que alterações manuais não sejam sobrescritas.

### Fase 3 – Comanda dentro de Agendamentos

- Evoluir `agendamentos`:
  - Implementar e padronizar estados (`pendente`, `confirmado`, `cancelado`, `em_atendimento`, `finalizado`).
  - Garantir vínculo obrigatório a:
    - Cliente.
    - Profissional.
    - Barbearia.
- Implementar entidade de **comanda/itens**:
  - Itens com referência a serviço/produto.
  - Operações de adicionar/remover/atualizar.
  - Permissão restrita ao profissional responsável (ou roles superiores).
- Amarrar fluxo:
  - `confirmado` → atendimento inicia → `em_atendimento`.
  - Itens manipulados durante `em_atendimento`.
  - Ao finalizar → `finalizado` + geração de registro financeiro base.

### Fase 4 – Produtos e Formas de Pagamento

- Criar módulo de **produtos**:
  - Entidade, DTOs e endpoints básicos (CRUD).
  - Vínculo com barbearia e, se necessário, categorias.
- Criar módulo de **formas de pagamento**:
  - Cadastro das formas.
  - Vínculo com comandas/agendamentos finalizados.
  - Suporte a múltiplas formas em uma única comanda.

### Fase 5 – Financeiro Completo

- Modelar **contas a receber**:
  - Origem nas comandas.
  - Considerar formas de pagamento e datas.
- Modelar **contas a pagar**:
  - Estrutura para despesas fixas e variáveis.
- Implementar **previsão de receitas**:
  - Base nos agendamentos `confirmado` futuros.
- Criar endpoints de **relatórios** com filtros:
  - Por período, profissional, serviço, produto, categoria.

### Fase 6 – Refinos, IA e Evolution

- Revisar módulo `ai-agent`:
  - Garantir que consiga operar com as novas regras (agenda, comandas, etc.), se necessário.
- Manter módulo **Evolution** como está no momento e planejar ajustes futuros:
  - Hooks/eventos para criação de agendamento via mensagens.
  - Consultas de agenda e confirmação automatizada.

---

## 6. Qualidade, Testes e Documentação

- Testes:
  - Criar testes unitários para regras críticas:
    - Agenda automática de profissionais.
    - Troca de estado de agendamentos/comandas.
    - Geração de registros financeiros.
  - Adicionar testes e2e para os principais fluxos (cadastro, agendamento, finalização de comanda).
- Lint e estilo:
  - Manter `eslint` e `prettier` configurados.
- Documentação:
  - Atualizar `postmen.json` com:
    - Endpoints de profissionais/agenda.
    - Agendamentos/comandas.
    - Produtos.
    - Financeiro e formas de pagamento.

---

## 7. Próximos Passos

1. Revisar este plano e ajustar qualquer detalhe de negócio que não esteja 100% alinhado.
2. Definir a ordem exata de implementação das fases no código (pode seguir as Fases 1–6).
3. Começar pela consolidação dos módulos existentes e, em seguida, atacar:
   - Profissionais + agenda.
   - Agendamentos como comanda.
   - Produtos, formas de pagamento e financeiro.
