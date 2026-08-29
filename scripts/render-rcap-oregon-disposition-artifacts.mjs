#!/usr/bin/env node
// Renders the three Oregon disposition-bound configurations onto the court's
// own form.
//
//   node scripts/render-rcap-oregon-disposition-artifacts.mjs
//   node scripts/render-rcap-oregon-disposition-artifacts.mjs --check
//   node scripts/render-rcap-oregon-disposition-artifacts.mjs --mutations
//
// WHAT IS NEW HERE, AND WHAT IS DELIBERATELY REUSED
//
// The route architecture, the packet family, the official source bytes, the
// overlay profile, the fixture people and the factory are all already built.
// Reusing them is the point: the three configurations differ from one another
// in three narrow ways and in nothing else, and anything that rebuilt the
// surrounding machinery would make that difference impossible to see.
//
// The three differences:
//
//   1. WHICH OPTION IS MARKED. Never-charged marks Option 3, acquittal and
//      ordinary dismissal mark Option 2, and Option 1 -- the conviction
//      set-aside -- is left unmarked by all three. The mark is two diagonal
//      strokes struck inside the court's own measured box. No box is drawn and
//      the court's box is never redrawn, thickened or moved.
//
//   2. WHICH FACTS ARE WRITTEN. A participant who was never charged has no
//      court case, so the case-number blank is suppressed rather than filled
//      with something; what identifies their matter instead is the citing or
//      arresting agency, the date of the arrest or citation, and the offence
//      they were cited for. Acquittal and ordinary dismissal both followed a
//      filed case, so both require the court case number.
//
//   3. NOTHING ELSE. Same source, same anchors, same people, same factory.
//
// The existing optionless artifact under
// overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration
// is historical evidence of the lane that measured this form. It is read here
// and never written to.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { protectCategoryOf } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { artifactProvenance } from "./rcap-official-forms/rcap-artifact-provenance.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");

const SOURCE_SHA = "b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071";
const SOURCE_PATH =
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/OR/02_PACKET_FORMS/"
  + "OR__FORM__OR-OJD-ADULT-SET-ASIDE-PACKET__ojd-criminal-set-aside-adult-packet__REV-2026-01__EN.pdf";
const LANE_C = "data/rcap-all50/overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration";
const CONFIGURATIONS = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";
const GEOMETRY = "data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json";
const OUT_ROOT = "data/rcap-all50/overlays/lane-c-candidates/oregon/disposition-configurations";
const REPORT = "data/rcap-all50/oregon-disposition-artifacts.json";
const RENDERER_VERSION = "or-disposition-configurations-v1";
const GENERATED_AT = "2026-08-29T00:00:00.000Z";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

// ---- the world this reads ----------------------------------------------------

const configurations = read(CONFIGURATIONS);
const geometry = read(GEOMETRY);
const profile = read(`${LANE_C}/overlay-profile.json`);
const census = read(`${LANE_C}/field-census.json`);
const canonicalPeople = read(`${LANE_C}/fixtures/canonical.json`).facts;
const boundaryPeople = read(`${LANE_C}/fixtures/boundary.json`).facts;

if (!fs.existsSync(path.join(rootDir, SOURCE_PATH))) {
  console.error("render-rcap-oregon-disposition-artifacts: the official source is not mounted.");
  console.error(`  expected ${SOURCE_PATH}`);
  console.error("  The corpus is git-ignored and behind a private release. Mount it and rerun.");
  process.exit(2);
}
const sourceBytes = fs.readFileSync(path.join(rootDir, SOURCE_PATH));
const actualSha = sha256(sourceBytes);
if (actualSha !== SOURCE_SHA) {
  console.error(`render-rcap-oregon-disposition-artifacts: source drift. expected ${SOURCE_SHA}, read ${actualSha}`);
  process.exit(1);
}

// ---- what the court owns, as geometry ----------------------------------------
//
// The lane-C profile carries no protectedRules, so protection there was decided
// from anchor labels alone. These are derived from the census the same lane
// measured: every censused blank whose printed caption falls under a protect
// category becomes a rule that no write box and no selection mark may land on.
// It is derived rather than authored so that it cannot drift from the census.
const protectedRules = [];
for (const field of census.fields ?? []) {
  const caption = field.effectiveLabel ?? field.leftLabel ?? "";
  const category = protectCategoryOf(caption) || protectCategoryOf(field.name);
  if (!category) continue;
  const rect = field.widgets?.[0]?.rect;
  if (!rect) continue;
  protectedRules.push({
    page: field.page,
    x: +rect.x.toFixed(2),
    y: +(rect.y - 2).toFixed(2),
    endX: +(rect.x + rect.width).toFixed(2),
    caption: caption || null,
    category,
    why: `The censused blank ${field.name} carries a caption in the ${category} category, so nothing this route writes may land on it.`
  });
}

// ---- the option boxes, measured ----------------------------------------------

const optionBoxes = new Map();
for (const option of geometry.options ?? []) {
  if (option.page !== 4 || !option.box || !option.boxIsMeasured) continue;
  optionBoxes.set(option.option, option);
}
for (const need of ["Option 1", "Option 2", "Option 3"]) {
  if (!optionBoxes.has(need)) {
    console.error(`render-rcap-oregon-disposition-artifacts: ${need} has no measured box in ${GEOMETRY}.`);
    process.exit(1);
  }
}

/** The selection instruction for one option, straight off the measurement. */
function selectionFor(optionName) {
  const measured = optionBoxes.get(optionName);
  return {
    label: optionName,
    page: measured.page,
    box: { x0: measured.box.x0, y0: measured.box.y0, x1: measured.box.x1, y1: measured.box.y1 },
    measured: true,
    inset: measured.markPlan?.inset ?? 2
  };
}

// ---- anchors -----------------------------------------------------------------

const baseAnchors = profile.anchors ?? [];
const anchorFor = (label) => baseAnchors.find((a) => a.label === label) ?? null;

// The (1)(c) allegation blanks, from the same census the profile was measured
// against, so no coordinate here is authored.
const slot = (name) => {
  const field = (census.fields ?? []).find((f) => f.name === name);
  if (!field) throw new Error(`census has no slot ${name}`);
  return { page: field.page, rect: field.widgets[0].rect, printedLabel: field.effectiveLabel ?? null };
};

const agencySlot = slot("p4.r537.8.x277.rule");
const arrestDateSlot = slot("p4.r512.2.x134.rule");
// The first data row of the Option 3 table. The rule at y=101.4 is the one
// under it; the row prints a bullet at its left edge, and the printed content
// of the two rows below starts at x=154.44, so the write box begins clear of it
// rather than over it.
const offenceRowSlot = slot("p4.r101.4.x126.rule");
const OFFENCE_ROW_TEXT_X = 156.44;

const NEVER_CHARGED_ANCHORS = [
  {
    label: "Citing/arresting law enforcement agency:",
    page: agencySlot.page,
    writeBox: { x: agencySlot.rect.x, y: agencySlot.rect.y, width: agencySlot.rect.width, height: agencySlot.rect.height },
    fontSize: 10.5,
    factId: "matter.citing_or_arresting_agency"
  },
  {
    label: "Arrest Date:",
    page: arrestDateSlot.page,
    writeBox: { x: arrestDateSlot.rect.x, y: arrestDateSlot.rect.y, width: arrestDateSlot.rect.width, height: arrestDateSlot.rect.height },
    fontSize: 10.5,
    factId: "matter.arrest_date"
  },
  {
    // The cell's subject, not the column heading. The heading reads "Name of
    // Citation/Arrest Offenses" and contains "Name", which is how a movant's
    // name would end up printed as the offence they were cited for; the
    // semantics module refuses that heading outright for exactly that reason.
    label: "Citation/Arrest Offense",
    page: offenceRowSlot.page,
    writeBox: {
      x: OFFENCE_ROW_TEXT_X,
      y: offenceRowSlot.rect.y,
      width: +(offenceRowSlot.rect.x + offenceRowSlot.rect.width - OFFENCE_ROW_TEXT_X).toFixed(2),
      height: offenceRowSlot.rect.height
    },
    fontSize: 10.5,
    factId: "matter.charge",
    printedColumnHeading: "Name of Citation/Arrest Offenses"
  }
];

const EXPLICIT_MAPPINGS = {
  "Citing/arresting law enforcement agency:": "matter.citing_or_arresting_agency",
  "Arrest Date:": "matter.arrest_date",
  "Citation/Arrest Offense": "matter.charge"
};

// ---- the three configurations ------------------------------------------------

const MATTER_FACTS = {
  "or-never-charged-137-225-1-c": {
    canonical: {
      "matter.county": "Lane",
      "matter.citing_or_arresting_agency": "Springfield Police Department",
      "matter.arrest_date": "2019-06-14",
      "matter.charge": "Criminal Trespass in the Second Degree, ORS 164.245"
    },
    boundary: {
      "matter.county": "Lane",
      "matter.citing_or_arresting_agency": "Clackamas County Interagency Task Force and Sheriff's Office",
      "matter.arrest_date": "1998-12-31",
      "matter.charge": "Unlawful Possession of a Controlled Substance in the Second Degree, ORS 475.752(3)(b)"
    }
  },
  // The two (1)(d) configurations must never render to the same bytes. They are
  // different routes selling different things, and an artifact that cannot be
  // told apart from another route's is an artifact that can be delivered for
  // the wrong one, so their fixtures carry different matters at both widths.
  "or-acquittal-137-225-1-d": {
    canonical: { "matter.county": "Lane", "matter.case_number": "21CR40817" },
    boundary: { "matter.county": "Lane", "matter.case_number": "249900123456789-CR-ACQ" }
  },
  "or-ordinary-dismissal-137-225-1-d": {
    canonical: { "matter.county": "Lane", "matter.case_number": "22CR13094" },
    boundary: { "matter.county": "Lane", "matter.case_number": "249900123456789-CR-DIS" }
  }
};

/** The anchors, selections and facts one configuration renders with. */
function planFor(configuration) {
  const id = configuration.specificationId;
  const neverCharged = id === "or-never-charged-137-225-1-c";
  const anchors = [
    ...baseAnchors.filter((a) => (neverCharged ? a.label !== "Case No:" : true)),
    ...(neverCharged ? NEVER_CHARGED_ANCHORS : [])
  ];
  if (!neverCharged && !anchorFor("Case No:")) throw new Error(`${id}: the profile has no Case No: anchor to require`);
  const selections = [selectionFor(configuration.formOption)];
  const unmarked = ["Option 1", "Option 2", "Option 3"].filter((o) => o !== configuration.formOption);
  const facts = (kind) => {
    const people = kind === "canonical" ? canonicalPeople : boundaryPeople;
    const participant = Object.fromEntries(Object.entries(people).filter(([k]) => k.startsWith("participant.")));
    return { ...participant, ...MATTER_FACTS[id][kind] };
  };
  return { neverCharged, anchors, selections, unmarked, facts };
}

// ---- render ------------------------------------------------------------------

const rendered = [];
for (const configuration of configurations.configurations) {
  const id = configuration.specificationId;
  const plan = planFor(configuration);
  const dir = path.join(OUT_ROOT, id);
  const results = {};
  for (const kind of ["canonical", "boundary"]) {
    results[kind] = await finalizeFlatOverlay({
      sourceBytes,
      expectedSha256: SOURCE_SHA,
      anchors: plan.anchors,
      selections: plan.selections,
      protectedRules,
      explicitMappings: EXPLICIT_MAPPINGS,
      facts: plan.facts(kind),
      title: `OR ${configuration.label} — ${configuration.statutoryAuthority}`
    });
  }

  const provenance = await artifactProvenance({
    jurisdiction: "OR",
    documentId: "OR-OJD-ADULT-SET-ASIDE-PACKET",
    sourceSha256: SOURCE_SHA,
    sourceRevision: "REV-2026-01",
    fieldMap: plan.anchors,
    rendererVersion: RENDERER_VERSION,
    generatedAt: GENERATED_AT,
    artifacts: [
      { rel: "fixtures/canonical-filled.pdf", bytes: results.canonical.bytes },
      { rel: "fixtures/boundary-filled.pdf", bytes: results.boundary.bytes }
    ]
  });

  const row = {
    configurationId: id,
    routeKey: configuration.routeKey,
    packetSetId: configuration.packetSetId,
    statutoryAuthority: configuration.statutoryAuthority,
    formOptionMarked: configuration.formOption,
    optionsLeftUnmarked: plan.unmarked,
    caseNumber: plan.neverCharged ? "suppressed" : "required",
    caseNumberBecause: plan.neverCharged
      ? "There is no court case. Paragraph (1)(c) applies only where no accusatory instrument was filed, so the blank is left empty rather than filled with a substitute."
      : "The disposition followed a filed case, so the court case number identifies the matter.",
    // The write box travels with the anchor so that a reader -- and the byte-level
    // verifier -- can ask whether a value fitted the blank it was put in without
    // having to reconstruct the profile.
    anchors: plan.anchors.map((a) => ({ label: a.label, page: a.page, factId: a.factId ?? null, writeBox: a.writeBox })),
    selections: results.canonical.report.selections,
    selectionsRefused: results.canonical.report.selectionsRefused,
    fixtures: {
      canonical: {
        artifact: `${dir}/fixtures/canonical-filled.pdf`,
        sha256: results.canonical.report.outputSha256,
        bytes: results.canonical.report.outputBytes,
        written: results.canonical.report.written,
        refused: results.canonical.report.refused,
        expectedValues: results.canonical.report.expectedValues
      },
      boundary: {
        artifact: `${dir}/fixtures/boundary-filled.pdf`,
        sha256: results.boundary.report.outputSha256,
        bytes: results.boundary.report.outputBytes,
        written: results.boundary.report.written,
        refused: results.boundary.report.refused,
        expectedValues: results.boundary.report.expectedValues
      }
    },
    provenance
  };
  rendered.push(row);

  if (!CHECK && !MUTATIONS) {
    fs.mkdirSync(path.join(rootDir, dir, "fixtures"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, dir, "reports"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, dir, "fixtures/canonical-filled.pdf"), results.canonical.bytes);
    fs.writeFileSync(path.join(rootDir, dir, "fixtures/boundary-filled.pdf"), results.boundary.bytes);
    for (const kind of ["canonical", "boundary"]) {
      fs.writeFileSync(path.join(rootDir, dir, `fixtures/${kind}.json`), `${JSON.stringify({
        schemaVersion: `rcap-or-disposition-${kind}-fixture/v1`,
        configurationId: id,
        facts: plan.facts(kind),
        written: results[kind].report.written,
        refused: results[kind].report.refused,
        unfittable: results[kind].report.unfittable ?? [],
        selections: results[kind].report.selections,
        expectedValues: results[kind].report.expectedValues,
        artifact: `fixtures/${kind}-filled.pdf`,
        outputSha256: results[kind].report.outputSha256
      }, null, 2)}\n`);
    }
    fs.writeFileSync(path.join(rootDir, dir, "reports/populated-fields.json"), `${JSON.stringify(
      results.canonical.report.written.map((w) => ({ field: w.anchor, class: "participant", factId: w.factId })), null, 2)}\n`);
    fs.writeFileSync(path.join(rootDir, dir, "reports/protected-fields.json"), `${JSON.stringify({
      documentOwnership: "participant_completed",
      protectedRuleCount: protectedRules.length,
      refusedByCategory: results.canonical.report.refused.filter((r) => r.category && r.category !== "unfittable"),
      selectionsRefused: results.canonical.report.selectionsRefused
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(rootDir, dir, "reports/selection-proof.json"), `${JSON.stringify({
      schemaVersion: "rcap-or-option-selection-proof/v1",
      configurationId: id,
      marked: results.canonical.report.selections,
      leftUnmarked: plan.unmarked.map((o) => ({
        option: o,
        box: optionBoxes.get(o).box,
        why: o === "Option 1"
          ? "Option 1 is the conviction set-aside. No disposition-bound configuration selects it."
          : `Option ${o.slice(-1)} belongs to another disposition, and marking two options would make the motion self-contradictory.`
      })),
      markingRule: geometry.finding?.markingRule ?? null
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(rootDir, dir, "artifact-provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
  }
}

// ---- mutations ---------------------------------------------------------------

if (MUTATIONS) {
  let bad = 0;
  const must = (name, ok) => { console.log(`  ${ok ? "detected " : "UNDETECTED"} ${name}`); if (!ok) bad += 1; };
  const byId = Object.fromEntries(rendered.map((r) => [r.configurationId, r]));

  must("each configuration marks exactly one option",
    rendered.every((r) => r.selections.length === 1 && r.selectionsRefused.length === 0));
  must("Option 1 is unmarked in all three",
    rendered.every((r) => r.optionsLeftUnmarked.includes("Option 1") && r.selections[0].control !== "Option 1"));
  must("never-charged marks Option 3 and the other two mark Option 2",
    byId["or-never-charged-137-225-1-c"].selections[0].control === "Option 3"
    && byId["or-acquittal-137-225-1-d"].selections[0].control === "Option 2"
    && byId["or-ordinary-dismissal-137-225-1-d"].selections[0].control === "Option 2");
  must("never-charged writes no case number",
    byId["or-never-charged-137-225-1-c"].fixtures.canonical.written.every((w) => w.factId !== "matter.case_number"));
  must("never-charged writes the agency, the event date and the offence",
    ["matter.citing_or_arresting_agency", "matter.arrest_date", "matter.charge"].every((f) =>
      byId["or-never-charged-137-225-1-c"].fixtures.canonical.written.some((w) => w.factId === f)));
  must("acquittal and dismissal both write the court case number",
    ["or-acquittal-137-225-1-d", "or-ordinary-dismissal-137-225-1-d"].every((id) =>
      byId[id].fixtures.canonical.written.some((w) => w.factId === "matter.case_number")));
  must("no two configurations render to the same bytes",
    new Set(rendered.flatMap((r) => [r.fixtures.canonical.sha256, r.fixtures.boundary.sha256])).size === rendered.length * 2);
  must("acquittal and dismissal write no (1)(c) allegation",
    ["or-acquittal-137-225-1-d", "or-ordinary-dismissal-137-225-1-d"].every((id) =>
      byId[id].fixtures.canonical.written.every((w) =>
        !["matter.citing_or_arresting_agency", "matter.arrest_date", "matter.charge"].includes(w.factId))));

  // A mark outside the measured bounds, and a mark on a box that was derived
  // rather than measured, both have to be refused rather than drawn.
  const derived = await finalizeFlatOverlay({
    sourceBytes, expectedSha256: SOURCE_SHA, anchors: [], protectedRules,
    selections: [{ label: "derived", page: 4, box: { x0: 58.2, y0: 393.48, x1: 68.4, y1: 403.68 }, measured: false }],
    facts: {}
  });
  must("a mark on a box that was not measured off the document is refused",
    derived.report.selections.length === 0
    && derived.report.selectionsRefused[0]?.reason === "selection_box_was_not_measured_off_the_document");

  const offPage = await finalizeFlatOverlay({
    sourceBytes, expectedSha256: SOURCE_SHA, anchors: [], protectedRules,
    selections: [{ label: "off page", page: 4, box: { x0: 700, y0: 393.48, x1: 710.2, y1: 403.68 }, measured: true }],
    facts: {}
  });
  must("a mark that falls outside the page is refused",
    offPage.report.selections.length === 0
    && offPage.report.selectionsRefused[0]?.reason === "selection_box_falls_outside_the_page");

  // Every write has to be reachable only through the binder. Naming the offence
  // table by its printed heading must NOT bind, because that heading contains
  // the word "Name" and would print the movant's name as their offence.
  const heading = await finalizeFlatOverlay({
    sourceBytes, expectedSha256: SOURCE_SHA, protectedRules, selections: [],
    anchors: [{ label: "Name of Citation/Arrest Offenses", page: 4,
      writeBox: { x: 156.44, y: 103.6, width: 385.88, height: 12.5 }, fontSize: 10.5 }],
    facts: { "participant.full_legal_name": "Jordan A. Reyes", "matter.charge": "Criminal Trespass II" }
  });
  must("the offence table's printed heading binds nothing",
    heading.report.written.length === 0 && heading.report.refused[0]?.reason === "no_allowlisted_fact_matches");

  // And a sensitive fact must not bind without the caller naming it.
  const unnamed = await finalizeFlatOverlay({
    sourceBytes, expectedSha256: SOURCE_SHA, protectedRules, selections: [],
    anchors: NEVER_CHARGED_ANCHORS,
    facts: MATTER_FACTS["or-never-charged-137-225-1-c"].canonical
  });
  must("the (1)(c) allegation blanks refuse to bind without an explicit mapping",
    unnamed.report.written.length === 0
    && unnamed.report.refused.every((r) => r.reason === "requires_explicit_mapping"));

  console.log("");
  if (bad) { console.error(`FAIL oregon-disposition-artifacts mutations (${bad} undetected)`); process.exit(1); }
  console.log("OK oregon-disposition-artifacts mutations — the option, the facts and the refusals are all route-scoped.");
  process.exit(0);
}

// ---- report ------------------------------------------------------------------

const record = {
  schemaVersion: "rcap-oregon-disposition-artifacts/v1",
  generatedBy: "scripts/render-rcap-oregon-disposition-artifacts.mjs",
  rendererVersion: RENDERER_VERSION,
  source: { sourceId: "OR-OJD-ADULT-SET-ASIDE-PACKET", sha256: SOURCE_SHA, corpusPath: SOURCE_PATH },
  geometryRecord: GEOMETRY,
  reusedFrom: {
    overlayProfile: `${LANE_C}/overlay-profile.json`,
    fieldCensus: `${LANE_C}/field-census.json`,
    fixturePeople: `${LANE_C}/fixtures/`,
    note: "The lane-C family is read for its measurements and its fixture people. It is never written to: its optionless artifact stays historical evidence and is not rebound."
  },
  protectedRules: { count: protectedRules.length, derivedFrom: `${LANE_C}/field-census.json` },
  markingRule: geometry.finding?.markingRule ?? null,
  commerciallyEligible: 0,
  completePacketProven: 0,
  commercialStatus: "closed",
  configurations: rendered
};

const serialized = `${JSON.stringify(record, null, 2)}\n`;
const reportPath = path.join(rootDir, REPORT);
if (CHECK) {
  const current = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "";
  if (current !== serialized) {
    console.error(`${REPORT} is stale. Run: node scripts/render-rcap-oregon-disposition-artifacts.mjs`);
    process.exit(1);
  }
  for (const row of rendered) {
    for (const kind of ["canonical", "boundary"]) {
      const file = path.join(rootDir, row.fixtures[kind].artifact);
      if (!fs.existsSync(file) || sha256(fs.readFileSync(file)) !== row.fixtures[kind].sha256) {
        console.error(`${row.fixtures[kind].artifact} is missing or is not the bytes this run produces.`);
        process.exit(1);
      }
    }
  }
  console.log(`Oregon disposition artifacts current: ${rendered.length} configuration(s), 6 artifact(s).`);
  process.exit(0);
}

fs.writeFileSync(reportPath, serialized);
console.log("Oregon disposition artifacts\n");
for (const row of rendered) {
  console.log(`  ${row.configurationId}`);
  console.log(`    ${row.formOptionMarked} marked, ${row.optionsLeftUnmarked.join(" and ")} left unmarked; case number ${row.caseNumber}`);
  console.log(`    canonical ${row.fixtures.canonical.sha256.slice(0, 12)}…  ${row.fixtures.canonical.written.length} write(s)`);
  console.log(`    boundary  ${row.fixtures.boundary.sha256.slice(0, 12)}…  ${row.fixtures.boundary.written.length} write(s)`);
}
console.log(`\nWritten: ${REPORT}`);
