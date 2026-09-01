import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const migration = read("supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql");
const service = read("src/lib/clinic-mode/reporting-service.ts");
const accountingRoute = read("src/app/api/clinic/packet-accounting/route.ts");
const followUpRoute = read("src/app/api/clinic/events/[eventId]/follow-ups/route.ts");
const reportingRoute = read("src/app/api/clinic/events/[eventId]/reporting/route.ts");
const screeningPage = read("src/app/clinic/[eventSlug]/screening/[state]/page.tsx");
const profiles = JSON.parse(read("src/lib/expungement-ai/frontend/profiles/all51.json"));

for (const marker of [
  "clinic_get_event_report",
  "clinic_get_follow_ups",
  "clinic_reserve_participant_packet_credit",
  "clinic_sync_packet_reservation",
  "clinic_release_packet_credit",
  "sponsorship_exhausted",
  "render_job_owner_mismatch",
  "generation_failed",
  "status in ('active','handed_off')",
  "grant execute on function public.clinic_get_event_report"
]) assert.ok(migration.includes(marker), `accounting/reporting migration marker missing: ${marker}`);

for (const marker of [
  "getClinicEventReport",
  "listClinicFollowUps",
  "saveClinicFollowUp",
  "reserveClinicPacketCredit",
  "getServerAuthState",
  "clinic_reserve_participant_packet_credit",
  "clinic_get_event_report"
]) assert.ok(service.includes(marker), `reporting service marker missing: ${marker}`);

assert.ok(!accountingRoute.includes("caseId"), "packet accounting must derive the Clinic case instead of accepting a case id");
for (const marker of ["getServerAuthState", "renderJobId", "reserveClinicPacketCredit"])
  assert.ok(accountingRoute.includes(marker), `packet accounting route marker missing: ${marker}`);
for (const marker of ["listClinicFollowUps", "saveClinicFollowUp"])
  assert.ok(followUpRoute.includes(marker), `follow-up route marker missing: ${marker}`);
assert.ok(reportingRoute.includes("getClinicEventReport"), "reporting route must use the aggregate report service");
assert.ok(!reportingRoute.includes("participantUserId"), "aggregate reporting route leaked participant identity");

for (const route of [
  "src/app/partner/clinic/[eventId]/follow-up/page.tsx",
  "src/app/partner/clinic/[eventId]/reporting/page.tsx"
]) assert.ok(fs.existsSync(path.join(root, route)), `dedicated route missing: ${route}`);

for (const code of ["CO", "MS", "WI"]) {
  assert.equal(profiles[code]?.jurisdiction?.code, code, `${code} is missing from the nationwide profile registry`);
  assert.ok(Array.isArray(profiles[code]?.flowStages) && profiles[code].flowStages.length >= 10, `${code} profile is not a full screening flow`);
}
assert.ok(screeningPage.includes("<ScreeningFlow"), "Clinic screening must use the authoritative nationwide ScreeningFlow");
assert.ok(screeningPage.includes("session.jurisdiction !== state.toUpperCase()"), "Clinic screening must bind the route state to the server-owned session jurisdiction");
assert.ok(!/(state\s*===\s*["'](?:CO|MS|WI)["'])/.test(screeningPage), "Clinic screening hardcoded a checkpoint state");

console.log("Clinic Mode accounting/reporting route contract passed.");
console.log("Three-state checkpoint: CO, MS, and WI use the same nationwide ScreeningFlow.");
