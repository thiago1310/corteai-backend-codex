## Cliente

`cliente` sera a pessoa ou empresa que se cadastra para usar o sistema, configurar o chatbot e alimentar a base RAG.

### Responsabilidades do cliente

- criar conta no sistema
- fazer login no painel
- configurar os dados da empresa
- configurar o comportamento do chatbot
- cadastrar e manter os documentos da base RAG
- instalar o widget no proprio site
- acompanhar conversas e uso do chatbot

### Campos sugeridos

- `id: uuid`
- `nome`
- `email`
- `senha_hash`
- `telefone`
- `cpf_cnpj`
- `status`
- `dominio`
- `plano`
- `criado_em`
- `atualizado_em`

### Regras iniciais

- `email` deve ser unico
- a senha nunca deve ser salva em texto puro
- o cliente so pode acessar os proprios dados
- cada cliente pode ter apenas um site vinculado a conta
- o cliente tera sua propria base RAG isolada dos demais

### Observacao

O `cliente` representa o dono do sistema no painel administrativo.
Ele nao e o visitante final que conversa no chat do site.
O visitante sera outra estrutura, ligada a conversa, e nao a conta administrativa.
