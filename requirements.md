# portaria-api — Requirements

## 1. Visão Geral

Plataforma de atendimento automatizado para condomínios via ligação telefônica. Substitui fluxo atual implementado no n8n, migrando para arquitetura robusta em Node.js com padrão MVC.

**Integrações externas:**
- **Twilio** — telefonia (receber/fazer chamadas, STT)
- **OpenAI GPT** — interpretação de linguagem natural
- **ElevenLabs** — text-to-speech (TTS)

---

## 2. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express |
| ORM | Sequelize 6 |
| Banco de dados | MySQL 8 |
| Cache / Fila / Estado | Redis (Bull) |
| Containerização | Docker + Docker Swarm |
| CI/CD | GitHub Actions |
| Métricas | Prometheus (prom-client) |
| Autenticação | JWT |
| Tempo real | Socket.IO |
| Documentação | Swagger (swagger-jsdoc + swagger-ui-express) |

---

## 3. Arquitetura

### 3.1 Padrão

```
MVC + Service Layer
├── Routes        → validação de entrada, autenticação
├── Controllers   → orquestração request/response
├── Services      → regras de negócio
├── Models        → Sequelize ORM
└── Integrations  → adaptadores externos isolados (Twilio, OpenAI, ElevenLabs)
```

### 3.2 Multi-tenancy

- Isolamento **lógico** por `condominium_id`
- Todas as tabelas incluem `condominium_id` (exceto `users` e `audit_logs`)
- Queries sempre filtradas pelo tenant do usuário autenticado
- `SUPER_ADMIN` pode acessar qualquer tenant

### 3.3 Estrutura de Diretórios

```
portaria/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── env.js
│   │   ├── database.js
│   │   ├── sequelize.js
│   │   ├── logger.js
│   │   ├── metrics.js
│   │   ├── queue.js
│   │   ├── swagger.js
│   │   └── encryption.js
│   ├── models/
│   │   ├── associations.js
│   │   ├── User.js
│   │   ├── Condominium.js
│   │   ├── Unit.js
│   │   ├── Resident.js
│   │   ├── Flow.js
│   │   ├── FlowStep.js
│   │   ├── CallSession.js
│   │   ├── CallLog.js
│   │   ├── AuditLog.js
│   │   └── ProcessedEvent.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── condominiumController.js
│   │   ├── unitController.js
│   │   ├── residentController.js
│   │   ├── flowController.js
│   │   ├── callController.js
│   │   └── auditController.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── condominiumService.js
│   │   ├── unitService.js
│   │   ├── residentService.js
│   │   ├── flowService.js
│   │   ├── callService.js
│   │   └── auditService.js
│   ├── integrations/
│   │   ├── TwilioService.js
│   │   ├── OpenAIService.js
│   │   └── ElevenLabsService.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   ├── authorization.js
│   │   ├── audit.js
│   │   ├── errorHandler.js
│   │   ├── correlationId.js
│   │   ├── metricsCollector.js
│   │   └── requestTimeout.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── condominiumRoutes.js
│   │   ├── unitRoutes.js
│   │   ├── residentRoutes.js
│   │   ├── flowRoutes.js
│   │   ├── callRoutes.js
│   │   └── auditRoutes.js
│   ├── queues/
│   │   ├── callQueue.js
│   │   └── callProcessor.js
│   ├── workers/
│   │   └── callWorker.js
│   ├── lib/
│   │   └── crypto.js
│   └── utils/
│       └── idempotency.js
├── database/
│   └── migrations/
├── __tests__/
│   ├── __mocks__/
│   ├── unit/
│   │   ├── services/
│   │   └── middlewares/
│   └── integration/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── Dockerfile
├── docker-compose.yml
├── docker-stack.yml
├── docker-entrypoint.sh
├── .sequelizerc
├── .env.example
├── .gitignore
├── jest.config.js
└── package.json
```

---

## 4. Autenticação e Autorização

### 4.1 JWT

- Token gerado no login com payload: `{ id, email, role, condominium_id }`
- Expiração configurável via `JWT_EXPIRES_IN` (padrão: `24h`)
- Middleware `auth.js` valida Bearer token em todas as rotas protegidas

### 4.2 RBAC — Roles

| Role | Descrição | Acesso |
|---|---|---|
| `ADM` | Empresa operadora | Todos os condominiums, todas as operações |
| `CLIENT_ADM` | Administrador do condomínio | Apenas seu `condominium_id` |
| `SUPPORT` | Suporte do nosso sistema, pode acessar bases dos clientes mas não pode editar ou alterar dados |

### 4.3 Middleware de autorização

```js
checkRole(['ADM'])           // apenas super admin
checkRole(['ADM', 'CLIENT_ADM'])  // ambos
```

---

## 5. Módulos e Entidades

### 5.1 Users

Tabela: `users`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `name` | VARCHAR | Nome completo |
| `email` | VARCHAR UNIQUE | |
| `password_hash` | TEXT | bcrypt |
| `role` | ENUM(`SUPER_ADMIN`, `ADMIN_CONDOMINIO`) | |
| `condominium_id` | UUID FK nullable | null para SUPER_ADMIN |
| `active` | BOOLEAN | default true |
| `first_access` | BOOLEAN | força troca de senha |
| `created_by` | UUID FK nullable | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### 5.2 Condominiums

Tabela: `condominiums`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `name` | VARCHAR | Nome do condomínio |
| `cnpj` | VARCHAR nullable | |
| `phone` | VARCHAR nullable | Telefone principal |
| `address` | TEXT nullable | |
| `city` | VARCHAR nullable | |
| `state` | VARCHAR nullable | |
| `zip_code` | VARCHAR nullable | |
| `active` | BOOLEAN | default true |
| `twilio_phone_number` | VARCHAR nullable | Número Twilio associado |
| `fallback_extension` | VARCHAR nullable | Ramal de fallback em caso de falha |
| `gates_config` | JSON | Ex: `{"gate1": {"dns": "192.168.1.10", "label": "Portão Principal"}, "gate2": {...}}` |
| `extensions_config` | JSON | Ex: `{"portaria": "100", "sindico": "101"}` |
| `level1_label` | VARCHAR | Ex: "Bloco", "Quadra", "Rua" |
| `level2_label` | VARCHAR | Ex: "Apto", "Lote", "Número" |
| `created_by` | UUID FK nullable | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

> `gates_config` e `extensions_config` são JSON flexíveis para suportar diferentes infraestruturas sem alterar schema.

### 5.3 Units

Tabela: `units`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `condominium_id` | UUID FK | |
| `level1_value` | VARCHAR | Ex: "A", "Quadra 3" |
| `level2_value` | VARCHAR | Ex: "101", "Lote 5" |
| `status` | ENUM(`occupied`, `vacant`) | default `vacant` |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### 5.4 Residents

Tabela: `residents`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `condominium_id` | UUID FK | |
| `unit_id` | UUID FK nullable | |
| `name` | VARCHAR | |
| `cpf` | VARCHAR nullable | |
| `phone` | VARCHAR nullable | |
| `phone_2` | VARCHAR nullable | |
| `email` | VARCHAR nullable | |
| `type` | ENUM(`owner`, `tenant`, `dependent`) | default `owner` |
| `active` | BOOLEAN | default true |
| `can_authorize` | BOOLEAN | Pode autorizar visitas/entregas |
| `notes` | TEXT nullable | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### 5.5 Flows

Tabela: `flows`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `condominium_id` | UUID FK | |
| `name` | VARCHAR | Nome descritivo |
| `type` | VARCHAR | Ex: `VISITA`, `IFOOD`, `PRESTADOR`, `ENTREGA`, `EMERGENCIA` |
| `active` | BOOLEAN | default true |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### 5.6 FlowSteps

Tabela: `flow_steps`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `flow_id` | UUID FK | |
| `condominium_id` | UUID FK | (desnormalizado para queries por tenant) |
| `step_order` | INTEGER | Ordem de execução (1, 2, 3...) |
| `type` | ENUM | Ver tipos abaixo |
| `config` | JSON | Configuração específica do step |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Tipos de step:**

| Tipo | Descrição | Config exemplo |
|---|---|---|
| `GREETING` | Saudação inicial | `{"message": "Bem-vindo ao Condomínio X"}` |
| `COLLECT_DATA` | Coleta campos do visitante | `{"fields": ["name", "cpf"], "retry": 2}` |
| `VALIDATE_RESIDENT` | Valida morador pelo nível 1/2 | `{"retry": 2}` |
| `ASK_QUESTION` | Pergunta livre | `{"question": "Qual o motivo da visita?", "retry": 2}` |
| `OPEN_GATE` | Aciona portão | `{"gate": "gate1", "confirmation_message": "Portão aberto"}` |
| `TRANSFER_CALL` | Transfere para ramal | `{"extension": "portaria"}` |
| `END_CALL` | Encerra chamada | `{"message": "Atendimento encerrado"}` |

### 5.7 CallSessions

Tabela: `call_sessions`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `condominium_id` | UUID FK | |
| `flow_id` | UUID FK nullable | |
| `twilio_call_sid` | VARCHAR UNIQUE nullable | SID da chamada no Twilio |
| `caller_number` | VARCHAR | Número de quem ligou |
| `current_step_id` | UUID FK nullable | Step atual em execução |
| `status` | ENUM | Ver status abaixo |
| `collected_data` | JSON | Dados coletados durante a chamada |
| `started_at` | TIMESTAMP | |
| `ended_at` | TIMESTAMP nullable | |
| `duration_seconds` | INTEGER nullable | |
| `transcript` | TEXT nullable | Transcrição completa |
| `summary` | TEXT nullable | Resumo gerado pela IA |
| `error_message` | TEXT nullable | Erro em caso de falha |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Status de CallSession:**

| Status | Descrição |
|---|---|
| `queued` | Na fila aguardando processamento |
| `in_progress` | Em atendimento ativo |
| `completed` | Encerrada com sucesso |
| `failed` | Encerrada com erro |
| `transferred` | Transferida para ramal humano |
| `abandoned` | Desligou sem completar |

### 5.8 CallLogs

Tabela: `call_logs`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `call_session_id` | UUID FK | |
| `condominium_id` | UUID FK | |
| `event_type` | VARCHAR | Ex: `step_started`, `step_completed`, `input_received`, `gate_opened`, `error`, `fallback_triggered` |
| `step_id` | UUID FK nullable | |
| `payload` | JSON nullable | Dados do evento |
| `created_at` | TIMESTAMP | |

### 5.9 AuditLogs

Tabela: `audit_logs`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID nullable | |
| `action` | VARCHAR | `CREATE`, `UPDATE`, `DELETE`, `READ`, `LOGIN` |
| `resource` | VARCHAR | Ex: `CONDOMINIUM`, `RESIDENT`, `FLOW` |
| `resource_id` | UUID nullable | |
| `method` | VARCHAR | HTTP method |
| `endpoint` | VARCHAR | |
| `request_body` | JSON nullable | Dados sanitizados (sem senhas) |
| `request_params` | JSON nullable | |
| `request_query` | JSON nullable | |
| `response_status` | INTEGER | |
| `ip_address` | VARCHAR | |
| `user_agent` | TEXT nullable | |
| `error_message` | TEXT nullable | |
| `created_at` | TIMESTAMP | |

### 5.10 ProcessedEvents

Tabela: `processed_events`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | |
| `external_id` | VARCHAR UNIQUE | ID externo do evento (ex: Twilio CallSid) |
| `source` | VARCHAR | Ex: `twilio`, `webhook` |
| `processed_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

---

## 6. Endpoints da API

### Auth
```
POST   /api/auth/login
POST   /api/auth/change-password
```

### Condominiums
```
GET    /api/condominiums              [SUPER_ADMIN]
POST   /api/condominiums              [SUPER_ADMIN]
GET    /api/condominiums/:id          [SUPER_ADMIN, ADMIN_CONDOMINIO]
PUT    /api/condominiums/:id          [SUPER_ADMIN, ADMIN_CONDOMINIO]
DELETE /api/condominiums/:id          [SUPER_ADMIN]
```

### Units
```
GET    /api/condominiums/:id/units    [SUPER_ADMIN, ADMIN_CONDOMINIO]
POST   /api/condominiums/:id/units    [SUPER_ADMIN, ADMIN_CONDOMINIO]
PUT    /api/condominiums/:id/units/:unitId
DELETE /api/condominiums/:id/units/:unitId
```

### Residents
```
GET    /api/condominiums/:id/residents
POST   /api/condominiums/:id/residents
GET    /api/condominiums/:id/residents/:residentId
PUT    /api/condominiums/:id/residents/:residentId
DELETE /api/condominiums/:id/residents/:residentId
```

### Flows
```
GET    /api/condominiums/:id/flows
POST   /api/condominiums/:id/flows
GET    /api/condominiums/:id/flows/:flowId
PUT    /api/condominiums/:id/flows/:flowId
DELETE /api/condominiums/:id/flows/:flowId
GET    /api/condominiums/:id/flows/:flowId/steps
POST   /api/condominiums/:id/flows/:flowId/steps
PUT    /api/condominiums/:id/flows/:flowId/steps/:stepId
DELETE /api/condominiums/:id/flows/:flowId/steps/:stepId
```

### Calls
```
POST   /api/calls/webhook/incoming    [Twilio webhook — sem auth JWT]
GET    /api/calls/sessions            [SUPER_ADMIN, ADMIN_CONDOMINIO]
GET    /api/calls/sessions/:id        [SUPER_ADMIN, ADMIN_CONDOMINIO]
GET    /api/calls/sessions/:id/logs   [SUPER_ADMIN, ADMIN_CONDOMINIO]
```

### Audit
```
GET    /api/audit                     [SUPER_ADMIN]
```

---

## 7. Fila de Chamadas (Redis + Bull)

- **Fila:** `call-processing`
- **Concorrência máxima:** 5 chamadas simultâneas (configurável via env `CALL_QUEUE_CONCURRENCY`)
- **Retry:** 3 tentativas com backoff exponencial (5s base)
- **Timeout por job:** 5 minutos
- **Bull Board:** `/admin/queues` (protegido por auth em produção)

### Estado da chamada no Redis

```
Key:   call:session:{call_session_id}
Value: JSON com estado atual (step, collected_data, retry_count, timeout_count)
TTL:   1 hora
```

### Idempotência

```
Key:   event:{external_id}
TTL:   24 horas
```

Antes de processar qualquer evento externo (ex: webhook Twilio):
1. Verificar Redis: se key existe → retornar 200 sem reprocessar
2. Verificar MySQL `processed_events`: fallback se Redis reiniciou
3. Registrar em ambos após processamento

---

## 8. WebSocket (Socket.IO)

### Eventos emitidos pelo servidor

| Evento | Payload | Descrição |
|---|---|---|
| `call:started` | `{ sessionId, condominiumId, callerNumber }` | Nova chamada iniciada |
| `call:step_changed` | `{ sessionId, stepType, stepOrder }` | Mudança de step |
| `call:log` | `{ sessionId, eventType, payload }` | Log em tempo real |
| `call:ended` | `{ sessionId, status, duration }` | Chamada encerrada |

### Rooms

- `condominium:{condominium_id}` — admins do condomínio recebem eventos do seu tenant
- `super_admin` — SUPER_ADMIN recebe todos os eventos

### Autenticação

- Token JWT passado como query param na conexão: `?token=...`
- Middleware Socket.IO valida token e associa socket à room correta

---

## 9. Integrações Externas

Todas as integrações ficam em `src/integrations/` e são **mockadas** inicialmente.

### TwilioService

```js
// Responsabilidades:
// - Receber webhook de chamada entrante
// - Gerar TwiML para controle do fluxo
// - Transferir chamada para ramal
// - Encerrar chamada
// - STT via Twilio (ou encaminhar áudio para OpenAI Whisper)
```

### OpenAIService

```js
// Responsabilidades:
// - Interpretar input do usuário (texto transcrito)
// - Extrair campos estruturados (nome, CPF, bloco, apto)
// - Gerar resposta em linguagem natural
// - Modelo: gpt-4o (configurável via env)
```

### ElevenLabsService

```js
// Responsabilidades:
// - Converter texto em áudio (TTS)
// - Retornar buffer de áudio para Twilio
// - Voice ID configurável por condomínio
```

---

## 10. Lógica de Timeout de Interação

Implementada no `callService.js` / `callWorker.js`:

1. Usuário não responde → repetir pergunta (máx. `retry` vezes, configurado no step)
2. Após esgotar retries → acionar step `FALLBACK` ou `END_CALL`
3. Fallback: transferir para `condominium.fallback_extension`

---

## 11. Observabilidade

### Métricas Prometheus (`/metrics`)

| Métrica | Tipo | Labels |
|---|---|---|
| `cca_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` |
| `cca_http_requests_total` | Counter | `method`, `route`, `status_code` |
| `cca_calls_total` | Counter | `condominium_id`, `status` |
| `cca_call_duration_seconds` | Histogram | `condominium_id` |
| `cca_integration_errors_total` | Counter | `integration` (`twilio`, `openai`, `elevenlabs`) |
| `cca_queue_depth` | Gauge | `queue`, `state` |
| `cca_db_pool_connections` | Gauge | `state` |
| `cca_active_calls` | Gauge | — |

Endpoint protegido por Bearer token em produção (`METRICS_TOKEN`).

### Logs (Winston)

- Formato JSON em produção, colorido em desenvolvimento
- Campos padrão: `timestamp`, `level`, `service`, `correlationId`
- Campos sensíveis redactados: `password`, `token`, `secret`, `authorization`

### Health Check (`/health`)

```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

## 12. Docker

### Dockerfile

Multi-stage build:
- Stage `deps`: `npm ci --omit=dev`
- Stage final: `node:20-alpine`, usuário não-root, `HEALTHCHECK` via wget

### docker-compose.yml (desenvolvimento local)

Serviços:
- `mysql` (mysql:8.0, `network_mode: host`)
- `redis` (redis:7-alpine, `network_mode: host`)
- `api` (build local, `network_mode: host`)

### docker-stack.yml (Docker Swarm / produção)

Serviços:
- `cca-mysql` — MySQL 8, 1 replica, placement manager, secrets
- `cca-redis` — Redis 7, 1 replica
- `cca-api` — API, 1 replica, Traefik labels, secrets, rolling update
- `adminer` — 0 replicas (escalar manualmente quando necessário)

Secrets Docker:
- `cca_db_password`
- `cca_db_root_password`
- `cca_jwt_secret`
- `cca_encryption_key`
- `cca_metrics_token`
- `cca_twilio_auth_token`
- `cca_openai_api_key`
- `cca_elevenlabs_api_key`

---

## 13. CI/CD (GitHub Actions)

Arquivo: `.github/workflows/deploy.yml`

Trigger: push na branch `main`

Jobs:
1. **test** — `npm ci` + `npm test`
2. **deploy** — SSH no servidor, executa `deploy.sh` (pull imagem, `docker stack deploy`)

Secrets GitHub necessários:
- `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`

---

## 14. Variáveis de Ambiente

```env
# App
NODE_ENV=development
PORT=3000
TZ=America/Sao_Paulo

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cca
DB_USER=root
DB_PASSWORD=

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=24h

# Encryption (AES-256-GCM)
ENCRYPTION_KEY=

# Metrics
METRICS_TOKEN=

# CORS
CORS_ORIGIN=http://localhost:3001

# Queue
CALL_QUEUE_CONCURRENCY=5

# Integrations
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Logs
LOG_LEVEL=info
```

---

## 15. Referência de Arquitetura — Projeto Guardia

Este projeto segue os mesmos padrões do projeto **guardia** (`../guardia`):

| Aspecto | Padrão adotado |
|---|---|
| Estrutura de pastas | Idêntica (config, models, controllers, services, middlewares, routes, queues, workers) |
| Middlewares | `correlationId`, `metricsCollector`, `requestTimeout`, `audit`, `auth`, `authorization`, `errorHandler` |
| Logger | Winston JSON, redact de campos sensíveis |
| Encryption | AES-256-GCM (`iv:authTag:data`) |
| Métricas | prom-client, prefixo `cca_` |
| Filas | Bull + Redis, `defaultJobOptions` com retry exponencial |
| Docker | Multi-stage Dockerfile, Swarm stack com Traefik, secrets |
| CI/CD | GitHub Actions → SSH → deploy.sh |
| Graceful shutdown | SIGTERM/SIGINT, fecha HTTP server + filas + DB pool |
| Health check | `/health` verifica DB + Redis |
| Audit | Middleware intercepta `res.send`, loga assincronamente via `setImmediate` |

---

## 16. Decisões de Design

**Por que `gates_config` e `extensions_config` como JSON no Condominium?**
Cada condomínio tem infraestrutura diferente (1 a N portões, ramais variados). JSON flexível evita migrations para cada novo tipo de dispositivo.

**Por que `level1_label` / `level2_label` no Condominium?**
Diferentes condomínios usam nomenclaturas distintas (bloco/apto, quadra/lote, rua/número). Os labels são configurados por tenant e usados na UI e nos prompts da IA.

**Por que `condominium_id` desnormalizado em `flow_steps`?**
Permite queries de auditoria e filtragem por tenant sem JOIN com `flows`, importante para performance em listagens de logs.

**Por que estado da chamada no Redis e não só no MySQL?**
Chamadas em andamento precisam de leitura/escrita de estado com latência < 5ms. MySQL seria gargalo. Redis armazena estado temporário; MySQL recebe persistência final ao encerrar a chamada.

**Por que idempotência em dois níveis (Redis + MySQL)?**
Redis pode ser reiniciado. MySQL garante que eventos já processados não sejam reprocessados mesmo após restart do Redis.
