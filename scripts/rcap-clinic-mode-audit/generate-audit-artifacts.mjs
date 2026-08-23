import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_SHA = "dd93579871962260b12918e54c44cf9bf1e81529";
const AUDIT_BRANCH = "codex/rcap-clinic-mode-audit";
const FIX_BRANCH = "codex/rcap-clinic-mode-phase-b";
const auditDate = "2026-08-23";
const dataDir = path.resolve("data/rcap-clinic-mode-audit");
const docsDir = path.resolve("docs/rcap-clinic-mode-audit");

await mkdir(dataDir, { recursive: true });
await mkdir(docsDir, { recursive: true });

const source = (file, lines, note) => ({ file, lines, note });

const intendedContract = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  auditDate,
  methodology:
    "Requirements are intentions only. A requirement is implemented only when UI, server authority, persistence, authorization, and operational result are connected.",
  repositorySearchResult:
    "No repository document defines a dedicated Clinic Mode. General RCAP and partner-onboarding documents describe adjacent requirements; the dedicated contract below originates in the user-supplied audit brief.",
  requirements: [
    ["REQ-001", "Canonical clinic event model", "LegalEase operator", "event setup", "partner/program/event identity, name, date, time, timezone, venue, status", "tenant-scoped event", "create/read/update/close an event"],
    ["REQ-002", "Event code and final QR", "operator and partner admin", "event assets", "event code, QR destination, state", "code cannot cross tenants or outlive event", "valid, expired, exhausted, and disabled paths"],
    ["REQ-003", "Approved event staff", "operator and partner admin", "staff management", "event membership and role", "reuse controlled permanent roles; event access expires", "staff can access only assigned event"],
    ["REQ-004", "Supported geography and out-of-area routing", "participant", "clinic entry and intake", "event geography and referral route", "unsupported route never becomes sellable", "inside/outside-area journeys"],
    ["REQ-005", "Referral contact and follow-up owner", "staff", "event setup and follow-up", "contact and assignment", "least-privilege participant detail", "unsupported/incomplete outcomes enter queue"],
    ["REQ-006", "Event attribution", "all roles", "intake through reporting", "event foreign keys on participant/session, matter, packet, follow-up", "immutable and tenant-consistent attribution", "trace one participant end to end"],
    ["REQ-007", "Assisted-intake consent", "participant", "assisted intake", "explicit consent, timestamp, staff identity, decline", "generic terms do not qualify", "accept and decline paths"],
    ["REQ-008", "Participant remains account owner", "participant", "authentication and Briefcase", "participant auth user and matter ownership", "staff never becomes durable owner", "staff loses access after session"],
    ["REQ-009", "No permanent staff case access", "clinic staff", "assistance session", "ephemeral event-scoped grant", "automatic expiry and auditable access", "post-session denial"],
    ["REQ-010", "Shared-device reset", "clinic staff", "day-of dashboard", "session boundary/reset audit", "cookies, history, caches, storage, autofill, previews cleared", "Back/reopen/storage checks after each participant"],
    ["REQ-011", "No sensitive browser storage", "participant", "intake/resume", "no answers, files, result or PII in Web Storage", "browser-profile confidentiality", "storage inventory"],
    ["REQ-012", "Cross-device save and resume", "participant", "intake and email resume", "participant-bound durable session and rotating token", "unguessable token and ownership check", "resume on a second device"],
    ["REQ-013", "Sponsorship preservation", "participant", "entry through packet", "partner/program/event sponsorship binding", "cannot be replayed by another account", "sponsored and non-sponsored paths"],
    ["REQ-014", "Packet accounting", "partner admin", "packet generation", "atomic credit ledger", "one successful sponsored packet exactly once", "incomplete/guidance/failure/retry/download rules"],
    ["REQ-015", "Follow-up queue", "partner staff", "operations dashboard", "status, assignment, due date, contact method, event filter", "approved case-detail scope", "status and privacy tests"],
    ["REQ-016", "Clinic reporting", "partner admin and LegalEase", "event reports", "distinct starts, screenings, possible paths, packets, guidance, referrals, incompletes, credits, errors", "tenant and event isolation; no false equivalence", "aggregate/export tests"],
    ["REQ-017", "Incident and pause controls", "operator", "clinic dashboard", "incident, pause authority, capacity stop", "fail closed without cross-tenant disclosure", "pause/close/capacity tests"],
    ["REQ-018", "Ten sequential participants", "clinic staff", "one shared browser profile", "ten synthetic participant sessions", "zero participant N data visible to N+1", "mandatory ten-participant browser test"],
    ["REQ-019", "Pre-clinic operating plan", "operator", "launch readiness", "approved page, QR/code, devices, volunteers, network fallback, legal escalation, rehearsal", "approval does not substitute for verification", "real-device/network checklist"],
    ["REQ-020", "Day-of and post-clinic operations", "operator and staff", "monitoring and follow-up", "usage, incidents, end-of-day review, follow-up", "minimum necessary data", "runbook rehearsal"]
  ].map(([requirementId, expectedContract, intendedUser, intendedSurface, intendedData, intendedSecurityProperty, intendedAcceptanceTest]) => ({
    requirementId,
    expectedContract,
    sources: [
      source("USER_SUPPLIED_AUDIT_BRIEF", "Expected Clinic Mode contract and sections 11-20", "Controlling audit contract"),
      source("docs/product-flows/rcap-partner-portal-user-flow.md", "30-153", "Adjacent account-first, attribution, sponsorship, packet and follow-up intentions"),
      source("docs/rcap/RCAP_SOURCE_OF_TRUTH_v2.md", "23-368", "Adjacent case ownership, Briefcase, tasks, follow-up and reporting intentions")
    ],
    intendedUser,
    intendedSurface,
    intendedData,
    intendedSecurityProperty,
    intendedAcceptanceTest
  }))
};

const implementations = [
  {
    capabilityId: "CAP-001",
    capability: "Canonical clinic-event model and CRUD",
    expectedContract: ["REQ-001"],
    status: "ABSENT",
    sourceFiles: [],
    routeOrAction: "NO CURRENT ROUTE",
    uiEntryPoint: "NO CURRENT ENTRY POINT",
    serverSideAuthority: "none",
    databaseTablesFunctions: ["No clinic_events equivalent"],
    rlsPolicy: "none",
    featureFlag: "none",
    environmentDependency: "none",
    rolesAllowed: [],
    testCoverage: "none",
    deployedReachability: "No route in repository; deployment cannot make it reachable.",
    evidence: ["No clinic/event route, server action, API, or canonical event table found.", "partner_events is a lifecycle log, not an event entity."],
    gap: "CLINIC-P1-001",
    recommendedOwner: "Clinic product + data platform"
  },
  {
    capabilityId: "CAP-002",
    capability: "Clinic-labelled general partner onboarding",
    expectedContract: ["REQ-001", "REQ-004", "REQ-019"],
    status: "IMPLEMENTED_BEHIND_FLAG",
    sourceFiles: ["src/lib/partners/onboarding/schema.ts", "src/lib/partners/onboarding/feature.ts"],
    routeOrAction: "/internal/partners/onboarding/[partnerSlug]; /partner/onboarding",
    uiEntryPoint: "Program setup sections",
    serverSideAuthority: "general onboarding services and RLS",
    databaseTablesFunctions: ["partner_onboarding", "partner_onboarding_sections"],
    rlsPolicy: "partner-scoped and internal-onboarding policies",
    featureFlag: "RCAP_PARTNER_ONBOARDING_ENABLED",
    environmentDependency: "Supabase public/auth and service-role configuration",
    rolesAllowed: ["partner_admin", "internal_admin"],
    testCoverage: "onboarding verifier suite",
    deployedReachability: "Unknown; flag defaults false and no safe staging values were available.",
    evidence: ["program_model accepts clinic/event", "program start/end dates, geography, access plan and referrals are generic partner-workspace data"],
    gap: "CLINIC-P1-001",
    recommendedOwner: "Clinic product"
  },
  {
    capabilityId: "CAP-003",
    capability: "General partner launch-kit QR",
    expectedContract: ["REQ-002", "REQ-019"],
    status: "IMPLEMENTED_BEHIND_FLAG",
    sourceFiles: ["src/lib/partners/onboarding/artifact-service.ts", "src/components/partners/onboarding/LaunchKitView.tsx"],
    routeOrAction: "/internal/partners/onboarding/[partnerSlug]; /partner/onboarding/resources",
    uiEntryPoint: "Artifacts > Partner Launch Kit; Resources > Partner launch kit",
    serverSideAuthority: "buildLaunchKitQr derives target from authorized partner slug",
    databaseTablesFunctions: ["partner_onboarding_artifacts", "partner_onboarding_artifact_versions"],
    rlsPolicy: "artifact and workspace tenant policies",
    featureFlag: "RCAP_ONBOARDING_LAUNCH_PREP_ENABLED plus onboarding flag",
    environmentDependency: "absolute app URL",
    rolesAllowed: ["partner_admin", "internal_admin"],
    testCoverage: "verify-rcap-onboarding-launch-kit.mjs",
    deployedReachability: "Unknown; code marks QR target unpublished.",
    evidence: ["QR points only to /p/[partnerSlug]", "published is hard-coded false in builder", "no event/code identity in target"],
    gap: "CLINIC-P1-007",
    recommendedOwner: "Clinic product + partner onboarding"
  },
  {
    capabilityId: "CAP-004",
    capability: "Partner access codes and campaign labels",
    expectedContract: ["REQ-002", "REQ-013", "REQ-014"],
    status: "PARTIALLY_IMPLEMENTED",
    sourceFiles: ["src/app/partner/access-codes/page.tsx", "src/app/partner/access-codes/PartnerAccessCodesManager.tsx", "src/lib/partners/partner-access-codes.ts", "supabase/phase-41-rcap-partner-access-codes.sql"],
    routeOrAction: "/partner/access-codes; /api/partners/access-codes; /api/rcap/access-code/validate",
    uiEntryPoint: "Partner dashboard > Manage codes",
    serverSideAuthority: "service-role code service plus claim/validate RPCs",
    databaseTablesFunctions: ["partner_access_codes", "validate_partner_access_code", "claim_rcap_partner_screening_session"],
    rlsPolicy: "tenant-scoped reads; mutations service role",
    featureFlag: "none specific to codes",
    environmentDependency: "phase-41 schema and Supabase credentials",
    rolesAllowed: ["UI: partner_admin", "API defect: partner_admin, partner_staff, internal_admin"],
    testCoverage: "verify-rcap-partner-access-codes.mjs",
    deployedReachability: "Repository-only in July production reconciliation; current deployment not safely readable.",
    evidence: ["valid/expired/exhausted/disabled validation exists", "campaign is free text and is not an event FK", "no QR generation or event metadata"],
    gap: "CLINIC-P1-006",
    recommendedOwner: "Partner platform"
  },
  {
    capabilityId: "CAP-005",
    capability: "Participant partner entry and account-first intake",
    expectedContract: ["REQ-004", "REQ-008", "REQ-013"],
    status: "IMPLEMENTED_AND_WIRED",
    sourceFiles: ["src/app/p/[partnerSlug]/page.tsx", "src/app/intake/[partnerSlug]/page.tsx", "src/app/intake/[partnerSlug]/actions.ts"],
    routeOrAction: "/p/[partnerSlug]; /intake/[partnerSlug]",
    uiEntryPoint: "Start your record-clearing screening",
    serverSideAuthority: "public publication projection, authenticated intake action and claim RPC",
    databaseTablesFunctions: ["partner_records", "partner_entitlement", "screening_sessions"],
    rlsPolicy: "public safe projection plus server-side claims",
    featureFlag: "partner state/publication gates, not Clinic Mode",
    environmentDependency: "Supabase URL/anon/service-role and deployed phase schema",
    rolesAllowed: ["unauthenticated visitor for public page", "authenticated participant for intake"],
    testCoverage: "partner public-page/intake/attribution verifiers",
    deployedReachability: "Local synthetic slug returned 404; no authorized staging fixture.",
    evidence: ["ordinary partner page and intake are routed", "participant must create/sign in before partner screening begins"],
    gap: "CLINIC-P1-001",
    recommendedOwner: "Participant platform"
  },
  {
    capabilityId: "CAP-006",
    capability: "Event attribution across intake, matter, packet, reporting and follow-up",
    expectedContract: ["REQ-006"],
    status: "ABSENT",
    sourceFiles: ["supabase/phase-41-rcap-partner-access-codes.sql", "supabase/phase-41b-rcap-screening-analytics.sql"],
    routeOrAction: "NO CURRENT ROUTE",
    uiEntryPoint: "none",
    serverSideAuthority: "partner/campaign only",
    databaseTablesFunctions: ["screening_sessions.partner_slug", "screening_sessions.partner_access_code_id", "screening_sessions.campaign_name"],
    rlsPolicy: "partner-scoped adjacent analytics",
    featureFlag: "none",
    environmentDependency: "phase 41/41b",
    rolesAllowed: [],
    testCoverage: "campaign attribution tests only",
    deployedReachability: "No event foreign key exists in any deployment schema source.",
    evidence: ["No event_id on screening session, matter, packet, follow-up or analytics", "campaign_name is nullable free text"],
    gap: "CLINIC-P1-002",
    recommendedOwner: "Clinic data platform"
  },
  {
    capabilityId: "CAP-007",
    capability: "Assisted intake and explicit assistance consent",
    expectedContract: ["REQ-007", "REQ-008", "REQ-009"],
    status: "ABSENT",
    sourceFiles: [],
    routeOrAction: "NO CURRENT ROUTE",
    uiEntryPoint: "none",
    serverSideAuthority: "none",
    databaseTablesFunctions: ["none"],
    rlsPolicy: "none",
    featureFlag: "none",
    environmentDependency: "none",
    rolesAllowed: [],
    testCoverage: "none",
    deployedReachability: "No code path.",
    evidence: ["No assisted-intake grant, consent text, staff identity, timestamp, decline, or expiry model found."],
    gap: "CLINIC-P1-003",
    recommendedOwner: "Clinic product + privacy"
  },
  {
    capabilityId: "CAP-008",
    capability: "Cross-device save/resume",
    expectedContract: ["REQ-012"],
    status: "PARTIALLY_IMPLEMENTED",
    sourceFiles: ["src/app/api/expungement-ai/screening/save-resume/route.ts", "src/lib/expungement-ai/screening-resume-service.ts", "src/components/expungement-ai/screening/ResumeScreeningClient.tsx"],
    routeOrAction: "/expungement-ai/screening/resume; /api/expungement-ai/screening/save-resume",
    uiEntryPoint: "Save progress / emailed resume link",
    serverSideAuthority: "public endpoint using service role and rotating email token",
    databaseTablesFunctions: ["screening_sessions"],
    rlsPolicy: "service-role storage; browser roles have no ownership policy",
    featureFlag: "email delivery configuration",
    environmentDependency: "Supabase service role, app URL, email provider",
    rolesAllowed: ["public caller with token/email"],
    testCoverage: "verify-expungement-screening-resume-links.mjs",
    deployedReachability: "Not browser-tested; no configured staging fixture/email channel.",
    evidence: ["rotating token and email match exist", "save accepts caller-supplied session UUID with no participant ownership check", "full answers temporarily placed in sessionStorage"],
    gap: "CLINIC-P0-002",
    recommendedOwner: "Participant identity + security"
  },
  {
    capabilityId: "CAP-009",
    capability: "Shared-device end-session/reset",
    expectedContract: ["REQ-010", "REQ-018"],
    status: "ABSENT",
    sourceFiles: [],
    routeOrAction: "NO CURRENT ROUTE",
    uiEntryPoint: "No End clinic session or Reset device control",
    serverSideAuthority: "none",
    databaseTablesFunctions: ["none"],
    rlsPolicy: "none",
    featureFlag: "none",
    environmentDependency: "none",
    rolesAllowed: [],
    testCoverage: "none",
    deployedReachability: "No code path.",
    evidence: ["Auth cookie persists", "session UUID remains in history", "no bfcache/history/autofill/storage purge contract"],
    gap: "CLINIC-P0-001",
    recommendedOwner: "Clinic security"
  },
  {
    capabilityId: "CAP-010",
    capability: "No sensitive browser storage",
    expectedContract: ["REQ-011"],
    status: "PARTIALLY_IMPLEMENTED",
    sourceFiles: ["src/components/expungement-ai/screening/ResumeScreeningClient.tsx", "src/components/expungement-ai/screening/ScreeningFlow.tsx"],
    routeOrAction: "/expungement-ai/screening/resume",
    uiEntryPoint: "resume confirmation",
    serverSideAuthority: "not applicable",
    databaseTablesFunctions: ["screening_sessions"],
    rlsPolicy: "not applicable to browser storage",
    featureFlag: "none",
    environmentDependency: "browser sessionStorage",
    rolesAllowed: ["participant"],
    testCoverage: "unit verifier does not enforce Clinic shared-device clearing",
    deployedReachability: "Source-proven.",
    evidence: ["full resume session including answers written to sessionStorage", "analytics/locale IDs in localStorage are non-sensitive", "no IndexedDB or service worker implementation found"],
    gap: "CLINIC-P0-001",
    recommendedOwner: "Participant security"
  },
  {
    capabilityId: "CAP-011",
    capability: "Participant-owned Briefcase",
    expectedContract: ["REQ-008", "REQ-009"],
    status: "IMPLEMENTED_AND_WIRED",
    sourceFiles: ["src/app/briefcase/page.tsx", "src/lib/expungement-ai/auth.ts", "src/lib/expungement-ai/briefcase.ts"],
    routeOrAction: "/briefcase; /briefcase/[packetId]",
    uiEntryPoint: "View my Briefcase",
    serverSideAuthority: "authenticated user_id-scoped service functions",
    databaseTablesFunctions: ["consumer_briefcase_items"],
    rlsPolicy: "owner policies plus server checks",
    featureFlag: "none",
    environmentDependency: "Supabase auth/service role",
    rolesAllowed: ["authenticated participant owner"],
    testCoverage: "briefcase and consumer identity verifiers",
    deployedReachability: "General flow only; no clinic-assisted access model.",
    evidence: ["Briefcase retrieval uses auth user id", "no clinic staff delegation exists"],
    gap: "CLINIC-P1-003",
    recommendedOwner: "Participant platform"
  },
  {
    capabilityId: "CAP-012",
    capability: "Sponsorship binding",
    expectedContract: ["REQ-013"],
    status: "PARTIALLY_IMPLEMENTED",
    sourceFiles: ["src/app/api/expungement-ai/screening/pending/route.ts", "src/app/api/expungement-ai/screening/pending/claim/route.ts", "src/lib/expungement-ai/briefcase.ts"],
    routeOrAction: "pending result create/claim; packet generate",
    uiEntryPoint: "Save result and continue to Briefcase",
    serverSideAuthority: "service-role lookup of source screening UUID",
    databaseTablesFunctions: ["screening_sessions", "consumer_pending_screening_results", "consumer_briefcase_items"],
    rlsPolicy: "participant matter owner after claim; source session itself is not user-bound",
    featureFlag: "none",
    environmentDependency: "phase 38/41/55 schema",
    rolesAllowed: ["authenticated participant for claim"],
    testCoverage: "partner result and matter-binding tests do not cover cross-user session replay",
    deployedReachability: "Static source proof; staging exploit not attempted.",
    evidence: ["public pending endpoint accepts product=rcap_partner and any syntactically valid sourceSessionId", "sponsor test checks session flags but not participant owner"],
    gap: "CLINIC-P0-002",
    recommendedOwner: "Payment/sponsorship security"
  },
  {
    capabilityId: "CAP-013",
    capability: "Packet-credit accounting",
    expectedContract: ["REQ-014"],
    status: "PARTIALLY_IMPLEMENTED",
    sourceFiles: ["src/app/api/expungement-ai/packet/generate/route.ts", "src/lib/expungement-ai/rcap-slot-lifecycle.ts", "supabase/phase-41b-rcap-screening-analytics.sql"],
    routeOrAction: "/api/expungement-ai/packet/generate; record_partner_packet_generation",
    uiEntryPoint: "Generate my packet",
    serverSideAuthority: "authenticated owner packet generation then service-role accounting RPC",
    databaseTablesFunctions: ["partner_entitlement", "screening_sessions.claimed_slot_state", "record_partner_packet_generation"],
    rlsPolicy: "service-role mutations",
    featureFlag: "none",
    environmentDependency: "phase 41b and packet worker configuration",
    rolesAllowed: ["authenticated participant owner"],
    testCoverage: "slot lifecycle/access-code verifiers",
    deployedReachability: "Not safely testable without authorized staging fixture.",
    evidence: ["included and overage accounting is idempotent per session", "generation route ignores recorded=false result after packet is ready", "cap_reached_no_overage consumes session without counting packet"],
    gap: "CLINIC-P0-004",
    recommendedOwner: "Payment/accounting platform"
  },
  {
    capabilityId: "CAP-014",
    capability: "Partner aggregate dashboard",
    expectedContract: ["REQ-015", "REQ-016"],
    status: "IMPLEMENTED_AND_WIRED",
    sourceFiles: ["src/app/partner/dashboard/page.tsx", "src/lib/partners/partner-dashboard.ts"],
    routeOrAction: "/partner/dashboard",
    uiEntryPoint: "Partner dashboard",
    serverSideAuthority: "session partner + tenant-scoped Supabase client",
    databaseTablesFunctions: ["screening_sessions", "rcap_screening_analytics_events", "partner_entitlement"],
    rlsPolicy: "partner-scoped reads",
    featureFlag: "none specific",
    environmentDependency: "phase schema and Supabase auth",
    rolesAllowed: ["partner_admin", "partner_staff"],
    testCoverage: "partner dashboard isolation verifiers",
    deployedReachability: "General dashboard; not Clinic Mode.",
    evidence: ["aggregate starts/completions/packets/saved", "no event filter, participant list, follow-up assignment, or clinic controls"],
    gap: "CLINIC-P1-005",
    recommendedOwner: "Partner reporting"
  },
  {
    capabilityId: "CAP-015",
    capability: "Clinic follow-up queue",
    expectedContract: ["REQ-005", "REQ-015", "REQ-020"],
    status: "DOCUMENTED_ONLY",
    sourceFiles: ["docs/rcap/RCAP_SOURCE_OF_TRUTH_v2.md"],
    routeOrAction: "NO CURRENT ROUTE",
    uiEntryPoint: "none",
    serverSideAuthority: "none",
    databaseTablesFunctions: ["partner_onboarding_tasks is setup work, not participant follow-up"],
    rlsPolicy: "none for clinic follow-up",
    featureFlag: "none",
    environmentDependency: "none",
    rolesAllowed: [],
    testCoverage: "none",
    deployedReachability: "No current route or participant follow-up entity.",
    evidence: ["source-of-truth describes partner_follow_up task intent", "partner dashboard explicitly presents neutral incomplete counts, not a queue"],
    gap: "CLINIC-P1-004",
    recommendedOwner: "Clinic operations + case journey"
  },
  {
    capabilityId: "CAP-016",
    capability: "Clinic/event reporting and export",
    expectedContract: ["REQ-016"],
    status: "PARTIALLY_IMPLEMENTED",
    sourceFiles: ["src/app/dashboard/partners/page.tsx", "src/lib/partner-dashboard-data.ts", "src/app/api/partner-reports/final/route.ts", "src/app/api/partner-reports/weekly/route.ts"],
    routeOrAction: "/dashboard/partners; POST /api/partner-reports/final; POST /api/partner-reports/weekly",
    uiEntryPoint: "internal general partner dashboard/report downloads",
    serverSideAuthority: "final report uses service-role reads; both report endpoints omit auth",
    databaseTablesFunctions: ["rcap_intake_sessions", "rcap_document_packets", "rcap_record_events", "seeded dashboard arrays"],
    rlsPolicy: "bypassed by final-report service role; route has no caller authorization",
    featureFlag: "LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES can force seed data outside production",
    environmentDependency: "Supabase admin configuration and report rendering",
    rolesAllowed: ["defect: unauthenticated caller can invoke"],
    testCoverage: "live-data unit verifier; no route auth test",
    deployedReachability: "Not probed outside local; production use not authorized.",
    evidence: ["no event dimension", "weekly report is seeded", "final report accepts arbitrary partnerId and service-role reads without authentication"],
    gap: "CLINIC-P0-003",
    recommendedOwner: "Reporting security"
  },
  {
    capabilityId: "CAP-017",
    capability: "Partner tenant isolation",
    expectedContract: ["REQ-003", "REQ-015", "REQ-016"],
    status: "PARTIALLY_IMPLEMENTED",
    sourceFiles: ["src/lib/partners/session-partner.ts", "src/lib/partners/partner-scope-auth.ts", "supabase/phase-21-partner-auth-rls-foundation.sql"],
    routeOrAction: "general partner routes/APIs",
    uiEntryPoint: "partner dashboard",
    serverSideAuthority: "active partner_users row and tenant RLS",
    databaseTablesFunctions: ["partner_users", "current_partner_slug", "is_internal_admin"],
    rlsPolicy: "tenant-scoped general partner policies",
    featureFlag: "none",
    environmentDependency: "phase schema and Supabase auth",
    rolesAllowed: ["partner_admin", "partner_staff", "internal_admin"],
    testCoverage: "RLS and tenant-isolation verifiers",
    deployedReachability: "Local database evidence exists; clinic/event scope absent and report route bypasses isolation.",
    evidence: ["mismatched partner slug fails in partner-scope helper", "final report API is unauthenticated", "no event-scoped membership"],
    gap: "CLINIC-P0-003",
    recommendedOwner: "Security"
  },
  {
    capabilityId: "CAP-018",
    capability: "Roles without uncontrolled clinic role invention",
    expectedContract: ["REQ-003"],
    status: "IMPLEMENTED_AND_WIRED",
    sourceFiles: ["src/lib/partners/session-partner.ts", "supabase/phase-21-partner-auth-rls-foundation.sql"],
    routeOrAction: "/partner/team",
    uiEntryPoint: "Partner dashboard > Manage team",
    serverSideAuthority: "partner_users role constraint",
    databaseTablesFunctions: ["partner_users"],
    rlsPolicy: "self/tenant role policies",
    featureFlag: "none",
    environmentDependency: "Supabase auth",
    rolesAllowed: ["partner_admin", "partner_staff", "internal_admin"],
    testCoverage: "team invite and RLS verifiers",
    deployedReachability: "General partner roles only.",
    evidence: ["Only three permanent roles exist", "no partner_viewer runtime role despite onboarding planning label reporting_viewer"],
    gap: "CLINIC-P1-009",
    recommendedOwner: "Identity platform"
  },
  {
    capabilityId: "CAP-019",
    capability: "Approved event staff membership",
    expectedContract: ["REQ-003", "REQ-009"],
    status: "ABSENT",
    sourceFiles: ["src/app/partner/team/page.tsx"],
    routeOrAction: "NO CURRENT EVENT-STAFF ROUTE",
    uiEntryPoint: "general Manage team only",
    serverSideAuthority: "permanent partner membership only",
    databaseTablesFunctions: ["partner_users; no event_staff table"],
    rlsPolicy: "partner-level only",
    featureFlag: "none",
    environmentDependency: "none",
    rolesAllowed: [],
    testCoverage: "none",
    deployedReachability: "No code path.",
    evidence: ["staff accounts are partner-wide, not approved/expiring per event"],
    gap: "CLINIC-P1-003",
    recommendedOwner: "Clinic identity"
  },
  {
    capabilityId: "CAP-020",
    capability: "Clinic audit history",
    expectedContract: ["REQ-006", "REQ-007", "REQ-009", "REQ-017"],
    status: "PARTIALLY_IMPLEMENTED",
    sourceFiles: ["supabase/phase-28-rcap-record-audit-trail.sql", "supabase/phase-41-rcap-partner-access-codes.sql", "supabase/phase-41b-rcap-screening-analytics.sql"],
    routeOrAction: "append-only record/analytics events",
    uiEntryPoint: "no clinic audit UI",
    serverSideAuthority: "service-role/trigger events",
    databaseTablesFunctions: ["rcap_record_events", "rcap_screening_analytics_events"],
    rlsPolicy: "forced/tenant RLS depending table",
    featureFlag: "none",
    environmentDependency: "phase migrations",
    rolesAllowed: ["partner aggregate readers", "internal_admin"],
    testCoverage: "record audit and analytics verifiers",
    deployedReachability: "No clinic actor/event fields; July production lacked phase-41 additions.",
    evidence: ["system/access-code/accounting events exist", "no staff actor, assisted consent, reset, incident or event membership event"],
    gap: "CLINIC-P1-010",
    recommendedOwner: "Clinic data platform"
  },
  {
    capabilityId: "CAP-021",
    capability: "Clinic capacity, pause, close and archive",
    expectedContract: ["REQ-001", "REQ-017"],
    status: "ABSENT",
    sourceFiles: ["src/lib/partners/onboarding/schema.ts", "supabase/phase-41b-rcap-screening-analytics.sql"],
    routeOrAction: "NO CURRENT ROUTE",
    uiEntryPoint: "general plan fields only",
    serverSideAuthority: "partner-wide packet cap only",
    databaseTablesFunctions: ["partner_entitlement.pause_at_cap; no event capacity/status"],
    rlsPolicy: "none for event controls",
    featureFlag: "none",
    environmentDependency: "none",
    rolesAllowed: [],
    testCoverage: "partner-wide cap tests only",
    deployedReachability: "No event control path.",
    evidence: ["onboarding records planned capacity procedure", "it does not enforce event capacity or event state"],
    gap: "CLINIC-P1-008",
    recommendedOwner: "Clinic operations"
  },
  {
    capabilityId: "CAP-022",
    capability: "Clinic incidents and end-of-day review",
    expectedContract: ["REQ-017", "REQ-020"],
    status: "ABSENT",
    sourceFiles: [],
    routeOrAction: "NO CURRENT ROUTE",
    uiEntryPoint: "none",
    serverSideAuthority: "none",
    databaseTablesFunctions: ["none"],
    rlsPolicy: "none",
    featureFlag: "none",
    environmentDependency: "none",
    rolesAllowed: [],
    testCoverage: "none",
    deployedReachability: "No code path.",
    evidence: ["No clinic incident entity, action, filter, or runbook surface."],
    gap: "CLINIC-P1-010",
    recommendedOwner: "Clinic operations"
  },
  {
    capabilityId: "CAP-023",
    capability: "Ten-participant shared-device acceptance",
    expectedContract: ["REQ-018"],
    status: "ABSENT",
    sourceFiles: ["tests/e2e/rcap-clinic-mode-audit/ten-participant-shared-device-audit.mjs"],
    routeOrAction: "NOT_RUN_NO_CLINIC_SESSION_BOUNDARY",
    uiEntryPoint: "none",
    serverSideAuthority: "none",
    databaseTablesFunctions: ["none"],
    rlsPolicy: "none",
    featureFlag: "none",
    environmentDependency: "authorized staging fixture was unavailable",
    rolesAllowed: [],
    testCoverage: "audit-only fail-closed ten-iteration static test",
    deployedReachability: "Cannot execute contract because no Clinic Mode or reset boundary exists.",
    evidence: ["All 10 iterations recorded NOT_RUN_NO_CLINIC_SESSION_BOUNDARY", "result FAIL_CLOSED/UNSAFE"],
    gap: "CLINIC-P0-001",
    recommendedOwner: "Clinic QA + security"
  },
  {
    capabilityId: "CAP-024",
    capability: "Clinic-day rehearsal and network/device plan",
    expectedContract: ["REQ-019", "REQ-020"],
    status: "DOCUMENTED_ONLY",
    sourceFiles: ["src/lib/partners/onboarding/artifact-generator.ts", "src/lib/partners/onboarding/launch-readiness.ts"],
    routeOrAction: "general onboarding artifacts",
    uiEntryPoint: "Artifacts / Launch readiness",
    serverSideAuthority: "general partner readiness",
    databaseTablesFunctions: ["partner_onboarding_launch_checks", "partner_onboarding_artifact_versions"],
    rlsPolicy: "onboarding tenant scope",
    featureFlag: "RCAP_ONBOARDING_LAUNCH_PREP_ENABLED",
    environmentDependency: "onboarding flags and schema",
    rolesAllowed: ["partner_admin", "internal_admin"],
    testCoverage: "launch-readiness verifiers",
    deployedReachability: "No Clinic Mode-specific rehearsal record.",
    evidence: ["manual training/launch approvals exist for a general program", "no device inventory, network fallback rehearsal, venue test or clinic-day monitor"],
    gap: "CLINIC-P1-010",
    recommendedOwner: "Clinic operations"
  },
  {
    capabilityId: "CAP-025",
    capability: "Deployed Clinic Mode reachability",
    expectedContract: ["REQ-001", "REQ-019"],
    status: "HUMAN_CONFIRMATION_REQUIRED",
    sourceFiles: ["docs/rcap/production/MIGRATION_20260728213131_RECONCILIATION.md", "data/rcap-staging-authorization-readiness.json"],
    routeOrAction: "No authorized staging target",
    uiEntryPoint: "none",
    serverSideAuthority: "unknown external state",
    databaseTablesFunctions: ["production July baseline lacks partner_access_codes and rcap_screening_analytics_events"],
    rlsPolicy: "unknown current external state",
    featureFlag: "unknown current external state",
    environmentDependency: "missing acceptance project ref, public URL, anon key, service-role key and hosted URL",
    rolesAllowed: [],
    testCoverage: "static and local route-absence capture only",
    deployedReachability: "Production was not used; staging target was not configured.",
    evidence: ["application deployment target is blank in readiness artifact", "local /partner/access-codes returns 500 without Supabase public config"],
    gap: "CLINIC-P1-011",
    recommendedOwner: "Release engineering"
  }
];

const implementationInventory = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  statusVocabulary: ["IMPLEMENTED_AND_WIRED", "IMPLEMENTED_NOT_REACHABLE", "IMPLEMENTED_BEHIND_FLAG", "PARTIALLY_IMPLEMENTED", "DOCUMENTED_ONLY", "TEST_ONLY", "STUB_OR_PLACEHOLDER", "ABSENT", "CONFLICTING_IMPLEMENTATIONS", "HUMAN_CONFIRMATION_REQUIRED"],
  summary: Object.fromEntries([...new Set(implementations.map((entry) => entry.status))].sort().map((status) => [status, implementations.filter((entry) => entry.status === status).length])),
  capabilities: implementations
};

const accessMap = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  routes: [
    ["ACCESS-001", "LegalEase internal clinic/event setup", "NO CURRENT ROUTE", "NOT CURRENTLY IMPLEMENTED", "internal_admin", "CLINIC-P1-001"],
    ["ACCESS-002", "Internal generic partner provisioning", "/internal/partners/admin/[partnerSlug]", "Sign in as internal_admin; open /internal/partners/admin; select partner", "internal_admin", "CLINIC-P1-001"],
    ["ACCESS-003", "Internal general onboarding", "/internal/partners/onboarding/[partnerSlug]", "Requires onboarding flag and internal_admin; open internal onboarding list; select partner", "internal_admin", "CLINIC-P1-011"],
    ["ACCESS-004", "Partner administrator clinic/event management", "NO CURRENT ROUTE", "NOT CURRENTLY IMPLEMENTED", "partner_admin", "CLINIC-P1-001"],
    ["ACCESS-005", "Partner access-code management (adjacent)", "/partner/access-codes", "Sign in as active partner_admin; Partner dashboard > Manage codes", "partner_admin in UI; API defect also allows partner_staff", "CLINIC-P1-006"],
    ["ACCESS-006", "Partner staff clinic view", "NO CURRENT ROUTE", "NOT CURRENTLY IMPLEMENTED", "partner_staff", "CLINIC-P1-003"],
    ["ACCESS-007", "Event reporting", "NO CURRENT ROUTE", "NOT CURRENTLY IMPLEMENTED", "partner_admin/internal_admin", "CLINIC-P1-005"],
    ["ACCESS-008", "Follow-up queue", "NO CURRENT ROUTE", "NOT CURRENTLY IMPLEMENTED", "partner_staff/partner_admin", "CLINIC-P1-004"],
    ["ACCESS-009", "Public/co-branded partner page (adjacent)", "/p/[partnerSlug]", "Open a published, paid/demo, qualified and provisioned partner URL", "unauthenticated", "CLINIC-P1-007"],
    ["ACCESS-010", "Participant preregistration", "NO CURRENT CLINIC ROUTE", "NOT CURRENTLY IMPLEMENTED; ordinary /p/[partnerSlug] is not preregistration", "unauthenticated", "CLINIC-P1-001"],
    ["ACCESS-011", "Participant clinic entry", "NO CURRENT ROUTE", "NOT CURRENTLY IMPLEMENTED", "unauthenticated/authenticated participant", "CLINIC-P1-001"],
    ["ACCESS-012", "Ordinary partner intake (adjacent)", "/intake/[partnerSlug]", "From public partner page click Start your record-clearing screening; create account/sign in; enter code when required", "authenticated participant", "CLINIC-P1-002"],
    ["ACCESS-013", "Code redemption", "/intake/[partnerSlug]", "Enter access code and click Continue", "authenticated participant", "CLINIC-P0-002"],
    ["ACCESS-014", "QR destination", "/p/[partnerSlug]", "Generate approved general Partner Launch Kit; QR target is derived from partner slug", "unauthenticated destination", "CLINIC-P1-007"],
    ["ACCESS-015", "Assisted-intake entry", "NO CURRENT ROUTE", "NOT CURRENTLY IMPLEMENTED", "none", "CLINIC-P1-003"],
    ["ACCESS-016", "Briefcase resume", "/briefcase; /briefcase/[packetId]", "Participant signs in with the account that owns the matter", "authenticated participant owner", "CLINIC-P1-003"],
    ["ACCESS-017", "Email screening resume", "/expungement-ai/screening/resume?token=[opaque-token]", "Open emailed link, confirm matching email, continue", "token/email holder", "CLINIC-P0-002"],
    ["ACCESS-018", "Clinic help/support", "NO CURRENT ROUTE", "NOT CURRENTLY IMPLEMENTED", "none", "CLINIC-P1-010"],
    ["ACCESS-019", "General partner launch-kit resources", "/partner/onboarding/resources", "Sign in as active partner admin; requires onboarding and launch-prep flags and approved artifact", "partner_admin", "CLINIC-P1-007"],
    ["ACCESS-020", "Generic internal partner dashboard", "/dashboard/partners", "Sign in as internal_admin", "internal_admin", "CLINIC-P1-005"],
    ["ACCESS-021", "Generic report APIs", "POST /api/partner-reports/weekly; POST /api/partner-reports/final", "No UI-safe Clinic Mode procedure; endpoints currently omit authentication", "defect: unauthenticated", "CLINIC-P0-003"]
  ].map(([id, surface, exactPath, navigationSteps, requiredRole, gapId]) => ({
    id,
    surface,
    exactPath,
    navigationSteps,
    authenticationRequired: !requiredRole.includes("unauthenticated") && !requiredRole.includes("none") && !requiredRole.includes("defect"),
    requiredRole,
    requiredPartnerMembership: requiredRole.includes("partner_") ? "active partner_users membership scoped to partner" : "none or not applicable",
    requiredEventProgramState: exactPath.includes("NO CURRENT") ? "No state can make this route exist" : "General partner eligibility/publication/onboarding state as described",
    featureFlag: exactPath.includes("onboarding") ? "RCAP_PARTNER_ONBOARDING_ENABLED; resources also RCAP_ONBOARDING_LAUNCH_PREP_ENABLED" : "No Clinic Mode flag",
    environmentVariable: "Supabase public/auth configuration for authenticated routes; no Clinic Mode configuration exists",
    expectedSuccessState: exactPath.includes("NO CURRENT") ? "NOT CURRENTLY IMPLEMENTED" : "Adjacent general partner surface only",
    expectedDenialState: exactPath.includes("NO CURRENT") ? "404" : "redirect/401/403/404 according to route; access-codes local audit returned 500 because Supabase public config was absent",
    directDependencies: implementations.filter((entry) => entry.routeOrAction.includes(exactPath.split(";")[0])).map((entry) => entry.capabilityId),
    gapId
  }))
};

const dataModel = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  conclusion: "There is no canonical clinic-event entity. Generic partner/program planning JSON, lifecycle logs, access-code campaign text and partner-attributed screening analytics are not an event model.",
  entities: [
    {
      canonicalConcept: "clinic event",
      tableType: "ABSENT",
      columns: [], constraints: [], foreignKeys: [], indexes: [], rls: "none", serverWriter: "none", serverReader: "none", retention: "undefined", auditEvents: "none", migration: "none", fidelity: "ABSENT"
    },
    {
      canonicalConcept: "generic partner/program relationship",
      tableType: "partner_records + partner_onboarding + partner_onboarding_sections.response_data",
      columns: ["partner_slug", "program_name", "program_model", "program_start_date", "program_end_date", "jurisdictions", "service_area_description", "out_of_area_policy", "support/referral/reporting plan"],
      constraints: ["partner slug uniqueness", "onboarding schema validation in app/RPC"], foreignKeys: ["onboarding.partner_slug -> partner_records.partner_slug"], indexes: ["partner_slug"], rls: "tenant and internal-admin onboarding policies", serverWriter: "onboarding services/RPCs", serverReader: "onboarding services", retention: "not stated", auditEvents: "partner_onboarding_activity/integration events", migration: "phase-42 through phase-47", fidelity: "PARTIAL: program-level, not event-level"
    },
    {
      canonicalConcept: "partner lifecycle event log (not clinic event)",
      tableType: "partner_events",
      columns: ["id", "partner_slug", "event_type", "event_label", "event_payload", "created_at"], constraints: ["event_type and label not null"], foreignKeys: ["partner_slug -> partner_records"], indexes: ["partner_slug", "created_at"], rls: "partner/internal read policies", serverWriter: "partner admin action layer", serverReader: "internal partner detail", retention: "not stated", auditEvents: "self", migration: "partner-journey-os.sql", fidelity: "NOT AN EVENT ENTITY: append-only lifecycle log without schedule/location/code/staff/status"
    },
    {
      canonicalConcept: "event code (generic campaign code)",
      tableType: "partner_access_codes",
      columns: ["id", "partner_slug", "code_hash", "code_hint", "campaign_name", "description", "code_type", "max_uses", "uses_count", "is_active", "starts_at", "expires_at", "created_by", "created_at", "updated_at"], constraints: ["unique partner_slug/code_hash", "max uses nonnegative", "uses not above max"], foreignKeys: ["partner_slug -> partner_records"], indexes: ["partner_slug", "partner_slug/is_active", "partner_slug/campaign_name"], rls: "own-partner/internal SELECT; service-role mutation", serverWriter: "partner-access-codes service", serverReader: "partner access-code analytics", retention: "not stated", auditEvents: "partner_code_used and best-effort code admin events", migration: "phase-41; forward upgrade migrations", fidelity: "PARTIAL: campaign free text; no clinic event FK or QR"
    },
    {
      canonicalConcept: "participant-event attribution (partner/campaign substitute)",
      tableType: "screening_sessions",
      columns: ["session_id", "answers", "status", "partner_slug", "flow_mode", "claimed_slot_state", "partner_access_code_id", "campaign_name", "attribution_source", "partner_benefit_active", "resume fields"], constraints: ["attribution_source partner_page/partner_code/consumer", "status lifecycle"], foreignKeys: ["partner_access_code_id -> partner_access_codes"], indexes: ["partner_access_code_id", "resume token indexes"], rls: "RLS enabled with service-role persistence; no participant owner key", serverWriter: "claim RPC and public save/resume service role", serverReader: "screening/resume/sponsorship services", retention: "resume token expiry exists; row retention not stated", auditEvents: "coarse screening analytics", migration: "phase-32, phase-33, phase-35b-d, phase-41", fidelity: "PARTIAL/UNSAFE: no event FK and no participant owner binding"
    },
    {
      canonicalConcept: "matter-event and packet-event attribution",
      tableType: "ABSENT",
      columns: ["consumer_briefcase_items.source_session_id is indirect only"], constraints: [], foreignKeys: [], indexes: [], rls: "participant owner applies to matter, not source session", serverWriter: "pending claim", serverReader: "packet generation", retention: "not stated", auditEvents: "packet events partner-only", migration: "none for event", fidelity: "ABSENT"
    },
    {
      canonicalConcept: "assisted intake consent/staff identity/session/device reset",
      tableType: "ABSENT",
      columns: [], constraints: [], foreignKeys: [], indexes: [], rls: "none", serverWriter: "none", serverReader: "none", retention: "undefined", auditEvents: "none", migration: "none", fidelity: "ABSENT"
    },
    {
      canonicalConcept: "sponsorship allocation / packet pool",
      tableType: "partner_entitlement + screening_sessions",
      columns: ["screenings_allowed", "screenings_used", "overage_enabled", "pause_at_cap", "overage_packets", "claimed_slot_state", "partner_benefit_active"], constraints: ["nonnegative counts", "per-session claimed/consumed lifecycle"], foreignKeys: ["partner_slug relationship"], indexes: ["partner_slug"], rls: "service-role mutation, partner scoped read", serverWriter: "claim and record_partner_packet_generation RPCs", serverReader: "dashboard and cap decision", retention: "not stated", auditEvents: "partner credit/overage/cap events", migration: "phase-35/39/41/41b", fidelity: "PARTIAL: partner-wide, not event pool; unsafe user/session binding"
    },
    {
      canonicalConcept: "follow-up status/assignment/due date/contact method",
      tableType: "ABSENT for participants",
      columns: ["partner_onboarding_tasks is setup-only"], constraints: [], foreignKeys: [], indexes: [], rls: "none for clinic follow-up", serverWriter: "none", serverReader: "none", retention: "undefined", auditEvents: "none", migration: "none", fidelity: "ABSENT"
    },
    {
      canonicalConcept: "reporting scope",
      tableType: "rcap_screening_analytics_events",
      columns: ["session_id", "partner_slug", "partner_access_code_id", "campaign_name", "event_type", "outcome_category", "packet_route_available", "occurred_at", "metadata"], constraints: ["coarse event/outcome enums", "append-only triggers"], foreignKeys: ["logical session/code/partner references; not all declared"], indexes: ["partner/occurred_at", "code", "session/event_type"], rls: "own partner/internal SELECT; service-role write", serverWriter: "triggers and RPCs", serverReader: "access-code analytics", retention: "not stated", auditEvents: "self", migration: "phase-41b", fidelity: "PARTIAL: partner/campaign aggregate only, no clinic event/home market/incidents/follow-up"
    },
    {
      canonicalConcept: "incident record",
      tableType: "ABSENT",
      columns: [], constraints: [], foreignKeys: [], indexes: [], rls: "none", serverWriter: "none", serverReader: "none", retention: "undefined", auditEvents: "none", migration: "none", fidelity: "ABSENT"
    }
  ]
};

const capabilitiesForRoles = ["view clinic/event", "create event", "edit event", "generate QR", "issue/disable code", "manage staff", "view participant aggregate", "view participant-level detail", "assist intake", "access Briefcase", "assign follow-up", "export report", "modify sponsorship/capacity", "publish/activate event", "pause/close event"];
const noClinic = Object.fromEntries(capabilitiesForRoles.map((capability) => [capability, "DENY/NO CURRENT CLINIC CAPABILITY"]));
const rolesAndPermissions = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  serverEnforcementConclusion: "General partner roles are server-resolved, but no clinic/event authorization layer exists. Hidden navigation is not counted. Two adjacent APIs violate their intended role/tenant boundary.",
  roles: [
    { role: "unauthenticated participant", runtimeRoleExists: true, ...noClinic, adjacentAccess: "Can view published /p/[partnerSlug] and call public intake validation/resume endpoints; cannot own Briefcase until authenticated." },
    { role: "authenticated participant", runtimeRoleExists: true, ...noClinic, adjacentAccess: "Can own only their Briefcase records, but a caller-supplied partner screening source session is not bound to that user." },
    { role: "partner viewer", runtimeRoleExists: false, ...noClinic, adjacentAccess: "reporting_viewer is onboarding plan vocabulary only; no partner_users runtime role." },
    { role: "partner staff", runtimeRoleExists: true, ...noClinic, "issue/disable code": "UNAUTHORIZED API ACCESS: API accepts partner_staff although UI says partner_admin", "view participant aggregate": "ALLOW on general /partner/dashboard aggregate", adjacentAccess: "Personal active partner account required; do not share credentials." },
    { role: "partner administrator", runtimeRoleExists: true, ...noClinic, "issue/disable code": "ALLOW on /partner/access-codes (generic code only)", "manage staff": "ALLOW on /partner/team (partner-wide accounts only)", "view participant aggregate": "ALLOW on general /partner/dashboard", adjacentAccess: "Cannot manage clinic events because none exist." },
    { role: "LegalEase internal operator", runtimeRoleExists: true, ...noClinic, "issue/disable code": "ALLOW through generic API only when explicit partnerSlug provided", "manage staff": "Internal user provisioning surfaces; no event staff", "view participant aggregate": "Generic internal dashboards; one is seeded", adjacentAccess: "Internal routes require internal_admin; no clinic setup." },
    { role: "revoked user", runtimeRoleExists: true, ...noClinic, adjacentAccess: "DENY: resolveSessionPartner filters status=active." },
    { role: "user from another tenant", runtimeRoleExists: true, ...noClinic, adjacentAccess: "DENY in general partner scope helper/RLS when requested slug differs; report API defect bypasses caller tenant authentication for aggregate reports." }
  ],
  defects: ["CLINIC-P1-006", "CLINIC-P0-003"]
};

const configurationMatrix = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  secretPolicy: "No secret value was read or printed.",
  entries: [
    ["CLINIC_MODE feature flag", "ABSENT", "none", "none", "unknown/not applicable", "unknown/not applicable", "No dedicated mode can be activated", "Clinic product", "NOT CURRENTLY IMPLEMENTED"],
    ["ENABLE_SUPABASE_PARTNER_DATA", ".env.example and partner repository", "true in example", "not exported in audit shell", "unknown", "unknown", "Selects persistent partner repository for legacy internal data surfaces", "Partner platform", "Set only through approved environment process; not a Clinic Mode control"],
    ["RCAP_PARTNER_ONBOARDING_ENABLED", "src/lib/partners/onboarding/feature.ts", "false/absent", "unset", "unknown", "unknown", "Enables general partner onboarding", "Partner onboarding", "Enable only after phase-43+ schema and partner configuration review"],
    ["RCAP_ONBOARDING_PREFILL_ENABLED", "src/lib/partners/onboarding/feature.ts", "false/absent", "unset", "unknown", "unknown", "Enables onboarding prefill only when onboarding enabled", "Partner onboarding", "Server-only approved flag change"],
    ["RCAP_ONBOARDING_LAUNCH_PREP_ENABLED", "src/lib/partners/onboarding/feature.ts", "false/absent", "unset", "unknown", "unknown", "Enables general artifacts, QR and launch readiness", "Partner onboarding", "Requires onboarding flag and phase-45/47 schema; does not enable Clinic Mode"],
    ["NEXT_PUBLIC_WILMA_ENABLED", "src/components/expungement-ai/WilmaBubble.tsx", "enabled unless exactly false", "unset", "unknown", "unknown", "Controls Wilma bubble, not clinic assistance", "Participant product", "Not a Clinic Mode control"],
    ["LEGALEASE_FINAL_IMPACT_REPORT_USE_SEED_FIXTURES", "src/lib/reports/partner-final-impact-report-data.ts", "false unless true; ignored in production", "unset", "unknown", "unknown", "Forces seeded final impact report outside production", "Reporting", "Must remain false for operational reporting; report routes still require auth remediation"],
    ["Supabase public URL/anon key", "src/lib/supabase/config.ts", "required for auth routes", "unset", "unknown", "not read", "Authentication and RLS client", "Platform", "Supply only through authorized synthetic environment"],
    ["SUPABASE_SERVICE_ROLE_KEY", "server configuration", "required for privileged services", "unset", "unknown", "not read", "Code claims, resume storage, packets and reports", "Platform security", "Never expose; use scoped staging credentials"],
    ["Partner payment/qualification/provisioning/publication state", "partner_records/public partner projection", "fail closed", "no fixture", "unknown", "not read", "Controls ordinary /p and /intake reachability", "Partner operations", "Set synthetic partner paid/demo, qualified, provisioned and published"],
    ["Partner access_mode/code state", "partner_records/partner_access_codes", "open or stored value", "no fixture", "unknown", "not read", "Controls ordinary intake code requirement and valid/disabled/expired/exhausted results", "Partner admin", "Use /partner/access-codes after role fix; no event state"],
    ["Partner entitlement/capacity/sponsorship", "partner_entitlement", "database record required", "no fixture", "unknown", "not read", "Partner-wide sponsored packet cap", "LegalEase operations", "No safe event-level activation exists"],
    ["Application deployment target", "data/rcap-staging-authorization-readiness.json", "none", "blank/unset", "blank", "not read", "Prevents deployed browser verification", "Release engineering", "Provide authorized staging URL/project ref and synthetic fixture authority"]
  ].map(([name, sourceName, defaultValue, developmentValue, stagingValue, productionValue, effect, owner, safeActivationProcedure]) => ({ name, source: sourceName, default: defaultValue, developmentValue, stagingValue, productionValue, effect, owner, safeActivationProcedure }))
};

const packetAccountingResults = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  executionMode: "STATIC_CODE_AND_SQL_TRACE_ONLY",
  liveDataUsed: false,
  verdict: "UNSAFE_NOT_PROVEN_END_TO_END",
  cases: [
    ["valid sponsored access bypasses payment", "PARTIAL", "Session flags can mark a matter partner-sponsored, but the session is not bound to the participant user."],
    ["invalid code", "IMPLEMENTED_STATIC", "Validation returns invalid without benefit."],
    ["expired code", "IMPLEMENTED_STATIC", "Validation checks expires_at."],
    ["disabled code", "IMPLEMENTED_STATIC", "Validation checks is_active."],
    ["exhausted code", "IMPLEMENTED_STATIC", "Atomic claim checks uses_count/max_uses."],
    ["one completed sponsored packet consumes exactly one credit", "PARTIAL_UNSAFE", "RPC is session-idempotent, but packet generation occurs first and ignores recorded=false."],
    ["incomplete screening consumes none", "IMPLEMENTED_STATIC", "Accounting is invoked only after ready packet."],
    ["guidance-only consumes none", "IMPLEMENTED_STATIC", "No ready packet route, no accounting call."],
    ["failed generation consumes none", "IMPLEMENTED_STATIC", "Accounting follows ready result."],
    ["retry consumes none additional", "IMPLEMENTED_STATIC_PER_SESSION", "claimed_slot_state prevents double count for one session."],
    ["repeat download consumes none", "IMPLEMENTED_STATIC", "Download route does not invoke accounting."],
    ["separate matters follow approved rule", "NOT_PROVEN", "No Clinic Mode/event accounting rule or browser fixture."],
    ["capacity stop is isolated", "PARTIAL", "Partner-wide pause_at_cap exists; event pool does not."],
    ["credit cannot be replayed across accounts", "FAIL", "sourceSessionId is not bound to user; one session can sponsor another user's claimed matter while later packet accounting reports already_recorded."],
    ["no free packet at cap without overage", "FAIL", "cap_reached_no_overage returns recorded=false after generation, and the route ignores that result."]
  ].map(([rule, result, evidence]) => ({ rule, result, evidence })),
  blockers: ["CLINIC-P0-002", "CLINIC-P0-004"],
  requiredDynamicFixture: "Authorized staging project with phase-41/41b/55 schema, synthetic partner entitlement, packet dry-run worker and ten synthetic auth users."
};

const gaps = [
  {
    id: "CLINIC-P0-001", severity: "P0", title: "No shared-device session boundary or reset; prior participant state can remain visible", affectedRole: "participant and clinic staff", route: "/expungement-ai/screening/[state]?session=[uuid]; /briefcase; all proposed clinic routes", actual: "No End clinic session/Reset device action. Auth cookies persist; screening session UUID remains in history; resume payload with answers is temporarily stored in sessionStorage; no bfcache/history/autofill/cache purge contract exists.", required: "Atomic end-session action that revokes assistance, signs the participant out, clears all sensitive client state and caches, prevents Back leakage, and returns to a clean event entry.", reproduction: ["Start ordinary participant sign-in/intake in one browser profile.", "Observe authenticated cookie and screening URL containing ?session=<uuid>.", "Use email resume and observe expungement-ai:resume-session in sessionStorage before ScreeningFlow removes it.", "Search UI/source for End clinic session or Reset device: none exists.", "Attempt the mandated next-participant reset: no product action is available."], evidence: ["src/components/expungement-ai/screening/ResumeScreeningClient.tsx:47", "src/components/expungement-ai/screening/ScreeningFlow.tsx:155-175", "data/rcap-clinic-mode-audit/browser-evidence.json", "tests/e2e/rcap-clinic-mode-audit/ten-participant-shared-device-audit.mjs"], sourceFiles: ["src/components/expungement-ai/screening/ResumeScreeningClient.tsx", "src/components/expungement-ai/screening/ScreeningFlow.tsx"], owner: "Clinic security", smallestSafeCorrection: "Add a dedicated server-backed assisted-session boundary and reset control; eliminate answer payloads from Web Storage; set no-store/bfcache protections; validate ten sequential participants.", migrationRequired: true, humanDecisionRequired: "Privacy/security must approve the reset and retention contract."
  },
  {
    id: "CLINIC-P0-002", severity: "P0", title: "Caller-supplied screening UUID is not participant-bound, enabling answer overwrite and sponsorship replay", affectedRole: "participant", route: "POST /api/expungement-ai/screening/save-resume; POST /api/expungement-ai/screening/pending; pending claim; packet generate", actual: "Public save/resume accepts a caller-provided sessionId and service-role upserts it. Public pending-result creation accepts product=rcap_partner and any UUID. Sponsorship checks session flags but not the authenticated participant owner.", required: "Every session must be cryptographically/relationally bound to the participant account or a one-time pre-auth handoff; no UUID alone may authorize writes or sponsorship.", reproduction: ["Obtain a partner screening session UUID (the ordinary URL/history exposes it).", "POST save-resume with that UUID, new answers and a different email.", "POST pending with product=rcap_partner and the same sourceSessionId.", "Authenticate as another synthetic participant and claim; static trace shows no user/session equality check."], evidence: ["src/app/api/expungement-ai/screening/save-resume/route.ts:22-69", "src/lib/expungement-ai/screening-resume-service.ts:248-267", "src/app/api/expungement-ai/screening/pending/route.ts:65-84", "src/app/api/expungement-ai/packet/generate/route.ts:29-63"], sourceFiles: ["src/app/api/expungement-ai/screening/save-resume/route.ts", "src/lib/expungement-ai/screening-resume-service.ts", "src/app/api/expungement-ai/screening/pending/route.ts", "src/app/api/expungement-ai/screening/pending/claim/route.ts", "src/lib/expungement-ai/briefcase.ts"], owner: "Participant identity and sponsorship security", smallestSafeCorrection: "Add owner/handoff binding, reject mutation/claim on mismatch, rotate/remove URL capability, and invalidate it at reset.", migrationRequired: true, humanDecisionRequired: "Security review of pre-auth-to-account handoff."
  },
  {
    id: "CLINIC-P0-003", severity: "P0", title: "Final report endpoint permits unauthenticated cross-tenant aggregate reads through service role", affectedRole: "unauthenticated user and all partners", route: "POST /api/partner-reports/final", actual: "Route accepts arbitrary partnerId/partnerName and calls a service-role report loader without authentication or tenant authorization. Weekly endpoint is also unauthenticated and seeded.", required: "Authenticate, authorize partner/internal role, derive partner scope server-side, deny cross-tenant requests, and distinguish live from seed output.", reproduction: ["Send POST JSON with an arbitrary known partnerId to /api/partner-reports/final without cookies.", "Observe no auth call in route and service-role .eq(partner_slug, caller value) in loader.", "Repeat with another partnerId."], evidence: ["src/app/api/partner-reports/final/route.ts:15-47", "src/lib/reports/partner-final-impact-report-data.ts:74-115", "src/app/api/partner-reports/weekly/route.ts:15-49"], sourceFiles: ["src/app/api/partner-reports/final/route.ts", "src/app/api/partner-reports/weekly/route.ts", "src/lib/reports/partner-final-impact-report-data.ts"], owner: "Reporting security", smallestSafeCorrection: "Require session partner, derive/validate partner slug, restrict internal override, add negative route tests; fail closed if seed mode is active outside development.", migrationRequired: false, humanDecisionRequired: "Define which aggregate fields each partner role may export."
  },
  {
    id: "CLINIC-P0-004", severity: "P0", title: "Sponsored packet can be generated when credit accounting reports not recorded", affectedRole: "participant and partner sponsor", route: "POST /api/expungement-ai/packet/generate", actual: "Packet generation completes before credit RPC. The route awaits but ignores recorded/reason. SQL returns recorded=false for already_recorded, no_entitlement, paused_at_cap and cap_reached_no_overage; the ready packet is not rolled back.", required: "Sponsorship authorization and atomic reservation must precede/cover generation; a ready sponsored artifact and exactly one valid ledger result must commit together or fail closed.", reproduction: ["Use a partner session already marked consumed, missing entitlement, or cap reached without overage.", "Associate it to an owned Briefcase item through the unbound source-session path.", "Generate packet; static route trace shows accounting result is discarded after ready artifact."], evidence: ["src/app/api/expungement-ai/packet/generate/route.ts:51-69", "supabase/phase-41b-rcap-screening-analytics.sql:193-290"], sourceFiles: ["src/app/api/expungement-ai/packet/generate/route.ts", "src/lib/expungement-ai/rcap-slot-lifecycle.ts", "supabase/phase-41b-rcap-screening-analytics.sql"], owner: "Payment/accounting platform", smallestSafeCorrection: "Reserve/validate sponsorship atomically before generation and require a recorded included/overage result before releasing artifact; add ledger reconciliation.", migrationRequired: true, humanDecisionRequired: "Confirm approved no-overage behavior and failure compensation."
  },
  {
    id: "CLINIC-P1-001", severity: "P1", title: "No canonical Clinic Mode event model, routes, or management surfaces", affectedRole: "all", route: "NO CURRENT ROUTE", actual: "A general onboarding enum may say Clinic/Event, but there is no clinic event CRUD, exact schedule/timezone/location/status, event page, or clinic navigation.", required: "Canonical tenant-scoped clinic event with internal, partner and participant surfaces.", reproduction: ["List src/app routes and API handlers.", "Search schema/migrations for clinic_events and event foreign keys.", "Open /internal/clinic, /partner/clinic and /clinic/audit-event; all return 404."], evidence: ["data/rcap-clinic-mode-audit/browser-evidence.json", "src/lib/partners/onboarding/schema.ts:561-600", "supabase/partner-journey-os.sql:128-138"], sourceFiles: ["src/app", "src/lib/partners/onboarding/schema.ts", "supabase/partner-journey-os.sql"], owner: "Clinic product and data platform", smallestSafeCorrection: "Create event entity/CRUD/access layers and wire it to existing partner identity without inventing a permanent clinic role.", migrationRequired: true, humanDecisionRequired: "Confirm event lifecycle/status and ownership semantics."
  },
  {
    id: "CLINIC-P1-002", severity: "P1", title: "No event attribution across session, matter, packet, follow-up or reports", affectedRole: "all", route: "/intake/[partnerSlug] and downstream", actual: "Only partner_slug, access-code ID, campaign_name and coarse attribution_source survive on screening session; event identity is absent downstream.", required: "Immutable event ID consistently bound to participant session, matter, packet, credit ledger, follow-up and reporting.", reproduction: ["Start at /intake/[partnerSlug] with code/campaign.", "Inspect phase-41/41b columns.", "Inspect Briefcase, document packet, follow-up and report models for event_id: none."], evidence: ["supabase/phase-41-rcap-partner-access-codes.sql:153-178", "supabase/phase-41b-rcap-screening-analytics.sql:26-62"], sourceFiles: ["supabase/phase-41-rcap-partner-access-codes.sql", "supabase/phase-41b-rcap-screening-analytics.sql"], owner: "Clinic data platform", smallestSafeCorrection: "Add canonical event foreign keys and immutable server propagation; reject partner/program/event disagreement.", migrationRequired: true, humanDecisionRequired: "Set attribution retention and late/reassigned event rules."
  },
  {
    id: "CLINIC-P1-003", severity: "P1", title: "Assisted intake, consent, ephemeral staff access and approved event staff are absent", affectedRole: "clinic staff and participant", route: "NO CURRENT ROUTE", actual: "Only permanent partner_admin/partner_staff memberships and participant-owned normal flow exist. There is no assistance consent, staff actor identity, decline path, session expiry or event staff membership.", required: "Personal staff accounts, event-scoped approval, explicit participant consent and automatically expiring least-privilege assistance while participant stays owner.", reproduction: ["Inspect partner_users roles and team routes.", "Search assisted/consent/event staff models and routes.", "Attempt to locate a staff-assisted entry: none."], evidence: ["src/lib/partners/session-partner.ts:5-18", "supabase/phase-21-partner-auth-rls-foundation.sql:15-75"], sourceFiles: ["src/lib/partners/session-partner.ts", "src/app/partner/team", "supabase/phase-21-partner-auth-rls-foundation.sql"], owner: "Clinic product, identity, privacy", smallestSafeCorrection: "Implement event membership, assistance session and explicit consent ledger with post-session denial tests.", migrationRequired: true, humanDecisionRequired: "Counsel/privacy approve consent text and allowed assistance scope."
  },
  {
    id: "CLINIC-P1-004", severity: "P1", title: "Participant follow-up queue is documented but absent", affectedRole: "partner staff/admin and participant", route: "NO CURRENT ROUTE", actual: "No participant follow-up entity or surface supports status, assignment, due date, contact method, event/jurisdiction filters, privacy or history. Onboarding tasks are setup tasks only.", required: "Operational follow-up queue with canonical status semantics and approved data scope.", reproduction: ["Search routes and schema for participant follow-up.", "Open /partner/follow-up; 404.", "Inspect partner dashboard; it shows aggregate incompletes only."], evidence: ["docs/rcap/RCAP_SOURCE_OF_TRUTH_v2.md:282-344", "data/rcap-clinic-mode-audit/browser-evidence.json"], sourceFiles: ["src/app/partner/dashboard/page.tsx", "supabase/phase-42-partner-onboarding.sql"], owner: "Case journey and clinic operations", smallestSafeCorrection: "Implement follow-up records/queue with assignment, audit history, filters and least-privilege detail.", migrationRequired: true, humanDecisionRequired: "Operations/legal define statuses, contact permissions and closure rules."
  },
  {
    id: "CLINIC-P1-005", severity: "P1", title: "No event reporting; generic reporting is partly seeded and conflates unsupported metrics", affectedRole: "partner admin and LegalEase", route: "NO CURRENT CLINIC REPORTING ROUTE; adjacent /dashboard/partners and report APIs", actual: "No event filter/dimension, follow-up/referral/incident metrics, home market, or credit remaining per event. Internal dashboard uses seeded data including an Expungement Clinic campaign.", required: "Truthful event-scoped aggregate reporting that separates started, screened, possible path, packet, filed and cleared.", reproduction: ["Open /partner/clinic/reports; 404.", "Trace /dashboard/partners to partner-dashboard-data.ts.", "Inspect report data models for event ID: none."], evidence: ["src/lib/partner-dashboard-data.ts", "src/lib/reports/partner-final-impact-report-data.ts", "data/rcap-clinic-mode-audit/browser-evidence.json"], sourceFiles: ["src/app/dashboard/partners", "src/lib/partner-dashboard-data.ts", "src/lib/reports/partner-final-impact-report-data.ts"], owner: "Reporting", smallestSafeCorrection: "Build event-scoped live queries and labels; remove seed fallback from operational routes; add honest funnel assertions.", migrationRequired: true, humanDecisionRequired: "Approve aggregate/participant-detail reporting scope."
  },
  {
    id: "CLINIC-P1-006", severity: "P1", title: "Partner staff can mutate access codes through APIs despite admin-only UI", affectedRole: "partner staff", route: "/api/partners/access-codes; /api/partners/access-codes/toggle; /api/partners/access-mode", actual: "UI requires partner_admin, but resolveAuthorizedPartnerSlug authorizes both partner_admin and partner_staff; APIs do not re-check role and stamp createdBy=partner_admin.", required: "Server-side partner_admin check for code/mode mutation and truthful actor identity.", reproduction: ["Authenticate as active partner_staff.", "POST own partnerSlug to access-code or access-mode API.", "Helper returns authorized own slug; route performs mutation."], evidence: ["src/app/partner/access-codes/page.tsx:75-99", "src/lib/partners/partner-scope-auth.ts:9-25", "src/app/api/partners/access-codes/route.ts:36-69"], sourceFiles: ["src/lib/partners/partner-scope-auth.ts", "src/app/api/partners/access-codes/route.ts", "src/app/api/partners/access-codes/toggle/route.ts", "src/app/api/partners/access-mode/route.ts"], owner: "Partner identity/security", smallestSafeCorrection: "Add server-side role-aware guards to every mutation and record auth user/actual role.", migrationRequired: false, humanDecisionRequired: "Confirm whether staff may read analytics but not mutate."
  },
  {
    id: "CLINIC-P1-007", severity: "P1", title: "Launch-kit QR is general, unpublished and not event/code-specific", affectedRole: "operator, partner admin, participant", route: "/internal/partners/onboarding/[partnerSlug]; /partner/onboarding/resources", actual: "QR encodes /p/[partnerSlug], marks published=false, and carries no event or code. It cannot prove final clinic attribution/access.", required: "Approved event-specific QR bound to active event and safe code/handoff without exposing secrets in URL.", reproduction: ["Generate Partner Launch Kit with launch-prep enabled.", "Inspect target URL and published flag.", "Scan target; it enters ordinary partner page."], evidence: ["src/lib/partners/onboarding/artifact-service.ts:704-722", "src/lib/partners/onboarding/artifact-generator.ts:2484-2500"], sourceFiles: ["src/lib/partners/onboarding/artifact-service.ts", "src/lib/partners/onboarding/artifact-generator.ts"], owner: "Clinic product and partner onboarding", smallestSafeCorrection: "Generate event QR only after event publication; bind attribution through a one-time/opaque event handoff.", migrationRequired: true, humanDecisionRequired: "Decide whether QR carries public event slug or opaque token."
  },
  {
    id: "CLINIC-P1-008", severity: "P1", title: "Capacity and sponsorship are partner-wide, not event-scoped", affectedRole: "operator and partner admin", route: "/partner/access-codes and packet generation", actual: "Onboarding stores planned code capacity, while enforcement uses partner_entitlement. No event allocation, capacity stop, sponsor owner, or per-event pool exists.", required: "Event allocation and stop state that cannot leak or consume another event/tenant pool.", reproduction: ["Set planned code_level_capacity in onboarding.", "Trace intake/claim/packet RPCs.", "Observe they use partner entitlement and access-code max uses, not event allocation."], evidence: ["src/lib/partners/onboarding/schema.ts:918-967", "supabase/phase-41b-rcap-screening-analytics.sql:213-290"], sourceFiles: ["src/lib/partners/onboarding/schema.ts", "supabase/phase-41b-rcap-screening-analytics.sql"], owner: "Clinic accounting", smallestSafeCorrection: "Add event allocation/ledger and enforce before claim/generation with tenant/event consistency constraints.", migrationRequired: true, humanDecisionRequired: "Define whether event pool reserves or draws from partner pool."
  },
  {
    id: "CLINIC-P1-009", severity: "P1", title: "Planned reporting viewer role is not a runtime role", affectedRole: "partner viewer", route: "partner portal", actual: "Onboarding accepts reporting_viewer as a planned role, but partner_users only permits partner_admin, partner_staff and internal_admin.", required: "Either map viewer planning to an approved least-privilege runtime role or remove the false promise; do not invent uncontrolled clinic roles.", reproduction: ["Select reporting viewer in onboarding plan.", "Inspect partner_users role CHECK and session resolver.", "No runtime viewer can be provisioned."], evidence: ["src/lib/partners/onboarding/schema.ts:143-154", "supabase/phase-21-partner-auth-rls-foundation.sql:41-75"], sourceFiles: ["src/lib/partners/onboarding/schema.ts", "src/lib/partners/session-partner.ts", "supabase/phase-21-partner-auth-rls-foundation.sql"], owner: "Identity and partner product", smallestSafeCorrection: "Make an explicit governance decision: approved read-only role with server/RLS tests, or remove planned viewer option.", migrationRequired: true, humanDecisionRequired: "Role governance decision required."
  },
  {
    id: "CLINIC-P1-010", severity: "P1", title: "Clinic-day operating controls and incident lifecycle are absent", affectedRole: "operator and clinic staff", route: "NO CURRENT ROUTE", actual: "General onboarding can record training, support, referral and program pause plans, but there is no device/network rehearsal, event monitor, incident record, pause/close control, end-of-day review or post-clinic job.", required: "Executable clinic-day runbook backed by event controls and incident/follow-up records.", reproduction: ["Inspect launch-readiness definitions.", "Search event monitor/incident/rehearsal/device/network routes and models.", "No operational surface exists."], evidence: ["src/lib/partners/onboarding/launch-readiness.ts:517-667", "src/lib/partners/onboarding/schema.ts:1512-1701"], sourceFiles: ["src/lib/partners/onboarding/launch-readiness.ts", "src/lib/partners/onboarding/schema.ts"], owner: "Clinic operations", smallestSafeCorrection: "Add event readiness checklist, device/network rehearsal record, live monitor, incident/pause workflow and closeout review.", migrationRequired: true, humanDecisionRequired: "Operations define pause authority, incident severity and escalation SLAs."
  },
  {
    id: "CLINIC-P1-011", severity: "P1", title: "No authorized staging target or complete fixture configuration for dynamic proof", affectedRole: "auditor/release operator", route: "environment", actual: "Acceptance project reference, public URL, service key and hosted app URL are unavailable in this session. Local auth route returned 500 without Supabase public config. July production reconciliation shows phase-41/41b tables were repository-only then.", required: "Authorized synthetic staging app and project with known applied migrations, test accounts, email capture and packet dry-run worker.", reproduction: ["Read data/rcap-staging-authorization-readiness.json.", "Inspect environment presence without printing values.", "Open /partner/access-codes locally; missing public Supabase config causes 500."], evidence: ["data/rcap-staging-authorization-readiness.json", "data/rcap-clinic-mode-audit/browser-evidence.json", "docs/rcap/production/MIGRATION_20260728213131_RECONCILIATION.md:121-179"], sourceFiles: ["data/rcap-staging-authorization-readiness.json", "docs/rcap/production/MIGRATION_20260728213131_RECONCILIATION.md"], owner: "Release engineering", smallestSafeCorrection: "Provision an authorized synthetic staging target and publish redacted migration/flag/fixture evidence.", migrationRequired: "Current deployed migration state must be verified; no migration was applied in Phase A.", humanDecisionRequired: "Release owner must authorize staging target and fixture creation."
  },
  {
    id: "CLINIC-P2-001", severity: "P2", title: "Clinic/campaign vocabulary can falsely imply an event exists", affectedRole: "operator and partner admin", route: "onboarding; /partner/access-codes; /dashboard/partners", actual: "Clinic is a program_model enum, campaign name placeholder says July clinic, and seeded dashboard includes Expungement Clinic.", required: "Labels must distinguish generic program/campaign from a canonical clinic event.", reproduction: ["Choose Clinic program model.", "Enter campaign July clinic.", "Observe no event is created."], evidence: ["src/lib/partners/onboarding/schema.ts:114-121", "src/app/partner/access-codes/PartnerAccessCodesManager.tsx", "src/lib/partner-dashboard-data.ts"], sourceFiles: ["src/lib/partners/onboarding/schema.ts", "src/app/partner/access-codes/PartnerAccessCodesManager.tsx", "src/lib/partner-dashboard-data.ts"], owner: "Content design", smallestSafeCorrection: "Rename adjacent labels until a real event entity exists, then use event-linked selectors.", migrationRequired: false, humanDecisionRequired: "Content/product naming decision."
  },
  {
    id: "CLINIC-P2-002", severity: "P2", title: "Authentication configuration failure renders a 500 instead of a safe denial", affectedRole: "unauthenticated partner user", route: "/partner/access-codes", actual: "Missing Supabase public URL/anon key throws before SessionPartnerError handling, producing 500 in local browser audit.", required: "Configuration preflight or safe unavailable state without stack-bearing product failure.", reproduction: ["Run app without Supabase public config.", "Open /partner/access-codes.", "Observe HTTP 500."], evidence: ["data/rcap-clinic-mode-audit/browser-evidence.json", "src/lib/supabase/config.ts:1-9"], sourceFiles: ["src/lib/supabase/config.ts", "src/app/partner/access-codes/page.tsx"], owner: "Platform", smallestSafeCorrection: "Add deployment preflight and safe error boundary for configuration absence.", migrationRequired: false, humanDecisionRequired: false
  },
  {
    id: "CLINIC-P3-001", severity: "P3", title: "No consolidated Clinic Mode operator documentation existed", affectedRole: "all operators", route: "documentation", actual: "Repository had general partner/onboarding docs but no truth-first Clinic Mode access and runbook set.", required: "Keep the Phase A guides current with implementation and rehearsal evidence.", reproduction: ["Search docs for dedicated Clinic Mode guide before this audit."], evidence: ["docs/rcap-clinic-mode-audit/**"], sourceFiles: [], owner: "Clinic operations/documentation", smallestSafeCorrection: "Update these guides in Phase B alongside product changes and tests.", migrationRequired: false, humanDecisionRequired: false
  }
];

const gapRegister = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  overallVerdict: "CLINIC_MODE_UNSAFE",
  counts: Object.fromEntries(["P0", "P1", "P2", "P3"].map((severity) => [severity, gaps.filter((gap) => gap.severity === severity).length])),
  gaps
};

const browserEvidence = JSON.parse(await readFile(path.join(dataDir, "browser-evidence.json"), "utf8"));
const tenParticipantOutput = {
  result: "FAIL_CLOSED",
  verdict: "UNSAFE",
  execution: "NOT_RUN_NO_CLINIC_SESSION_BOUNDARY",
  participantCount: 10,
  productResetAction: false,
  stagingFixtureAvailable: false,
  noLeakageProven: false,
  reason: "No Clinic Mode route, assisted-session boundary, or product reset action exists. Running the ordinary flow would not satisfy the contract, and staging fixture credentials were unavailable.",
  staticFindings: ["sensitive resume answers use sessionStorage", "caller-supplied session UUID is service-role upserted", "session UUID appears in screening URL/history", "auth cookies are not cleared by a clinic reset"],
  iterations: Array.from({ length: 10 }, (_, index) => ({ participant: `synthetic-participant-${String(index + 1).padStart(2, "0")}`, status: "NOT_RUN_NO_CLINIC_SESSION_BOUNDARY", leakageAssertion: "NOT_PROVABLE" }))
};

const readinessItems = [
  ["Canonical event identity", "MISSING", "CLINIC-P1-001"],
  ["Approved preregistration/clinic page", "MISSING", "CLINIC-P1-001"],
  ["Final event QR", "MISSING", "CLINIC-P1-007"],
  ["Final event access code", "PARTIAL", "CLINIC-P1-007"],
  ["Approved event staff list", "MISSING", "CLINIC-P1-003"],
  ["Personal staff accounts", "READY_WITH_MANUAL_PROCESS", "CLINIC-P1-003"],
  ["Device plan", "MISSING", "CLINIC-P1-010"],
  ["Shared-device reset", "UNSAFE", "CLINIC-P0-001"],
  ["Network fallback", "MISSING", "CLINIC-P1-010"],
  ["Legal escalation contact plan", "PARTIAL", "CLINIC-P1-010"],
  ["Technical support route", "PARTIAL", "CLINIC-P1-010"],
  ["Real device/network rehearsal", "MISSING", "CLINIC-P1-010"],
  ["Day-of event monitoring", "MISSING", "CLINIC-P1-010"],
  ["Pause authority/control", "PARTIAL", "CLINIC-P1-010"],
  ["Event capacity stop", "MISSING", "CLINIC-P1-008"],
  ["Incident process", "MISSING", "CLINIC-P1-010"],
  ["End-of-day usage/incident review", "MISSING", "CLINIC-P1-010"],
  ["Post-clinic follow-up queue", "MISSING", "CLINIC-P1-004"],
  ["Event reporting", "MISSING", "CLINIC-P1-005"],
  ["Packet accounting safety", "UNSAFE", "CLINIC-P0-004"]
].map(([item, classification, gapId]) => ({ item, classification, gapId }));

const sourceFiles = [
  "AGENTS.md",
  "docs/product-flows/rcap-partner-portal-user-flow.md",
  "docs/rcap/RCAP_SOURCE_OF_TRUTH_v2.md",
  "docs/rcap/RCAP_V2_1_SECTION_6_1_AMENDMENT.md",
  "docs/rcap/production/MIGRATION_20260728213131_RECONCILIATION.md",
  "docs/rcap/production/PRODUCTION_SCHEMA_UPGRADE.md",
  "src/lib/partners/onboarding/schema.ts",
  "src/lib/partners/onboarding/feature.ts",
  "src/lib/partners/onboarding/artifact-service.ts",
  "src/lib/partners/session-partner.ts",
  "src/lib/partners/partner-scope-auth.ts",
  "src/app/partner/access-codes/page.tsx",
  "src/app/api/partners/access-codes/route.ts",
  "src/app/api/expungement-ai/screening/save-resume/route.ts",
  "src/lib/expungement-ai/screening-resume-service.ts",
  "src/app/api/expungement-ai/screening/pending/route.ts",
  "src/app/api/expungement-ai/packet/generate/route.ts",
  "src/app/api/partner-reports/final/route.ts",
  "src/lib/reports/partner-final-impact-report-data.ts",
  "supabase/partner-journey-os.sql",
  "supabase/phase-21-partner-auth-rls-foundation.sql",
  "supabase/phase-32-expungement-screening-sessions.sql",
  "supabase/phase-33-expungement-screening-resume-links.sql",
  "supabase/phase-41-rcap-partner-access-codes.sql",
  "supabase/phase-41b-rcap-screening-analytics.sql"
];
const evidenceHashes = [];
for (const file of sourceFiles) {
  const bytes = await readFile(file);
  evidenceHashes.push({ file, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length });
}
const evidenceIndex = {
  schemaVersion: 1,
  auditBaseSha: BASE_SHA,
  auditBranch: AUDIT_BRANCH,
  productionDataUsed: false,
  productBehaviorFilesChanged: 0,
  browserEnvironment: browserEvidence.environment,
  browserCaptureCount: browserEvidence.evidence.length,
  browserEvidencePath: "data/rcap-clinic-mode-audit/browser-evidence.json",
  tenParticipantEvidencePath: "data/rcap-clinic-mode-audit/ten-participant-shared-device-results.json",
  sourceHashes: evidenceHashes
};

await writeJson("intended-contract.json", intendedContract);
await writeJson("implementation-inventory.json", implementationInventory);
await writeJson("access-map.json", accessMap);
await writeJson("data-model.json", dataModel);
await writeJson("roles-and-permissions.json", rolesAndPermissions);
await writeJson("configuration-matrix.json", configurationMatrix);
await writeJson("packet-accounting-results.json", packetAccountingResults);
await writeJson("gap-register.json", gapRegister);
await writeJson("ten-participant-shared-device-results.json", tenParticipantOutput);
await writeJson("evidence-index.json", evidenceIndex);
await writeJson("repository-state.json", {
  auditBaseSha: BASE_SHA,
  originMainSha: BASE_SHA,
  auditBranch: AUDIT_BRANCH,
  safetyBranch: "safety/pre-rcap-clinic-mode-audit-20260823T165407Z",
  safetyBranchPushed: true,
  fetchedOriginWithPrune: true,
  trackedWorktreeCleanBeforeBranch: true,
  mergeOrRebaseInProgressBeforeBranch: false,
  registeredWorktreesAtStart: 1,
  otherAgentWritingThisWorktree: false
});
await writeJson("verification-results.json", {
  auditBaseSha: BASE_SHA,
  productionDataUsed: false,
  tests: [
    ["audit artifact consistency", "node scripts/rcap-clinic-mode-audit/verify-audit.mjs", "PASS"],
    ["ten-participant contract", "node tests/e2e/rcap-clinic-mode-audit/ten-participant-shared-device-audit.mjs", "FAIL_CLOSED_UNSAFE: ten iterations not runnable without Clinic Mode/reset boundary"],
    ["local browser evidence", "node scripts/rcap-clinic-mode-audit/capture-browser-evidence.mjs", "PASS: 9 non-sensitive screenshots; requested capacity/code failure blocked by missing staging fixture"],
    ["partner access codes", "node scripts/verify-rcap-partner-access-codes.mjs", "PASS"],
    ["screening analytics", "node scripts/verify-rcap-screening-analytics.mjs", "PASS"],
    ["screening resume links", "node scripts/verify-expungement-screening-resume-links.mjs", "PASS"],
    ["general partner attribution", "node scripts/verify-rcap-partner-attribution.mjs", "PASS with documented county/UTM persistence gap"],
    ["slot lifecycle", "node scripts/verify-rcap-slot-lifecycle.mjs", "PASS"],
    ["onboarding launch kit", "node scripts/verify-rcap-onboarding-launch-kit.mjs", "PASS 15/15"],
    ["onboarding launch readiness", "node scripts/verify-rcap-onboarding-launch-readiness.mjs", "PASS 21/21 plus scope checks"],
    ["final impact live data", "node scripts/verify-rcap-final-impact-live-data.mjs", "PASS; does not test report-route authorization"],
    ["onboarding security", "node scripts/verify-rcap-partner-onboarding-security.mjs", "PASS 47/47"],
    ["partner mode", "node scripts/verify-rcap-partner-mode.mjs", "PASS"],
    ["partner intake slot claim", "node scripts/verify-rcap-partner-intake-slot-claim.mjs", "PASS"],
    ["public profile route", "node scripts/verify-public-profile-route.mjs", "PASS"],
    ["internal admin browser access", "node scripts/verify-internal-admin-browser-access.mjs", "PASS 20/20"],
    ["authenticated partner RLS", "node scripts/verify-partner-auth-rls-foundation.mjs", "ENVIRONMENT_BLOCKED: Supabase URL/anon/service key and five synthetic role credential pairs absent"],
    ["authenticated dashboard tenant isolation", "node scripts/verify-partner-dashboard-rls-isolation.mjs", "ENVIRONMENT_BLOCKED: Supabase URL/anon key and five synthetic role credential pairs absent"]
  ].map(([name, command, result]) => ({ name, command, result }))
});
await writeJson("readiness-verdict.json", {
  auditBaseSha: BASE_SHA,
  overallVerdict: "CLINIC_MODE_UNSAFE",
  readyForSyntheticRehearsal: false,
  readyForRealParticipants: false,
  exactBlocker: "No canonical event/assistance/reset boundary; cross-participant session and sponsorship binding is unsafe; packet accounting may release an uncounted sponsored packet; final-report API lacks tenant authorization.",
  capabilityVerdicts: implementations.map(({ capabilityId, capability, status, gap }) => ({ capabilityId, capability, status, gap })),
  clinicDayItems: readinessItems
});

const notImplemented = (gap) => `**NOT CURRENTLY IMPLEMENTED** — [${gap}](./gap-register.md#${gap.toLowerCase()})`;

await writeDoc("01-what-was-built.md", `# What was actually built

Tested against \`${BASE_SHA}\`. Overall verdict: **CLINIC_MODE_UNSAFE**.

There is no dedicated Clinic Mode. What exists is a collection of adjacent general-partner capabilities:

- Partner onboarding can label a program **Clinic** or **Event**, collect program-level dates/geography/access/support plans, and generate approval artifacts. It is behind \`RCAP_PARTNER_ONBOARDING_ENABLED\` and \`RCAP_ONBOARDING_LAUNCH_PREP_ENABLED\`.
- The general launch kit can generate a QR to \`/p/[partnerSlug]\`; code marks the destination unpublished and the QR has no event identity or event code.
- Partner admins have a generic **Access codes** page at \`/partner/access-codes\`. Codes can be shared, limited-use, single-use, disabled, expired or exhausted and may carry a free-text campaign name.
- The ordinary participant path is \`/p/[partnerSlug]\` → **Start your record-clearing screening** → create account/sign in → \`/intake/[partnerSlug]\` → Wilma screening → Briefcase.
- Generic partner screening attribution stores partner slug, access-code ID, campaign name and source; it does not store a clinic event.
- Generic save/resume, participant-owned Briefcase, sponsored packet bypass, partner-wide packet accounting and aggregate dashboard metrics exist.
- Only permanent roles \`partner_admin\`, \`partner_staff\`, and \`internal_admin\` exist. There is no uncontrolled permanent clinic role.

The dedicated event model, event staff, assistance consent, temporary staff access, device reset, participant follow-up queue, clinic reporting, incident flow, event capacity, and end-of-day workflow are absent. See [implementation inventory](../../data/rcap-clinic-mode-audit/implementation-inventory.json) and [gap register](./gap-register.md).

The generic surfaces are not safe substitutes. A caller-supplied screening UUID is not participant-bound; the report API has a tenant-authorization defect; and packet generation can finish before an accounting failure is evaluated.
`);

await writeDoc("02-how-to-access-clinic-mode.md", `# How to access Clinic Mode

## Clinic Mode URLs

| User | URL | Current result |
| --- | --- | --- |
| LegalEase operator setup | \`NO CURRENT ROUTE\` | ${notImplemented("CLINIC-P1-001")} |
| Partner administrator | \`NO CURRENT ROUTE\` | ${notImplemented("CLINIC-P1-001")} |
| Clinic staff | \`NO CURRENT ROUTE\` | ${notImplemented("CLINIC-P1-003")} |
| Participant clinic entry | \`NO CURRENT ROUTE\` | ${notImplemented("CLINIC-P1-001")} |
| Follow-up queue | \`NO CURRENT ROUTE\` | ${notImplemented("CLINIC-P1-004")} |
| Event reporting | \`NO CURRENT ROUTE\` | ${notImplemented("CLINIC-P1-005")} |
| Shared-device reset | \`NO CURRENT ROUTE\` | ${notImplemented("CLINIC-P0-001")} |

## Adjacent general-partner URLs

These are not Clinic Mode:

- LegalEase partner record: \`/internal/partners/admin/[partnerSlug]\` (\`internal_admin\`).
- LegalEase general onboarding: \`/internal/partners/onboarding/[partnerSlug]\` (\`internal_admin\`, onboarding flag).
- Partner dashboard: \`/partner/dashboard\` (active \`partner_admin\` or \`partner_staff\`).
- Generic access codes: \`/partner/access-codes\` (UI requires \`partner_admin\`).
- Team accounts: \`/partner/team\` (\`partner_admin\`).
- Approved resources: \`/partner/onboarding/resources\` (\`partner_admin\`, onboarding/launch-prep flags).
- Public partner page: \`/p/[partnerSlug]\`.
- Ordinary partner intake: \`/intake/[partnerSlug]\` after participant account creation/sign-in.
- Participant Briefcase: \`/briefcase\`.

Do not try to reveal Clinic Mode by toggling a hidden flag: no Clinic Mode flag or route exists. Exact route evidence is in [access-map.json](../../data/rcap-clinic-mode-audit/access-map.json).
`);

await writeDoc("03-legalease-operator-guide.md", `# LegalEase operator guide

Clinic event operation is not available today.

1. Sign in as an active \`internal_admin\`. This general identity is implemented.
2. Open \`/internal/partners/admin\`, choose a partner, and review generic commercial/provisioning status.
3. Open \`/internal/partners/onboarding/[partnerSlug]\` only if \`RCAP_PARTNER_ONBOARDING_ENABLED=true\` and the required onboarding migrations are applied.
4. General onboarding can record **Program model = Clinic**, program dates, geography, out-of-area policy, planned access/capacity, planned users, support/referral contacts, reporting recipients and pause procedures. This does not create a clinic event.
5. If launch prep is enabled, generate/approve the general Partner Launch Kit. Its QR points to \`/p/[partnerSlug]\`, is marked unpublished by the builder, and does not carry event attribution.

The required operator steps below are unavailable:

- Create/open event; event name/date/time/timezone/location: ${notImplemented("CLINIC-P1-001")}.
- Set event geography/out-of-area enforcement: ${notImplemented("CLINIC-P1-001")}.
- Configure an event code and final event QR: ${notImplemented("CLINIC-P1-007")}.
- Set event capacity/sponsorship pool: ${notImplemented("CLINIC-P1-008")}.
- Assign approved event staff, referral contact and follow-up owner: ${notImplemented("CLINIC-P1-003")} and ${notImplemented("CLINIC-P1-004")}.
- Preview a participant clinic page and run a synthetic clinic participant: ${notImplemented("CLINIC-P1-001")}.
- View event reporting: ${notImplemented("CLINIC-P1-005")}.
- Pause, close or archive an event: ${notImplemented("CLINIC-P1-010")}.

Do not activate the ordinary partner page or codes as a clinic workaround. Do not use real participants. Do not invoke the report APIs until [CLINIC-P0-003](./gap-register.md#clinic-p0-003) is fixed.
`);

await writeDoc("04-partner-admin-guide.md", `# Partner administrator guide

There is no partner Clinic Mode surface.

What an active \`partner_admin\` can use today:

1. Sign in and open \`/partner/dashboard\`.
2. Use **Manage codes** to open \`/partner/access-codes\`. These are generic sponsorship/campaign codes, not event records. Fields are access code, campaign, type, maximum uses, expiry and description.
3. Use **Manage team** to open \`/partner/team\` and invite personal \`partner_admin\` or \`partner_staff\` accounts. Never use shared staff credentials.
4. If onboarding flags and approved artifacts exist, open \`/partner/onboarding/resources\` to download general program materials.
5. View only general aggregate dashboard counts. There is no participant-level clinic queue.

Unavailable operations:

- Create/edit/publish/pause/close a clinic event: ${notImplemented("CLINIC-P1-001")}.
- Download an event-specific QR/code asset: ${notImplemented("CLINIC-P1-007")}.
- Assign event-only staff or follow-up owner: ${notImplemented("CLINIC-P1-003")}.
- View event capacity, follow-up queue, event report or export: ${notImplemented("CLINIC-P1-004")} and ${notImplemented("CLINIC-P1-005")}.

Server-side guardrail defect: a \`partner_staff\` account can currently call code/access-mode mutation APIs even though the page says admin-only. See [CLINIC-P1-006](./gap-register.md#clinic-p1-006). The system correctly blocks a normal partner account from naming another partner slug in the general scope helper, but unauthenticated final-report access breaks the reporting boundary; see [CLINIC-P0-003](./gap-register.md#clinic-p0-003).
`);

await writeDoc("05-clinic-staff-guide.md", `# Clinic staff guide

Clinic staff must not operate the current product on a shared device with real participants.

There is no clinic dashboard, event identity check, staff assignment, assisted-intake consent, temporary assistance grant, incomplete-participant list, follow-up action, legal escalation action, packet confirmation, **End clinic session**, or **Reset device** control. ${notImplemented("CLINIC-P0-001")}

The only staff identity available is a personal, permanent partner account (normally \`partner_staff\`) invited through \`/partner/team\`. Do not share credentials. A staff member may view general aggregate partner dashboard counts at \`/partner/dashboard\`, but there is no approved participant-level clinic access.

Do not:

- sign a participant into a browser that will be handed directly to the next participant;
- use the staff account as the participant account;
- save participant answers under a staff email;
- copy a screening \`session\` UUID between accounts;
- treat a campaign code or ordinary partner QR as Clinic Mode;
- promise that a packet was sponsored or counted until the P0 accounting defects are fixed.

Day-of workflow: ${notImplemented("CLINIC-P1-010")}.
`);

await writeDoc("06-participant-journey.md", `# Participant journey

There is no participant Clinic Mode URL or preregistration journey.

The adjacent ordinary partner path is:

1. Open a published \`/p/[partnerSlug]\` page.
2. Click **Start your record-clearing screening**.
3. Create an account or sign in. The participant owns this account.
4. Continue to \`/intake/[partnerSlug]\`.
5. If the partner access mode requires a code, enter it and click **Continue**.
6. Complete the Wilma screening.
7. Use **Save progress** to request an emailed resume link, or save the result to the participant-owned Briefcase.
8. Open \`/briefcase\` to continue packet information, generate/download a supported packet, or view guidance.

This path does not establish a clinic event, staff assistance, event consent, event follow-up or shared-device reset. Save/resume is not safe as a Clinic Mode control because the session UUID is not participant-bound and the resume handoff temporarily stores answers in \`sessionStorage\`; see [CLINIC-P0-002](./gap-register.md#clinic-p0-002).

QR clinic entry, event code, clinic attribution, explicit assistance consent, staff session end, clinic follow-up and event reporting: ${notImplemented("CLINIC-P1-001")}.
`);

await writeDoc("07-clinic-day-runbook.md", `# Clinic-day runbook

Overall status: **DO NOT USE WITH REAL PARTICIPANTS**.

## Before clinic day

1. Do not schedule/announce Clinic Mode from this implementation.
2. Wait for all P0 gaps and core P1 event/consent/follow-up/reporting gaps to be corrected.
3. Provision an authorized synthetic staging environment and apply the reviewed migration chain.
4. Run the exact Phase B acceptance suite and ten-participant shared-device simulation.
5. On real venue devices/network, rehearse QR/code, account creation, consent, save/resume, packet/guidance/referral, reset, pause/capacity and incident paths.
6. Record approved staff, device owner, network fallback, legal escalation lead, technical support and pause authority.

## Day of clinic

${notImplemented("CLINIC-P1-010")}. There is no safe product-backed day-of procedure. Ordinary partner intake must not be represented as Clinic Mode.

## End of day and after clinic

${notImplemented("CLINIC-P1-004")}. There is no event closeout, incident review, event report or participant follow-up queue.

See [clinic-day readiness](./clinic-day-readiness.md) for every classified control.
`);

await writeDoc("08-after-clinic-follow-up.md", `# After-clinic follow-up

Participant clinic follow-up is ${notImplemented("CLINIC-P1-004")}.

The source-of-truth document describes a future task-oriented case journey, but current code has no clinic queue with **started**, **in progress**, **needs follow-up**, **packet generated**, **referred on**, or **closed/completed** status; no assignment, due date, contact method, event/partner/jurisdiction filters; and no clinic audit history.

Do not export names from Briefcase or improvise a spreadsheet as a product workaround without a separately approved privacy/operations process. General partner dashboard counts are aggregate and intentionally do not prove that a person is appropriate for follow-up.

Once Phase B is implemented, the closeout procedure must: close the event, reconcile starts/results/packets/credits, triage incompletes/referrals, assign approved follow-up, review incidents, send only permitted communications, and retain an auditable event summary.
`);

await writeDoc("09-troubleshooting.md", `# Troubleshooting

## I cannot find Clinic Mode or Events

That is expected. ${notImplemented("CLINIC-P1-001")}. There is no hidden menu or Clinic Mode flag.

## The QR opens the ordinary partner page

That is the current general launch-kit behavior, not event attribution. See [CLINIC-P1-007](./gap-register.md#clinic-p1-007).

## A staff member cannot open Access codes

The page intentionally requires \`partner_admin\`. The APIs incorrectly permit \`partner_staff\` mutation; do not use that defect. See [CLINIC-P1-006](./gap-register.md#clinic-p1-006).

## Access codes returns a server error locally

Authenticated partner routes require Supabase public URL and anon-key configuration. This audit's local run intentionally had no credentials and recorded HTTP 500. See [CLINIC-P2-002](./gap-register.md#clinic-p2-002).

## I need to reset a shared device

Stop. ${notImplemented("CLINIC-P0-001")}. Manual cookie/history clearing is not an accepted product control and has not passed the ten-participant test.

## The packet looks sponsored but the credit did not change

Stop packet operations and preserve non-sensitive request IDs/log evidence. See [CLINIC-P0-004](./gap-register.md#clinic-p0-004). Do not retry repeatedly or alter entitlements manually.

## I need a clinic report or participant follow-up list

${notImplemented("CLINIC-P1-005")} and ${notImplemented("CLINIC-P1-004")}. Do not call the unauthenticated report endpoints; [CLINIC-P0-003](./gap-register.md#clinic-p0-003) must be fixed first.
`);

await writeDoc("10-security-and-privacy.md", `# Security and privacy assessment

Verdict: **UNSAFE for real participants and not ready for synthetic rehearsal as Clinic Mode**.

The dedicated shared-device session boundary and reset are **NOT CURRENTLY IMPLEMENTED** — see [CLINIC-P0-001](./gap-register.md#clinic-p0-001).

## P0 findings

1. No product reset/session boundary exists. Persistent auth, URL history, resume \`sessionStorage\`, autofill and Back/bfcache behavior are not cleared or tested. [CLINIC-P0-001](./gap-register.md#clinic-p0-001)
2. Screening UUIDs are not bound to participant ownership. Public service-role paths allow answer overwrite and sponsorship replay when a UUID is known. [CLINIC-P0-002](./gap-register.md#clinic-p0-002)
3. Final-report generation accepts arbitrary partner ID without authentication and reads through the service role. [CLINIC-P0-003](./gap-register.md#clinic-p0-003)
4. A sponsored packet may be released after the accounting RPC returns \`recorded=false\`; the route discards the result. [CLINIC-P0-004](./gap-register.md#clinic-p0-004)

## Storage and browser review

- Cookies: Supabase participant auth persists; no clinic reset exists.
- \`localStorage\`: locale and analytics identifiers found; no screening answers found there.
- \`sessionStorage\`: full resumed session including answers is written temporarily.
- IndexedDB: no application use found.
- Service worker: none found.
- Browser cache/bfcache: no clinic-specific no-store/pageshow purge; product reset absent.
- URL/history: screening uses \`?session=<uuid>\`.
- Autofill: sign-in email/password can persist according to browser settings; no clinic hardening.
- Upload/download history: no clinic cleanup; packet download remains in browser/OS history.

## Tenant isolation

General partner RLS and scope helpers are substantial and reject another tenant slug. They do not provide event scope. The report API bypass and the absence of participant/session ownership make the complete Clinic Mode boundary fail.

## Ten participants

The required test is recorded as \`FAIL_CLOSED\`: ten iterations are \`NOT_RUN_NO_CLINIC_SESSION_BOUNDARY\`, and zero leakage was not proven. An absent reset is itself an unsafe verdict under the audit contract.
`);

await writeDoc("clinic-day-readiness.md", `# Clinic-day readiness

Overall classification: **UNSAFE**.

| Item | Classification | Gap |
| --- | --- | --- |
${readinessItems.map((entry) => `| ${entry.item} | ${entry.classification} | [${entry.gapId}](./gap-register.md#${entry.gapId.toLowerCase()}) |`).join("\n")}

No item classified READY_WITH_MANUAL_PROCESS overrides an UNSAFE or MISSING product control. A general partner account, support plan, access code or QR is not Clinic Mode readiness.
`);

await writeDoc("gap-register.md", `# Clinic Mode gap register

Overall verdict: **CLINIC_MODE_UNSAFE**. Counts: P0 ${gapRegister.counts.P0}, P1 ${gapRegister.counts.P1}, P2 ${gapRegister.counts.P2}, P3 ${gapRegister.counts.P3}.

${gaps.map((gap) => `## ${gap.id}: ${gap.title}

- Severity: **${gap.severity}**
- Affected role: ${gap.affectedRole}
- Route: \`${gap.route}\`
- Actual: ${gap.actual}
- Required: ${gap.required}
- Reproduction: ${gap.reproduction.join(" → ")}
- Evidence: ${gap.evidence.map((entry) => `\`${entry}\``).join(", ")}
- Owner: ${gap.owner}
- Smallest safe correction: ${gap.smallestSafeCorrection}
- Migration required: ${String(gap.migrationRequired)}
- Human/legal/operations decision: ${String(gap.humanDecisionRequired)}
`).join("\n")}
`);

await writeDoc("PHASE_B_FIX_PROMPT.md", `# RCAP Clinic Mode Phase B correction prompt

Use Codex GPT-5.6 Sol with high reasoning effort.

## Exact branch and base

- Create branch: \`${FIX_BRANCH}\`
- Create it from exact product base SHA: \`${BASE_SHA}\`
- Phase A evidence branch: \`${AUDIT_BRANCH}\`
- Do not deploy, merge, change production data, run live migrations, change live secrets, or modify live legacy routes.

## Objective

Implement a safe, event-native Clinic Mode and close exactly these audited gaps: ${gaps.filter((gap) => ["P0", "P1"].includes(gap.severity)).map((gap) => gap.id).join(", ")}.

## Required correction order

1. Fix P0 report authorization immediately: require authenticated server-derived tenant scope for both report endpoints and prohibit live use of seed data.
2. Fix screening ownership: bind pre-auth session to one-time handoff and authenticated participant; reject UUID-only save, claim and sponsorship.
3. Fix packet accounting: reserve/authorize before generation and release the artifact only with one atomic included/overage ledger result; define and test no-overage/cap compensation.
4. Build canonical event model, tenant/event consistency constraints, lifecycle, approved event staff membership, incident/closeout, event allocation and attribution.
5. Build explicit assisted-intake consent and automatically expiring staff assistance without transferring participant account/matter ownership.
6. Build shared-device **End clinic session / Reset device** with server revocation, logout, storage/cache/history/bfcache/autofill-safe transition and audit event.
7. Build participant follow-up queue and truthful event reporting.
8. Generate event QR/code assets only for published events and rehearse all synthetic fixtures.

## Exact owned paths

- \`supabase/phase-57-rcap-clinic-events.sql\`
- \`supabase/migrations/20260824010000_rcap_clinic_events.sql\`
- \`src/lib/rcap/clinic/**\`
- \`src/app/internal/partners/admin/[partnerSlug]/clinics/**\`
- \`src/app/api/internal/partners/[partnerSlug]/clinics/**\`
- \`src/app/partner/clinics/**\`
- \`src/app/api/partners/clinics/**\`
- \`src/app/clinic/[eventCode]/**\`
- \`src/app/api/clinic/**\`
- \`src/app/api/partner-reports/final/route.ts\`
- \`src/app/api/partner-reports/weekly/route.ts\`
- \`src/app/api/partners/access-codes/route.ts\`
- \`src/app/api/partners/access-codes/toggle/route.ts\`
- \`src/app/api/partners/access-mode/route.ts\`
- \`src/app/api/expungement-ai/screening/save-resume/route.ts\`
- \`src/app/api/expungement-ai/screening/pending/route.ts\`
- \`src/app/api/expungement-ai/screening/pending/claim/route.ts\`
- \`src/app/api/expungement-ai/packet/generate/route.ts\`
- \`src/lib/expungement-ai/screening-resume-service.ts\`
- \`src/lib/expungement-ai/briefcase.ts\`
- \`src/lib/expungement-ai/rcap-slot-lifecycle.ts\`
- \`tests/e2e/rcap-clinic-mode/**\`
- \`scripts/verify-rcap-clinic-mode-*.mjs\`
- \`docs/rcap-clinic-mode/**\`

## Prohibited paths/actions

- Do not change the legacy Mississippi, Illinois, District of Columbia, Pennsylvania or Texas-Harris generator behavior/routes.
- Do not change Stripe live-mode behavior, Supabase RLS/auth/session logic in production, production environment variables/secrets or production records without Roger approval.
- Do not modify Expungement.ai visual redesign scope, all-50 forms/PDFs/state packs, or unrelated partner/onboarding flows.
- Do not apply migrations outside an isolated local database or the explicitly authorized synthetic staging project.
- Do not use shared staff credentials or invent an uncontrolled permanent clinic role.

## Exact migration decisions

Create canonical \`rcap_clinic_events\`, \`rcap_clinic_event_staff\`, \`rcap_clinic_assistance_sessions\`, \`rcap_clinic_assistance_consents\`, \`rcap_clinic_follow_ups\`, \`rcap_clinic_incidents\`, and an append-only \`rcap_clinic_credit_ledger\`. Add non-null/validated event attribution at the appropriate handoff to screening sessions, consumer matter/Briefcase items, packets, analytics and follow-up. Add participant owner or one-time pre-auth handoff binding to screening sessions. Add tenant/event consistency constraints, indexes, RLS and service-role-only mutation RPCs. Preserve current partner roles; event_staff must reference existing personal accounts and expire/revoke per event. No migration is optional for P0/P1 completion.

## Exact synthetic fixtures

- Partner slug: \`clinic-audit-phase-b\`
- Program name: \`RCAP Clinic Audit Synthetic Program\`
- Event name: \`RCAP Clinic Audit 2026-09-15\`
- Event code: \`CLINIC-AUDIT-2026\`
- Venue: \`Synthetic Community Center, 100 Test Way\`
- Timezone: \`America/Chicago\`
- Starts: \`2026-09-15T09:00:00-05:00\`
- Ends: \`2026-09-15T17:00:00-05:00\`
- Geography: Mississippi; Hinds County; out-of-area policy referral
- Partner admin: \`clinic-admin@example.invalid\`
- Staff: \`clinic-staff-1@example.invalid\`, \`clinic-staff-2@example.invalid\`
- Viewer-negative fixture: \`clinic-viewer@example.invalid\`
- Other tenant: \`clinic-other-tenant@example.invalid\`
- Participants: \`clinic-audit-p01@example.invalid\` through \`clinic-audit-p10@example.invalid\`
- Invalid-state fixtures: code \`CLINIC-EXPIRED-2026\`, \`CLINIC-EXHAUSTED-2026\`, \`CLINIC-DISABLED-2026\`
- Outcomes: sponsored supported packet, non-sponsored supported packet, incomplete follow-up, guidance-only, unsupported/referral
- Use packet dry-run worker and email capture; never create a real payment or send real email.

## Exact acceptance tests

- \`tests/e2e/rcap-clinic-mode/internal-event-crud.spec.ts\`: internal operator creates, previews, publishes, pauses, closes and archives exact fixture event.
- \`tests/e2e/rcap-clinic-mode/partner-admin.spec.ts\`: admin edits allowed fields/downloads QR/manages event staff; staff/viewer/other tenant denied server-side.
- \`tests/e2e/rcap-clinic-mode/assisted-consent.spec.ts\`: explicit accept/decline, timestamp, staff identity, participant ownership and post-session denial.
- \`tests/e2e/rcap-clinic-mode/shared-device.spec.ts\`: one persistent browser profile, participants p01-p10 sequentially; after every reset inspect cookies, localStorage, sessionStorage, IndexedDB, caches, service workers, autofill-visible fields, upload previews, URL/history and Back/Forward; participant N+1 sees no prior PII/answers/files/result/matter/Briefcase/packet/follow-up.
- \`tests/e2e/rcap-clinic-mode/save-resume.spec.ts\`: save on device A, resume on device B; wrong email/user, used handoff and other participant denied.
- \`tests/e2e/rcap-clinic-mode/sponsorship-accounting.spec.ts\`: valid/invalid/expired/exhausted/disabled; one successful sponsored packet exactly one ledger row; incomplete/guidance/failure/retry/re-download zero extra; cap/no-overage produces no artifact; source-session replay by another account denied.
- \`tests/e2e/rcap-clinic-mode/follow-up-reporting.spec.ts\`: statuses, assignment, due date, contact method, filters, history and aggregate distinctions; event/partner/other-tenant isolation.
- \`tests/e2e/rcap-clinic-mode/report-api-auth.spec.ts\`: anonymous, staff without export, revoked and other tenant denied; own admin/internal authorized; seed output impossible outside test/dev.
- \`scripts/verify-rcap-clinic-mode-schema.mjs\`: constraints, FKs, indexes, RLS, grants and audit immutability.
- \`scripts/verify-rcap-clinic-mode-no-sensitive-storage.mjs\`: fail on answer/file/result/PII Web Storage or reset omissions.
- \`scripts/verify-rcap-clinic-mode-product-boundary.mjs\`: prove no legacy generator/route behavior changed.

## Completion gate

All P0/P1 gaps must have passing static, database and browser evidence. The ten-participant test must pass 10/10 with zero leakage. Sponsorship must fail closed when event/session/user/credit bindings disagree. Reports must be tenant/event scoped and truthful. Update every Phase A guide with exact final routes/buttons. Stop at \`READY_FOR_SYNTHETIC_REHEARSAL\`; do not enable real participants, deploy, or apply production migrations.
`);

await writeDoc("README.md", `# RCAP Clinic Mode audit

- Base SHA: \`${BASE_SHA}\`
- Branch: \`${AUDIT_BRANCH}\`
- Verdict: **CLINIC_MODE_UNSAFE**
- Production data used: **no**
- Product behavior files changed: **0**

Start with [What was built](./01-what-was-built.md), [Access map](./02-how-to-access-clinic-mode.md), [Security and privacy](./10-security-and-privacy.md), [Gap register](./gap-register.md), and the [Phase B prompt](./PHASE_B_FIX_PROMPT.md).
`);

console.log(`Generated Clinic Mode audit artifacts for ${BASE_SHA}.`);

async function writeJson(fileName, value) {
  await writeFile(path.join(dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeDoc(fileName, value) {
  await writeFile(path.join(docsDir, fileName), `${value.trim()}\n`, "utf8");
}
