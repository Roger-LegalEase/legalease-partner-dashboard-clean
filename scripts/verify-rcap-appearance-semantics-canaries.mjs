#!/usr/bin/env node
// Canaries for what an unwritten field's appearance MEANS, and the mutation
// that proves the correction is load-bearing.
//
//   node scripts/verify-rcap-appearance-semantics-canaries.mjs
//
// Nebraska's caption band is the hard case, because on those forms both the
// placeholder and the court's own caption live in field values:
//
//   enter the type of court    "(Enter the type of court)"   instruction → goes
//   TYPEOFCOURTDROPDOWN        draws "Choose the court"      prompt      → goes
//   TYPEOFCOURTRESULTS         "IN THE ... COURT OF"         caption     → stays
//   fullcountystatementRIGHT   "COUNTY, NEBRASKA"            caption     → stays
//
// So "the source value is non-empty" cannot decide anything: reading it as
// participant content strips the court's caption off its own pleading, and
// reading it as a placeholder leaves the filer instructions on a filed
// pleading. The participant-written decision comes from the write ledger, and
// what remains is judged on what it says.
//
// The mutation half is the part that matters: the pre-correction predicate is
// rebuilt here and required to miss the parenthesised canary. A correction
// whose removal changes nothing was never doing anything.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isChooserPrompt } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { residualSourceText, finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = process.env.RCAP_BUNDLE_EXTRACT
  ?? path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const CC_6_11 = "STATES/NE/02_PACKET_FORMS/NE__FORM__CC-6-11__cc-6-11-petition-to-set-aside-a-criminal-conviction__REV-2024-04__EN.pdf";
const FAMILY = path.join(rootDir, "data/rcap-all50/overlays/production/nebraska/cc-6-11-form-en");

const failures = [];
const ok = (n, d) => console.log(`    ok   ${n}${d ? ` — ${d}` : ""}`);
const bad = (n, d) => { failures.push(`${n}: ${d}`); console.log(`    FAIL ${n}${d ? ` — ${d}` : ""}`); };
const expect = (n, cond, d) => (cond ? ok(n, d) : bad(n, d));

// ---------------------------------------------------------------- the policy

/** The six caption-band strings, exactly as CC 6:11 stores them. */
const SUPPRESS = [
  ["chooser-court", "Choose the court", "a filed pleading telling the court to choose one"],
  ["chooser-county", "Choose the county", "a filed pleading telling the court to choose one"],
  ["instruction-court", "           \r    (Enter the type of court)", "the filer instruction printed on the filing"],
  ["instruction-county", "\r   (Enter the county name)", "the filer instruction printed on the filing"]
];
const PRESERVE = [
  ["caption-in-the-court-of", "IN THE                   COURT OF", "the court's own caption words removed from its caption"],
  ["caption-county-nebraska", "                            COUNTY, NEBRASKA ", "the venue line removed from a Nebraska filing"],
  ["caption-type-of-case", "Type of Case - Check only one:", "a source instruction the form prints for itself removed"]
];

console.log("  what the value says");
for (const [id, value, consequence] of SUPPRESS) {
  expect(id, isChooserPrompt(value) === true, consequence);
}
for (const [id, value, consequence] of PRESERVE) {
  expect(id, isChooserPrompt(value) === false, consequence);
}

// ------------------------------------------------- what the page would paint

console.log("  what the page would paint");
const corpusMounted = fs.existsSync(path.join(CORPUS, CC_6_11));
if (!corpusMounted) {
  bad("source-member-available", `not mounted: ${CC_6_11}. The byte-level canaries below cannot run, and an unrun canary is not a pass.`);
} else {
  const { createRequire } = await import("node:module");
  const { PDFDocument } = createRequire(import.meta.url)("pdf-lib");
  const sourceBytes = fs.readFileSync(path.join(CORPUS, CC_6_11));
  const doc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const residualOf = (name) => residualSourceText(form.getField(name));

  // A choice field paints the DISPLAY label, not the export value in /V. A
  // policy that reads /V alone sees a caption where the page shows a prompt.
  const courtChooser = residualOf("TYPEOFCOURTDROPDOWN");
  expect(
    "chooser-resolves-to-its-label",
    courtChooser.includes("Choose the court"),
    `TYPEOFCOURTDROPDOWN stores ${JSON.stringify(courtChooser[0])} and paints "Choose the court"`
  );
  expect(
    "caption-field-reports-its-own-text",
    residualOf("fullcountystatementRIGHT").some((t) => t.includes("COUNTY, NEBRASKA")),
    "the venue caption is readable as itself"
  );

  // End to end, on the real source, through the real finalizer.
  const census = JSON.parse(fs.readFileSync(path.join(FAMILY, "field-census.json"), "utf8"));
  const classification = JSON.parse(fs.readFileSync(path.join(FAMILY, "field-classification.json"), "utf8"));
  const record = JSON.parse(fs.readFileSync(path.join(FAMILY, "source-record.json"), "utf8"));
  const UNWRITABLE = new Set(["manual", "unused", "signature", "protected", "court", "clerk", "prosecutor", "attorney", "agency", "service", "notary", "decision"]);
  const { report } = await finalizeOfficialForm({
    sourceBytes,
    expectedSha256: record.sha256,
    census: census.fields,
    facts: { "participant.full_legal_name": "Jordan Avery Reyes", "matter.court": "District Court", "matter.county": "Example County" },
    explicitMappings: {},
    unwritableFields: classification.entries.filter((c) => UNWRITABLE.has(c.class)).map((c) => ({ field: c.name, class: c.class })),
    captionOnly: false,
    title: "NE CC-6-11"
  });

  const suppressed = new Set((report.promptsSuppressed ?? []).map((p) => p.field));
  const preserved = new Set((report.sourceAppearancePreserved ?? []).map((p) => p.field));
  const written = new Set((report.written ?? []).map((w) => w.field));

  expect("placeholder-suppressed", suppressed.has("enter the type of court"),
    "the unwritten caption instruction is not invoked onto the filing");
  expect("choosers-suppressed", suppressed.has("TYPEOFCOURTDROPDOWN") && suppressed.has("DROPDOWNCOUNTY2"),
    "neither chooser prompt survives the flatten");
  expect("venue-caption-preserved", preserved.has("fullcountystatementRIGHT"),
    "COUNTY, NEBRASKA stays on the filing");
  expect("participant-court-type-written", written.has("TYPEOFCOURTRESULTS"),
    "the court type the participant supplied is still written");
  expect("written-field-never-suppressed", ![...written].some((f) => suppressed.has(f)),
    "the write ledger, not a non-empty /V, decides what is participant content");
}

// -------------------------------------------------------------- the mutation

console.log("  mutation");
/** The predicate exactly as it read before the correction: no bracket unwrap. */
const beforeCorrection = (value, options = []) => {
  const t = String(value ?? "").trim();
  if (t === "") return false;
  if (/^[\s_\-–—.·•]+$/.test(t)) return true;
  if (/^(--+|choose|select|pick|click|please\s+(choose|select|pick)|enter\s+the)\b/i.test(t)) return true;
  return options.length > 1 && String(options[0]).trim() === t && /\b(choose|select|pick|none)\b/i.test(t);
};
const mutated = SUPPRESS.filter(([, value]) => beforeCorrection(value) === false).map(([id]) => id);
expect(
  "removing-the-bracket-unwrap-turns-its-canary-red",
  mutated.includes("instruction-court") && mutated.includes("instruction-county"),
  mutated.length
    ? `without it these are missed: ${mutated.join(", ")}`
    : "the unwrap changed nothing, so the canary that covers it proves nothing"
);
expect(
  "the-mutation-does-not-move-the-preserved-canaries",
  PRESERVE.every(([, value]) => beforeCorrection(value) === false),
  "the correction only widens what counts as an instruction; it never reclassifies caption text"
);

if (failures.length) {
  console.error(`FAIL appearance-semantics canaries — ${failures.length} problem(s)`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("OK appearance-semantics canaries — an unwritten field is judged on what it says, a written one on the ledger, and removing the correction turns its canary red");
