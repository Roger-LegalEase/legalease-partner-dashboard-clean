# Shared Content Publishing Platform (Phase 43)

One content system serving two public destinations:

| Destination | Public host | Internal route group |
| --- | --- | --- |
| Expungement.ai (consumer) | `expungement.ai` | `/expungement-ai/*` |
| LegalEase Partner (B2B) | `legaleasepartner.com` | `/partners/*` |

Host routing is an allowlist in `src/proxy.ts`. It does **not** block un-allowlisted paths — it simply
does not rewrite them, and they fall through to the root app router. That means a top-level
`src/app/blog` would be served on *every* domain. Always add public content routes under the
destination's route group, never at the app root.

---

## Why the architecture looks like this

### 1. The structured document is the source of truth, not HTML

`content_posts.doc` holds a validated block document (Tiptap/ProseMirror shape, typed as `ContentDoc`
in `src/lib/content/types.ts`). Public HTML is **derived** from it by `src/lib/content/renderer.ts`
and cached in `rendered_html`.

The renderer is an **allowlist, not a sanitizer**:

- unknown node types and marks are dropped, not passed through;
- every text value is HTML-escaped in both text and attribute position;
- every URL goes through `safeUrl()`, which rejects `javascript:`, `data:`, `vbscript:`, `file:`,
  control-character-smuggled schemes (`java\tscript:`), and protocol-relative `//host` URLs;
- there is **no raw-HTML block and no `dangerouslySetInnerHTML` of editor output**, by construction.

The editor never sends HTML to the server. If you are tempted to add a "trusted HTML" field: that is
the exact thing this design prevents. Attacks are asserted in
`scripts/verify-content-renderer-sanitization.mjs`.

The article page *does* use `dangerouslySetInnerHTML`, and that is correct — it renders the output of
the allowlisting renderer, not user input.

### 2. There is exactly one legal-rules database, and it is not this one

State resource pages (`/resources/[jurisdiction]`, all 50 states + DC) read the record-clearing engine
through **one** fail-closed adapter: `src/lib/content/state-resources.ts`.

Each page has two layers:

- **LOCKED** — derived from the already-live public state projection
  (`src/lib/expungement-ai/state-landing/state-landing-data.ts`). Exactly seven fields cross the
  boundary: `code`, `name`, `slug`, `primaryConsumerTerm`, `avoidUniversalExpungementLabel`,
  `allowedStateTerms`, `pathwayHighlights` (pathway **labels** only). Not editable in the CMS.
- **EDITORIAL** — authored in the CMS (`content_state_editorial`): intro, overview, featured image,
  approved FAQs, related articles, approved partner quote, announcement, SEO/social meta, CTA.
  Contains **no legal rules**.

The CMS renders the locked panel read-only and clearly marked, so an editor cannot contradict the engine.

> **Deliberate non-reuse.** The adapter does *not* use the engine's own `projectPublicProfile()` /
> `PublicJurisdictionProfile`, even though that projection is now itself allowlist-by-construction
> (it used to pass `copyGuardrails` — raw internal source-corpus text in several profiles — straight
> through to an anonymous endpoint; fixed in `fix(expungement): restrict public state profile
> projection`, commit `290fe0c`).
>
> The reason to keep them separate is not the old bug: it is that `projectPublicProfile()` is a
> **screening** contract, shaped by what the eligibility flow needs (questions, flow stages,
> lifecycle phases). A **publishing** contract needs a different, much narrower set of fields, and
> tying an editorial page to the screening payload would mean every future screening field silently
> becomes public web copy. The two projections answer different questions and are allowed to diverge.

`assertNoInternalLeak()` re-checks every assembled payload against 31 internal markers (source hashes,
QA notes, decision rules, generator config, counsel ratification) and **throws** rather than rendering.
A jurisdiction only renders at all if the state-promotion manifest marks it approved and live for the
Expungement.ai channel. Verified by `scripts/verify-content-state-resources.mjs`.

**Never invent** eligibility criteria, waiting periods, exclusions, forms, fees, filing instructions,
legal effects, or immigration consequences. If the engine does not say it, the page does not say it.

### 3. Legal review cannot be skipped

Content that is legally substantive — `state_resource`, `resource_guide`, or **anything flagged
`legal_sensitive`** — cannot reach `published`, `updated`, or `scheduled` without a recorded legal
approval.

This is enforced **twice**, deliberately:

- app layer: `evaluateTransition()` in `src/lib/content/workflow.ts` (gives a human a clear reason);
- database layer: the `content_posts_legal_review_required_check` CHECK constraint (cannot be bypassed
  by a direct DB write, a script, or a service-role client).

Not even a `primary_admin` can publish an unreviewed state resource. Scheduling does not bypass it either.

### 4. Drafts are invisible to the public in the database, not just in the app

The RLS policy `content_posts_select_public` admits only:

```sql
status in ('published','updated') and published_at is not null and published_at <= now()
```

A draft, a scheduled post with a future date, anything in review, and anything archived are unreadable
by `anon` **even through a direct PostgREST call with a leaked anon key**. The repository layer filters
identically — belt and braces.

Proven under a real unprivileged Postgres role in `scripts/test-content-platform-schema.mjs`.

### 5. The audit log is genuinely append-only

`content_audit_events` has no UPDATE/DELETE policy *and* a trigger that raises on UPDATE/DELETE. The
trigger matters: `service_role` bypasses RLS, so without it an operator script could quietly rewrite
history. Verified as a superuser in the schema test.

---

## Roles

Content roles live in `content_admin_users`. There is **no second login system and no hardcoded
administrator email**. An existing trusted internal admin (`public.is_internal_admin()`, phase 21) is a
content `primary_admin` implicitly.

| Role | Can |
| --- | --- |
| `primary_admin` | Everything |
| `editor` | Create/edit any, editorial approve, publish, schedule, archive, restore, media, social draft/approve, taxonomy |
| `legal_reviewer` | Read + **legal approve** (only this role and `primary_admin` can) |
| `social_manager` | Read, media upload, social draft/approve/**send** |
| `contributor` | Create + edit **own** drafts, submit for review, upload media |
| `partner_contributor` | Create + edit **own partner's** drafts only. Cannot publish. |
| `viewer` | Read |

`partner_contributor` is row-scoped by RLS: a partner contributor **cannot see or write another
partner's drafts**. Proven in the schema test.

---

## Workflow

```
draft → in_editorial_review → in_legal_review → approved → scheduled → published → updated
  ↘ changes_requested ↩                            ↘ published
  → archived (from any state) → draft (restore)
```

Every approval, rejection, override, publication, schedule, archive, restore, and promotion send is
written to `content_audit_events`.

---

## Media

Supabase Storage bucket `content-media` (created by the migration). Uploads are **server-side only**;
there are no unauthenticated public writes.

| Blocks publication | Warns |
| --- | --- |
| Missing alt text | Low resolution for a featured image |
| **Unknown permission status** | Missing credit on a licensed asset |
| Unsupported MIME / SVG | GIF used as a social asset |
| Oversized file (>12 MB; GIF >3 MB) | Missing social variants |

The declared `Content-Type` is attacker-controlled, so the upload route sniffs **magic bytes**
(`sniffImageMimeType()`) and rejects an HTML or SVG payload renamed to `.png`.

Permission states: `owned`, `licensed`, `partner_approved`, `user_consented`, `editorial_use`, `unknown`.
`unknown` **blocks** — publishing an image whose rights we cannot account for is the most expensive
mistake a publishing platform can make.

---

## Social promotion

Per-channel drafts for LinkedIn, X, Facebook, Instagram, Threads, Email, and a Partner kit. Caption
limits are enforced server-side (X = 280). Deterministic branded graphics in 1200×630, 1080×1080, and
1080×1350 across six templates, rendered from **real repo brand assets** — never AI-generated imagery.
The whole workflow works with **no AI API key**.

**Publishing an article and sending its promotion are separate actions.** See
`docs/COMMAND_CENTER_CONTENT_INTEGRATION_HANDOFF.md` for the outbound contract.

---

## Analytics

Content events are in the allowlist in `src/lib/analytics/event-names.ts`
(`content_article_viewed`, `content_cta_clicked`, `content_share_clicked`, `content_link_copied`,
`content_related_clicked`, `content_resource_downloaded`, `content_state_selected`,
`content_promotion_sent`, `content_promotion_status_changed`). Anything not on the allowlist is dropped
with a 400 at the ingestion boundary.

⚠️ The meta-key blocklist in `src/lib/analytics/sanitize.ts` matches **normalized substrings**. These
keys are silently dropped and will look like broken analytics:

- `article_name`, `page_name` → contains `name`
- `description` → contains **`ip`** (descr-**ip**-tion)
- `record_type`, `use_case`, `charge_type` → contain `record` / `case` / `charge`

Use `article_slug`, `cta_id`, `jurisdiction`, `state` (2-letter, uppercase), `product_surface`.

`content_promotion_sent` and `content_promotion_status_changed` are **server-only** — a browser cannot
forge them.

---

## Running it

```bash
npm run content:test-schema        # migration + RLS in hermetic PGlite
npm run content:verify-renderer    # XSS / sanitization
npm run content:verify-resources   # 51 states, no internal leak
npm run content:verify-workflow    # legal gate, roles, media
npm run content:verify-command-center  # HMAC, replay, idempotency
npm run content:verify-routes      # route + metadata coverage
```

Host routing is **inert on localhost** (`normalizeHost("localhost:3000")` matches no branch). To
exercise the public paths locally, hit the internal route or spoof the Host header:

```bash
curl -H "Host: expungement.ai" http://localhost:3000/blog
curl -H "Host: legaleasepartner.com" http://localhost:3000/insights
```

---

## Deployment prerequisites (none are done)

1. **Review and apply `supabase/phase-43-content-platform.sql`.** It has *not* been applied to any
   database. It requires phase 21 (`public.is_internal_admin()`).
2. Create the `content-media` storage bucket (the migration does it when the `storage` schema exists).
3. Assign content roles in `content_admin_users` (internal admins already have `primary_admin`).
4. Set `CONTENT_SCHEDULER_SECRET` and point a cron at `POST /api/content/scheduler/run`. Without the
   secret the route returns 503 rather than running unprotected.
5. Configure the Command Center env vars **only** once the receiving endpoint exists.
