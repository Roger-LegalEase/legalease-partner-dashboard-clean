import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const required = [
  "src/lib/clinic-mode/types.ts",
  "src/lib/clinic-mode/validation.ts",
  "src/lib/clinic-mode/service.ts",
  "src/app/api/clinic/events/route.ts",
  "src/app/api/clinic/events/[eventId]/route.ts",
  "src/app/api/clinic/events/[eventId]/staff/route.ts",
  "src/app/api/clinic/events/[eventId]/access-codes/route.ts",
  "src/app/internal/clinic/page.tsx",
  "src/app/internal/clinic/[eventId]/page.tsx",
  "src/app/partner/clinic/page.tsx",
  "src/app/partner/clinic/[eventId]/page.tsx",
  "src/components/clinic-mode/ClinicAdminConsole.tsx"
];

for (const file of required) assert.ok(fs.existsSync(path.join(root, file)), `${file} missing`);

const service = read("src/lib/clinic-mode/service.ts");
for (const marker of [
  'import "server-only"',
  "resolveSessionPartner",
  "getSupabaseAdminClient",
  '.rpc("clinic_create_event"',
  '.rpc("clinic_set_event_staff"',
  '.rpc("clinic_create_access_code"',
  '.rpc("clinic_set_event_status"'
]) assert.ok(service.includes(marker), `Clinic service missing ${marker}`);
for (const forbidden of ["seed", "fixture", "mock", "fallbackEvents", "localStorage", "Math.random"])
  assert.ok(!service.toLowerCase().includes(forbidden.toLowerCase()), `Clinic service contains forbidden ${forbidden}`);

const eventsApi = read("src/app/api/clinic/events/route.ts");
assert.match(eventsApi, /export async function GET/u);
assert.match(eventsApi, /export async function POST/u);
assert.ok(eventsApi.includes("createClinicEvent"));
assert.ok(eventsApi.includes("listClinicEvents"));
assert.ok(eventsApi.includes("clinicErrorResponse"));

const eventApi = read("src/app/api/clinic/events/[eventId]/route.ts");
assert.match(eventApi, /export async function GET/u);
assert.match(eventApi, /export async function PATCH/u);
assert.ok(eventApi.includes("setClinicEventStatus"));

const internalPage = read("src/app/internal/clinic/page.tsx");
assert.ok(internalPage.includes('resolveInternalAdminPageAccess("/internal/clinic")'));
assert.ok(internalPage.includes('dynamic = "force-dynamic"'));
assert.ok(!internalPage.toLowerCase().includes("mock"));

const partnerPage = read("src/app/partner/clinic/page.tsx");
assert.ok(partnerPage.includes("requireClinicPartnerAdmin"));
assert.ok(partnerPage.includes('dynamic = "force-dynamic"'));

const consoleSource = read("src/components/clinic-mode/ClinicAdminConsole.tsx");
for (const label of ["Create clinic event", "Event access code", "Pause event", "Close event", "Archive event", "Approved event staff"])
  assert.ok(consoleSource.includes(label), `Admin console missing ${label}`);
assert.match(consoleSource, /aria-live="polite"/u);
assert.ok(!consoleSource.includes("dangerouslySetInnerHTML"));

const all = required.map(read).join("\n");
for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "service_role", "predetermined", "hardcoded outcome"])
  assert.ok(!all.includes(forbidden), `route/client surface exposes forbidden ${forbidden}`);

console.log("Clinic Mode event/staff/admin route contract passed.");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
