# Gap Analysis — Conversa GPT vs Implementado

Cruzamento entre o que foi discutido na conversa com o GPT (requisitos originais do produto) e o que realmente existe hoje no backend (portaria) e frontend (portaria-front).

---

## RESUMO

| Area | Status |
|------|--------|
| Auth (JWT + roles ADM/CLIENT_ADM/SUPPORT) | Implementado |
| CRUD Condominios | Implementado |
| CRUD Unidades | Implementado |
| CRUD Moradores | Implementado |
| CRUD Fluxos + Steps | Implementado (basico) |
| Call Sessions + Logs | Implementado (basico) |
| Audit Logs | Implementado |
| Bull Queue (Redis) | Implementado |
| Integracoes Twilio/GPT/ElevenLabs | Mock (stubs) |
| Docker + CI/CD | Implementado |
| Prometheus Metrics | Implementado |
| Idempotencia (Redis + MySQL) | Implementado |
| **Tela de configuracao inicial** | **NAO EXISTE** |
| **Gestao de equipamentos/portoes** | **NAO EXISTE** |
| **Builder visual de fluxos** | **NAO EXISTE** |
| **Config de dados a coletar por fluxo** | **NAO EXISTE** |
| **Logica de retry/timeout por step** | **NAO EXISTE** |
| **Comunicacao com equipamentos (DNS)** | **NAO EXISTE** |
| **Dashboard de chamadas em tempo real** | **NAO EXISTE** |
| **Fluxo de eclusa (multi-portao)** | **NAO EXISTE** |

---

## 1. TELA DE CONFIGURACAO INICIAL DO CONDOMINIO

### O que o GPT descreveu:
O cliente precisa de um fluxo de setup antes de usar o sistema:
1. Configurar infraestrutura fisica (portoes, equipamentos, ramais, DNS)
2. Configurar dados que precisa coletar (CPF, bloco, apto, etc.)
3. Configurar ramal de fallback para caso de falha
4. So depois disso, montar os fluxos

### O que existe hoje:
- `gates_config` e `extensions_config` sao campos JSON no model Condominium
- Nao existe UI para configurar esses campos
- Nao existe tela de "setup inicial" ou wizard
- O frontend vai direto pra lista de condominios sem nenhum setup

### O que falta:

**Backend:**
- Endpoints dedicados para gerenciar portoes individuais:
  - `GET /api/condominiums/:id/gates` — listar portoes
  - `POST /api/condominiums/:id/gates` — adicionar portao (dns, ramal, label, marca, ordem)
  - `PUT /api/condominiums/:id/gates/:gateKey` — editar portao
  - `DELETE /api/condominiums/:id/gates/:gateKey` — remover portao
- Mesma coisa para ramais/extensoes
- Validacao de estrutura dos portoes (dns obrigatorio, label obrigatorio)

**Frontend:**
- Pagina `/condominios/:id/configuracoes` com abas:
  - **Infraestrutura**: lista de portoes com formulario para adicionar/editar (dns, ramal, label, marca, posicao)
  - **Ramais**: lista de ramais internos (portaria, sindico, etc.)
  - **Ramal de fallback**: campo para configurar ramal de emergencia
  - **Dados do condominio**: level1_label, level2_label, twilio_phone_number

---

## 2. GESTAO DE EQUIPAMENTOS / PORTOES

### O que o GPT descreveu:
- Cada portao tem: DNS, ramal, marca do equipamento, posicao (porta 1, porta 2)
- Eclusa: porta 1 abre, visitante entra, porta 2 atende
- Precisamos do DNS para comunicar com o equipamento via API

### O que existe hoje:
- `gates_config: JSON` — campo generico, sem validacao
- Exemplo no requirements.md: `{"gate1": {"dns": "192.168.1.10", "label": "Portao Principal"}}`
- Nenhum endpoint para gerenciar portoes individualmente
- Nenhuma logica de comunicacao HTTP com o DNS do equipamento

### O que falta:

**Backend:**
- Considerar extrair portoes para tabela propria `condominium_gates`:
  - id, condominium_id, key (gate1, gate2), label, dns, ramal, brand, position (1, 2, 3)
- Ou manter como JSON mas com service dedicado para validacao e CRUD

**Modelo sugerido (se tabela):**
```
condominium_gates
- id (INT PK)
- condominium_id (FK)
- key (VARCHAR) — ex: "gate1"
- label (VARCHAR) — ex: "Portao Principal"
- dns (VARCHAR) — ex: "192.168.1.10"
- extension (VARCHAR) — ramal do equipamento
- brand (VARCHAR) — marca (Intelbras, etc.)
- position (INT) — ordem (1 = primeiro portao, 2 = eclusa)
- created_at, updated_at
```

---

## 3. BUILDER VISUAL DE FLUXOS (DRAG-AND-DROP)

### O que o GPT descreveu:
- Tela com lista de fluxos (visita, ifood, prestador, entrega, etc.)
- Dentro de cada fluxo: "baloezinhos" que o cliente arrasta para montar o fluxo
- Os blocos puxam da configuracao ja feita (ex: arrastar "Portao 1" ja sabe o DNS e ramal)
- Blocos de coleta de dados: checklist de quais dados coletar naquele passo
- O usuario NAO vai configurar inicialmente (equipe interna faz junto ao cliente)

### O que existe hoje:
- FlowStep com tipo ENUM fixo e campo `config: JSON`
- Frontend: tabela simples com dialog para criar step (nome, tipo, e so)
- Nao existe interface visual de drag-and-drop
- Nao existe referencia entre step e portao configurado

### O que falta:

**Backend:**
- FlowStep precisa ter referencia ao portao: campo `gate_key` (nullable) que aponta pro portao do gates_config
- O campo `config` do step COLLECT_DATA precisa de estrutura definida:
  ```json
  {
    "fields": ["cpf", "level1", "level2", "name"],
    "retry": 2,
    "timeout_seconds": 30
  }
  ```
- O campo `config` do step OPEN_GATE precisa de:
  ```json
  {
    "gate_key": "gate1",
    "confirmation_message": "Portao aberto, pode entrar"
  }
  ```

**Frontend (futuro):**
- Interface de drag-and-drop com blocos visuais
- Cada tipo de step tem configuracao especifica inline
- Preview do fluxo montado
- Por enquanto: interface simplificada (lista ordenavel de steps com config form)

---

## 4. LOGICA DE RETRY/TIMEOUT POR STEP

### O que o GPT descreveu:
- Visitante nao responde → repetir pergunta (max 2 vezes)
- Apos 2 retentativas sem resposta → mensagem padrao de encerramento
- Cada step pode ter seu proprio limite de retentativa

### O que existe hoje:
- `callProcessor.js` executa steps sequencialmente sem retry
- FlowStep tem campo `config.retry` no requirements.md mas nao esta implementado
- Nenhuma logica de timeout por step

### O que falta:

**Backend (callProcessor.js):**
- Implementar loop de retry por step:
  ```
  para cada step:
    tentativa = 0
    enquanto tentativa < config.retry:
      executar step
      se resposta recebida: break
      tentativa++
      repetir pergunta
    se esgotou retries:
      transferir para fallback_extension OU encerrar chamada
  ```
- Timeout configuravel por step (default 30s)
- Mensagem padrao de encerramento por timeout

---

## 5. COMUNICACAO COM EQUIPAMENTOS (DNS)

### O que o GPT descreveu:
- Cada interfone/portao tem um DNS e ramal
- Via API consegue acessar e controlar o equipamento
- Abrir portao = fazer request HTTP pro DNS do equipamento

### O que existe hoje:
- Step OPEN_GATE no callProcessor.js: apenas um `logger.info('[MOCK]')`
- Nenhuma logica de request HTTP para o DNS

### O que falta:

**Backend:**
- Service `GateService` ou metodo em `callProcessor`:
  ```javascript
  async function openGate(condominium, gateKey) {
    const gate = condominium.gates_config[gateKey];
    if (!gate || !gate.dns) throw new Error('Portao nao configurado');
    // HTTP request para o equipamento
    await axios.post(`http://${gate.dns}/api/open`, { ... });
  }
  ```
- A implementacao real depende do protocolo do equipamento (ainda nao definido)
- Pelo menos a estrutura precisa existir para quando tiver acesso ao N8N original

---

## 6. DASHBOARD DE CHAMADAS EM TEMPO REAL

### O que o GPT descreveu:
- Ver ligacoes em andamento em tempo real na dashboard
- Ver conforme forem desligando ou finalizando atendimento
- Logs em tempo real durante a ligacao

### O que existe hoje:
- Pagina `/chamadas` com tabela estatica de call sessions
- Nenhum Socket.IO no projeto portaria (backend tem, mas nao emite eventos de chamada)
- Nenhuma atualizacao em tempo real

### O que falta:

**Backend:**
- Emitir eventos Socket.IO durante processamento de chamada:
  - `call:started` — nova chamada iniciou
  - `call:step_changed` — mudou de step
  - `call:log` — log em tempo real
  - `call:ended` — chamada encerrou
- Esses eventos ja estao definidos no requirements.md mas nao implementados

**Frontend:**
- Hook `useSocket` que escuta eventos de chamada
- Dashboard com cards de chamadas ativas (atualiza em real-time)
- Pagina de chamadas com indicador de "ao vivo"
- Timeline de logs durante chamada ativa

---

## 7. FLUXO DE ECLUSA (MULTI-PORTAO)

### O que o GPT descreveu:
- Condominio com eclusa: visitante chega no portao 1, abre-se a eclusa
- Atendimento continua no equipamento do portao 2
- Pode ter N portoes ate chegar ao destino

### O que existe hoje:
- Step OPEN_GATE existe mas sem conceito de "continuar atendimento em outro equipamento"
- Nao existe logica de transicao entre equipamentos

### O que falta:
- Step tipo `TRANSFER_EQUIPMENT` ou logica no OPEN_GATE para:
  1. Abrir portao atual
  2. Transferir atendimento para ramal do proximo equipamento
  3. Continuar fluxo no novo equipamento
- Isso pode ser implementado como sequencia de steps:
  - OPEN_GATE (gate1) → TRANSFER_CALL (para ramal do gate2) → continuar fluxo

---

## 8. PAGINAS DO FRONTEND QUE FALTAM

### Existem hoje:
- `/login` — login
- `/dashboard` — dashboard basica (cards placeholder)
- `/condominios` — lista de condominios
- `/condominios/:id` — detalhe com tabs (unidades, moradores, fluxos)
- `/chamadas` — lista de call sessions
- `/auditoria` — logs de auditoria

### Faltam:
- `/condominios/:id/configuracoes` — **setup inicial** (infraestrutura, portoes, ramais, fallback)
- `/condominios/:id/editar` — edicao dos dados do condominio
- `/condominios/:id/fluxos/:flowId` — **detalhe do fluxo** com editor de steps
- `/chamadas/:id` — **detalhe da chamada** com timeline de logs
- Dashboard com **chamadas ativas em tempo real**
- Tela de **usuarios** (CRUD de usuarios do sistema)

---

## 9. PONTOS MENORES QUE FALTAM

| Item | Descricao | Onde falta |
|------|-----------|------------|
| Marca do equipamento | Campo `brand` nos portoes | Backend model + migration |
| Posicao do portao | Ordem dos portoes (1, 2, 3) | Backend model + migration |
| Mensagem de fallback | Msg padrao quando transfere pra central | Config do condominio |
| Max ligacoes simultaneas | Hoje hardcoded 5 no env | Pode virar config por condominio no futuro |
| Timeout por step | Segundos sem resposta antes de repetir | FlowStep config |
| Retry por step | Quantas vezes repetir pergunta | FlowStep config |
| Mensagem de encerramento | Msg quando esgota retries | FlowStep config ou condominio config |
| TTS voice por condominio | Voice ID do ElevenLabs por condominio | Campo no Condominium model |

---

## PRIORIDADES SUGERIDAS

### Fase 1 — Setup funcional (precisa pra testar)
- [ ] Tela de configuracao de portoes/equipamentos
- [ ] Tela de edicao do condominio
- [ ] Editor de steps do fluxo (sem drag-and-drop, lista ordenavel)
- [ ] Tela de detalhe da chamada com logs
- [ ] CRUD de usuarios no frontend

### Fase 2 — Core de ligacao
- [ ] Implementar retry/timeout por step no callProcessor
- [ ] Implementar comunicacao com equipamento (OPEN_GATE real)
- [ ] Implementar fallback para ramal de emergencia
- [ ] Socket.IO para chamadas em tempo real

### Fase 3 — Polish
- [ ] Dashboard com chamadas ativas ao vivo
- [ ] Builder visual de fluxos (drag-and-drop)
- [ ] Voice ID do ElevenLabs por condominio
- [ ] Logica de eclusa (multi-portao)
