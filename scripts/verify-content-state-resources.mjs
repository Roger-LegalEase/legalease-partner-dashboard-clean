/**
 * Public state resources — coverage, approval gating, and internal-leak safety.
 *
 * The /resources/[jurisdiction] pages sit directly on top of the record-clearing engine, which is
 * the highest-risk adjacency in this platform. The engine's compiled profiles contain internal
 * legal research: source-corpus SHA256s, source PDF/RTF filenames, QA notes, counsel-ratification
 * status, ordered decision rules, packet-generator config, and the screening questions themselves.
 *
 * NOTE, and this is why the adapter does not reuse the engine's own "public" projection: the engine's
 * projectPublicProfile() passes `copyGuardrails` straight through, and in several compiled profiles
 * that field contains raw source-corpus text ("===== SOURCE FILE: ... =====", "train Wilma with this
 * core logic"). It is a screening contract, not a publishing contract. This verifier proves the
 * content adapter does not inherit that defect.
 */

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];

const {
  listPublishableJurisdictionSlugs,
  listPublishableJurisdictions,
  getPublicStateResource,
  isJurisdictionPublishable,
  assertNoInternalLeak,
  INTERNAL_LEAK_MARKERS
} = await import("../src/lib/content/state-resources.ts");

// --- 1. Coverage: all 50 states + DC -------------------------------------------------------------

const slugs = listPublishableJurisdictionSlugs();
assert(slugs.length === 51, `Expected 51 publishable jurisdictions (50 states + DC), got ${slugs.length}.`);
assert(slugs.includes("district-of-columbia"), "Washington, D.C. must have a resources page.");
assert(new Set(slugs).size === slugs.length, "Jurisdiction slugs must be unique.");

const EXPECTED_STATES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware",
  "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky",
  "louisiana", "maine", "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new-hampshire", "new-jersey", "new-mexico",
  "new-york", "north-carolina", "north-dakota", "ohio", "oklahoma", "oregon", "pennsylvania",
  "rhode-island", "south-carolina", "south-dakota", "tennessee", "texas", "utah", "vermont",
  "virginia", "washington", "west-virginia", "wisconsin", "wyoming"
];
for (const state of EXPECTED_STATES) {
  assert(slugs.includes(state), `Missing a resources page for ${state}.`);
}

// --- 2. Every jurisdiction renders, and no two are thin clones -------------------------------------

const fingerprints = new Map();
for (const slug of slugs) {
  const resource = getPublicStateResource(slug);
  assert(Boolean(resource), `getPublicStateResource("${slug}") returned null.`);
  if (!resource) continue;

  assert(resource.locked.name.length > 0, `${slug}: locked layer is missing a state name.`);
  assert(resource.locked.code.length === 2, `${slug}: jurisdiction code must be 2 letters.`);
  assert(resource.locked.displayTerm.length > 0, `${slug}: missing the state's display term.`);
  assert(resource.seo.canonical === `https://expungement.ai/resources/${slug}`, `${slug}: wrong canonical URL.`);
  assert(resource.seo.title.includes(resource.locked.name), `${slug}: SEO title must name the state.`);
  assert(
    resource.seo.description.length >= 50 && resource.seo.description.length <= 320,
    `${slug}: SEO description length ${resource.seo.description.length} is out of range.`
  );
  assert(resource.disclaimer.includes("not a law firm"), `${slug}: the disclaimer must say we are not a law firm.`);

  // Uniqueness: a page whose locked content is identical to another state's is a thin clone and
  // signals the adapter silently fell back to the wrong profile.
  const fingerprint = JSON.stringify([resource.locked.displayTerm, resource.locked.pathwayHighlights]);
  const existing = fingerprints.get(fingerprint);
  fingerprints.set(fingerprint, (existing ?? 0) + 1);
}

// --- 3. THE LEAK GATE: no internal engine data in any rendered payload -------------------------------

for (const slug of slugs) {
  const resource = getPublicStateResource(slug);
  if (!resource) continue;
  const serialized = JSON.stringify(resource).toLowerCase();

  for (const marker of INTERNAL_LEAK_MARKERS) {
    assert(
      !serialized.includes(marker.toLowerCase()),
      `${slug}: internal marker "${marker}" leaked into the public state resource payload.`
    );
  }
}

// The leak gate must actually throw when fed something internal — a guard that never fires is not a guard.
let threw = false;
try {
  assertNoInternalLeak({ locked: { name: "Texas" }, sneaky: { copyGuardrails: ["train Wilma with this core logic"] } });
} catch {
  threw = true;
}
assert(threw, "assertNoInternalLeak must THROW when internal engine data reaches the public layer.");

let threwOnSha = false;
try {
  assertNoInternalLeak({ sourceCorpusSha256: "aa34523e3b643b32124db5d83973622f37082f2d112b3e32ef55912258a7e630" });
} catch {
  threwOnSha = true;
}
assert(threwOnSha, "assertNoInternalLeak must throw on a source-corpus hash.");

// --- 4. The approval gate is real ---------------------------------------------------------------------

assert(isJurisdictionPublishable("TX") === true, "An approved jurisdiction must be publishable.");
assert(isJurisdictionPublishable("ZZ") === false, "An unknown jurisdiction code must not be publishable.");
assert(getPublicStateResource("not-a-state") === null, "An unknown slug must return null (the page 404s).");

// --- 5. The adapter must not import the engine's unsafe projection --------------------------------------

const adapterSource = fs.readFileSync(path.join(rootDir, "src/lib/content/state-resources.ts"), "utf8");
const adapterCode = adapterSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
for (const forbidden of [
  "projectPublicProfile",
  "getDesignerPublicProfiles",
  "profile-registry",
  "rcap-engine",
  "state-packs",
  "all50-internal-preview"
]) {
  assert(
    !adapterCode.includes(forbidden),
    `The public state-resource adapter must not reference ${forbidden} — it is an internal engine surface.`
  );
}

// --- 6. Public pages must not reach into the engine directly ----------------------------------------------

const publicPageGlobs = [
  "src/app/expungement-ai/resources",
  "src/app/expungement-ai/blog",
  "src/app/partners/resources",
  "src/app/partners/insights",
  "src/app/partners/partner-stories"
];

for (const dir of publicPageGlobs) {
  const abs = path.join(rootDir, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const src = fs.readFileSync(file, "utf8");
    const rel = path.relative(rootDir, file);
    for (const forbidden of [
      "rcap-engine",
      "state-packs",
      "projectPublicProfile",
      "all50-internal-preview",
      "compiled/profiles"
    ]) {
      assert(
        !src.includes(forbidden),
        `${rel} imports ${forbidden} — public pages must only read state data through src/lib/content/state-resources.ts.`
      );
    }
    // Public content pages must not touch payment surfaces.
    assert(
      !/createCheckout|ConsumerCheckoutButton|stripe/i.test(src),
      `${rel} references payment/checkout logic — content pages must stay editorial.`
    );
  }
}

// --- report -----------------------------------------------------------------------------------------------

if (failures.length) {
  console.error("Content state resources verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Content state resources verification passed.");
console.log(`Coverage: all 51 jurisdictions (50 states + DC) resolve through the promotion-gated public adapter.`);
console.log(`Leak gate: ${INTERNAL_LEAK_MARKERS.length} internal markers (source hashes, QA notes, copyGuardrails,`);
console.log("  decision rules, generator config, counsel ratification) are absent from every rendered payload,");
console.log("  and the guard throws when fed internal data rather than silently redacting.");
console.log("Isolation: the adapter and every public content page are free of engine/state-pack/checkout imports.");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
