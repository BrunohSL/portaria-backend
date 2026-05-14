# Backlog — Portaria

Documento unificado de tudo que foi implementado e o que falta.

---

## Fase 1 — Setup funcional [CONCLUIDA]

- [x] Backend: Auth (JWT + roles ADM/CLIENT_ADM/SUPPORT)
- [x] Backend: CRUD Condominios (com gates_config e extensions_config JSON)
- [x] Backend: CRUD Unidades
- [x] Backend: CRUD Moradores
- [x] Backend: CRUD Fluxos + Steps
- [x] Backend: Call Sessions + Logs
- [x] Backend: Audit Logs
- [x] Backend: CRUD Usuarios + GET /api/auth/me
- [x] Backend: Bull Queue (Redis) + Idempotencia
- [x] Backend: Prometheus Metrics
- [x] Backend: Docker + CI/CD + Makefile
- [x] Frontend: Login
- [x] Frontend: Dashboard (basica)
- [x] Frontend: Lista de condominios + detalhe com tabs (unidades, moradores, fluxos)
- [x] Frontend: Pagina de configuracoes do condominio (portoes, ramais, fallback)
- [x] Frontend: Pagina de edicao do condominio
- [x] Frontend: Editor de steps do fluxo (lista com config form por tipo)
- [x] Frontend: Chamadas (lista + detalhe com timeline de logs)
- [x] Frontend: Usuarios (CRUD com senha temporaria)
- [x] Frontend: Auditoria
- [x] Frontend: Sidebar com navegacao por role

---

## Fase 2 — Core de ligacao [PENDENTE — aguardando acesso ao N8N]

Depende de acesso as rotas e fluxos do N8N atual para entender protocolos de comunicacao.

- [ ] Implementar integracoes reais (Twilio, OpenAI GPT, ElevenLabs) — substituir mocks
- [ ] Retry/timeout por step no callProcessor (visitante nao responde → repete 2x → encerra)
- [ ] Comunicacao real com equipamento no OPEN_GATE (HTTP request pro DNS do interfone)
- [ ] Fallback para ramal de emergencia quando fluxo falha
- [ ] Socket.IO emitindo eventos de chamada (call:started, call:step_changed, call:ended)
- [ ] Frontend recebendo eventos de chamada em tempo real
- [ ] Logica de eclusa/multi-portao (abrir porta 1 → transferir atendimento pra porta 2)

---

## Fase 3 — Polish e UX

- [ ] Dashboard com chamadas ativas ao vivo (cards atualizando via socket)
- [ ] Dashboard com KPIs reais (total condominios, chamadas hoje, moradores)
- [ ] Builder visual de fluxos (drag-and-drop dos steps)
- [ ] Voice ID do ElevenLabs configuravel por condominio
- [ ] Paginacao nas tabelas (condominios, moradores, chamadas, audit)
- [ ] Filtros avancados nas listagens
- [ ] Edicao inline de moradores e unidades

---

## Fase 4 — Financeiro

Migrado do portal antigo (portal-main). Sistema completo de billing via Stripe.

- [ ] Tabela `pagamentos` (stripe_charge_id, valor, status, metodo_pagamento)
- [ ] Tabela `clientes_pagamentos` (cobranças mensais por condominio)
- [ ] Tabela `comissoes` (comissoes para revendedores)
- [ ] Tabela `configuracao_comissoes` (percentuais por revendedor)
- [ ] Tabela `credenciais_stripe` (chaves Stripe)
- [ ] Campo `valor_licenca` e `data_ativacao` no condominio
- [ ] Cobranca recorrente baseada na data_ativacao
- [ ] Multa por atraso (10% 1-7 dias, 20% >7 dias)
- [ ] Comissoes automaticas para revendedores
- [ ] Cron de processamento mensal (5o dia util)
- [ ] Webhook Stripe para confirmacao de pagamento
- [ ] Frontend: pagina financeira, relatorios, pagamentos

---

## Fase 5 — Hierarquia de roles

Roles adicionais do portal antigo que nao existem no backend.

- [ ] Role DISTRIBUIDOR (gerencia revendedores)
- [ ] Role REVENDEDOR (vende licencas para condominios)
- [ ] Role GESTOR (gerente atribuido a condominios especificos)
- [ ] Role MORADOR (acesso limitado)
- [ ] Tabela `distribuidores`
- [ ] Tabela `revendedores`
- [ ] Tabela `gestores` (usuario_id, clientes[], ativo)
- [ ] Middleware de hierarquia (quem pode ver/editar quem)
- [ ] Frontend: telas de gestao por role

---

## Fase 6 — Seguranca

- [ ] 2FA (TOTP via Google Authenticator)
- [ ] Tabela `two_factor` (secret, backup_codes, habilitado)
- [ ] Termos de uso (versionamento, aceite obrigatorio)
- [ ] Tabela `termos_uso` + `usuario_termos_aceites`
- [ ] Onboarding completo (verificacao email, troca senha, tour)
- [ ] Bloqueio por tentativas de login (5 tentativas → lock 15min)
- [ ] Session timeout (30min)
- [ ] Redefinicao de senha (esqueci senha → email com link)

---

## Fase 7 — Conveniencia

- [ ] Email system (SMTP configuravel + templates editaveis)
- [ ] Tabelas `credenciais_smtp` + `email_templates` + `email_logs`
- [ ] Import de planilhas (Excel/CSV para unidades e moradores em massa)
- [ ] Download de template de planilha
- [ ] Identidade visual (logo e cores customizaveis por condominio)
- [ ] Notificacoes in-app
- [ ] Activity logs com diff (dados_anteriores vs dados_novos)
- [ ] Tipo de condominio (horizontal, vertical, hibrido, comercial, singular)
- [ ] Campos dinamicos por tipo de condominio
- [ ] Discord integration (webhook)
- [ ] Sentry (error monitoring em producao)

---

## Campos pendentes de adicionar

### Condominio (campos do portal antigo nao migrados)
| Campo | Tipo | Descricao |
|-------|------|-----------|
| razao_social | VARCHAR | Razao social |
| cpf | VARCHAR | CPF do responsavel |
| email | VARCHAR | Email do condominio |
| tipo_cliente | ENUM | horizontal/vertical/hibrido/comercial/singular |
| data_ativacao | DATE | Data de ativacao (define cobranca) |
| status | ENUM | aguardando_ativacao/ativo/suspenso/cancelado/teste/isento |
| status_pagamento | ENUM | pendente/efetuado/atrasado/teste/isento |
| valor_licenca | DECIMAL | Valor da mensalidade |
| total_unidades | INT | Counter cache |
| total_moradores | INT | Counter cache |
| stripe_customer_id | VARCHAR | ID no Stripe |
| revendedor_id | FK | Revendedor que vendeu |

### Morador (campos do portal antigo nao migrados)
| Campo | Tipo | Descricao |
|-------|------|-----------|
| apelido | VARCHAR | Nome curto |
| codigo_pais | VARCHAR | Codigo do pais (+55) |
