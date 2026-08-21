// Whether `not_participant_fillable_no_fixture_fill` is still true of a family.
//
// This is the one member of the production-hold vocabulary that is DERIVED
// rather than decided. The builder that first writes a source record emits it
// as `participantFillable ? [] : [hold]`
// (build-rcap-official-forms-d1-verified-binaries.mjs), so a record carrying
// BOTH `participantFillable: true` AND the hold states a combination its own
// generator cannot produce.
//
// Later stages rewrite source-record.json -- they add implementationStatus,
// documentOwnership and censusBasis, none of which the original builder writes
// -- and carry productionHolds forward verbatim, so the string outlives the
// fact it was derived from. The register then ingested the stale string as a
// substantive finding, and because it belongs to neither RELEASE_STATE_HOLDS
// nor REVIEW_REQUIRED_HOLDS it survived an independent approval and retained
// the asset permanently.
//
// It lives in its own module so the derivation can be exercised directly by
// scripts/verify-rcap-participant-fill-hold-derivation.mjs. The register runs
// its whole body on import and cannot be imported by a test.
//
// WHAT THIS IS NOT: a waiver. Discharging on `participantFillable` alone would
// be a one-line flip that promotes any blank form whose flag happens to be set.
// The hold stands unless the family actually produced a fill AND that fill is
// visible on the finalized page. Any missing leg leaves the hold exactly where
// it is, and no family ID appears anywhere in the decision.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const PARTICIPANT_FILL_HOLD = "not_participant_fillable_no_fixture_fill";

/** Classes that represent a value the factory writes on the participant's behalf. */
const FILLED_CLASSES = new Set(["participant", "deterministic", "manual"]);

const readJson = (file) => {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
};

/**
 * The legs behind the derivation, each observed from a committed file.
 *
 * `sheet` is the register's own pixel comparison of the contact sheet's blank
 * and filled panels. It is passed in rather than read here because the register
 * already holds it, and because it must come from a DIFFERENT source than the
 * family's own proof: one reads the page's text content, the other measures
 * pixels, they share no code, and a value that is present in content but draws
 * nothing is visible to the second and not the first.
 */
export function participantFillEvidence({ familyPath, record, protectedScan, sheet }) {
  const map = readJson(path.join(familyPath, "production-field-map.json"))
    ?? readJson(path.join(familyPath, "overlay-profile.json"));
  const bound = Array.isArray(map?.bindings) ? map.bindings
    : Array.isArray(map?.anchors) ? map.anchors : [];
  const participantBindings = bound.filter((b) => FILLED_CLASSES.has(String(b?.class ?? ""))).length;

  const populated = readJson(path.join(familyPath, "reports/populated-fields.json"));
  const populatedFields = Array.isArray(populated) ? populated.length
    : Array.isArray(populated?.written) ? populated.written.length : 0;

  const familyProof = readJson(path.join(familyPath, "contact-sheet/contact-sheet-proof.json"));
  const expectedValues = Array.isArray(familyProof?.expectedValues) ? familyProof.expectedValues : [];

  // The proof must describe the bytes that are here NOW. A contact sheet left
  // behind by a re-render names a superseded artifact, and its verdict is about
  // a file nobody will file.
  const canonical = path.join(familyPath, "fixtures/canonical-filled.pdf");
  const canonicalSha256 = fs.existsSync(canonical)
    ? crypto.createHash("sha256").update(fs.readFileSync(canonical)).digest("hex")
    : null;

  const legs = {
    // The record's own derived fact, which the hold contradicts.
    participantFillableFlag: record?.participantFillable === true,
    // An outside-party, prosecutor-controlled or informational document is not
    // discharged however thoroughly it was reviewed.
    participantOwned: record?.documentOwnership === "participant_completed"
      || /participant-(?:completed|filled)/i.test(String(record?.ownershipDetermination ?? "")),
    participantBindings,
    populatedFields,
    protectedScanPassed: protectedScan?.pass === true,
    fieldsActuallyWritten: Number(protectedScan?.writtenFields ?? 0) > 0,
    noValueWrittenButNotVisible: (protectedScan?.valuesWrittenButNotVisible ?? []).length === 0,
    expectedValuesDeclared: expectedValues.length,
    expectedValuesVisibleOnPage: familyProof?.allExpectedValuesVisible === true,
    proofNamesCurrentArtifact: canonicalSha256 !== null && familyProof?.finalizedSha256 === canonicalSha256,
    panelsVisuallyDiffer: sheet?.panelsAreVisuallyIdentical === false
  };

  legs.proven = legs.participantFillableFlag
    && legs.participantOwned
    && legs.participantBindings > 0
    && legs.populatedFields > 0
    && legs.protectedScanPassed
    && legs.fieldsActuallyWritten
    && legs.noValueWrittenButNotVisible
    && legs.expectedValuesDeclared > 0
    && legs.expectedValuesVisibleOnPage
    && legs.proofNamesCurrentArtifact
    && legs.panelsVisuallyDiffer;

  return legs;
}
