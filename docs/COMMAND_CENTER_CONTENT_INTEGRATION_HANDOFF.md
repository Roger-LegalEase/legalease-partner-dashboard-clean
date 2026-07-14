# Command Center — Content Promotion Integration Handoff

**Status:** LegalEase sending side is built (phase 43). The Command Center receiving side is **not built**.
**Audience:** whoever implements the receiver in the `legalease-command-center` repo.
**This document is the contract.** Nothing in this repo needs to change for you to build against it.

---

## 1. Division of ownership

Do not blur this line — it is the whole reason the integration exists.

| LegalEase (`legalease-partner-dashboard-clean`) owns | Command Center owns |
| --- | --- |
| Content, articles, state-resource editorial | Connected social accounts (OAuth tokens) |
| Social drafts + per-channel captions | Scheduling and queueing |
| Social graphics (rendered assets) | External publishing to LinkedIn/X/etc. |
| Promotion **approval** | External platform post IDs |
| The outbound **request** | Retry operations against the networks |
| Ingestion of your status callbacks | Engagement reporting |

LegalEase **never** publishes to a social network. It signs a promotion package and hands it to you.
You **never** author or edit content. You receive an approved package and deliver it.

**Publishing an article and sending its promotion are separate actions.** A published article with no
promotion sent is a normal, expected state. Never infer one from the other.

---

## 2. Transport

LegalEase POSTs to a single endpoint you provide:

```
POST <COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT>
Content-Type: application/json
X-LegalEase-Signature: t=<unix_seconds>,v1=<hex_hmac_sha256>
X-LegalEase-Event-Id: <uuid>
X-LegalEase-Idempotency-Key: <stable_string>
```

The body is **canonical JSON** (see §4). Send-side implementation:
`src/lib/content/command-center.ts`.

### Configuration on the LegalEase side (placeholders only — no real values are committed)

```
COMMAND_CENTER_CONTENT_EVENTS_ENABLED=false
COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT=
COMMAND_CENTER_CONTENT_SIGNING_SECRET=
```

While any of these is unset, the CMS shows an honest **"Not connected"** state and offers a local
JSON export instead. It never queues a fake success. You do not need to do anything to support that.

---

## 3. Signature verification (do this first, before parsing)

The signature covers `${timestamp}.${raw_request_body}`.

```
signed_material = f"{t}.{raw_body_bytes}"
expected        = HMAC_SHA256(COMMAND_CENTER_CONTENT_SIGNING_SECRET, signed_material).hexdigest()
```

You **must**:

1. Read the **raw request body as text** — do *not* parse to JSON and re-serialize before verifying.
   Re-serialization reorders keys and every signature will fail.
2. Compare `expected` against the `v1=` value using a **constant-time** compare.
3. Reject when `abs(now - t) > 300` seconds — **even if the digest matches**. The timestamp is inside
   the signed material precisely so a captured request cannot be replayed later. A valid signature
   replayed an hour after capture must be rejected with `401`.
4. Reject a missing or malformed header with `401`.

Rejecting on a stale timestamp is the single most important thing on this list. LegalEase's own test
for this is `scripts/verify-content-command-center-contract.mjs` — mirror it.

---

## 4. Canonical JSON

Both sides must derive an identical byte string or every signature fails.

- Object keys sorted **recursively**, ascending, byte order.
- No incidental whitespace (`JSON.stringify` with no spacing).
- Arrays keep their order; objects **inside** arrays are also key-sorted.

Reference implementation: `canonicalJson()` in `src/lib/content/command-center.ts`.

LegalEase sends the exact canonical bytes it signed as the request body, so verifying against the
raw body text is always correct.

---

## 5. Envelope

Every request has this shape:

```jsonc
{
  "event_id": "0f6c…",                          // uuid, unique per delivery attempt-set
  "event_type": "content.promotion.requested",  // see §6
  "idempotency_key": "content.promotion.requested:<post_id>:<campaign_id>",
  "issued_at": "2026-07-12T18:04:11.000Z",      // ISO-8601 UTC
  "source": "legalease_content",
  "payload": { … }                              // per event_type
}
```

### Idempotency — the load-bearing field

`idempotency_key` is **deterministic and stable across retries**: same post + same campaign + same
event type always produces the same key.

**You must de-duplicate on it.** LegalEase retries with exponential backoff (30s → capped at 1h,
max 8 attempts), and a network timeout after you have already accepted the request is indistinguishable
from a failure on our side. If you do not de-duplicate, a retry storm will double-post to a real
LinkedIn account.

Store `idempotency_key` with a unique constraint. On a duplicate, return `200` with the original
result — **not** an error.

---

## 6. Event types

### `content.promotion.requested` — the one that matters

Sent when a human approves a promotion package in the CMS and clicks Send.

```jsonc
{
  "post": {
    "id": "uuid",
    "slug": "how-record-clearing-works",
    "destination": "expungement_ai",        // or "legalease_partner"
    "content_type": "blog_article",
    "title": "How record clearing actually works",
    "subtitle": "A plain-language walkthrough",
    "canonical_url": "https://expungement.ai/blog/how-record-clearing-works",
    "published_at": "2026-07-10T14:00:00.000Z",
    "author": "Roger Roman"
  },
  "channels": [
    {
      "channel": "linkedin",                // linkedin|x|facebook|instagram|threads|email|partner_kit
      "primary_caption": "…",
      "alternate_caption": "…",
      "founder_voice_caption": "…",
      "partner_caption": "…",
      "hashtags": ["recordclearing"],
      "mention_tags": [],
      "link": "https://expungement.ai/blog/…?utm_source=linkedin&utm_medium=social&utm_campaign=…",
      "asset": {
        "url": "https://…/content-media/….png",
        "width": 1200,
        "height": 630,
        "template": "editorial_cover"
      }
    }
  ]
}
```

Notes:

- `link` already carries UTM params. **Post it verbatim.** Do not append your own.
- `asset` may be `null` (a channel with no graphic). Handle it.
- Captions are already validated against per-channel limits on our side (X ≤ 280). Validate again
  anyway — never trust an upstream.
- A channel appearing in `channels` means a human approved that channel. Do not invent channels.

### `content.published` / `content.unpublished`

Informational lifecycle events, so the Command Center can keep an accurate content inventory.
**They are not a request to post anything.** Do not treat `content.published` as a promotion trigger —
promotion is always an explicit, separately approved action.

---

## 7. Responses LegalEase expects from you

| Situation | Return | LegalEase behavior |
| --- | --- | --- |
| Accepted | `2xx` | Marks the outbox row `sent`. |
| Duplicate `idempotency_key` | `200` | Treated as success. Do **not** 4xx. |
| Bad signature / stale timestamp | `401` | Marks failed, retries with backoff, eventually `dead`. |
| Malformed payload | `422` | Same as above. |
| Transient failure | `5xx` | Retries with backoff. |

LegalEase retries `4xx` and `5xx` alike up to `max_attempts` (default 8) and then marks the row
`dead` for human attention. It never silently drops a delivery.

---

## 8. Status callbacks (Command Center → LegalEase)

Once you have actually delivered to a network, report back:

```
POST https://legaleasepartner.com/api/content/command-center/status
X-LegalEase-Signature: t=<unix>,v1=<hmac>
```

```jsonc
{
  "campaign_id": "uuid",     // echo the value from the promotion payload
  "channel": "linkedin",
  "delivery_status": "accepted" | "scheduled" | "published" | "failed" | "skipped",
  "external_reference": "urn:li:share:12345",   // your platform's post id
  "occurred_at": "2026-07-12T18:10:00.000Z"
}
```

**Sign it the same way** (same secret, same canonical-JSON + timestamp scheme). The LegalEase
receiver verifies your signature and rejects stale timestamps identically. An unsigned callback is
rejected with `401`, and if no secret is configured the route rejects everything — it never accepts
unsigned input.

`delivery_status` is the **only** way `content_campaign_channels.delivery_status` is ever set on our
side. LegalEase never marks something `published` externally by itself.

---

## 9. What LegalEase will NOT send you

By design, and you should not ask for it:

- User PII, screening answers, case facts, or anything from a Briefcase.
- Payment or Stripe data.
- Internal record-clearing engine data: eligibility rules, source-corpus hashes, QA notes, generator
  configuration, or screening questions.
- Draft content. Only approved, published posts can have a promotion package sent.

---

## 10. Implementation checklist for the receiver

- [ ] Endpoint accepts `POST`, reads the **raw body text** before any JSON parsing.
- [ ] HMAC-SHA256 verified over `${t}.${raw_body}` with a **constant-time** compare.
- [ ] Timestamp outside ±300s rejected with `401` **even when the digest is valid**.
- [ ] `idempotency_key` persisted with a unique constraint; duplicates return `200`, not an error.
- [ ] `content.published` does **not** trigger a post.
- [ ] `link` posted verbatim (UTM already applied).
- [ ] Status callback implemented and signed with the same scheme.
- [ ] Secret delivered out-of-band; never committed to either repo.

---

## 11. Reference implementations in this repo

| Concern | File |
| --- | --- |
| Signing, verification, canonical JSON, backoff | `src/lib/content/command-center.ts` |
| Outbox table + idempotency constraint | `supabase/phase-43-content-platform.sql` |
| Contract tests (signing, replay, tamper, idempotency) | `scripts/verify-content-command-center-contract.mjs` |
| Outbound send route | `src/app/api/internal/content/promotion/[postId]/send/route.ts` |
| Inbound status route | `src/app/api/content/command-center/status/route.ts` |
