# CorteAI Backend – Project Blueprint for New Agents

Este documento resume os principais componentes de infraestrutura e organizacao utilizados no projeto **corteai-backend-codex**. Utilize-o como referencia ao criar um novo servico "agente" que deva seguir a mesma estrutura de pastas, configuracao e padroes.

---

## 1. Visao Geral

- **Framework**: NestJS + TypeORM.
- **Banco de dados**: PostgreSQL (schema padrao definido por `DEFAULT_SCHEMA` / `public`).
- **Ambientacao**: Configuracoes via `.env` e `ConfigModule` global.
- **Estrutura modular**: Cada dominio possui modulo proprio em `src/modules/<dominio>`.
- **Autenticacao**: JWT (`AuthModule`), com `JwtAuthGuard` aplicado aos endpoints que requerem login.

---

## 2. Estrutura de Pastas exemplo

```
.
├── agents.md                 # Este blueprint.
├── .env                      # Configuracoes sensiveis (amostragem abaixo).
├── src
│   ├── app.module.ts         # Registro global dos modulos.
│   ├── main.ts               # Bootstrap NestJS.
│   └── modules
│       ├── ai-agent
│       ├── agendamentos
│       ├── auth
│       ├── barbearias
│       ├── clientes
│       ├── config            # `database.config.ts`, naming strategy.
│       ├── profissionais
│       └── ...
├── postmen.json              # Colecao Postman com exemplos de requisicoes.
├── package.json
├── tsconfig.json / tsconfig.build.json
├── eslint.config.mjs
└── .prettierrc
```

### Modulo-base para novos agentes
Ao criar um novo modulo, reproduzir o padrao:

```
src/modules/<nome-agente>/
├── dto/                      # DTOs (validacao via class-validator)
├── entities/                 # Entities TypeORM
├── services/                 # Servicos internos
├── <nome-agente>.controller.ts
├── <nome-agente>.service.ts
└── <nome-agente>.module.ts   # Importa TypeOrmModule.forFeature, providers e controllers
```

---

## 3. Configuracao `.env`

Exemplo de variaveis necessarias:

```
JWT_SECRET=...
PORT=6363
DB_HOST=...
DB_PORT=5432
DB_USER=...
DB_PASS=...
DB_NAME=...
DB_TYPE=postgres
OPENAI_API_KEY=...
EVOLUTION_API_URL=http://100.80.45.92:2121
EVOLUTION_API_KEY=...
CLIENTES_WEBHOOK_TOKEN=...
token_thiago=thiagojw
```

> **Observacoes**:
> - `CLIENTES_WEBHOOK_TOKEN` autentica os webhooks externos (RAG, sincronizacao Evolution, chat status).
> - Use a mesma convencao de *snake_case* para novas chaves.

---

## 4. Banco e Mapeamentos

- `TypeOrmModule.forRoot(databaseConfig())` habilita o carregamento automatico de entidades em `src/modules/**/entities/*.entity.ts`.
- Nome das tabelas definido no decorator `@Entity({ name: '...' })`.
- Convencao de colunas com `snake_case`.
- Strategy personalizada em `src/modules/config/CustomNamingstrategy.ts`.

**Exemplo de entity (chat status):**

```ts
@Entity({ name: 'chat_status' })
export class ChatStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id', type: 'text', unique: true })
  clienteId: string;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'jsonb', nullable: true })
  metadados?: Record<string, unknown> | null;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm: Date;
}
```

---

## 5. Endpoints e Autenticacao

### 5.1 JWT Guard (padrao)
- Aplicado com `@UseGuards(JwtAuthGuard)` em rotas `POST/GET/PATCH` internas.
- Payload do JWT (vide `JwtStrategy`): `{ sub, email, scope }`.

### 5.2 Token Webhook (`CLIENTES_WEBHOOK_TOKEN`)
- Endpoints publicos do modulo **AI Agent** exigem o token no body/query, sem JWT:
  - `POST /ia/perguntar`
  - `POST /ia/chat-externo`
  - `POST /ia/chat-status`
  - `GET /ia/chat-status`
  - `POST /clientes/evolution/sincronizar`
- Validacao centralizada em `AiAgentService.validarToken`.

### 5.3 Estrutura de DTOs
Utilize `class-validator` e `class-transformer`:

```ts
export class UpsertChatStatusDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  clienteId: string;

  @IsIn([0, 1])
  status: 0 | 1;

  @IsOptional()
  metadados?: Record<string, unknown>;
}
```

---

## 6. Interacoes Principais

| Area                 | Descricao                                                                                 |
|----------------------|-------------------------------------------------------------------------------------------|
| AI / RAG             | `AiAgentService.perguntar` consulta RAG (`RagService`), registra historico e sincroniza cliente. |
| Evolution            | Endpoints `/ia/evolution/*` gerenciam sessoes via `EvolutionApiService`.                   |
| Clientes             | Modulo `clientes` cria/atualiza registros vinculados a barbearias, integrando com Evolution. |
| Historico Externo    | `POST /ia/chat-externo` registra conversas de fontes externas e, quando `role=assistant`, persiste pair `chat_messages`. |
| Status do Chat       | `chat_status` mantem status por cliente (via token).                                       |

---

## 7. Scripts e Execucao

Principais scripts (`package.json`):

- `npm run start` – executar em modo producao.
- `npm run start:dev` – NestJS com watch mode.
- `npm run test` / `test:e2e` – Jest.
- `npm run lint` – ESLint.

### Passos tipicos para um novo agente
1. Copiar estrutura basica do modulo (controller, service, module, dto, entities).
2. Registrar o modulo em `app.module.ts`.
3. Criar endpoints e DTOs seguindo padrao de validacao.
4. Atualizar Postman / documentacao.
5. Definir variaveis adicionais no `.env` (se necessarias).

---

## 8. Postman

- Colecao principal neste repositorio: `postmen.json`.
- Inclui chamadas para modulos `ai-agent`, `clientes`, `barbearias`, `auth`.
- Ao criar novo modulo ou metodos, adicione exemplos de requisicoes no Postman para facilitar integracao.

---

## 9. Conclusao

Ao iniciar um novo servico baseado neste template:
1. **Replique a estrutura de modulos** dentro de `src/modules`.
2. **Configure o `.env`** com as chaves existentes (e novas, se necessario).
3. **Implemente DTOs e Guards** seguindo o padrao atual.
4. **Atualize documentacao e Postman** para manter o time sincronizado. Sempre que modificar a colecao no Postman, exporte e substitua o `postmen.json` deste repositorio e tambem o arquivo localizado em `E:\Projetos\corteai-codex\postmen.json`.

Esse guia serve como checklist rapido para que um novo agente seja consistente com o projeto CorteAI atual. Ajuste-o conforme evolucoes futuras na arquitetura.
