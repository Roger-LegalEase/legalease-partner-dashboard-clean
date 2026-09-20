#!/usr/bin/env node
// Source-identity resolution, batch 1 of ROUTE OBLIGATION CENSUS V1.
//
//   node scripts/grade-a-route-obligation-census/resolve-census-source-identity-batch-1.mjs
//   node scripts/grade-a-route-obligation-census/resolve-census-source-identity-batch-1.mjs --check
//
// WHY THIS EXISTS
//
// source-custody-reconciliation.json classifies 295 official-source acquisition
// tasks. 166 come back SOURCE_IDENTITY_UNRESOLVED: the census names a source,
// but the name does not identify a document that can be looked for. Two very
// different things are mixed in that number, and an acquisition lane cannot act
// on either until they are separated:
//
//   (a) the family names NO document-shaped source at all -- only components,
//       compiled profiles, route contracts and reference URLs; and
//   (b) the family names a label that does not resolve -- a prose title
//       ("Request to Correct Criminal Justice Information"), or a rule citation
//       ("FL-RULE-3.989-PETITION"), which is a Florida Rule of Criminal
//       Procedure and not a form at all.
//
// This resolves the FIRST 83 of the 166, sorted by worklistGroupId, against what
// is already committed. Nothing is fetched. Egress to court hosts is refused in
// the environment this was produced in, and that is the point: resolution here
// is an act of reading the repository, not of acquiring anything.
//
// WHAT "RESOLVED" MEANS, AND WHY THE BAR IS WHERE IT IS
//
// A row is resolved when every document the route needs has a determinate
// answer: a named document with an issuing authority that someone could go and
// get, or an affirmative finding that no document is issued for that step. It is
// NOT resolved because a plausible form exists in the same state. Connecticut is
// the case that fixes the bar: the corpus holds JD-CR-202, and the CT-6 petition
// branch under C.G.S. 54-142a(f)(2) needs a petition -- but the state memo
// records that JD-CR-202 "on its face is a Clean Slate form, not an (f)(2)
// form". Calling that row held would send someone to file the wrong document.
// It is reported unresolved, and what would resolve it is named.
//
// For the same reason no form number is ever guessed. Where the repository
// establishes the document but not its number -- Florida's administrative
// expunction application, Delaware's SBI mandatory-expungement application --
// the number is recorded as not established and the issuing authority and title
// carry the identity instead. An acquisition lane can still act on that; it
// cannot act on a number that was invented.
//
// HOW THE JUDGEMENTS ARE KEPT HONEST
//
// The per-row judgements below are the analytical content and they are data, not
// prose: each one names the corpus form number or inventory path it relies on,
// and the generator RESOLVES those references at run time. A judgement that
// points at a corpus entry that does not exist, at an ambiguous form number, or
// at an inventory path that is not in the committed index, fails the run. So the
// output cannot drift away from the corpus, and a corpus change that invalidates
// a judgement surfaces as a failure rather than as a stale assertion.
//
// The generator also checks itself against the census: the table must cover
// exactly the 83 selected worklistGroupIds, and for every row its needs must be
// exactly the document sources the reconciler left unresolved. Sources the
// reconciler already resolved are carried through from the reconciler rather
// than restated here, so this file never contradicts it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);
const CHECK = process.argv.includes("--check");

const RECONCILIATION = "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json";
const WORKLIST = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const INVENTORY = "data/rcap-all50/nationwide-source-inventory.json";
const OUT = "data/rcap-grade-a/route-obligation-census-v1/identity-resolution/batch-1/resolved.json";
const BATCH_SIZE = 83;

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const reconciliation = readJson(RECONCILIATION);
const worklist = readJson(WORKLIST);
const corpus = readJson(CORPUS_INDEX);
const inventory = readJson(INVENTORY);

const fail = (message) => { console.error(`resolve-census-source-identity-batch-1: ${message}`); process.exit(1); };

// ---------------------------------------------------------------------------
// Reference resolution. Every assertion below points at one of these two
// committed indexes, and is resolved here rather than transcribed.
// ---------------------------------------------------------------------------
const corpusByStateAndForm = new Map();
for (const entry of corpus.entries) {
  if (!entry.formNumber) continue;
  const key = `${entry.state}|${entry.formNumber}`;
  if (!corpusByStateAndForm.has(key)) corpusByStateAndForm.set(key, []);
  corpusByStateAndForm.get(key).push(entry);
}
/** The one corpus file a judgement names, or a failed run. Ambiguity is not a match. */
function heldInVerifiedCorpus([state, formNumber]) {
  const matches = corpusByStateAndForm.get(`${state}|${formNumber}`) ?? [];
  if (matches.length === 0) fail(`no corpus entry for ${state} ${formNumber}`);
  if (matches.length > 1) fail(`${state} ${formNumber} is ambiguous in the corpus (${matches.length} entries)`);
  const entry = matches[0];
  return { path: entry.path, formNumber: entry.formNumber, revision: entry.revision, sha256: entry.sha256, assetClass: entry.assetClass };
}

const inventoryByPath = new Map();
for (const state of inventory.states) {
  for (const file of state.files ?? []) inventoryByPath.set(file.relativePath, { ...file, state: state.code });
}
/** A file the committed nationwide inventory records but the verified corpus does not carry. */
function heldOutsideVerifiedCorpus(relativePath) {
  const file = inventoryByPath.get(relativePath);
  if (!file) fail(`no nationwide-source-inventory file at ${relativePath}`);
  return { relativePath: file.relativePath, state: file.state, sha256: file.sha256, byteLength: file.sizeBytes, classification: file.classification };
}

const STATUSES = {
  RESOLVED_HELD:
    "The document is identified and the verified corpus holds it. Do not commission acquisition.",
  RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS:
    "The document is identified and the committed nationwide inventory records an acquired file for it, but the 329-file verified corpus does not carry it. The work is promotion and verification, not acquisition.",
  RESOLVED_NOT_HELD:
    "The document is identified and nothing in the repository holds it. This is a real acquisition and the target is now known.",
  RESOLVED_NO_OFFICIAL_FORM:
    "No official form is issued for this step. The document is a composed pleading or a written request, so there is nothing to acquire and the work is drafting.",
  RESOLVED_NO_DOCUMENT_TO_ACQUIRE:
    "The step produces no participant document at all -- an online portal application, or relief the court grants without a filing.",
  RESOLVED_NOT_A_SEPARATE_DOCUMENT:
    "The label names part of a document identified elsewhere in the same family, not a separately issued one. Acquiring the parent acquires it.",
  UNRESOLVED:
    "The document could not be identified from what is committed. What would resolve it is named. This is deliberately not a guess: a wrong resolution sends someone to acquire the wrong document."
};

const UNRESOLVED_REASONS = {
  OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN:
    "The state legal-design memo records the output vehicle itself as unresolved -- no form, pleading or guidance strategy has been approved -- so no document can be named until that review is completed.",
  NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT:
    "The route carries no legal-design track and no official-form assignment; only a compiled pathway and a route contract naming composed components. Nothing committed states whether the jurisdiction publishes a form, and a plausible in-state form exists that may or may not apply.",
  COMPANION_DOCUMENT_ABSENT_FROM_EVERY_INDEX:
    "The label names a companion document that appears in neither the verified corpus, the overlay source-records, nor the nationwide inventory, and nothing committed says whether it is separately published or part of a document already identified."
};

// ---------------------------------------------------------------------------
// The judgements.
//
// `needs` covers exactly the document sources the reconciler left unresolved for
// that row. Rows that named no document-shaped source carry needs derived from
// the route contract, the legal-design components and the compiled profile, and
// their `need` field says what the route actually requires.
// ---------------------------------------------------------------------------
const ACIC = "Arkansas Crime Information Center, Arkansas Department of Public Safety";
const ACIC_NUMBERING = "The ACIC uniform forms carry no agency-assigned form number; they are titled documents. The AR-ACIC-* values are LegalEase document ids assigned by the overlay factory (data/rcap-all50/overlays/production/arkansas/**/source-record.json), not ACIC numbers.";
const FDLE = "Florida Department of Law Enforcement";
const IJB = "Iowa Judicial Branch";
const ILSC = "Supreme Court of Illinois, Administrative Office of the Illinois Courts";
const GJP_NOT_OFFICIAL = "The Georgia Justice Project pro se motions the route cites are recorded in the state memo as \"nonprofit publisher; structural model only, not an official form\", so they are not an acquisition target.";

const RESOLUTIONS = {
  // -- (a) names no document-shaped source ----------------------------------
  "agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "A challenge to an Alabama criminal history record for an arrest that never produced a charge.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Not determined",
      evidence: [
        "data/record-clearing/legal-design-intake/AL.memo.json track al-uncharged-arrest: destination.name \"Unresolved\", outputStrategyStatus \"unresolved\", packetIdentity \"unresolved\", components [].",
        "The same memo records a route-existence blocker: Chapter 27 is written around a person \"who has been charged\" and whether an uncharged arrest has any route at all is unresolved."
      ],
      notes: "The nearest held Alabama agency document is SBI Form 46, the application to review Alabama criminal history record information. That is a record-review application, not a challenge document, and must not be substituted for one.",
      whatWouldResolveIt: "The legal review the memo names as outstanding: whether Ala. Code sections 41-9-645 and 41-9-646 give an independent record-clearing route, and in what forum. Until a route exists no document can be named."
    }]
  },
  "agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "The participant's request that the agency investigate and make a mistaken-identity finding under C.R.S. 24-72-702.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Not determined",
      evidence: [
        "data/record-clearing/legal-design-intake/CO.memo.json track co_mistaken_identity_expungement: \"Counsel named no approved form, pleading or guidance strategy. This track is not registered at runtime and is unreachable.\"",
        "outputStrategyStatus \"unresolved\"; packetIdentity \"unresolved\"; components []."
      ],
      notes: "Colorado publishes a large numbered JDF sealing set, twenty-one files of which the corpus holds. None of them is a mistaken-identity instrument, and the JDF set must not be substituted.",
      whatWouldResolveIt: "The memo's own outstanding item: read C.R.S. 24-72-702 in full and establish whether the Judicial Department publishes a form for it."
    }]
  },
  "agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "A submission to the New York Division of Criminal Justice Services correcting a record that CPL 160.55 should have sealed.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Not determined",
      evidence: [
        "data/record-clearing/legal-design-intake/NY.memo.json track ny_160_55_violation: outputStrategyStatus \"unresolved\", packetIdentity \"unresolved\", destination.name \"Not determined\" -- \"Because the operative content of any guidance is exactly what is unknown, no destination or strategy is asserted here.\"",
        "The memo records that the text of CPL 160.55 was never read at source; only CPL 160.57 was obtained."
      ],
      whatWouldResolveIt: "Reading CPL 160.55 at source to establish what the section seals, then whether DCJS exposes a correction submission and on what form."
    }]
  },
  "agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement": {
    needs: [{
      need: "The participant's written request to expunge a DNA sample and profile under N.M. Stat. 29-16-10, with certified disposition documentation or a sworn affidavit.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "The administrative centre of the New Mexico DNA identification system. The repository does not name the agency that operates it.",
      evidence: [
        "src/lib/legal-authority/routes/single-routes.json NM:dna-sample-profile-expungement packetComponents: [\"Request to the administrative centre\", \"Disposition documentation\", \"Affidavit where the no-charge branch applies\"]; outcomeMode agency_application.",
        "src/lib/rcap-engine/compiled/profiles/NM-new-mexico.json pathway dna-sample-profile-expungement: \"The person must provide a written request and certified documentation ... or a sworn affidavit\". The statute prescribes a written request, not a form.",
        "The eighteen New Mexico files in the corpus are the 4-9xx court expungement series and DPS release-of-information forms; none is a DNA instrument."
      ],
      notes: "The court-petition 4-95x series is for record expungement under NMSA Chapter 29 Article 3A and is a different mechanism; it must not be substituted for the DNA request."
    }]
  },
  "agency-application-treatment:obligation:track-only:CT:ct-destruction-request": {
    needs: [{
      need: "The accused person's written request that the Superior Court clerk physically destroy erased records under C.G.S. 54-142a(g)(1).",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Connecticut Judicial Branch, Superior Court clerk (recipient; no form is issued)",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-destruction-request, destination detail: \"The clerk acts on the request of the accused. No official form was located, and the accepted destination and format for a written request have not been confirmed.\""
      ],
      notes: "What remains open is the caption and channel the clerks accept, which is a drafting and practice question. There is no document to acquire."
    }]
  },
  "agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon": {
    needs: [{
      need: "The application for a provisional pardon or certificate of employability to the Board of Pardons and Paroles.",
      role: "primary_filing",
      status: "RESOLVED_NO_DOCUMENT_TO_ACQUIRE",
      issuingAuthority: "Connecticut Board of Pardons and Paroles",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-provisional-pardon, destination kind \"portal\": \"No stable participant application document has been identified that LegalEase could lawfully generate and submit.\""
      ],
      notes: "The only document-shaped item this family names is the participant's own criminal history request, form DPS-0846-C, and the corpus holds it.",
      relatedHeldDocuments: [["CT", "DPS-0846-C"]]
    }]
  },
  "agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure": {
    needs: [{
      need: "The absolute pardon application to the Board of Pardons and Paroles under C.G.S. 54-130a to 54-130e.",
      role: "primary_filing",
      status: "RESOLVED_NO_DOCUMENT_TO_ACQUIRE",
      issuingAuthority: "Connecticut Board of Pardons and Paroles",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-absolute-pardon, destination \"Connecticut Board of Pardons and Paroles, ePardon portal\": \"An online application through the Board's portal. No stable participant application document has been identified ...; an intake worksheet is not the legal filing packet.\""
      ],
      notes: "An online portal submission is not an acquirable document. The family's only document-shaped item, DPS-0846-C, is held.",
      relatedHeldDocuments: [["CT", "DPS-0846-C"]]
    }]
  },
  "composed-treatment:nd-nonconviction-auto-close-verify": {
    needs: [{
      need: "The official North Dakota instruction publication that states the record closes by operation of law and the participant does nothing.",
      role: "process_guidance",
      status: "RESOLVED_HELD",
      issuingAuthority: "North Dakota Supreme Court, legal self-help",
      officialTitle: "Instructions for Petition to Close Nonconviction Records",
      corpus: ["ND", "EXPERTISE"],
      evidence: [
        "data/record-clearing/legal-design-intake/ND.memo.json track nd-nonconviction-auto-close-verify names \"Instructions for Petition to Close Nonconviction Records, Rev Apr 2026\" as the official source; outputStrategyStatus \"resolved\", packetIdentity \"identified\"; the only component is process_guidance.",
        "src/lib/legal-authority/routes/national-report-2026-08-28.json ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05 carries outcomeMode automatic_relief and no packet components."
      ],
      notes: "The corpus holds this publication at revision REV-2025-08-01 while the memo cites a April 2026 revision, so the work is a refresh, not an acquisition. The corpus formNumber \"EXPERTISE\" is a normalisation artefact of the index, not a North Dakota form number."
    }]
  },
  "composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "The participant's court petition after the ninety-day agency window under C.R.S. 24-72-702.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Not determined",
      evidence: [
        "data/record-clearing/legal-design-intake/CO.memo.json track co_mistaken_identity_expungement: the governing mechanism and the participant-facing output vehicle are both unresolved; counsel named no approved form, pleading or guidance strategy."
      ],
      whatWouldResolveIt: "The memo's outstanding item: read C.R.S. 24-72-702 in full and establish whether the Judicial Department publishes a form for the petition branch."
    }]
  },
  "composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "A request to the sentencing court to correct the disposition it transmitted, where CPL 160.55 sealing did not follow.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Not determined",
      evidence: [
        "data/record-clearing/legal-design-intake/NY.memo.json track ny_160_55_violation: outputStrategyStatus \"unresolved\"; no destination or strategy is asserted because the operative content of any guidance is exactly what is unknown."
      ],
      whatWouldResolveIt: "Reading CPL 160.55 at source, then establishing whether the Unified Court System publishes any correction instrument for a sealing that did not occur at disposition."
    }]
  },
  "composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction": {
    unresolvedReason: "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT",
    needs: [{
      need: "The correction filing where the 10 Del. C. 1017A automatic juvenile expungement programme did not expunge an eligible record.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Delaware Family Court (destination; whether it issues a form is not established)",
      evidence: [
        "src/lib/legal-authority/routes/single-routes.json DE:juvenile-expungement-under-10-del-c-1017-1019-1017a packetComponents: [\"Petition under the applicable section\", \"Adjudication record\", \"Completion or discharge proof\"].",
        "data/record-clearing/legal-design-intake/DE.memo.json carries no track for the juvenile route, and legal-design-specifications.json carries no officialFormAssignment for it.",
        "src/lib/rcap-engine/compiled/profiles/DE-delaware.json sourceFormStatements describe only the adult routes: the Superior Court expungement petition packet and the SBI mandatory channel."
      ],
      notes: "The three Delaware files in the corpus are adult expungement instructions. The Superior Court Form 281E charge sheet recorded in the nationwide inventory is an adult Superior Court document and must not be substituted for a Family Court juvenile filing.",
      whatWouldResolveIt: "The Delaware Family Court forms index, or a legal-design memo track for the juvenile route stating whether the court publishes a petition form."
    }]
  },
  "composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition": {
    unresolvedReason: "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT",
    needs: [{
      need: "The discretionary juvenile expungement petition under 10 Del. C. 1018.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Delaware Family Court (destination; whether it issues a form is not established)",
      evidence: [
        "src/lib/legal-authority/routes/single-routes.json DE:juvenile-expungement-under-10-del-c-1017-1019-1017a, statute 10 Del. C. 1018, packetComponents naming a petition under the applicable section.",
        "No DE.memo.json track and no officialFormAssignment exists for this route; the Delaware profile's form statements cover the adult routes only."
      ],
      whatWouldResolveIt: "The Delaware Family Court forms index, or a legal-design memo track for the juvenile route."
    }]
  },
  "composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085": {
    needs: [{
      need: "A motion for belated determination and set-aside under AS 12.55.085(e), with a proposed order.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Alaska Court System (destination; no form is issued for this motion)",
      evidence: [
        "src/lib/legal-authority/routes/national-report-batch-b.json AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085 packetComponents name a \"Motion for Belated Determination and Set-Aside Under AS 12.55.085(e)\", supporting records, prosecutor service and a proposed order -- pleadings throughout, and no form.",
        "The five Alaska files in the corpus are the TF-800/805/810 court-record confidentiality requests and two DPS criminal-justice-information requests; none is a set-aside instrument, and no officialFormAssignment exists for the route."
      ],
      notes: "The TF-8xx forms address online case-index and case-record confidentiality under the administrative rules. They are a different mechanism from a sentencing set-aside and must not be substituted."
    }]
  },
  "composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route": {
    needs: [{
      need: "A petition or motion for first-offender record restriction and sealing under O.C.G.A. 42-8-62.1, with discharge documentation.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Georgia court of conviction (destination; Georgia publishes no statewide form for these filings)",
      evidence: [
        "src/lib/legal-authority/routes/p0.json GA:youthful-first-offender-restriction-route packetComponents: [\"Petition or motion under 42-8-62.1\", \"First-offender discharge documentation\"].",
        "src/lib/rcap-engine/compiled/profiles/GA-georgia.json sourceFormStatements: Georgia uses a GBI agency form for non-conviction restriction and court petitions for everything else; the court filings are described as petitions with proposed orders, not forms.",
        "No Georgia file appears in the verified corpus at all, and no officialFormAssignment exists for any Georgia track."
      ],
      notes: GJP_NOT_OFFICIAL
    }]
  },
  "composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief": {
    unresolvedReason: "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT",
    needs: [{
      need: "A verified mistaken-identity petition under the 20 ILCS 2630/5.2 mistaken-identity provisions.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Circuit court of Illinois (destination; whether a standardised form covers this route is not established)",
      evidence: [
        "src/lib/legal-authority/routes/route-splits.json IL:criminal-identity-theft-mistaken-identity-relief packetComponents: [\"Verified petition\", \"Identity-theft report\", \"Mismatched identifier evidence\"]; the note directs that the route must not run through the ordinary expungement eligibility engine.",
        "data/record-clearing/legal-design-intake/IL.memo.json carries no track for this route and no officialFormAssignment exists for it."
      ],
      notes: "Illinois does publish a standardised statewide expungement and sealing suite, and the EXP-AD Request and Order Granting are in the corpus. Whether that suite reaches a nunc pro tunc mistaken-identity correction is exactly what is not established, and using EXP-AD here on the strength of it being the state's expungement form would be the wrong document.",
      whatWouldResolveIt: "The Illinois Courts approved-forms suite index for expungement and sealing, which the route carries only as a URL, or an Illinois legal-design track for this route."
    }]
  },
  "composed-treatment:obligation:runtime-only:MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4": {
    needs: [{
      need: "A petition under Miss. Code Ann. 99-19-71(4) with the dismissal order and a proposed order.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Mississippi court of the underlying case (destination; no statewide form is issued)",
      evidence: [
        "src/lib/legal-authority/routes/mississippi.json MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4 packetComponents: [\"Petition under 99-19-71(4)\", \"Dismissal order\", \"Proposed order\"].",
        "No Mississippi file appears in the verified corpus, no officialFormAssignment exists for any Mississippi track, and the Mississippi profile carries no sourceFormStatements."
      ],
      notes: "The nationwide inventory holds four unattributed Mississippi petition and order PDFs for the general conviction and dismissed-case routes. They carry no issuing authority in the index and are not attributable to a Mississippi publisher, so they are not an official source for this branch.",
      basis: "A negative finding across the corpus index, the nationwide inventory, the official-form assignments and the state memo. It establishes that nothing committed identifies a form, not that none exists anywhere."
    }]
  },
  "composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26": {
    needs: [{
      need: "A post-nonadjudication petition under Miss. Code Ann. 99-15-26(5) with completion and closure proof and a proposed order.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Mississippi court of the underlying case (destination; no statewide form is issued)",
      evidence: [
        "src/lib/legal-authority/routes/mississippi.json MS:nonadjudication-under-99-15-26 packetComponents: [\"Petition under 99-15-26(5)\", \"Completion and closure proof\", \"Proposed order\"].",
        "No Mississippi corpus file, no officialFormAssignment for any Mississippi track, no sourceFormStatements in the Mississippi profile."
      ],
      notes: "The four unattributed Mississippi petition and order PDFs in the nationwide inventory address the general conviction and dismissed-case routes and are not attributable to an issuing authority.",
      basis: "A negative finding across the committed indexes, not a proof that no such form exists."
    }]
  },
  "composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59": {
    needs: [{
      need: "A petition under Miss. Code Ann. 99-15-59 on the immediate-dismissal branch, with the dismissal order and a proposed order.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Mississippi court of the underlying case (destination; no statewide form is issued)",
      evidence: [
        "src/lib/legal-authority/routes/mississippi.json MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59 packetComponents: [\"Petition under 99-15-59\", \"Dismissal order\", \"Proposed order\"].",
        "No Mississippi corpus file, no officialFormAssignment for any Mississippi track."
      ],
      basis: "A negative finding across the committed indexes, not a proof that no such form exists."
    }]
  },
  "composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59": {
    needs: [{
      need: "A petition under Miss. Code Ann. 99-15-59 on the twelve-month no-charge branch, with the arrest record and a proposed order.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Mississippi court of the underlying case (destination; no statewide form is issued)",
      evidence: [
        "src/lib/legal-authority/routes/mississippi.json MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59 packetComponents: [\"Petition under 99-15-59\", \"Arrest record\", \"Proposed order\"].",
        "No Mississippi corpus file, no officialFormAssignment for any Mississippi track."
      ],
      basis: "A negative finding across the committed indexes, not a proof that no such form exists."
    }]
  },
  "composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247": {
    needs: [{
      need: "A petition to vacate and seal under NRS 179.247, with victimisation nexus and due-diligence showings.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Nevada district or justice court (destination; no form is issued for the vacatur route)",
      evidence: [
        "src/lib/legal-authority/routes/route-splits.json NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247 packetComponents: [\"Petition to vacate and seal\", \"Victimization nexus evidence\", \"Due-diligence and safety showing\"]; the note records that the route has its own nexus and safety conditions and never inherits the deferred-judgment rule.",
        "src/lib/rcap-engine/compiled/profiles/NV-nevada.json formInventory holds only the 2018 district-court and justice-court record-sealing forms and the DPS-006 record request; no vacatur instrument.",
        "The three Nevada corpus files are municipal and regional sealing handbooks, not forms."
      ],
      notes: "The two 2018 Nevada record-sealing forms belong to the ordinary sealing route. A vacatur under NRS 179.247 is a different remedy and the sealing forms must not be substituted."
    }]
  },
  "composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief": {
    needs: [{
      need: "A petition for trafficking-survivor relief under 22 O.S. 19c with trafficking nexus evidence.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Oklahoma district court (destination; no published form covers this section)",
      evidence: [
        "src/lib/legal-authority/routes/route-splits.json OK:human-trafficking-survivor-relief packetComponents: [\"Petition under 19c\", \"Trafficking nexus evidence\"].",
        "src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json formInventory contains a single item, the statutory publication of 22 O.S. 18a titled \"Petition to Expunge Records and Order to Expunge Records\" -- Oklahoma prescribes that petition and order in the statute text rather than issuing a form.",
        "No Oklahoma file appears in the verified corpus and no officialFormAssignment exists for any Oklahoma track."
      ],
      notes: "The statutorily prescribed petition and order at 22 O.S. 18a govern the general adult section 18 expungement, not section 19c. They are a drafting model, not the authority for this route."
    }]
  },
  "composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement": {
    needs: [{
      need: "A juvenile expungement petition under 10A O.S. 2-6-109 with the disposition or closure record.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Oklahoma district court, juvenile division (destination; no published form covers this section)",
      evidence: [
        "src/lib/legal-authority/routes/route-splits.json OK:juvenile-record-expungement packetComponents: [\"Petition under 2-6-109\", \"Disposition or closure record\"].",
        "The only Oklahoma form-shaped source in the compiled profile is the 22 O.S. 18a statutory petition and order text, which is the adult criminal route.",
        "No Oklahoma corpus file and no officialFormAssignment for any Oklahoma track."
      ],
      notes: "10A O.S. 2-6-109 is a juvenile code section. The adult 22 O.S. 18a prescribed text must not be substituted for it."
    }]
  },
  "composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement": {
    needs: [{
      need: "A petition to vacate or expunge under 18 Pa.C.S. 3019, with trafficking nexus evidence.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Pennsylvania court of common pleas (destination; the Rules of Criminal Procedure prescribe no form for a section 3019 vacatur)",
      evidence: [
        "src/lib/legal-authority/routes/route-splits.json PA:path-k-human-trafficking-vacatur-expungement packetComponents: [\"Petition to vacate or expunge\", \"Trafficking nexus evidence\", \"Diversion completion record where applicable\"].",
        "The eight Pennsylvania corpus files are the Pa.R.Crim.P. 490, 790 and 791 petition and order pairs plus two in forma pauperis forms; none is a vacatur instrument, and no officialFormAssignment exists for this route."
      ],
      notes: "The held Rule 790 petition and order are the ordinary expungement instruments. Whether an expungement follows a section 3019 vacatur is a sequencing question this record does not decide, and the Rule 790 pair is not the vacatur document.",
      relatedHeldDocuments: [["PA", "PA-RCRIM-P-790-PETITION"], ["PA", "PA-RCRIM-P-790-ORDER"]]
    }]
  },
  "composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement": {
    unresolvedReason: "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT",
    needs: [{
      need: "A juvenile trafficking expungement petition under S.D. Codified Laws 26-7A-115.1 with victimisation nexus evidence.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "South Dakota Unified Judicial System (whether its expungement forms reach a juvenile section 26-7A-115.1 petition is not established)",
      evidence: [
        "src/lib/legal-authority/routes/route-splits.json SD:juvenile-trafficking-expungement packetComponents: [\"Petition under 26-7A-115.1\", \"Victimization nexus evidence\"].",
        "src/lib/rcap-engine/compiled/profiles/SD-south-dakota.json sourceFormStatements list the UJS expungement set -- UJS-390 instructions through UJS-395 -- from the UJS pro se expungement forms page. Nothing states whether that set covers juvenile chapter 26-7A petitions.",
        "The corpus holds UJS-232 and UJS-391 through UJS-395 plus the print-all packet; no officialFormAssignment exists for this route and SD.memo.json carries no track for it."
      ],
      notes: "This is exactly the case where a plausible in-state form is the trap. UJS-391 is a motion for expungement, and assuming it covers a juvenile chapter 26-7A petition on the strength of the word \"expungement\" would be a guess.",
      whatWouldResolveIt: "The UJS pro se forms index for juvenile matters, or reading the held UJS-390 instructions to see whether the packet's scope includes chapter 26-7A."
    }]
  },
  "composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement": {
    unresolvedReason: "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT",
    needs: [{
      need: "A petition to vacate and expunge under W. Va. Code 61-14-9 with direct-result nexus evidence.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Supreme Court of Appeals of West Virginia (which forms cover this section is not established)",
      evidence: [
        "src/lib/legal-authority/routes/single-routes.json WV:sex-trafficking-victim-vacatur-and-expungement, statute W. Va. Code 61-14-9, packetComponents: [\"Petition under 61-14-9\", \"Direct-result nexus evidence\"].",
        "src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json sourceFormStatements list SCA-C900 instructions, SCA-C903 acquittal or dismissal motion, SCA-C906 misdemeanour petition, SCA-C907 felony petition and SCA-C912 victim notice. None is described as covering a trafficking vacatur.",
        "The corpus holds SCA-C900, SCA-C903, SCA-C906 and SCA-C912; SCA-C907 appears only in the nationwide inventory. No officialFormAssignment exists for this route."
      ],
      notes: "Filing a section 61-14-9 vacatur on SCA-C906 or SCA-C907 because they are the state's expungement petitions would be a guess. The vacatur and the expungement are distinct requests.",
      whatWouldResolveIt: "The West Virginia Judiciary expungement forms index, or the held SCA-C900 instructions read at source, which state which form each statutory route uses."
    }]
  },
  "composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708": {
    needs: [{
      need: "A motion to vacate a conviction under Wyo. Stat. 6-2-708(c), with nexus evidence.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Wyoming district or circuit court (destination; Wyoming publishes no statewide form)",
      evidence: [
        "src/lib/rcap-engine/compiled/profiles/WY-wyoming.json sourceFormStatements state that Wyoming's statewide self-help page provides no complete petition packet, list \"Human-trafficking victim relief -- Motion to Vacate Conviction under W.S. 6-2-708\", and carry the explicit instruction not to invent a statewide form number unless a specific court provides one.",
        "src/lib/legal-authority/routes/single-routes.json WY:human-trafficking-victim-vacatur-w-s-6-2-708 packetComponents: [\"Petition to vacate\", \"Nexus evidence\"].",
        "No Wyoming file appears in the verified corpus; the only Wyoming capture is the statewide expungement handout."
      ],
      notes: "The same profile warns that county clerks, municipal courts and circuit courts may have local templates, which is a local-variation question rather than a statewide acquisition."
    }]
  },
  "composed-treatment:sc_17_22_950_summary": {
    needs: [{
      need: "The application a participant files with the summary court on the unfingerprinted branch of S.C. Code 17-22-950.",
      role: "primary_filing",
      status: "RESOLVED_HELD",
      issuingAuthority: "South Carolina Judicial Branch, South Carolina Court Administration",
      formNumber: "SCCA 223E",
      officialTitle: "Application for Expungement Pursuant to Section 17-22-950(B)",
      corpus: ["SC", "SCCA-223E"],
      evidence: [
        "data/record-clearing/legal-design-intake/SC.memo.json track sc_17_22_950_summary: primary_filing component officialFormId SCCA-223E, officialSourceUrl the Judicial Branch form library; outputStrategyStatus \"resolved\", packetIdentity \"identified\"; the memo records the form was retrieved and hashed on 2026-08-06.",
        "data/record-clearing/legal-design-specifications.json officialFormAssignments carries the same assignment for sc_17_22_950_summary-primary-filing-1."
      ],
      notes: "This row reached the census as naming no document-shaped source, but the legal design assigns SCCA 223E and the corpus holds it. The defect is upstream: the worklist routes for this family carry no requiredSourceIds at all, so the assignment never reached the reconciler. Nothing needs acquiring; the census input needs correcting."
    }]
  },
  "composed-treatment:sd_sis_sealing": {
    needs: [{
      need: "Any participant filing for sealing on discharge and dismissal after a suspended imposition of sentence.",
      role: "primary_filing",
      status: "RESOLVED_NO_DOCUMENT_TO_ACQUIRE",
      issuingAuthority: "The South Dakota court that entered the discharge and dismissal",
      evidence: [
        "data/record-clearing/legal-design-intake/SD.memo.json track sd_sis_sealing: \"Section 23A-27-17 directs that upon the discharge and dismissal the court shall order the records sealed. The participant files nothing.\" outputStrategyStatus \"resolved\", packetIdentity \"identified\".",
        "Every component in the legal design is verification, explanation or escalation; none is a filing."
      ],
      notes: "The memo keeps open whether sealing is automatic on discharge or requires a motion, and leaves an official_pdf_fill fallback unresolved against that possibility. If that question resolves toward a motion, the document identity would need to be revisited; as the design stands there is nothing to acquire."
    }]
  },

  // -- Connecticut packet sets ----------------------------------------------
  "ct-cannabis-petition-set": {
    needs: [{
      need: "The petition for erasure of cannabis conviction records under C.G.S. 54-142v, with a supporting affidavit.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Connecticut Superior Court (destination; no statewide form is issued)",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-cannabis-petition lists the Clean Slate Connecticut cannabis-erasure page as \"The authority for the no-official-form finding\".",
        "The memo's destination detail: \"Because there is no statewide form, G.A. clerks may have local expectations about caption and format.\""
      ],
      notes: "What remains open is caption and format at the geographical area clerks, and service and proposed-order practice. Those are drafting and local-variation questions, not acquisition."
    }]
  },
  "ct-decriminalized-set": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "The petition for physical destruction of records of a decriminalised offence under C.G.S. 54-142d.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Connecticut Superior Court, or the Judicial Department records centre (destination; whether a form exists is open)",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-decriminalized, unresolved question: \"The accepted filing practice for a 54-142d petition, and whether the Judicial Branch has any form or practice note.\"",
        "The memo also leaves the current scope of \"decriminalized\" after State v. Menditto open, which it records as determining whether and what to file."
      ],
      notes: "Unlike the sibling Connecticut tracks, this memo does not record a no-form finding. It records the form question as open, which is a different answer and must not be collapsed into the others.",
      whatWouldResolveIt: "The Connecticut Judicial Branch forms index checked for a 54-142d instrument, or a practice note from the Judicial Department records centre."
    }]
  },
  "ct-missed-erasure-set": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "The submission requesting review of a missed automatic erasure under C.G.S. 54-142t(g).",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Connecticut Department of Emergency Services and Public Protection (form and manner not established)",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-missed-erasure, unresolved question: \"DESPP's current form and manner for the missed-erasure submission. This is a true output blocker; it is not in the statute and the URL was not located.\""
      ],
      notes: "The memo names DPS-0846-C as an official source and the corpus holds it, but that form is the criminal history record request, not the missed-erasure submission. Treating the held form as satisfying this need would be the wrong document.",
      relatedHeldDocuments: [["CT", "DPS-0846-C"]],
      whatWouldResolveIt: "The DESPP page or contact that states the form and manner for a 54-142t(g) review request, which the memo records as not located."
    }]
  },
  "ct-nolle-auto-set": {
    needs: [{
      need: "The motion to nolle a continued charge under C.G.S. 54-142a(c)(2); the automatic erasure branch requires no filing.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Connecticut Superior Court (destination; no form is issued)",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-nolle-auto, unresolved question: \"The current filing vehicle and clerk practice for the 54-142a(c)(2) motion, before a statewide custom pleading can be enabled. No form was located.\"",
        "The memo's destination detail records that the automatic branch requires no filing at all."
      ],
      notes: "The form question is answered -- none was located and the design proceeds as a custom pleading. What is open is caption, venue, service and clerk practice, which is drafting rather than acquisition."
    }]
  },
  "ct-pardon-erasure-set": {
    needs: [{
      need: "The pre-1 October 1974 petition to the Superior Court for erasure after an absolute pardon under C.G.S. 54-142a(d); the post-1974 branch requires no filing.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Connecticut Superior Court (destination; no form is issued)",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-pardon-erasure, unresolved question: \"No official form was located for the pre-1 October 1974 petition, so the caption and format that G.A. clerks accept must be confirmed with a Connecticut practitioner.\"",
        "The memo's destination detail records that the post-1974 branch requires no filing at all."
      ],
      notes: "Caption and format confirmation is a drafting question. There is no document to acquire."
    }]
  },
  "ct-under18-misdemeanor-set": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "The petition branch of C.G.S. 54-142a(f)(2), erasure of an adult misdemeanour conviction for conduct before age eighteen; the automatic branch requires no filing.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Connecticut Superior Court (whether the Judicial Branch publishes a form for this branch is open)",
      evidence: [
        "data/record-clearing/legal-design-intake/CT.memo.json track ct-under18-misdemeanor, unresolved question: \"Whether the Judicial Branch publishes a form for a 54-142a(f)(2) petition, and whether JD-CR-202 is used for it in practice. JD-CR-202 on its face is a Clean Slate form, not an (f)(2) form.\""
      ],
      notes: "The corpus holds JD-CR-202. This is the row that sets the bar for the whole batch: the state's own review says the held form is not on its face the form for this branch, so recording this row as held would send someone to file the wrong petition.",
      relatedHeldDocuments: [["CT", "JD-CR-202"]],
      whatWouldResolveIt: "A Connecticut Judicial Branch statement, or practitioner confirmation, that JD-CR-202 is or is not used for a 54-142a(f)(2) petition."
    }]
  },

  // -- District of Columbia --------------------------------------------------
  ...Object.fromEntries([
    ["dc_correct_misattributed_arrest-set", ["A motion to correct a misattributed arrest record under D.C. Code 16-806(g).", "dc_correct_misattributed_arrest"]],
    ["dc_innocence_expungement-set", ["A motion for expungement on grounds of actual innocence under D.C. Code 16-803.", "dc_innocence_expungement"]],
    ["dc_seal_conviction-set", ["A motion to seal a conviction record under D.C. Code 16-806(a)(3).", "dc_seal_conviction"]],
    ["dc_seal_fugitive-set", ["A motion to seal a fugitive-from-justice arrest record under D.C. Code 16-806(a)(2).", "dc_seal_fugitive"]],
    ["dc_seal_nonconviction-set", ["A motion to seal a non-conviction record under D.C. Code 16-806(a)(1).", "dc_seal_nonconviction"]]
  ].map(([groupId, [need, track]]) => [groupId, {
    needs: [{
      need,
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Superior Court of the District of Columbia, Criminal Division (destination; the court publishes instructions, not a motion form)",
      evidence: [
        `data/record-clearing/legal-design-intake/DC.memo.json track ${track}: the single component is a primary_filing carried as a custom pleading, and the official source is the Criminal Division publication \"How to Seal or Expunge Your Criminal Record\".`,
        "data/record-clearing/legal-design-specifications.json carries this component in customPleadingSpecs and assigns no official form.",
        "The only District of Columbia file in the verified corpus is that instruction publication, held at REV-2024-04-10."
      ],
      notes: "The court's published material for these motions is guidance. Acquisition of a motion form is not the work; the instruction publication that governs the process is already held.",
      relatedHeldDocuments: [["DC", "DC-HOW-TO-SEAL-OR-EXPUNGE-YOUR-CRIMINAL-RECOR"]]
    }]
  }])),
  "dc_yra_set_aside-set": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "A motion to set aside a conviction under the Youth Rehabilitation Act, D.C. Code 24-906(e-1).",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Superior Court of the District of Columbia, Criminal Division (whether it has a form or standing practice is open)",
      evidence: [
        "data/record-clearing/legal-design-intake/DC.memo.json track dc_yra_set_aside, unresolved question: \"Whether the Superior Court has any form or standing practice for these motions.\"",
        "The same memo leaves service and response mechanics, and whether the set-aside and the sealing motion are filed together or in sequence, unresolved."
      ],
      notes: "The sibling District of Columbia sealing tracks record no such open question, which is why they resolve to no official form and this one does not.",
      whatWouldResolveIt: "The Superior Court Criminal Division's answer on whether a Youth Rehabilitation Act set-aside has a form or standing practice."
    }]
  },

  // -- Single-label families -------------------------------------------------
  "agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record": {
    needs: [{
      sourceId: "official-form:Request to Correct Criminal Justice Information",
      need: "The Alaska DPS form for correcting criminal justice information.",
      role: "primary_filing",
      status: "RESOLVED_HELD",
      issuingAuthority: "Alaska Department of Public Safety, Criminal Records and Identification Bureau",
      formNumber: "DPS-CRI-103",
      officialTitle: "Request to Correct Criminal Justice Information in the Alaska Public Safety Information Network",
      corpus: ["AK", "DPS-CRI-103"],
      evidence: [
        "data/record-clearing/legal-design-intake/AK.memo.json track ak-correct-record records that \"The Department of Public Safety publishes a 'Correct Criminal Justice Information' form alongside the seal request on its background-checks forms page\", and names the DPS background-checks page as the official source.",
        "data/rcap-all50/local-source-corpus-index.json holds AK DPS-CRI-103 at REV-2022-07-25; the nationwide inventory records the same file under LegalEase Alaska/source-gated/."
      ],
      notes: "The census label is the form's prose title, which shares no token with the corpus form number, so the reconciler's token-subset matcher could not reach it. The document is held. The memo's remaining open item is the governing statute or regulation, which is a legal-authority question, not an acquisition."
    }]
  },
  "ak-mistaken-identity-set": {
    needs: [{
      sourceId: "official-form:DPS-REQUEST-TO-SEAL-CRIM-INFO",
      need: "The Alaska DPS request to seal criminal justice information for mistaken identity or false accusation under AS 12.62.180.",
      role: "primary_filing",
      status: "RESOLVED_HELD",
      issuingAuthority: "Alaska Department of Public Safety, Criminal Records and Identification Bureau",
      formNumber: "DPS-SEAL-REQ-2-04",
      officialTitle: "Request to Seal Criminal Justice Information",
      corpus: ["AK", "DPS-SEAL-REQ-2-04"],
      evidence: [
        "data/record-clearing/legal-design-intake/AK.memo.json track ak-mistaken-identity: primary_filing officialFormId DPS-REQUEST-TO-SEAL-CRIM-INFO with the DPS source URL.",
        "The corpus holds the document at REV-2004-02."
      ],
      revisionCurrencyDoubt: true,
      notes: "The held copy is revision 2-04 while the assignment's source URL is a 2026-04 upload, and the memo carries the matching open item: \"Confirmation that the DPS seal-request form remains current. The earlier reviewed copy was dated 2-04.\" The work is a refresh against the current upload, not a first acquisition."
    }]
  },
  "az_wrongful_arrest_clearance-set": {
    needs: [{
      need: "A petition for notation of clearance after a wrongful arrest or charge under A.R.S. 13-4051.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Arizona superior court (destination; the Administrative Office of the Courts issues no form for this petition)",
      evidence: [
        "data/record-clearing/legal-design-intake/AZ.memo.json track az_wrongful_arrest_clearance: the single component is a primary_filing carried as a custom pleading, and the memo's addendum records that the open question is product scope rather than output identity.",
        "The seven Arizona corpus files are the AOC sealing, marijuana expungement and certificate of second chance forms; none addresses a notation of clearance under 13-4051."
      ],
      notes: "The memo is explicit that this is \"a product-scope choice rather than an output-identity problem\", which is what separates it from the rows reported unresolved."
    }]
  },
  "de_mandatory_expungement-set": {
    needs: [{
      sourceId: "official-form:DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION",
      need: "The application for mandatory expungement to the State Bureau of Identification under 11 Del. C. 4373.",
      role: "primary_filing",
      status: "RESOLVED_NOT_HELD",
      issuingAuthority: "Delaware State Police, State Bureau of Identification",
      formNumber: null,
      formNumberNotEstablished: true,
      officialTitle: "The State Bureau of Identification mandatory expungement application, published on the Delaware State Police expungements page.",
      officialTitleIsInferred: true,
      evidence: [
        "data/record-clearing/legal-design-intake/DE.memo.json track de_mandatory_expungement: primary_filing officialFormId DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION with officialSourceUrl dsp.delaware.gov/expungements/; the memo's open item is \"The SBI mandatory expungement request form, its current fee ...\".",
        "src/lib/rcap-engine/compiled/profiles/DE-delaware.json: \"For mandatory relief, route the user to the SBI line ... no court form.\"",
        "The three Delaware corpus files are instruction packets; the nationwide inventory holds only those plus the Superior Court Form 281E adult charge sheet."
      ],
      notes: "The issuing authority and the acquisition point are determinate. The form number is not established anywhere in the repository and is not guessed here.",
      whatWouldNarrowIt: "The Delaware State Police expungements page, which the assignment already names, would supply the number and revision at acquisition time."
    }]
  },
  "id_isp_expungement-set": {
    needs: [{
      sourceId: "official-form:ISP-BCI-EXPUNGEMENT-APPLICATION",
      need: "The Idaho State Police expungement application under Idaho Code 67-3004(10).",
      role: "primary_filing",
      status: "RESOLVED_HELD",
      issuingAuthority: "Idaho State Police, Bureau of Criminal Identification",
      formNumber: "ISP-BCI",
      officialTitle: "Idaho State Police Bureau of Criminal Identification Expungement Application",
      corpus: ["ID", "ISP-BCI"],
      evidence: [
        "data/record-clearing/legal-design-intake/ID.memo.json track id_isp_expungement names the ISP BCI Expungement Application as the official source, with the BCI address and fax for submission.",
        "The corpus holds it as a source-gated file; the nationwide inventory records the same acquisition as LegalEase Idaho/ExpungmentApplication.pdf."
      ],
      notes: "The reconciler could not reach this because the census label carries four tokens and the corpus form number carries two, so the token-subset test fails in the direction that cannot match. The revision is recorded as unknown, and the memo records the same: \"The uploaded copy carries no revision marking, which makes drift undetectable.\""
    }]
  },
  "id_felony_reduction-set": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "An application to reduce a felony under I.C. 19-2604(2).",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Idaho sentencing court (whether any statewide form or approved template exists is open)",
      evidence: [
        "data/record-clearing/legal-design-intake/ID.memo.json track id_felony_reduction, unresolved question: \"Whether any statewide form or approved template exists for a 19-2604 application, and how county practice varies. This gates tracks 3 and 4.\""
      ],
      notes: "The two Idaho corpus files are the ISP BCI expungement application and the petition to shield records under 67-3004(11). Neither is a 19-2604 application, and neither may be substituted.",
      whatWouldResolveIt: "The Idaho Supreme Court or county forms index checked for a 19-2604 application, which the memo records as an open item gating this track."
    }]
  },
  "id_set_aside_dismissal-set": {
    unresolvedReason: "OUTPUT_VEHICLE_UNRESOLVED_IN_LEGAL_DESIGN",
    needs: [{
      need: "An application for set-aside and dismissal under I.C. 19-2604(1).",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Idaho sentencing court (whether any statewide form or approved template exists is open)",
      evidence: [
        "data/record-clearing/legal-design-intake/ID.memo.json track id_set_aside_dismissal carries the same open item: whether any statewide form or approved template exists for a 19-2604 application, and how county practice varies."
      ],
      whatWouldResolveIt: "The Idaho Supreme Court or county forms index checked for a 19-2604 application."
    }]
  },
  "census-pending-family:ME:juvenile-sealing": {
    unresolvedReason: "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT",
    needs: [{
      need: "A juvenile sealing petition under 15 M.R.S. 3308-C, with final discharge proof.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Maine Judicial Branch (a juvenile form is captured but its identity is not recorded)",
      evidence: [
        "src/lib/legal-authority/routes/single-routes.json ME:juvenile-sealing packetComponents: [\"Petition under 3308-C\", \"Final discharge proof\"].",
        "No ME.memo.json track and no officialFormAssignment exists for this route.",
        "The two Maine corpus files are CR-289 and CR-307, the sex-trafficking sealing motion and an ADA notice. The nationwide inventory additionally records MJB-Form-jv-043.pdf, a Maine Judicial Branch juvenile form whose title is recorded nowhere in the repository."
      ],
      candidateInRawInventory: {
        inventory: "LegalEase Maine/MJB-Form-jv-043.pdf",
        identityBasis: "The form number JV-043 is legible in the file name. Its title, subject and whether it is the 3308-C petition are not recorded anywhere committed."
      },
      notes: "CR-307 and CR-308 are the sex-trafficking sealing motion and order. They address a different section and must not be substituted for a juvenile sealing petition.",
      whatWouldResolveIt: "The Maine Judicial Branch juvenile forms index, or a normalised file name or overlay source-record carrying the title of JV-043."
    }]
  },
  "census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement": {
    unresolvedReason: "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT",
    needs: [{
      need: "A petition to vacate or expunge under the Utah Code Title 77 Chapter 40a trafficking provisions, with trafficking nexus evidence.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Utah state courts (whether a vacatur form exists in the numbered expungement series is not established)",
      evidence: [
        "src/lib/legal-authority/routes/route-splits.json UT:path-l-vacatur-human-trafficking-related-expungement packetComponents: [\"Petition to vacate or expunge\", \"Trafficking nexus evidence\"]; the note records that the statute expressly authorises a participant-filed petition.",
        "No UT.memo.json track and no officialFormAssignment exists for this route.",
        "The twenty-one Utah corpus files are the numbered district-court expungement series -- 1000EX, 1002EX, 1003EX and their orders and service forms -- plus the BCI applications. None is a vacatur instrument."
      ],
      notes: "1000EX is the petition to expunge with a certificate of eligibility. Using it for a Chapter 40a vacatur because it is Utah's expungement petition would be a guess about which relief the form covers.",
      whatWouldResolveIt: "The Utah courts forms index checked for a Title 77 Chapter 40a vacatur form, or a Utah legal-design track for this route."
    }]
  },
  "census-pending-family:UT:path-m-juvenile-expungement": {
    unresolvedReason: "NO_LEGAL_DESIGN_TRACK_AND_NO_FORM_ASSIGNMENT",
    needs: [{
      need: "A Utah juvenile expungement petition, with jurisdiction termination or release proof.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: "Utah juvenile court (whether it publishes a petition form is not established)",
      evidence: [
        "src/lib/legal-authority/routes/route-splits.json UT:path-m-juvenile-expungement packetComponents: [\"Petition\", \"Jurisdiction termination or release proof\"].",
        "No UT.memo.json track and no officialFormAssignment exists for this route.",
        "Every Utah expungement file held or captured is the district-court adult series or a BCI application; no juvenile-court instrument appears in the corpus or the nationwide inventory."
      ],
      notes: "The adult 1000EX series is a district-court set. A juvenile expungement is a juvenile-court proceeding and the adult set must not be substituted.",
      whatWouldResolveIt: "The Utah courts juvenile forms index, or a Utah legal-design track for this route."
    }]
  },
  "census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260": {
    needs: [{
      need: "The motion, notice and order for sealing the records of a juvenile offender under RCW 13.50.260.",
      role: "primary_filing",
      status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
      issuingAuthority: "Washington State Administrative Office of the Courts, juvenile pattern forms",
      formNumber: "JU 10.0300, JU 10.0315 and JU 10.0320",
      officialTitle: "JU 10.0300 Motion and Affidavit to Seal Records of Juvenile Offender; JU 10.0315 Notice of Response to Motion to Seal Records of Juvenile Offender; JU 10.0320 Order re Sealing Records of Juvenile Offender",
      officialTitleIsInferred: true,
      inventory: [
        "LegalEase Washington/JU10_0300_MTAFseal.doc",
        "LegalEase Washington/JU10_0315_NT of Resp MT to Seal Records of JU Offender  13.50.050.doc",
        "LegalEase Washington/JU 10_0320 Order re Sealing Records of Juvenile Offender_2022 01.pdf"
      ],
      evidence: [
        "src/lib/legal-authority/routes/single-routes.json WA:juvenile-record-sealing-under-rcw-13-50-260 packetComponents: [\"Motion to seal\", \"Release or completion proof\", \"Restitution proof\"].",
        "data/rcap-all50/nationwide-source-inventory.json records the three JU 10.03xx juvenile sealing pattern forms under LegalEase Washington/. The form numbers are carried in the file names.",
        "The eighteen Washington corpus files are the Blake vacatur series and the CR 08.09xx and CrRLJ 09.0xxx adult vacatur forms. None of the JU series was promoted into the verified corpus."
      ],
      notes: "The titles are read from the file names, which carry the form numbers verbatim; the numbers are the identity that matters for acquisition. The captured JU 10.0315 cites RCW 13.50.050 while this route runs under RCW 13.50.260, so currentness must be confirmed when the files are promoted. The work is promotion and verification, not acquisition."
    }]
  },

  // -- Georgia packet sets ---------------------------------------------------
  ...Object.fromEntries([
    ["ga-deaddocket-j3-set", ["A motion for record restriction of a dead-docketed charge under O.C.G.A. 35-3-37(j)(3), with a proposed order, certificate of service and attachments.", "ga-deaddocket-j3"]],
    ["ga-felony-j1-set", ["A motion for record restriction of a dismissed felony charge under O.C.G.A. 35-3-37(j)(1), with a proposed order, certificate of service and attachments.", "ga-felony-j1"]],
    ["ga-fugitive-j5-set", ["A petition for record restriction of a fugitive-warrant arrest under O.C.G.A. 35-3-37(j)(5), with a proposed order, certificate of service and attachments.", "ga-fugitive-j5"]],
    ["ga-misd-j4-set", ["A petition for misdemeanour conviction record restriction and sealing under O.C.G.A. 35-3-37(j)(4), with a proposed order, certificate of service and attachments.", "ga-misd-j4"]],
    ["ga-pardon-j7-set", ["A petition for restriction and sealing of a pardoned felony under O.C.G.A. 35-3-37(j)(7), with a proposed order, certificate of service and attachments.", "ga-pardon-j7"]],
    ["ga-seal-m-set", ["A motion to seal the clerk of court's file under O.C.G.A. 35-3-37(m), with a proposed order, certificate of service and attachments.", "ga-seal-m"]],
    ["ga-vacated-j2-set", ["A motion for record restriction after a vacated or reversed conviction under O.C.G.A. 35-3-37(j)(2), with a proposed order, certificate of service and attachments.", "ga-vacated-j2"]]
  ].map(([groupId, [need, track]]) => [groupId, {
    needs: [{
      need,
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Georgia court of conviction or of the pending charge (destination; Georgia publishes no statewide form for a section 35-3-37 court filing)",
      evidence: [
        `data/record-clearing/legal-design-intake/GA.memo.json track ${track}: every component -- primary filing, proposed order, certificate of service and attachments -- is carried in customPleadingSpecs, and no official form is assigned.`,
        "src/lib/rcap-engine/compiled/profiles/GA-georgia.json sourceFormStatements: \"Georgia uses a mix of a GBI agency form (for non-conviction restriction) and court petitions\"; the court routes are described as petitions with proposed orders.",
        "No Georgia file appears in the verified corpus and no officialFormAssignment exists for any Georgia track."
      ],
      notes: GJP_NOT_OFFICIAL
    }]
  }])),
  "ga-jail-k2-set": {
    needs: [{
      need: "A written request to a county or municipal jail to restrict access to booking records under O.C.G.A. 35-3-37(k)(2).",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "The county or municipal jail or detention centre holding the booking records (recipient; no form is issued)",
      evidence: [
        "data/record-clearing/legal-design-intake/GA.memo.json track ga-jail-k2, destination detail: \"The written request goes directly to the facility. The facility must restrict access ... within 30 days of the request. No court is involved.\" The components are carried as custom pleadings.",
        "No Georgia file appears in the verified corpus and no officialFormAssignment exists for the track."
      ],
      notes: "The memo keeps open \"whether any Georgia county or municipal jail or detention center publishes its own required form or intake route\", which would govern over the generated letter. That is local variation across facilities, not a statewide acquisition target."
    }]
  },
  "ga-nonconv-post2013-set": {
    needs: [{
      need: "A restriction request to the prosecuting attorney for the county of arrest for a post-July-2013 non-conviction.",
      role: "primary_filing",
      status: "RESOLVED_NO_OFFICIAL_FORM",
      issuingAuthority: "Prosecuting attorney for the county of arrest, then the Georgia Crime Information Center (no statewide form is issued for this route)",
      evidence: [
        "data/record-clearing/legal-design-intake/GA.memo.json track ga-nonconv-post2013, unresolved question: \"Which county prosecuting attorney offices require their own local intake form for a restriction request, and what those forms require. No statewide form exists for this route ...\"",
        "src/lib/rcap-engine/compiled/profiles/GA-georgia.json sourceFormStatements: \"For post-July-2013 arrests, no form is needed if the qualifying disposition was entered into GCIC; the person contacts the prosecutor to confirm.\""
      ],
      notes: "The GBI/GCIC Request to Restrict Arrest Record is the adjacent Georgia agency form, and the nationwide inventory holds a capture of it. The same profile records that it is used mainly for pre-July-2013 arrests or to correct a record that was not auto-restricted, so it is not this route's document.",
      adjacentDocumentInRawInventory: {
        inventory: "LegalEase Georgia/Request to Restrict Record Application and Instructions form.pdf",
        role: "The GBI/GCIC Request to Restrict Arrest Record application, for the pre-July-2013 and correction routes rather than this one."
      }
    }]
  },

  // -- Arkansas packet sets --------------------------------------------------
  "ar-act346-set": {
    unresolvedReason: "COMPANION_DOCUMENT_ABSENT_FROM_EVERY_INDEX",
    needs: [{
      sourceId: "official-form:ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS",
      need: "The ACIC petition counterpart to the Act 346 order to dismiss and seal.",
      role: "primary_filing",
      status: "UNRESOLVED",
      issuingAuthority: ACIC,
      evidence: [
        "The verified corpus holds twenty-two ACIC documents -- twelve orders and ten petitions -- and the overlay source-records under data/rcap-all50/overlays/production/arkansas/ carry the official title of each. The Act 346 set among them is the Order to Dismiss and Seal First Offenders Under Act 346 and Act 1460 and the Order of Probation Under Act 346 and Act 1460. There is no Act 346 petition.",
        "The nationwide inventory's twenty normalised ACIC captures and three legacy Arkansas petition captures likewise contain no Act 346 petition.",
        "data/record-clearing/legal-design-intake/AR.memo.json track ar-act346 assigns officialFormId ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS but supplies no source URL for it."
      ],
      notes: "Every other ACIC route in this batch pairs a petition with an order. Act 346 is the exception in both indexes, which is consistent either with a petition that was never captured or with a route where the court enters the dismiss-and-seal order without a separate participant petition. The repository does not distinguish the two, and naming a petition title on the strength of the order's title would be a guess about whether the document exists at all.",
      whatWouldResolveIt: "The ACIC criminal-history forms index the memo already names, read for whether an Act 346 petition is published; or a legal-design determination that the Act 346 route files no separate petition.",
      correctsTheMemo: "The AR memo records that the Act 346 order and the order of probation \"has not been acquired\". Both are in fact held, at REV-2014-01-01 and REV-2014-08-25. Only the petition is missing."
    }]
  },
  "ar-cs-possession-seal-set": {
    needs: [
      {
        sourceId: "official-form:ACIC-PETITION-TO-SEAL-CS-POSSESSION",
        need: "The ACIC petition to seal a controlled-substance possession conviction under A.C.A. 16-90-1407.",
        role: "primary_filing",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Petition to Seal Conviction for Possession of Controlled or Counterfeit Substance",
        corpus: ["AR", "AR-ACIC-PETITION-TO-SEAL-CONTROLLED-OR-COUNTERFEIT-SUBSTANCE-POSSE"],
        evidence: [
          "data/rcap-all50/overlays/production/arkansas/ carries the official title against this document id.",
          "data/record-clearing/legal-design-intake/AR.memo.json track ar-cs-possession-seal assigns this component to the controlled-substance petition."
        ],
        notes: ACIC_NUMBERING,
        correctsTheMemo: "The memo records this petition and order pair as \"not been acquired\". Both are held."
      },
      {
        sourceId: "official-form:ACIC-ORDER-TO-SEAL-CS-POSSESSION",
        need: "The ACIC order counterpart for the same route.",
        role: "proposed_order",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Order to Seal Conviction for Possession of Controlled or Counterfeit Substance",
        corpus: ["AR", "AR-ACIC-ORDER-TO-SEAL-CONTROLLED-OR-COUNTERFEIT-SUBSTANCE-POSSESSI"],
        evidence: ["data/rcap-all50/overlays/production/arkansas/ carries the official title against this document id."],
        notes: ACIC_NUMBERING
      }
    ]
  },
  "ar-drug-court-set": {
    needs: [
      {
        sourceId: "official-form:ACIC-PETITION-DRUG-COURT",
        need: "The ACIC drug-court petition under A.C.A. 16-98-303. The label covers two documents, not one: Arkansas publishes separate pre-adjudication and post-adjudication petitions.",
        role: "primary_filing",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Petition to Dismiss and Seal Offense in Pre-Adjudication Drug Court Proceeding; and Petition to Dismiss and Seal Offense in Post-Adjudication Drug Court Proceeding",
        corpus: ["AR", "AR-ACIC-PETITION-TO-DISMISS-AND-SEAL-PRE-ADJUDICATION-DRUG-COURT-O"],
        alsoCorpus: [["AR", "AR-ACIC-PETITION-TO-DISMISS-AND-SEAL-POST-ADJUDICATION-DRUG-COURT"]],
        evidence: [
          "data/record-clearing/legal-design-intake/AR.memo.json track ar-drug-court records the outstanding item as \"The ACIC drug court pre-adjudication and post-adjudication petition and order pairs\", which is what settles that the single census label covers both branches.",
          "data/rcap-all50/overlays/production/arkansas/ carries both official titles."
        ],
        notes: `Both are held. ${ACIC_NUMBERING} The census label should be split in two: one label that resolves to two documents cannot be reconciled by any matcher, which is why this row could not resolve upstream.`,
        correctsTheMemo: "The memo records both pairs as not acquired. All four documents are held."
      },
      {
        sourceId: "official-form:ACIC-ORDER-DRUG-COURT",
        need: "The ACIC drug-court order counterparts, likewise two documents.",
        role: "proposed_order",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Order to Dismiss and Seal Offense in Pre-Adjudication Drug Court Proceeding; and Order to Dismiss and Seal Offense in Post-Adjudication Drug Court Proceeding",
        corpus: ["AR", "AR-ACIC-ORDER-TO-DISMISS-AND-SEAL-PRE-ADJUDICATION-DRUG-COURT-OFFE"],
        alsoCorpus: [["AR", "AR-ACIC-ORDER-TO-DISMISS-AND-SEAL-POST-ADJUDICATION-DRUG-COURT-OFF"]],
        evidence: ["data/rcap-all50/overlays/production/arkansas/ carries both official titles."],
        notes: ACIC_NUMBERING
      }
    ]
  },
  "ar-felony-seal-set": {
    needs: [
      {
        sourceId: "official-form:ACIC-UNIFORM-PETITION-TO-SEAL",
        need: "The ACIC petition for the felony branch, A.C.A. 16-90-1406.",
        role: "primary_filing",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Petition to Seal Felony Under Act 1460 of 2013",
        corpus: ["AR", "AR-ACIC-PETITION-TO-SEAL-FELONY-UNDER-ACT-1460"],
        evidence: [
          "data/record-clearing/legal-design-intake/AR.memo.json track ar-felony-seal is \"Petition to Seal an Eligible Felony Conviction, A.C.A. 16-90-1406\", and its outstanding item is \"Confirm the current posted felony petition and order revisions\" -- the felony branch, not a generic uniform form.",
          "data/rcap-all50/overlays/production/arkansas/ carries the official title against this document id."
        ],
        notes: `There is no single ACIC \"uniform\" petition. ACIC publishes offence-specific petitions, and the census label resolves by branch: felony here, misdemeanours on the sibling track. ${ACIC_NUMBERING}`
      },
      {
        sourceId: "official-form:ACIC-UNIFORM-ORDER-TO-SEAL",
        need: "The ACIC order counterpart for the felony branch.",
        role: "proposed_order",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Order to Seal Felony Under Act 1460 of 2013",
        corpus: ["AR", "AR-ACIC-ORDER-TO-SEAL-FELONY-UNDER-ACT-1460"],
        evidence: ["data/rcap-all50/overlays/production/arkansas/ carries the official title against this document id."],
        notes: ACIC_NUMBERING
      }
    ]
  },
  "ar-misdemeanor-seal-set": {
    needs: [
      {
        sourceId: "official-form:ACIC-UNIFORM-PETITION-TO-SEAL",
        need: "The ACIC petition for the misdemeanour branch, A.C.A. 16-90-1405.",
        role: "primary_filing",
        status: "RESOLVED_NOT_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Petition to Seal Misdemeanors Under Act 1460 of 2013",
        officialTitleIsInferred: true,
        evidence: [
          "data/record-clearing/legal-design-intake/AR.memo.json track ar-misdemeanor-seal is \"Petition to Seal a Misdemeanor or Violation Conviction, A.C.A. 16-90-1405\", so the same census label resolves to the misdemeanour branch here and to the felony branch on the sibling track.",
          "The corpus holds the Order to Seal Misdemeanors Under Act 1460 of 2013 but no misdemeanour petition; among the twenty-two ACIC documents held, the misdemeanour branch is the only one whose order is held without its petition.",
          "The title is taken from the held order of the same branch, whose overlay source-record carries it."
        ],
        candidateInRawInventory: {
          inventory: "LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf",
          identityBasis: "A legacy Arkansas capture named as the misdemeanour petition and dated 1 August 2023. It carries no overlay source-record, so its identity rests on the file name; two sibling legacy captures of the same vintage -- the felony petition and the nolle prosequi petition -- were promoted into the corpus and this one was not."
        },
        notes: `Verify the candidate capture before commissioning acquisition; if it is the current ACIC misdemeanour petition the work is promotion rather than acquisition. ${ACIC_NUMBERING}`
      },
      {
        sourceId: "official-form:ACIC-UNIFORM-ORDER-TO-SEAL",
        need: "The ACIC order counterpart for the misdemeanour branch.",
        role: "proposed_order",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Order to Seal Misdemeanors Under Act 1460 of 2013",
        corpus: ["AR", "AR-ACIC-ORDER-TO-SEAL-MISDEMEANORS-UNDER-ACT-1460"],
        evidence: ["data/rcap-all50/overlays/production/arkansas/ carries the official title against this document id."],
        notes: ACIC_NUMBERING
      }
    ]
  },
  "ar-nonconviction-seal-set": {
    needs: [
      {
        sourceId: "official-form:ACIC-PETITION-TO-SEAL-NONCONVICTION",
        need: "The ACIC non-conviction petition under A.C.A. 16-90-1410.",
        role: "primary_filing",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Petition to Seal Records of Nolle Prosequi, Dismissals, Judgments of Acquittal, and Charges Not Filed",
        corpus: ["AR", "AR-ACIC-PETITION-TO-SEAL-NOLLE-PROSEQUI-DISMISSAL-ACQUITTAL-OR-NO"],
        evidence: [
          "data/rcap-all50/overlays/production/arkansas/ carries the official title against this document id.",
          "data/record-clearing/legal-design-intake/AR.memo.json track ar-nonconviction-seal is the non-conviction route under 16-90-1410."
        ],
        revisionCurrencyDoubt: true,
        notes: `The memo records that \"ACIC links a 2023 revision of the companion order while the petition is a 2020 revision. Pull both.\" The held pair carries exactly that divergence -- petition REV-2020-04-22, order REV-2023-10-25 -- so the open work is a currency check on the petition, not an acquisition. ${ACIC_NUMBERING}`
      },
      {
        sourceId: "official-form:ACIC-ORDER-TO-SEAL-NONCONVICTION",
        need: "The ACIC order counterpart for the non-conviction route.",
        role: "proposed_order",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Order to Seal Records of Nolle Prosequi, Dismissals, Judgments of Acquittal, and Charges Not Filed",
        corpus: ["AR", "AR-ACIC-ORDER-TO-SEAL-NOLLE-PROSEQUI-DISMISSAL-ACQUITTAL-OR-NO-CHA"],
        evidence: ["data/rcap-all50/overlays/production/arkansas/ carries the official title against this document id."],
        notes: ACIC_NUMBERING
      }
    ]
  },
  "ar-veterans-court-set": {
    needs: [
      {
        sourceId: "official-form:ACIC-PETITION-VETERANS-COURT",
        need: "The ACIC veterans treatment court petition under A.C.A. 16-101-101 et seq.",
        role: "primary_filing",
        status: "RESOLVED_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Petition to Dismiss and Seal Offense in Veterans Treatment Specialty Court Proceeding",
        corpus: ["AR", "AR-ACIC-PETITION-TO-DISMISS-AND-SEAL-VETERANS-TREATMENT-SPECIALTY"],
        evidence: ["data/rcap-all50/overlays/production/arkansas/ carries the official title against this document id."],
        notes: ACIC_NUMBERING,
        correctsTheMemo: "The memo records the veterans petition and order pair as not acquired. The petition is held; only the order is missing."
      },
      {
        sourceId: "official-form:ACIC-ORDER-VETERANS-COURT",
        need: "The ACIC order counterpart for the veterans treatment court route.",
        role: "proposed_order",
        status: "RESOLVED_NOT_HELD",
        issuingAuthority: ACIC,
        officialTitle: "Order to Dismiss and Seal Offense in Veterans Treatment Specialty Court Proceeding",
        officialTitleIsInferred: true,
        evidence: [
          "The veterans petition is the only ACIC petition held whose order counterpart is absent from both the corpus and the nationwide inventory.",
          "The title follows the ACIC pairing observed across the eleven other petition-and-order pairs in the overlay source-records, in which the order's title is the petition's title with \"Petition\" replaced by \"Order\". ACIC's own wording for this order is not recorded in the repository."
        ],
        notes: `Acquire from the ACIC criminal-history forms index, which the memo already names as the official source. The title is inferred from the pairing and no form number is asserted. ${ACIC_NUMBERING}`
      }
    ]
  },

  // -- Florida packet sets ---------------------------------------------------
  "fl-administrative-set": {
    needs: [{
      sourceId: "official-form:FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION",
      need: "The FDLE application for administrative expunction under section 943.0581, Fla. Stat.",
      role: "primary_filing",
      status: "RESOLVED_NOT_HELD",
      issuingAuthority: FDLE,
      formNumber: null,
      formNumberNotEstablished: true,
      officialTitle: "The FDLE administrative expunction application, published on the FDLE seal-and-expunge process pages.",
      officialTitleIsInferred: true,
      evidence: [
        "data/record-clearing/legal-design-intake/FL.memo.json track fl-administrative: primary_filing officialFormId FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION; the open item is \"Current FDLE application and instructions specific to this track have not been acquired.\"",
        "The five Florida corpus files are FDLE 40-021 in its expunction and sealing variants, FDLE 40-026 and two circuit packets. The nationwide inventory adds FDLE 40-025 and FDLE 40-028. No administrative expunction application appears in either index."
      ],
      notes: "FDLE numbers its applications in the 40-0xx series -- 40-021, 40-025, 40-026 and 40-028 are all recorded here -- so this application very likely carries one too. That number is not established anywhere committed and is not guessed. The issuing authority and the acquisition point are determinate.",
      whatWouldNarrowIt: "The FDLE seal-and-expunge forms listing, which the route already carries as a source URL, would supply the number and revision at acquisition time."
    }]
  },
  "fl-early-juvenile-set": {
    needs: [{
      sourceId: "official-form:FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION",
      need: "The FDLE application for early juvenile expunction under section 943.0515, Fla. Stat.",
      role: "primary_filing",
      status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
      issuingAuthority: FDLE,
      formNumber: "FDLE 40-028",
      officialTitle: "Application for Early Juvenile Expunction",
      inventory: ["LegalEase Florida/source-gated/FDLE40-028__application-for-early-juvenile-expunction__rev-2019-10.pdf"],
      evidence: [
        "data/rcap-all50/nationwide-source-inventory.json records the acquired file under its normalised name, which carries the form number, the title and revision 2019-10.",
        "data/record-clearing/legal-design-intake/FL.memo.json track fl-early-juvenile assigns the early-juvenile application as the primary filing."
      ],
      notes: "The memo's open item -- \"Current FDLE application and instructions specific to this track have not been acquired\" -- is out of date against the inventory. The file exists; it was never promoted into the verified corpus, which holds only five Florida files. The work is promotion and verification."
    }]
  },
  "fl-juvenile-diversion-set": {
    needs: [{
      sourceId: "official-form:FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION",
      need: "The FDLE application for juvenile diversion expunction under section 943.0582, Fla. Stat.",
      role: "primary_filing",
      status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
      issuingAuthority: FDLE,
      formNumber: "FDLE 40-025",
      officialTitle: "Application for Juvenile Diversion Expunction",
      inventory: ["LegalEase Florida/source-gated/FDLE40-025__application-for-juvenile-diversion-expunction__rev-2022-07.pdf"],
      evidence: [
        "data/rcap-all50/nationwide-source-inventory.json records the acquired file under its normalised name, carrying the form number, title and revision 2022-07.",
        "data/record-clearing/legal-design-intake/FL.memo.json track fl-juvenile-diversion assigns the juvenile-diversion application as the primary filing."
      ],
      notes: "Held outside the verified corpus, like the early-juvenile application. Promotion and verification, not acquisition."
    }]
  },
  "fl-self-defense-set": {
    needs: [{
      sourceId: "official-form:FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION",
      need: "The FDLE certificate of eligibility application for lawful self-defence expunction under section 943.0578, Fla. Stat.",
      role: "primary_filing",
      status: "RESOLVED_HELD",
      issuingAuthority: FDLE,
      formNumber: "FDLE 40-026",
      officialTitle: "Application for a Certificate of Eligibility for Lawful Self-Defense Expunction",
      corpus: ["FL", "FDLE40-026"],
      evidence: [
        "The corpus holds FDLE40-026 at REV-2019-10 under its full title.",
        "data/record-clearing/legal-design-intake/FL.memo.json track fl-self-defense assigns the self-defence application as the primary filing."
      ],
      notes: "The memo records this application as not acquired. It is held."
    }]
  },
  "fl-expunction-set": {
    needs: [
      {
        sourceId: "official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION",
        need: "The FDLE certificate of eligibility application for the court-ordered expunction route, section 943.0585.",
        role: "primary_filing",
        status: "RESOLVED_HELD",
        issuingAuthority: FDLE,
        formNumber: "FDLE 40-021 (expunction variant)",
        officialTitle: "Application for a Certificate of Eligibility for Expunction",
        corpus: ["FL", "FDLE40-021-EXPUNCTION"],
        evidence: [
          "data/record-clearing/legal-design-intake/FL.memo.json track fl-expunction is \"Court-Ordered Expunction, 943.0585, Fla. Stat.\", which selects the expunction variant.",
          "FDLE publishes 40-021 in two variants and the corpus holds both, at REV-2019-10."
        ],
        notes: "One census label covers two distinct FDLE forms across this batch: the expunction variant here and on the ten-year bridge, the sealing variant on fl-sealing. The label cannot resolve without the route, which is why it defeated the reconciler."
      },
      {
        sourceId: "official-form:FL-RULE-3.989-PETITION",
        need: "The petition to expunge prescribed by Fla. R. Crim. P. 3.989.",
        role: "primary_filing",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        labelIsStatuteOrRuleCitation: true,
        citationImplies: "Rule 3.989 of the Florida Rules of Criminal Procedure prescribes the petition, the sworn statement and the order for sealing and expunction. It is a rule citation, not a form number, and the rule text carries the prescribed forms.",
        issuingAuthority: "Supreme Court of Florida (the rule); the petition is filed in the circuit or county court of the circuit of arrest",
        inventory: ["LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf"],
        evidence: [
          "src/lib/rcap-engine/compiled/profiles/FL-florida.json sourceFormStatements: \"Petition to Seal / Expunge -- Court pleading under Fla. R. Crim. P. 3.692 and 943.059 / 943.0585\"; \"Proposed Order to Seal / Expunge -- Fla. R. Crim. P. 3.989 form order for the judge's signature.\"",
          "data/record-clearing/legal-design-specifications.json assigns FL-RULE-3.989-PETITION as an officialFormAssignment, which is what put a rule citation into the census's form namespace.",
          "The nationwide inventory holds the January 2026 Florida Rules of Criminal Procedure, and separately the Supreme Court of Florida opinion SC19-1983 amending rules 3.692, 3.693, 3.694, 3.989 and 3.9895."
        ],
        notes: "No separately published form binary for Rule 3.989 is recorded anywhere in the repository, and none should be hunted for on the strength of the label. The acquisition target is the rule text, which is held in the inventory captures; the pleading itself is composed from it.",
        alsoInventory: ["LegalEase Florida/reference-only/Florida-Supreme-Court__SC19-1983__rules-3.692-3.693-3.694-3.989-and-3.9895-amendments__2019-12-19.pdf"]
      },
      {
        sourceId: "official-form:FL-RULE-3.989-SWORN-STATEMENT",
        need: "The sworn statement in support of the petition, prescribed by the same rule.",
        role: "affidavit",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        labelIsStatuteOrRuleCitation: true,
        citationImplies: "The affidavit prescribed within Fla. R. Crim. P. 3.989, not a separately numbered form.",
        issuingAuthority: "Supreme Court of Florida (the rule)",
        inventory: ["LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf"],
        evidence: [
          "src/lib/rcap-engine/compiled/profiles/FL-florida.json sourceFormStatements: \"Affidavit in support -- Sworn affidavit accompanying the petition, attesting to eligibility.\"",
          "The rule text is held in the January 2026 Rules of Criminal Procedure capture."
        ],
        notes: "Same finding as the petition: a rule citation, satisfied by the held rule text."
      },
      {
        sourceId: "official-form:FL-RULE-3.989-ORDER",
        need: "The order to expunge prescribed by the same rule.",
        role: "proposed_order",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        labelIsStatuteOrRuleCitation: true,
        citationImplies: "The order prescribed within Fla. R. Crim. P. 3.989, not a separately numbered form.",
        issuingAuthority: "Supreme Court of Florida (the rule)",
        inventory: ["LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf"],
        evidence: [
          "src/lib/rcap-engine/compiled/profiles/FL-florida.json describes the Rule 3.989 form order for the judge's signature.",
          "The rule text is held in the January 2026 Rules of Criminal Procedure capture."
        ],
        notes: "Same finding as the petition."
      }
    ]
  },
  "fl-sealing-set": {
    needs: [
      {
        sourceId: "official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION",
        need: "The FDLE certificate of eligibility application for the court-ordered sealing route, section 943.059.",
        role: "primary_filing",
        status: "RESOLVED_HELD",
        issuingAuthority: FDLE,
        formNumber: "FDLE 40-021 (sealing variant)",
        officialTitle: "Application for a Certificate of Eligibility for Sealing",
        corpus: ["FL", "FDLE40-021-SEALING"],
        evidence: [
          "data/record-clearing/legal-design-intake/FL.memo.json track fl-sealing is \"Court-Ordered Sealing, 943.059, Fla. Stat.\", which selects the sealing variant.",
          "The corpus holds the sealing variant at REV-2019-10."
        ],
        notes: "The sealing variant, not the expunction variant used by fl-expunction and fl-10yr-bridge. The single census label must be split by route before it can reconcile."
      },
      {
        sourceId: "official-form:FL-RULE-3.989-PETITION",
        need: "The petition to seal prescribed by Fla. R. Crim. P. 3.989.",
        role: "primary_filing",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        labelIsStatuteOrRuleCitation: true,
        citationImplies: "A rule citation, not a form number. Rule 3.989 prescribes the petition, sworn statement and order for sealing and expunction.",
        issuingAuthority: "Supreme Court of Florida (the rule)",
        inventory: ["LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf"],
        evidence: [
          "data/record-clearing/legal-design-intake/FL.memo.json track fl-sealing cites \"Fla. R. Crim. P. 3.692, with forms at Rule 3.989\".",
          "The rule text is held in the January 2026 Rules of Criminal Procedure capture."
        ],
        notes: "No separately published Rule 3.989 form binary is recorded in the repository."
      },
      {
        sourceId: "official-form:FL-RULE-3.989-SWORN-STATEMENT",
        need: "The sworn statement in support of the petition to seal.",
        role: "affidavit",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        labelIsStatuteOrRuleCitation: true,
        citationImplies: "The affidavit prescribed within Fla. R. Crim. P. 3.989.",
        issuingAuthority: "Supreme Court of Florida (the rule)",
        inventory: ["LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf"],
        evidence: ["The rule text is held in the January 2026 Rules of Criminal Procedure capture."],
        notes: "Same finding as the petition."
      },
      {
        sourceId: "official-form:FL-RULE-3.989-ORDER",
        need: "The order to seal prescribed by the same rule.",
        role: "proposed_order",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        labelIsStatuteOrRuleCitation: true,
        citationImplies: "The order prescribed within Fla. R. Crim. P. 3.989.",
        issuingAuthority: "Supreme Court of Florida (the rule)",
        inventory: ["LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf"],
        evidence: ["The rule text is held in the January 2026 Rules of Criminal Procedure capture."],
        notes: "Same finding as the petition."
      }
    ]
  },
  "fl-10yr-bridge-set": {
    needs: [
      {
        sourceId: "official-form:FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION",
        need: "The fresh FDLE certificate of eligibility application on the ten-year seal-then-expunge bridge.",
        role: "primary_filing",
        status: "RESOLVED_HELD",
        issuingAuthority: FDLE,
        formNumber: "FDLE 40-021 (expunction variant)",
        officialTitle: "Application for a Certificate of Eligibility for Expunction",
        corpus: ["FL", "FDLE40-021-EXPUNCTION"],
        evidence: [
          "data/record-clearing/legal-design-intake/FL.memo.json track fl-10yr-bridge is \"The Ten-Year Seal-Then-Expunge Bridge, 943.0585\", and its destination detail requires \"a fresh screening and a new FDLE certificate application\". Section 943.0585 is the expunction section, which selects the expunction variant.",
          "The corpus holds the expunction variant at REV-2019-10."
        ],
        notes: "The route ends in expunction, so the expunction variant applies, not the sealing variant the participant used ten years earlier."
      },
      {
        sourceId: "official-form:FL-RULE-3.989-PETITION",
        need: "The petition to expunge prescribed by Fla. R. Crim. P. 3.989.",
        role: "primary_filing",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        labelIsStatuteOrRuleCitation: true,
        citationImplies: "A rule citation, not a form number.",
        issuingAuthority: "Supreme Court of Florida (the rule)",
        inventory: ["LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf"],
        evidence: ["The rule text is held in the January 2026 Rules of Criminal Procedure capture."],
        notes: "Same finding as on the expunction and sealing routes."
      },
      {
        sourceId: "official-form:FL-RULE-3.989-ORDER",
        need: "The order to expunge prescribed by the same rule.",
        role: "proposed_order",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        labelIsStatuteOrRuleCitation: true,
        citationImplies: "A rule citation, not a form number.",
        issuingAuthority: "Supreme Court of Florida (the rule)",
        inventory: ["LegalEase Florida/2026_07-JAN-Criminal-Procedure-Rules-1-1-2026.pdf"],
        evidence: ["The rule text is held in the January 2026 Rules of Criminal Procedure capture."],
        notes: "Same finding as on the expunction and sealing routes."
      }
    ]
  },

  // -- Iowa packet sets ------------------------------------------------------
  ...Object.fromEntries([
    ["ia-12346-set", { form: "Rule 2.86 Form 3", number: "Iowa R. Crim. P. 2.86 Form 3", title: "Application to Expunge Public Intoxication Records under Iowa Code section 123.46",
      inventory: "LegalEase Iowa/forms/IA-RULE-2.86-FORM-3__application-to-expunge-public-intoxication-records-123-46__rev-2022-01.pdf",
      status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
      note: "The Edition 1.2 acquisition record in data/rcap-all50/nationwide-source-inventory.json states that \"Iowa R. Crim. P. 2.86 Forms 1 and 3\" were taken from the Iowa Judicial Branch. The file is in the inventory; the verified corpus holds only Forms 4 and 5, so this is promotion, not acquisition." }],
    ["ia-901c2-set", { form: "Rule 2.86 Form 1", number: "Iowa R. Crim. P. 2.86 Form 1", title: "Application to Expunge Court Record under Iowa Code section 901C.2",
      inventory: "LegalEase Iowa/forms/IA-RULE-2.86-FORM-1__application-to-expunge-court-record-901c-2__rev-2022-01.pdf",
      status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
      note: "Acquired in the Edition 1.2 pass alongside Form 3 and recorded in the inventory at revision 2022-01. Not promoted into the verified corpus." }]
  ].map(([groupId, spec]) => [groupId, {
    unresolvedReason: "COMPANION_DOCUMENT_ABSENT_FROM_EVERY_INDEX",
    needs: [
      {
        sourceId: `official-form:${spec.form}`,
        need: `The Iowa expungement application prescribed as ${spec.number}.`,
        role: "primary_filing",
        status: spec.status,
        issuingAuthority: IJB,
        formNumber: spec.number,
        officialTitle: spec.title,
        inventory: [spec.inventory],
        evidence: [
          "data/rcap-all50/nationwide-source-inventory.json records the file under a normalised name carrying the form number, subject and revision.",
          `data/record-clearing/legal-design-intake/IA.memo.json assigns ${spec.form} as the primary filing for this track.`
        ],
        notes: spec.note
      },
      IOWA_CERTIFICATION_NEED()
    ]
  }])),
  "ia-12347-set": {
    unresolvedReason: "COMPANION_DOCUMENT_ABSENT_FROM_EVERY_INDEX",
    needs: [IOWA_CERTIFICATION_NEED()]
  },
  "ia-7251-set": {
    unresolvedReason: "COMPANION_DOCUMENT_ABSENT_FROM_EVERY_INDEX",
    needs: [IOWA_CERTIFICATION_NEED()]
  },
  "ia-901c3-set": {
    unresolvedReason: "COMPANION_DOCUMENT_ABSENT_FROM_EVERY_INDEX",
    needs: [
      {
        sourceId: "official-form:Rule 2.86 Form 2",
        need: "The Iowa expungement application prescribed as Iowa R. Crim. P. 2.86 Form 2.",
        role: "primary_filing",
        status: "RESOLVED_NOT_HELD",
        issuingAuthority: IJB,
        formNumber: "Iowa R. Crim. P. 2.86 Form 2",
        officialTitle: "Application to Expunge Misdemeanor Court Records under Iowa Code section 901C.3",
        officialTitleIsInferred: true,
        evidence: [
          "data/record-clearing/legal-design-intake/IA.memo.json track ia-901c3 assigns Rule 2.86 Form 2 as the primary filing; the track is the misdemeanour route under Iowa Code section 901C.3.",
          "The Edition 1.2 acquisition record names Forms 1 and 3 only, so Form 2 was not part of that pass. The verified corpus holds Forms 4 and 5 only.",
          "The title follows the naming pattern the Iowa Judicial Branch uses across the normalised Forms 1, 3, 4 and 5 captures, each of which names the record type and its Code section."
        ],
        candidateInRawInventory: {
          inventory: "LegalEase Iowa/r286_f2_expngmisd901c3_6F5CCD02F88E6.pdf",
          identityBasis: "A legacy unnormalised capture whose file name encodes form 2, misdemeanour expungement and section 901C.3. It carries no revision and was not normalised into the forms directory alongside Forms 1, 3, 4 and 5."
        },
        notes: "Verify the legacy capture's currency before acquiring: the sibling forms were re-acquired at revision 2022-01 or 2024-08 and this one was not."
      },
      {
        sourceId: "official-form:Rule 2.86 Form 2 attached sheet",
        need: "The continuation sheet used where Form 2 runs out of room.",
        role: "continuation",
        status: "RESOLVED_NOT_A_SEPARATE_DOCUMENT",
        issuingAuthority: IJB,
        evidence: [
          "data/record-clearing/legal-design-intake/IA.memo.json track ia-901c3 carries this as a component of role \"continuation\" against Form 2, not as an independent filing.",
          "No document of this description appears in the corpus, the overlay source-records or the nationwide inventory, in Iowa or anywhere else."
        ],
        notes: "The attached sheet belongs to Form 2. Acquiring Form 2 acquires it, and it must not be commissioned as a separate document."
      },
      IOWA_CERTIFICATION_NEED()
    ]
  },
  "ia-dci77-set": {
    needs: [
      {
        sourceId: "official-form:DCI-77 Criminal History Record Check Request Form",
        need: "The Iowa criminal history record check request the section 901C.3 route requires.",
        role: "primary_filing",
        status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
        issuingAuthority: "Iowa Department of Public Safety, Division of Criminal Investigation",
        formNumber: "DCI-77",
        officialTitle: "Criminal History Record Check Request Form",
        inventory: ["LegalEase Iowa/forms/DCI-76-and-DCI-77__criminal-history-record-check-billing-and-request-forms-fillable__source-2026.pdf"],
        evidence: [
          "data/rcap-all50/nationwide-source-inventory.json group1SourceCompletion records \"the Iowa DPS combined DCI-76/DCI-77 request packet\" downloaded from the issuing agency's official site, and the file is in the Iowa inventory.",
          "data/record-clearing/legal-design-intake/IA.memo.json track ia-dci77 assigns DCI-77 as the primary filing with that same file as its source."
        ],
        notes: "DCI-76 and DCI-77 are published as one combined fillable packet, so the two census labels resolve to a single file. The verified corpus holds neither; the work is promotion."
      },
      {
        sourceId: "official-form:DCI-76 Criminal History Record Check Billing Form",
        need: "The billing form that accompanies the DCI-77 request.",
        role: "attachment",
        status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
        issuingAuthority: "Iowa Department of Public Safety, Division of Criminal Investigation",
        formNumber: "DCI-76",
        officialTitle: "Criminal History Record Check Billing Form",
        inventory: ["LegalEase Iowa/forms/DCI-76-and-DCI-77__criminal-history-record-check-billing-and-request-forms-fillable__source-2026.pdf"],
        evidence: [
          "The same combined packet carries both forms; the inventory's acquisition note names the pair explicitly."
        ],
        notes: "The same file as DCI-77. Two labels, one document."
      }
    ]
  },

  // -- Illinois packet sets --------------------------------------------------
  "il-cannabis-vacate-set": {
    needs: [
      ["official-form:CXP Motion to Vacate and Expunge", "primary_filing", "EXC-M 4702.2", "Motion to Vacate & Expunge Eligible Cannabis Convictions", "LegalEase Illinois/CXP Motion to Vacate and Expunge.pdf", "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/8562a938-0296-4236-9030-3217460e8b5c/CXP%20Motion%20to%20Vacate%20and%20Expunge.pdf"],
      ["official-form:CXP Additional Cannabis Convictions", "continuation", "EXC-AA 4706.2", "Additional Cannabis Convictions", "LegalEase Illinois/CXP Additional Cannabis Convictions.pdf", "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/85296a2c-ee02-41c9-b962-6fb1f797dc8e/CXP%20Additional%20Cannabis%20Convictions.pdf"],
      ["official-form:CXP Getting Started Motion to Vacate and Expunge", "instructions", "EXC-G 4700.2", "Getting Started Motion to Vacate & Expunge Eligible Cannabis Convictions", "LegalEase Illinois/CXP Getting Started Motion to Vacate and Expunge.pdf", "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/da1fc04d-1770-4e40-8a5c-527bd52ca7f9/CXP%20Getting%20Started%20Motion%20to%20Vacate%20and%20Expunge.pdf"],
      ["official-form:CXP Notice of Court Date for Motion", "local_addendum", "EXC-N 4703.2", "Notice of Court Date for Motion to Vacate & Expunge Eligible Cannabis Convictions", "LegalEase Illinois/CXP Notice of Court Date for Motion.pdf", "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/a9f72f2b-0bc7-482d-a301-9dc73e64e4b7/CXP%20Notice%20of%20Court%20Date%20for%20Motion.pdf"],
      ["official-form:CXP Additional Notice of Court Date", "continuation", "EXC-AM 4705.2", "Additional Notice of Court Date for Motion to Vacate & Expunge Eligible Cannabis Convictions", "LegalEase Illinois/CXP Additional Notice of Court Date.pdf", "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/62d19ea4-46a8-423b-9e42-b975974fc77b/CXP%20Additional%20Notice%20of%20Court%20Date.pdf"],
      ["official-form:CXP Order Granting or Denying Motion", "proposed_order", "EXC-O 4704.2", "Order Granting or Denying Motion to Vacate & Expunge Eligible Cannabis Convictions", "LegalEase Illinois/CXP Order Granting or Denying Motion.pdf", "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/0c788d57-5951-47d9-9946-dfc36b7d1d50/CXP%20Order%20Granting%20or%20Denying%20Motion.pdf"]
    ].map(([sourceId, role, formNumber, title, file, officialSourceUrl]) => ({
      sourceId,
      need: `The Illinois standardised cannabis-expungement form: ${title}.`,
      role,
      status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
      issuingAuthority: ILSC,
      formNumber,
      officialTitle: title,
      officialSourceUrl,
      currentRevision: "03/22",
      currentRevisionEvidence: "The issuer form number and 03/22 revision are printed on the current official PDF face and reconciled to the held inventory bytes in data/rcap-grade-a/route-obligation-census-v1/identity-resolution/il-shard/illinois-delta-against-canonical.json.",
      inventory: [file],
      evidence: [
        "data/rcap-all50/nationwide-source-inventory.json records the full CXP suite under LegalEase Illinois/.",
        "data/record-clearing/legal-design-intake/IL.memo.json track il-cannabis-vacate assigns all six CXP components and records the suite as approved 03/2022.",
        "The three Illinois files in the verified corpus are EXP-AD Request, EXP-AD Order Granting and the civil fee-waiver application; no CXP form was promoted."
      ],
      notes: "CXP is the publisher filename prefix; the issuer-assigned identifiers are in the EXC series. All six are held in the inventory, so the work is promotion and verification. The memo's open item is whether the 03/2022 suite remains accurate after the Clean Slate amendments, which is a currency question."
    }))
  },
  "il-exp-nonconv-set": {
    needs: [
      {
        sourceId: "official-form:EXP-AD Case List",
        need: "The Illinois EXP-AD case list that accompanies the request to expunge or seal.",
        role: "attachment",
        status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
        issuingAuthority: ILSC,
        formNumber: "ATJ 2902.1",
        officialTitle: "Case List for Request to Expunge and/or Seal Criminal Records",
        officialSourceUrl: "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/623b7a47-9164-49c2-a653-d8998100e6bb/EXP-AD%20Case%20List%20Request%20to%20Expunge%20Seal%20Records.pdf",
        currentRevision: "06/26",
        currentRevisionEvidence: "ATJ 2902.1 and 06/26 are printed on the current official PDF face and reconciled to SHA-256 b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c in data/rcap-grade-a/route-obligation-census-v1/identity-resolution/il-shard/illinois-delta-against-canonical.json.",
        inventory: ["LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf"],
        evidence: [
          "data/record-clearing/legal-design-intake/IL.memo.json track il-exp-nonconv assigns the Case List with its Illinois Courts source URL.",
          "The nationwide inventory holds the acquired file. The corpus holds the sibling EXP-AD Request and Order Granting but not the Case List."
        ],
        notes: "Two of the four EXP-AD forms this route needs were promoted into the verified corpus and two were not. The work here is promotion, not acquisition."
      },
      {
        sourceId: "official-form:EXP-AD Additional Cases Expungement",
        need: "The EXP-AD continuation sheet for additional expungement cases.",
        role: "continuation",
        status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
        issuingAuthority: ILSC,
        formNumber: "ATJ 2903.5",
        officialTitle: "Additional Arrests or Cases for Expungement",
        officialSourceUrl: "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/9cb2130f-056d-4962-a6e7-a592b4f4b4bb/EXP-AD%20Additional%20Cases%20Expungement.pdf",
        currentRevision: "06/26",
        currentRevisionEvidence: "ATJ 2903.5 and 06/26 are printed on the current official PDF face and reconciled to SHA-256 36ad55c62b891fb2ede8de8bddaeb023c1acc8cbb62880c426dfcdf289686f00 in data/rcap-grade-a/route-obligation-census-v1/identity-resolution/il-shard/illinois-delta-against-canonical.json.",
        inventory: ["LegalEase Illinois/EXP-AD Additional Cases Expungement.pdf"],
        evidence: [
          "data/record-clearing/legal-design-intake/IL.memo.json track il-exp-nonconv assigns this continuation component.",
          "The nationwide inventory holds the acquired file; the verified corpus does not."
        ],
        notes: "The inventory also holds the sealing counterpart, EXP-AD Additional Cases Sealing, which this route does not use."
      }
    ]
  },
  "il-exp-pardon-set": {
    needs: [{
      sourceId: "official-form:EXP-AD Case List",
      need: "The Illinois EXP-AD case list that accompanies the pardon-based request to expunge.",
      role: "attachment",
      status: "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS",
      issuingAuthority: ILSC,
      formNumber: "ATJ 2902.1",
      officialTitle: "Case List for Request to Expunge and/or Seal Criminal Records",
      officialSourceUrl: "https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/623b7a47-9164-49c2-a653-d8998100e6bb/EXP-AD%20Case%20List%20Request%20to%20Expunge%20Seal%20Records.pdf",
      currentRevision: "06/26",
      currentRevisionEvidence: "ATJ 2902.1 and 06/26 are printed on the current official PDF face and reconciled to SHA-256 b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c in data/rcap-grade-a/route-obligation-census-v1/identity-resolution/il-shard/illinois-delta-against-canonical.json.",
      inventory: ["LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf"],
      evidence: [
        "data/record-clearing/legal-design-intake/IL.memo.json track il-exp-pardon assigns the Case List with its Illinois Courts source URL.",
        "The nationwide inventory holds the acquired file; the verified corpus holds only EXP-AD Request, EXP-AD Order Granting and the civil fee-waiver application."
      ],
      notes: "The same file as on the non-conviction route. Promotion, not acquisition."
    }]
  }
};

/** Iowa's certification of service, which five separate Iowa tracks name and nothing identifies. */
function IOWA_CERTIFICATION_NEED() {
  return {
    sourceId: "official-form:Certification of Service by Mailing or Delivery",
    need: "The certification of service filed with an Iowa Rule 2.86 expungement application.",
    role: "certificate_of_service",
    status: "UNRESOLVED",
    issuingAuthority: IJB,
    evidence: [
      "data/record-clearing/legal-design-intake/IA.memo.json assigns a component with this officialFormId on all five Rule 2.86 tracks -- ia-12346, ia-12347, ia-7251, ia-901c2 and ia-901c3 -- and supplies no source URL for any of them, while supplying one for the Rule 2.86 application on the tracks where a file was acquired.",
      "No document of this title appears in the verified corpus, in the overlay source-records, or in the nationwide inventory, for Iowa or for any other state."
    ],
    notes: "Two readings fit the evidence and the repository does not separate them: the certification may be a block printed on the Rule 2.86 application forms themselves, in which case there is nothing to acquire, or it may be a distinct Iowa Judicial Branch form that was never captured. Commissioning acquisition on the second reading would be wasted if the first is true; recording it as held on the first would suppress a real gap if the second is true.",
    whatWouldResolveIt: "Reading the held Rule 2.86 Form 4 or Form 5 binary to see whether the certification is a section of the application, or the Iowa Judicial Branch forms index checked for a form of this title."
  };
}

// ---------------------------------------------------------------------------
// Selection: the first 83 SOURCE_IDENTITY_UNRESOLVED rows by worklistGroupId.
// ---------------------------------------------------------------------------
const unresolvedRows = reconciliation.rows
  .filter((row) => row.custodyClass === "SOURCE_IDENTITY_UNRESOLVED")
  .sort((a, b) => a.worklistGroupId.localeCompare(b.worklistGroupId));
if (unresolvedRows.length !== 166) fail(`expected 166 SOURCE_IDENTITY_UNRESOLVED rows, found ${unresolvedRows.length}`);
const batch = unresolvedRows.slice(0, BATCH_SIZE);

const families = new Map(worklist.packetFamilies.map((family) => [family.worklistGroupId, family]));

// The table must cover exactly the selection -- no more, no fewer.
const tableKeys = new Set(Object.keys(RESOLUTIONS));
const batchKeys = new Set(batch.map((row) => row.worklistGroupId));
for (const key of batchKeys) if (!tableKeys.has(key)) fail(`no resolution recorded for ${key}`);
for (const key of tableKeys) if (!batchKeys.has(key)) fail(`resolution recorded for ${key}, which is not in batch 1`);

// ---------------------------------------------------------------------------
// Emit.
// ---------------------------------------------------------------------------
const RESOLVED_STATUSES = new Set([
  "RESOLVED_HELD", "RESOLVED_HELD_OUTSIDE_VERIFIED_CORPUS", "RESOLVED_NOT_HELD",
  "RESOLVED_NO_OFFICIAL_FORM", "RESOLVED_NO_DOCUMENT_TO_ACQUIRE", "RESOLVED_NOT_A_SEPARATE_DOCUMENT"
]);

const rows = [];
for (const censusRow of batch) {
  const groupId = censusRow.worklistGroupId;
  const family = families.get(groupId);
  if (!family) fail(`${groupId} is not in the worklist`);
  const judgement = RESOLUTIONS[groupId];

  const unresolvedSourceIds = censusRow.documentSources.filter((s) => !s.resolved).map((s) => s.sourceId);
  const needSourceIds = (judgement.needs ?? []).map((n) => n.sourceId).filter(Boolean);
  // Every unresolved document source must be answered, and no need may invent one.
  for (const id of unresolvedSourceIds) {
    if (!needSourceIds.includes(id)) fail(`${groupId}: ${id} was left unresolved by the reconciler and this record does not answer it`);
  }
  for (const id of needSourceIds) {
    if (!unresolvedSourceIds.includes(id)) fail(`${groupId}: ${id} is answered here but is not an unresolved source of that row`);
  }

  const needs = judgement.needs.map((need) => {
    if (!STATUSES[need.status]) fail(`${groupId}: unknown status ${need.status}`);
    if (need.status === "UNRESOLVED" && !need.whatWouldResolveIt) fail(`${groupId}: an unresolved need must say what would resolve it`);
    const held = need.corpus ? heldInVerifiedCorpus(need.corpus) : null;
    const alsoHeld = (need.alsoCorpus ?? []).map(heldInVerifiedCorpus);
    const outside = (need.inventory ?? []).map(heldOutsideVerifiedCorpus);
    const alsoOutside = (need.alsoInventory ?? []).map(heldOutsideVerifiedCorpus);
    const related = (need.relatedHeldDocuments ?? []).map(heldInVerifiedCorpus);
    const candidate = need.candidateInRawInventory
      ? { ...heldOutsideVerifiedCorpus(need.candidateInRawInventory.inventory), identityBasis: need.candidateInRawInventory.identityBasis }
      : null;
    const adjacent = need.adjacentDocumentInRawInventory
      ? { ...heldOutsideVerifiedCorpus(need.adjacentDocumentInRawInventory.inventory), role: need.adjacentDocumentInRawInventory.role }
      : null;
    return {
      censusSourceId: need.sourceId ?? null,
      documentTheRouteNeeds: need.need,
      role: need.role,
      resolutionStatus: need.status,
      resolutionStatusMeans: STATUSES[need.status],
      identity: {
        issuingAuthority: need.issuingAuthority ?? null,
        formNumber: need.formNumber ?? null,
        formNumberNotEstablished: need.formNumberNotEstablished ?? false,
        officialTitle: need.officialTitle ?? null,
        officialTitleIsInferred: need.officialTitleIsInferred ?? false,
        ...(Object.hasOwn(need, "officialSourceUrl") ? { officialSourceUrl: need.officialSourceUrl } : {}),
        ...(Object.hasOwn(need, "currentRevision") ? { currentRevision: need.currentRevision } : {}),
        ...(Object.hasOwn(need, "currentRevisionEvidence") ? { currentRevisionEvidence: need.currentRevisionEvidence } : {})
      },
      labelIsStatuteOrRuleCitation: need.labelIsStatuteOrRuleCitation ?? false,
      citationImplies: need.citationImplies ?? null,
      heldInVerifiedCorpus: held,
      alsoHeldInVerifiedCorpus: alsoHeld.length > 0 ? alsoHeld : null,
      heldOutsideVerifiedCorpus: outside.length > 0 ? [...outside, ...alsoOutside] : null,
      candidateInRawInventory: candidate,
      adjacentDocumentInRawInventory: adjacent,
      relatedHeldDocuments: related.length > 0 ? related : null,
      revisionCurrencyDoubt: need.revisionCurrencyDoubt ?? false,
      evidence: need.evidence,
      notes: need.notes ?? null,
      basis: need.basis ?? null,
      correctsTheMemo: need.correctsTheMemo ?? null,
      whatWouldResolveIt: need.whatWouldResolveIt ?? null,
      whatWouldNarrowIt: need.whatWouldNarrowIt ?? null
    };
  });

  const unresolvedNeeds = needs.filter((n) => n.resolutionStatus === "UNRESOLVED");
  const rowStatus = unresolvedNeeds.length === 0 ? "RESOLVED"
    : unresolvedNeeds.length === needs.length ? "UNRESOLVED" : "PARTIALLY_RESOLVED";
  if (rowStatus !== "RESOLVED" && !judgement.unresolvedReason) fail(`${groupId}: an unresolved row must carry a reason code`);
  if (rowStatus === "RESOLVED" && judgement.unresolvedReason) fail(`${groupId}: a resolved row must not carry a reason code`);
  if (judgement.unresolvedReason && !UNRESOLVED_REASONS[judgement.unresolvedReason]) fail(`${groupId}: unknown reason ${judgement.unresolvedReason}`);

  rows.push({
    worklistGroupId: groupId,
    jurisdictions: censusRow.jurisdictions,
    routeCount: censusRow.routeCount,
    implementationStrategy: family.implementationStrategy ?? null,
    censusKind: censusRow.documentSourcesNamed === 0
      ? "names_no_document_shaped_source"
      : "names_a_label_that_does_not_resolve",
    documentSourcesNamed: censusRow.documentSourcesNamed,
    documentSourcesTheReconcilerResolved: censusRow.documentSources
      .filter((s) => s.resolved)
      .map((s) => ({ sourceId: s.sourceId, tier: s.tier, heldAs: s.heldAs })),
    resolution: rowStatus,
    unresolvedReason: judgement.unresolvedReason ?? null,
    unresolvedReasonMeans: judgement.unresolvedReason ? UNRESOLVED_REASONS[judgement.unresolvedReason] : null,
    needs
  });
}

const needsAll = rows.flatMap((r) => r.needs);
const counts = {
  rows: rows.length,
  rowsResolved: rows.filter((r) => r.resolution === "RESOLVED").length,
  rowsPartiallyResolved: rows.filter((r) => r.resolution === "PARTIALLY_RESOLVED").length,
  rowsUnresolved: rows.filter((r) => r.resolution === "UNRESOLVED").length,
  byCensusKind: {
    names_no_document_shaped_source: rows.filter((r) => r.censusKind === "names_no_document_shaped_source").length,
    names_a_label_that_does_not_resolve: rows.filter((r) => r.censusKind === "names_a_label_that_does_not_resolve").length
  },
  documentNeeds: needsAll.length,
  documentNeedsByStatus: Object.fromEntries(
    Object.keys(STATUSES).map((status) => [status, needsAll.filter((n) => n.resolutionStatus === status).length])
  )
};
const reasonCounts = {};
for (const row of rows) {
  if (!row.unresolvedReason) continue;
  reasonCounts[row.unresolvedReason] = (reasonCounts[row.unresolvedReason] ?? 0) + 1;
}
const reasonRanking = Object.entries(reasonCounts)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([reason, count]) => ({ reason, rows: count, means: UNRESOLVED_REASONS[reason] }));

const doc = {
  schemaVersion: "rcap-census-source-identity-resolution/v1",
  generatedBy: "scripts/grade-a-route-obligation-census/resolve-census-source-identity-batch-1.mjs",
  batch: 1,
  question: "For each census acquisition task whose source identity is unresolved, what document does the route actually need, and do we already hold it?",
  scope: {
    from: RECONCILIATION,
    selection: `the first ${BATCH_SIZE} of the ${unresolvedRows.length} SOURCE_IDENTITY_UNRESOLVED rows, sorted by worklistGroupId`,
    readOnly: [WORKLIST, CORPUS_INDEX, INVENTORY, "data/record-clearing/legal-design-specifications.json", "data/record-clearing/legal-design-intake/*.memo.json", "data/rcap-all50/overlays/**/source-record.json", "src/lib/rcap-engine/compiled/profiles/*.json", "src/lib/legal-authority/routes/*.json"]
  },
  nothingWasFetched: "Egress to court and agency hosts is refused in the environment this was produced in. Every identity here is resolved against committed indexes, and where the repository does not settle an identity that is recorded rather than filled in from anywhere else.",
  noFormNumberIsGuessed: "Where the repository establishes a document but not its number, formNumberNotEstablished is set and the issuing authority and title carry the identity. Where a title is reconstructed from a held counterpart it is marked officialTitleIsInferred. A wrong resolution sends someone to acquire the wrong document, so an unresolved row reported as unresolved is the better outcome.",
  whatResolutionDoesNotEstablish: "This record resolves identity and custody. It opens no commercial route, creates no fulfilment record, proves no packet, and approves nothing for runtime. A document recorded as held is held in the verified corpus; it is not thereby approved for use.",
  resolutionStatusVocabulary: STATUSES,
  unresolvedReasonVocabulary: UNRESOLVED_REASONS,
  counts,
  whyResolutionFailed: reasonRanking,
  rows
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (current !== serialized) { console.error(`${OUT} is stale. Run the resolver.`); process.exit(1); }
  console.log(`source-identity resolution batch 1 current: ${rows.length} row(s), ${counts.documentNeeds} document need(s).`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}`);
console.log(`  ${counts.rows} row(s): ${counts.rowsResolved} resolved, ${counts.rowsPartiallyResolved} partially resolved, ${counts.rowsUnresolved} unresolved`);
console.log(`  ${counts.documentNeeds} document need(s)`);
for (const [status, count] of Object.entries(counts.documentNeedsByStatus)) {
  if (count > 0) console.log(`  ${String(count).padStart(4)}  ${status}`);
}
console.log("  why resolution failed:");
for (const entry of reasonRanking) console.log(`  ${String(entry.rows).padStart(4)}  ${entry.reason}`);
