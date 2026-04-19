# Reestruturacao Inicial do Sistema

## Objetivo

Este sistema sera um backend para gerenciar:

- o chatbot exibido no site do cliente
- o painel onde o cliente se cadastra
- a configuracao e alimentacao da base RAG
- o historico das conversas entre visitante e chatbot

O cliente cadastrara sua empresa no sistema, configurara seu RAG e depois instalara um script no proprio site. Esse script renderizara um chat no canto inferior direito da tela.

## Visao Geral do Fluxo

### Cadastro e configuracao

1. O cliente cria sua conta no sistema.
2. O cliente cadastra os dados da empresa.
3. O cliente alimenta a base de conhecimento do RAG.
4. O sistema gera ou disponibiliza um codigo de integracao para o site do cliente.
5. O cliente adiciona esse codigo ao site dele.
6. O widget de chat passa a aparecer no frontend do site.

### Fluxo de conversa no chat

1. O visitante abre o chat no site pela primeira vez.
2. O frontend gera um token aleatorio e salva no `localStorage`.
3. Esse token sera o identificador da conversa.
4. O frontend tambem envia o `clienteId` para o backend.
5. O backend usa o `clienteId` para identificar qual base RAG consultar.
6. O backend usa o token da conversa para salvar e recuperar o historico daquele visitante.

## Fluxo desejado da mensageria

### Evento 1

`FRONT`

O usuario manda uma mensagem.

`BACK`

Salva a mensagem do usuario no banco de dados.

### Evento 2

`FRONT`

Enquanto o usuario estiver digitando, aguarda e nao chama o RAG imediatamente.

### Evento 3

`FRONT`

Quando o usuario parar de digitar por 5 segundos, chama a API do RAG.

`BACK`

1. Busca o historico da conversa pelo token.
2. Busca a configuracao do cliente pelo `clienteId`.
3. Busca os dados da base RAG daquele cliente.
4. Monta o prompt com historico + contexto recuperado.
5. Gera a resposta.
6. Salva a resposta no banco.
7. Retorna a resposta para o frontend.

## Exemplo de construcao do prompt

Ideia inicial:

```text
Historico de mensagens:
usuario: Oi, bom dia
usuario: estao aberto hoje, e aceitam pix
resposta: sim, estamos aberto e aceitamos pix
usuario: certo vou ai entao

Instrucao:
Baseado no historico de mensagens e no contexto recuperado do RAG, responda apenas a ultima interacao do usuario.
```

## Identificadores importantes

### 1. `clienteId`

Identifica qual cliente do sistema esta usando o chat.

Uso:

- descobrir qual base RAG consultar
- descobrir configuracoes do chatbot
- isolar dados entre clientes

### 2. `conversationToken`

Token aleatorio gerado no frontend na primeira visita ao chat.

Uso:

- identificar a conversa do visitante
- recuperar historico de mensagens
- manter contexto entre mensagens

Observacao:

- inicialmente pode ser um token simples aleatorio
- pode ser hash, md5, uuid ou outro formato
- idealmente deve ser unico por navegador ou sessao, conforme a estrategia futura

## Estrutura inicial pensada

### Frontend widget

Responsabilidades:

- renderizar o chat no canto inferior direito
- armazenar o `conversationToken` no `localStorage`
- enviar mensagens do usuario
- detectar pausa de digitacao de 5 segundos
- chamar a API de resposta
- exibir historico e respostas

### Backend

Responsabilidades:

- autenticar e gerenciar clientes do sistema
- armazenar configuracoes do chatbot
- armazenar base de conhecimento do RAG
- salvar historico das mensagens
- recuperar contexto relevante
- montar prompt
- chamar o modelo
- responder ao frontend

## Fluxo tecnico inicial sugerido

### Endpoint 1: registrar mensagem do usuario

Objetivo:

Receber e salvar cada mensagem enviada pelo visitante.

Payload esperado:

```json
{
  "clienteId": "uuid-do-cliente",
  "conversationToken": "token-gerado-no-browser",
  "role": "user",
  "content": "Oi, bom dia"
}
```

### Endpoint 2: gerar resposta do chat

Objetivo:

Depois de 5 segundos sem digitacao, gerar a resposta com base no historico da conversa e no RAG do cliente.

Payload esperado:

```json
{
  "clienteId": "uuid-do-cliente",
  "conversationToken": "token-gerado-no-browser"
}
```

Possivel comportamento interno:

1. buscar mensagens da conversa
2. recuperar documentos relevantes do RAG
3. montar prompt
4. gerar resposta
5. salvar resposta como `assistant`
6. retornar a resposta

## Estruturas que provavelmente serao necessarias

### Cliente

- dados do cliente dono do chatbot
- configuracoes gerais
- identificador unico

### Configuracao do chatbot

- nome do agente
- prompt base
- regras de comportamento
- estilo de resposta

### Documento RAG

- pergunta
- resposta
- conteudo
- embedding
- metadados
- cliente dono do documento

### Conversa

- `conversationToken`
- `clienteId`
- data de criacao
- data da ultima interacao

### Mensagem

- conversa
- `role`
- conteudo
- timestamp

## Beneficios dessa abordagem

- separa bem cliente, conversa e base de conhecimento
- permite manter contexto por visitante
- evita chamar o RAG a cada tecla digitada
- facilita evoluir depois para streaming, atendente humano ou reabertura de conversa

## Limites e pontos para evolucao futura

- definir se o token da conversa sera por navegador, sessao ou usuario autenticado: por navegador
- decidir quantas mensagens do historico entram no prompt: todas

## Resumo da ideia inicial

Versao inicial desejada:

1. cliente se cadastra no sistema
2. cliente configura os dados da empresa e o RAG
3. cliente instala um script no site
4. frontend cria um token local para a conversa
5. usuario envia mensagens
6. backend salva historico
7. frontend espera 5 segundos sem digitacao
8. frontend chama a API de resposta
9. backend monta prompt com historico + RAG do cliente
10. backend responde e salva a resposta

## Proxima etapa sugerida

Transformar esta ideia em uma definicao mais tecnica com:

- entidades
- endpoints
- fluxo frontend/backend
- regras de seguranca
- modelo de persistencia
- contrato do widget embedavel
