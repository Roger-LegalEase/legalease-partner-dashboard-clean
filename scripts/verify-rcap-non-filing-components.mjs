#!/usr/bin/env node
// A form the court says not to file must never be filled, and must never be the
// thing a participant files instead of the form that counts.
//
//   node scripts/verify-rcap-non-filing-components.mjs
//   node scripts/verify-rcap-non-filing-components.mjs --mutations
//
// North Carolina publishes Spanish AOC-CR-287, AOC-CR-288 and AOC-CV-226 that
// carry, on their own face, in both languages: THIS FORM IS FOR INFORMATIONAL
// PURPOSES ONLY. DO NOT COMPLETE THIS FORM FOR FILING. USE THE ENGLISH VERSION.
//
// The factory was reporting two of them as artifacts that had failed to render
// participant values. They had not failed — they had correctly refused, and the
// refusal was being counted as a defect. That framing points at one repair:
// make them fill. Filling them is the single thing the issuing court forbids,
// and the participant who would receive the result is the one reading Spanish.
//
// The risk is not abstract. A completed Spanish form looks exactly like the
// filable thing to someone who cannot read the English one, and the person most
// likely to file it is the person the translation exists to help.
//
// So: the Spanish form is a reading aid, the English form is the filing
// document, the packet carries both plus bilingual instructions saying which is
// which, and none of that may quietly invert.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NON_FILING_PATTERNS, nonFilingParticipantInstruction, REFERENCE_ONLY_LABEL } from "./rcap-official-forms/rcap-non-filing-notice.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const DISPOSITIONS = "data/rcap-all50/artifact-dispositions.json";

const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));

/** The English filing form a Spanish companion points at must itself exist. */
function englishCounterpartOf(familyId) {
  return familyId.replace(/-es$/, "-en");
}

function failures(doc) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  const rows = doc.rows ?? [];
  fail(rows.length > 0, "the disposition record names no artifacts");

  const informational = rows.filter((r) => r.disposition === "informational_companion");
  const byFamily = new Map();
  for (const row of rows) {
    if (!byFamily.has(row.familyId)) byFamily.set(row.familyId, []);
    byFamily.get(row.familyId).push(row);
  }

  fail(informational.length > 0, "no informational companion is recorded, yet the corpus contains forms whose printed notice forbids filing");

  for (const row of informational) {
    const info = row.informational;
    const label = `${row.familyId}${row.artifact ? ` (${row.artifact})` : ""}`;

    // 1. no participant value is written to a form the court says not to fill
    fail(
      (row.recordedFailures ?? []).every((f) => f === "participant_values_absent_from_the_artifact_entirely"),
      `${label}: an informational companion carries a failure other than the intentional refusal (${(row.recordedFailures ?? []).join(", ")})`
    );
    fail(info?.countsAsAFileableArtifact === false, `${label}: an informational companion is counted as a fileable artifact`);
    fail(info?.refusalWasCorrect === true, `${label}: the refusal to write participant values is not recorded as correct`);

    // 3. the disposition is backed by the printed source notice, quoted
    fail(info?.basis === "the document's own printed notice", `${label}: the informational disposition cites no source notice`);
    const printed = info?.printedNotice ?? [];
    fail(printed.length > 0, `${label}: the disposition quotes no printed sentence, so it is an assertion rather than evidence`);
    fail(
      printed.some((n) => NON_FILING_PATTERNS.some((p) => p.pattern.test(n.printedText ?? ""))),
      `${label}: the quoted notice does not actually contain a non-filing sentence`
    );
    fail(info?.readFrom?.sha256, `${label}: the notice names no source bytes it was read from`);

    // 2. sanitized, flattened, clean, provenanced — a reference copy is still
    //    a document a participant opens.
    fail(row.flattened === true, `${label}: the reference copy is not flattened`);
    fail(row.activeContentClean === true, `${label}: the reference copy retains active content`);
    fail(row.provenancePresent === true, `${label}: the reference copy carries no provenance sidecar`);

    // 10. bilingual instruction, both languages, saying which form to file
    const instruction = info?.participantInstruction ?? {};
    fail(typeof instruction.en === "string" && instruction.en.length > 0, `${label}: no English participant instruction`);
    fail(typeof instruction.es === "string" && instruction.es.length > 0, `${label}: no Spanish participant instruction`);
    // 9. and it must say NOT to file the Spanish one
    fail(/do not file the spanish form/i.test(instruction.en ?? ""), `${label}: the English instruction does not tell the participant not to file the Spanish form`);
    fail(/no presente el formulario en espa[ñn]ol/i.test(instruction.es ?? ""), `${label}: the Spanish instruction does not tell the participant not to file the Spanish form`);
    // 8. and it must name the English form as the one to file
    fail(/file the completed english/i.test(instruction.en ?? ""), `${label}: the English instruction does not name the English form as the filing document`);
    fail(/presente el formulario en ingl[ée]s/i.test(instruction.es ?? ""), `${label}: the Spanish instruction does not name the English form as the filing document`);

    // 12. the two components must not be confusable
    fail(info?.participantLabel?.en === REFERENCE_ONLY_LABEL.en, `${label}: the participant-facing label is not the reference-only label`);
    fail(info?.participantLabel?.es === REFERENCE_ONLY_LABEL.es, `${label}: the Spanish participant-facing label is missing`);

    // 4 and 5. the English filing form must exist and must have finalized. A
    //          reference copy never substitutes for it.
    const english = englishCounterpartOf(row.familyId);
    const counterpart = byFamily.get(english) ?? [];
    fail(counterpart.length > 0, `${label}: the English filing form ${english} is absent, so the packet has a reading aid and nothing to file`);
    fail(
      counterpart.length === 0 || counterpart.some((r) => r.disposition === "filing_artifact" && r.finalized),
      `${label}: ${english} did not finalize as a filing artifact, so the packet is not deliverable`
    );
    fail(
      counterpart.every((r) => r.disposition !== "informational_companion"),
      `${label}: ${english} is itself recorded as informational, so nothing in this packet is fileable`
    );
  }

  // 11. an informational component never counts toward fileable finalization
  const totals = doc.totals ?? {};
  const expected = rows.filter((r) => r.disposition !== "informational_companion");
  fail(
    totals.fileableArtifactsFinalized === expected.filter((r) => r.finalized).length,
    `fileableArtifactsFinalized (${totals.fileableArtifactsFinalized}) does not equal the artifacts that actually finalized (${expected.filter((r) => r.finalized).length})`
  );
  fail(
    totals.informationalComponentsCorrectlyRefused === informational.length,
    `informationalComponentsCorrectlyRefused (${totals.informationalComponentsCorrectlyRefused}) does not equal the informational rows (${informational.length})`
  );
  fail(totals.unresolvedArtifactFailures === 0, `${totals.unresolvedArtifactFailures} artifact failure(s) remain unresolved`);
  fail(
    totals.artifactDispositionsComplete === rows.length,
    `the record reports ${totals.artifactDispositionsComplete} dispositions against ${rows.length} rows`
  );
  fail(
    totals.fileableArtifactsFinalized !== totals.artifactDispositionsComplete,
    "every artifact is reported as fileable, which erases the distinction this record exists to make"
  );

  return out;
}

const doc = readJson(DISPOSITIONS);

if (MUTATIONS) {
  const base = failures(doc).length;
  const clone = () => JSON.parse(JSON.stringify(doc));
  const informationalIndex = (d) => d.rows.findIndex((r) => r.disposition === "informational_companion");

  const mutations = [
    ["a participant value is written to the Spanish form", (d) => {
      const i = informationalIndex(d);
      d.rows[i].recordedFailures = [];
      d.rows[i].informational.refusalWasCorrect = false;
    }],
    ["the Spanish form is marked fileable", (d) => {
      const i = informationalIndex(d);
      d.rows[i].informational.countsAsAFileableArtifact = true;
    }],
    ["the informational notice is removed", (d) => {
      const i = informationalIndex(d);
      d.rows[i].informational.printedNotice = [];
    }],
    ["the English filing form is omitted", (d) => {
      const i = informationalIndex(d);
      const english = englishCounterpartOf(d.rows[i].familyId);
      d.rows = d.rows.filter((r) => r.familyId !== english);
      d.totals.artifactDispositionsComplete = d.rows.length;
      d.totals.fileableArtifactsFinalized = d.rows.filter((r) => r.disposition !== "informational_companion" && r.finalized).length;
    }],
    ["the checklist tells the participant to file the Spanish form", (d) => {
      const i = informationalIndex(d);
      d.rows[i].informational.participantInstruction = {
        en: "File the completed Spanish form.",
        es: "Presente el formulario en español debidamente completado."
      };
    }],
    ["the Spanish reference form satisfies the English filing-form requirement", (d) => {
      const i = informationalIndex(d);
      const english = englishCounterpartOf(d.rows[i].familyId);
      for (const row of d.rows) if (row.familyId === english) row.disposition = "informational_companion";
    }],
    ["a reference artifact retains active content", (d) => {
      const i = informationalIndex(d);
      d.rows[i].activeContentClean = false;
    }],
    ["every artifact is reported as fileable", (d) => {
      d.totals.fileableArtifactsFinalized = d.totals.artifactDispositionsComplete;
    }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const d = clone();
    mutate(d);
    const caught = failures(d).length > base;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-non-filing-components FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of filling, filing or losing a court-declared non-filing form is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures(doc);
if (problems.length > 0) {
  console.error(`verify-rcap-non-filing-components FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 30)) console.error(` - ${problem}`);
  process.exit(1);
}
const t = doc.totals;
console.log(
  `non-filing components: ${t.informationalComponentsCorrectlyRefused} informational companion(s) correctly refused, ` +
  `${t.fileableArtifactsFinalized} fileable artifact(s) finalized, ${t.unresolvedArtifactFailures} unresolved, ` +
  `${t.artifactDispositionsComplete} disposition(s) complete.`
);
console.log("Each Spanish companion quotes the court's own printed notice, carries bilingual instructions naming the English form as the one to file, and its English counterpart finalized as the filing document.");
