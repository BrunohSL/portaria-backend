---
name: nodejs-best-practices
description: "Node.js development principles for the Portaria project (Express + CommonJS + Joi + Sequelize + Jest). Architecture, async patterns, security, and testing — calibrated to our stack."
risk: unknown
source: community
date_added: "2026-06-09"
---

# Node.js Best Practices — Portaria

> Principles and decision-making for Node.js development on this project.
> **Learn to THINK, not memorize code patterns.**

## Project context (locked decisions)

This skill is calibrated to the **Portaria** stack. The following are *decided* — don't propose migrating away from them without an explicit business reason:

- **Runtime:** Node.js 20
- **Framework:** Express 4
- **Module system:** CommonJS (`require` / `module.exports`)
- **Language:** Plain JavaScript (no TypeScript)
- **Validation:** Joi
- **ORM:** Sequelize + MySQL
- **Hashing:** bcryptjs
- **Tests:** Jest + Supertest
- **Voice/AI:** Twilio ConversationRelay (WebSocket) + OpenAI SDK + ElevenLabs (TTS)
- **Real-time:** Socket.IO

> **No queue.** Portaria has no Bull/Redis. The call engine (`conversationRelay.js`) keeps state in memory over the WebSocket. Don't reintroduce a queue without a real reason (multi-server scaling would need Redis pub/sub — see `CLAUDE.md`).

## When to Use
Use this skill when making Node.js architecture decisions, designing async patterns, or applying security and testing best practices within the Portaria codebase.

---

## ⚠️ How to Use This Skill

This skill teaches **decision-making principles**, not fixed code to copy.

- ASK user for preferences when unclear
- Choose pattern based on CONTEXT
- Don't default to same solution every time

---

## 1. Express Conventions

For our Express 4 codebase:

### Layered separation
- **Routes** declare endpoints + attach middleware. No logic.
- **Controllers** parse the request, call services, format the response. No business logic.
- **Services** own business logic. Framework-agnostic — no `req`/`res` here.
- **Models** (Sequelize) are the data layer.

### Async errors in Express 4
- Express 4 does **not** auto-propagate rejected promises from async handlers.
- Wrap async route handlers with try/catch + `next(err)`, or use a helper like `express-async-handler`.
- Centralize error handling in a single 4-argument middleware `(err, req, res, next) => ...` registered **last**.

### Middleware order
Security (`helmet`, `cors`) → parsing (`express.json`) → rate limiting → routes → 404 handler → error handler.

---

## 2. Architecture Principles

### Layered Structure Concept

```
Request Flow:
│
├── Controller/Route Layer
│   ├── Handles HTTP specifics
│   ├── Input validation at boundary
│   └── Calls service layer
│
├── Service Layer
│   ├── Business logic
│   ├── Framework-agnostic
│   └── Calls repository layer
│
└── Repository Layer
    ├── Data access only
    ├── Database queries
    └── ORM interactions
```

### Why This Matters:
- **Testability**: Mock layers independently
- **Flexibility**: Swap database without touching business logic
- **Clarity**: Each layer has single responsibility

### When to Simplify:
- Small scripts → Single file OK
- Prototypes → Less structure acceptable
- Always ask: "Will this grow?"

> **Note on the call engine:** the voice flow lives in `src/integrations/twilio/conversationRelay.js` (WebSocket handler), which orchestrates node execution and calls into services (`callService`, `flowService`, `moradorContactService`). Treat it as the orchestration layer for calls — keep business rules in the services it calls, not inline in the relay.

---

## 3. Error Handling Principles

### Centralized Error Handling

```
Pattern:
├── Create custom error classes
├── Throw from any layer
├── Catch at top level (middleware)
└── Format consistent response
```

### Error Response Philosophy

```
Client gets:
├── Appropriate HTTP status
├── Error code for programmatic handling
├── User-friendly message
└── NO internal details (security!)

Logs get:
├── Full stack trace
├── Request context
├── User ID (if applicable)
└── Timestamp
```

### Status Code Selection

| Situation | Status | When |
|-----------|--------|------|
| Bad input | 400 | Client sent invalid data |
| No auth | 401 | Missing or invalid credentials |
| No permission | 403 | Valid auth, but not allowed |
| Not found | 404 | Resource doesn't exist |
| Conflict | 409 | Duplicate or state conflict |
| Validation | 422 | Schema valid but business rules fail |
| Server error | 500 | Our fault, log everything |

> **Voice flows degrade, not 500:** in the call engine, a failed LLM/integration call should fall back gracefully (keyword matcher, retry, or a polite end-of-call message) — never leave the caller on a dead line. See the graceful-degradation notes in `CLAUDE.md`.

---

## 4. Async Patterns Principles

### When to Use Each

| Pattern | Use When |
|---------|----------|
| `async/await` | Sequential async operations |
| `Promise.all` | Parallel independent operations |
| `Promise.allSettled` | Parallel where some can fail |
| `Promise.race` | Timeout or first response wins |

> `Promise.race` is the pattern behind the CONTATAR step: an outbound-call decision races a timeout (see `moradorContactService`).

### Event Loop Awareness

```
I/O-bound (async helps):
├── Database queries
├── HTTP requests (OpenAI, Twilio, gate DNS)
├── File system
└── Network / WebSocket I/O

CPU-bound (async doesn't help):
├── Crypto operations
├── Audio/image processing
├── Complex calculations
└── → offload to a separate process (we have NO queue today; weigh it before adding one)
```

### Avoiding Event Loop Blocking

- Never use sync methods in production (`fs.readFileSync`, etc.)
- Keep CPU-intensive work off the request/WebSocket path
- Use streaming for large data

---

## 5. Validation Principles

### Validate at Boundaries

```
Where to validate:
├── API entry point (request body/params) — Joi schemas in middleware
├── Before database operations
├── External data (Twilio webhooks, OpenAI/LLM output, audio transcripts)
└── Environment variables (startup)
```

### Validation Philosophy

- **Fail fast**: validate early, before any DB or downstream call
- **Be specific**: clear error messages with field names
- **Don't trust**: even "internal" data crossing layers — and *especially* LLM output (extracted fields, intent classifications) before acting on it
- **Joi specifics**: define schemas alongside the route or in a shared location if reused; prefer `.required()`, `.strict()`, and explicit `.messages()` for clearer client errors

---

## 6. Security Principles

### Security Checklist

- [ ] **Input validation**: all inputs validated via Joi
- [ ] **Parameterized queries**: Sequelize handles this — avoid raw `query()` with string interpolation
- [ ] **Password hashing**: bcryptjs
- [ ] **JWT verification**: always verify signature and expiry (HTTP routes *and* the Socket.IO handshake)
- [ ] **Twilio webhooks**: these run without JWT — validate they actually come from Twilio (signature) before trusting them
- [ ] **Rate limiting**: `express-rate-limit` on public endpoints
- [ ] **Security headers**: `helmet`
- [ ] **HTTPS**: everywhere in production
- [ ] **CORS**: properly configured (`CORS_ORIGIN` env)
- [ ] **Secrets**: environment variables / Docker secrets only (`src/config/env.js`) — never log API keys (Twilio/OpenAI/ElevenLabs)
- [ ] **Dependencies**: regularly audited (`npm audit`)

### Security Mindset

```
Trust nothing:
├── Query params → validate
├── Request body → validate
├── Headers → verify
├── Twilio webhooks → verify signature
├── LLM / STT output → validate before acting
└── External APIs → validate response
```

---

## 7. Testing Principles

### Test Strategy Selection

| Type | Purpose | Tools |
|------|---------|-------|
| **Unit** | Business logic in services/utils | Jest |
| **Integration** | API endpoints | Jest + Supertest |
| **E2E** | Full call flows | `docs/simulator.md` (`/api/dev/simulate-call`, `/api/dev/test-node`) |

### What to Test (Priorities)

1. **Critical paths**: auth, the call engine (`conversationRelay.js`), flow validation, integrations (OpenAI extraction/classification, Twilio outbound)
2. **Edge cases**: empty inputs, boundaries, ambiguous LLM answers, silence/timeout
3. **Error handling**: what happens when the LLM/Twilio fails? (must degrade gracefully)
4. **Not worth testing**: framework code, trivial getters

> `__tests__/` is currently empty — the dev simulator is the practical starting point for exercising flows end-to-end without a real phone call.

---

## 8. Anti-Patterns to Avoid

### ❌ DON'T:
- Use sync methods in production (`fs.readFileSync`, etc.)
- Put business logic in controllers (or inline in the WebSocket relay)
- Skip input validation
- Act on raw LLM/STT output without validating it
- Hardcode secrets
- Trust external data (Twilio webhooks, integration responses) without validation
- Block the event loop with CPU work on the request/WebSocket path

### ✅ DO:
- Use the layered architecture for new features
- Validate all inputs at the boundary with Joi
- Use environment variables / Docker secrets for secrets
- Degrade gracefully on integration failures
- Profile before optimizing

---

## 9. Decision Checklist

Before implementing a new feature:

- [ ] **Right layer for this logic?** (route vs controller vs service vs call engine)
- [ ] **Error handling planned?** (custom error class? appropriate status code? graceful degradation for voice?)
- [ ] **Validation points identified?** (including LLM/webhook output)
- [ ] **Security implications considered?**
- [ ] **Any CPU-bound or long-running work?** → keep it off the request/WS path

---

> **Remember**: best practices are about decision-making, not memorizing patterns. Every feature deserves fresh consideration based on its requirements.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
