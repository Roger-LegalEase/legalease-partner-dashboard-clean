# Command Center Product Events

Expungement.ai emits signed product analytics events to the LegalEase Command Center so its
conversion funnel (web visits → screenings started → reached checkout → paid) reflects real product
activity.

Endpoint: `POST https://legalease-command-center-prod.onrender.com/api/events/product`

## How it is wired

The product already writes a first-party analytics row for every funnel moment, server-side, via
`/api/analytics/web` (browser beacons) and `recordServerFunnelEvent` (server-confirmed events). Those
rows are bot-filtered, throttled, event-name validated, PII-sanitized, and idempotent on `event_id`.

Rather than instrument four surfaces separately, we bridge those rows:

```
browser beacon ──► /api/analytics/web ──┐
                                        ├──► recordWebAnalyticsEvent (upsert on event_id)
server-confirmed ──► recordServerFunnelEvent ──┘             │
                                                             │ stored === true (new row only)
                                                             ▼
                                          forwardEventToCommandCenter   (command-center-bridge.ts)
                                                             │
                                                             ▼
                                               emitProductEvent          (product-events.ts)
                                                             │  HMAC-SHA256, 3s timeout, ≤3 attempts
                                                             ▼
                                            Command Center /api/events/product
```

This means the Command Center funnel and the internal funnel are derived from the same rows and can
be reconciled one-for-one.

Only the `expungement_ai` product surface is bridged. RCAP partner funnel events live on a different
surface and would pollute the product funnel.

## Event mapping

| Product moment | Analytics row | Product event | Scoreboard effect |
|---|---|---|---|
| Landing page rendered | `pageview` on path `/` or `/expungement-ai` | `landing_page_viewed` | Web visits |
| Screening begins | `screening_started` | `expungement_intake_started` | Screenings started |
| Pay gate reached | `checkout_started` | `payment_started` | Reached checkout |
| Payment succeeds | `checkout_completed` | `payment_completed` + `metadata.amount` | Paid + revenue |
| Packet generated | `packet_generated` | `packet_generated` | — |

`metadata.amount` carries `amount_cents` (5000 = $50). The receiver treats amounts over 1000 as
cents, so cents is the correct unit to send.

## Configuration

| Variable | Purpose |
|---|---|
| `LEGALEASE_OS_EVENTS_ENABLED` | `"true"` to emit. Anything else disables egress with no deploy. |
| `LEGALEASE_OS_EVENTS_ENDPOINT` | Receiver URL. |
| `LEGALEASE_OS_EVENTS_SECRET` | Shared HMAC secret. The receiver validates against its own copy — never mint a new one. |

The emitter is `server-only`, so the secret never ships to a browser.

## Signing

1. `timestamp` = current unix seconds.
2. `signature` = lowercase hex HMAC-SHA256 over `"<timestamp>.<rawRequestBody>"`, keyed with the secret.
3. Headers: `X-Legalease-OS-Timestamp`, `X-Legalease-OS-Signature: sha256=<hex>`.

The body is serialized exactly once and the signature covers those exact bytes. It is never
re-serialized after signing.

## Delivery guarantees

- **Fire-and-forget.** Callers invoke as `void forwardEventToCommandCenter(row)`. Nothing in a
  user-facing request path awaits or fails on emitter errors.
- **3s timeout per attempt, at most 3 attempts.** Retries only on network error, 408, 429, or 5xx.
  A 4xx (bad signature, unsupported type) is permanent and is not retried.
- **Retries replay the identical body and timestamp.** Replay protection on the receiver is
  identity-based, keyed on `(product, eventType, userId-or-anonymousId, timestamp, campaignSlug)`,
  so a byte-identical retry can never double-count.
- **Emission is gated on a genuinely new row.** `recordWebAnalyticsEvent` reports `stored: true` only
  when its `event_id` upsert actually inserted. Since the payment confirmation route is *polled* and
  Stripe redelivers webhooks, this gate is what guarantees `payment_completed` revenue is counted
  once. Do not emit without it.
- **Failures log a status code only** — never the response body, never the secret.

## Privacy

- `anonymousId` is a SHA-256 hash of the first-party visitor id (falling back to session id, then
  event id), so our raw identifiers never leave the system. It is stable per visitor.
- `userId`, when present, is hashed too. The receiver records only *whether* a userId was present.
- `metadata` is restricted to counts and amounts, and is run through `sanitizeEventMeta`, which drops
  PII-shaped keys and redacts PII-shaped text. Never send email, name, phone, or case details.

## Not to be confused with the OS-loops exporter

`src/lib/legalese-os-events.ts` speaks a **different dialect** to a **different receiver route**:
snake_case `event_type` (`engine.health_changed`, `packet.generated`), hashed subject refs, posted to
`/api/os-loops/events`. The product endpoint rejects that shape with
`400 {"error":"Unsupported product event type."}`.

The two must not be merged, and they must not share an endpoint. See
`docs/legalese-os-cross-repo-smoke.md`.

> **Open item for Roger:** `LEGALEASE_OS_EVENTS_ENDPOINT` is currently a *single* variable consumed by
> both dialects, and it points at `/api/events/product`. That means the OS-loops emitters
> (`/api/health`, packet generation, nudge windows, partner usage) are being 400'd on every send. They
> need their own endpoint variable pointed back at `/api/os-loops/events`. Changing a production env
> var requires approval, so this was not done here.

## Verifying

Offline (no network, runs in `npm test`):

```bash
npm run analytics:verify-command-center-product-events
```

Live: a successful funnel-metric send returns `2xx` with `"autoApplied": true`. A byte-identical
replay returns `"autoApplied": false` with `"message": "Product event already imported."`

The scoreboard shows **real events only** — a test event does count toward the live funnel. Prefer
`landing_page_viewed` for smoke tests, and tell whoever operates the Command Center exactly how many
test events were sent so they can be accounted for.
