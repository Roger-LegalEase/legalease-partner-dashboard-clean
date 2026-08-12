// Verifies lane D1's official-form production-readiness packages.
//
// Red when: a family package is structurally incomplete; a source record's
// pinned sha256/path drifts from the compiled profile's formInventory (the
// committed authority it was pinned from); a package claims a census or a
// render it does not have; a fixture fails to parse; recorded prior-render
// evidence no longer hash-matches the committed shadow file; or any
// production file smuggles placeholder text instead of the explicit
// machine-readable blocked markers.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ROOT = path.join(rootDir, "data/rcap-all50/overlays/production");
const JURISDICTIONS = {
  alabama: "AL-alabama", arkansas: "AR-arkansas", virginia: "VA-virginia",
  alaska: "AK-alaska", kentucky: "KY-kentucky", "north-carolina": "NC-north-carolina",
  wisconsin: "WI-wisconsin", nebraska: "NE-nebraska", vermont: "VT-vermont"
};
const REQUIRED_FILES = [
  "source-record.json",
  "field-classification-policy.json",
  "fixtures/canonical.json",
  "fixtures/boundary.json",
  "fixtures/negative.json",
  "reports/prior-render-evidence.json",
  "handoff.md"
];
const PLACEHOLDER_PATTERNS = [/\bTODO\b/, /\bTBD\b/, /\bFIXME\b/, /lorem ipsum/i, /xxx+/i];
const ALLOWED_BLOCK_MARKERS = new Set([
  "blocked_pending_source_binary_and_field_extraction",
  "blocked_pending_source_binary",
  "field_census_unavailable_in_repo",
  "sha256_unrecorded_in_repo"
]);

const failures = [];
const assert = (cond, msg) => { if (!cond) failures.push(msg); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha256File = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

let families = 0;
for (const [slug, profileName] of Object.entries(JURISDICTIONS)) {
  const jurisdictionDir = path.join(OUT_ROOT, slug);
  assert(fs.existsSync(jurisdictionDir), `${slug}: jurisdiction package dir exists`);
  if (!fs.existsSync(jurisdictionDir)) continue;

  const profile = readJson(path.join(rootDir, `src/lib/rcap-engine/compiled/profiles/${profileName}.json`));
  const inventoryByFile = new Map((profile.packetGenerator?.formInventory ?? []).map((f) => [f.fileName, f]));

  const summaryPath = path.join(jurisdictionDir, "jurisdiction-summary.json");
  assert(fs.existsSync(summaryPath), `${slug}: jurisdiction-summary.json exists`);
  const summary = fs.existsSync(summaryPath) ? readJson(summaryPath) : { families: [], tracks: [] };
  assert(summary.tracks.length > 0, `${slug}: summary lists the job's tracks`);
  for (const track of summary.tracks) {
    assert(track.terminal === false, `${slug}/${track.trackId}: fail-closed track is not marked terminal`);
  }

  for (const entry of fs.readdirSync(jurisdictionDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    families += 1;
    const familyDir = path.join(jurisdictionDir, entry.name);
    for (const rel of REQUIRED_FILES) {
      assert(fs.existsSync(path.join(familyDir, rel)), `${slug}/${entry.name}: ${rel} present`);
    }
    const sourceRecordPath = path.join(familyDir, "source-record.json");
    if (!fs.existsSync(sourceRecordPath)) continue;
    const record = readJson(sourceRecordPath);

    const inv = inventoryByFile.get(record.fileName);
    assert(inv !== undefined, `${slug}/${entry.name}: source file '${record.fileName}' exists in the compiled profile formInventory`);
    if (inv) {
      assert(record.expectedSha256 === (inv.sha256 ?? "sha256_unrecorded_in_repo"), `${slug}/${entry.name}: pinned sha256 matches formInventory (drift red)`);
      assert(record.relativePath === inv.relativePath, `${slug}/${entry.name}: pinned relativePath matches formInventory (drift red)`);
    }
    assert(record.failClosed === true && record.sourcePresenceInClone === false, `${slug}/${entry.name}: source record fails closed`);
    assert(typeof record.exactSourceRequirement === "string" && record.exactSourceRequirement.includes(record.relativePath), `${slug}/${entry.name}: exact source requirement names the pinned path`);

    // A fail-closed family must not claim census or render outputs.
    if (record.fieldExtractionStatus === "field_census_unavailable_in_repo") {
      assert(!fs.existsSync(path.join(familyDir, "field-census.json")), `${slug}/${entry.name}: no fabricated census`);
      assert(!fs.existsSync(path.join(familyDir, "production-field-map.json")), `${slug}/${entry.name}: no fabricated field map`);
      assert(!fs.existsSync(path.join(familyDir, "filled.pdf")), `${slug}/${entry.name}: no fabricated filled PDF`);
    }

    for (const fixture of ["canonical", "boundary", "negative"]) {
      const p = path.join(familyDir, `fixtures/${fixture}.json`);
      if (!fs.existsSync(p)) continue;
      const parsed = readJson(p);
      assert(parsed.level === "participant_fact", `${slug}/${entry.name}: ${fixture} fixture is fact-level`);
    }

    const evidence = readJson(path.join(familyDir, "reports/prior-render-evidence.json"));
    if (evidence.committedShadowRender) {
      const p = path.join(rootDir, evidence.committedShadowRender.path);
      assert(fs.existsSync(p), `${slug}/${entry.name}: recorded shadow render exists`);
      if (fs.existsSync(p)) {
        assert(sha256File(p) === evidence.committedShadowRender.sha256, `${slug}/${entry.name}: shadow render hash matches (drift red)`);
      }
    }
    assert(ALLOWED_BLOCK_MARKERS.has(evidence.contactSheetStatus), `${slug}/${entry.name}: contact sheet status is an explicit blocked marker`);

    // Placeholder scan over every production text file in the family.
    for (const file of fs.readdirSync(familyDir, { recursive: true })) {
      const p = path.join(familyDir, String(file));
      if (!fs.statSync(p).isFile()) continue;
      const text = fs.readFileSync(p, "utf8");
      for (const pattern of PLACEHOLDER_PATTERNS) {
        assert(!pattern.test(text), `${slug}/${entry.name}/${file}: no placeholder text (${pattern})`);
      }
    }
  }
}

assert(families >= 30, `all 30 D1 family packages present (found ${families})`);

if (failures.length > 0) {
  console.error("verify-rcap-official-forms-d1 FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`verify-rcap-official-forms-d1 passed: ${families} fail-closed family packages structurally complete, sha-pinned to the compiled inventories, census-honest, and placeholder-free.`);
