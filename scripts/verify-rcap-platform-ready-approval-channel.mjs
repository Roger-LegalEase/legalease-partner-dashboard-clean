#!/usr/bin/env node
// Mutation proof for the independent-review approval channel.
//
//   node scripts/verify-rcap-platform-ready-approval-channel.mjs
//
// A gate that only ever says yes to the one case you built it for has not been
// tested; it has been demonstrated. So this builds a canary family package and
// a canary review record in a temporary directory, proves the channel approves
// it, and then breaks it thirteen different ways and requires the answer to
// change to no every time.
//
// Twelve of those are the negative controls the approval contract names. The
// thirteenth is the opposite control, and it is the one this module exists to
// protect: adding a GLOBAL RELEASE HOLD to an otherwise current approved asset
// must NOT take platform_ready away. A release hold says when a thing ships. It
// says nothing about whether the thing is correct, and an inventory that
// confuses the two can never be finished.
//
// Nothing here writes to the repository. The canary lives in a temp directory
// and is removed on the way out.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { platformReadyVerdict, validateReviewRecords } from "./rcap-official-forms/rcap-platform-ready.mjs";

const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const FAMILY_ID = "ZZ:canary-form-en";
const FAMILY_SLUG = "canary-form-en";
const FAMILY_REL = "data/rcap-all50/overlays/production/canaria/canary-form-en";
const EVIDENCE_REL = "docs/record-clearing/pdf-visual-evidence/ZZ-canary-form-en-contact-sheet-page-01.png";
const REVIEWED_HEAD = "a7c9f0aa0dc19bb569783691e0bc0e65c0b57605";

/** A PDF-shaped blob. The gate hashes it; nothing here parses it. */
const pdfBytes = (marker) => Buffer.from(`%PDF-1.7\n% canary ${marker}\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n`, "utf8");

function write(root, relative, contents) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  return file;
}

/**
 * A canary that satisfies all twelve conditions.
 *
 * Built fresh for every case, so a mutation cannot leak into the next one.
 */
function buildCanary() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-approval-channel-"));
  const corpus = path.join(root, "corpus");

  const source = write(corpus, "Canary_Library/STATES/ZZ/02_PACKET_FORMS/ZZ__FORM__CANARY-1.pdf", pdfBytes("source"));
  const canonical = write(root, `${FAMILY_REL}/fixtures/canonical-filled.pdf`, pdfBytes("canonical"));
  const boundary = write(root, `${FAMILY_REL}/fixtures/boundary-filled.pdf`, pdfBytes("boundary"));
  const sheet = write(root, `${FAMILY_REL}/contact-sheet/blank-vs-filled.pdf`, pdfBytes("sheet"));
  const evidence = write(root, EVIDENCE_REL, Buffer.from("canary png", "utf8"));

  write(root, `${FAMILY_REL}/source-record.json`, `${JSON.stringify({
    jurisdiction: "ZZ",
    documentId: "CANARY-1",
    canonicalBundlePath: "Canary_Library/STATES/ZZ/02_PACKET_FORMS/ZZ__FORM__CANARY-1.pdf",
    productionHolds: []
  }, null, 2)}\n`);
  write(root, `${FAMILY_REL}/field-classification.json`, `${JSON.stringify({
    discoveredFieldsOrAnchors: 12,
    classifiedFieldsOrAnchors: 12
  }, null, 2)}\n`);
  write(root, `${FAMILY_REL}/production-field-map.json`, `${JSON.stringify({ bindings: [] }, null, 2)}\n`);
  write(root, `${FAMILY_REL}/artifact-provenance.json`, `${JSON.stringify({ artifacts: [] }, null, 2)}\n`);

  const manifest = {
    schemaVersion: "rcap-pdf-independent-review-batch/v1",
    batch: "canary",
    reviewedLaneBranch: "claude/rcap-problematic-pdf-full-remediation",
    reviewedLaneHead: REVIEWED_HEAD,
    families: [{
      familyId: FAMILY_ID,
      jurisdiction: "ZZ",
      familySlug: FAMILY_SLUG,
      familyPath: FAMILY_REL,
      documentId: "CANARY-1",
      sourceSha256: sha256File(source),
      artifacts: [
        { rel: "fixtures/canonical-filled.pdf", kind: "canonical_fixture", sha256: sha256File(canonical) },
        { rel: "fixtures/boundary-filled.pdf", kind: "boundary_fixture", sha256: sha256File(boundary) },
        { rel: "contact-sheet/blank-vs-filled.pdf", kind: "contact_sheet", sha256: sha256File(sheet) }
      ],
      contactSheetSha256: sha256File(sheet),
      renderedEvidence: EVIDENCE_REL,
      visualEvidenceSha256: sha256File(evidence),
      fieldMapPath: `${FAMILY_REL}/production-field-map.json`,
      fieldMapSha256: sha256File(path.join(root, `${FAMILY_REL}/production-field-map.json`)),
      fieldClassificationSha256: sha256File(path.join(root, `${FAMILY_REL}/field-classification.json`)),
      provenanceSha256: sha256File(path.join(root, `${FAMILY_REL}/artifact-provenance.json`)),
      familyKind: "acroform_fill"
    }]
  };
  const group = {
    schemaVersion: "rcap-pdf-independent-review-group/v1",
    batch: "canary",
    group: 1,
    reviewerBranch: "claude/rcap-pdf-independent-review-batch-1",
    reviewedLaneBranch: "claude/rcap-problematic-pdf-full-remediation",
    reviewedLaneHead: REVIEWED_HEAD,
    verdicts: [{ family: FAMILY_ID, jurisdiction: "ZZ", verdict: "approved_platform_ready" }]
  };
  const rollup = {
    schemaVersion: "rcap-pdf-independent-review-rollup/v1",
    batch: "canary",
    reviewerBranch: "claude/rcap-pdf-independent-review-batch-1",
    reviewedLaneBranch: "claude/rcap-problematic-pdf-full-remediation",
    reviewedLaneHead: REVIEWED_HEAD,
    totals: { familiesReviewed: 1, approvedPlatformReady: 1 }
  };

  const reviews = "data/rcap-all50/pdf-independent-reviews";
  write(root, `${reviews}/canary-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  write(root, `${reviews}/canary-group-1.review.json`, `${JSON.stringify(group, null, 2)}\n`);
  write(root, `${reviews}/canary-verdicts.json`, `${JSON.stringify(rollup, null, 2)}\n`);

  return { root, corpus, reviews: path.join(root, reviews) };
}

function verdictFor({ root, corpus, reviews }) {
  return platformReadyVerdict({
    overlayDir: path.join(root, "data/rcap-all50/overlays/production"),
    reviewsDir: reviews,
    rootDir: root,
    corpusRoots: [corpus],
    familyIds: [FAMILY_ID],
    artifacts: [{ finalized: true, failures: [] }]
  });
}

const readRecord = (canary, file) => JSON.parse(fs.readFileSync(path.join(canary.reviews, file), "utf8"));
const writeRecord = (canary, file, body) =>
  fs.writeFileSync(path.join(canary.reviews, file), `${JSON.stringify(body, null, 2)}\n`);

/** The twelve required negative controls, plus the one required positive control. */
const CASES = [
  {
    id: 1,
    name: "independent approval is removed",
    mutate: (canary) => {
      const group = readRecord(canary, "canary-group-1.review.json");
      group.verdicts = [];
      writeRecord(canary, "canary-group-1.review.json", group);
    }
  },
  {
    id: 2,
    name: "verdict changes to correction_required",
    mutate: (canary) => {
      const group = readRecord(canary, "canary-group-1.review.json");
      group.verdicts[0].verdict = "correction_required";
      writeRecord(canary, "canary-group-1.review.json", group);
    }
  },
  {
    id: 3,
    name: "the source hash changes",
    mutate: (canary) =>
      fs.writeFileSync(
        path.join(canary.corpus, "Canary_Library/STATES/ZZ/02_PACKET_FORMS/ZZ__FORM__CANARY-1.pdf"),
        pdfBytes("a different edition")
      )
  },
  {
    id: 4,
    name: "an artifact hash changes",
    mutate: (canary) =>
      fs.writeFileSync(path.join(canary.root, `${FAMILY_REL}/fixtures/canonical-filled.pdf`), pdfBytes("re-rendered"))
  },
  {
    id: 5,
    name: "the field-map hash changes",
    mutate: (canary) =>
      fs.writeFileSync(
        path.join(canary.root, `${FAMILY_REL}/production-field-map.json`),
        `${JSON.stringify({ bindings: [{ name: "added_after_review" }] }, null, 2)}\n`
      )
  },
  {
    id: 6,
    name: "the classification hash changes",
    mutate: (canary) =>
      fs.writeFileSync(
        path.join(canary.root, `${FAMILY_REL}/field-classification.json`),
        `${JSON.stringify({ discoveredFieldsOrAnchors: 13, classifiedFieldsOrAnchors: 13 }, null, 2)}\n`
      )
  },
  {
    id: 7,
    name: "the provenance hash changes",
    mutate: (canary) =>
      fs.writeFileSync(
        path.join(canary.root, `${FAMILY_REL}/artifact-provenance.json`),
        `${JSON.stringify({ artifacts: [], changed: true }, null, 2)}\n`
      )
  },
  {
    id: 8,
    name: "the visual-evidence hash changes",
    mutate: (canary) => fs.writeFileSync(path.join(canary.root, EVIDENCE_REL), Buffer.from("a different png", "utf8"))
  },
  {
    id: 9,
    name: "the approval references an obsolete artifact",
    mutate: (canary) => fs.rmSync(path.join(canary.root, `${FAMILY_REL}/fixtures/boundary-filled.pdf`))
  },
  {
    id: 10,
    name: "a non-independent record is substituted",
    mutate: (canary) => {
      for (const file of ["canary-group-1.review.json", "canary-verdicts.json"]) {
        const body = readRecord(canary, file);
        body.reviewerBranch = "claude/rcap-problematic-pdf-full-remediation";
        writeRecord(canary, file, body);
      }
    }
  },
  {
    id: 11,
    name: "a correction remains open",
    mutate: (canary) => {
      const group = readRecord(canary, "canary-group-1.review.json");
      group.verdicts[0].smallestCorrection = "re-render the caption band";
      writeRecord(canary, "canary-group-1.review.json", group);
    }
  },
  {
    id: 12,
    name: "a generic review note is used as approval",
    mutate: (canary) => {
      for (const file of fs.readdirSync(canary.reviews)) fs.rmSync(path.join(canary.reviews, file));
      writeRecord(canary, "canary-review-note.json", {
        note: "Reviewed this one, looks good to me, approve for platform_ready",
        family: FAMILY_ID,
        verdict: "approved_platform_ready"
      });
    }
  },
  {
    id: 13,
    name: "a global release hold is added and nothing else",
    expectApproved: true,
    mutate: (canary) => {
      const file = path.join(canary.root, `${FAMILY_REL}/source-record.json`);
      const record = JSON.parse(fs.readFileSync(file, "utf8"));
      record.productionHolds = ["nationwide_launch_not_authorized", "state_manifest_generation_allowed_no"];
      fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
    }
  },
  {
    id: 14,
    name: "the record is withdrawn",
    mutate: (canary) => {
      const manifest = readRecord(canary, "canary-manifest.json");
      manifest.withdrawn = true;
      writeRecord(canary, "canary-manifest.json", manifest);
    }
  },
  {
    id: 15,
    name: "the record is superseded",
    mutate: (canary) => {
      const manifest = readRecord(canary, "canary-manifest.json");
      manifest.supersededBy = "batch-2";
      writeRecord(canary, "canary-manifest.json", manifest);
    }
  }
];

/**
 * Which condition each control has to fail on.
 *
 * Without this the suite proves only that the gate said no, and a gate that
 * says no for the wrong reason is a gate that will say yes for the wrong reason
 * as soon as the reason moves.
 */
const EXPECTED_CONDITION = {
  1: /condition 1 —/,
  2: /condition 1 —/,
  3: /condition 3 —/,
  4: /condition 6 —/,
  5: /condition 4 —/,
  6: /condition 5 —/,
  7: /condition 7 —/,
  8: /condition 8 —/,
  9: /condition 6 —/,
  10: /condition (2|12) —/,
  11: /condition 9 —/,
  12: /no canonical independent-review record is present/,
  14: /condition 11 —/,
  15: /condition 11 —/
};

const failures = [];
const results = [];

// The baseline. If the canary does not approve, every red below is meaningless
// — a gate that says no to everything passes a mutation suite by accident.
{
  const canary = buildCanary();
  const validation = validateReviewRecords(canary.reviews);
  const verdict = verdictFor(canary);
  results.push({ case: "baseline", approved: verdict.approved, channel: verdict.channel ?? null, reason: verdict.reason });
  if (!validation.ok) failures.push(`baseline: the canary record does not pass the verifier — ${validation.problems[0]?.message}`);
  if (!verdict.approved) failures.push(`baseline: the canary was not approved — ${verdict.reason}`);
  if (verdict.approved && verdict.channel !== "independent_review_record") {
    failures.push(`baseline: approved through ${verdict.channel}, not the review-record channel`);
  }
  fs.rmSync(canary.root, { recursive: true, force: true });
}

for (const testCase of CASES) {
  const canary = buildCanary();
  testCase.mutate(canary);
  const verdict = verdictFor(canary);
  const expected = testCase.expectApproved === true;
  const channelReason = verdict.channelReasons?.independent_review_record ?? verdict.reason;
  const wanted = EXPECTED_CONDITION[testCase.id] ?? null;
  const rightCondition = expected || !wanted || wanted.test(String(channelReason));
  const passed = verdict.approved === expected && rightCondition;
  results.push({
    case: `${testCase.id}. ${testCase.name}`,
    expected: expected ? "still approved" : "refused",
    approved: verdict.approved,
    reason: expected ? verdict.reason : channelReason,
    passed
  });
  if (verdict.approved !== expected) {
    failures.push(
      expected
        ? `case ${testCase.id} (${testCase.name}): approval was withdrawn by a release hold — ${verdict.reason}`
        : `case ${testCase.id} (${testCase.name}): the gate still approved`
    );
  } else if (!rightCondition) {
    failures.push(
      `case ${testCase.id} (${testCase.name}): refused on the wrong condition — expected ${wanted}, got "${channelReason}"`
    );
  }
  fs.rmSync(canary.root, { recursive: true, force: true });
}

for (const row of results) {
  const mark = row.case === "baseline" ? (row.approved ? "ok  " : "FAIL") : (row.passed ? "ok  " : "FAIL");
  console.log(`  ${mark} ${row.case}${row.reason ? ` — ${row.reason}` : ""}`);
}

if (failures.length) {
  console.error(`FAIL platform-ready approval channel — ${failures.length} control(s) did not hold`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK platform-ready approval channel — canary approves through the review-record channel; ` +
    `${CASES.filter((c) => c.expectApproved !== true).length} negative controls turn it red; ` +
    `a global release hold alone does not`
);
