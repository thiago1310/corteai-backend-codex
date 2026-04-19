# Reestruturacao do Modulo de IA

## Objetivo

Reestruturar o modulo de IA para o novo modelo do sistema, onde:

- o dono da conta e o `cliente`
- todos os nomes de tabelas e colunas devem ficar em portugues
- todas as tabelas devem ter `criado_em` e `atualizado_em`
- o modulo deve deixar de usar estruturas antigas ligadas ao conceito de `barbearia`

## Regras gerais

### Nomenclatura

- nomes de tabelas em portugues
- nomes de colunas em portugues
- evitar ingles em nomes persistidos no banco

### Campos obrigatorios em todas as tabelas

Todas as tabelas do modulo de IA devem ter:

- `criado_em`
- `atualizado_em`

Sugestao:

- `criado_em timestamp not null default now()`
- `atualizado_em timestamp not null default now()`

### Isolamento por cliente

Onde hoje existe `barbearia_id`, deve passar a existir `cliente_id`.

Isso vale principalmente para:

- configuracao do agente
- documentos do RAG
- conversas
- mensagens

## Tabelas antigas a remover

As seguintes tabelas antigas devem ser excluidas:

- `chat_history`
- `chat_messages`
- `chat_status`
- `conexoes_evolution`
- `dados_cliente`
- `n8n_chat_histories`
- `visitantes_chat`
- `whatsapp_message_mapping`

Observacao:

Essas tabelas representam uma estrutura anterior, muito ligada ao fluxo de WhatsApp e ao modelo antigo do sistema. A ideia agora e simplificar o modulo para o novo backend de chat com RAG.

## Tabelas que devem ser mantidas e ajustadas

## 1. `configuracoes_agente`

Tabela atual deve ser mantida, mas reestruturada.

### Ajustes obrigatorios

- trocar `barbearia_id` por `cliente_id`
- manter `criado_em` e `atualizado_em`
- ampliar os campos de configuracao do agente

### Estrutura sugerida

- `id: uuid`
- `cliente_id: uuid`
- `nome_agente: varchar(150)`
- `mensagem_boas_vindas: text`
- `prompt_sistema: text`
- `tom_resposta: varchar(50)`
- `instrucoes_extras: text`
- `ativo: boolean`
- `criado_em: timestamp`
- `atualizado_em: timestamp`

### Observacoes

- `mensagem_boas_vindas` sera util para o widget
- `tom_resposta` ajuda a controlar estilo sem mexer direto no prompt
- configuracoes tecnicas como modelo, temperatura e quantidade maxima de contexto nao devem ficar expostas ao cliente final
- essas configuracoes devem ser globais do sistema e podem ficar em `.env` ou em configuracao interna do backend
- como o cliente final e leigo, o ideal e deixar apenas campos realmente compreensiveis e uteis no painel

## 2. `documentos`

Tabela atual deve ser mantida, mas ajustada para o novo conceito.

### Ajustes obrigatorios

- trocar `barbearia_id` por `cliente_id`
- manter `criado_em` e `atualizado_em`
- manter embedding vetorial

### Estrutura sugerida

- `id: uuid` ou `bigserial`
- `cliente_id: uuid`
- `titulo: varchar(200)`
- `pergunta: text`
- `resposta: text`
- `conteudo: text`
- `metadados: jsonb`
- `embedding: vector`
- `ativo: boolean`
- `origem: varchar(100)`
- `criado_em: timestamp`
- `atualizado_em: timestamp`

### Observacoes

- `conteudo` pode ser a uniao estruturada de pergunta e resposta
- `origem` ajuda a identificar se o documento veio do painel, importacao, arquivo, planilha ou outro fluxo
- `metadados` pode guardar categoria, tags e prioridade

### Observacao sobre o campo `conteudo`

Esse campo pode parecer redundante num primeiro momento, mas ele ajuda no processo de embedding.

Sugestao pratica:

- `pergunta` guarda a pergunta original
- `resposta` guarda a resposta original
- `conteudo` guarda o texto consolidado que sera usado para gerar embedding

Exemplo:

```text
Pergunta: Voces aceitam pix?
Resposta: Sim, aceitamos pix, debito e credito.
```

Se durante a implementacao isso nao trouxer ganho real, ainda da para simplificar e gerar o embedding diretamente a partir de `pergunta + resposta` sem manter `conteudo` persistido.

## Novas tabelas a criar

## 1. `conversas`

Essa tabela deve representar a sessao principal do atendimento.

### Estrutura desejada

- `id: uuid`
- `cliente_id: uuid`
- `dados_importantes: jsonb`
- `status: varchar(30)`
- `canal: varchar(30)`
- `origem: varchar(30)`
- `criado_em: timestamp`
- `atualizado_em: timestamp`

### Significado dos campos

- `id`
  - identificador da conversa
  - deve ser gerado pelo backend
- `cliente_id`
  - dono da conta e do RAG usado na conversa
- `dados_importantes`
  - campo para armazenar memoria estruturada que a IA for consolidando sobre o atendimento
  - exemplos: nome, cidade, interesse, horario preferido, tema da conversa
- `status`
  - exemplo: `ativa`, `encerrada`, `aguardando`
- `canal`
  - exemplo: `site`, `whatsapp`, `instagram`
- `origem`
  - exemplo: `widget`, `painel`, `api`

### Sobre o campo `dados_importantes`

Sugestao principal:

- usar `jsonb`

Motivo:

- melhor para salvar dados estruturados
- mais facil de evoluir
- permite guardar chaves dinamicas
- facilita filtros futuros

Exemplo:

```json
{
  "nome": "Thiago",
  "idade": 32,
  "cidade": "Florianopolis",
  "interesse": "implantar chatbot no site",
  "resumo_contexto": "cliente quer automatizar atendimento comercial"
}
```

### Observacao sobre texto puro

Se fosse texto puro, ficaria mais simples para salvar, mas pior para:

- consultar depois
- atualizar parcialmente
- estruturar memoria

Entao a melhor recomendacao inicial e `jsonb`.

## 2. `mensagens`

Tabela para persistir cada interacao da conversa.

### Estrutura desejada

- `id: uuid`
- `cliente_id: uuid`
- `conversa_id: uuid`
- `papel: varchar(20)`
- `mensagem: text`
- `status: varchar(30)`
- `tokens_entrada: integer`
- `tokens_saida: integer`
- `metadados: jsonb`
- `criado_em: timestamp`
- `atualizado_em: timestamp`

### Significado dos campos

- `papel`
  - valores sugeridos: `usuario`, `assistente`, `sistema`
- `status`
  - sua ideia inicial: `recebida`, `enviada`

### Observacao sobre historico

Para este sistema, faz sentido considerar sempre o historico completo da conversa atual.

Motivo:

- normalmente sera um atendimento rapido
- o proprio agente consegue identificar o que responder com base nas mensagens da conversa atual
- isso simplifica a primeira versao

Se no futuro as conversas ficarem longas, o backend pode resumir mensagens antigas ou aplicar uma janela de contexto automaticamente, sem expor essa configuracao ao cliente.



## Fluxo sugerido para criacao da conversa

### Etapa 1

O frontend acessa um endpoint para iniciar a sessao.

Exemplo:

- `POST /ia/conversas`

Payload inicial:

```json
{
  "clienteId": "uuid-do-cliente"
}
```

### Etapa 2

O backend:

1. valida o cliente
2. cria a conversa
3. gera um identificador seguro
4. retorna os dados da sessao para o frontend

Resposta sugerida:

```json
{
  "conversaId": "uuid-da-conversa",
  "tokenConversa": "jwt-ou-token-assinado",
  "mensagemBoasVindas": "Oi, como posso ajudar?"
}
```

## Vale a pena gerar um JWT assinado da conversa?

### Resposta curta

Sim, vale a pena, mas nao para substituir o `id` da conversa no banco.

### Recomendacao

Usar os dois:

- `conversa.id` no banco
- `token_conversa` assinado para o frontend trafegar

### Melhor desenho inicial

1. o backend cria a conversa
2. o backend gera um token assinado
3. o frontend usa esse token nas chamadas seguintes
4. o backend valida o token e extrai os dados confiaveis

### O que pode ir no token

- `conversa_id`
- `cliente_id`
- `iat`
- `exp`

Exemplo conceitual:

```json
{
  "conversaId": "uuid",
  "clienteId": "uuid",
  "iat": 1710000000,
  "exp": 1710086400
}
```

### Vantagens

- o frontend nao inventa um id arbitrario
- o backend continua no controle da sessao
- reduz risco de manipulacao simples
- facilita validacao sem depender de muitos dados na requisicao

### O que nao fazer

- nao confiar apenas no `conversa_id` vindo solto do frontend
- nao usar o JWT como substituto do registro no banco

### Conclusao pratica

O melhor caminho e:

- a conversa existe no banco
- o frontend recebe um token assinado ligado a essa conversa
- o backend usa esse token para localizar a conversa com seguranca

### Tempo de expiracao do token

Regra desejada:

- o token da conversa deve expirar em 3 meses

Sugestao:

- definir `exp` com validade de aproximadamente 90 dias

### Renovacao do token

Deve existir um endpoint para renovar a validade do token.

Fluxo desejado:

1. o frontend carrega a home
2. verifica se possui token salvo
3. se o token ainda for valido, chama a API de renovacao
4. o backend valida o token atual
5. o backend devolve um novo token atualizado
6. o backend devolve tambem o historico da conversa

Resposta sugerida:

```json
{
  "tokenConversa": "novo-token-assinado",
  "historico": [
    {
      "id": "uuid",
      "papel": "usuario",
      "mensagem": "Oi"
    },
    {
      "id": "uuid",
      "papel": "assistente",
      "mensagem": "Oi, como posso ajudar?"
    }
  ]
}
```

## Sugestao de endpoints do novo modulo de IA

## Conversas

- `POST /ia/conversas`
  - cria uma nova conversa
- `POST /ia/conversas/renovar-token`
  - valida o token atual, gera um novo token e retorna o historico
- `GET /ia/conversas/:id`
  - consulta dados da conversa
- `PATCH /ia/conversas/:id/dados-importantes`
  - atualiza memoria estruturada da conversa

## Mensagens

- `POST /ia/mensagens`
  - registra mensagem do usuario
- `GET /ia/conversas/:id/mensagens`
  - lista mensagens da conversa
- `POST /ia/conversas/:id/responder`
  - processa o historico e gera resposta do assistente

## Configuracao do agente

- `GET /ia/configuracao`
- `PUT /ia/configuracao`

## RAG

- `GET /ia/documentos`
- `POST /ia/documentos`
- `PATCH /ia/documentos/:id`
- `DELETE /ia/documentos/:id`

## Fluxo simplificado proposto

1. frontend pede criacao de conversa
2. backend cria `conversas`
3. backend devolve `conversa_id` + token assinado
4. frontend envia mensagem
5. backend salva em `mensagens`
6. frontend aguarda pausa de digitacao
7. frontend chama endpoint de resposta
8. backend:
   - carrega mensagens da conversa atual
   - carrega configuracao do agente
   - busca documentos relevantes do RAG
   - monta prompt
   - gera resposta
   - salva resposta em `mensagens`

## Resumo da reestruturacao

### Manter e ajustar

- `configuracoes_agente`
- `documents` ou preferencialmente renomear para `documentos`

### Excluir

- `chat_history`
- `chat_messages`
- `chat_status`
- `conexoes_evolution`
- `dados_cliente`
- `n8n_chat_histories`
- `visitantes_chat`
- `whatsapp_message_mapping`

### Criar

- `conversas`
- `mensagens`

### Padroes obrigatorios

- tudo em portugues
- todas as tabelas com `criado_em` e `atualizado_em`
- tudo isolado por `cliente_id`
- configuracoes tecnicas do modelo devem ser globais do sistema, nao do cliente

## Sugestao adicional


- renomear `documents` para `documentos`
- renomear `configuracoes_agente` para `configuracoes_do_agente` 
