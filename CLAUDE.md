# Portaria API

Atendimento telefônico automatizado para condomínios. Visitante liga para o número do condomínio → o sistema identifica a intenção (visita, iFood, encomenda, prestador), coleta os dados por voz (STT + LLM), valida o morador no cadastro, liga para o morador pedindo autorização e libera/transfere/encerra conforme a resposta. Multi-condomínio (multi-tenant por `condominium_id`).

Substitui um fluxo que antes vivia no N8N. Cada condomínio tem seus próprios fluxos, portões, ramais, funcionários e número(s) Twilio.

## Stack

- Node 20 + Express 4 + Sequelize 6 + MySQL 8 + Socket.IO + `ws` + JWT
- **CommonJS** (`require`, não ESM)
- Joi para validação · Winston pra log estruturado · prom-client (métricas) · Swagger (`/api-docs`)
- **OpenAI SDK** (LLM real, `gpt-4o-mini` por default)
- **Twilio ConversationRelay** (WebSocket) pra voz + STT, **ElevenLabs** como TTS provider do relay

> **Sem Redis/fila.** O motor de chamada é o ConversationRelay (WebSocket) com estado em memória. Não há Bull/worker. (Multi-servidor no futuro vai precisar de Redis pub/sub — ver gotcha de estado em memória.)

## Comandos

```
make dev            # sobe mysql (docker compose) + npm run dev (porta 3000)
make dev-full       # sobe tudo: mysql + API + frontend
make migrate        # roda migrations
make migrate-fresh  # dropa banco + recria + migra (CUIDADO — só local)
make mysql          # cliente MySQL no container (senha dev: portaria_dev_2026)
make backup         # mysqldump pra backup_YYYYMMDD_HHMMSS.sql
make restore file=  # restaura backup
make ssh-prod       # SSH no servidor de produção (root@5.78.191.14)
npm run dev         # API com nodemon (porta 3000)
```

**Seed admin** (criado na migration inicial): `adm@portaria.com` / `p0rt4r1@2026`.

## Estrutura

- `src/controllers/` — handlers HTTP (chamam services)
- `src/services/` — lógica de negócio (callService, flowService, condominiumService, userService, visitorService, moradorContactService, seed)
- `src/integrations/` — adaptadores externos: `OpenAIService.js`, `ElevenLabsService.js`, `TwilioService.js` + subpasta `twilio/` (o motor real)
- `src/integrations/twilio/` — `conversationRelay.js` (motor de chamada), `twiml.js`, `twilioClient.js`, `simulator.js`
- `src/models/` — Sequelize models · `associations.js` concentra todas as associações
- `src/constants/` — `nodeTypes.js`, `flowTypes.js`, catálogos de intenção, `prompts.js` (system prompts LLM), pricing
- `src/routes/` — rotas + middlewares (auth, condominium, call, twilio, dev, audit, user, catalogs, etc.)
- `src/middlewares/` — auth, authorization, audit, correlationId, metricsCollector, requestTimeout, logger, errorHandler
- `src/config/` — env, sequelize, database, logger, metrics, swagger, encryption
- `src/lib/` — `crypto.js` (AES-256-GCM)
- `src/utils/` — `phoneNormalizer.js`
- `database/migrations/` — Sequelize migrations, naming `YYYYMMDDHHmmss-descricao.js`
- `docs/` — `simulator.md` (testar fluxos sem ligar), `backlog.md`, `gap-analysis-gpt-vs-implementado.md`, `backlog-portal-antigo.md`

> O `requirements.md` na raiz é a **spec original** e está **desatualizado** (descreve `FlowStep` com ENUM simples, roles `SUPER_ADMIN/ADMIN_CONDOMINIO`, IDs UUID). O código evoluiu pra grafo de nodes, roles `ADM/CLIENT_ADM/SUPPORT` e IDs inteiros. **Confie no código, não no requirements.md.**

## Modelo de dados (grafo de fluxo)

Tabelas centrais (PKs inteiras auto-increment, salvo onde indicado):

**Tenant & cadastro**
- `condominiums` — tenant. Inclui `level1_label`/`level2_label` (nomenclatura customizável: Bloco/Apto, Quadra/Lote, Rua/Número), `fallback_extension`.
- `users` — `role ENUM('ADM','CLIENT_ADM','SUPPORT')`, `condominium_id` (null pra ADM), `first_access`, soft-delete (`deleted_at`).
- `units` — unidade (`level1_value` + `level2_value`), unique por condomínio.
- `contacts` — moradores/proprietários (`type owner|resident|visitor`, `can_authorize`, `phone`, `phone_2`).
- `visitors` + `unit_visitors` — visitantes com janela de autorização (`authorized_from/until`) e vínculo N:N com unidades.
- `employees` + `employee_roles` (sindico/faxineira/porteiro/zelador) + `employee_shifts` (turnos WEEKLY/ROTATION).
- `gates` — portões (`slug`, `dns`, `brand`, `extension`, `position`). `extensions` — ramais internos. `phone_numbers` — números Twilio do condomínio (caller ID em outbound).
- `visitor_data_fields` (catálogo: nome/cpf/rg/empresa/...) e `unit_identification_levels` (PK string) — catálogos do que coletar.

**Fluxos (o grafo)**
- `flow_types` (PK string `key`) — `ROOT`, `VISITA_MORADOR`, `IFOOD_MORADOR`, `ENCOMENDA_MORADOR`, `ENCOMENDA_CONDOMINIO`, `PRESTADOR_MORADOR`, `PRESTADOR_CONDOMINIO`. **ROOT é o ponto de entrada único de toda chamada.**
- `flows` — 1 por (condomínio, tipo). Tem `entry_node_id` apontando pro node inicial.
- `flow_nodes` — `type` + `config` (JSON) + `position_x/y` (pra o editor React Flow). Tipos: ver abaixo.
- `flow_edges` — `(source_node_id, source_handle) → (target_node_id, target_handle)`. Unique por `(source_node_id, source_handle)` (cada saída → 1 edge).

**Chamada**
- `call_sessions` — estado da chamada: `status` (queued/in_progress/completed/failed/transferred/abandoned), `collected_data` (JSON: `{intent, morador, visita}`), `current_node_id`, `transcript`, `summary`, `duration_seconds`, e **tracking de custo**: `tts_chars`, `estimated_twilio_cost_usd`, `estimated_tts_cost_usd`.
- `call_logs` — auditoria granular turn-a-turn (`event_type`, `node_id`, `payload`).
- `audit_logs` — auditoria das operações via API REST.

> A tabela `processed_events` ainda existe no banco (migration inicial), mas o código de idempotência que a usava foi removido junto com a fila legada. Não está mais ligada a nada.

## Tipos de node (`src/constants/nodeTypes.js`)

| Node | Saídas (handles) | O que faz |
|---|---|---|
| `COLETAR_INTENCAO` | dinâmicas do catálogo + `fallback` | LLM classifica a intenção (`o_que_deseja`, `para_quem`) e roteia. **Só em fluxo ROOT.** |
| `TRANSFERIR_FLUXO` | — | Sai do fluxo atual e entra em outro (ex: ROOT → VISITA_MORADOR). **Só em ROOT.** |
| `COLETAR_DADOS_MORADOR` | `dadosConfirmados`, `dadosNaoConfirmados` | Coleta campos via STT+LLM → busca morador (unit + nome) → pede confirmação ("Você vai visitar o(a) X?"). |
| `COLETAR_DADOS_VISITA` | `default` | Coleta dados do visitante; reaproveita visitor já cadastrado/pré-autorizado. |
| `CONTATAR` | `autorizado`, `naoAutorizado`, `semResposta` | Liga (outbound Twilio) pro morador/funcionário, faz Gather sim/não, resolve. |
| `COMUNICACAO` | `default` | Fala um texto (TTS) ou prompt LLM pro visitante. |
| `COMANDO` | `default` | Aciona portão. **Mock/TODO** — sem request HTTP real pro DNS ainda. |
| `TIMER` | `default` | Aguarda N segundos. |
| `END` | — | Encerra: `hangup` / `transfer` (pra ramal) / `silent`. |
| `GREETING`, `OPEN_GATE` | — | Legados (não usados no grafo atual). |

## Fluxo de uma chamada

Há **um único** motor de chamada: o **ConversationRelay (WebSocket)**.

**Twilio → `/api/twilio/voice` → TwiML ConversationRelay → WebSocket `/api/twilio/conversation-relay` → `conversationRelay.js handleConnection()`.**

1. Configurar na Twilio: número → "A CALL COMES IN" → POST `<PUBLIC_BACKEND_URL>/api/twilio/voice`.
2. `/voice` devolve TwiML com `<ConversationRelay>` apontando pro nosso WS (`wss://.../api/twilio/conversation-relay`), TTS provider = ElevenLabs + `ELEVENLABS_VOICE_ID`.
3. WS conecta → evento `setup` (callSid, from, to) → resolve condomínio pelo número discado → cria `CallSession` → carrega o flow **ROOT** com nodes/edges indexados → `runUntilInputOrEnd()`.
4. Loop executa nodes até **bloquear esperando input** (manda pergunta, liga `silenceTimer`) ou **END**. Estado da sessão vive **em memória** (Map no processo), incluindo `nodeState` (máquina por-node: campos coletados, `awaitingConfirmation`, `matchedContact`, retry).
5. Visitante fala → evento `prompt` (com `last:true` no fim do turno) → handler do node corrente processa (LLM extrai campos / classifica) → segue o edge pelo handle resultante.
6. `CONTATAR` disca outbound; a decisão volta por webhook HTTP `/api/twilio/morador-decision/:callSessionId` (Gather + `classifyYesNo`) e o status terminal por `/api/twilio/morador-status/:callSessionId` (resolve `semResposta`). Os dois resolvem uma Promise pendente guardada no `moradorContactService`.
7. Fim → `finalizeCallSession()` calcula custo estimado (`estimateCallCost`) e persiste na `call_sessions`.

**Silêncio:** 10s sem resposta → re-pergunta ("Desculpe, não consegui ouvir..."), máx. 2 retentativas, depois encerra.

## Integrações

- **OpenAI** (`OpenAIService.js`) — **real e em uso**. `classifyIntent`, `extractFields` (JSON Schema, normaliza CPF/RG ditado), `classifyYesNo`. Modelo via `OPENAI_MODEL` (default `gpt-4o-mini`). Tokens logados em `session.usageLog`. **Degradação graciosa:** sem API key ou em falha, intent cai num keyword matcher; coleta de morador sem LLM nega acesso.
- **Twilio** — ConversationRelay (WS) e outbound (`twilioClient.js`) **funcionais**. Já `TwilioService.js` (REST: validateWebhook, transferCall, endCall, transcribeAudio) está **stub/TODO**.
- **ElevenLabs** — TTS é feito pela plataforma Twilio via ConversationRelay (provider configurado no TwiML). `ElevenLabsService.js` é **mock** e não está no hot path; `tts_chars` é contado só pra estimar custo.

## Auth / multi-tenant

- JWT (`{ id, email, role, condominium_id }`), expira em `JWT_EXPIRES_IN` (default 24h).
- `checkRole([...])` e `checkCondominiumAccess()` em `src/middlewares/authorization.js`:
  - **ADM** — acesso global, tudo.
  - **CLIENT_ADM** — só o próprio `condominium_id`.
  - **SUPPORT** — global mas **read-only** (só GET; POST/PUT/DELETE bloqueado).
- Queries sempre filtradas pelo tenant do usuário (exceto ADM).

## Endpoints (resumo)

- **Auth:** `POST /api/auth/login`, `/refresh`, `/logout`, `GET /api/auth/me`.
- **CRUD tenant:** `/api/condominiums` (+ nested `units`, `residents/contacts`, `gates`, `extensions`, `employees`), `/api/users`.
- **Fluxos:** `/api/condominiums/:id/flows` + nested `nodes`, `edges`, `validate`, `entry-node`.
- **Chamadas (leitura):** `GET /api/calls/sessions`, `/sessions/:id`, `/sessions/:id/logs`.
- **Twilio (webhooks, sem JWT):** `POST /api/twilio/voice`, `/morador-decision/:id`, `/morador-status/:id`; WS `/api/twilio/conversation-relay`.
- **Dev (ADM):** `POST /api/dev/seed`, `/api/dev/simulate-call`, `/api/dev/test-node` — ver `docs/simulator.md`.
- **Catálogos:** `/api/catalogs`, `/api/visitor-data-fields`, `/api/employee-roles`.
- **Infra:** `GET /health` (DB), `GET /metrics` (Bearer em prod), `/api-docs` (Swagger).

## Socket.IO

- Servidor configurado em `src/server.js` (mesmo HTTP server, auth por JWT em `?token=`). Rooms: `super_admin` (ADM) e `condominium:{id}`. `io` exposto em `app.locals.io`.
- **Ainda não há emissão de eventos de chamada** (`call:started`, etc.). A infra existe; os emits são trabalho de backlog (dashboard em tempo real).

## Observabilidade

- **Logger Winston:** sempre objeto, nunca string: `logger.info({ msg: '...', ...meta })`. JSON em prod, pretty em dev. Redact automático de `password`/`token`/`secret`/`authorization`.
- **Métricas prom-client**, prefixo `portaria_`: http duration/total, `activeCalls`, `callsTotal`, `callDuration`, `integrationErrors`, db pool.
- **Rate limit:** global 100/min, `/api/auth` 10/min.

## Gotchas (já tropeçamos / atenção)

1. **Estado da chamada vive em memória** (Map por WebSocket no processo `conversationRelay.js`). Funciona em 1 réplica (o stack roda `replicas: 1`); **multi-servidor exige Redis pub/sub** (ver `moradorContactService`, que guarda a Promise pendente do CONTATAR em memória). Se for escalar horizontalmente, esse é o ponto a refatorar.
2. **`docker-entrypoint.sh` engole erro de migration** (`npx sequelize-cli db:migrate || echo "..."`). Migration parcial + app sobe com schema errado → quebra em runtime. Conferir logs após deploy. (Mesmo gotcha do guardia.)
3. **`requirements.md` está desatualizado** — vide nota acima. Use o código como fonte da verdade.
4. **Migrations imutáveis:** nunca edite uma migration já aplicada; crie nova pra fix-forward.
5. **`COMANDO`/abrir portão é mock** — não há request HTTP real pro DNS do equipamento ainda (`gates.dns` existe mas não é chamado).
6. **`PUBLIC_BACKEND_URL`** precisa ser uma URL https alcançável pela Twilio (domínio em prod, ngrok em dev) — sem ela os webhooks e o WS não funcionam.
7. **`__tests__/` está vazio** — scaffolding (unit/, integration/) e scripts existem, mas não há testes escritos.

## Deploy

- Docker Swarm. Stack `portaria-api`, imagem `portaria-api:latest`, rede externa `6LabNet`, Traefik em `portaria-api.6lab.com.br`.
- **Secrets em prod:** `portaria_db_password`, `portaria_db_root_password`, `portaria_jwt_secret`, `portaria_encryption_key`, `portaria_metrics_token`, `portaria_twilio_auth_token`, `portaria_openai_api_key`, `portaria_elevenlabs_api_key`. O `docker-entrypoint.sh` lê os secrets de `/run/secrets/*` e exporta como env.
- CI (`.github/workflows/deploy.yml`): push em `main` → SSH (`appleboy/ssh-action`) → `cd /opt/portaria-api && ./deploy.sh`. **O `deploy.sh` mora no servidor**, não no repo.
- `make ssh-prod` → `root@5.78.191.14`.
- Adminer disponível sob demanda (replicas: 0 no stack; escalar manualmente).

## Backlog

Tarefas futuras vivem em `docs/backlog.md`, no formato de **cards `BL-NNN`**. Quando o usuário pedir pra "adicionar ao backlog", "jogar no backlog" ou disser que algo "fica pra depois", **registre lá** — não implemente, só documente.

**Como criar uma task:**
1. ID sequencial `BL-NNN` (maior existente + 1, sempre 3 dígitos).
2. Nova seção `## BL-NNN — <título curto e imperativo>` no fim do arquivo.
3. Campos (bullets, nesta ordem): `**Status:**` (começa em `📋 Backlog`), `**Prioridade:**` (🔴 Alta / 🟡 Média / 🟢 Baixa; default 🟡), `**Criada em:**` (`YYYY-MM-DD`), `**Depende de:**` (só se houver), `**Contexto:**` (1 parágrafo com o porquê + o suficiente pra retomar; inclua decisões/trade-offs).
4. Append-only: não reordene nem renumere. Pra mudar estado, edite só `**Status:**`.

Status possíveis: 📋 Backlog · 🚧 Em andamento · ⏸️ Bloqueada · ✅ Concluída · ❌ Cancelada.

## Rules of engagement

- **NUNCA rodar `git commit`, `git add`/stage ou `git push` — nem após implementar, nem para "deixar pronto".** Git é responsabilidade exclusiva do usuário. Deixe as mudanças no working tree (sem stage) e apenas avise o que foi alterado.
- **Não rodar comandos destrutivos em prod** (DROP, DELETE em massa, `git push --force`, `git reset --hard`) sem confirmação. Sugerir backup antes (`make backup`).
- **Não editar migration já aplicada** — crie nova migration de fix-forward.
- **Após mexer no backend:** `node --check` nos arquivos tocados. `node -e "require('./src/server')"` sobe o servidor (WS/Socket.IO/DB), então prefira `node --check`; pra validar o grafo de `require` sem subir o listen, `node -e "require('./src/models/associations'); require('./src/app')"`.
- **Não introduzir abstração/refactor além do escopo pedido.** Se vir lixo adjacente, mencione, não conserte automaticamente.
- **Antes de feature grande:** confirmar plano + perguntas em texto antes de codar. Respostas técnicas, concisas, em português.
