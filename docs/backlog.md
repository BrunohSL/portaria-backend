# Backlog — Portaria

Lista viva de tarefas futuras (backend `portaria` + frontend `portaria-front`). Formato e regras de manutenção em `CLAUDE.md` → seção **Backlog**.

**Status possíveis:** 📋 Backlog · 🚧 Em andamento · ⏸️ Bloqueada · ✅ Concluída · ❌ Cancelada
**Prioridade:** 🔴 Alta · 🟡 Média · 🟢 Baixa

Docs de apoio (referência, não cards): `gap-analysis-gpt-vs-implementado.md` (produto idealizado × implementado) e `backlog-portal-antigo.md` (features do portal-main ainda não migradas). A Fase 1 (setup funcional: auth, CRUDs, editor de fluxos, chamadas, usuários, auditoria) já está implementada — ver histórico no git.

---

## BL-001 — Implementar chamadas reais às APIs externas (substituir stubs)
- **Status:** ⏸️ Bloqueada
- **Prioridade:** 🔴 Alta
- **Criada em:** 2026-06-08
- **Contexto:** Hoje o motor de chamada (ConversationRelay WebSocket) já roda com OpenAI real (intent/extração/yes-no) e Twilio outbound funcional. Faltam: os métodos REST do `TwilioService.js` (validateWebhook, transferCall, endCall, transcribeAudio) que ainda são stub/TODO, e o `ElevenLabsService.js` que é mock (o TTS hoje sai pela plataforma Twilio via ConversationRelay, então o service não está no hot path — decidir se ele tem uso real ou some). Bloqueada por depender de validar protocolos contra o N8N atual antes de fechar as integrações.

## BL-002 — Abrir portão de verdade (COMANDO → HTTP pro DNS do equipamento)
- **Status:** ⏸️ Bloqueada
- **Prioridade:** 🔴 Alta
- **Criada em:** 2026-06-08
- **Contexto:** O node `COMANDO` (abrir portão) é mock: só loga `[MOCK]`, não comunica com o equipamento. A tabela `gates` já tem `dns`, `brand`, `extension`, `position`, mas nenhum request HTTP é feito. Precisa de um `GateService` que monte e dispare o request pro DNS do interfone. Bloqueada porque o protocolo do equipamento ainda não está definido — depende de acesso ao N8N original / docs do fabricante. Ver `gap-analysis-gpt-vs-implementado.md` §5.

## BL-003 — Retry/timeout configurável por node
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** O ConversationRelay já trata silêncio globalmente (10s, máx. 2 retentativas, depois encerra). Falta tornar isso configurável por node (`config.retry`, `config.timeout_seconds`) e expor no `ConfigPanel` do editor. Ver `gap-analysis` §4.

## BL-004 — Fallback pra ramal de emergência quando o fluxo falha
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** `condominiums.fallback_extension` existe mas não há lógica que transfira a chamada pra esse ramal quando o fluxo trava/erra (esgotou retries, exceção no motor). Definir os gatilhos de fallback e implementar a transferência.

## BL-005 — Emitir eventos de chamada via Socket.IO (backend)
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** A infra de Socket.IO já existe no `server.js` (auth por JWT, rooms `super_admin` e `condominium:{id}`, `io` em `app.locals.io`), mas o motor de chamada não emite nada. Emitir `call:started`, `call:step_changed`, `call:log`, `call:ended` a partir do `conversationRelay.js`. Pré-requisito de BL-006. Ver `gap-analysis` §6.

## BL-006 — Dashboard de chamadas em tempo real (frontend)
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Depende de:** BL-005
- **Contexto:** Adicionar cliente Socket.IO no front, hook `useSocket`, cards de chamadas ativas atualizando ao vivo no dashboard e indicador "ao vivo" + timeline em tempo real no detalhe da chamada. Hoje a UI é só TanStack Query sem polling.

## BL-007 — Lógica de eclusa / multi-portão
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Depende de:** BL-002
- **Contexto:** Condomínio com eclusa: visitante chega no portão 1, entra, e o atendimento continua no equipamento do portão 2 (N portões até o destino). Pode ser modelado como sequência OPEN_GATE → TRANSFER pra ramal do próximo equipamento → continuar fluxo, ou um node `TRANSFER_EQUIPMENT`. Ver `gap-analysis` §7.

## BL-008 — Dashboard com KPIs reais
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** O dashboard hoje mostra placeholders ("-"). Popular com métricas reais: total de condomínios, chamadas hoje, total de moradores, custo estimado do período, etc.

## BL-009 — Polir UX do editor de fluxos (drag-and-drop)
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** O editor visual (React Flow) já existe e funciona com save diff-based. Melhorias de UX: arrastar blocos da palette pro canvas, auto-layout melhor, preview do fluxo montado, undo/redo. Era o "builder visual" do `gap-analysis` §3 — a base já está pronta, isso é refinamento.

## BL-010 — Voice ID do ElevenLabs por condomínio
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** Hoje o voice ID é global (`ELEVENLABS_VOICE_ID`). Permitir configurar por condomínio (campo no `condominiums` + uso no TwiML do ConversationRelay) pra dar identidade de voz própria a cada cliente.

## BL-011 — Paginação nas listagens
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** Tabelas (condomínios, moradores, chamadas, auditoria) carregam tudo de uma vez. Implementar paginação server-side (o `listSessions` já aceita `limit/offset`; padronizar nos demais endpoints e na UI).

## BL-012 — Filtros avançados nas listagens
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** Filtros combinados (por status, período, condomínio, tipo) nas telas de chamadas e auditoria.

## BL-013 — Edição inline de moradores e unidades
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** Hoje editar morador/unidade exige dialog dedicado. Permitir edição inline na tabela pra agilizar manutenção de cadastro.

## BL-014 — Sistema financeiro / billing via Stripe
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** Migrar do portal-main todo o sistema de cobrança: tabelas `pagamentos`, `clientes_pagamentos`, `comissoes`, `configuracao_comissoes`, `credenciais_stripe`. Regras: cobrança recorrente baseada na `data_ativacao`, multa por atraso (10% 1-7 dias, 20% >7 dias), comissões pra revendedores (1º mês proporcional), cron no 5º dia útil, webhook Stripe. Front: páginas financeira/relatórios/pagamentos. Detalhes completos em `backlog-portal-antigo.md` §2.

## BL-015 — Hierarquia de roles (distribuidor/revendedor/gestor/morador)
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** O portal antigo tem 6 roles em hierarquia; o back novo só tem ADM/CLIENT_ADM/SUPPORT. Adicionar `DISTRIBUIDOR`, `REVENDEDOR`, `GESTOR`, `MORADOR` no ENUM + tabelas `distribuidores`, `revendedores`, `gestores` + middleware de hierarquia (quem vê/edita quem) + telas. Atrelado a BL-014 (comissões). Ver `backlog-portal-antigo.md` §1.

## BL-016 — 2FA (TOTP via Google Authenticator)
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** Tabelas `two_factor` (secret, backup_codes, habilitado) e `two_factor_log`. Endpoints setup/verify/enable/disable/validate. QR code + backup codes. Ver `backlog-portal-antigo.md` §4.

## BL-017 — Termos de uso (versionamento + aceite obrigatório)
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** Tabelas `termos_uso` e `usuario_termos_aceites`. Aceite obrigatório no primeiro acesso, painel de gestão de termos. Ver `backlog-portal-antigo.md` §5.

## BL-018 — Onboarding de primeiro acesso
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** Fluxo: verificação de email → troca de senha (já existe `first_access`) → setup 2FA → aceite de termos → tour. Campos `email_verificado`, `codigo_verificacao_email`, tabela `onboarding`. Ver `backlog-portal-antigo.md` §6.

## BL-019 — Redefinição de senha (esqueci senha)
- **Status:** 📋 Backlog
- **Prioridade:** 🔴 Alta
- **Criada em:** 2026-06-08
- **Depende de:** BL-021
- **Contexto:** Fluxo esqueci-senha → email com link/código → nova senha. Depende do email system (BL-021) pra enviar o link. Listado como prioridade Alta no `backlog-portal-antigo.md` §11.

## BL-020 — Bloqueio por tentativas + session timeout
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** Bloquear login após 5 tentativas (lock 15min) e expirar sessão por inatividade (30min). O JWT hoje não tem refresh; avaliar estratégia junto. Ver `backlog-portal-antigo.md` §11.

## BL-021 — Email system (SMTP + templates)
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** SMTP configurável + templates editáveis com variáveis + logs de envio. Tabelas `credenciais_smtp`, `email_templates`, `email_logs`. Pré-requisito de BL-019 e de emails transacionais (boas-vindas, cobrança). Ver `backlog-portal-antigo.md` §7.

## BL-022 — Importação em massa de unidades e moradores (planilhas)
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** Upload Excel/CSV pra criar unidades/moradores em massa, com download de template, validação por linha e rollback transacional. Endpoints `/units/import`, `/residents/import`, `/template`. Ver `backlog-portal-antigo.md` §8.

## BL-023 — Identidade visual por condomínio
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** Logo + cores primária/secundária por condomínio, aplicadas dinamicamente no front. Tabela `identidade_visual`. Ver `backlog-portal-antigo.md` §9.

## BL-024 — Activity logs com diff (dados anteriores × novos)
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** O `audit_logs` já existe básico. Adicionar `dados_anteriores`/`dados_novos` (JSON) pra registrar o diff de cada alteração, filtragem por hierarquia de role e filtros combinados + paginação. Ver `backlog-portal-antigo.md` §10.

## BL-025 — Tipo de condomínio + campos dinâmicos
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** `tipo_cliente` (horizontal/vertical/híbrido/comercial/singular) com campos de unidade variando por tipo. Complementa a nomenclatura customizável (`level1_label`/`level2_label`) que já existe.

## BL-026 — Discord + Sentry (observabilidade externa)
- **Status:** 📋 Backlog
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** Webhook Discord pra alertas (ex: falha de integração, como o guardia faz) e Sentry pra error monitoring em produção. Ver `backlog-portal-antigo.md` §11.

## BL-027 — Campos faltantes em condomínio e morador (portal antigo)
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** Migrar campos que existem no portal-main e faltam aqui. Condomínio: `razao_social`, `cpf`, `email`, `tipo_cliente`, `data_ativacao`, `status` (expandido), `status_pagamento`, `valor_licenca`, `total_unidades`/`total_moradores` (counter cache), `stripe_customer_id`, `revendedor_id`. Morador: `apelido`, `codigo_pais`. Vários se cruzam com BL-014/BL-015. Ver `backlog-portal-antigo.md` §12-13.

## BL-028 — Escrever suíte de testes
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-08
- **Contexto:** `__tests__/` está vazio (só o scaffolding unit/ e integration/ + scripts npm). Priorizar testes do motor de fluxo (`conversationRelay.js`), services e middlewares de auth/authorization. O simulador (`docs/simulator.md`) pode servir de base pra testes de fluxo end-to-end.

## BL-029 — Remover código morto do Bull/callProcessor
- **Status:** ✅ Concluída
- **Prioridade:** 🟢 Baixa
- **Criada em:** 2026-06-08
- **Contexto:** O caminho da fila Bull (`callQueue` + `callWorker.js` + `callProcessor.js`) e o webhook `/api/calls/webhook/incoming` (retornava 410) eram legado — o motor real é o ConversationRelay (WebSocket). Ninguém chamava `callQueue.add()`. **Resolvido (2026-06-09):** removidos `config/queue.js`, `queues/` (callProcessor, callQueue), `workers/callWorker.js`, `utils/idempotency.js` e o model `ProcessedEvent` (todos mortos); tiradas as deps `bull`/`@bull-board/*` do `package.json`, o Bull Board e a métrica `queueDepth`, o webhook legado + `incomingWebhook`, e o rate limiter do webhook. Como o Redis ficou órfão (nenhum outro consumidor), também foi removido da infra (docker-compose, docker-stack, Makefile, `.env`/`.env.example`, health check). A tabela `processed_events` continua no banco (migration imutável), mas sem código ligado. Multi-servidor futuro vai precisar reintroduzir Redis pub/sub — ver gotcha de estado em memória no `CLAUDE.md`.

## BL-030 — Redesenhar fluxo de fallback do COLETAR_INTENCAO com retentativa
- **Status:** 📋 Backlog
- **Prioridade:** 🟡 Média
- **Criada em:** 2026-06-11
- **Contexto:** Hoje no fluxo ROOT, o handle `fallback` do node COLETAR_INTENCAO está ligado direto a um node END com "Não tivemos retorno, ligue novamente quando precisar" (via src/services/seedFlows.js, node end_fallback e edge intent_main → fallback). Qualquer fala não classificada derruba a ligação imediatamente, mesmo quando o visitante respondeu. Isso foi descoberto ao debugar uma ligação real em que o visitante disse "Visita" e a chamada caiu (a causa imediata — parse estrito + ausência de rede keyword — já foi corrigida separadamente; este card é a melhoria de UX). Desejado: em vez de ir direto ao END, o fallback deve re-perguntar pelo menos 1x ("não entendi — você está aqui pra visita, entrega ou serviço?") antes de encerrar. Também separar a mensagem de "não entendi" (intenção não reconhecida) da mensagem de "silêncio real" (visitante não falou / timeout), que hoje compartilham o mesmo END. Provavelmente exige: contador de retentativas no estado da sessão e/ou novo tipo de aresta/loop no node COLETAR_INTENCAO, ajuste em seedFlows, e avaliar interação com o timer de silêncio existente (session.silenceRetries).
