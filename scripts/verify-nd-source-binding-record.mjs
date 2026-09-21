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
// Proving which bytes a form is, applying that binding to the Grade-A
// authority, and closing the blocker are three acts. This record performs the
// first only, and the gap between "proven" and "closed" is exactly where a
// status overstatement lives, so the three are checked separately and the
// record is required to keep saying that the last two have not happened.
check(sfn.status?.sourceIdentifiedAndProvenanceProven === "YES",
  "the SFN-61663 provenance is no longer recorded as proven");
check(sfn.status?.authoritativeSourceBindingApplied === "NO",
  "the record now claims the Grade-A source binding has been applied; if that is true it must be proven by a regenerated projection, not asserted here");
check(sfn.status?.gradeABlockerClosed === "NO",
  "the record now claims the Grade-A blocker is closed; closure is proven by the five official_sources entries disappearing from the regenerated projection, not by this record");
// The key name supplies the refusal, so match what the value asserts -- that
// the projection is generated and editing it by hand would defeat the point.
check(/editing it by hand/i.test(String(sfn.howToActuallyCloseIt?.doNotHandEditTheProjection ?? "")),
  "the record no longer explains why the generated projection may not be edited by hand to close the blocker");

// And the authority must still agree that the blocker is open. If the five
// entries have gone, this record's own status text is stale and must be
// revisited deliberately rather than left behind as a false negative.
const projectionPath = path.join(ROOT, "data/rcap-grade-a/fulfillment-authority-projection.json");
if (!fs.existsSync(projectionPath)) {
  skipped.push("the authority projection is not present, so the open/closed status could not be cross-checked");
} else {
  const projection = JSON.parse(fs.readFileSync(projectionPath, "utf8"));
  const route = (projection.routes ?? []).find(entry => entry.routeId === sfn.boundTo?.route) ?? null;
  const stillOpen = (route?.missingProof ?? []).filter(entry => /SFN-61663/.test(entry)).length;
  check(route !== null, "the bound route is no longer in the authority projection");
  check(stillOpen > 0,
    "the projection no longer lists SFN-61663 source gaps for this route, so the binding appears to have been applied; update this record's status from NO to the proven closure rather than leaving it stale");
}
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

// --- the DUI vehicle determination is held to its guide ----------------------
// That record concludes no official form controls, which is the conclusion most
// at risk of being reached lazily: "we could not find a form" and "the body that
// publishes the forms says it has none" look alike in a summary and are not
// alike at all. So the sentences carrying the second are checked verbatim, and
// the record is required to keep distinguishing the two.
const DUI_RECORD = "data/record-clearing/legal-decisions/2026-09-21-nd-dui-sealing-vehicle-determination.json";
const duiPath = path.join(ROOT, DUI_RECORD);
if (!fs.existsSync(duiPath)) {
  skipped.push("the DUI vehicle determination record is not present");
} else {
  const dui = JSON.parse(fs.readFileSync(duiPath, "utf8"));
  check(dui.vehicleDetermination?.vehicle === "custom_pleading",
    "the DUI record no longer determines a custom pleading");
  check(/affirmative statement about what the guidance provides, not merely an absence/i
    .test(String(dui.whyNoOfficialFormControls?.["theDistinctionThisRests On"] ?? "")),
    "the DUI record no longer distinguishes a form nobody found from guidance that prescribes none");
  // And it must not overreach in the other direction either. Guidance that
  // prescribes no form is enough to choose a composed pleading; it is not a
  // statewide negative, and a local court form would still control if found.
  check(/does not claim the Self Help Center is the publisher of every possible/i
    .test(String(dui.whyNoOfficialFormControls?.whatThisDoesNotClaim ?? "")),
    "the DUI record no longer disclaims asserting a statewide negative about North Dakota forms");
  check(/this determination yields to it/i.test(String(dui.vehicleDetermination?.scopeOfTheDetermination ?? "")),
    "the DUI record no longer yields to a local court form if one is found");
  check(dui.statusOfThisSource?.sourceBoundIntoGradeAAuthority === "NO" && dui.statusOfThisSource?.gradeABlockerClosed === "NO",
    "the DUI record now claims a Grade-A binding or closure it has not performed");
  check(dui.opensAnyRoute === false && dui.commercialRoutesOpened === 0,
    "the DUI record claims to open a route");
  // Unknowns must stay unknown: this is where invented procedure would appear.
  const unknown = dui.documentComponents?.notStatedBySource?.unknown ?? [];
  for (const dimension of ["service and notice", "copy requirements", "filing fee or waiver"]) {
    check(unknown.includes(dimension), `the DUI record no longer records "${dimension}" as unstated by its source`);
  }

  const guidePath = path.join(
    "/home/user/legalease-partner-dashboard-clean/private/source-imports",
    "Nationwide_Recovery_Pool_2026-09-02/LegalEase North Dakota/Sealing-DUI-Records-Research-Guide.pdf"
  );
  if (!fs.existsSync(guidePath)) {
    skipped.push("the DUI guide's quotes could not be checked: the research guide is not in this checkout");
  } else {
    const actual = createHash("sha256").update(fs.readFileSync(guidePath)).digest("hex");
    check(actual === dui.sourceRead?.sha256, "the DUI guide no longer hashes to the recorded value");
    let guideText = "";
    try {
      const { execFileSync } = await import("node:child_process");
      guideText = execFileSync("pdftotext", ["-layout", guidePath, "-"], { encoding: "utf8", maxBuffer: 1 << 24 });
    } catch { skipped.push("the DUI guide's quotes could not be compared: pdftotext is unavailable"); }
    if (guideText) {
      const flat = guideText.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ");
      const quotes = [];
      const walk = node => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== "object") return;
        for (const [key, value] of Object.entries(node)) {
          if ((key === "quote" || key === "andAlso") && typeof value === "string") quotes.push(value);
          else walk(value);
        }
      };
      walk(dui);
      check(quotes.length >= 10, "the DUI record carries fewer quotes than the determination rests on");
      for (const quote of quotes) {
        check(flat.includes(quote.replace(/\s+/g, " ").trim()),
          `a DUI quote is not verbatim in the guide: ${JSON.stringify(quote.slice(0, 70))}`);
      }
    }
  }
}

for (const note of skipped) console.log(`  skipped  ${note}`);
for (const problem of problems) console.error(`  FAIL  ${problem}`);

if (problems.length) {
  console.error(`\nFAIL verify-nd-source-binding-record — ${problems.length} of ${checked} checks failed`);
  process.exit(1);
}
console.log(`OK verify-nd-source-binding-record — ${checked} checks${skipped.length ? `, ${skipped.length} skipped` : ""}; SFN 61663 is bound to bytes that identify themselves`);
