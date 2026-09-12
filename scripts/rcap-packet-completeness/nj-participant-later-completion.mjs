import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const NJ_ORDINANCE_FAMILY = "nj_ordinance-set";
export const NJ_PARTICIPANT_LATER_COMPLETION_FAMILIES = Object.freeze([
  NJ_ORDINANCE_FAMILY,
  "nj_disorderly_persons-set",
  "nj_indictable_conviction-set",
]);
export const NJ_ORDINANCE_DOCUMENT = "NJ-CN-10557";
export const NJ_CN10557_SHA256 = "c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7";
export const NJ_CN10557_PATH_IN_ARCHIVE = "STATES/NJ/02_PACKET_FORMS/NJ__FORM__CN-10557__cn-10557-new-jersey-expungement-kit__REV-2020-06__EN.pdf";

const NOTICE_ADDRESSES = Object.freeze([
  { page: 36, text: "Fill in the addresses you have located for each applicable agency that was involved with your case(s)." },
]);
const NOTICE_AND_ORDER_ADDRESSES = Object.freeze([
  ...NOTICE_ADDRESSES,
  { page: 41, text: "fill in the addresses for each applicable agency that you want to notify that your record has been expunged" },
]);

const entry = (trigger, instructionEvidence, completesAfterService) => Object.freeze({
  actor: "participant",
  trigger,
  instructionEvidence: Object.freeze(instructionEvidence),
  completesAfterService,
});

/** Closed source-stage registry. Adding a family or field requires source evidence here. */
export const NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY = Object.freeze({
  ExpungeDocketNum: entry("AFTER_COURT_ASSIGNMENT_COPY_TO_LATER_FORMS", [
    { page: 36, text: "fill in the docket number that appears in the upper right-hand corner of your filed copies" },
    { page: 41, text: "fill in the expungement docket number that appears on your Expungement Order" },
  ], false),
  expungDocketNum: entry("AFTER_NOTICE_SERVICE_PROOF", [
    { page: 39, text: "Fill in the Expungement Docket Number." },
  ], true),
  CoverLtrEHearDt: entry("AFTER_INITIAL_FILING_FROM_ORDER_FOR_HEARING", [
    { page: 36, text: "fill in the date and time that appear on your copy of the Order for Hearing" },
  ], false),
  CoverLtrEHearTime: entry("AFTER_INITIAL_FILING_FROM_ORDER_FOR_HEARING", [
    { page: 36, text: "fill in the date and time that appear on your copy of the Order for Hearing" },
  ], false),
  SheriffLoc: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_ADDRESSES, false),
  SheriffAddrStr: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_ADDRESSES, false),
  SheriffAddr2: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_ADDRESSES, false),
  ProsCntyName: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_AND_ORDER_ADDRESSES, false),
  ProsAddrStr: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_AND_ORDER_ADDRESSES, false),
  PoliceAddrStr: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_AND_ORDER_ADDRESSES, false),
  PoliceAddr2: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_AND_ORDER_ADDRESSES, false),
  SuperintendentAddrStr: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_AND_ORDER_ADDRESSES, false),
  SuperintendentAddr2: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_AND_ORDER_ADDRESSES, false),
  WardenAddrStr: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_AND_ORDER_ADDRESSES, false),
  WardenAddr2: entry("AFTER_INITIAL_FILING_FOR_APPLICABLE_SERVICE_RECIPIENT", NOTICE_AND_ORDER_ADDRESSES, false),
  CoverLtrEDt: entry("NOTICE_OF_HEARING_MAILING", [
    { page: 36, text: "At the top right-hand corner of the page, fill in the date." },
    { page: 36, text: "Attach a copy of this Cover Letter (Form E) to each copy of the filed expungement package and mail a package" },
  ], true),
  mailPetition: entry("AFTER_NOTICE_SERVICE_PROOF", [
    { page: 39, text: "Fill in the date that you mailed copies of the filed Petition for Expungement" },
    { page: 39, text: "The date will be found on your certified mail receipts or electronic confirmation." },
  ], true),
  CoverLtrGDt: entry("POST_ORDER_SERVICE", [
    { page: 41, text: "At the top right-hand corner of the page, fill in the date." },
    { page: 41, text: "Attach a copy of this Cover Letter (Form G) to each copy of the signed and filed Expungement Order and mail it" },
  ], true),
  FamDivAddr2: entry("POST_ORDER_SERVICE_FOR_EACH_APPLICABLE_AGENCY", [
    { page: 41, text: "fill in the addresses for each applicable agency that you want to notify that your record has been expunged" },
  ], true),
});

export const NJ_PARTICIPANT_LATER_COMPLETION_FIELDS = Object.freeze(
  Object.keys(NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY));
export const isRegisteredParticipantLaterCompletionField = (field) =>
  Object.hasOwn(NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY, String(field ?? ""));

export function njParticipantLaterCompletionSourceStage(field, familyId = NJ_ORDINANCE_FAMILY) {
  const expected = NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY[field];
  if (!expected) throw new Error(`No NJ participant later-completion source-stage entry for ${field}`);
  if (!NJ_PARTICIPANT_LATER_COMPLETION_FAMILIES.includes(familyId)) {
    throw new Error(`No NJ participant later-completion source-stage family opt-in for ${familyId}`);
  }
  return {
    kind: "participant_later_completion",
    familyId,
    documentId: NJ_ORDINANCE_DOCUMENT,
    sourceSha256: NJ_CN10557_SHA256,
    field,
    actor: expected.actor,
    trigger: expected.trigger,
    instructionPages: [...new Set(expected.instructionEvidence.map((row) => row.page))],
  };
}

const verifiedProofs = new WeakSet();
export const isVerifiedParticipantLaterCompletionProof = (proof) =>
  Boolean(proof && typeof proof === "object" && verifiedProofs.has(proof));

const norm = (value) => String(value ?? "").normalize("NFKC")
  .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const widgetIdentity = (widgets) => (widgets ?? []).map((widget) => ({
  widgetIndex: widget.widgetIndex,
  page: widget.page ?? widget.pageIndex,
  rect: widget.rect ? {
    x: widget.rect.x,
    y: widget.rect.y,
    width: widget.rect.width,
    height: widget.rect.height,
  } : null,
}));

const extractedPages = new Map();
function sourcePageText(sourcePath, sourceSha256, page) {
  const cacheKey = `${sourcePath}|${sourceSha256}|${page}`;
  if (extractedPages.has(cacheKey)) return extractedPages.get(cacheKey);
  const read = spawnSync("pdftotext", ["-f", String(page), "-l", String(page), "-layout", sourcePath, "-"], {
    encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
  });
  const result = read.status === 0
    ? { ok: true, text: read.stdout }
    : { ok: false, failure: `CN-10557 source page ${page} text could not be extracted` };
  extractedPages.set(cacheKey, result);
  return result;
}

/**
 * Verify one opt-in against the exact source receipt, first-hand widget census,
 * source bytes, instruction pages and participant guide. The returned object is
 * accepted by the contract only while it retains this module's in-memory proof
 * identity; a serialized or caller-authored `verified: true` object proves
 * nothing.
 */
export function verifyParticipantLaterCompletionSourceStage({
  familyId, blank, fieldMap, census, receipt, instructions, sourceRoot,
}) {
  const claim = blank?.declared?.sourceStage;
  if (!claim) return null;
  const fail = (failure) => ({ ...claim, verified: false, failure });
  if (!NJ_PARTICIPANT_LATER_COMPLETION_FAMILIES.includes(familyId)
    || fieldMap?.familyId !== familyId || claim.familyId !== familyId) {
    return fail("participant later-completion has no closed source-stage opt-in for this family");
  }
  const expected = NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY[blank.id];
  if (!expected) return fail("participant later-completion names a field outside the closed NJ source-stage registry");
  const expectedClaim = njParticipantLaterCompletionSourceStage(blank.id, familyId);
  const receivedClaim = {
    kind: claim.kind,
    familyId: claim.familyId,
    documentId: claim.documentId,
    sourceSha256: claim.sourceSha256,
    field: claim.field,
    actor: claim.actor,
    trigger: claim.trigger,
    instructionPages: claim.instructionPages,
  };
  if (JSON.stringify(receivedClaim) !== JSON.stringify(expectedClaim)) {
    return fail("participant later-completion claim does not match the closed field, actor, trigger and instruction-page registry");
  }
  if (blank.document !== NJ_ORDINANCE_DOCUMENT || blank.name !== blank.id) {
    return fail("participant later-completion names a different document or field identity");
  }
  if (blank.refusalClass) return fail("participant later-completion conflicts with a protected-owner refusal class");
  const dec = blank.declared;
  if (dec.disposition !== "PARTICIPANT_LATER_COMPLETION"
    || dec.blankTreatment !== "PARTICIPANT_LATER_COMPLETION"
    || dec.requiredBeforeFiling !== false || dec.requiredBeforeFilingDeclared !== true
    || dec.routeDetermined !== false || dec.routeDeterminedDeclared !== true
    || dec.participantOwnedCompletion !== true || dec.completionStage !== expected.trigger
    || dec.completesAfterService !== expected.completesAfterService) {
    return fail("participant later-completion declaration contradicts its participant actor, later stage or required-before-filing flags");
  }

  const receiptDoc = receipt?.familyId === familyId
    ? receipt.documents?.find((row) => row.documentId === NJ_ORDINANCE_DOCUMENT) : null;
  const censusDoc = census?.familyId === familyId
    ? census.documents?.find((row) => row.documentId === NJ_ORDINANCE_DOCUMENT) : null;
  if (!receiptDoc || !censusDoc || receiptDoc.sha256 !== NJ_CN10557_SHA256
    || censusDoc.sourceSha256 !== NJ_CN10557_SHA256 || receiptDoc.byteLength !== 1924831
    || receiptDoc.pageCount !== 43 || censusDoc.pageGeometry?.length !== 43
    || receiptDoc.pathInArchive !== NJ_CN10557_PATH_IN_ARCHIVE
    || receiptDoc.corpusIndexAgrees !== true
    || census?.measurementRules?.inheritedMeasurementsUsed !== false) {
    return fail("participant later-completion does not bind the exact NJ receipt and first-hand census");
  }
  const censusField = censusDoc.fields?.find((row) => row.name === blank.id);
  if (!censusField || !censusField.widgets?.length
    || JSON.stringify(widgetIdentity(blank.widgets)) !== JSON.stringify(widgetIdentity(censusField.widgets))) {
    return fail("participant later-completion field widgets do not match the first-hand CN-10557 census");
  }

  if (!sourceRoot || !path.isAbsolute(sourceRoot) || !receiptDoc.pathInArchive) {
    return fail("participant later-completion source root is unavailable or not absolute");
  }
  const sourcePath = path.resolve(sourceRoot, receiptDoc.pathInArchive);
  if (!fs.existsSync(sourcePath)) return fail("participant later-completion source bytes are unavailable");
  const bytes = fs.readFileSync(sourcePath);
  if (bytes.length !== receiptDoc.byteLength
    || crypto.createHash("sha256").update(bytes).digest("hex") !== NJ_CN10557_SHA256) {
    return fail("participant later-completion source SHA-256 or byte length does not match current bytes");
  }
  for (const evidence of expected.instructionEvidence) {
    const extracted = sourcePageText(sourcePath, NJ_CN10557_SHA256, evidence.page);
    if (!extracted.ok) return fail(extracted.failure);
    if (!norm(extracted.text).includes(norm(evidence.text))) {
      return fail(`participant later-completion source instruction is absent from CN-10557 page ${evidence.page}`);
    }
  }

  const disclosedAtStage = String(instructions ?? "").split(/\r?\n/)
    .some((line) => line.includes(`source field: \`${blank.id}\``)
      && line.includes(expected.trigger));
  if (!disclosedAtStage) {
    return fail("participant later-completion is missing its exact source-field and stage disclosure");
  }

  const proof = {
    ...expectedClaim,
    verified: true,
    sourceByteLength: bytes.length,
    widgetCount: censusField.widgets.length,
    instructionEvidence: expected.instructionEvidence.map((row) => ({ ...row })),
    basis: `participant completes ${blank.id} at ${expected.trigger}; verified against exact CN-10557 bytes, ${censusField.widgets.length} measured widget(s), source instruction pages ${expectedClaim.instructionPages.join(", ")} and participant disclosure`,
  };
  verifiedProofs.add(proof);
  return proof;
}
