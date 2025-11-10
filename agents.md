
## 1. Visao Geral

- **Framework**: NestJS + TypeORM.
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
│       ├── auth
│       ├── config            # `database.config.ts`, naming strategy.
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
OPENAI_API_KEY=...
EVOLUTION_API_URL=http://100.80.45.92:2121
EVOLUTION_API_KEY=...
```

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
4. **Atualize documentacao e Postman**
5. **Antes de implementar qualquer mudanca solicitada em codigo**, elabore um plano de execucao, apresente-o e confirme com o solicitante se deve prosseguir com o plano.

Esse guia serve como checklist rapido para que um novo agente seja consistente com o projeto CorteAI atual. Ajuste-o conforme evolucoes futuras na arquitetura.
