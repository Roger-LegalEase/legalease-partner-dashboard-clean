#!/usr/bin/env node
/**
 * Route-obligation census v1 — packet family `wv_nc_diversion_deferred-set`.
 *
 *   node scripts/build-census-v1-wv_nc_diversion_deferred-set.mjs
 *
 * West Virginia, no-conviction expungement where the case ended in acquittal,
 * in dismissal, or in the dismissal that follows a completed pretrial diversion
 * or deferred adjudication. Route
 * `obligation:track-pathway:WV:wv_nc_diversion_deferred:no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication`,
 * W. Va. Code § 61-11-25 as amended by H.B. 4399 (2024).
 *
 * One bound official form:
 *
 *   SCA-C903 Rev. 04/2010  Motion for Expungement of Criminal Records Due to
 *                          Acquittal or Dismissal for Reasons Other than Entry
 *                          of a Plea.
 *
 * THE SOURCE IS IN CUSTODY. THAT IS NOT WHAT STOPS THIS BUILD.
 *
 * The bound digest resolves byte-exact under the Master Library and the
 * buildability measurement records EVERY_BOUND_SOURCE_IS_A_HELD_PDF. Custody is
 * settled. What stops the build is that the form that is held cannot carry the
 * branch of the route this family IS — and the repository already says so.
 *
 * THE ROUTE CONTRACT'S OWN DELIVERY GATE SAYS IT FIRST
 *
 * src/lib/legal-authority/routes/national-report-batch-c.json, route
 * `WV:no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication`,
 * carries ruleId `WV-61-11-25-SCA-C903-STALE-FORM` and delivery gate
 * `wv_61_11_25_sca_c903_currency`, of kind `artifact_legal_review`, whose
 * status is pending and whose items include, verbatim:
 *
 *   "a current-law supplement covering what the published form omits"
 *   "counsel's reading of whether SCA-C903 may be used at all for a
 *    deferred-adjudication dismissal"
 *
 * and whose note reads, verbatim:
 *
 *   "SCA-C903 recites 'W. Va. Code § 61-11-25 (2000)' and is dated 04/01/2010,
 *    so it predates the 2010, 2012, 2022, 2023 and 2024 amendments including
 *    the H.B. 4399 text now in force. Its operative paragraphs still track
 *    current subsection (a) for a straight acquittal or dismissal, so it is
 *    usable there with a supplement. For a deferred-adjudication dismissal it
 *    is a different matter: the form is captioned 'for Reasons Other than Entry
 *    of a Plea', carries one charge block with a single free-text reason field,
 *    and has no same-transaction-or-occurrence paragraph and no diversion or
 *    deferred-adjudication paragraph."
 *
 * That gate is not this lane's to close. It names a counsel reading and an
 * artifact-level legal review, and a packet-build lane issues neither.
 *
 * WHY THE DEFERRED-ADJUDICATION BRANCH IS THE WHOLE OF THIS FAMILY
 *
 * There are two West Virginia families on this one form. `wv_nc_acquittal_dismissal-set`
 * is the straight acquittal-or-dismissal family — the case the gate's note says
 * SCA-C903 is usable for, with a supplement. This family is named for, and
 * exists to serve, the other case: diversion and deferred adjudication. The
 * defect the gate describes is not a corner of this family; it is its subject.
 *
 * WHAT WAS MEASURED HERE, FIRST HAND, OUT OF THE BOUND BYTES
 *
 * The four findings below are re-read from the pinned binary every time this
 * script runs, so the refusal rests on the document and not on a memo about it:
 *
 *   1. The form is captioned "FOR REASONS OTHER THAN ENTRY OF A PLEA", and it
 *      is captioned that way twice — on the motion and again on the certificate
 *      of service.
 *   2. Its paragraph 4 makes the movant allege "That 60 days have elapsed since
 *      the above referenced dismissal and that same dismissal was not in
 *      exchange for a guilty plea to another offense."
 *   3. The words "diversion", "deferred" and "same transaction or occurrence"
 *      do not appear anywhere in the document.
 *   4. It carries exactly one charge block — one "(Charges or Offense(s))"
 *      caption — and one free-text "(Reason for Dismissal.)" line.
 *
 * AND WHY THAT IS A REFUSAL RATHER THAN A FORMATTING PROBLEM
 *
 * The compiled runtime profile for West Virginia,
 * src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json, states the
 * mechanism this family serves:
 *
 *   "Deferred adjudication under 61-11-22a can last up to three years for a
 *    felony and up to two years for a misdemeanor. If the person complies with
 *    court-imposed terms, they may withdraw the guilty plea and the case is
 *    dismissed..."
 *
 * A deferred-adjudication dismissal in West Virginia therefore FOLLOWS AN
 * ENTERED GUILTY PLEA. Handing a participant a pro-se motion captioned "for
 * Reasons Other than Entry of a Plea", and asking them to sign it, is asking
 * them to file a pleading whose own title contradicts how their case ended.
 * Paragraph 4 compounds it rather than saving it: the statutory bar is a
 * dismissal in exchange for a guilty plea to ANOTHER offence, and a participant
 * reading paragraph 4 beside that caption cannot tell whether their withdrawn
 * plea to THIS offence is what the paragraph is asking about.
 *
 * The same profile also states the extension this family's route reaches:
 *
 *   "A person whose charges were dismissed after successful completion of
 *    pretrial diversion under 61-11-22 or deferred adjudication under 61-11-22a
 *    may also petition for expungement of all charges originally brought if the
 *    charges arose from the same transaction or occurrence."
 *
 * The route's own required facts include "Are there other charges arising from
 * the same transaction or occurrence?", and the worklist's filing record says
 * "Where the petition covers several charges from the same transaction or
 * occurrence, all of them are listed in the one motion." The bound form has one
 * charge block and no same-transaction paragraph, so a required fact of this
 * route has nowhere on the form to go.
 *
 * THE INSTRUMENT THE RECORD SAYS WOULD CARRY IT IS NOT BOUND
 *
 * MASTER_QUEUE declares four instrument kinds for this family —
 * certificate_of_service, filing_instructions, primary_filing and
 * supplemental_pleading — and two packet components, neither of which is the
 * supplemental pleading. The worklist names it as
 * `supplemental_pleading: wv_nc_diversion_deferred-supplemental-pleading-2`
 * and describes it as "a current-law supplement covering what the published
 * form omits". No source of any kind is bound for it, and the route contract's
 * own note says "a custom current-law civil petition preferred".
 *
 * So there is no honest partial build either. The primary filing is the
 * instrument in question; the supplement that would answer for it has no
 * source; and filling the caption of a motion whose body this route cannot use
 * would produce an artifact that looks finished and is not filable.
 *
 * NOTHING IS WRITTEN. No overlay directory is created or touched, and all nine
 * completeness counters are null rather than zero, because a family that was
 * not built was not measured. A zero here would be a claim about a packet that
 * does not exist.
 *
 * WHAT WOULD UNBLOCK IT is set out in the return, and every limb of it is an
 * owner or counsel decision rather than a build step.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "wv_nc_diversion_deferred-set";
const ROUTE_KEY = "obligation:track-pathway:WV:wv_nc_diversion_deferred:"
  + "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication";
const OUT_REL = "data/rcap-all50/overlays/census-v1/wv/wv-nc-diversion-deferred-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const ROUTE_CONTRACT = "src/lib/legal-authority/routes/national-report-batch-c.json";
const COMPILED_PROFILE = "src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json";

const SOURCE = Object.freeze({
  sourceId: "official-form:SCA-C903",
  formNumber: "SCA-C903",
  revision: "REV-2010-04",
  instrumentKind: "primary_filing",
  path: "STATES/WV/02_PACKET_FORMS/"
    + "WV__FORM__SCA-C903__sca-c903-motion-for-expungement-after-acquittal-or-dismissal__REV-2010-04__EN.pdf",
  sha256: "bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878"
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

function corpusRoot() {
  return process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
}

/** Bind the one declared source by digest, and report what it structurally is. */
async function bindSource() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: corpusRoot() });
  const entry = (index.entries ?? []).find((row) => row.path === SOURCE.path);
  if (!entry) {
    return { bound: false, why: `no committed corpus-index entry at ${SOURCE.path}` };
  }
  if (entry.sha256 !== SOURCE.sha256) {
    return { bound: false, why: `the committed index pins ${entry.sha256}` };
  }
  const absolute = resolver.resolve(entry);
  if (!absolute || !fs.existsSync(absolute)) {
    return { bound: false, why: `the custody holding ${SOURCE.path} is not mounted here` };
  }
  const bytes = fs.readFileSync(absolute);
  const digest = sha256(bytes);
  if (digest !== SOURCE.sha256) return { bound: false, why: `SHA-256 drift: the binary hashes ${digest}` };

  /*
   * This binary is AES-256 encrypted with an empty user password (R6, V5), so
   * pdf-lib cannot open it at all and the committed index records it as
   * `structuralClassObserved: "unreadable"` with the loadError it raised. That
   * is a property of the reader, not of the document: the document opens, has
   * three US-Letter pages, no AcroForm and no annotations. Both readings are
   * recorded so a later lane does not re-derive either.
   */
  let pdfLibLoadError = null;
  try {
    await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch (error) {
    pdfLibLoadError = String(error?.message ?? error);
  }
  return {
    bound: true, absolute, bytes, byteLength: bytes.length, sha256: digest,
    custody: entry.custody, indexEntry: entry, pdfLibLoadError
  };
}

/** The document's own printed text, read out of the pinned bytes. */
function printedTextOf(absolute) {
  const run = spawnSync("pdftotext", ["-layout", absolute, "-"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (run.error || run.status !== 0 || typeof run.stdout !== "string" || run.stdout.length === 0) {
    return { read: false, why: run.error ? String(run.error.message) : `pdftotext exited ${run.status}` };
  }
  const version = spawnSync("pdftotext", ["-v"], { encoding: "utf8" });
  return {
    read: true, text: run.stdout,
    readBy: "poppler pdftotext",
    readerVersion: (String(version.stderr ?? version.stdout ?? "").match(/version\s+([\d.]+)/) ?? [])[1] ?? null
  };
}

/** The four findings this refusal rests on, re-read from the document each run. */
function measurePrintedFace(text) {
  const countOf = (pattern) => (text.match(pattern) ?? []).length;
  return {
    captionSaysReasonsOtherThanEntryOfAPlea: {
      present: /FOR REASONS OTHER THAN ENTRY OF A PLEA/i.test(text),
      occurrences: countOf(/Reasons Other than Entry\s+of a Plea|FOR REASONS OTHER THAN ENTRY OF A PLEA/gi),
      printed: "MOTION FOR EXPUNGEMENT OF CRIMINAL RECORDS DUE TO ACQUITTAL OR DISMISSAL "
        + "FOR REASONS OTHER THAN ENTRY OF A PLEA"
    },
    paragraphFourSwearsTheDismissalWasNotForAPlea: {
      present: /not in exchange for a guilty plea to another offense/i.test(text),
      printed: "That 60 days have elapsed since the above referenced dismissal and that same dismissal was "
        + "not in exchange for a guilty plea to another offense."
    },
    noDiversionOrDeferredAdjudicationParagraph: {
      mentionsDiversion: /diversion/i.test(text),
      mentionsDeferred: /deferred/i.test(text)
    },
    noSameTransactionOrOccurrenceParagraph: {
      mentionsSameTransactionOrOccurrence: /same transaction or occurrence/i.test(text)
    },
    chargeBlocks: countOf(/Charges or Offense\(s\)/g),
    reasonForDismissalFreeTextLines: countOf(/Reason for Dismissal/gi),
    recitedStatute: {
      citesTheTwoThousandText: /61-11-25\s*\(2000\)/.test(text),
      printedRevision: (text.match(/Rev\.?\s*0?4\/(?:01\/)?2010/i) ?? [])[0] ?? null
    }
  };
}

/** The delivery gate this family's own route contract carries, read from the record. */
function deliveryGateOfRecord() {
  const contract = readJson(ROUTE_CONTRACT);
  const route = (contract.routes ?? []).find((row) =>
    row.pathwayId === "no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication");
  if (!route) return null;
  const gate = (route.deliveryGates ?? []).find((row) => row.id === "wv_61_11_25_sca_c903_currency") ?? null;
  return {
    routeKey: route.routeKey, ruleId: route.ruleId, statute: route.statute,
    packetFamily: route.packetFamily, artifactApprovalRequired: route.artifactApprovalRequired === true,
    requiredFacts: route.requiredFacts ?? [], gate
  };
}

/**
 * What the compiled runtime profile says the mechanism actually is.
 *
 * Read out of the parsed record's own `ruleClauses` array rather than sliced
 * out of the file's text. Slicing produced quotations with the surrounding
 * JSON punctuation still attached, and a mangled quotation is worse than none:
 * it is the thing a reviewer would take as the record speaking.
 */
function mechanismOfRecord() {
  const profile = readJson(COMPILED_PROFILE);
  const clauses = [];
  const walk = (node) => {
    if (Array.isArray(node)) { for (const item of node) walk(item); return; }
    if (node && typeof node === "object") {
      if (Array.isArray(node.ruleClauses)) for (const clause of node.ruleClauses) {
        if (typeof clause === "string") clauses.push(clause);
      }
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(profile);
  const clauseWith = (needle) => clauses.find((clause) => clause.includes(needle)) ?? null;
  const deferred = clauseWith("they may withdraw the guilty plea");
  const sameTransaction = clauseWith("may also petition for expungement of all charges originally brought");
  return {
    readFrom: `${COMPILED_PROFILE} ruleClauses`,
    ruleClausesInspected: clauses.length,
    deferredAdjudicationInvolvesAnEnteredPlea: deferred,
    sameTransactionExtension: sameTransaction,
    bothClausesPresent: Boolean(deferred && sameTransaction)
  };
}

async function build() {
  const source = await bindSource();
  if (!source.bound) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      overlayDirectoryTouched: false, counters: null,
      countersAreNullBecause: "no packet was built, so no counter was measured",
      failedSourceIdentities: [{ sourceIdentity: SOURCE.sourceId, declaredPath: SOURCE.path,
        declaredSha256: SOURCE.sha256, why: source.why }]
    };
  }

  const printed = printedTextOf(source.absolute);
  if (!printed.read) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "SOURCE_NOT_READABLE_HERE",
      overlayDirectoryTouched: false, counters: null,
      countersAreNullBecause: "no packet was built, so no counter was measured",
      why: "the bound binary is AES-256 encrypted with an empty user password and this container could not "
        + `read its printed text (${printed.why}). The refusal this family carries rests on the document's own `
        + "words, so it is not asserted from a container that could not read them.",
      sourceBoundExactly: { sourceId: SOURCE.sourceId, sha256: source.sha256, byteLength: source.byteLength }
    };
  }

  const face = measurePrintedFace(printed.text);
  const gate = deliveryGateOfRecord();
  const mechanism = mechanismOfRecord();

  /*
   * The refusal has to reproduce out of the document, or it is a memo. Each
   * limb below is a thing this run READ; if a future revision of SCA-C903 stops
   * printing any of them, the refusal no longer describes the form in custody
   * and this build says so rather than repeating itself.
   */
  const reproduced = {
    captionExcludesAnEnteredPlea: face.captionSaysReasonsOtherThanEntryOfAPlea.present,
    paragraphFourIsAboutAPlea: face.paragraphFourSwearsTheDismissalWasNotForAPlea.present,
    noDiversionParagraph: face.noDiversionOrDeferredAdjudicationParagraph.mentionsDiversion === false,
    noDeferredAdjudicationParagraph: face.noDiversionOrDeferredAdjudicationParagraph.mentionsDeferred === false,
    noSameTransactionParagraph: face.noSameTransactionOrOccurrenceParagraph.mentionsSameTransactionOrOccurrence === false,
    exactlyOneChargeBlock: face.chargeBlocks === 1,
    recitesTheTwoThousandStatute: face.recitedStatute.citesTheTwoThousandText === true
  };
  const allLimbsReproduce = Object.values(reproduced).every(Boolean);

  const common = {
    familyId: FAMILY_ID, routeKeys: [ROUTE_KEY], jurisdiction: "WV",
    implementationStrategy: "official_pdf_fill",
    directory: OUT_REL, overlayDirectoryTouched: false,
    counters: null,
    countersAreNullBecause: "no packet was built, so no counter was measured. A zero here would be a claim "
      + "about a packet that does not exist.",
    sourceCustody: {
      custodyIsSettled: true,
      sourceId: SOURCE.sourceId, formNumber: SOURCE.formNumber, revision: SOURCE.revision,
      pathInArchive: SOURCE.path, sha256: source.sha256, byteLength: source.byteLength,
      custody: source.custody, boundBy: "exact_content_sha256",
      pageCount: source.indexEntry.pageCount,
      structuralClassInTheCommittedIndex: source.indexEntry.structuralClassObserved,
      whatThatClassActuallyMeans:
        "the committed index records this binary as `unreadable` with a pdf-lib loadError. That is a property "
        + "of the reader: the document is AES-256 encrypted (R6/V5) with an EMPTY user password, and it opens, "
        + "with three US-Letter pages, no AcroForm and no annotations. It is a flat, encrypted PDF, not a "
        + "corrupt one, and it is not why this family stops.",
      pdfLibLoadError: source.pdfLibLoadError,
      printedTextReadBy: printed.readBy, printedTextReaderVersion: printed.readerVersion
    },
    measuredPrintedFace: face,
    deliveryGateOfRecord: gate,
    mechanismOfRecord: mechanism,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };

  if (!allLimbsReproduce) {
    return {
      ...common, status: "STOPPED", stopClass: "REFUSAL_DID_NOT_REPRODUCE",
      why: "the printed-face measurement this family's refusal rests on did not reproduce out of the bound "
        + "bytes. Re-read SCA-C903 and re-decide before building or clearing this family.",
      limbsThatDidNotReproduce: Object.entries(reproduced).filter(([, ok]) => !ok).map(([limb]) => limb)
    };
  }

  return {
    ...common,
    status: "STOPPED",
    stopClass: "BLOCKED_SOURCE",
    stopIsNotAboutCustody:
      "The one declared source binds byte-exact and the buildability measurement records "
      + "EVERY_BOUND_SOURCE_IS_A_HELD_PDF. This family stops because the form that is held cannot carry the "
      + "branch of the route this family is, not because the bytes are missing.",
    failedSourceIdentities: [{
      sourceIdentity: SOURCE.sourceId,
      declaredPath: SOURCE.path,
      declaredSha256: SOURCE.sha256,
      resolvedExactly: true,
      why: "SCA-C903 Rev. 04/2010 is captioned 'MOTION FOR EXPUNGEMENT OF CRIMINAL RECORDS DUE TO ACQUITTAL "
        + "OR DISMISSAL FOR REASONS OTHER THAN ENTRY OF A PLEA' and recites 'W. Va. Code § 61-11-25 (2000)'. "
        + "This family's route is the diversion and deferred-adjudication branch of § 61-11-25 as amended by "
        + "H.B. 4399 (2024), and the compiled West Virginia profile states that a deferred adjudication under "
        + "§ 61-11-22a ends when the person 'may withdraw the guilty plea and the case is dismissed'. The form "
        + "the participant would sign pro se therefore asserts in its own title that the dismissal was for "
        + "reasons other than entry of a plea, in the one case where a plea is how it happened. The words "
        + "'diversion', 'deferred' and 'same transaction or occurrence' appear nowhere in the document, it "
        + "carries one charge block and one free-text reason line, and the route's own required facts include "
        + "whether other charges arose from the same transaction or occurrence."
    }],
    componentsBuildable: [],
    componentsBlocked: [
      "component:wv_nc_diversion_deferred-primary-filing-1",
      "component:wv_nc_diversion_deferred-certificate-of-service-3"
    ],
    declaredInstrumentWithNoBoundSource: {
      instrumentKind: "supplemental_pleading",
      namedInTheWorklistAs: "supplemental_pleading: wv_nc_diversion_deferred-supplemental-pleading-2",
      describedAs: "a current-law supplement covering what the published form omits",
      packetComponentDeclared: false,
      sourceBound: false,
      why: "MASTER_QUEUE declares four instrumentKinds for this family and two packetComponents. The "
        + "supplemental pleading — the instrument the route contract says would answer for what SCA-C903 "
        + "omits — is declared as an instrument kind and as a deliverable, has no packet component, and has "
        + "no bound source of any kind."
    },
    whyNoPartialBuild:
      "The blocked instrument is the primary filing itself. Filling the caption of a motion whose body this "
      + "route cannot use would produce an artifact that looks finished and is not filable, and the "
      + "certificate of service on page 3 certifies service OF that motion.",
    whatWouldUnblockIt: [
      "counsel's reading, which the route contract's own delivery gate wv_61_11_25_sca_c903_currency already "
        + "names as pending, that SCA-C903 may or may not be used for a deferred-adjudication dismissal; or",
      "binding a source for the current-law supplemental pleading this family already declares as an "
        + "instrument kind, so the packet can state the diversion or deferred-adjudication basis and the "
        + "same-transaction-or-occurrence extension that the published form omits; or",
      "an owner decision to build this family as the custom current-law civil petition the route contract's "
        + "own note says is preferred, which is a custom_pleading strategy and not the official_pdf_fill this "
        + "family is declared as; or",
      "an owner decision to narrow this family to the straight acquittal-or-dismissal case, which is what "
        + "wv_nc_acquittal_dismissal-set already is, and to retire this family rather than build it"
    ],
    contradictionsFoundInTheRepository: [
      {
        record: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
        field: "legalInputStatus",
        says: "SETTLED",
        measured: "The LEGAL question is settled and the route contract says so in as many words — 'The legal "
          + "answer is settled and the published form is stale; that is an artifact question, not a legal one, "
          + "and it must not be sent to counsel as unresolved research.' The ARTIFACT question is not settled: "
          + "the same route carries a pending artifact_legal_review gate whose items include counsel's reading "
          + "of whether this form may be used at all here. The two are not in conflict, but a reader who takes "
          + "legalInputStatus SETTLED as clearance to build will build the wrong thing."
      },
      {
        record: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
        field: "sourceReadiness.custodyClass",
        says: "NO_ACQUISITION_TASK_NAMED",
        measured: "data/rcap-grade-a/source-wave-integration/SOURCE_READY_BUILDABILITY.json records custodyClass "
          + "null for this family with verdict EVERY_BOUND_SOURCE_IS_A_HELD_PDF. Both are consistent with the "
          + "bytes being held; neither is a statement that the held form fits the route."
      },
      {
        record: "data/rcap-all50/local-source-corpus-index.json",
        field: "entries[].structuralClassObserved for SCA-C903",
        says: "unreadable",
        measured: "The document opens with an empty user password: three US-Letter pages, no AcroForm, no "
          + "annotations. It is a flat encrypted PDF. Recording it as unreadable invites a later lane to stop "
          + "on the wrong ground."
      },
      {
        record: "the route's requiredSourceIds",
        field: "source-sha256:242048f1ff5b2e795ca43900bec6d9c353c59950bffd3c7776374ff1cc6c7035",
        says: "a second SCA-C903 binary, published at courtswv.gov in 2026-04",
        measured: "That digest resolves in custody, at LegalEase West Virginia/SCA-C-903.pdf: 2 pages, an "
          + "AcroForm with 25 fields. It is NOT a newer revision — it prints 'Revised: 04/01/2010' and recites "
          + "'W. Va. Code § 61-11-25 (2000)' exactly as the bound binary does, and its five paragraphs are "
          + "word-for-word the same. It is the same stale text re-typeset as a fillable form. Binding it "
          + "instead would change nothing about why this family stops, and this build does not substitute it."
      }
    ]
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL };
