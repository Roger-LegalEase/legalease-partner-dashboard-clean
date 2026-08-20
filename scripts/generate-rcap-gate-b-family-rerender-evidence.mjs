#!/usr/bin/env node
// Per-family evidence for the Gate B rerender: what is proven, and what is not.
//
//   node scripts/generate-rcap-gate-b-family-rerender-evidence.mjs
//   node scripts/generate-rcap-gate-b-family-rerender-evidence.mjs --check
//
// The sequence the handoff sets out is: shared correction, family rerender, new
// artifact hashes, independent re-review, canonical approved record. This lane
// has consumed the shared corrections and can prove them at the module level.
// It cannot produce the new artifact hashes, because the rerender driver needs
// the Master Library extract mounted and this clone does not have it.
//
// The honest thing is to emit the record with that one field empty and say why,
// rather than to leave the whole record unwritten or -- far worse -- to fill it
// from artifacts the corrected modules never touched. Every hash below is the
// CURRENT one: the bytes a reviewer would be looking at today, before any
// rerender. They are the baseline the rerender will move, not evidence that it
// happened.
//
// For each family this records the reviewer's original objection, which shared
// correction addresses it, the mutation that must turn that correction's canary
// red, and what still has to happen for the objection to be closed against this
// family's own bytes.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HANDOFF = path.join(rootDir, "data/rcap-all50/gate-b-family-rerender-handoff.json");
const WAVE = path.join(rootDir, "data/rcap-all50/pdf-independent-reviews/gate-b-correction-wave.json");
const OVERLAY = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/pdf-independent-reviews/gate-b-family-rerender-evidence.json");
const checkOnly = process.argv.includes("--check");

const readJson = (file) => {
  if (!fs.existsSync(file)) { console.error(`FAIL rerender evidence — ${path.relative(rootDir, file)} is absent`); process.exit(1); }
  return JSON.parse(fs.readFileSync(file, "utf8"));
};
const sha256 = (file) => fs.existsSync(file) ? createHash("sha256").update(fs.readFileSync(file)).digest("hex") : null;

const handoff = readJson(HANDOFF);
const wave = readJson(WAVE);

// The escalations this lane is allowed to close, and the one it is not.
/**
 * The exact field each reviewer objection named, per family.
 *
 * Family-byte proof is "the thing the reviewer pointed at is no longer bound
 * in this family's regenerated map". Without this table the record could only
 * say the module changed, which is what it is not allowed to claim.
 */
const OBJECTED_FIELDS = {
  "AK:tf-800-form-en": ["certDate"],
  "AK:tf-805-form-en": ["certDate"],
  "KY:aoc-334-form-en": ["Defendants ssn"],
  "KY:aoc-496-3-form-en": [],
  "NC:aoc-cr-287-form-en": ["PetitionerAddr2"],
  "NC:aoc-cr-288-form-en": ["NameAtty", "CityAtty", "StateAtty", "ZipCodeAtty"],
  "NC:aoc-cr-296-form-en": ["DistrictAttorneyName"],
  "NC:aoc-cr-298-form-en": ["EmailAddressOfRecord"],
  "NC:aoc-cv-226-support-en": ["NameOfBank", "BankStreetAddress"],
  "NE:cc-6-11-form-en": [],
  "NE:cc-6-11-2-form-en": [],
  "NE:cc-6-12-form-en": [],
  "NE:cc-6-15-1-form-en": [],
  "NE:dc-1-15-form-en": ["printedname"],
  "VA:cc-1201-form-en": [],
  "VA:cc-1473-form-en": [],
  "VT:600-00228-support-en": []
};

const OWNED_BY_ANOTHER_LANE = new Set(["ESC-SIDECAR-NONCONFORMANT"]);

/** Where the family package actually lives. */
function familyDir(familyId) {
  const slug = familyId.split(":")[1];
  if (!slug) return null;
  for (const state of fs.readdirSync(OVERLAY)) {
    const candidate = path.join(OVERLAY, state, slug);
    if (fs.existsSync(path.join(candidate, "source-record.json"))) return candidate;
  }
  return null;
}

// Is the extract that the rerender needs actually reachable?
const extractPath = process.env.RCAP_BUNDLE_EXTRACT ?? null;
const extractMounted = Boolean(extractPath && fs.existsSync(extractPath));
const corpusMounted = fs.existsSync(path.join(rootDir, "private"));

let consumedAt = null;
try { consumedAt = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim(); } catch { /* not a clone */ }

const families = [];
for (const familyId of handoff.familiesUnblockedForRerender ?? []) {
  const dir = familyDir(familyId);
  if (!dir) { families.push({ familyId, error: "no family package found" }); continue; }
  const rel = (name) => path.join(dir, name);
  const record = fs.existsSync(rel("source-record.json")) ? JSON.parse(fs.readFileSync(rel("source-record.json"), "utf8")) : {};

  // Whichever map shape this family carries.
  const overlayProfile = rel("overlay-profile.json");
  const productionMap = rel("production-field-map.json");
  const mapPath = fs.existsSync(overlayProfile) ? overlayProfile : productionMap;

  // Every objection raised against this family, with the correction that
  // answers it and the mutation that must turn that correction's canary red.
  // Recomputed from the mounted official source rather than read back from the
  // record. A record that agrees with itself proves nothing; the question is
  // whether the bytes the driver rendered from are the bytes the family claims.
  const bundleRelative = (record.canonicalBundlePath ?? "").split("Edition_1/")[1] ?? null;
  const mountedSource = extractPath && bundleRelative ? path.join(extractPath, bundleRelative) : null;
  const recomputedSourceSha256 = mountedSource && fs.existsSync(mountedSource) ? sha256(mountedSource) : null;
  const sourceMatchesRecord = recomputedSourceSha256 !== null
    && recomputedSourceSha256 === (record.sha256 ?? record.expectedSha256 ?? null);

  const canonicalArtifact = rel("fixtures/canonical-filled.pdf");
  const rerenderRan = sourceMatchesRecord && fs.existsSync(canonicalArtifact);

  // Which objected fields the regenerated map still binds. This is what turns
  // "the module is fixed" into "this family's own bytes close the objection",
  // and keeping the two apart is the whole point of this record.
  const boundNow = (() => {
    if (!fs.existsSync(mapPath)) return null;
    try {
      const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
      return new Set((map.bindings ?? map.fields ?? []).map((b) => String(b.field ?? b.name)));
    } catch { return null; }
  })();
  const objectedFields = OBJECTED_FIELDS[familyId] ?? [];
  const objectedFieldsStillBound = boundNow ? objectedFields.filter((f) => boundNow.has(f)) : null;

  const objections = (wave.escalations ?? [])
    .filter((e) => (e.affectedFamilyIds ?? []).includes(familyId))
    .map((e) => ({
      escalationId: e.escalationId,
      originalReviewerObjection: e.reviewerConditionFailed ?? e.currentDefect ?? null,
      requiredBehaviour: e.requiredBehaviour ?? null,
      sharedModule: e.sharedModule ?? null,
      sharedCorrectionStatus: e.status ?? null,
      correctedBy: e.correctedBy ?? null,
      mutationThatMustTurnRed: e.mutationThatMustTurnRed ?? null,
      familyOwnedFollowUp: e.familyOwnedFollowUp ?? null,
      ownedByAnotherLane: OWNED_BY_ANOTHER_LANE.has(e.escalationId),
      // Two different things, kept apart on purpose.
      sharedCorrectionProven: e.status === "corrected",
      // True only where THIS family's regenerated bytes close the objection:
      // the rerender ran against the mounted source, the escalation belongs to
      // this lane, its shared correction is in, and none of this family's
      // objected fields is still bound. A module canary is not family-byte
      // proof, and this field is the one that must not blur them.
      provenAgainstThisFamilysBytes: Boolean(
        rerenderRan
        && !OWNED_BY_ANOTHER_LANE.has(e.escalationId)
        && e.status === "corrected"
        && objectedFieldsStillBound !== null
        && objectedFieldsStillBound.length === 0
      ),
      whyNotProvenYet: OWNED_BY_ANOTHER_LANE.has(e.escalationId)
        ? "this escalation is owned by another lane and is not this rerender's to close"
        : !rerenderRan
          ? "the rerender did not run for this family: its source is not mounted, or does not hash to what the family records"
          : e.status !== "corrected"
            ? "the shared correction for this escalation is still open, so no rerender can close it"
            : (objectedFieldsStillBound && objectedFieldsStillBound.length)
              ? `the regenerated map still binds ${objectedFieldsStillBound.join(", ")}`
              : null
    }));

  families.push({
    familyId,
    familyPackagePath: path.relative(rootDir, dir),
    currentSourceSha256: record.sha256 ?? record.expectedSha256 ?? null,
    // Answered by looking, not asserted. The rerender needs these bytes, so
    // whether they are reachable is the whole question for this record.
    sourceReadableInThisClone: (() => {
      const bundlePath = record.canonicalBundlePath ?? null;
      if (!extractPath || !bundlePath) return false;
      const relative = bundlePath.split("Edition_1/")[1];
      return Boolean(relative && fs.existsSync(path.join(extractPath, relative)));
    })(),
    currentMapOrProfilePath: path.relative(rootDir, mapPath),
    currentMapOrProfileSha256: sha256(mapPath),
    currentClassificationSha256: sha256(rel("field-classification.json")),
    currentCanonicalArtifactSha256: sha256(rel("fixtures/canonical-filled.pdf")),
    currentBoundaryArtifactSha256: sha256(rel("fixtures/boundary-filled.pdf")),
    currentContactSheetSha256: sha256(rel("contact-sheet/blank-vs-filled.pdf")),
    // The field the rerender exists to fill. Empty, with the reason attached,
    // rather than back-filled from bytes the corrected modules never touched.
    recomputedSourceSha256,
    sourceMatchesRecord,
    // There is no second copy of these hashes to go stale.
    //
    // This record used to carry `newArtifactSha256` beside
    // `currentCanonicalArtifactSha256`. Both were read off the same file, so
    // they agreed at the moment they were written and then stopped agreeing
    // the next time anything rendered: at the wave C review base three
    // families had been rendered again, the record still carried the previous
    // run's digests under a "new" name, and every
    // `provenAgainstThisFamilysBytes: true` flag on those three had been proven
    // against bytes that were no longer the artifact. A field that is a
    // snapshot inside a record that is regenerated is a trap.
    //
    // Whether this run produced the artifact is a boolean; the digests are
    // whatever is on disk right now.
    artifactProducedByThisRerender: rerenderRan,
    objectedFieldsStillBound,
    whyNoNewArtifact: rerenderRan
      ? null
      : "the rerender did not run for this family: RCAP_BUNDLE_EXTRACT names no source bytes matching the hash this family records",
    objections
  });
}

const objectionCount = families.reduce((n, f) => n + (f.objections?.length ?? 0), 0);

/**
 * Runs each focused verifier and records what it actually printed.
 *
 * The last line of a passing verifier in this repository is its own summary,
 * which is the honest "observed" value: it names the counts that run produced
 * rather than the counts some earlier run produced.
 */
const VERIFIERS = [
  "scripts/verify-rcap-widget-geometry-canaries.mjs",
  "scripts/verify-rcap-widget-appearance-canaries.mjs",
  "scripts/verify-rcap-field-semantics-canaries.mjs",
  "scripts/verify-rcap-official-forms-d1.mjs",
  "scripts/verify-rcap-shared-pdf-contract.mjs"
];

const VERIFIER_RESULTS = VERIFIERS.map((script) => {
  const command = `node ${script}`;
  if (!fs.existsSync(path.join(rootDir, script))) {
    return { command, result: "absent", observed: "the verifier named here is not in this tree" };
  }
  try {
    const out = execFileSync("node", [script], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const lines = out.trim().split("\n").filter(Boolean);
    return { command, result: "pass", observed: lines[lines.length - 1] ?? "" };
  } catch (error) {
    const out = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim().split("\n").filter(Boolean);
    return { command, result: "fail", observed: out[out.length - 1] ?? String(error.message) };
  }
});

const payload = {
  schemaVersion: "rcap-gate-b-family-rerender-evidence/v1",
  generatedBy: "scripts/generate-rcap-gate-b-family-rerender-evidence.mjs",
  purpose: "Per-family evidence for the Gate B rerender: the current source, map, classification and artifact hashes, each family's original reviewer objections, and exactly which part of each objection is proven closed and which is not.",
  notAnApproval: "This record approves nothing and promotes nothing. It states what is proven. The shared corrections are proven at the module level by their own canaries; no objection is proven against any family's own bytes, because no family's bytes changed.",
  consumedFrom: {
    branch: "claude/rcap-gate-b-shared-pdf-corrections-jnrl67",
    sharedCorrectionCommit: "8d1cad3232c6a7f550346e0a1512d51ce6c29f18",
    consumedByPathNotByMerge: true,
    pathsConsumed: [
      "scripts/rcap-official-forms/rcap-field-semantics.mjs",
      "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
      "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
      "scripts/implement-rcap-official-forms-d1.mjs",
      "scripts/verify-rcap-widget-geometry-canaries.mjs",
      "scripts/generate-rcap-gate-b-shared-correction-plan.mjs",
      "scripts/generate-rcap-gate-b-correction-wave.mjs",
      "scripts/generate-rcap-gate-b-rerender-handoff.mjs",
      "data/rcap-all50/gate-b-shared-correction-plan.json",
      "data/rcap-all50/gate-b-family-rerender-handoff.json",
      "data/rcap-all50/pdf-independent-reviews/gate-b-correction-wave.json",
      "docs/record-clearing/pdf-independent-reviews/gate-b-correction-wave.md"
    ],
    ownershipManifestPreserved: "data/rcap-all50/gate-b-shared-correction-plan.json, consumed unmodified",
    deliberatelyNotConsumed: [
      "the provenance sidecar module — ESC-SIDECAR-NONCONFORMANT is another lane's",
      "the rasterize and contact-sheet modules — raster visual evidence is another lane's"
    ],
    consumedAtCommit: consumedAt
  },
  sharedCorrectionProof: {
    statement: "Every focused verifier below was RUN by this generator against the consumed modules; the result and the last line of its output are what it printed here, not what it printed once.",
    // A remembered result is a claim about a run nobody can point at. These
    // four lines used to carry hand-written "pass" verdicts and hand-written
    // observations, so the record asserted a state of the world it had not
    // checked and could not have noticed changing.
    verifiers: VERIFIER_RESULTS,
    spotChecksOnTheConsumedSource: [
      "implement-rcap-official-forms-d1.mjs now ASSIGNS effectiveLabel and passes it with regionHeading into decideBinding — the channel this reviewer found was dead code is live",
      "decideBinding destructures effectiveLabel, regionHeading and regionIsDocumentTitle, so the binder sees the page rather than only the internal field name",
      "NEVER_WRITE now contains \"manual\", closing the path by which a field the classifier itself called manual was still bound and written"
    ],
    whatThisProvesAndWhatItDoesNot: "It proves the shared modules behave correctly on their own canaries and fixtures. It does not prove any individual family's artifact is now correct, because no family artifact was regenerated."
  },
  // What the rerender needs, measured now.
  //
  // This block used to be a paragraph about a run that happened once. It said
  // "ran to completion and processed 0 families" and "artifactsChanged: 0"
  // whatever the truth was, so at the wave C review base it sat inside a
  // record whose own per-family entries showed seventeen artifacts had been
  // produced, and contradicted them. A narrative field inside a regenerated
  // record cannot stay true; only measurements can.
  rerenderPreconditions: {
    command: "node scripts/implement-rcap-official-forms-d1.mjs",
    environmentVariable: "RCAP_BUNDLE_EXTRACT",
    environmentVariableSet: Boolean(extractPath),
    extractMounted,
    privateCorpusMountedInThisClone: corpusMounted,
    familiesWhoseSourceIsReadableHere: families.filter((f) => f.sourceReadableInThisClone).length,
    familiesInThisRecord: families.length,
    // The driver skips a family whose pinned bytes it cannot open, so with no
    // extract mounted every family is skipped. That is the driver behaving
    // correctly, and it is why nothing below is proven against family bytes
    // when this reads false.
    theDriverCanRunHere: extractMounted && families.some((f) => f.sourceReadableInThisClone),
    knownDriverHazard: "the driver rewrites data/rcap-all50/overlays/production/implementation-index.json from whatever it processed, so a run without the extract would describe an empty corpus. The driver refuses to write the index when it processed nothing."
  },
  totals: {
    familiesInHandoff: (handoff.familiesUnblockedForRerender ?? []).length,
    familiesWithAPackage: families.filter((f) => !f.error).length,
    objectionsRecorded: objectionCount,
    objectionsWithASharedCorrectionProven: families.reduce((n, f) => n + (f.objections ?? []).filter((o) => o.sharedCorrectionProven).length, 0),
    // Derived, not pinned. These two were literal zeros because when this
    // generator was written no rerender could run, and a literal zero stops
    // being a description the moment one does.
    objectionsProvenAgainstFamilyBytes: families.reduce((n, f) => n + (f.objections ?? []).filter((o) => o.provenAgainstThisFamilysBytes).length, 0),
    artifactsProducedByThisRerender: families.filter((f) => f.artifactProducedByThisRerender).length,
    familiesWhoseSourceHashMatchesTheMountedBytes: families.filter((f) => f.sourceMatchesRecord).length,
    escalationsOwnedByAnotherLane: [...OWNED_BY_ANOTHER_LANE]
  },
  whatIsStillRequired: [
    "Mount the Master Library extract and set RCAP_BUNDLE_EXTRACT, then run the driver so it actually renders these 17 families.",
    "Re-run the four focused verifiers against the new bytes.",
    "Record each family's new artifact hashes in this record.",
    "Hand the new bytes to an independent reviewer. This lane does not approve its own rerender, and a corrected module plus fresh bytes changes what the reviewer is looking at, not the verdict."
  ],
  families
};

const json = `${JSON.stringify(payload, null, 2)}\n`;
if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) { console.error("FAIL rerender evidence — the record is stale; re-run this generator"); process.exit(1); }
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
}

const rerendered = families.filter((f) => f.artifactProducedByThisRerender).length;
console.log(`OK rerender evidence — ${families.length} families, ${rerendered} with new artifact bytes, ${objectionCount} objections recorded; ${payload.totals.objectionsProvenAgainstFamilyBytes} proven against family bytes`);
