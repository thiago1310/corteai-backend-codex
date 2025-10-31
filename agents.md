# CorteAI Backend – Project Blueprint for New Agents

Este documento resume os principais componentes de infraestrutura e organização utilizados no projeto **corteai-backend-codex**. Utilize-o como referência ao criar um novo serviço “agente” que deva seguir a mesma estrutura de pastas, configuração e padrões.

---

## 1. Visão Geral

- **Framework**: NestJS + TypeORM.
- **Banco de dados**: PostgreSQL (schema padrão definido por `DEFAULT_SCHEMA` / `public`).
- **Ambientação**: Configurações via `.env` e `ConfigModule` global.
- **Estrutura modular**: Cada domínio possui módulo próprio em `src/modules/<domínio>`.
- **Autenticação**: JWT (`AuthModule`), com `JwtAuthGuard` aplicado aos endpoints que requerem login.

---

## 2. Estrutura de Pastas exemplo

```
.
├── agents.md                 # Este blueprint.
├── .env                      # Configurações sensíveis (amostragem abaixo).
├── src
│   ├── app.module.ts         # Registro global dos módulos.
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
├── postmen.json              # Coleção Postman com exemplos de requisições.
├── package.json
├── tsconfig.json / tsconfig.build.json
├── eslint.config.mjs
└── .prettierrc
```

### Módulo-base para novos agentes
Ao criar um novo módulo, reproduzir o padrão:

```
src/modules/<nome-agente>/
├── dto/                      # DTOs (validação via class-validator)
├── entities/                 # Entities TypeORM
├── services/                 # Serviços internos
├── <nome-agente>.controller.ts
├── <nome-agente>.service.ts
└── <nome-agente>.module.ts   # Importa TypeOrmModule.forFeature, providers e controllers
```

---

## 3. Configuração `.env`

Exemplo de variáveis necessárias:

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

> **Observações**:
> - `CLIENTES_WEBHOOK_TOKEN` autentica os webhooks externos (RAG, sincronização Evolution, chat status).
> - Use a mesma convenção de *snake_case* para novas chaves.

---

## 4. Banco e Mapeamentos

- `TypeOrmModule.forRoot(databaseConfig())` habilita o carregamento automático de entidades em `src/modules/**/entities/*.entity.ts`.
- Nome das tabelas definido no decorator `@Entity({ name: '...' })`.
- Convenção de colunas com `snake_case`.
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

## 5. Endpoints e Autenticação

### 5.1 JWT Guard (padrão)
- Aplicado com `@UseGuards(JwtAuthGuard)` em rotas `POST/GET/PATCH` internas.
- Payload do JWT (vide `JwtStrategy`): `{ sub, email, scope }`.

### 5.2 Token Webhook (`CLIENTES_WEBHOOK_TOKEN`)
- Endpoints públicos do módulo **AI Agent** exigem o token no body/query, sem JWT:
  - `POST /ia/perguntar`
  - `POST /ia/chat-externo`
  - `POST /ia/chat-status`
  - `GET /ia/chat-status`
  - `POST /clientes/evolution/sincronizar`
- Validação centralizada em `AiAgentService.validarToken`.

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

## 6. Interações Principais

| Área                 | Descrição                                                                                 |
|----------------------|-------------------------------------------------------------------------------------------|
| AI / RAG             | `AiAgentService.perguntar` consulta RAG (`RagService`), registra histórico e sincroniza cliente. |
| Evolution            | Endpoints `/ia/evolution/*` gerenciam sessões via `EvolutionApiService`.                   |
| Clientes             | Módulo `clientes` cria/atualiza registros vinculados a barbearias, integrando com Evolution. |
| Histórico Externo    | `POST /ia/chat-externo` registra conversas de fontes externas e, quando `role=assistant`, persiste pair `chat_messages`. |
| Status do Chat       | `chat_status` mantém status por cliente (via token).                                       |

---

## 7. Scripts e Execução

Principais scripts (`package.json`):

- `npm run start` – executar em modo produção.
- `npm run start:dev` – NestJS com *watch mode*.
- `npm run test` / `test:e2e` – Jest.
- `npm run lint` – ESLint.

### Passos típicos para um novo agente
1. Copiar estrutura básica do módulo (controller, service, module, dto, entities).
2. Registrar o módulo em `app.module.ts`.
3. Criar endpoints e DTOs seguindo padrão de validação.
4. Atualizar Postman / documentação.
5. Definir variáveis adicionais no `.env` (se necessárias).

---

## 8. Postman

- Coleção principal neste repositório: `postmen.json`.
- Inclui chamadas para módulos `ai-agent`, `clientes`, `barbearias`, `auth`.
- Ao criar novo módulo, adicione exemplos de requisições no Postman para facilitar integração.

---

## 9. Conclusão

Ao iniciar um novo serviço baseado neste template:
1. **Replique a estrutura de módulos** dentro de `src/modules`.
2. **Configure o `.env`** com as chaves existentes (e novas, se necessário).
3. **Implemente DTOs e Guards** seguindo o padrão atual.
4. **Atualize documentação e Postman** para manter o time sincronizado.

Esse guia serve como checklist rápido para que um novo agente seja consistente com o projeto CorteAI atual. Ajuste-o conforme evoluções futuras na arquitetura.
