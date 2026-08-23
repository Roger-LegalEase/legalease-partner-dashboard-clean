# Clinic Mode gap register

Overall verdict: **CLINIC_MODE_UNSAFE**. Counts: P0 4, P1 11, P2 2, P3 1.

## CLINIC-P0-001: No shared-device session boundary or reset; prior participant state can remain visible

- Severity: **P0**
- Affected role: participant and clinic staff
- Route: `/expungement-ai/screening/[state]?session=[uuid]; /briefcase; all proposed clinic routes`
- Actual: No End clinic session/Reset device action. Auth cookies persist; screening session UUID remains in history; resume payload with answers is temporarily stored in sessionStorage; no bfcache/history/autofill/cache purge contract exists.
- Required: Atomic end-session action that revokes assistance, signs the participant out, clears all sensitive client state and caches, prevents Back leakage, and returns to a clean event entry.
- Reproduction: Start ordinary participant sign-in/intake in one browser profile. → Observe authenticated cookie and screening URL containing ?session=<uuid>. → Use email resume and observe expungement-ai:resume-session in sessionStorage before ScreeningFlow removes it. → Search UI/source for End clinic session or Reset device: none exists. → Attempt the mandated next-participant reset: no product action is available.
- Evidence: `src/components/expungement-ai/screening/ResumeScreeningClient.tsx:47`, `src/components/expungement-ai/screening/ScreeningFlow.tsx:155-175`, `data/rcap-clinic-mode-audit/browser-evidence.json`, `tests/e2e/rcap-clinic-mode-audit/ten-participant-shared-device-audit.mjs`
- Owner: Clinic security
- Smallest safe correction: Add a dedicated server-backed assisted-session boundary and reset control; eliminate answer payloads from Web Storage; set no-store/bfcache protections; validate ten sequential participants.
- Migration required: true
- Human/legal/operations decision: Privacy/security must approve the reset and retention contract.

## CLINIC-P0-002: Caller-supplied screening UUID is not participant-bound, enabling answer overwrite and sponsorship replay

- Severity: **P0**
- Affected role: participant
- Route: `POST /api/expungement-ai/screening/save-resume; POST /api/expungement-ai/screening/pending; pending claim; packet generate`
- Actual: Public save/resume accepts a caller-provided sessionId and service-role upserts it. Public pending-result creation accepts product=rcap_partner and any UUID. Sponsorship checks session flags but not the authenticated participant owner.
- Required: Every session must be cryptographically/relationally bound to the participant account or a one-time pre-auth handoff; no UUID alone may authorize writes or sponsorship.
- Reproduction: Obtain a partner screening session UUID (the ordinary URL/history exposes it). → POST save-resume with that UUID, new answers and a different email. → POST pending with product=rcap_partner and the same sourceSessionId. → Authenticate as another synthetic participant and claim; static trace shows no user/session equality check.
- Evidence: `src/app/api/expungement-ai/screening/save-resume/route.ts:22-69`, `src/lib/expungement-ai/screening-resume-service.ts:248-267`, `src/app/api/expungement-ai/screening/pending/route.ts:65-84`, `src/app/api/expungement-ai/packet/generate/route.ts:29-63`
- Owner: Participant identity and sponsorship security
- Smallest safe correction: Add owner/handoff binding, reject mutation/claim on mismatch, rotate/remove URL capability, and invalidate it at reset.
- Migration required: true
- Human/legal/operations decision: Security review of pre-auth-to-account handoff.

## CLINIC-P0-003: Final report endpoint permits unauthenticated cross-tenant aggregate reads through service role

- Severity: **P0**
- Affected role: unauthenticated user and all partners
- Route: `POST /api/partner-reports/final`
- Actual: Route accepts arbitrary partnerId/partnerName and calls a service-role report loader without authentication or tenant authorization. Weekly endpoint is also unauthenticated and seeded.
- Required: Authenticate, authorize partner/internal role, derive partner scope server-side, deny cross-tenant requests, and distinguish live from seed output.
- Reproduction: Send POST JSON with an arbitrary known partnerId to /api/partner-reports/final without cookies. → Observe no auth call in route and service-role .eq(partner_slug, caller value) in loader. → Repeat with another partnerId.
- Evidence: `src/app/api/partner-reports/final/route.ts:15-47`, `src/lib/reports/partner-final-impact-report-data.ts:74-115`, `src/app/api/partner-reports/weekly/route.ts:15-49`
- Owner: Reporting security
- Smallest safe correction: Require session partner, derive/validate partner slug, restrict internal override, add negative route tests; fail closed if seed mode is active outside development.
- Migration required: false
- Human/legal/operations decision: Define which aggregate fields each partner role may export.

## CLINIC-P0-004: Sponsored packet can be generated when credit accounting reports not recorded

- Severity: **P0**
- Affected role: participant and partner sponsor
- Route: `POST /api/expungement-ai/packet/generate`
- Actual: Packet generation completes before credit RPC. The route awaits but ignores recorded/reason. SQL returns recorded=false for already_recorded, no_entitlement, paused_at_cap and cap_reached_no_overage; the ready packet is not rolled back.
- Required: Sponsorship authorization and atomic reservation must precede/cover generation; a ready sponsored artifact and exactly one valid ledger result must commit together or fail closed.
- Reproduction: Use a partner session already marked consumed, missing entitlement, or cap reached without overage. → Associate it to an owned Briefcase item through the unbound source-session path. → Generate packet; static route trace shows accounting result is discarded after ready artifact.
- Evidence: `src/app/api/expungement-ai/packet/generate/route.ts:51-69`, `supabase/phase-41b-rcap-screening-analytics.sql:193-290`
- Owner: Payment/accounting platform
- Smallest safe correction: Reserve/validate sponsorship atomically before generation and require a recorded included/overage result before releasing artifact; add ledger reconciliation.
- Migration required: true
- Human/legal/operations decision: Confirm approved no-overage behavior and failure compensation.

## CLINIC-P1-001: No canonical Clinic Mode event model, routes, or management surfaces

- Severity: **P1**
- Affected role: all
- Route: `NO CURRENT ROUTE`
- Actual: A general onboarding enum may say Clinic/Event, but there is no clinic event CRUD, exact schedule/timezone/location/status, event page, or clinic navigation.
- Required: Canonical tenant-scoped clinic event with internal, partner and participant surfaces.
- Reproduction: List src/app routes and API handlers. → Search schema/migrations for clinic_events and event foreign keys. → Open /internal/clinic, /partner/clinic and /clinic/audit-event; all return 404.
- Evidence: `data/rcap-clinic-mode-audit/browser-evidence.json`, `src/lib/partners/onboarding/schema.ts:561-600`, `supabase/partner-journey-os.sql:128-138`
- Owner: Clinic product and data platform
- Smallest safe correction: Create event entity/CRUD/access layers and wire it to existing partner identity without inventing a permanent clinic role.
- Migration required: true
- Human/legal/operations decision: Confirm event lifecycle/status and ownership semantics.

## CLINIC-P1-002: No event attribution across session, matter, packet, follow-up or reports

- Severity: **P1**
- Affected role: all
- Route: `/intake/[partnerSlug] and downstream`
- Actual: Only partner_slug, access-code ID, campaign_name and coarse attribution_source survive on screening session; event identity is absent downstream.
- Required: Immutable event ID consistently bound to participant session, matter, packet, credit ledger, follow-up and reporting.
- Reproduction: Start at /intake/[partnerSlug] with code/campaign. → Inspect phase-41/41b columns. → Inspect Briefcase, document packet, follow-up and report models for event_id: none.
- Evidence: `supabase/phase-41-rcap-partner-access-codes.sql:153-178`, `supabase/phase-41b-rcap-screening-analytics.sql:26-62`
- Owner: Clinic data platform
- Smallest safe correction: Add canonical event foreign keys and immutable server propagation; reject partner/program/event disagreement.
- Migration required: true
- Human/legal/operations decision: Set attribution retention and late/reassigned event rules.

## CLINIC-P1-003: Assisted intake, consent, ephemeral staff access and approved event staff are absent

- Severity: **P1**
- Affected role: clinic staff and participant
- Route: `NO CURRENT ROUTE`
- Actual: Only permanent partner_admin/partner_staff memberships and participant-owned normal flow exist. There is no assistance consent, staff actor identity, decline path, session expiry or event staff membership.
- Required: Personal staff accounts, event-scoped approval, explicit participant consent and automatically expiring least-privilege assistance while participant stays owner.
- Reproduction: Inspect partner_users roles and team routes. → Search assisted/consent/event staff models and routes. → Attempt to locate a staff-assisted entry: none.
- Evidence: `src/lib/partners/session-partner.ts:5-18`, `supabase/phase-21-partner-auth-rls-foundation.sql:15-75`
- Owner: Clinic product, identity, privacy
- Smallest safe correction: Implement event membership, assistance session and explicit consent ledger with post-session denial tests.
- Migration required: true
- Human/legal/operations decision: Counsel/privacy approve consent text and allowed assistance scope.

## CLINIC-P1-004: Participant follow-up queue is documented but absent

- Severity: **P1**
- Affected role: partner staff/admin and participant
- Route: `NO CURRENT ROUTE`
- Actual: No participant follow-up entity or surface supports status, assignment, due date, contact method, event/jurisdiction filters, privacy or history. Onboarding tasks are setup tasks only.
- Required: Operational follow-up queue with canonical status semantics and approved data scope.
- Reproduction: Search routes and schema for participant follow-up. → Open /partner/follow-up; 404. → Inspect partner dashboard; it shows aggregate incompletes only.
- Evidence: `docs/rcap/RCAP_SOURCE_OF_TRUTH_v2.md:282-344`, `data/rcap-clinic-mode-audit/browser-evidence.json`
- Owner: Case journey and clinic operations
- Smallest safe correction: Implement follow-up records/queue with assignment, audit history, filters and least-privilege detail.
- Migration required: true
- Human/legal/operations decision: Operations/legal define statuses, contact permissions and closure rules.

## CLINIC-P1-005: No event reporting; generic reporting is partly seeded and conflates unsupported metrics

- Severity: **P1**
- Affected role: partner admin and LegalEase
- Route: `NO CURRENT CLINIC REPORTING ROUTE; adjacent /dashboard/partners and report APIs`
- Actual: No event filter/dimension, follow-up/referral/incident metrics, home market, or credit remaining per event. Internal dashboard uses seeded data including an Expungement Clinic campaign.
- Required: Truthful event-scoped aggregate reporting that separates started, screened, possible path, packet, filed and cleared.
- Reproduction: Open /partner/clinic/reports; 404. → Trace /dashboard/partners to partner-dashboard-data.ts. → Inspect report data models for event ID: none.
- Evidence: `src/lib/partner-dashboard-data.ts`, `src/lib/reports/partner-final-impact-report-data.ts`, `data/rcap-clinic-mode-audit/browser-evidence.json`
- Owner: Reporting
- Smallest safe correction: Build event-scoped live queries and labels; remove seed fallback from operational routes; add honest funnel assertions.
- Migration required: true
- Human/legal/operations decision: Approve aggregate/participant-detail reporting scope.

## CLINIC-P1-006: Partner staff can mutate access codes through APIs despite admin-only UI

- Severity: **P1**
- Affected role: partner staff
- Route: `/api/partners/access-codes; /api/partners/access-codes/toggle; /api/partners/access-mode`
- Actual: UI requires partner_admin, but resolveAuthorizedPartnerSlug authorizes both partner_admin and partner_staff; APIs do not re-check role and stamp createdBy=partner_admin.
- Required: Server-side partner_admin check for code/mode mutation and truthful actor identity.
- Reproduction: Authenticate as active partner_staff. → POST own partnerSlug to access-code or access-mode API. → Helper returns authorized own slug; route performs mutation.
- Evidence: `src/app/partner/access-codes/page.tsx:75-99`, `src/lib/partners/partner-scope-auth.ts:9-25`, `src/app/api/partners/access-codes/route.ts:36-69`
- Owner: Partner identity/security
- Smallest safe correction: Add server-side role-aware guards to every mutation and record auth user/actual role.
- Migration required: false
- Human/legal/operations decision: Confirm whether staff may read analytics but not mutate.

## CLINIC-P1-007: Launch-kit QR is general, unpublished and not event/code-specific

- Severity: **P1**
- Affected role: operator, partner admin, participant
- Route: `/internal/partners/onboarding/[partnerSlug]; /partner/onboarding/resources`
- Actual: QR encodes /p/[partnerSlug], marks published=false, and carries no event or code. It cannot prove final clinic attribution/access.
- Required: Approved event-specific QR bound to active event and safe code/handoff without exposing secrets in URL.
- Reproduction: Generate Partner Launch Kit with launch-prep enabled. → Inspect target URL and published flag. → Scan target; it enters ordinary partner page.
- Evidence: `src/lib/partners/onboarding/artifact-service.ts:704-722`, `src/lib/partners/onboarding/artifact-generator.ts:2484-2500`
- Owner: Clinic product and partner onboarding
- Smallest safe correction: Generate event QR only after event publication; bind attribution through a one-time/opaque event handoff.
- Migration required: true
- Human/legal/operations decision: Decide whether QR carries public event slug or opaque token.

## CLINIC-P1-008: Capacity and sponsorship are partner-wide, not event-scoped

- Severity: **P1**
- Affected role: operator and partner admin
- Route: `/partner/access-codes and packet generation`
- Actual: Onboarding stores planned code capacity, while enforcement uses partner_entitlement. No event allocation, capacity stop, sponsor owner, or per-event pool exists.
- Required: Event allocation and stop state that cannot leak or consume another event/tenant pool.
- Reproduction: Set planned code_level_capacity in onboarding. → Trace intake/claim/packet RPCs. → Observe they use partner entitlement and access-code max uses, not event allocation.
- Evidence: `src/lib/partners/onboarding/schema.ts:918-967`, `supabase/phase-41b-rcap-screening-analytics.sql:213-290`
- Owner: Clinic accounting
- Smallest safe correction: Add event allocation/ledger and enforce before claim/generation with tenant/event consistency constraints.
- Migration required: true
- Human/legal/operations decision: Define whether event pool reserves or draws from partner pool.

## CLINIC-P1-009: Planned reporting viewer role is not a runtime role

- Severity: **P1**
- Affected role: partner viewer
- Route: `partner portal`
- Actual: Onboarding accepts reporting_viewer as a planned role, but partner_users only permits partner_admin, partner_staff and internal_admin.
- Required: Either map viewer planning to an approved least-privilege runtime role or remove the false promise; do not invent uncontrolled clinic roles.
- Reproduction: Select reporting viewer in onboarding plan. → Inspect partner_users role CHECK and session resolver. → No runtime viewer can be provisioned.
- Evidence: `src/lib/partners/onboarding/schema.ts:143-154`, `supabase/phase-21-partner-auth-rls-foundation.sql:41-75`
- Owner: Identity and partner product
- Smallest safe correction: Make an explicit governance decision: approved read-only role with server/RLS tests, or remove planned viewer option.
- Migration required: true
- Human/legal/operations decision: Role governance decision required.

## CLINIC-P1-010: Clinic-day operating controls and incident lifecycle are absent

- Severity: **P1**
- Affected role: operator and clinic staff
- Route: `NO CURRENT ROUTE`
- Actual: General onboarding can record training, support, referral and program pause plans, but there is no device/network rehearsal, event monitor, incident record, pause/close control, end-of-day review or post-clinic job.
- Required: Executable clinic-day runbook backed by event controls and incident/follow-up records.
- Reproduction: Inspect launch-readiness definitions. → Search event monitor/incident/rehearsal/device/network routes and models. → No operational surface exists.
- Evidence: `src/lib/partners/onboarding/launch-readiness.ts:517-667`, `src/lib/partners/onboarding/schema.ts:1512-1701`
- Owner: Clinic operations
- Smallest safe correction: Add event readiness checklist, device/network rehearsal record, live monitor, incident/pause workflow and closeout review.
- Migration required: true
- Human/legal/operations decision: Operations define pause authority, incident severity and escalation SLAs.

## CLINIC-P1-011: No authorized staging target or complete fixture configuration for dynamic proof

- Severity: **P1**
- Affected role: auditor/release operator
- Route: `environment`
- Actual: Acceptance project reference, public URL, service key and hosted app URL are unavailable in this session. Local auth route returned 500 without Supabase public config. July production reconciliation shows phase-41/41b tables were repository-only then.
- Required: Authorized synthetic staging app and project with known applied migrations, test accounts, email capture and packet dry-run worker.
- Reproduction: Read data/rcap-staging-authorization-readiness.json. → Inspect environment presence without printing values. → Open /partner/access-codes locally; missing public Supabase config causes 500.
- Evidence: `data/rcap-staging-authorization-readiness.json`, `data/rcap-clinic-mode-audit/browser-evidence.json`, `docs/rcap/production/MIGRATION_20260728213131_RECONCILIATION.md:121-179`
- Owner: Release engineering
- Smallest safe correction: Provision an authorized synthetic staging target and publish redacted migration/flag/fixture evidence.
- Migration required: Current deployed migration state must be verified; no migration was applied in Phase A.
- Human/legal/operations decision: Release owner must authorize staging target and fixture creation.

## CLINIC-P2-001: Clinic/campaign vocabulary can falsely imply an event exists

- Severity: **P2**
- Affected role: operator and partner admin
- Route: `onboarding; /partner/access-codes; /dashboard/partners`
- Actual: Clinic is a program_model enum, campaign name placeholder says July clinic, and seeded dashboard includes Expungement Clinic.
- Required: Labels must distinguish generic program/campaign from a canonical clinic event.
- Reproduction: Choose Clinic program model. → Enter campaign July clinic. → Observe no event is created.
- Evidence: `src/lib/partners/onboarding/schema.ts:114-121`, `src/app/partner/access-codes/PartnerAccessCodesManager.tsx`, `src/lib/partner-dashboard-data.ts`
- Owner: Content design
- Smallest safe correction: Rename adjacent labels until a real event entity exists, then use event-linked selectors.
- Migration required: false
- Human/legal/operations decision: Content/product naming decision.

## CLINIC-P2-002: Authentication configuration failure renders a 500 instead of a safe denial

- Severity: **P2**
- Affected role: unauthenticated partner user
- Route: `/partner/access-codes`
- Actual: Missing Supabase public URL/anon key throws before SessionPartnerError handling, producing 500 in local browser audit.
- Required: Configuration preflight or safe unavailable state without stack-bearing product failure.
- Reproduction: Run app without Supabase public config. → Open /partner/access-codes. → Observe HTTP 500.
- Evidence: `data/rcap-clinic-mode-audit/browser-evidence.json`, `src/lib/supabase/config.ts:1-9`
- Owner: Platform
- Smallest safe correction: Add deployment preflight and safe error boundary for configuration absence.
- Migration required: false
- Human/legal/operations decision: false

## CLINIC-P3-001: No consolidated Clinic Mode operator documentation existed

- Severity: **P3**
- Affected role: all operators
- Route: `documentation`
- Actual: Repository had general partner/onboarding docs but no truth-first Clinic Mode access and runbook set.
- Required: Keep the Phase A guides current with implementation and rehearsal evidence.
- Reproduction: Search docs for dedicated Clinic Mode guide before this audit.
- Evidence: `docs/rcap-clinic-mode-audit/**`
- Owner: Clinic operations/documentation
- Smallest safe correction: Update these guides in Phase B alongside product changes and tests.
- Migration required: false
- Human/legal/operations decision: false
