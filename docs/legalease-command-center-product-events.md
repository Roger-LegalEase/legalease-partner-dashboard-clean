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
| Payment succeeds | `checkout_completed` (see below) | `payment_completed` + `metadata.amount` | Paid + revenue |
| Packet generated | `packet_generated` | `packet_generated` | — |

`metadata.amount` carries `amount_cents` (5000 = $50). The receiver treats amounts over 1000 as
cents, so cents is the correct unit to send.

### The paid event has two producers

`payment_completed` is the most important number on the scoreboard, so it is emitted from **both**:

1. **The Stripe webhook** (`checkout-reconciliation.ts`) — authoritative. Fires even if the user
   never returns to the site, which the polled route alone would miss.
2. **The polled `/api/expungement-ai/payment/confirm` route** — fires when the user lands back on
   packet-ready.

Both fire for a typical payment, in either order, and Stripe redelivers webhooks. They collapse to
one event because `recordConsumerCheckoutCompleted` is the **single definition of the idempotency
seed** (the Stripe checkout session id). That seed derives a deterministic `event_id`; the analytics
upsert ignores the duplicate; only the insert that actually stored a row is mirrored onward. Both
call sites must go through that helper — a divergent seed silently doubles revenue.

The webhook has no user-facing request, and Stripe posts to whatever host the endpoint is configured
on, which may map to no product surface or the wrong one. So the paid event asserts its
`productSurface` explicitly and that assertion overrides the Host-derived surface. Without it the
paid event is dropped or misattributed.

`npm run expungement:verify-paid-event-once` covers all of this.

## Configuration

| Variable | Purpose |
|---|---|
| `LEGALEASE_OS_EVENTS_ENABLED` | `"true"` to emit. Anything else disables egress with no deploy. |
| `LEGALEASE_OS_EVENTS_ENDPOINT` | Product event URL (`/api/events/product`). |
| `LEGALEASE_OS_LOOPS_ENDPOINT` | OS-loops event URL (`/api/os-loops/events`). Different dialect — see below. |
| `LEGALEASE_OS_EVENTS_SECRET` | Shared HMAC secret, used by both. The receiver validates against its own copy — never mint a new one. |

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

The two must not be merged, and they must not share an endpoint. Each dialect reads its own variable:
product events use `LEGALEASE_OS_EVENTS_ENDPOINT`, OS-loops events use `LEGALEASE_OS_LOOPS_ENDPOINT`.
They share only the HMAC secret and the enable flag. See `docs/legalese-os-cross-repo-smoke.md`.

Pointing either dialect at the other's route returns a 400 and silently drops the event, which is
exactly what happened while both shared one variable.

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
