#!/usr/bin/env node
// The four findings that are true of the batch rather than of any one family.
//
//   node scripts/verify-rcap-pdf-batch-cross-family-findings.mjs
//   node scripts/verify-rcap-pdf-batch-cross-family-findings.mjs --write
//
// Nine families each land with a different reviewer, and a defect that every
// family shares looks, from inside any one group, like a property of that
// group's forms. Measuring the three known cross-family questions across all
// twenty-seven at once is what tells the difference between "this form is
// stale" and "the renderer changed under all of them".
//
// It also settles the reverse case, which is the one that matters here: a
// finding raised against WI CR-266 at the previous lane head turns out to be
// true of exactly that family and no other, which makes it a real correction
// rather than a corpus-wide one.
//
//   1. PROVENANCE CONFORMANCE. Does each committed sidecar carry the twenty
//      fields plus page count that scripts/verify-rcap-shared-pdf-contract.mjs
//      requires? The contract never reads a committed sidecar -- it builds its
//      own from a synthesized canary -- so nothing has ever compared the two.
//   2. CREATION-DATE DRIFT. carryDates() at HEAD takes /CreationDate from the
//      source document and pins only /ModDate. An artifact whose /CreationDate
//      is the deterministic stamp was produced by the older code, so
//      re-rendering it changes its bytes and every hash an approval named.
//      A contact sheet is exempt: it is a new composite document with no source
//      date to carry, so the stamp is correct there.
//   3. APPROVAL CHANNEL. rcap-platform-ready.mjs reads independentReview from
//      overlay-profile.json. An AcroForm-fill family carries
//      production-field-map.json, which has no such field, so it cannot be
//      recorded as approved at all.
//   4. SOURCE READABILITY. Can a reviewer here read the bytes each family
//      claims as its source? Verifying a source SHA, taking an independent
//      census off the blank form, or comparing a fill against it all need
//      those bytes.
//
// This verifier reports; it does not fail the build. Each finding belongs to
// the PDF rendering lane, and a reviewer's job is to state it exactly.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(rootDir, "data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json");
const OUT = path.join(rootDir, "data/rcap-all50/pdf-independent-reviews/batch-1-cross-family-findings.json");
const write = process.argv.includes("--write");

if (!fs.existsSync(MANIFEST)) {
  console.error("FAIL cross-family findings — the batch manifest has not been generated");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

// The fields scripts/verify-rcap-shared-pdf-contract.mjs requires of a sidecar.
const REQUIRED_PROVENANCE_FIELDS = [
  "jurisdiction", "assetId", "formFamily", "officialFormNumber", "officialTitle", "sourcePublisher",
  "sourceUrl", "sourceRevision", "sourceSha256", "sourceMetadataFingerprint", "fieldMapSha256",
  "classificationSha256", "packetSpecSha256", "factoryVersion", "rendererVersion", "generatedAt",
  "activeContentResult", "flatteningResult", "protectedFieldResult", "fixtureIdentity"
];
const DETERMINISTIC_STAMP = "D:20260101000000Z";

const infoDate = (file, key) => {
  const match = fs.readFileSync(file).toString("latin1").match(new RegExp(`${key}\\s*\\(([^)]*)\\)`));
  return match ? match[1] : null;
};

// ---- 4. is the source readable at all? --------------------------------------
// Hashed rather than read off a flag. The master list's
// `sourceBinaryPresentInClone` records the state of the machine that generated
// it, and most of its true values point under private/, which is git-ignored
// and absent from every clone of this branch.
const pdfsInClone = new Map();
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "tmp"]);
const walkForPdfs = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) walkForPdfs(path.join(dir, entry.name)); continue; }
    if (!/\.pdf$/i.test(entry.name)) continue;
    const file = path.join(dir, entry.name);
    const hash = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    if (!pdfsInClone.has(hash)) pdfsInClone.set(hash, path.relative(rootDir, file));
  }
};
walkForPdfs(rootDir);

const provenance = [];
const dates = [];
const approval = [];
const sourceReadability = [];

for (const family of manifest.families ?? []) {
  const familyDir = path.join(rootDir, family.familyPath);

  // ---- 1. provenance conformance -------------------------------------------
  const sidecarPath = path.join(familyDir, "artifact-provenance.json");
  if (!fs.existsSync(sidecarPath)) {
    provenance.push({ familyId: family.familyId, sidecarPresent: false, missingFields: REQUIRED_PROVENANCE_FIELDS, everyArtifactHasAPageCount: false });
  } else {
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    provenance.push({
      familyId: family.familyId,
      sidecarPresent: true,
      missingFields: REQUIRED_PROVENANCE_FIELDS.filter((f) => sidecar[f] === undefined || sidecar[f] === null),
      everyArtifactHasAPageCount: (sidecar.artifacts ?? []).every((a) => typeof a.pageCount === "number" && a.pageCount >= 1)
    });
  }

  // ---- 2. creation-date drift ----------------------------------------------
  for (const artifact of family.artifacts ?? []) {
    const file = path.join(familyDir, artifact.rel);
    if (!fs.existsSync(file)) continue;
    const creation = infoDate(file, "CreationDate");
    const isContactSheet = /contact-sheet/.test(artifact.rel);
    dates.push({
      familyId: family.familyId, artifact: artifact.rel, kind: artifact.kind,
      creationDate: creation, modificationDate: infoDate(file, "ModDate"),
      // A fixture derives from a source and must carry that source's date.
      // A contact sheet is composed fresh, so the stamp is the right answer.
      carriesTheDeterministicStamp: creation === DETERMINISTIC_STAMP,
      staleAgainstCarryDates: creation === DETERMINISTIC_STAMP && !isContactSheet
    });
  }

  // ---- 4. source readability ------------------------------------------------
  sourceReadability.push({
    familyId: family.familyId,
    sourceSha256: family.sourceSha256,
    readableAt: pdfsInClone.get(family.sourceSha256) ?? null,
    readable: pdfsInClone.has(family.sourceSha256)
  });

  // ---- 3. approval channel --------------------------------------------------
  approval.push({
    familyId: family.familyId,
    familyKind: family.familyKind ?? null,
    fieldMapPath: family.fieldMapPath ?? null,
    approvalChannel: family.approvalChannel ?? null,
    canRecordAnApproval: family.approvalChannel === "overlay_profile.independentReview"
  });
}

const staleArtifacts = dates.filter((d) => d.staleAgainstCarryDates);
const conformantSidecars = provenance.filter((p) => p.missingFields.length === 0 && p.everyArtifactHasAPageCount);

const payload = {
  schemaVersion: "rcap-pdf-batch-cross-family-findings/v1",
  generatedBy: "scripts/verify-rcap-pdf-batch-cross-family-findings.mjs",
  purpose: "The findings that are true of the batch rather than of one family, measured across all of it at once so a shared defect is not mistaken for a per-form one.",
  batch: manifest.batch,
  reviewedHead: manifest.reviewedHead,
  findings: {
    provenanceConformance: {
      question: "Does each committed sidecar carry the 20 fields plus page count that the shared PDF contract requires?",
      familiesChecked: provenance.length,
      conformant: conformantSidecars.length,
      nonConformant: provenance.length - conformantSidecars.length,
      whyThisWasNeverCaught: "scripts/verify-rcap-shared-pdf-contract.mjs proves the P-block against a sidecar it synthesizes from a canary. It never opens a committed one, so the contract can pass while no artifact on disk satisfies it.",
      doesThisBlockPlatformReady: false,
      whyNot: "rcap-platform-ready.mjs checks the approval, the artifact hashes, the classification and the finalized-artifact audit. It does not read the sidecar's field set. So this is a divergence between the contract the platform states and the gate the platform enforces, not a gate failure.",
      rows: provenance
    },
    creationDateDrift: {
      question: "Which artifacts were produced before carryDates() started taking /CreationDate from the source?",
      artifactsChecked: dates.length,
      staleFixtures: staleArtifacts.length,
      staleFamilies: [...new Set(staleArtifacts.map((d) => d.familyId))],
      contactSheetsCorrectlyStamped: dates.filter((d) => d.carriesTheDeterministicStamp && !d.staleAgainstCarryDates).length,
      note: "A contact sheet is composed fresh and has no source date to carry, so the deterministic stamp is correct there and is not counted as drift.",
      rows: dates
    },
    approvalChannel: {
      question: "Can an approval of this family be recorded anywhere the shared gate will read?",
      familiesChecked: approval.length,
      canRecordAnApproval: approval.filter((a) => a.canRecordAnApproval).length,
      cannotRecordAnApproval: approval.filter((a) => !a.canRecordAnApproval).length,
      consequence: "A family that cannot record an approval cannot reach platform_ready, however clean its review. This blocks more of the batch than every form-level finding combined.",
      rows: approval
    },
    sourceReadability: {
      question: "Can a reviewer in this clone read the bytes each family claims as its source?",
      familiesChecked: sourceReadability.length,
      readable: sourceReadability.filter((r) => r.readable).length,
      notReadable: sourceReadability.filter((r) => !r.readable).length,
      whyThisMatters: "Source SHA-256 verification, an independent field or anchor census taken from the blank form, placement against the rules the form prints, and a fill-versus-blank comparison all need the source bytes. A family whose source is unreadable can be reviewed for internal consistency but its source identity cannot be independently confirmed, which is what source_identity_unresolved means.",
      whatWouldFixIt: "Mount private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1. These are not missing sources; they are unmounted ones.",
      rows: sourceReadability
    }
  }
};

if (write) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
}

console.log(`OK cross-family findings — sources readable ${payload.findings.sourceReadability.readable}/${sourceReadability.length}; sidecars conformant ${conformantSidecars.length}/${provenance.length}; stale fixtures ${staleArtifacts.length} across ${payload.findings.creationDateDrift.staleFamilies.length} family(ies); families that can record an approval ${payload.findings.approvalChannel.canRecordAnApproval}/${approval.length}${write ? `; written to ${path.relative(rootDir, OUT)}` : ""}`);
