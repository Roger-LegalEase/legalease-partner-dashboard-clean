#!/usr/bin/env node

/**
 * The North Dakota source-binding record is held to the bytes it binds.
 *
 * `2026-09-21-nd-source-binding-and-vehicle-map.json` closes the SFN-61663
 * provenance defect by saying: these exact bytes, at this exact hash, in this
 * named corpus release, print this form number and this issuer. Every part of
 * that is checkable, and the whole value of the record is that it was checked
 * rather than asserted — the defect it closes was precisely a form number with
 * no bytes behind it.
 *
 * WHAT IS CHECKED WHERE
 *
 * The memo is committed to this repository, so the track identities and the
 * per-route output strategies are checked always. The form and the acquisition
 * manifest live in the private source library, so those checks skip with a
 * reason where it is absent. A skip is reported as a skip: a control that could
 * not see the bytes has not verified them, and saying so is the difference
 * between this record and the defect it replaces.
 *
 * THE BINDING IS DELIBERATELY NARROW
 *
 * One form, one route. The memo carries a second pardon track at SFN 14859
 * whose form the library does not hold, and the Recovery Pool carries a
 * complete and inviting component set for a different remedy entirely. Both are
 * exactly the kind of thing that gets borrowed because it is nearby, so the
 * record's refusals about them are checked too.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RECORD = "data/record-clearing/legal-decisions/2026-09-21-nd-source-binding-and-vehicle-map.json";
const MEMO = "data/record-clearing/legal-design-intake/ND.memo.json";
const CORPUS_CANDIDATES = [
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "../legalease-partner-dashboard-clean/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"
];

const record = JSON.parse(fs.readFileSync(path.join(ROOT, RECORD), "utf8"));
const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO), "utf8"));

const problems = [];
const skipped = [];
let checked = 0;
const check = (ok, message) => { checked += 1; if (!ok) problems.push(message); };

const sfn = record.sfn61663 ?? {};
const bytes = sfn.theBytes ?? {};
const identifies = sfn.theFormIdentifiesItself ?? {};

// --- the record must not quietly stop binding, or widen what it binds --------
check(sfn.status === "RESOLVED from bytes already held",
  "the SFN-61663 status no longer claims resolution from bytes already held");
check(sfn.boundTo?.route === "ND:marijuana-specific-summary-pardon-or-sealing-relief",
  "SFN-61663 is no longer bound to the marijuana summary-pardon route");
check(sfn.boundTo?.memoTrack === "nd-summary-marijuana-pardon",
  "SFN-61663 is no longer bound to the nd-summary-marijuana-pardon track");
check(/not bound to any other/i.test(String(sfn.boundTo?.andNothingElse ?? "")),
  "the record no longer refuses to bind SFN-61663 to any other North Dakota route");
check(/NOT the vehicle for any of the five/i.test(String(record.corpusFindings?.theAr41SetIsNotForTheseRoutes?.doNotBind ?? "")),
  "the record no longer refuses to bind the AR 41 component set to the five routes in scope");
// A missing source must never read as permission to draft.
check(/missing source is not permission to compose/i.test(String((record.whatRemains ?? []).join(" "))),
  "the record no longer states that a missing source is not permission to compose a pleading");
for (const [field, expected] of [["opensAnyRoute", false], ["isCounselApproval", false], ["createsOutputApproval", false], ["commercialRoutesOpened", 0]]) {
  check(record[field] === expected, `${field} is no longer ${JSON.stringify(expected)}`);
}

// --- the memo still says what the vehicle map reports it says ---------------
const tracks = Array.isArray(memo.tracks) ? memo.tracks : [];
const trackById = id => tracks.find(entry => (entry.id ?? entry.trackId ?? entry.shortName) === id) ?? null;
check(String(trackById("nd-summary-marijuana-pardon")?.legalName ?? "").includes("SFN 61663"),
  "the memo's nd-summary-marijuana-pardon track no longer names SFN 61663; the binding rests on that identity");
check(trackById("nd-summary-marijuana-pardon")?.outputStrategy === "official_pdf_fill",
  "the memo no longer gives the marijuana pardon track an official_pdf_fill vehicle");
// The regular pardon is a different form this library does not hold.
check(String(trackById("nd-regular-pardon")?.legalName ?? "").includes("SFN 14859"),
  "the memo's separate regular-pardon track at SFN 14859 is gone; the record's refusal to conflate the two pardons depends on it");
for (const entry of record.vehicleMap?.routes ?? []) {
  const ids = entry.memoTrack ? [entry.memoTrack] : (entry.memoTracks ?? []);
  for (const id of ids) {
    check(Boolean(trackById(id)), `the vehicle map cites memo track ${id}, which the memo no longer carries`);
  }
  if (entry.memoTrack && entry.memoOutputStrategy) {
    check(trackById(entry.memoTrack)?.outputStrategy === entry.memoOutputStrategy,
      `the vehicle map reports ${entry.memoTrack} as ${entry.memoOutputStrategy}, which is not what the memo says`);
  }
}

// --- the bytes, where they can be reached -----------------------------------
const corpusRoot = CORPUS_CANDIDATES
  .map(candidate => path.resolve(ROOT, candidate))
  .find(candidate => fs.existsSync(path.join(candidate, bytes.archivePath ?? "")));

if (!corpusRoot) {
  skipped.push("the SFN-61663 bytes could not be hashed: the private source library is not in this checkout");
} else {
  const formPath = path.join(corpusRoot, bytes.archivePath);
  const actual = createHash("sha256").update(fs.readFileSync(formPath)).digest("hex");
  check(actual === bytes.sha256,
    `the bound form no longer hashes to the recorded value (recorded ${bytes.sha256}, actual ${actual}); re-read the form and re-derive the binding rather than re-pointing the hash`);

  // The whole point of the binding: the document says its own number.
  let text = "";
  try {
    const { execFileSync } = await import("node:child_process");
    text = execFileSync("pdftotext", ["-layout", formPath, "-"], { encoding: "utf8", maxBuffer: 1 << 24 });
  } catch {
    skipped.push("the form's printed self-identification could not be checked: pdftotext is unavailable");
  }
  if (text) {
    const flat = text.replace(/\s+/g, " ");
    check(flat.includes(identifies.printedFormNumber ?? "\u0000"),
      "the form does not print the recorded form number; the binding rests on the document identifying itself rather than on its filename");
    check(flat.includes("PARDON ELIGIBLE") && flat.includes("MARIJUANA OFFENSES"),
      "the form no longer identifies itself as the application to pardon eligible marijuana offenses");
    const warning = record.sfn61663?.whatTheFormSaysAboutItsOwnRelief?.printedText ?? "";
    check(warning.length > 0 && flat.includes(warning.replace(/\s+/g, " ")),
      "the form's own statement that a pardon will not expunge the criminal history record is not verbatim in the form; that statement is why the relief question is open");
  }

  // The manifest must agree with the bytes rather than the record standing alone.
  const manifestPath = path.join(corpusRoot, "STATES/ND/STATE_MANIFEST.csv");
  if (!fs.existsSync(manifestPath)) {
    skipped.push("the acquisition manifest could not be checked: STATES/ND/STATE_MANIFEST.csv is not present");
  } else {
    check(fs.readFileSync(manifestPath, "utf8").includes(bytes.sha256),
      "the North Dakota acquisition manifest no longer declares the bound sha256");
  }
}

for (const note of skipped) console.log(`  skipped  ${note}`);
for (const problem of problems) console.error(`  FAIL  ${problem}`);

if (problems.length) {
  console.error(`\nFAIL verify-nd-source-binding-record — ${problems.length} of ${checked} checks failed`);
  process.exit(1);
}
console.log(`OK verify-nd-source-binding-record — ${checked} checks${skipped.length ? `, ${skipped.length} skipped` : ""}; SFN 61663 is bound to bytes that identify themselves`);
