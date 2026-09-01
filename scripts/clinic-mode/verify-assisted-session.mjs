import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const required = [
  "src/lib/clinic-mode/device-reset.mjs",
  "src/components/clinic-mode/ClinicPrivacyBoundary.tsx",
  "src/components/clinic-mode/ClinicEntryClient.tsx",
  "src/components/clinic-mode/ClinicAssistanceClient.tsx",
  "src/app/api/clinic/entry/route.ts",
  "src/app/api/clinic/assistance/start/route.ts",
  "src/app/api/clinic/session/reset/route.ts",
  "src/app/api/clinic/events/[eventId]/queue/route.ts",
  "src/lib/clinic-mode/request-security.ts",
  "supabase/migrations/20260901161000_rcap_clinic_consent_security.sql",
  "src/app/briefcase/layout.tsx",
  "src/app/clinic/[eventSlug]/page.tsx",
  "src/app/clinic/[eventSlug]/assist/page.tsx",
  "src/app/clinic/[eventSlug]/screening/[state]/page.tsx",
  "src/app/clinic/staff/[eventId]/queue/page.tsx"
];
for (const file of required) assert.ok(fs.existsSync(path.join(root, file)), `${file} missing`);

const entry = read("src/app/api/clinic/entry/route.ts");
for (const marker of ["clinic_redeem_event_code", "createHash", "httpOnly: true", 'sameSite: "strict"', "secure:"])
  assert.ok(entry.includes(marker), `entry boundary missing ${marker}`);
assert.ok(!/cookies\.set\([^\n]*(code|hash)/iu.test(entry), "raw access code must never be stored in a cookie");

const assistance = read("src/app/api/clinic/assistance/start/route.ts");
for (const marker of ["getServerAuthState", "claimRcapPartnerScreeningSession", "clinic_start_scoped_assisted_session", "p_consent_scope", "clinic_upsert_case", "participant_user_id"])
  assert.ok(assistance.includes(marker), `assistance boundary missing ${marker}`);

const requestSecurity = read("src/lib/clinic-mode/request-security.ts");
for (const marker of ['request.headers.get("origin")', 'request.headers.get("referer")', "Invalid request origin."])
  assert.ok(requestSecurity.includes(marker), `Clinic request security missing ${marker}`);
for (const route of [
  "src/app/api/clinic/entry/route.ts",
  "src/app/api/clinic/assistance/start/route.ts",
  "src/app/api/clinic/session/reset/route.ts",
  "src/app/api/clinic/events/[eventId]/queue/route.ts"
]) assert.match(read(route), /SameOriginClinicMutation|assertClinicMutationRequest/, `${route} must reject cross-origin mutations`);

const consentMigration = read("supabase/migrations/20260901161000_rcap_clinic_consent_security.sql");
for (const marker of ["consent_scope", "consent_matter_id", "consent_revoked_at", "clinic_start_scoped_assisted_session", "assistance_consent_revoked", "clinic_export_event_report", "report_exported"])
  assert.ok(consentMigration.includes(marker), `Clinic consent migration missing ${marker}`);

const resetRoute = read("src/app/api/clinic/session/reset/route.ts");
for (const marker of ["clinic_end_assisted_session", ".auth.signOut", "clinic_session", "clinic_entry", "name.startsWith(\"sb-\")", "Clear-Site-Data", "\"cookies\"", "Cache-Control", "no-store"])
  assert.ok(resetRoute.includes(marker), `reset route missing ${marker}`);
assert.ok(resetRoute.includes("request.cookies"), "reset route must capture cookies from its NextRequest context");
assert.doesNotMatch(resetRoute, /from \"next\/headers\"|\bcookies\(\)|getServerAuthState/, "reset route must not reacquire request-scoped cookies/auth after async work");
assert.match(resetRoute, /const authClient = await createServerSupabaseAuthClient\(\);[\s\S]*authClient\.auth\.getUser\(\)[\s\S]*authClient\.auth\.signOut/, "reset route must reuse one request-bound auth client for identity and sign-out");

const privacy = read("src/components/clinic-mode/ClinicPrivacyBoundary.tsx");
for (const marker of ["End clinic session / Reset device", "resetClinicDeviceState", "pageshow", "event.persisted", "INACTIVITY_LIMIT_MS"])
  assert.ok(privacy.includes(marker), `privacy boundary missing ${marker}`);

const participantService = read("src/lib/clinic-mode/participant-service.ts");
for (const marker of [
  "getActiveClinicParticipantContext",
  "getServerAuthState",
  'get("clinic_session")',
  "handoff_token_hash",
  "participant_user_id",
  '["active", "handed_off"]',
  'gt("expires_at"',
  'select("public_slug")'
]) assert.ok(participantService.includes(marker), `route-independent Clinic privacy context missing ${marker}`);
assert.ok(!participantService.includes("searchParams") && !participantService.includes("artifactRefs"), "Clinic privacy context must not trust route or writable matter data");
assert.match(participantService, /if \(!rawToken\) return null;/, "Clinic privacy context must require the protected session token");
assert.doesNotMatch(participantService, /if \(!rawToken \|\| !eventSlugHint\) return null;/, "missing clinic_event hint must not disable privacy for a valid protected session");
assert.doesNotMatch(participantService, /\.eq\("public_slug", normalizeSlug\(eventSlugHint\)\)/, "clinic_event hint must not override the protected session event authority");
assert.match(participantService, /\.eq\("id", sessionResult\.data\.event_id\)\.maybeSingle\(\)/, "canonical Clinic context must resolve by protected session event_id");

const briefcaseLayout = read("src/app/briefcase/layout.tsx");
for (const marker of ["getActiveClinicParticipantContext", "ClinicPrivacyBoundary", "cleanEntryPath", "children"])
  assert.ok(briefcaseLayout.includes(marker), `Briefcase Clinic privacy layout missing ${marker}`);
assert.ok(!/searchParams|packetId|artifactRefs|paymentStatus/.test(briefcaseLayout), "Briefcase privacy layout must not infer Clinic mode from route, item, or writable status");

const screening = read("src/app/clinic/[eventSlug]/screening/[state]/page.tsx");
for (const marker of ["ScreeningFlow", "getClinicParticipantSession", "participantUserId", "screeningSessionId", 'dynamic = "force-dynamic"'])
  assert.ok(screening.includes(marker), `Clinic screening wrapper missing ${marker}`);

const resetModule = await import(`${pathToFileURL(path.join(root, "src/lib/clinic-mode/device-reset.mjs")).href}?t=${Date.now()}`);
for (let participant = 1; participant <= 10; participant += 1) {
  const fake = fakeBrowser(participant);
  const result = await resetModule.resetClinicDeviceState(fake, "/clinic/synthetic-event");
  assert.equal(result.ok, true, `participant ${participant} reset did not finish`);
  assert.equal(fake.localStorage.size, 0, `participant ${participant} localStorage leaked`);
  assert.equal(fake.sessionStorage.size, 0, `participant ${participant} sessionStorage leaked`);
  assert.deepEqual(fake.deletedDatabases.sort(), ["briefcase", `clinic-${participant}`, "uploads"].sort(), `participant ${participant} IndexedDB leaked`);
  assert.deepEqual(fake.deletedCaches.sort(), [`packet-${participant}`, `preview-${participant}`].sort(), `participant ${participant} Cache Storage leaked`);
  assert.equal(fake.unregistered, 1, `participant ${participant} service worker remained`);
  assert.equal(fake.replacedHistory, "/clinic/synthetic-event", `participant ${participant} history retained identity route`);
  assert.equal(fake.replacedLocation, "/clinic/synthetic-event", `participant ${participant} did not return to clean entry`);
}

console.log("Clinic Mode assisted ownership/reset contract passed.");
console.log("Ten sequential participants: zero simulated browser-state leakage.");

function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }

function fakeBrowser(participant) {
  const localStorage = storage([["participant", String(participant)], ["briefcase", `matter-${participant}`]]);
  const sessionStorage = storage([["answers", `sensitive-${participant}`], ["upload", `preview-${participant}`]]);
  const fake = {
    localStorage,
    sessionStorage,
    deletedDatabases: [],
    deletedCaches: [],
    unregistered: 0,
    replacedHistory: "",
    replacedLocation: "",
    indexedDB: {
      databases: async () => [{ name: `clinic-${participant}` }, { name: "briefcase" }, { name: "uploads" }],
      deleteDatabase(name) { fake.deletedDatabases.push(name); return request(); }
    },
    caches: {
      keys: async () => [`packet-${participant}`, `preview-${participant}`],
      async delete(name) { fake.deletedCaches.push(name); return true; }
    },
    navigator: { serviceWorker: { getRegistrations: async () => [{ unregister: async () => { fake.unregistered += 1; return true; } }] } },
    history: { replaceState(_state, _title, url) { fake.replacedHistory = url; } },
    location: { replace(url) { fake.replacedLocation = url; } }
  };
  return fake;
}

function storage(entries) {
  const values = new Map(entries);
  return { get size() { return values.size; }, clear() { values.clear(); }, getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, String(value)); }, removeItem(key) { values.delete(key); } };
}

function request() {
  const value = {};
  queueMicrotask(() => value.onsuccess?.());
  return value;
}
