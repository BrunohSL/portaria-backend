# Backlog — Funcionalidades do portal-main pendentes de migração

Levantamento de tudo que existe no frontend antigo (portal-main) e que **ainda não foi implementado** no backend (portaria) nem no frontend novo (portaria-front).

---

## 1. Roles e hierarquia de usuários

O portal antigo tem 6 roles em hierarquia:

| Role | Descrição | Existe no back novo? |
|------|-----------|----------------------|
| `MASTER` | Administrador geral do sistema | Sim, mapeado como `ADM` |
| `DISTRIBUIDOR` | Gerencia revendedores | **Não** |
| `REVENDEDOR` | Vende licenças para clientes (condominios) | **Não** |
| `CLIENTE` | Administrador do condominio | Sim, mapeado como `CLIENT_ADM` |
| `GESTOR` | Gerente atribuído a condominios específicos | **Não** |
| `MORADOR` | Morador com acesso limitado | **Não** |

### O que falta implementar:
- Tabela `distribuidores` (nome_fantasia, razao_social, cnpj, email, telefone, endereco, comissao_percentual, usuario_id)
- Tabela `revendedores` (nome_fantasia, razao_social, cnpj, email, telefone, endereco, comissao_percentual, comissao_sistema, distribuidor_id, usuario_id, stripe_customer_id)
- Tabela `gestores` (usuario_id, clientes[], ativo, criado_por_id)
- Roles adicionais no ENUM de users: `DISTRIBUIDOR`, `REVENDEDOR`, `GESTOR`, `MORADOR`
- Middleware de hierarquia (quem pode ver/editar quem)
- Fluxo de associar gestores a condominios (vincular/desvincular)

---

## 2. Sistema financeiro / cobrança

O portal antigo tem um sistema completo de billing via Stripe (boleto/PIX).

### Tabelas que não existem:
- `pagamentos` — pagamentos master (stripe_charge_id, stripe_payment_intent_id, valor, status, metodo_pagamento)
- `clientes_pagamentos` — cobranças mensais por condominio (cliente_id, mes_referencia, valor, valor_multa, status_pagamento, stripe_payment_intent_id, multa_percentual)
- `comissoes` — comissões para revendedores (revendedor_id, cliente_id, valor_comissao, percentual, mes_referencia, tipo)
- `configuracao_comissoes` — config de comissão por revendedor (percentual_primeiro_mes, percentual_mensal, min_valor_comissao)
- `credenciais_stripe` — chaves Stripe (public_key, secret_key, webhook_secret, modo_teste)
- `contas_recebimento` — contas bancárias para recebimento

### Regras de negócio:
- **Cobrança recorrente**: baseada na `data_ativacao` do condominio, gera boleto mensal automaticamente
- **Multa por atraso**: 10% (1-7 dias), 20% (>7 dias de atraso)
- **Comissões**: calculadas automaticamente para revendedores, primeiro mês proporcional, meses seguintes integral
- **Processamento mensal**: cron no 5º dia útil do mês
- **Status de pagamento**: pendente, efetuado, atrasado, teste, isento
- **Status do condominio**: aguardando_ativacao, ativo, suspenso, cancelado, teste, isento

### Endpoints necessários:
- `POST /api/payments/create` — criar cobrança Stripe
- `GET /api/payments/status/:id` — verificar status
- `POST /api/payments/confirm` — confirmar pagamento
- `POST /api/webhooks/stripe` — webhook Stripe
- `GET /api/financial/summary` — resumo financeiro
- `GET /api/financial/commissions` — relatório de comissões

---

## 3. Sistema de assinatura / licenças

### O que existe no antigo:
- Cada condominio tem um `valor_licenca` (mensalidade)
- Campo `data_ativacao` que define o dia de cobrança recorrente
- Status de assinatura (ativo, suspenso, cancelado, teste, isento)
- Solicitação de licença por revendedores (`solicitacoes_licenca`)
- Cancelamento com registro (`cancelamentos`)

### Tabelas que não existem:
- `solicitacoes_licenca` (revendedor_id, dados do condominio, status)
- `cancelamentos` (cliente_id, motivo, data)
- Campo `valor_licenca` na tabela condominiums
- Campo `data_ativacao` na tabela condominiums
- Campo `status` expandido (além de active/inactive)
- Campo `status_pagamento` na tabela condominiums

---

## 4. Two-Factor Authentication (2FA)

### O que existe no antigo:
- TOTP via Google Authenticator
- QR code generation (BaconQrCode)
- Backup codes
- Email verification como pré-requisito
- Tela de setup, verificação e gerenciamento

### Tabelas que não existem:
- `two_factor` (usuario_id, secret, backup_codes, habilitado, metodo)
- `two_factor_log` (usuario_id, acao, ip, user_agent)

### Endpoints necessários:
- `POST /api/auth/2fa/setup` — gerar secret + QR code
- `POST /api/auth/2fa/verify` — verificar código OTP
- `POST /api/auth/2fa/enable` — ativar 2FA
- `POST /api/auth/2fa/disable` — desativar 2FA
- `POST /api/auth/2fa/validate` — validar no login

---

## 5. Termos de uso

### O que existe no antigo:
- Versionamento de termos (auto-increment)
- Aceite obrigatório no primeiro acesso
- Registro do aceite (usuario_id, termo_id, data)
- Painel de gerenciamento de termos

### Tabelas que não existem:
- `termos_uso` (titulo, conteudo, versao, criado_em)
- `usuario_termos_aceites` (usuario_id, termo_id, aceito_em, ip)

### Endpoints necessários:
- `GET /api/terms/latest` — termo vigente
- `POST /api/terms/accept` — aceitar termo
- `GET /api/terms` — listar termos (admin)
- `POST /api/terms` — criar novo termo

---

## 6. Onboarding (primeiro acesso)

### Fluxo do antigo:
1. Verificação de email (envio de código)
2. Troca de senha obrigatória
3. Setup 2FA
4. Aceite dos termos de uso
5. Tour guiado (Intro.js)

### O que falta:
- Campo `email_verificado` na tabela users
- Campo `codigo_verificacao_email` + `codigo_verificacao_expira`
- Tabela `onboarding` (usuario_id, etapas concluidas)
- Endpoints de verificação de email
- Fluxo completo no frontend

---

## 7. Email system

### O que existe no antigo:
- SMTP configurável por cliente
- Google OAuth para Gmail
- Templates de email editáveis (variáveis dinâmicas)
- Envio de emails transacionais (boas-vindas, reset senha, cobrança)

### Tabelas que não existem:
- `credenciais_smtp` (host, port, encryption, username, password, from_email, from_name)
- `email_templates` (tipo_template, assunto, corpo, variables)
- `email_logs` (destinatario, template, status, erro)

### Endpoints necessários:
- `GET/POST /api/email/config` — configuração SMTP
- `GET/PUT /api/email/templates` — gerenciar templates
- `POST /api/email/send` — enviar email

---

## 8. Importação em massa (planilhas)

### O que existe no antigo:
- Upload de Excel/CSV para criar unidades em massa
- Upload de Excel/CSV para criar moradores em massa
- Download de template de planilha
- Validação por linha com relatório de erros
- Rollback transacional em caso de erro

### Endpoints necessários:
- `POST /api/condominiums/:id/units/import` — importar unidades
- `POST /api/condominiums/:id/residents/import` — importar moradores
- `GET /api/condominiums/:id/units/template` — download template
- `GET /api/condominiums/:id/residents/template` — download template

---

## 9. Identidade visual / branding

### O que existe no antigo:
- Logo customizável
- Cores primária e secundária
- Aplicado dinamicamente no frontend

### Tabelas que não existem:
- `identidade_visual` (primary_color, secondary_color, logo_url)

---

## 10. Activity logs detalhados

### O que existe no antigo mas falta no novo:
- Campo `dados_anteriores` e `dados_novos` (JSONB) — diff do que mudou
- Visibilidade baseada na hierarquia de roles
- Filtros avançados (por entidade, por ação, por período)
- Paginação no frontend

O backend novo já tem `audit_logs` básico, mas falta:
- Campos `dados_anteriores`, `dados_novos` para diff
- Campo `visibilidade` ou lógica de role-based filtering
- Endpoint com paginação e filtros combinados

---

## 11. Funcionalidades diversas do portal antigo

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| Redefinição de senha | Esqueci senha → email com link/código → nova senha | Alta |
| Bloqueio por tentativas | 5 tentativas → lock 15 min | Média |
| Session management | Timeout 30min, regeneração a cada 10min | Média |
| Gestores multi-condominio | Um gestor pode acessar múltiplos condominios | Baixa |
| Dashboard por role | Dashboard diferente para cada tipo de usuário | Média |
| Notificações | Tabela de notificações in-app | Baixa |
| Tipo de condominio | horizontal, vertical, hibrido, comercial, singular | Média |
| Campos dinâmicos por tipo | Unidades com campos diferentes por tipo de condominio | Baixa |
| Telefone cascata | Lógica de cascata de telefones para ligação | Alta (core do produto) |
| Discord integration | Webhook para canal Discord | Baixa |
| Sentry | Error monitoring em produção | Média |
| Rate limiting por endpoint | Limites diferentes por rota | Já implementado no back |
| CSRF protection | Token anti-CSRF em todos os forms | N/A (SPA usa JWT) |

---

## 12. Campos do condominio que não existem no back novo

O portal antigo tem estes campos em `clientes` que não foram migrados:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `razao_social` | VARCHAR | Razão social |
| `cpf` | VARCHAR | CPF do responsável |
| `email` | VARCHAR | Email do condominio |
| `tipo_cliente` | ENUM | horizontal/vertical/hibrido/comercial/singular |
| `data_ativacao` | DATE | Data de ativação (define cobrança) |
| `status` | ENUM | aguardando_ativacao/ativo/suspenso/cancelado/teste/isento |
| `status_pagamento` | ENUM | pendente/efetuado/atrasado/teste/isento |
| `valor_licenca` | DECIMAL | Valor da mensalidade |
| `total_unidades` | INT | Counter cache de unidades |
| `total_moradores` | INT | Counter cache de moradores |
| `stripe_customer_id` | VARCHAR | ID do cliente no Stripe |
| `orientacoes_estrutura` | TEXT | Orientações sobre a estrutura |
| `rg_responsavel` | VARCHAR | RG do responsável |
| `revendedor_id` | UUID FK | Revendedor que vendeu |

---

## 13. Campos do morador que não existem no back novo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `apelido` | VARCHAR | Apelido/nome curto |
| `codigo_pais` | VARCHAR | Código do país (+55) |
| `libera` | BOOLEAN | Pode autorizar entrada (existe como `can_authorize`) |

---

## Resumo de prioridades sugeridas

### Fase 1 — Essencial
- [ ] Redefinição de senha (esqueci senha)
- [ ] Bloqueio por tentativas de login
- [ ] Campos adicionais em condominiums (email, tipo_cliente, status expandido)
- [ ] Dashboard com dados reais

### Fase 2 — Financeiro
- [ ] Sistema de cobrança (Stripe)
- [ ] Tabelas de pagamento
- [ ] Valor da licença por condominio
- [ ] Relatórios financeiros

### Fase 3 — Hierarquia
- [ ] Distribuidores + Revendedores
- [ ] Gestores multi-condominio
- [ ] Comissões

### Fase 4 — Segurança
- [ ] 2FA (TOTP)
- [ ] Termos de uso + aceite obrigatório
- [ ] Onboarding completo
- [ ] Activity logs com diff

### Fase 5 — Conveniência
- [ ] Email system (SMTP + templates)
- [ ] Importação de planilhas
- [ ] Identidade visual
- [ ] Notificações
- [ ] Campos dinâmicos por tipo de condominio
