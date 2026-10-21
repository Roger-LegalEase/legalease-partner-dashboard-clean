/**
 * Clinic participant-ownership denial matrix, executed against the real
 * `src/lib/clinic-mode/participant-service.ts`.
 *
 * These paths run through the Supabase *admin* client, which bypasses RLS, so
 * the service module is the only boundary between a caller and another
 * participant's matter. The harness therefore supplies a row store that applies
 * no authorization of its own (see clinic-harness/postgrest-double.mjs): every
 * denial asserted below has to be produced by the module under test.
 *
 * Ownership rule under test: a partner owns its workspace, program
 * configuration, branding, attribution and aggregate reporting. A participant
 * owns the matter, Briefcase, packet, uploads and artifacts. Attribution,
 * sponsorship, assistance and reporting never transfer ownership.
 *
 * Each denial is paired with a source mutation proving this file fails when the
 * corresponding guard is weakened.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./clinic-harness/loader.mjs", import.meta.url);

const { configure } = await import("./clinic-harness/control.mjs");
const { createPostgrestDouble } = await import("./clinic-harness/postgrest-double.mjs");

const servicePath = path.join(process.cwd(), "src/lib/clinic-mode/participant-service.ts");
const serviceSource = fs.readFileSync(servicePath, "utf8");

const ids = {
  eventA: "20000000-0000-4000-8000-00000000000a",
  eventB: "20000000-0000-4000-8000-00000000000b",
  eventDraft: "20000000-0000-4000-8000-00000000000d",
  participantA: "10000000-0000-4000-8000-00000000000a",
  participantB: "10000000-0000-4000-8000-00000000000b",
  sessionA: "30000000-0000-4000-8000-00000000000a",
  sessionB: "30000000-0000-4000-8000-00000000000b",
  sessionAOnEventB: "30000000-0000-4000-8000-00000000000c",
  sessionExpired: "30000000-0000-4000-8000-00000000000d",
  sessionEnded: "30000000-0000-4000-8000-00000000000e",
  sessionUnbound: "30000000-0000-4000-8000-00000000000f",
  screeningA: "40000000-0000-4000-8000-00000000000a",
  screeningB: "40000000-0000-4000-8000-00000000000b",
  screeningAOnEventB: "40000000-0000-4000-8000-00000000000c",
  partnerUserAdminA: "50000000-0000-4000-8000-00000000000a",
  partnerUserStaffA: "50000000-0000-4000-8000-00000000000b",
  partnerUserStaffNoQueue: "50000000-0000-4000-8000-00000000000c",
  authAdminA: "60000000-0000-4000-8000-00000000000a",
  authStaffA: "60000000-0000-4000-8000-00000000000b",
  authStaffNoQueue: "60000000-0000-4000-8000-00000000000c",
  authAdminB: "60000000-0000-4000-8000-00000000000d"
};

const tokens = {
  participantA: "handoff-token-participant-a",
  participantB: "handoff-token-participant-b",
  participantAOnEventB: "handoff-token-participant-a-event-b",
  expired: "handoff-token-expired-consent",
  ended: "handoff-token-revoked-consent",
  unbound: "handoff-token-without-matter",
  entryA: "entry-nonce-event-a",
  entryB: "entry-nonce-event-b",
  entryStale: "entry-nonce-stale"
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const future = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 30 * 60 * 1000).toISOString();

function fixtureTables() {
  return {
    clinic_events: [
      // Event A carries a sponsorship allocation: sponsorship must not become ownership.
      { id: ids.eventA, partner_slug: "tenant-a", public_slug: "tenant-a-clinic", name: "Tenant A clinic", status: "published", sponsorship_allocation: 25 },
      { id: ids.eventB, partner_slug: "tenant-b", public_slug: "tenant-b-clinic", name: "Tenant B clinic", status: "published", sponsorship_allocation: null },
      { id: ids.eventDraft, partner_slug: "tenant-a", public_slug: "tenant-a-draft-clinic", name: "Tenant A unpublished clinic", status: "draft", sponsorship_allocation: null }
    ],
    clinic_assisted_sessions: [
      { id: ids.sessionA, event_id: ids.eventA, participant_user_id: ids.participantA, screening_session_id: ids.screeningA, handoff_token_hash: sha256(tokens.participantA), status: "active", expires_at: future },
      { id: ids.sessionB, event_id: ids.eventA, participant_user_id: ids.participantB, screening_session_id: ids.screeningB, handoff_token_hash: sha256(tokens.participantB), status: "active", expires_at: future },
      { id: ids.sessionAOnEventB, event_id: ids.eventB, participant_user_id: ids.participantA, screening_session_id: ids.screeningAOnEventB, handoff_token_hash: sha256(tokens.participantAOnEventB), status: "active", expires_at: future },
      { id: ids.sessionExpired, event_id: ids.eventA, participant_user_id: ids.participantA, screening_session_id: ids.screeningA, handoff_token_hash: sha256(tokens.expired), status: "active", expires_at: past },
      { id: ids.sessionEnded, event_id: ids.eventA, participant_user_id: ids.participantA, screening_session_id: ids.screeningA, handoff_token_hash: sha256(tokens.ended), status: "ended", expires_at: future },
      { id: ids.sessionUnbound, event_id: ids.eventA, participant_user_id: ids.participantA, screening_session_id: null, handoff_token_hash: sha256(tokens.unbound), status: "active", expires_at: future }
    ],
    screening_sessions: [
      { session_id: ids.screeningA, jurisdiction: "CO" },
      { session_id: ids.screeningB, jurisdiction: "MS" },
      { session_id: ids.screeningAOnEventB, jurisdiction: "TX" }
    ],
    partner_records: [
      { partner_slug: "tenant-a", partner_name: "Tenant A Legal Partner", organization_name: "Tenant A Legal Partner" },
      { partner_slug: "tenant-b", partner_name: "Tenant B Legal Partner", organization_name: "Tenant B Legal Partner" }
    ],
    clinic_event_access_redemptions: [
      { event_id: ids.eventA, redemption_nonce_hash: sha256(tokens.entryA), redeemed_at: new Date().toISOString() },
      { event_id: ids.eventB, redemption_nonce_hash: sha256(tokens.entryB), redeemed_at: new Date().toISOString() },
      { event_id: ids.eventA, redemption_nonce_hash: sha256(tokens.entryStale), redeemed_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString() }
    ],
    partner_users: [
      { id: ids.partnerUserAdminA, auth_user_id: ids.authAdminA, partner_slug: "tenant-a", role: "partner_admin", status: "active" },
      { id: ids.partnerUserStaffA, auth_user_id: ids.authStaffA, partner_slug: "tenant-a", role: "partner_staff", status: "active" },
      { id: ids.partnerUserStaffNoQueue, auth_user_id: ids.authStaffNoQueue, partner_slug: "tenant-a", role: "partner_staff", status: "active" }
    ],
    clinic_event_staff: [
      { id: "70000000-0000-4000-8000-00000000000a", event_id: ids.eventA, partner_user_id: ids.partnerUserStaffA, status: "approved", permissions: ["assist", "queue"], approved_at: "2026-08-01T00:00:00.000Z" },
      { id: "70000000-0000-4000-8000-00000000000b", event_id: ids.eventA, partner_user_id: ids.partnerUserStaffNoQueue, status: "approved", permissions: ["assist"], approved_at: "2026-08-01T00:00:00.000Z" }
    ]
  };
}

function database() {
  return createPostgrestDouble({
    tables: fixtureTables(),
    rpc: {
      clinic_get_event_queue: () => ({ data: [], error: null }),
      clinic_transition_event_case: () => ({ data: "updated", error: null })
    }
  });
}

function as({ auth = null, cookies = {}, sessionPartner = null } = {}) {
  configure({
    auth: auth ? { isAuthenticated: true, userId: auth } : { isAuthenticated: false, userId: null },
    cookies,
    database: database(),
    sessionPartner
  });
}

async function denied(operation, code, label) {
  let thrown = null;
  try {
    await operation();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown, `${label}: access was granted where a denial was required`);
  assert.equal(thrown.name, "ClinicServiceError", `${label}: unexpected error ${thrown.stack}`);
  assert.equal(thrown.code, code, `${label}: denied with "${thrown.code}" instead of "${code}"`);
}

async function runScenarios(service) {
  const {
    getPublicClinicEvent,
    getClinicParticipantSession,
    getActiveClinicParticipantContext,
    getClinicEntryContext,
    getClinicQueueEvent
  } = service;

  // --- Positive control: the owning participant reaches their own matter. ---
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.participantA } });
  const owned = await getClinicParticipantSession("tenant-a-clinic");
  assert.equal(owned.participantUserId, ids.participantA, "the session did not resolve to the authenticated participant");
  assert.equal(owned.screeningSessionId, ids.screeningA, "the handoff did not resolve to its own matter");
  assert.equal(owned.eventSlug, "tenant-a-clinic");
  assert.equal(owned.partnerName, "Tenant A Legal Partner");

  // --- Public event surface: published events only, and no private columns. ---
  as({});
  const published = await getPublicClinicEvent("tenant-a-clinic");
  assert.equal(published.id, ids.eventA);
  assert.deepEqual(
    Object.keys(published).sort(),
    ["endsAt", "geography", "id", "jurisdiction", "locationName", "name", "publicSlug", "startsAt", "status", "timezone"],
    "the public Clinic event projection changed shape"
  );
  for (const key of Object.keys(published)) {
    assert.ok(!/sponsor|partner|capacity|created/iu.test(key), `public event projection exposed "${key}"`);
  }
  await denied(() => getPublicClinicEvent("tenant-c-clinic"), "not_found", "unknown event slug");
  await denied(() => getPublicClinicEvent("tenant-a-draft-clinic"), "not_found", "unpublished event exposed on the public surface");
  await denied(() => getPublicClinicEvent("../tenant-a-clinic"), "not_found", "non-canonical public event slug");

  // --- Anonymous. ---
  as({ cookies: { clinic_session: tokens.participantA } });
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "unauthenticated",
    "anonymous caller holding a valid handoff token");
  as({});
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "unauthenticated", "anonymous caller with no token");

  // --- Wrong user: a real participant replaying another participant's token. ---
  as({ auth: ids.participantB, cookies: { clinic_session: tokens.participantA } });
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "forbidden",
    "participant B replaying participant A's handoff token");

  // --- Wrong matter: the handoff carries no matter binding. ---
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.unbound } });
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "forbidden",
    "handoff with no matter binding");

  // --- Wrong matter: participant A never reaches participant B's screening. ---
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.participantA } });
  const boundary = await getClinicParticipantSession("tenant-a-clinic");
  assert.notEqual(boundary.screeningSessionId, ids.screeningB, "participant A crossed into participant B's matter");
  assert.notEqual(boundary.screeningSessionId, ids.screeningAOnEventB, "the event-A handoff exposed an event-B matter");

  // --- Cross-event: a valid handoff presented at the wrong event. ---
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.participantAOnEventB } });
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "forbidden",
    "event-B handoff presented at event A");
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.participantA } });
  await denied(() => getClinicParticipantSession("tenant-b-clinic"), "forbidden",
    "event-A handoff presented at event B");

  // --- Expired consent. ---
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.expired } });
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "forbidden", "expired assisted-session consent");

  // --- Revoked consent. ---
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.ended } });
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "forbidden", "revoked assisted-session consent");

  // --- No handoff at all on this device. ---
  as({ auth: ids.participantA });
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "forbidden", "device with no Clinic handoff");

  // --- A mutable slug hint cannot be smuggled past normalization. ---
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.participantA } });
  await denied(() => getClinicParticipantSession("../tenant-a-clinic"), "forbidden", "non-canonical event slug");

  // --- Attribution and sponsorship do not transfer ownership. ---
  // Event A belongs to tenant-a and carries a sponsorship allocation. Its own
  // administrator, holding the participant's handoff token, still cannot open
  // the participant's session.
  as({ auth: ids.authAdminA, cookies: { clinic_session: tokens.participantA } });
  await denied(() => getClinicParticipantSession("tenant-a-clinic"), "forbidden",
    "sponsoring tenant administrator replaying a participant handoff token");

  // --- Privacy boundary outside /clinic returns nothing rather than leaking. ---
  for (const [label, context] of [
    ["anonymous", { cookies: { clinic_session: tokens.participantA } }],
    ["wrong user", { auth: ids.participantB, cookies: { clinic_session: tokens.participantA } }],
    ["expired consent", { auth: ids.participantA, cookies: { clinic_session: tokens.expired } }],
    ["revoked consent", { auth: ids.participantA, cookies: { clinic_session: tokens.ended } }],
    ["no handoff", { auth: ids.participantA }],
    ["unbound matter", { auth: ids.participantA, cookies: { clinic_session: tokens.unbound } }]
  ]) {
    as(context);
    assert.equal(await getActiveClinicParticipantContext(), null,
      `privacy boundary leaked Clinic context to: ${label}`);
  }
  as({ auth: ids.participantA, cookies: { clinic_session: tokens.participantA } });
  const active = await getActiveClinicParticipantContext();
  assert.equal(active?.participantUserId, ids.participantA, "the owning participant lost their own privacy context");

  // --- Event entry handoff. ---
  as({ auth: ids.participantA, cookies: { clinic_entry: tokens.entryA } });
  assert.equal((await getClinicEntryContext("tenant-a-clinic")).eventId, ids.eventA);
  as({ auth: ids.participantA, cookies: { clinic_entry: tokens.entryB } });
  await denied(() => getClinicEntryContext("tenant-a-clinic"), "forbidden", "event-B entry nonce presented at event A");
  as({ auth: ids.participantA, cookies: { clinic_entry: tokens.entryStale } });
  await denied(() => getClinicEntryContext("tenant-a-clinic"), "forbidden", "entry nonce older than the redemption window");
  as({ auth: ids.participantA });
  await denied(() => getClinicEntryContext("tenant-a-clinic"), "forbidden", "device that never redeemed an access code");

  // --- Staff queue authorization. ---
  as({});
  await denied(() => getClinicQueueEvent(ids.eventA), "unauthenticated", "anonymous staff queue access");

  as({ auth: ids.authAdminB, sessionPartner: { kind: "partner", authUserId: ids.authAdminB, partnerSlug: "tenant-b", role: "partner_admin" } });
  await denied(() => getClinicQueueEvent(ids.eventA), "forbidden", "tenant-B administrator reading tenant-A's queue");

  as({ auth: ids.authStaffNoQueue, sessionPartner: { kind: "partner", authUserId: ids.authStaffNoQueue, partnerSlug: "tenant-a", role: "partner_staff" } });
  await denied(() => getClinicQueueEvent(ids.eventA), "forbidden", "approved assist-only staff reading the queue");

  as({ auth: ids.authStaffA, sessionPartner: { kind: "partner", authUserId: "60000000-0000-4000-8000-0000000000ff", partnerSlug: "tenant-a", role: "partner_staff" } });
  await denied(() => getClinicQueueEvent(ids.eventA), "forbidden", "tenant-A identity with no partner_users record");

  as({ auth: ids.authAdminA, sessionPartner: { kind: "partner", authUserId: ids.authAdminA, partnerSlug: "tenant-a", role: "partner_admin" } });
  assert.equal((await getClinicQueueEvent(ids.eventA)).id, ids.eventA, "the owning tenant administrator lost queue oversight");

  as({ auth: ids.authStaffA, sessionPartner: { kind: "partner", authUserId: ids.authStaffA, partnerSlug: "tenant-a", role: "partner_staff" } });
  assert.equal((await getClinicQueueEvent(ids.eventA)).id, ids.eventA, "approved queue staff lost their own event queue");
}

// --- Mutation fixtures: each weakened guard must make this file fail. ---
const mutations = [
  ["participant ownership on the handoff lookup", '.eq("participant_user_id", auth.userId)', ""],
  ["assisted-session expiry", '.gt("expires_at", new Date().toISOString())', ""],
  ["assisted-session consent status", '.in("status", ["active", "handed_off"])', ""],
  ["event binding on the handoff", '.eq("id", sessionResult.data.event_id).eq("public_slug", normalizeSlug(eventSlug))', '.eq("id", sessionResult.data.event_id)'],
  ["event binding on the entry redemption", '.eq("id", redemption.data.event_id).eq("public_slug", normalizeSlug(eventSlug))', '.eq("id", redemption.data.event_id)'],
  ["published-only public event lookup", '.eq("status", "published").maybeSingle();\n  if (result.error)', '.maybeSingle();\n  if (result.error)'],
  ["cross-tenant queue boundary", 'if (actor.partnerSlug !== event.data.partner_slug)', "if (false)"],
  ["approved event-staff requirement", 'if (staff.error || !staff.data)', "if (false)"],
  ["queue permission scope", '.contains("permissions", ["queue"])', ""]
];

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "clinic-denial-mutations-"));
try {
  await runScenarios(await import(pathToFileURL(servicePath).href));

  for (const [label, marker, replacement] of mutations) {
    assert.ok(serviceSource.includes(marker), `mutation fixture missing for ${label}`);
    const mutatedPath = path.join(scratch, `participant-service.${mutations.indexOf(mutations.find((entry) => entry[0] === label))}.ts`);
    fs.writeFileSync(mutatedPath, serviceSource.replace(marker, replacement), "utf8");
    let failed = false;
    try {
      await runScenarios(await import(pathToFileURL(mutatedPath).href));
    } catch {
      failed = true;
    }
    assert.ok(failed, `weakening ${label} did not make this denial suite fail`);
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

console.log(`Clinic participant-ownership denials passed: anonymous, wrong-user, wrong-matter, cross-event, cross-tenant, wrong-role, expired and revoked consent all denied against the real service module; ${mutations.length} weakened guards proven to fail this suite.`);
console.log("Production/external databases used: none.");
