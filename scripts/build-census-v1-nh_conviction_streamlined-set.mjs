#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `nh_conviction_streamlined-set`.
 *
 *   node scripts/build-census-v1-nh_conviction_streamlined-set.mjs
 *
 * New Hampshire, annulment of a record of conviction under RSA 651:5 for an
 * offence resolved on or after 01/01/2019, route
 * `obligation:track-only:NH:nh_conviction_streamlined`. Four declared
 * components, four held binaries:
 *
 *   primary-filing-1                 NHJB-3057-DSe (08/06/2019), Petition of
 *                                    Eligibility for Annulment of Record
 *                                    (Conviction).
 *   fee-waiver-motion-3              NHJB-2311-Se (07/01/2018), Motion for
 *                                    Waiver of Filing Fee.
 *   fee-waiver-financial-statement-4 NHJB-2328-DFPe (01/01/2018), Statement of
 *                                    Assets and Liabilities.
 *   criminal-history-request-5       NHJB-2956-FPe (12/18/2017), Criminal
 *                                    History Record Information Release
 *                                    Authorization.
 *
 * THIS BUILD REFUSES, AND THE REASON IS THAT TWO OF THE FOUR CANNOT NAME THE
 * SAME COURT
 *
 * Each form names its court through a drop-down and none of them offers a
 * free-text alternative. Their lists were read out of the four binaries:
 *
 *   NHJB-3057  court.district/su                     43 options: 11 Superior
 *                                                    Courts and 31 Circuit Court
 *                                                    District Divisions.
 *   NHJB-2311  court.superior                        12 options: 11 Superior
 *                                                    Courts and a blank. NO
 *                                                    Circuit Court division.
 *   NHJB-2328  court.district/family/probate - both  74 options: 31 District,
 *                                                    plus Family and Probate
 *                                                    divisions. NO Superior
 *                                                    Court.
 *
 * The intersection of the fee-waiver motion's list and the financial
 * statement's list is EMPTY. There is no New Hampshire court that both of them
 * can name, so for any case whatever - a Superior Court felony annulment or a
 * Circuit Court misdemeanor annulment - one of the two fee-waiver components
 * cannot state the court it is filed in.
 *
 * The form suffixes say why, and they agree: -Se is the SUPERIOR court edition,
 * -DFPe is the DISTRICT, FAMILY and PROBATE edition, and -DSe is the DISTRICT
 * edition of the petition. The family binds a Superior Court fee-waiver motion
 * beside a Circuit Court petition and a Circuit Court financial statement. That
 * is not a formatting problem this build can absorb: filling NHJB-2311 for a
 * Circuit Court annulment delivers the wrong court's motion, and leaving its
 * court blank delivers a motion that does not say where it is filed.
 *
 * A SECOND FINDING, RECORDED BUT NOT THE STOP
 *
 * NHJB-2956 prints "PURPOSE OF RECORD: Housing / Employment /
 * Annulment/Expungement / Other ______". The route's own identity answers it -
 * this is an annulment - but the binary draws no control there at all: no
 * AcroForm widget, no stroked box, nothing but printed words and white space.
 * The only writable control on that line is the "Other" rule, and writing the
 * purpose there would state that the purpose is Other, which is false. This
 * build does not draw a mark beside a printed option, because every write box in
 * this factory's official-form path is the /Rect of the source's own widget and
 * no coordinate is hand-entered; a mark in white space would be the first.
 * Whether the packet may mark it is an owner determination.
 *
 * THINGS MEASURED HERE SO THE NEXT LANE DOES NOT RE-SURVEY
 *
 *   - NHJB-2328 carries three computed totals whose stored value is "0":
 *     12.total, money.total and monthly.total. Delivered unchanged they state
 *     that the filer has no income, no cash and no monthly expenses. A build
 *     must clear them.
 *   - NHJB-2956's drop-down `court.family/probate1 CUSTOM`, which occupies the
 *     "NAME OF PERSON/ENTITY TO RECEIVE RECORD" slot of Section II, carries a
 *     stored value of "1", which is not one of its own options.
 *   - All four binaries carry push buttons - Clear Form, Lock & Save Form, Top
 *     of Page, Form Guide - which must be detached before flattening or their
 *     captions are drawn onto the filed page.
 *
 * Nothing is written. No overlay directory is created or touched, and all nine
 * completeness counters are null rather than zero, because a family that was not
 * built was not measured.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "nh_conviction_streamlined-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/nh/nh-conviction-streamlined-set--official-pdf-fill";
const ROUTE_KEY = "obligation:track-only:NH:nh_conviction_streamlined";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const SOURCES = Object.freeze({
  "NHJB-3057-DSe": {
    sourceId: "official-form:NHJB-3057-DSe", component: "primary_filing",
    path: "STATES/NH/02_PACKET_FORMS/NH__FORM__NHJB-3057__petition-of-eligibility-for-annulment-of-record-conviction__REV-2019-06__EN.pdf",
    sha256: "02310e85cd02e3a8a5ff9c486f6729e85363146ccc07d6e8226e4f1259d1b520", edition: "District division, self-represented, e-file" },
  "NHJB-2311-Se": {
    sourceId: "official-form:NHJB-2311", component: "fee_waiver_motion",
    path: "STATES/NH/04_SUPPORTING_PROCESS/NH__SUPPORT__NHJB-2311__nhjb-2311-motion-for-waiver-of-filing-fee__REV-2018-01__EN.pdf",
    sha256: "f8b5df1366a91a9fd177612c0519f941b8d4f60e1f8f84c2a6c0c064ba7da58e", edition: "Superior court, e-file" },
  "NHJB-2328-DFPe": {
    sourceId: "official-form:NHJB-2328", component: "fee_waiver_financial_statement",
    path: "STATES/NH/04_SUPPORTING_PROCESS/NH__SUPPORT__NHJB-2328__nhjb-2328-statement-of-assets-and-liabilities-individual__REV-UNKNOWN__EN.pdf",
    sha256: "b4384b41efb472951c28b1289e46b05dfcc9463147aa490597f541f5291ce919", edition: "District, Family and Probate divisions, e-file" },
  "NHJB-2956-FPe": {
    sourceId: "official-form:NHJB-2956", component: "criminal_history_request",
    path: "STATES/NH/04_SUPPORTING_PROCESS/NH__SUPPORT__NHJB-2956__nhjb-2956-criminal-record-release-authorization__REV-UNKNOWN__EN.pdf",
    sha256: "c8e5e9fead600ad30a956eac98c43d30d9ca3a3b8b4bc619713e50c83524f569", edition: "Family and Probate divisions, e-file" }
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = {};
  const failures = [];
  for (const [key, want] of Object.entries(SOURCES)) {
    const entry = (index.entries ?? []).find((row) => row.path === want.path);
    if (!entry) { failures.push({ sourceIdentity: want.sourceId, why: `no committed index entry at ${want.path}` }); continue; }
    if (entry.sha256 !== want.sha256) { failures.push({ sourceIdentity: want.sourceId, why: `the committed index pins ${entry.sha256}` }); continue; }
    const absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) { failures.push({ sourceIdentity: want.sourceId, why: `the custody holding ${want.path} is not mounted here` }); continue; }
    const bytes = fs.readFileSync(absolute);
    const digest = sha256(bytes);
    if (digest !== want.sha256) { failures.push({ sourceIdentity: want.sourceId, why: `SHA-256 drift: the corpus binary hashes ${digest}` }); continue; }
    resolved[key] = { ...want, bytes, byteLength: bytes.length, custody: entry.custody };
  }
  return { resolved, failures };
}

const isCourtChooser = (name) => /court/i.test(name);

async function readForm(bytes) {
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const courtChoosers = [];
  const carriedDefaults = [];
  let pushButtons = 0;
  for (const field of form.getFields()) {
    const kind = field.constructor.name;
    const name = field.getName();
    if (kind === "PDFButton") { pushButtons += 1; continue; }
    if (kind === "PDFDropdown") {
      const options = field.getOptions();
      const selected = field.getSelected() ?? [];
      if (isCourtChooser(name)) {
        courtChoosers.push({
          field: name, optionCount: options.length,
          superiorCourts: options.filter((o) => /Superior/i.test(o)),
          circuitDivisions: options.filter((o) => /Circuit/i.test(o)).length,
          districtDivisions: options.filter((o) => /District Division/i.test(o)),
          familyOrProbateDivisions: options.filter((o) => /(Family|Probate) Division/i.test(o)).length,
          freeTextAlternativeOnThisForm: false
        });
      }
      if (selected.length > 0 && String(selected[0]).trim() !== "") {
        carriedDefaults.push({
          field: name, kind: "dropdown", sourceCarriedValue: selected.join("|"),
          isOneOfItsOwnOptions: options.includes(selected[0])
        });
      }
      continue;
    }
    if (kind === "PDFTextField") {
      const value = field.getText();
      if (typeof value === "string" && value.trim() !== "") {
        carriedDefaults.push({ field: name, kind: "text", sourceCarriedValue: value });
      }
    }
  }
  return { pageCount: pdf.getPageCount(), fieldCount: form.getFields().length, pushButtons, courtChoosers, carriedDefaults };
}

async function build() {
  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayDirectoryTouched: false,
      counters: null, countersAreNullBecause: "no family was built, so nothing was measured"
    };
  }

  const measured = {};
  for (const [key, source] of Object.entries(resolved)) {
    measured[key] = { ...(await readForm(source.bytes)), sourceId: source.sourceId, component: source.component, edition: source.edition, sha256: source.sha256 };
  }

  const motionCourts = new Set((measured["NHJB-2311-Se"].courtChoosers[0]?.superiorCourts) ?? []);
  const statementChooser = measured["NHJB-2328-DFPe"].courtChoosers[0];
  const statementSuperior = (statementChooser?.superiorCourts) ?? [];
  const sharedCourts = statementSuperior.filter((court) => motionCourts.has(court));

  const courtListsDisjoint = motionCourts.size > 0 && sharedCourts.length === 0;

  // The petition defines the set of courts this route can be filed in: NHJB-3057-DSe's own
  // chooser offers Superior Courts and Circuit Court District Divisions and nothing else. A
  // component can name the filing court only if its chooser reaches at least one of those two
  // tiers. Computed from the binaries rather than asserted, because "buildable" is a claim about
  // the source, not about intent.
  const tiersOf = (chooser) => ({
    superior: (chooser?.superiorCourts ?? []).length > 0,
    districtDivision: (chooser?.districtDivisions ?? []).length > 0
  });
  const petitionTiers = tiersOf(measured["NHJB-3057-DSe"].courtChoosers[0]);
  const courtNamingReach = {};
  for (const [key, row] of Object.entries(measured)) {
    const chooser = row.courtChoosers[0];
    const tiers = tiersOf(chooser);
    courtNamingReach[key] = {
      component: row.component,
      chooserField: chooser?.field ?? null,
      optionCount: chooser?.optionCount ?? 0,
      offersASuperiorCourt: tiers.superior,
      offersACircuitDistrictDivision: tiers.districtDivision,
      familyOrProbateOnlyOptions: chooser?.familyOrProbateDivisions ?? 0,
      canNameAnyCourtThisRouteFilesIn:
        (tiers.superior && petitionTiers.superior) || (tiers.districtDivision && petitionTiers.districtDivision),
      freeTextCourtAlternative: false
    };
  }
  // A packet is filed in ONE court, so the question is not which component can name SOME court but
  // which components can name THE SAME court. Resolve it per tier: a real case is either a Superior
  // Court annulment or a Circuit Court District Division annulment.
  const byTier = {};
  for (const tier of ["superior", "districtDivision"]) {
    const key = tier === "superior" ? "offersASuperiorCourt" : "offersACircuitDistrictDivision";
    const can = Object.values(courtNamingReach).filter((r) => r[key]).map((r) => r.component);
    const cannot = Object.values(courtNamingReach).filter((r) => !r[key]).map((r) => r.component);
    byTier[tier] = { componentsThatCanNameTheFilingCourt: can, componentsThatCannot: cannot, allFourCanNameIt: cannot.length === 0 };
  }
  const noTierCarriesTheWholePacket = !byTier.superior.allFourCanNameIt && !byTier.districtDivision.allFourCanNameIt;
  // Blocked = cannot name the filing court under EITHER tier, i.e. blocked in every case this route
  // can produce. Buildable = the remainder, and each of those is buildable only in the tier its own
  // chooser reaches, which is why no single packet is buildable at all.
  const componentsThatCanNameTheFilingCourt = Object.values(courtNamingReach)
    .filter((r) => r.canNameAnyCourtThisRouteFilesIn).map((r) => r.component);
  const componentsThatCannotNameTheFilingCourt = Object.values(courtNamingReach)
    .filter((r) => !r.canNameAnyCourtThisRouteFilesIn).map((r) => r.component);

  const purposeOfRecord = {
    form: "NHJB-2956-FPe",
    printedOptions: ["Housing", "Employment", "Annulment/Expungement", "Other ______"],
    controlsDrawnBesideThem: 0,
    acroFormWidgetsOnThatLine: 0,
    theRouteAnswersIt: "Annulment/Expungement",
    whyThisBuildDoesNotMarkIt:
      "the binary draws no control beside the printed options - no widget, no stroked box - so a mark would be ink "
      + "at a hand-entered coordinate in white space, and every write box in this factory's official-form path is "
      + "the /Rect of the source's own widget. Writing the purpose into the \"Other\" rule instead would state that "
      + "the purpose is Other, which is false.",
    ownerDeterminationNeeded: true
  };

  if (courtListsDisjoint) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      routeKeys: [ROUTE_KEY], directory: OUT_REL, overlayDirectoryTouched: false,
      counters: null,
      countersAreNullBecause: "no packet was built, so no counter was measured. A zero here would be a claim about "
        + "a packet that does not exist.",
      failedSourceIdentities: [{
        sourceIdentity: SOURCES["NHJB-2311-Se"].sourceId,
        why: `NHJB-2311-Se names its court through court.superior, whose ${motionCourts.size} options are all `
          + `Superior Courts, and NHJB-2328-DFPe names its court through `
          + `court.district/family/probate - both, whose ${statementChooser?.optionCount ?? 0} options include no `
          + "Superior Court at all. The intersection is empty and neither form offers a free-text court field, so "
          + "no New Hampshire court can be named on both. The suffixes agree: -Se is the Superior court edition and "
          + "-DFPe the District, Family and Probate edition, while the petition this family files is NHJB-3057-DSe, "
          + "the District edition."
      }],
      componentsBuildableInAtLeastOneTierButNotNecessarilyTheSameOne: componentsThatCanNameTheFilingCourt,
      componentsBlockedInEveryTier: componentsThatCannotNameTheFilingCourt,
      whichComponentsCanNameTheSameCourt: byTier,
      noTierCarriesTheWholePacket,
      courtNamingReach,
      courtNamingReachNote:
        "These are computed from each binary's own court chooser against the two tiers the petition itself offers "
        + "(Superior Court and Circuit Court District Division), not asserted. A packet is filed in one court, so "
        + "the controlling number is whichComponentsCanNameTheSameCourt: in the Superior tier the financial "
        + "statement and the criminal-history request cannot name the court, and in the District Division tier the "
        + "fee-waiver motion and the criminal-history request cannot. No tier carries all four. "
        + "NHJB-2956-FPe is worse than the two fee-waiver components and is blocked in EVERY tier: its only "
        + "court/recipient chooser, court.family/probate1 CUSTOM, lists Family and Probate divisions exclusively "
        + "and reaches neither tier this route files in. An earlier revision of this refusal listed "
        + "criminal_history_request as buildable; that was wrong and this is the correction.",
      whatWouldUnblockIt: [
        "binding the Circuit Court fee-waiver motion that matches NHJB-3057-DSe and NHJB-2328-DFPe, rather than the "
          + "Superior Court NHJB-2311-Se, or",
        "binding the Superior Court financial statement that matches NHJB-2311-Se, and scoping this family to "
          + "Superior Court annulments, or",
        "an owner determination that this family's fee-waiver components may be dropped and replaced by a pointer to "
          + "whichever fee-waiver forms the filing court actually uses"
      ],
      measurements: { forms: measured, courtListIntersection: sharedCourts, purposeOfRecord },
      packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }

  return {
    familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
    overlayDirectoryTouched: false, counters: null,
    countersAreNullBecause: "no packet was built",
    why: "the court-list measurement this refusal rests on did not reproduce; re-read the four binaries before building",
    measurements: { forms: measured, courtListIntersection: sharedCourts, purposeOfRecord }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL };
