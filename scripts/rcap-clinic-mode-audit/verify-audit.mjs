import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const baseSha = "dd93579871962260b12918e54c44cf9bf1e81529";
const dataDir = "data/rcap-clinic-mode-audit";
const docsDir = "docs/rcap-clinic-mode-audit";
const allowedPrefixes = [
  `${dataDir}/`,
  `${docsDir}/`,
  "scripts/rcap-clinic-mode-audit/",
  "tests/e2e/rcap-clinic-mode-audit/"
];
const implementationStatuses = new Set([
  "IMPLEMENTED_AND_WIRED",
  "IMPLEMENTED_NOT_REACHABLE",
  "IMPLEMENTED_BEHIND_FLAG",
  "PARTIALLY_IMPLEMENTED",
  "DOCUMENTED_ONLY",
  "TEST_ONLY",
  "STUB_OR_PLACEHOLDER",
  "ABSENT",
  "CONFLICTING_IMPLEMENTATIONS",
  "HUMAN_CONFIRMATION_REQUIRED"
]);

const requiredData = [
  "intended-contract.json",
  "implementation-inventory.json",
  "access-map.json",
  "data-model.json",
  "roles-and-permissions.json",
  "configuration-matrix.json",
  "packet-accounting-results.json",
  "gap-register.json",
  "ten-participant-shared-device-results.json",
  "browser-evidence.json",
  "evidence-index.json",
  "repository-state.json",
  "verification-results.json",
  "readiness-verdict.json"
];
const requiredDocs = [
  "01-what-was-built.md",
  "02-how-to-access-clinic-mode.md",
  "03-legalease-operator-guide.md",
  "04-partner-admin-guide.md",
  "05-clinic-staff-guide.md",
  "06-participant-journey.md",
  "07-clinic-day-runbook.md",
  "08-after-clinic-follow-up.md",
  "09-troubleshooting.md",
  "10-security-and-privacy.md",
  "clinic-day-readiness.md",
  "gap-register.md",
  "PHASE_B_FIX_PROMPT.md"
];

const actualData = new Set(await readdir(dataDir));
const actualDocs = new Set(await readdir(docsDir));
for (const file of requiredData) assert.ok(actualData.has(file), `missing ${dataDir}/${file}`);
for (const file of requiredDocs) assert.ok(actualDocs.has(file), `missing ${docsDir}/${file}`);

const parsed = {};
for (const file of requiredData) {
  parsed[file] = JSON.parse(await readFile(path.join(dataDir, file), "utf8"));
}

assert.equal(parsed["intended-contract.json"].auditBaseSha, baseSha);
assert.ok(parsed["intended-contract.json"].requirements.length >= 20);
assert.ok(parsed["intended-contract.json"].requirements.every((entry) => entry.requirementId && entry.sources.length > 0 && entry.intendedAcceptanceTest));

const inventory = parsed["implementation-inventory.json"].capabilities;
assert.ok(inventory.length >= 20);
for (const capability of inventory) {
  assert.ok(implementationStatuses.has(capability.status), `bad status ${capability.status}`);
  assert.equal(typeof capability.status, "string");
  assert.ok(capability.capabilityId && capability.evidence.length > 0 && capability.recommendedOwner);
}

const accessRoutes = parsed["access-map.json"].routes;
for (const surface of ["LegalEase internal clinic/event setup", "Partner administrator clinic/event management", "Partner staff clinic view", "Event reporting", "Follow-up queue", "Participant clinic entry", "Assisted-intake entry"]) {
  const row = accessRoutes.find((entry) => entry.surface === surface);
  assert.ok(row, `missing route surface ${surface}`);
  assert.match(row.exactPath, /NO CURRENT/);
}

const roles = parsed["roles-and-permissions.json"].roles.map((entry) => entry.role);
for (const role of ["unauthenticated participant", "authenticated participant", "partner viewer", "partner staff", "partner administrator", "LegalEase internal operator", "revoked user", "user from another tenant"]) {
  assert.ok(roles.includes(role), `missing role ${role}`);
}

assert.equal(parsed["readiness-verdict.json"].overallVerdict, "CLINIC_MODE_UNSAFE");
assert.equal(parsed["readiness-verdict.json"].readyForSyntheticRehearsal, false);
assert.equal(parsed["readiness-verdict.json"].readyForRealParticipants, false);
assert.equal(parsed["packet-accounting-results.json"].verdict, "UNSAFE_NOT_PROVEN_END_TO_END");
assert.equal(parsed["ten-participant-shared-device-results.json"].participantCount, 10);
assert.equal(parsed["ten-participant-shared-device-results.json"].execution, "NOT_RUN_NO_CLINIC_SESSION_BOUNDARY");
assert.equal(parsed["ten-participant-shared-device-results.json"].noLeakageProven, false);
assert.equal(parsed["evidence-index.json"].productionDataUsed, false);
assert.equal(parsed["evidence-index.json"].productBehaviorFilesChanged, 0);
assert.ok(parsed["browser-evidence.json"].evidence.length >= 8);
assert.ok(parsed["browser-evidence.json"].requestedCoverage.some((entry) => entry.surface === "capacity/code failure" && entry.result.startsWith("NOT_CAPTURED")));

const gaps = parsed["gap-register.json"].gaps;
assert.equal(gaps.filter((gap) => gap.severity === "P0").length, 4);
assert.equal(gaps.filter((gap) => gap.severity === "P1").length, 11);
assert.ok(gaps.every((gap) => gap.reproduction.length > 0 && gap.evidence.length > 0 && gap.smallestSafeCorrection));

for (const file of requiredDocs.slice(1, 10)) {
  const text = await readFile(path.join(docsDir, file), "utf8");
  assert.match(text, /NOT CURRENTLY IMPLEMENTED/, `${file} must state unavailable steps exactly`);
}
const phaseB = await readFile(path.join(docsDir, "PHASE_B_FIX_PROMPT.md"), "utf8");
assert.match(phaseB, new RegExp(baseSha));
assert.match(phaseB, /codex\/rcap-clinic-mode-phase-b/);
assert.doesNotMatch(phaseB, /\bTBD\b|\bTODO\b|<placeholder>|\[placeholder\]/i);
for (const gap of gaps.filter((entry) => entry.severity === "P0" || entry.severity === "P1")) assert.match(phaseB, new RegExp(gap.id));

const finalReportRoute = await readFile("src/app/api/partner-reports/final/route.ts", "utf8");
const accessCodeRoute = await readFile("src/app/api/partners/access-codes/route.ts", "utf8");
const partnerScope = await readFile("src/lib/partners/partner-scope-auth.ts", "utf8");
const packetRoute = await readFile("src/app/api/expungement-ai/packet/generate/route.ts", "utf8");
const partnerAccessPage = await readFile("src/app/partner/access-codes/page.tsx", "utf8");
assert.doesNotMatch(finalReportRoute, /resolveSessionPartner|requirePartnerSession|requireInternalAdminSession|auth\.getUser/);
assert.match(finalReportRoute, /buildPartnerFinalImpactReportData\(parsed\.data\)/);
assert.match(accessCodeRoute, /resolveAuthorizedPartnerSlug/);
assert.doesNotMatch(accessCodeRoute, /role\s*!==\s*["']partner_admin["']/);
assert.doesNotMatch(partnerScope, /partner_admin/);
assert.match(partnerAccessPage, /session\.role\s*!==\s*"partner_admin"/);
assert.match(packetRoute, /await recordPartnerPacketGeneration\(partnerSessionId\)/);
assert.doesNotMatch(packetRoute, /const\s+\w+\s*=\s*await recordPartnerPacketGeneration/);

const statusLines = execFileSync("git", ["status", "--porcelain", "-uall"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
for (const line of statusLines) {
  const file = line.slice(3).replace(/^"|"$/g, "");
  assert.ok(allowedPrefixes.some((prefix) => file.startsWith(prefix)), `out-of-scope changed path: ${file}`);
}

console.log(JSON.stringify({
  result: "PASS",
  baseSha,
  requirements: parsed["intended-contract.json"].requirements.length,
  capabilities: inventory.length,
  routes: accessRoutes.length,
  roles: roles.length,
  gaps: parsed["gap-register.json"].counts,
  browserEvidence: parsed["browser-evidence.json"].evidence.length,
  productBehaviorFilesChanged: 0,
  productionDataUsed: false
}, null, 2));
