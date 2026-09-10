#!/usr/bin/env node
/**
 * Route-obligation census v1 — packet family `wv_nc_acquittal_dismissal-set`.
 *
 *   node scripts/build-census-v1-wv_nc_acquittal_dismissal-set.mjs
 *
 * West Virginia, no-conviction expungement under W. Va. Code § 61-11-25 as
 * amended by H.B. 4399 (2024). Route
 * `obligation:track-pathway:WV:wv_nc_acquittal_dismissal:no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication`.
 *
 * One bound official form:
 *
 *   SCA-C903 Rev. 04/2010  Motion for Expungement of Criminal Records Due to
 *                          Acquittal or Dismissal for Reasons Other than Entry
 *                          of a Plea.
 *
 * THE ASSIGNED ACTION, AND WHAT IT RAN INTO
 *
 * The owner's recorded next executable action for this family is: "Map the
 * exact disposition fact to the correct SCA-C903 ground, refuse unclear
 * records, and release the official-form build." This script performs that
 * mapping against the bound bytes and reports what it found. It found that one
 * of the two dispositions this family is named for HAS NO GROUND ON THE FORM.
 *
 * THE DISPOSITIONS THIS ROUTE REQUIRES
 *
 * src/lib/legal-authority/routes/national-report-batch-c.json, route
 * `WV:no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication`,
 * states its first required fact verbatim as:
 *
 *   "Did the case end in acquittal, in dismissal, or in a dismissal following
 *    diversion or deferred adjudication?"
 *
 * The compiled West Virginia profile, src/lib/rcap-engine/compiled/profiles/
 * WV-west-virginia.json, carries `likely_eligible_acquittal_60_days` and
 * `likely_eligible_dismissal_60_days` as two separate eligibility signals, and
 * states the statutory rule as "A person charged under West Virginia law who
 * was found not guilty OR whose charges were dismissed…". The packet-set
 * manifest asks the participant, verbatim, "On what date were you found not
 * guilty, or on what date were the charges dismissed?" Every controlling record
 * in this repository treats acquittal and dismissal as two distinct facts.
 *
 * WHAT SCA-C903 ACTUALLY OFFERS TO ELECT
 *
 * Nothing. The document is a flat, AES-256-encrypted, three-page PDF with no
 * AcroForm, no annotations and no selection control of any kind — no checkbox,
 * no radio group, no option list. Its only three enumerated alternatives are on
 * page 3 and are SERVICE METHODS (First Class Mail, Hand Delivery, Certified
 * Mail – Return Receipt), not grounds.
 *
 * So the "ground" a disposition maps to is a recital in the body, and there is
 * exactly one disposition recital in the whole document — paragraph 2:
 *
 *   "That on ____________ (Date of Dismissal), this matter was dismissed by
 *    the ____________ Court of ____________ County, due to ____________
 *    (Reason for Dismissal.)"
 *
 * reinforced by paragraph 4, which is pre-printed with no blank at all:
 *
 *   "That 60 days have elapsed since the above referenced dismissal and that
 *    same dismissal was not in exchange for a guilty plea to another offense."
 *
 * THE MEASUREMENT THAT DECIDES THIS FAMILY
 *
 * Re-read from the pinned binary on every run: the word "acquittal" occurs five
 * times in SCA-C903 and NOT ONCE in an operative allegation. Every occurrence is
 * the document naming itself — once in the page-1 title block, once per page in
 * the three footers, and once in the certificate of service describing the
 * document being served. The words "not guilty" and "verdict" do not appear in
 * the document at all.
 *
 * A movant who was ACQUITTED therefore has no ground to elect. The only
 * candidate is paragraph 2, and paragraph 2 states that the matter was
 * dismissed by a court, on a "(Date of Dismissal)", for a "(Reason for
 * Dismissal.)" — three blanks the Supreme Court of Appeals printed as dismissal
 * blanks. Writing an acquittal into them is writing a value into a blank by a
 * label other than the one printed beside it, on a pleading the movant signs
 * pro se, and paragraph 4 then swears that sixty days have elapsed since "the
 * above referenced dismissal" — a dismissal that did not happen.
 *
 * That is not a formatting problem and it is not a near miss. It is the exact
 * case the assignment names: a disposition fact in the controlling record that
 * maps to no ground on the form. The instruction is to refuse it rather than
 * select the nearest, and refusing it is refusing half of what this family is.
 * Narrowing a family's scope is an owner decision, not a build step, so the
 * family stops here rather than quietly shipping as a dismissal-only packet
 * under a name that promises acquittal.
 *
 * WHAT IS *NOT* THE REASON THIS STOPS
 *
 *   - Custody. The bound digest resolves byte-exact under the Master Library.
 *   - Encryption. pdf-lib cannot open the binary (AES-256, R6/V5, empty user
 *     password) and the committed corpus index records it as "unreadable" with
 *     that loadError. Poppler and pikepdf both open it: three US-Letter pages,
 *     no AcroForm, no annotations. It is a flat encrypted PDF, not a corrupt
 *     one, and it could be decrypted with the empty user password and overlaid.
 *   - The pending artifact_legal_review gate. It is real and it is recorded
 *     below, but the route contract's own note says SCA-C903's "operative
 *     paragraphs still track current subsection (a) for a straight acquittal or
 *     dismissal, so it is usable there with a supplement". That gate blocks
 *     approval, not building.
 *
 * NOTHING IS WRITTEN. No overlay directory is created or touched, and all nine
 * completeness counters are null rather than zero: a family that was not built
 * was not measured, and a zero would be a claim about a packet that does not
 * exist.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);

const FAMILY_ID = "wv_nc_acquittal_dismissal-set";
const ROUTE_KEY = "obligation:track-pathway:WV:wv_nc_acquittal_dismissal:"
  + "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication";
const OUT_REL = "data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const ROUTE_CONTRACT = "src/lib/legal-authority/routes/national-report-batch-c.json";
const COMPILED_PROFILE = "src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";

const SOURCE = Object.freeze({
  sourceId: "official-form:SCA-C903",
  formNumber: "SCA-C903",
  revision: "REV-2010-04",
  path: "STATES/WV/02_PACKET_FORMS/"
    + "WV__FORM__SCA-C903__sca-c903-motion-for-expungement-after-acquittal-or-dismissal__REV-2010-04__EN.pdf",
  sha256: "bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878"
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const corpusRoot = () => process.env.MASTER_LIBRARY_SOURCE_DIR
  ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";

/** Bind the one declared source by content digest. */
function bindSource() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: corpusRoot() });
  const entry = (index.entries ?? []).find((row) => row.path === SOURCE.path);
  if (!entry) return { bound: false, why: `no committed corpus-index entry at ${SOURCE.path}` };
  if (entry.sha256 !== SOURCE.sha256) return { bound: false, why: `the committed index pins ${entry.sha256}` };
  const absolute = resolver.resolve(entry);
  if (!absolute || !fs.existsSync(absolute)) {
    return { bound: false, why: `the custody holding ${SOURCE.path} is not mounted here` };
  }
  const bytes = fs.readFileSync(absolute);
  const digest = sha256(bytes);
  if (digest !== SOURCE.sha256) return { bound: false, why: `SHA-256 drift: the binary hashes ${digest}` };
  return { bound: true, absolute, byteLength: bytes.length, sha256: digest, indexEntry: entry };
}

/** The document's own printed text, out of the pinned bytes. */
function printedTextOf(absolute) {
  const run = spawnSync("pdftotext", ["-layout", absolute, "-"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (run.error || run.status !== 0 || typeof run.stdout !== "string" || run.stdout.length === 0) {
    return { read: false, why: run.error ? String(run.error.message) : `pdftotext exited ${run.status}` };
  }
  const version = spawnSync("pdftotext", ["-v"], { encoding: "utf8" });
  return {
    read: true,
    text: run.stdout,
    readBy: "poppler pdftotext -layout",
    readerVersion: (String(version.stderr ?? version.stdout ?? "").match(/version\s+([\d.]+)/) ?? [])[1] ?? null
  };
}

/**
 * Where "acquittal" occurs, and whether any occurrence is an ALLEGATION.
 *
 * A ground is something a movant alleges. The document naming itself in a
 * title, a running footer, or a certificate describing the paper being served
 * is not an allegation, so each occurrence is classified rather than counted.
 */
function acquittalOccurrences(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!/acquittal/i.test(line)) return;
    const trimmed = line.trim();
    let role = "unclassified";
    if (/^SCA-C903 Rev\./i.test(trimmed)) role = "running_footer_naming_the_document";
    else if (/^(MOTION FOR EXPUNGEMENT|DUE TO ACQUITTAL)/i.test(trimmed)) role = "title_block_naming_the_document";
    else if (/Expungement of Criminal Records Due to Acquittal/i.test(trimmed)) {
      role = "certificate_of_service_naming_the_document_served";
    }
    out.push({ line: i + 1, role, text: trimmed });
  });
  return out;
}

/**
 * Every candidate ground the document offers for a disposition fact.
 *
 * Read as recitals, because the document has no selection control to elect.
 */
function candidateGroundsOf(text) {
  const has = (re) => re.test(text);
  return {
    selectionControlsInTheDocument: {
      acroFormFields: 0,
      annotations: 0,
      note: "the only enumerated alternatives in the document are the three service methods on page 3 "
        + "(First Class Mail, Hand Delivery, Certified Mail – Return Receipt), which are methods of "
        + "service and not grounds for relief"
    },
    dispositionRecitals: [
      {
        id: "paragraph-2-dismissal-recital",
        page: 1,
        printed: "That on ____________ (Date of Dismissal), this matter was dismissed by the ____________ "
          + "Court of ____________ County, due to ____________ (Reason for Dismissal.)",
        blanksItPrints: ["(Date of Dismissal)", "(Type of Court: Municipal, Magistrate, Circuit)",
          "County", "(Reason for Dismissal.)"],
        statesADismissal: has(/this matter was dismissed by the/i),
        statesAnAcquittal: false
      },
      {
        id: "paragraph-4-sixty-day-recital",
        page: 1,
        printed: "That 60 days have elapsed since the above referenced dismissal and that same dismissal "
          + "was not in exchange for a guilty plea to another offense.",
        blanksItPrints: [],
        statesADismissal: has(/60 days have elapsed since the above referenced dismissal/i),
        statesAnAcquittal: false
      }
    ],
    wordsThatWouldCarryAnAcquittal: {
      acquittalInAnAllegation: false,
      notGuilty: has(/not guilty/i),
      verdict: has(/verdict/i),
      judgmentOfAcquittal: has(/judgment of acquittal/i)
    }
  };
}

/** The disposition-to-ground mapping this assignment asked for. */
function mapDispositionsToGrounds(grounds) {
  const dismissalRecital = grounds.dispositionRecitals.find((r) => r.id === "paragraph-2-dismissal-recital");
  const rows = [
    {
      dispositionFact: "the charges were dismissed (not in exchange for a guilty plea to another offence)",
      whereTheRecordStatesIt: [
        `${ROUTE_CONTRACT} requiredFacts[0], second branch: "Did the case end in acquittal, in dismissal, or in a dismissal following diversion or deferred adjudication?"`,
        `${COMPILED_PROFILE} eligibility signal likely_eligible_dismissal_60_days`,
        `${PACKET_SET_MANIFESTS} packetSetId wv_nc_acquittal_dismissal-set, confirm_answer: "On what date were you found not guilty, or on what date were the charges dismissed?"`
      ],
      candidateGroundsOnTheForm: [dismissalRecital?.id].filter(Boolean),
      groundElected: "paragraph-2-dismissal-recital",
      mapped: dismissalRecital?.statesADismissal === true,
      why: "paragraph 2 recites a dismissal by a named court on a named date for a stated reason, and "
        + "paragraph 4 recites the 60-day interval since it. Both are the disposition this branch is."
    },
    {
      dispositionFact: "the movant was acquitted — found not guilty",
      whereTheRecordStatesIt: [
        `${ROUTE_CONTRACT} requiredFacts[0], FIRST branch: "Did the case end in acquittal, in dismissal, or in a dismissal following diversion or deferred adjudication?"`,
        `${COMPILED_PROFILE} eligibility signal likely_eligible_acquittal_60_days, and its statutory clause "A person charged under West Virginia law who was found not guilty or whose charges were dismissed… may file a civil petition"`,
        `${PACKET_SET_MANIFESTS} packetSetId wv_nc_acquittal_dismissal-set, confirm_answer: "On what date were you found not guilty, or on what date were the charges dismissed?"`,
        `${PACKET_SET_MANIFESTS} obtain_document: "Obtain Certified copy of the order of acquittal or dismissal"`
      ],
      candidateGroundsOnTheForm: [],
      groundElected: null,
      mapped: false,
      why: "there is no acquittal recital anywhere in the operative body of SCA-C903. The only "
        + "disposition recital the document prints, paragraph 2, states that the matter WAS DISMISSED "
        + "BY A COURT, and its three blanks are printed '(Date of Dismissal)', '(Type of Court: "
        + "Municipal, Magistrate, Circuit)' and '(Reason for Dismissal.)'. Electing it for an acquittal "
        + "would write an acquittal into blanks the court printed for a dismissal and would leave "
        + "paragraph 4 swearing that 60 days have elapsed 'since the above referenced dismissal', on a "
        + "pleading the movant signs pro se. The nearest ground is not the correct ground, and this "
        + "build does not select it."
    }
  ];
  return rows;
}

/** The delivery gate this family's route contract carries, read from the record. */
function deliveryGateOfRecord() {
  const contract = readJson(ROUTE_CONTRACT);
  const route = (contract.routes ?? []).find((row) =>
    row.pathwayId === "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication");
  if (!route) return null;
  return {
    routeKey: route.routeKey,
    ruleId: route.ruleId,
    statute: route.statute,
    requiredFacts: route.requiredFacts ?? [],
    artifactApprovalRequired: route.artifactApprovalRequired === true,
    gate: (route.deliveryGates ?? []).find((row) => row.id === "wv_61_11_25_sca_c903_currency") ?? null
  };
}

/** What the compiled runtime profile states, read out of its own ruleClauses. */
function mechanismOfRecord() {
  const profile = readJson(COMPILED_PROFILE);
  const clauses = [];
  const walk = (node) => {
    if (Array.isArray(node)) { for (const item of node) walk(item); return; }
    if (node && typeof node === "object") {
      if (Array.isArray(node.ruleClauses)) {
        for (const clause of node.ruleClauses) if (typeof clause === "string") clauses.push(clause);
      }
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(profile);
  const clauseWith = (needle) => clauses.find((clause) => clause.includes(needle)) ?? null;
  return {
    readFrom: `${COMPILED_PROFILE} ruleClauses`,
    ruleClausesInspected: clauses.length,
    acquittalAndDismissalAreTwoFacts: clauseWith("was found not guilty or whose charges were dismissed"),
    acquittalEligibilitySignalPresent: clauses.includes("likely_eligible_acquittal_60_days"),
    dismissalEligibilitySignalPresent: clauses.includes("likely_eligible_dismissal_60_days"),
    sixtyDayTiming: clauseWith("no sooner than 60 days after"),
    feeRule: clauseWith("no filing fees or costs are charged for a 61-11-25 action"),
    priorFelonyBar: clauseWith("A person with a prior felony conviction may not file under 61-11-25")
  };
}

/** The packet-set manifest's own component and page references. */
function manifestOfRecord() {
  const doc = readJson(PACKET_SET_MANIFESTS);
  const set = (doc.packetSets ?? []).find((row) => row.packetSetId === FAMILY_ID) ?? null;
  if (!set) return null;
  return {
    packetSetId: set.packetSetId,
    components: (set.components ?? []).map((c) => ({
      componentId: c.componentId, role: c.role, officialFormId: c.officialFormId,
      outputStrategy: c.outputStrategy, officialSourceUrl: c.officialSourceUrl
    })),
    pageReferencesItMakes: (set.requiredBeforeFiling ?? []).filter((line) => /SCA-C903, page/i.test(line))
  };
}

function build() {
  const source = bindSource();
  if (!source.bound) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      overlayDirectoryTouched: false, counters: null,
      countersAreNullBecause: "no packet was built, so no counter was measured",
      failedSourceIdentities: [{
        sourceIdentity: SOURCE.sourceId, declaredPath: SOURCE.path,
        declaredSha256: SOURCE.sha256, why: source.why
      }]
    };
  }

  const printed = printedTextOf(source.absolute);
  if (!printed.read) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "SOURCE_NOT_READABLE_HERE",
      overlayDirectoryTouched: false, counters: null,
      countersAreNullBecause: "no packet was built, so no counter was measured",
      why: `this container could not read the bound binary's printed text (${printed.why}). The mapping this `
        + "family turns on rests on the document's own words, so it is not asserted from a container that "
        + "could not read them.",
      sourceBoundExactly: { sourceId: SOURCE.sourceId, sha256: source.sha256, byteLength: source.byteLength }
    };
  }

  const occurrences = acquittalOccurrences(printed.text);
  const grounds = candidateGroundsOf(printed.text);
  const mapping = mapDispositionsToGrounds(grounds);
  const unmapped = mapping.filter((row) => row.mapped !== true);
  const acquittalIsNeverAlleged = occurrences.length > 0
    && occurrences.every((o) => o.role !== "unclassified");

  const common = {
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    jurisdiction: "WV",
    implementationStrategy: "official_pdf_fill",
    directory: OUT_REL,
    overlayDirectoryTouched: false,
    counters: null,
    countersAreNullBecause:
      "no packet was built, so no counter was measured. A zero here would be a claim about a packet that "
      + "does not exist.",
    sourceCustody: {
      custodyIsSettled: true,
      sourceId: SOURCE.sourceId, formNumber: SOURCE.formNumber, revision: SOURCE.revision,
      pathInArchive: SOURCE.path, sha256: source.sha256, byteLength: source.byteLength,
      custody: source.indexEntry.custody,
      pageCount: source.indexEntry.pageCount,
      acroFormPresent: source.indexEntry.acroFormPresent,
      acroFieldCount: source.indexEntry.acroFieldCount,
      structuralClassInTheCommittedIndex: source.indexEntry.structuralClassObserved,
      whatThatClassActuallyMeans:
        "the committed index records this binary as `unreadable` with a pdf-lib loadError. That is a "
        + "property of the reader: the document is AES-256 encrypted (R6/V5) with an EMPTY user password "
        + "and opens in poppler and pikepdf — three US-Letter pages, no AcroForm, no annotations. It is a "
        + "flat encrypted PDF, not a corrupt one, and it is not why this family stops.",
      printedTextReadBy: printed.readBy,
      printedTextReaderVersion: printed.readerVersion
    },
    dispositionToGroundMapping: mapping,
    candidateGroundsMeasured: grounds,
    acquittalOccurrencesInTheDocument: {
      count: occurrences.length,
      everyOccurrenceIsTheDocumentNamingItself: acquittalIsNeverAlleged,
      occurrences
    },
    deliveryGateOfRecord: deliveryGateOfRecord(),
    mechanismOfRecord: mechanismOfRecord(),
    packetSetManifestOfRecord: manifestOfRecord(),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };

  if (unmapped.length === 0) {
    return {
      ...common,
      status: "STOPPED",
      stopClass: "MAPPING_DID_NOT_REPRODUCE",
      why: "every disposition this route requires mapped to a ground on SCA-C903, which contradicts the "
        + "measurement this family's refusal was written from. Re-read SCA-C903 and re-decide before "
        + "building or clearing this family."
    };
  }

  return {
    ...common,
    status: "STOPPED",
    stopClass: "DISPOSITION_FACT_MAPS_TO_NO_GROUND_ON_THE_BOUND_FORM",
    stopIsNotAboutCustody:
      "The one declared source binds byte-exact under the Master Library and the buildability measurement "
      + "records EVERY_BOUND_SOURCE_IS_A_HELD_PDF for the sibling family bound to the same digest. This "
      + "family stops because a disposition fact the route requires has no ground on the form that is held.",
    factsRefused: unmapped.map((row) => ({
      dispositionFact: row.dispositionFact,
      whereTheRecordStatesIt: row.whereTheRecordStatesIt,
      candidateGroundsOnTheForm: row.candidateGroundsOnTheForm,
      candidateGroundCount: row.candidateGroundsOnTheForm.length,
      why: row.why
    })),
    whyNoPartialBuild:
      "The refused fact is not a corner of this family; it is the first word of its name and the first "
      + "branch of the route's own first required fact. Building a dismissal-only packet under the id "
      + "`wv_nc_acquittal_dismissal-set` would deliver a family whose name and whose route both promise a "
      + "disposition the delivered artifact cannot carry. Narrowing a family's scope is an owner decision.",
    whatWouldUnblockIt: [
      "an owner decision to narrow this family to the straight-dismissal branch, and to name where the "
        + "acquittal branch goes instead — the dismissal branch maps cleanly to paragraph 2 today and "
        + "nothing else about the form stands in the way of building it; or",
      "binding an instrument that can state an acquittal — the route contract's own note calls for 'a "
        + "current-law supplement covering what the published form omits' and says 'a custom current-law "
        + "civil petition preferred', and W. Va. Code § 61-11-25(a) is a CIVIL PETITION route on the "
        + "compiled profile's own words, which is not what SCA-C903 is; or",
      "a revision of SCA-C903 that prints an acquittal recital in its operative body, which the revision "
        + "in custody (Rev. 04/2010) and the 2-page re-typeset publication at digest "
        + "242048f1ff5b2e795ca43900bec6d9c353c59950bffd3c7776374ff1cc6c7035 both do not"
    ],
    contradictionsFoundInTheRepository: [
      {
        record: PACKET_SET_MANIFESTS,
        field: "packetSets[packetSetId=wv_nc_acquittal_dismissal-set].requiredBeforeFiling page references",
        says: "\"Signature of movant — SCA-C903, page 1, signature block beneath the prayer for relief\", "
          + "\"Signature and date on the certificate of service — SCA-C903, page 2\", \"Prosecuting "
          + "attorney's office street address — SCA-C903, page 2, address line of the certificate of "
          + "service\", \"Circuit court case number — SCA-C903, page 1, caption block\"",
        measured: "the BOUND binary bbfcd767…fe878 is THREE pages: the prayer for relief and the signature "
          + "of movant are on page 2, and the entire certificate of service — its caption, the prosecuting "
          + "attorney's office and address lines, the three service methods, the date and the second "
          + "signature — is on page 3. The manifest's page numbers describe a TWO-page document. Its own "
          + "officialSourceUrl (https://www.courtswv.gov/sites/default/pubfilesmnt/2026-04/SCA-C-903.pdf) "
          + "is the 2-page re-typeset AcroForm publication recorded in the corpus index at "
          + "242048f1ff5b2e795ca43900bec6d9c353c59950bffd3c7776374ff1cc6c7035 with 25 fields. The manifest "
          + "and MASTER_QUEUE are pinned to two different binaries of the same form number, and any guide "
          + "that repeated the manifest's page numbers over the bound binary would send a participant to "
          + "the wrong page."
      },
      {
        record: "data/rcap-all50/local-source-corpus-index.json",
        field: "entries[].structuralClassObserved for SCA-C903 bbfcd767…fe878",
        says: "\"unreadable\", loadError \"Expected instance of PDFDict, but got instance of undefined\"",
        measured: "the document opens with an empty user password in poppler and in pikepdf: 3 pages, "
          + "612x792 pts each, /AcroForm absent from the catalog, /Annots absent on all three pages. It is "
          + "a flat, AES-256-encrypted PDF. Recording it as unreadable invites a later lane to stop on the "
          + "wrong ground."
      },
      {
        record: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
        field: "sourceReadiness.custodyClass",
        says: "\"NO_ACQUISITION_TASK_NAMED\"",
        measured: "data/rcap-grade-a/source-wave-integration/SOURCE_READY_BUILDABILITY.json carries no row "
          + "for this familyId at all; the row it carries for wv_nc_diversion_deferred-set, bound to the "
          + "SAME digest, records custodyClass null with verdict EVERY_BOUND_SOURCE_IS_A_HELD_PDF. Neither "
          + "field is a statement that the held form fits the route, and the queue's summary should not be "
          + "read as one."
      }
    ]
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  const result = build();
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "COMPLETED") process.exit(1);
}

export { build, FAMILY_ID, OUT_REL };
