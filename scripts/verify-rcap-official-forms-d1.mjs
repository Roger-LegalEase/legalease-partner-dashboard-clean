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
import { protectCategoryOf } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { structuralClassesAgree } from "./rcap-official-forms/rcap-structural-class.mjs";

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
    const sourceRecordPath = path.join(familyDir, "source-record.json");
    if (!fs.existsSync(sourceRecordPath)) continue;
    const record = readJson(sourceRecordPath);
    const isV2 = String(record.schemaVersion).includes("v2-verified-binary");
    if (!isV2) {
      for (const rel of REQUIRED_FILES) {
        assert(fs.existsSync(path.join(familyDir, rel)), `${slug}/${entry.name}: ${rel} present`);
      }
    }

    // v2 verified-binary packages are validated by their own invariants.
    if (String(record.schemaVersion).includes("v2-verified-binary")) {
      assert(record.sha256VerifiedAgainstBundleManifest === true, `${slug}/${entry.name}: delivered bytes hash-verify against the canonical manifest`);
      assert(record.byteLengthMatches !== false, `${slug}/${entry.name}: byte length matches the manifest`);
      assert(record.pageCountAgrees !== false, `${slug}/${entry.name}: page count matches the manifest`);
      // Judged through the shared vocabulary: `acroform_pdf` and `acroform`
      // are the manifest's and the inspector's names for one class, and the
      // raw comparison this replaced fired on every AcroForm in the corpus.
      if (structuralClassesAgree(record.structuralClassObserved, record.structuralClassDeclared) === false) {
        console.warn(`  note ${slug}/${entry.name}: manifest declared '${record.structuralClassDeclared}', binary is '${record.structuralClassObserved}' — recorded for the captain, not a fabrication.`);
      }
      assert(Array.isArray(record.productionHolds) && record.productionHolds.includes("edition_1_runtime_disabled")
        && record.productionHolds.includes("f_independent_visual_review_required"),
        `${slug}/${entry.name}: Edition 1 and review holds preserved`);
      if (!record.participantFillable) {
        assert(record.productionHolds.includes("not_participant_fillable_no_fixture_fill"), `${slug}/${entry.name}: non-fillable role blocks fixture fill`);
        assert(!fs.existsSync(path.join(familyDir, "fixtures/canonical-filled.pdf")), `${slug}/${entry.name}: no fill produced for a court/agency-owned document`);
      }
      const scan = path.join(familyDir, "reports/protected-fields-scan.json");
      if (fs.existsSync(scan)) assert(readJson(scan).pass === true, `${slug}/${entry.name}: protected-field scan passes`);
      continue;
    }

    const inv = inventoryByFile.get(record.fileName);
    // Families added from the overlay-factory manifest (KY/NC/NE official
    // PDFs the profile inventory never listed) legitimately have no
    // inventory row; their source of record is the manifest.
    if (inv === undefined) {
      assert(record.currentnessBasis.includes("overlay-factory manifest"), `${slug}/${entry.name}: non-inventory family cites the manifest as source of record`);
    }
    if (inv) {
      assert(record.expectedSha256 === (inv.sha256 ?? "sha256_unrecorded_in_repo"), `${slug}/${entry.name}: pinned sha256 matches formInventory (drift red)`);
      assert(record.relativePath === inv.relativePath, `${slug}/${entry.name}: pinned relativePath matches formInventory (drift red)`);
    }
    assert(record.failClosed === true && record.sourcePresenceInClone === false, `${slug}/${entry.name}: source record fails closed`);

    // Bundle reconciliation: every family carries exactly one lifecycle
    // classification, holds survive availability, and no binary bytes are
    // claimed present in this container.
    const br = record.bundleReconciliation;
    assert(br !== undefined, `${slug}/${entry.name}: bundle reconciliation recorded`);
    if (br) {
      const LIFECYCLES = new Set(["binary_present_and_current", "binary_present_source_gated", "binary_present_obsolete", "true_hash_missing"]);
      assert(LIFECYCLES.has(br.lifecycleClassification), `${slug}/${entry.name}: lifecycle is one of the four states`);
      assert(record.bundleBinaryBytesPresentInContainer === false, `${slug}/${entry.name}: binary bytes not claimed present`);
      assert(Array.isArray(record.productionHolds) && record.productionHolds.includes("edition_1_generation_allowed_no")
        && record.productionHolds.includes("jurisdiction_runtime_disabled")
        && record.productionHolds.includes("f_independent_visual_review_required"),
        `${slug}/${entry.name}: Edition 1 + review holds preserved`);
      if (br.lifecycleClassification === "binary_present_source_gated") {
        assert(br.runtimeSelectable === false, `${slug}/${entry.name}: source-gated asset is never runtime-selectable`);
        assert(record.productionHolds.includes("source_gated_never_runtime_selectable"), `${slug}/${entry.name}: source-gated hold present`);
      }
      if (br.lifecycleClassification === "true_hash_missing") {
        assert(br.matchedBy === null && record.sourcePresenceInBundleManifest === false, `${slug}/${entry.name}: missing hash not claimed found`);
      } else {
        assert(br.matchedBy === "sha256" && typeof br.bundlePath === "string", `${slug}/${entry.name}: match is by sha256 with a canonical bundle path`);
        assert(record.sourcePresenceInBundleManifest === true, `${slug}/${entry.name}: found hash recorded present`);
      }
    }
    assert(typeof record.exactSourceRequirement === "string" && record.exactSourceRequirement.includes(record.relativePath), `${slug}/${entry.name}: exact source requirement names the pinned path`);

    // Census honesty: a census may exist ONLY when extracted from the
    // committed shadow sample; a family without that status must carry none.
    if (record.fieldExtractionStatus === "field_census_unavailable_in_repo") {
      assert(!fs.existsSync(path.join(familyDir, "field-census.json")), `${slug}/${entry.name}: no fabricated census`);
      assert(!fs.existsSync(path.join(familyDir, "production-field-map.json")), `${slug}/${entry.name}: no fabricated field map`);
    } else if (record.fieldExtractionStatus === "extracted_from_committed_shadow_sample") {
      const census = readJson(path.join(familyDir, "field-census.json"));
      const classification = readJson(path.join(familyDir, "field-classification.json"));
      const map = readJson(path.join(familyDir, "production-field-map.json"));
      assert(census.fieldCount === census.fields.length, `${slug}/${entry.name}: census count consistent`);
      assert(census.fieldCount === record.extractedFieldCount, `${slug}/${entry.name}: census matches source record count`);
      const classByName = new Map(classification.entries.map((e) => [e.name, e.class]));
      assert(classByName.size === census.fields.length, `${slug}/${entry.name}: classification covers census 1:1`);
      for (const f of census.fields) assert(classByName.has(f.name), `${slug}/${entry.name}: '${f.name}' classified`);
      const POP = new Set(["participant", "deterministic"]);
      for (const b of map.bindings ?? []) {
        assert(POP.has(classByName.get(b.field)), `${slug}/${entry.name}: binding '${b.field}' is participant/deterministic only`);
      }
      if (record.componentRole === "court_order_component_never_participant_filed") {
        assert((map.bindings ?? []).length === 0, `${slug}/${entry.name}: order component binds nothing`);
      }
      assert(census.censusBasis === "extracted_from_committed_shadow_sample", `${slug}/${entry.name}: census basis recorded`);
      const samplePath = path.join(rootDir, census.samplePath);
      assert(fs.existsSync(samplePath), `${slug}/${entry.name}: census sample exists in repo`);
    }
    assert(!fs.existsSync(path.join(familyDir, "filled.pdf")), `${slug}/${entry.name}: no fabricated filled PDF`);

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

assert(families >= 40, `all 40 D1 family packages present (found ${families})`);

// --- completed implementation packages --------------------------------------
//
// Red when: a completed package is missing its census, classification or map;
// a map's sha256 drifts from the source record it was built against; a fact
// binds to a field the classifier marked unwritable; a court-issued order
// binds anything outside the caption; a binding targets a checkbox or radio
// group; an overlay anchor is placed against a denied label; a rendered
// fixture modified an unwritable field; or a family claims a fixture or
// contact sheet it does not have.
const NEVER_WRITE_CLASSES = new Set(["prohibited", "protected", "signature", "court_or_agency", "outside_party"]);
const CAPTION_ONLY_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.last_name", "participant.middle_name",
  "participant.date_of_birth", "matter.county", "matter.court", "matter.case_number", "matter.citation_number"
]);
const ANCHOR_DENY = /judge|magistrate|clerk|court use|prosecut|attorney|sheriff|police|agency|notar|sworn|signature|\bsign\b|service|so ordered|it is ordered|hearing|granted|denied|for office/i;

const indexPath = path.join(OUT_ROOT, "implementation-index.json");
assert(fs.existsSync(indexPath), "implementation-index.json exists");
let implemented = 0;
if (fs.existsSync(indexPath)) {
  const impl = readJson(indexPath);
  for (const fam of impl.families) {
    const slug = Object.keys(JURISDICTIONS).find((k) => JURISDICTIONS[k].startsWith(`${fam.jurisdiction}-`));
    const dir = path.join(OUT_ROOT, slug ?? "", fam.family);
    const id = `${fam.jurisdiction}/${fam.family}`;
    if (!fs.existsSync(dir)) { assert(false, `${id}: implementation directory exists`); continue; }

    const record = readJson(path.join(dir, "source-record.json"));
    for (const f of ["field-census.json", "field-classification.json", "reports/protected-fields.json"]) {
      assert(fs.existsSync(path.join(dir, f)), `${id}: ${f} present`);
    }
    const census = readJson(path.join(dir, "field-census.json"));
    assert(census.sha256 === record.sha256, `${id}: census pinned to the source record's sha256 (drift red)`);
    assert(census.fieldCount === census.fields.length, `${id}: census field count matches its own entries`);

    const cls = readJson(path.join(dir, "field-classification.json"));
    const classOf = new Map(cls.entries.map((e) => [e.name, e.class]));
    const typeOf = new Map(census.fields.map((e) => [e.name, e.type]));
    assert(cls.entries.length === census.fields.length, `${id}: every censused field is classified`);

    const mapPath = path.join(dir, fam.mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json");
    assert(fs.existsSync(mapPath), `${id}: ${fam.mapKind} map present`);
    if (!fs.existsSync(mapPath)) continue;
    const map = readJson(mapPath);
    assert(map.sha256 === record.sha256, `${id}: map pinned to the source record's sha256 (drift red)`);

    for (const b of map.bindings ?? []) {
      assert(!NEVER_WRITE_CLASSES.has(classOf.get(b.field)), `${id}: binding on '${b.field}' does not target an unwritable class`);
      assert(!["checkbox", "radio", "optionlist"].includes(typeOf.get(b.field)), `${id}: binding on '${b.field}' does not target an election control`);
      if (map.captionOnly) {
        const base = b.factId.replace(/^matter\.charges\[\d+\]\./, "matter.");
        assert(CAPTION_ONLY_FACTS.has(base), `${id}: court-issued order binds caption facts only, saw '${b.factId}'`);
      }
    }
    for (const a of map.anchorCapture?.anchors ?? []) {
      assert(!ANCHOR_DENY.test(a.label), `${id}: overlay anchor '${a.label}' is not placed against a denied label`);
      assert(a.writeBox.width > 0 && a.writeBox.height > 0, `${id}: overlay anchor '${a.label}' has a positive write box`);
    }

    if (fam.status === "implemented_pending_independent_review" || fam.status === "overlay_implemented_pending_independent_review") {
      implemented++;
      for (const f of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
        const p2 = path.join(dir, f);
        assert(fs.existsSync(p2), `${id}: ${f} rendered`);
        if (fs.existsSync(p2)) {
          assert(fs.readFileSync(p2).subarray(0, 5).toString() === "%PDF-", `${id}: ${f} is a real PDF`);
        }
      }
    }
    // Rendered artifacts are byte-reproducible, so their recorded hashes are
    // enforceable: a fixture edited by hand, or re-rendered from a different
    // source binary, goes red here.
    const receiptPath = path.join(dir, "reports/rendered-artifacts.json");
    if (fs.existsSync(receiptPath)) {
      const receipt = readJson(receiptPath);
      assert(receipt.sourceSha256 === record.sha256, `${id}: render receipt pinned to the source record's sha256`);
      for (const [rel, meta] of Object.entries(receipt.artifacts ?? {})) {
        const p3 = path.join(dir, rel);
        assert(fs.existsSync(p3), `${id}: recorded artifact ${rel} exists`);
        if (!fs.existsSync(p3)) continue;
        assert(sha256File(p3) === meta.sha256, `${id}: ${rel} matches its recorded hash (drift red)`);
      }
    }

    // --- D0-remediated invariants -------------------------------------------
    //
    // Applied only to packages the remediated factory produced. A package from
    // the previous factory is left under the older rules until its own state
    // session regenerates it, so this branch can be the base for that work
    // without turning the whole corpus red first.
    if (map.factoryVersion === "d0-remediated-v1") {
      assert(typeof map.bindingBasis === "string" && /typed fail-closed/.test(map.bindingBasis),
        `${id}: bindings come from the typed fail-closed binder`);
      assert(Array.isArray(map.bindingRefusals),
        `${id}: refused bindings are recorded, so protection is auditable`);
      for (const b of map.bindings ?? []) {
        const category = protectCategoryOf(b.field);
        assert(category === null, `${id}: binding on '${b.field}' is not a protected category (${category})`);
      }

      const proofPath = path.join(dir, "contact-sheet/contact-sheet-proof.json");
      const sheetPath = path.join(dir, "contact-sheet/blank-vs-filled.pdf");
      if (fs.existsSync(sheetPath)) {
        assert(fs.existsSync(proofPath), `${id}: a contact sheet carries the proof that backs it`);
        if (fs.existsSync(proofPath)) {
          const proof = readJson(proofPath);
          assert(proof.allExpectedValuesVisible === true,
            `${id}: every expected value is visibly present in the finalized artifact`);
          assert(proof.panelsDiffer === true,
            `${id}: the blank and filled panels differ`);
          const canonical = path.join(dir, "fixtures/canonical-filled.pdf");
          assert(fs.existsSync(canonical) && sha256File(canonical) === proof.finalizedSha256,
            `${id}: the contact sheet is pinned to the finalized artifact it depicts`);
        }
      }
    }

    const scanPath = path.join(dir, "reports/protected-fields-scan.json");
    if (fs.existsSync(scanPath)) {
      const scan = readJson(scanPath);
      assert(scan.pass === true, `${id}: rendered fixture wrote no unwritable field and no placeholder value`);
      if (map.factoryVersion === "d0-remediated-v1") {
        assert((scan.activeContentResidue ?? []).length === 0,
          `${id}: the finalized artifact carries no active-content residue`);
        assert((scan.valuesWrittenButNotVisible ?? []).length === 0,
          `${id}: every value the renderer wrote is visible in the artifact`);
      }
    }
  }
  assert(implemented >= 60, `completed implementation packages present (found ${implemented})`);
}

if (failures.length > 0) {
  console.error("verify-rcap-official-forms-d1 FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`verify-rcap-official-forms-d1 passed: ${families} family packages structurally complete and sha-pinned, ${implemented} completed implementation packages rendered with no unwritable field written.`);
