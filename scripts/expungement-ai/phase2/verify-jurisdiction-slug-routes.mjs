/**
 * UX-GLOBAL-014 — every jurisdiction resolves by its human-readable name as
 * well as by its two-letter code, so the slug form of the screening route the
 * witness ledger records is not a dead end.
 */
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
process.chdir(root);
register("./scripts/lib/ts-esm-loader.mjs", new URL(`file://${root}/`));

const { getAllJurisdictionProfiles, getProfileByJurisdiction, normalizeJurisdictionCode } =
  await import("@/lib/rcap-engine/profile-registry");

const failures = [];
const profiles = getAllJurisdictionProfiles();

for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  const slug = profile.jurisdiction.name.toLowerCase().replace(/[^a-z]+/g, "-");
  for (const [label, value] of [
    ["slug", slug],
    ["name", profile.jurisdiction.name],
    ["code lower", code.toLowerCase()],
    ["code upper", code.toUpperCase()]
  ]) {
    const resolved = getProfileByJurisdiction(value);
    if (resolved?.jurisdiction.code !== code) {
      failures.push(`${code}: ${label} "${value}" resolved to ${resolved?.jurisdiction.code ?? "nothing"}`);
    }
  }
}

// The pre-existing alias, which is not the compiled name.
if (normalizeJurisdictionCode("washington-dc") !== "DC") failures.push('"washington-dc" no longer resolves to DC');
// An unknown value still normalizes to itself so callers can report it.
if (normalizeJurisdictionCode("atlantis") !== "ATLANTIS") failures.push('an unknown jurisdiction must normalize to itself');

if (failures.length > 0) {
  console.error("verify-jurisdiction-slug-routes FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`verify-jurisdiction-slug-routes passed: ${profiles.length} jurisdictions resolve by slug, name, and code.`);
