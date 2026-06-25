# Wilma Anonymous Landing Endpoint — As-Built Spec

Status: **built, not live.** No production keys are set by this change. The endpoint must pass
the adversarial suite on staging (same gate as the authenticated path) before any production
key serves it.

## Endpoint

`POST /api/expungement-ai/wilma/public-chat` — anonymous, no session.

- **Never** consults the consumer session, loads a saved case, or reads a case id.
- **State content only, no case visibility ever.** Context is built via `buildPublicWilmaContext`
  (forces `briefcaseItem: null`).
- `pageContext` is allowlisted to `landing | pricing | start` (defaults to `landing`).
- Model is **locked to `gpt-4o`** (`WILMA_PUBLIC_MODEL`, not env-tunable) — the model the
  adversarial suite is gated against. It is not swapped to a cheaper model.

### Payload: anonymous vs authenticated

| | Authenticated `/wilma/chat` | Anonymous `/wilma/public-chat` |
|---|---|---|
| Auth | session cookie | none |
| Body | `message, pageContext, history, state?, briefcaseItemId?` | `message, pageContext, history, state?, turnstileToken, conversationId?` |
| `briefcaseItemId` | read → case visibility | **never present / never read** |
| Case context | from briefcase item | **always empty** |
| State content | yes | yes |
| History caps | 12 turns / 4000 chars | **8 turns / 600 chars** |

### System prompt difference

Same canonical guardrail body verbatim. Only the injected RUNTIME REFERENCE changes: on the
public surface the CASE CONTEXT block is replaced with an explicit *"No case is attached on this
anonymous surface. You cannot see any user case details here, and there is no case to reason
from."* VERIFIED STATE CONTENT / HUMAN HELP / SUPPORT blocks are unchanged.

## Still applies on this path (confirmed)

- **Kill-switch** — checked first, before any model call.
- **Guard** — `guardWilmaResponse` polices every output (live or fallback).
- **System prompt** — full canonical prompt with the no-case reference block.
- **Telemetry** — `createWilmaTelemetryRecord` + `logWilmaExchange`, PII-redacted, pseudonymous
  id (hashed IP / conversation id), `surface: "public_landing"`.

## Abuse & cost protections (in order)

| Control | Limit (env-tunable) | When hit |
|---|---|---|
| Kill-switch | — | kill-switch copy, 200, no model |
| Message length | 1,000 chars | 400 + "keep it shorter", no model |
| Bot challenge (Turnstile) | required when configured | 403 + fallback copy |
| Per-IP rate | 5/min, 30/hr, 60/day | 429 + fallback copy + `Retry-After`, no model |
| Turns / conversation | 20 | 200 + "start the free screening", no model |
| History caps | 8 turns / 600 chars | trimmed before the model |
| Global daily spend cap | **$50/day** (`WILMA_PUBLIC_DAILY_USD_CAP`) | model skipped → deterministic fallback for the rest of the UTC day |

**Configuration posture (important for staging):**
- Upstash / Turnstile env **absent** → those controls are **disabled** (allow / not-exhausted),
  so staging can exercise the live model for the adversarial run before prod limits are wired.
- Upstash env **present but unreachable** → **fail safe for cost**: rate check reports
  `store_unavailable`, cap reports `unknown`, route serves the deterministic fallback (no spend).

## Cost exposure math (gpt-4o)

Pricing assumption (USD per 1M tokens — **verify against current OpenAI pricing**):
**input $2.50, output $10.00**.

Worst-case request under public caps: ~3,000 input tokens (system ~1,500 + 8-turn history ~1,200
+ 1,000-char message ~250) + 500 output tokens (capped).

```
cost/request ≈ (3,000 × $2.50 + 500 × $10.00) / 1,000,000
             ≈ ($0.0075 + $0.0050)
             ≈ $0.0125  per worst-case request
```

- **Hard ceiling = the global daily cap.** At ~$0.0125/request, **$50/day ≈ 4,000 model-served
  messages/day** before everyone degrades to the free deterministic fallback.
- Without the global cap, one IP at 60/day ≈ **$0.75/IP/day**; 10,000 rotated IPs ≈ **$7,500/day**;
  100k IPs ≈ **$75k/day** — which is why the global cap is the non-negotiable backstop.
- Turnstile: free. Upstash: negligible at this volume.

> Note: gpt-4o is ~4–5× the per-request cost of gpt-4.1-mini. The $50 cap therefore maps to
> ~4,000 msgs/day here (vs ~16–25k on the cheaper model). Adjust the cap if you want more
> headroom — it is env-tunable.

## Environment / infra (you set these; not touched by the build)

- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `WILMA_PUBLIC_DAILY_USD_CAP` (default 50), `WILMA_PUBLIC_RATE_PER_MIN|HOUR|DAY`,
  `WILMA_PUBLIC_MAX_TURNS`, `WILMA_PUBLIC_INPUT_USD_PER_1M` / `WILMA_PUBLIC_OUTPUT_USD_PER_1M`
- `OPENAI_API_KEY` (already exists)

## Staging test gate (before any production key serves it)

Run the adversarial suite against `/public-chat` on staging with the key present in the runtime
(same gate as the authenticated path; new surface). Build does not flip anything live.
