# Simulador de chamadas (sem ligação real)

Dois endpoints HTTP pra testar fluxos de atendimento via JSON, sem precisar discar pelo Twilio. Ambos rodam a LLM real (gpt-4o-mini por padrão), STT/TTS são bypassed (você passa texto direto).

Os endpoints exigem autenticação como `ADM`. Use o JWT obtido via `POST /api/auth/login`.

---

## Pré-requisitos

1. Backend rodando (`make dev`)
2. Banco populado com pelo menos 1 condomínio com fluxo ROOT configurado (use `POST /api/dev/seed` ou crie via UI)
3. Pra fluxos `VISITA_MORADOR` etc, crie o fluxo correspondente e ligue do ROOT via `TRANSFERIR_FLUXO`
4. `.env` configurado:
   - `OPENAI_API_KEY` — pra LLM funcionar (sem ela cai no keyword matcher)
   - `OPENAI_MODEL` — opcional, default `gpt-4o-mini`

---

## 1) `POST /api/dev/simulate-call`

Simula **uma chamada inteira** do começo ao fim. Cria `CallSession` no banco e popula `call_logs` com todos os eventos — útil pra inspecionar depois com SQL.

### Request body

```json
{
  "condominiumId": 1,
  "toNumber": "+551926603062",
  "fromNumber": "sim-caller",
  "responses": [
    "vim fazer uma visita",
    "joão silva, bloco a, apto 101",
    "sim"
  ]
}
```

| Campo | Tipo | Default | Obrigatório? |
|---|---|---|---|
| `condominiumId` | number | resolve via `toNumber` ou cai no fallback `1` | não |
| `toNumber` | string E.164 | `+551926603062` | não |
| `fromNumber` | string | `sim-caller` | não |
| `responses` | string[] | `[]` | sim (mesmo se vazio) |
| `mockMoradorDecision` | string\|null | `null` | não — default `null` faz **outbound real** pra Twilio (seu telefone toca). Passe `autorizado` \| `naoAutorizado` \| `semResposta` pra pular o outbound e devolver a decisão direto (útil pra validar lógica do flow sem usar STT/LLM/Twilio). |

### Response

```json
{
  "success": true,
  "data": {
    "transcript": [
      { "from": "bot",  "text": "Olá! Em que posso ajudar?" },
      { "from": "user", "text": "vim fazer uma visita" },
      { "from": "bot",  "text": "Pra qual unidade você vai?" },
      { "from": "user", "text": "joão silva, bloco a, apto 101" },
      { "from": "bot",  "text": "Você vai visitar o(a) João Aparecido Silva?" },
      { "from": "user", "text": "sim" },
      { "from": "bot",  "text": "Vou avisar o morador, aguarde..." },
      { "from": "end" }
    ],
    "callSessionId": 42,
    "ttsChars": 187,
    "usageLog": [
      { "kind": "classifyIntent", "usage": { "prompt_tokens": 184, "completion_tokens": 2, "total_tokens": 186 } },
      { "kind": "extractFields:morador", "usage": { "prompt_tokens": 240, "completion_tokens": 30, "total_tokens": 270 } },
      { "kind": "classifyYesNo", "usage": { "prompt_tokens": 130, "completion_tokens": 2, "total_tokens": 132 } }
    ],
    "finalState": "completed",
    "awaitingInput": false,
    "currentNodeId": null,
    "collectedData": {
      "intent": { "o_que_deseja": "visita" },
      "morador": { "id": 5, "name": "João Aparecido Silva", "unitId": 12 }
    }
  }
}
```

### Estados finais possíveis

| `finalState` | O que significa |
|---|---|
| `completed` | Bot mandou `end` — fluxo terminou normal (END node ou fluxo terminou em leaf) |
| `awaiting_input` | Acabou a lista `responses` mas o bot ainda esperava respostas — você "desligou no meio" |
| `incomplete` | Bot parou de responder mas não mandou `end` (raro, indica bug) |

### Inspeção pós-simulação

```sql
-- Custo + duração da última simulação
SELECT id, status, duration_seconds, tts_chars,
       estimated_twilio_cost_usd, estimated_tts_cost_usd
FROM call_sessions WHERE id = <callSessionId>;

-- Eventos turn-a-turn
SELECT event_type, node_id, payload, created_at
FROM call_logs WHERE call_session_id = <callSessionId> ORDER BY id;
```

### Exemplos de teste

**Visita autorizada (happy path):**
```bash
curl -X POST http://localhost:3000/api/dev/simulate-call \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "condominiumId": 1,
    "responses": [
      "vou fazer uma visita",
      "joão silva, bloco A, apto 101",
      "sim"
    ]
  }'
```

**Visita com bloco em sintaxe compacta:**
```bash
curl -X POST http://localhost:3000/api/dev/simulate-call \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "condominiumId": 1,
    "responses": [
      "tô aqui pra visitar alguém",
      "A101 João",
      "sim"
    ]
  }'
```

**Coleta multi-turno (informação fragmentada):**
```bash
curl -X POST http://localhost:3000/api/dev/simulate-call \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "condominiumId": 1,
    "responses": [
      "vou visitar",
      "joão",
      "bloco A",
      "apto 101",
      "sim"
    ]
  }'
```

**Intent não óbvia:**
```bash
curl -X POST http://localhost:3000/api/dev/simulate-call \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "condominiumId": 1,
    "responses": [
      "vim na casa do meu amigo",
      "B72 carlos"
    ]
  }'
```

**Morador não encontrado:**
```bash
curl -X POST http://localhost:3000/api/dev/simulate-call \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "condominiumId": 1,
    "responses": [
      "visita",
      "fulano de tal, bloco Z, apto 999"
    ]
  }'
```

---

## 2) `POST /api/dev/test-node`

Testa **1 único node isolado** com config customizada e (opcionalmente) input do user. **Stateless**: não cria `CallSession` nem logs no banco.

Útil pra:
- Tunar prompts da LLM rodando 20 inputs diferentes no mesmo node
- Validar extração de campos com sintaxes variadas
- Reproduzir bug específico de um node sem subir um fluxo inteiro
- Conferir que confirmação verbal (yes/no) funciona com gírias

### Request body

```json
{
  "type": "COLETAR_DADOS_MORADOR",
  "condominiumId": 1,
  "config": {
    "requestedFields": ["nome", "bloco", "apto"],
    "promptText": "Pra qual unidade você vai?"
  },
  "alreadyCollected": { "nome": "joão", "bloco": "A" },
  "userInput": "apto 201"
}
```

| Campo | Tipo | Obrigatório? | Comportamento |
|---|---|---|---|
| `type` | string | sim | tipo do node (TIMER, COMUNICACAO, COLETAR_INTENCAO, COLETAR_DADOS_MORADOR, COLETAR_DADOS_VISITA, CONTATAR, COMANDO, TRANSFERIR_FLUXO, END) |
| `config` | object | sim | config do node — mesma shape que o editor salva |
| `condominiumId` | number | não | usado pra resolver dados (gates, contatos). Default 1. |
| `alreadyCollected` | object | não | só pra COLETAR_DADOS_*. Estado pré-existente da coleta. |
| `userInput` | string | não | se presente: simula resposta do user (chama `processInput`). Se ausente: executa o node "do zero" (chama `executeNode`) |

### Response

```json
{
  "success": true,
  "data": {
    "botMessages": [
      "Você vai visitar o(a) João Aparecido Silva?"
    ],
    "ended": false,
    "result": {
      "stayInNode": true
    },
    "sessionState": {
      "nodeState": {
        "nodeId": "test-node-1735000000",
        "fields": { "nome": "joão", "bloco": "A", "apto": "201" },
        "awaitingConfirmation": true,
        "matchedContact": { "id": 5, "name": "João Aparecido Silva", "unitId": 12 }
      },
      "collectedData": {},
      "ttsChars": 47,
      "usageLog": [
        { "kind": "extractFields:morador", "usage": { "prompt_tokens": 240, "completion_tokens": 30 } }
      ],
      "awaitingInput": false
    }
  }
}
```

### Interpretação do `result`

| Campo | Significa |
|---|---|
| `stayInNode: true` | Node ainda precisa de mais turnos (aguarda input). Ex: coleta incompleta, ou aguardando confirmação. |
| `handle: "..."` | Node terminou e quer ramificar pelo handle X (ex: `dadosConfirmados`, `visita`, `default`) |
| `awaitInput: true` | Node executou e está esperando input (vindo do `executeNode`, não `processInput`) |
| `endCall: true` | Node terminou a chamada (END, ou falha) |
| `transferred: true` | Node fez transferência de fluxo (TRANSFERIR_FLUXO) |
| `outputHandle: "..."` | (de `executeNode`) qual saída usar pra avançar |

### Exemplos por tipo de node

#### `COLETAR_INTENCAO`
```bash
curl -X POST http://localhost:3000/api/dev/test-node \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "COLETAR_INTENCAO",
    "config": { "catalogKey": "o_que_deseja", "promptText": "O que deseja?" },
    "userInput": "vou na casa do meu amigo"
  }'
```
Esperado: `result.handle = "visita"`, `usageLog` com `classifyIntent`.

#### `COLETAR_DADOS_MORADOR` — extração inicial
```bash
curl -X POST http://localhost:3000/api/dev/test-node \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "COLETAR_DADOS_MORADOR",
    "condominiumId": 1,
    "config": { "requestedFields": ["nome", "bloco", "apto"] },
    "userInput": "joão, A201"
  }'
```
Esperado: extrai `nome`, `bloco`, `apto`. Se acha morador, vira `awaitingConfirmation`. Se não, `result.handle = "dadosNaoConfirmados"`.

#### `COLETAR_DADOS_MORADOR` — turno de confirmação
```bash
curl -X POST http://localhost:3000/api/dev/test-node \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "COLETAR_DADOS_MORADOR",
    "condominiumId": 1,
    "config": { "requestedFields": ["nome", "bloco", "apto"] },
    "alreadyCollected": { "nome": "joão", "bloco": "A", "apto": "101" },
    "userInput": "sim"
  }'
```
Pra simular o turno DEPOIS da confirmação, é necessário rodar a chamada completa (use `simulate-call`) — o `test-node` não persiste o estado entre chamadas.

#### `COMUNICACAO` — execução simples
```bash
curl -X POST http://localhost:3000/api/dev/test-node \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "COMUNICACAO",
    "config": { "mode": "tts", "text": "Olá! Em que posso ajudar?" }
  }'
```
Esperado: `botMessages = ["Olá! Em que posso ajudar?"]`, `result.outputHandle = "default"`. Sem `userInput` porque COMUNICACAO não recebe input.

#### `END` — verifica que encerra
```bash
curl -X POST http://localhost:3000/api/dev/test-node \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "END",
    "config": { "behavior": "hangup", "message": "Tchau!" }
  }'
```
Esperado: `botMessages = ["Tchau!"]`, `ended = true`, `result.endCall = true`.

#### `TRANSFERIR_FLUXO` — verifica resolução
```bash
curl -X POST http://localhost:3000/api/dev/test-node \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TRANSFERIR_FLUXO",
    "condominiumId": 1,
    "config": { "targetFlowId": 2 }
  }'
```
Esperado: se fluxo 2 existe e tem entry node, `result.transferred = true`. Se não, mensagem "Encaminhamento não disponível..." e `endCall: true`.

---

## Boas práticas

- **Use `simulate-call` pra**: testar fluxo end-to-end depois de mexer em algum node, validar que TRANSFERIR_FLUXO + segundo fluxo funcionam, conferir que custos batem.
- **Use `test-node` pra**: tunar prompt da LLM, validar extração com vocabulário regional, debugar 1 node específico sem complicar com o resto.
- **Inspecione `usageLog`** pra estimar custo de LLM por chamada antes de soltar em produção. Multiplique tokens × tarifa do plano.
- **Cuidado com confirmação multi-turno** no `test-node`: o estado não persiste entre requests. Se o cenário precisa de 2+ turnos com estado, use `simulate-call`.
- **Se a LLM falhar** (rate limit, key inválida): `simulate-call` cai no keyword matcher pro intent (degradação graciosa); `test-node` retorna `extracted = {}` e `handle = "fallback"` ou similar.

## Limitações conhecidas

- Sem áudio (obviamente). Não testa qualidade de voz/STT — pra isso, ligação real.
- Sem latência real do TTS/STT — você não sente delays como sentiria numa chamada.
- Logs de telefonia (Twilio side) não são simulados.
- DTMF não é simulado.
- `CONTATAR` no simulador, por **default**, dispara outbound real pra Twilio (seu telefone toca de verdade). Pra testar só a lógica do flow sem queimar Twilio/STT/LLM, passe `mockMoradorDecision` no payload com `autorizado`, `naoAutorizado` ou `semResposta` — isso pula o outbound e devolve a decisão direto.
