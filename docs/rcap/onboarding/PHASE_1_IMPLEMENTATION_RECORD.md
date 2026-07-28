# RCAP Partner Onboarding Phase 1 implementation record

## Repository and baseline

- Repository: `Roger-LegalEase/legalease-partner-dashboard-clean`
- Isolated worktree: `/workspaces/legalease-partner-dashboard-clean-rcap-onboarding-phase1`
- Branch: `feat/rcap-partner-onboarding-phase-1`
- Base commit: `3fd6d5cfc2622c9d6d3693df2f32438fac1d1915`
- Starting worktree: clean. The original `feat/partner-access-codes` worktree was dirty, so it was not modified.
- Package manager: npm with `package-lock.json` lockfile version 3.
- Runtime observed: Node `v24.14.0`; the repository does not pin Node through `engines`, `.nvmrc`, or `.node-version`.

## Architecture and routes found

The repository is a Next.js App Router application. `src/proxy.ts` performs host routing and Supabase cookie refresh. The authenticated partner surface uses `/partner/dashboard`, `/partner/team`, `/partner/access-codes`, and `/partner/onboarding`. There is no shared partner layout; the dashboard's warm background, navy typography, restrained cards, and compact action rows are the de facto shell.

The existing canonical partner onboarding route was session-scoped but exposed only a checklist. Phase 1 keeps `/partner/onboarding` canonical and adds `/partner/onboarding/[sectionKey]` plus `/partner/onboarding/review`. The former slug routes now redirect only a matching authenticated partner administrator to the canonical route while the flag is enabled; legacy mutations return `410`. Flag-off behavior remains the pre-change checklist and legacy flow.

## Authentication, membership, role, and admin boundaries

- Supabase session identity is resolved by `resolveSessionPartner()`.
- Exactly one active `partner_users` row is required for each authenticated user.
- `partner_admin` and `partner_staff` identities are partner-scoped; `internal_admin` is unscoped.
- Partner identity is derived from `auth.uid()`, not a URL or payload.
- The existing dashboard repository uses the request-scoped Supabase client and RLS.
- Phase 1 partner mutations require `partner_admin`. Partner staff remain status-only.
- Internal operations reuse the existing internal-admin boundary.
- Partner reads use the request-scoped session client and RLS. Durable mutations use a narrow server-only client to call typed, `SECURITY INVOKER`, service-role-only RPCs that independently revalidate the supplied server-session actor against active membership.
- The root `AGENTS.md` ordinarily requires separate approval for auth/RLS changes. This task explicitly authorizes local additive migrations and RLS and prohibits remote application, so the safer local-only boundary governs this implementation.

## Existing models reused

- `partner_records`: authoritative organization identity, public slug, selected package, and verified payment/provisioning state.
- `partner_users`: authoritative authenticated membership and role.
- `partner_entitlement`: authoritative sponsored scope, allocation, credits, and overage configuration.
- `partner_records.access_mode` and `partner_access_codes`: authoritative participant access behavior.
- `partner_billing_requests`: invoice-request/reconciliation history. Verified paid provisioning writes `partner_records.payment_status = 'paid'`; Phase 1 uses that partner record as its authoritative paid-invoice gate and records a canonical `partner_record:<uuid>` evidence reference.
- `partner_onboarding`: existing workspace identity and legacy lifecycle record; Phase 1 extends it instead of creating a second workspace store.
- Existing phase-42 checklist rows remain compatibility data. Phase 1 section state and change requests use dedicated records because the legacy task statuses and internal-note placement are not safe or semantically compatible.

## UI, validation, and storage patterns reused

- Existing `Card`, `Button`, and `Badge` primitives and the current dashboard utility/color patterns.
- Dashboard color/spacing hierarchy and Expungement.ai's guided progression, helper copy, inline validation, and save-state language.
- Zod for authoritative server validation.
- UUID request IDs, structured safe errors, strict same-origin checks, bounded streaming request readers, and private/no-store responses.
- The request-scoped Supabase auth client for partner reads and server-session actor resolution.

No private Supabase Storage abstraction or bucket existed in the repository. Phase 1 adds one narrow server-only helper and private bucket with immutable server-generated paths, category/type/size/signature/dimension checks, real ZIP-structure and macro checks for DOCX, compensating deletion, and ten-minute signed operations. SVG, executable, archive, and malformed Office content is rejected.

RecordShield scope is derived from `partner_records.selected_package_id` and the existing package component registry in `src/lib/partners/packages.ts`. A recognized selected package exposes RecordShield-dependent read-only scope only when its canonical component list includes `RecordShield`. Missing or unknown package IDs fail closed with source `unavailable`; Phase 1 does not invent a second scope flag.

## New logical entities

- Eight versioned onboarding sections.
- Normalized onboarding contacts.
- Normalized planned dashboard users.
- Normalized report recipients.
- Section change requests/review decisions.
- Private organizational asset metadata.
- Partner-safe agreement/procurement metadata.
- Immutable authorization submissions.
- Partner-safe meaningful activity.
- Local append-only integration events.
- Mutation idempotency records.

Each entity exists because it needs stable identity, review, future action, auditability, or tenant-specific authorization. Section JSON is limited to section-specific scalar/list configuration and does not duplicate authoritative contacts, users, recipients, assets, billing, or access controls.

## Canonical state machine

Workspace states:

`draft`, `commercially_blocked`, `setup_in_progress`, `waiting_on_partner`, `ready_for_review`, `ready_to_launch`, `live`, `paused`, `closed`.

Section states:

`not_started`, `in_progress`, `submitted`, `needs_changes`, `approved`, `waived`, `not_applicable`.

Partners can save drafts, complete sections, respond to change requests, manage permitted assets, and submit for review. Only internal actors can provision a workspace, change commercial/agreement truth, request changes, approve/waive sections, decide ready-for-launch, or close a workspace. The database enforces transitions and optimistic versions. Phase 1 exposes no live/pause/activation/publication/invitation action.

Paid-invoice clearance is accepted only when the locked authoritative partner record is already `paid`; browser/internal free text cannot spoof it. Approved-purchase-order clearance requires a bounded evidence reference because no authoritative PO ledger exists in this repository. Authorized overrides require a durable internal reason. Target-date changes persist the internal actor, server timestamp, and bounded reason; ready-for-launch and close decisions also persist their internal actor/reason evidence without exposing that material through partner-safe projections.

Every derived-state writer locks the exact workspace and compares `expectedWorkspaceVersion` before writing completion, blocker, next action, owner, or aggregate version. Section saves additionally compare the section revision. Section, asset, commercial, and procurement/agreement summaries are calculated from canonical server reads and are committed only if that aggregate CAS succeeds. Submission and review actions derive or validate their transitions after the same lock. Two mutations from the same aggregate version therefore cannot silently overwrite one another.

The operational change-request lifecycle is `open -> partner_responded -> resolved`. `partner_responded` remains unresolved, moves the section back to submitted review, sets the workspace to `ready_for_review`, and assigns the next action to LegalEase. An additional LegalEase request resolves the prior response and creates one new `open` request. Approval/waiver resolves open or responded requests and recalculates ownership. The schema reserves `cancelled`, but Phase 1 exposes no cancellation control or transition.

An internal final agreement-document selection authorizes only a selected same-workspace private PDF/DOCX and attaches it atomically; draft agreement records cannot expose a partner download.

## Canonical ownership and artifact consumers

The typed registry at `src/lib/partners/onboarding/schema.ts` contains 110 canonical field definitions and is the source for field ownership, validation limits, active required fields, completion, labels, normalization, sensitivity, and future artifact mapping. Canonical values such as `public_organization_name`, `website`, `public_program_name`, `enable_spanish`, `jurisdictions`, and `service_area_description` are stored once and referenced by review/public-page consumers. Jurisdictions reuse the repository's compiled all-51 state/DC inventory.

Future consumers are: order form, implementation brief, operations plan, dashboard user matrix, launch readiness, staff quick start, launch kit, reporting package, and public partner page.

## Migration and rollback

`supabase/phase-43-rcap-partner-onboarding-phase1.sql` follows Phase 42 and is forward-only/additive. It does not create Phase 1 workspaces for existing partners, publish pages, create memberships/access codes, or activate programs. Explicit internal creation can attach the pre-existing Phase 42 row without downgrading an existing `live` record. Browser roles receive read-only, column-bounded, tenant-RLS access to partner-safe data; internal notes, object paths, hashes, event payloads, idempotency rows, and authoritative mutation capability are withheld. All new mutation functions are `SECURITY INVOKER`, use an empty fixed `search_path`, are revoked from `public`/`anon`/`authenticated`, and grant execute only to `service_role`. Finalized agreement files cannot be partner-replaced or deleted.

Rollback:

1. Set `RCAP_PARTNER_ONBOARDING_ENABLED=false`.
2. Revert the application code.
3. Leave additive tables and columns dormant.

No destructive database rollback is required or planned.

## Focused pre-change baseline

Run locally on 2026-07-28:

- `node scripts/verify-rcap-partner-onboarding.mjs` — passed.
- `node scripts/verify-partner-team-invites.mjs` — passed.
- `node scripts/test-billing-reconciliation.mjs` — passed.
- `node scripts/test-partner-dashboard-action-layer.mjs` — passed.

The repository's live Supabase RLS/browser scripts were not run: they load provider credentials and can target a remote project, which is prohibited for this task. New Phase 1 database proof uses an in-process PGlite database and two synthetic tenants.

Focused implementation checks currently recorded:

- `node scripts/verify-rcap-partner-onboarding-domain.mjs` — passed.
- `node scripts/verify-rcap-partner-onboarding-phase1-database.mjs` — passed, including actual `SET ROLE` tenant/RLS tests.
- `node scripts/verify-rcap-partner-onboarding-service.mjs` — passed, 32/32.
- `node scripts/verify-rcap-partner-onboarding-security.mjs` — passed, 46/46 with zero network attempts.

## Expected change surface

- One additive phase migration and synthetic local verification fixture.
- New `src/lib/partners/onboarding/*` schema, validation, derivation, repository/service, storage, and request-security modules.
- Session-scoped onboarding API routes and minimal internal review operations.
- `/partner/onboarding` home, section editor, review, and asset UI.
- Partner dashboard card/navigation integration.
- Legacy onboarding route consolidation.
- Focused PGlite, service, concurrency, authorization, asset, and source-wiring verifiers.
- No dependency or lockfile change.

## Material risks and inconsistencies

- Phase 42 auto-backfilled all partners and uses lifecycle/task enums that do not match this Phase 1 contract.
- Phase 42 puts internal notes in rows that authenticated partner users can directly select through PostgREST. Projection code alone does not protect those columns.
- Existing phase-42 partner reads and writes use the service role rather than session-scoped RLS.
- The existing checklist API permits `partner_staff` mutation.
- The legacy slug onboarding page and body-slug API are not session-authorized.
- Supabase migrations are manually ordered phase SQL files, not a CLI migration ledger.
- No local Supabase Auth/PostgREST/Storage stack or synthetic authenticated browser fixture is checked in. PostgreSQL behavior is proven with PGlite and application/storage behavior with isolated service tests, but authenticated browser journeys, actual Storage signed-URL TTLs, and screenshots cannot be honestly produced without a separately provisioned loopback-only stack.
- The schema supports a future `cancelled` change-request state, but Phase 1 intentionally exposes no cancel action.
- `approved_purchase_order` remains an auditable internal evidence reference because this repository has no authoritative PO approval ledger. A future integration must replace that reference with a signed authoritative source rather than add another browser-editable flag.
- A clean detached worktree at the recorded base SHA ran `npm run typecheck` once and returned zero diagnostics. The feature worktree command ran once and found three generated `.next/types` `TS2344` diagnostics for helper exports in unchanged base files (`resume/confirm/route.ts`, `partners/access-codes/route.ts`, and `auth/set-password/page.tsx`). `git diff --exit-code` proved those source files are byte-for-byte outside this Phase 1 diff. A subsequent clean production build regenerated Next output and its TypeScript phase passed, but the required standalone feature command itself did not pass and is not reported as passing.

## Final local gate

- Phase 1: domain passed (`110` registry fields, `7` asset categories, `8` sections); security passed `46/46`; service/concurrency passed `32/32`; PGlite database/RLS/CAS/lifecycle passed; Phase 42 compatibility verifier passed.
- Adjacent partner repository/admin/write/dashboard, team, billing, entitlement, intake, Briefcase, attribution, result CTA, and request-pilot regressions passed.
- `npm run lint`: exit 0 with zero errors and ten warnings in unchanged baseline files. Focused lint of the final build fixture and whitespace-only cleanup also passed.
- Base `npm run typecheck`: exit 0, no diagnostics. Feature `npm run typecheck`: exit 2 with the three unchanged-base generated route diagnostics listed above and no Phase 1-file diagnostic.
- `npm test`: the first 22 commands passed. It then stopped because `test-inspect-local-record-clearing-pdfs.mjs` intentionally requires no dirty live-route/migration paths; the paired Nebraska guard failed for the same authorized uncommitted Phase 1 paths. The remaining downstream commands were run directly and all passed.
- `npm run build`: final retry passed under Next 16.2.6 Turbopack with telemetry disabled, the repository-local static font-response map, and loopback-only synthetic public Supabase configuration. Its TypeScript phase and all 114 static-page generations passed. No service credential or provider endpoint was used.
- `git diff --check` passed. A separate no-index whitespace check covered every untracked file and passed.
- Authenticated browser journeys and required screenshots were not run. The Supabase CLI is absent, Docker has no local images/containers, and the repository has no Supabase config, compose stack, Auth/PostgREST/Storage fixture, or authenticated Playwright harness. No insecure test bypass was added. Actual Supabase Auth cookies, Storage enforcement/signed-URL expiry, and browser console/network/visual results therefore remain unverified locally; no screenshots were produced.
