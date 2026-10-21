#!/usr/bin/env node
// FIX01 control for la-985-expungement-by-redaction-set.
//
// It fails on the pre-repair bytes and passes on the repaired bytes. It reads
// the DELIVERED PDFs, the committed field map and the delivered guide, and
// measures the two things VF03 failed:
//
//   KNOWN_PREFILLS          no written cell carries a restatement of its own
//                           printed question as its value, no build-harness
//                           word reaches the face of any document, and every
//                           required participantInput the platform does not
//                           hold is a REQUIRED_BEFORE_FILING blank that reaches
//                           the guide's supply table.
//   REQUIRED_BEFORE_FILING  every "the packet gives you the Article N form"
//                           claim in the guide is either true of a rendered
//                           component or reconciled in the guide itself.
//
// It never edits anything and it sets no verdict.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines } from "../../../../scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../..");
const FAMILY_REL = "data/rcap-all50/overlays/census-v1/la/la-985-expungement-by-redaction-set--custom-pleading";
const MEMO_REL = "data/record-clearing/legal-design-intake/LA.memo.json";
const TRACK_ID = "la-985-expungement-by-redaction";

// The six REQUIRED participantInputs VF03 found carrying prompt-restatements,
// paired with the field id each is written into.
const REQUIRED_INPUTS = [
  ["originalArrestCharges", "original_arrest_charges"],
  ["dispositionType", "disposition_type"],
  ["underlyingEntitlement", "underlying_entitlement"],
  ["otherIndividualsNamed", "other_individuals_named"],
  ["othersEntitled", "others_entitled"],
  ["recordLocations", "record_locations"]
];

// Words that belong to the build harness and never to a filed instrument.
const HARNESS_WORDS = ["fixture", "canonical fixture", "boundary fixture"];

const dir = path.join(ROOT, FAMILY_REL);
const read = (rel) => fs.readFileSync(path.join(dir, rel));
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_REL), "utf8"));
const memoTrack = (memo.tracks ?? []).find((t) => t.trackId === TRACK_ID);
if (!memoTrack) {
  console.error(`CONTROL_INCONCLUSIVE ${MEMO_REL} no longer declares track ${TRACK_ID}`);
  process.exit(2);
}

const fieldMap = JSON.parse(read("production-field-map.json").toString("utf8"));
const guide = read("participant-instructions.md").toString("utf8");
const failures = [];
const checks = [];
const record = (name, ok, detail) => {
  checks.push({ check: name, ok, detail });
  if (!ok) failures.push(`${name}: ${detail}`);
};

/* ---- the delivered pages, read from the bytes ---- */
const pageTextByFixture = {};
for (const fixture of ["canonical", "boundary"]) {
  const bytes = read(path.join("fixtures", `${fixture}.pdf`));
  const pdf = await PDFDocument.load(bytes);
  pageTextByFixture[fixture] = pdf
    .getPages()
    .map((page) => groupIntoLines(extractTextItems(page)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
}

/* ---- KNOWN_PREFILLS: no harness word on any delivered page ---- */
for (const [fixture, pages] of Object.entries(pageTextByFixture)) {
  for (const word of HARNESS_WORDS) {
    const hits = pages
      .map((text, i) => ({ page: i + 1, hit: new RegExp(word, "i").test(text) }))
      .filter((r) => r.hit)
      .map((r) => r.page);
    record(
      `KNOWN_PREFILLS/no-harness-word/${fixture}/${word.replace(/\s+/g, "-")}`,
      hits.length === 0,
      hits.length === 0 ? "absent from every delivered page" : `the word "${word}" prints on ${fixture} page(s) ${hits.join(", ")}`
    );
  }
}

/* ---- KNOWN_PREFILLS: no written value restates its own printed question ---- */
const normalize = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const maps = Array.isArray(fieldMap.maps) ? fieldMap.maps : Object.values(fieldMap.maps ?? {});
if (maps.length === 0) {
  console.error("CONTROL_INCONCLUSIVE the committed field map declares no maps; this control measures their rows");
  process.exit(2);
}
const allRows = [];
for (const doc of maps) {
  for (const key of ["canonicalWrites", "boundaryWrites", "canonicalRefusals", "boundaryRefusals"]) {
    for (const row of doc[key] ?? []) allRows.push({ ...row, _document: doc.formNumber ?? doc.documentId ?? null, _bucket: key });
  }
}
const writeRows = allRows.filter((r) => r._bucket.endsWith("Writes"));
const writtenValues = JSON.parse(read(path.join("reports", "actual-writes.json")).toString("utf8"));
const flatWrites = JSON.stringify(writtenValues);
for (const [, fieldId] of REQUIRED_INPUTS) {
  const written = writeRows.filter((r) => String(r.field ?? "").endsWith(`.${fieldId}`));
  record(
    `KNOWN_PREFILLS/not-written/${fieldId}`,
    written.length === 0,
    written.length === 0
      ? "carries no written value on any document"
      : `is classified as a written cell on ${written.map((r) => r.field).join(", ")}, and the platform holds no participant fact for it`
  );
}

/* ---- KNOWN_PREFILLS: each required input is a classified blank that reaches the supply table ---- */
const supplyRows = allRows.filter((r) => r.completenessDisposition === "REQUIRED_BEFORE_FILING");
for (const [inputKey, fieldId] of REQUIRED_INPUTS) {
  const input = (memoTrack.participantInputs ?? []).find((p) => p.key === inputKey);
  if (!input || input.requirement !== "required") {
    record(`KNOWN_PREFILLS/record-still-requires/${inputKey}`, false, "the memo no longer makes this a required participant input; this control is measured against a record that has moved");
    continue;
  }
  const rows = supplyRows.filter((r) => String(r.field ?? "").endsWith(`.${fieldId}`));
  record(
    `KNOWN_PREFILLS/classified-required-before-filing/${fieldId}`,
    rows.length > 0,
    rows.length > 0 ? `classified REQUIRED_BEFORE_FILING on ${rows.map((r) => r.field).join(", ")}` : "is not classified REQUIRED_BEFORE_FILING anywhere in the field map"
  );
  const label = rows[0]?.effectiveLabel ?? rows[0]?.printedLabel ?? null;
  const inSupplyTable = label ? guide.includes(`| ${label} |`) : false;
  record(
    `KNOWN_PREFILLS/reaches-the-supply-table/${fieldId}`,
    inSupplyTable,
    inSupplyTable ? "named in the guide's What you must supply before filing table" : "does not appear as a row of the guide's What you must supply before filing table, so the participant is never told to supply it"
  );
  // A value that merely restates the field's own question is not a fact.
  const restated = label ? flatWrites.includes(label) && new RegExp(`"[^"]*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]*"`).test(flatWrites) : false;
  record(
    `KNOWN_PREFILLS/no-prompt-restatement/${fieldId}`,
    !restated || rows.length > 0,
    restated && rows.length === 0 ? "a written value restates the field's own printed question" : "no written value restates this field's printed question"
  );
}

/* ---- REQUIRED_BEFORE_FILING: every "the packet gives you the Article N form" claim is true or reconciled ---- */
const renderedArticles = new Set(
  maps.map((d) => /ART-(\d+)/.exec(d.officialFormId ?? d.formNumber ?? d.documentId ?? "")?.[1]).filter(Boolean)
);
const claims = [...guide.matchAll(/packet gives you the Article (\d+) form/gi)].map((m) => m[1]);
if (claims.length === 0) {
  record("REQUIRED_BEFORE_FILING/claims-found", true, "the guide makes no 'the packet gives you the Article N form' claim");
}
for (const article of new Set(claims)) {
  if (renderedArticles.has(article)) {
    record(`REQUIRED_BEFORE_FILING/claim-true/Article-${article}`, true, "the packet does render this component, so the claim is true");
    continue;
  }
  const reconciled = guide.includes(`This packet does not give you the Article ${article} form.`);
  record(
    `REQUIRED_BEFORE_FILING/claim-reconciled/Article-${article}`,
    reconciled,
    reconciled
      ? "the guide states plainly that the packet does not contain this form and says where to get it"
      : `the guide tells the participant the packet gives them the Article ${article} form, the packet does not contain it, and nothing in the guide reconciles the two`
  );
}

const report = {
  control: "fix01-la-985-prompts-are-not-answers",
  familyId: "la-985-expungement-by-redaction-set",
  obligations: ["KNOWN_PREFILLS", "REQUIRED_BEFORE_FILING"],
  recordBoundByDigest: `${MEMO_REL}@${digest(fs.readFileSync(path.join(ROOT, MEMO_REL)))}`,
  artifactsRead: [
    { path: `${FAMILY_REL}/fixtures/canonical.pdf`, sha256: digest(read("fixtures/canonical.pdf")) },
    { path: `${FAMILY_REL}/fixtures/boundary.pdf`, sha256: digest(read("fixtures/boundary.pdf")) },
    { path: `${FAMILY_REL}/production-field-map.json`, sha256: digest(read("production-field-map.json")) },
    { path: `${FAMILY_REL}/participant-instructions.md`, sha256: digest(read("participant-instructions.md")) },
    { path: `${FAMILY_REL}/reports/actual-writes.json`, sha256: digest(read("reports/actual-writes.json")) }
  ],
  checksRun: checks.length,
  checksPassed: checks.filter((c) => c.ok).length,
  checksFailed: checks.filter((c) => !c.ok).length,
  failures
};
console.log(JSON.stringify(report, null, 2));
console.log(failures.length === 0 ? "CONTROL_PASS" : "CONTROL_FAIL");
process.exit(failures.length === 0 ? 0 : 1);
