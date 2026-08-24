# First-Party Web Analytics

LegalEase-owned, privacy-conscious web traffic + funnel analytics across the three public product
surfaces. This is the Command Center's **own source of truth** — independent of any third-party
analytics (Google Analytics / Vercel Analytics can be layered on later, but do not replace this).

## Surfaces covered

| Surface | Domain(s) | product_surface |
|---|---|---|
| Expungement.ai (consumer DTC) | `expungement.ai` | `expungement_ai` |
| LegalEase (umbrella site) | `legalease.com`, `legalease.law` | `legalease` |
| LegalEase Partner (RCAP portal) | `legaleasepartner.com` | `legalease_partner` |

All three domains are served by this one Next.js/Vercel app (host routing lives in `src/proxy.ts`),
so `product_surface` is derived **server-side from the request Host header** in the ingestion route.

## Architecture

```
Browser                                   Server (this app)                 Supabase
────────                                  ─────────────────                 ────────
WebAnalyticsTracker (root layout) ──┐
FunnelBeacon / trackFunnelEvent  ───┼──▶  POST /api/analytics/web  ──▶  public.web_analytics_events
legalease.com static inline snippet ┘        (validate + hash + sanitize)      (append-only, RLS)

Command Center dashboard  ◀── getWebAnalyticsSummary() ◀───────────────────────┘
GET /api/internal/analytics/summary  (UUID-bound internal-admin session) ◀─────┘
```

- **Tracker** — `src/components/analytics/WebAnalyticsTracker.tsx` mounts once in the root layout, so
  it rides every rendered React page across all three surfaces. Pageviews fire on load and on client
  route changes (de-duped). The `legalease.com` homepage is a **static HTML file**
  (`public/static/legalease/index.html`) that the React tree never mounts on, so it carries an
  equivalent self-contained inline snippet.
- **Client helpers** — `src/lib/analytics/client.ts`: anonymous `visitor_id` (localStorage + first-party
  cookie, ~13-month TTL), idle-based `session_id` (30-minute window), per-session UTM capture, and
  `sendBeacon`/`fetch(keepalive)` delivery that never blocks navigation.
- **Ingestion** — `src/app/api/analytics/web/route.ts`: validates the event name against an allowlist,
  derives surface/domain from Host, salted-hashes the IP, sanitizes metadata, soft-throttles per IP,
  drops obvious bots, and **always returns fast without surfacing errors**. Analytics failure never
  breaks a user flow.
- **Storage** — `supabase/phase-40-web-analytics-events.sql`: append-only `web_analytics_events`
  (RLS on, service-role only, `event_id` idempotency) plus a `web_analytics_daily_rollups` table for
  future pre-aggregation.
- **Summary** — `src/lib/analytics/web-analytics-repository.ts#getWebAnalyticsSummary` aggregates a
  capped row scan into totals/breakdowns/funnels. Exposed to the Command Center at
  `GET /api/internal/analytics/summary?range=7d` (canonical UUID-bound internal-admin session) and
  rendered in the in-repo dashboard at `/internal/command-center/web-traffic`.

## What is tracked

- Pageviews: path, sanitized query (UTM + a couple of safe keys only), page title, referrer domain +
  sanitized referrer URL, UTM params, anonymous visitor/session UUIDs, device type, coarse UA family,
  salted IP hash, country/region (only from Vercel edge headers, no third-party geo lookup),
  `partner_slug` and 2-letter `state` when known.
- Funnel events (DTC): `screening_started`, `state_selected`, `screening_result_viewed`,
  `save_progress_clicked`, `account_created_started/completed`, `checkout_started`,
  `checkout_completed` (server-confirmed only), `packet_builder_started`, `packet_generated`.
- Funnel events (RCAP partner): `partner_landing_viewed`, `partner_intake_started`,
  `partner_account_started`, `partner_screening_started`, `partner_result_viewed`,
  `partner_packet_builder_started`, `partner_packet_generated`.
- Funnel metadata is limited to low-cardinality, public-safe values: `state` code, `result_code`,
  `packet_allowed`, `partner_slug`, `mode`.

## What is NEVER tracked

Enforced in `src/lib/analytics/sanitize.ts` (browser + server, defense in depth) and by the
service-role-only RLS on the table:

- Raw IP (only a salted HMAC `ip_hash`; null when the salt is unset — never a weak hash).
- Screening answers or any criminal-record detail (charges, offenses, convictions, dockets,
  case/court numbers, narratives, transcripts).
- Name, email, phone, address, DOB, SSN.
- Payment card data, Stripe identifiers/secrets, Supabase service keys, tokens.

Forbidden metadata keys are dropped and PII-looking string values are redacted before storage.

## Privacy posture

- **Anonymous by default.** `visitor_id`/`session_id` are random UUIDs with no identity linkage.
  `user_id` is attached only when a server-resolved session already exists, and only on low-volume
  funnel events (never pageviews).
- **Do Not Track honored.** If the browser sends DNT, the tracker sends nothing.
- **Client opt-out / disable.** Set `NEXT_PUBLIC_WEB_ANALYTICS_DISABLED=true` to disable the browser
  tracker; set `WEB_ANALYTICS_ENABLED=false` to make the server ingestion route a no-op.
- **Retention recommendation: 13 months.** Raw events older than 13 months should be pruned (a
  scheduled `delete from public.web_analytics_events where occurred_at < now() - interval '13 months'`);
  the daily rollup table can retain aggregates longer. Adjust to Roger/Lawrence's preference.

> ⚠️ **Privacy Policy review (Roger / Lawrence):** the public Privacy Policy should disclose
> first-party analytics and anonymous usage tracking. This change does not edit legal policy text.

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `WEB_ANALYTICS_IP_SALT` | server | HMAC salt for `ip_hash`. **Rotate** by changing this value; old hashes become non-correlatable. If unset, `ip_hash` is stored as null. |
| `WEB_ANALYTICS_ENABLED` | server | Set to `false` to make ingestion a no-op. Any other value = enabled. |
| `NEXT_PUBLIC_WEB_ANALYTICS_DISABLED` | client build | Set to `true` to disable the browser tracker. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | server | Existing service-role access used for writes/reads. |

**To rotate the analytics salt:** change `WEB_ANALYTICS_IP_SALT` in the environment and redeploy. No
schema change is required; previously stored `ip_hash` values simply stop correlating with new ones.

## Command Center integration contract

The dashboard lives **in this repo** (`/internal/command-center/web-traffic`, internal-admin gated)
and reads Supabase directly via `getWebAnalyticsSummary`. The summary API uses the same canonical
internal authorization boundary:

- **Endpoint:** `GET /api/internal/analytics/summary?range=1d|7d|30d`
- **Auth:** a server-verified Supabase session whose Auth UUID has an active global
  `partner_users.internal_admin` membership. Unauthenticated requests receive 401 and authenticated
  non-internal requests receive 403 before analytics data loads. Email/domain strings, partner roles,
  and API keys cannot substitute. A future external consumer requires a separately reviewed
  service-to-service contract; the legacy analytics bearer key is not an internal-admin authority.
- **Response:** aggregate-only JSON (no rows, no visitor/session IDs):

```json
{
  "range": "7d",
  "totals": { "pageviews": 0, "visitors": 0, "sessions": 0 },
  "byDomain": [{ "domain": "expungement.ai", "pageviews": 0, "visitors": 0 }],
  "topPages": [{ "path": "/", "domain": "expungement.ai", "pageviews": 0 }],
  "topReferrers": [{ "referrer": "google.com", "pageviews": 0 }],
  "utmCampaigns": [{ "campaign": "spring", "source": "newsletter", "pageviews": 0 }],
  "byPartner": [{ "partner_slug": "acme", "pageviews": 0, "events": 0 }],
  "funnels": {
    "expungementAi": { "screeningStarted": 0, "resultViewed": 0, "checkoutStarted": 0, "checkoutCompleted": 0, "packetGenerated": 0 },
    "rcap": { "partnerLandingViewed": 0, "partnerScreeningStarted": 0, "partnerResultViewed": 0, "partnerPacketGenerated": 0 }
  },
  "meta": { "rowsScanned": 0, "truncated": false }
}
```

## Migration (requires Roger to apply — not applied by this work)

`supabase/phase-40-web-analytics-events.sql` creates `public.web_analytics_events` and
`public.web_analytics_daily_rollups` (RLS enabled, service-role policies). **It has not been run.**
Apply it through the normal DB process before production traffic is expected to be stored.

## Verifiers

- `npm run analytics:verify-web-tracking` — tracker installed on all three surfaces, ingestion route
  validates event names, summary API present.
- `npm run analytics:verify-command-center-summary` — summary API auth + shape, dashboard consumes it.
- `npm run analytics:verify-privacy-guardrails` — no raw IP, forbidden keys rejected, no service-role
  key in client code, analytics never blocks user flows.
