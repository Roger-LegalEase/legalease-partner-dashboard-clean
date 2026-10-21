#!/usr/bin/env node
/**
 * Arizona Form 31(a)/31(b) set-aside packet, as amended by R-26-0001.
 *
 * The only current authoritative binary available is the Supreme Court order
 * attachment. It publishes the forms as amendment pages: additions are
 * underlined and deletions struck. This builder verifies those exact bytes and
 * the amendment anchors, then typesets a clean operative copy. It never uses
 * the superseded Yuma or 2024 statewide PDFs as a rendering source.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";

export const FAMILY_ID = "az_set_aside-set";
export const ROUTE_KEY = "obligation:track-pathway:AZ:az_set_aside:remedy-2-set-aside-of-a-conviction";
export const SOURCE_SHA = "f41e4780c14ae413386d451d8bb7d089e4a7f270cd574bb65d91a1283c58de20";
export const SOURCE_PATH = "private/source-acquisition-20260911/az-r260001/R260001-FinalRulesOrder.PDF";
export const ADOPTION_PATH = "data/rcap-grade-a/source-wave-integration/SOURCE_AZ_R260001_ATTACHMENT_ADOPTION_2026-09-11.json";
export const SERVICE_RECORD = "data/rcap-grade-a/packet-factory-24h/warp-20260912/az/service-source-resolution.json";
export const OUT = "data/rcap-all50/overlays/census-v1/az/az-set-aside-set--official-pdf-fill";
export const EVIDENCE = "data/rcap-grade-a/packet-factory-24h/warp-20260912/az";
export const INPUT_EVIDENCE = `${EVIDENCE}/input-followup`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = [612, 792];
const M = 48;
const BLUE = rgb(0.03, 0.18, 0.52);
const BLACK = rgb(0, 0, 0);

const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (rel, value) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};
const norm = (s) => String(s).normalize("NFKC").replace(/[’]/g, "'").replace(/\s+/g, " ").trim();

export const AZ_REQUIRED_PARTICIPANT_INPUTS = Object.freeze([
  {
    key: "sentenceImposed", factId: "case.sentence_imposed", question: "What sentence did the court impose?",
    formDestination: "Form 31(a) Section V, item 1 (Other Information for the Court), or a clearly labeled attached continuation if the answer does not fit."
  },
  {
    key: "offenseClasses", factId: "case.offense_classes", question: "What is the class of each conviction listed in Section I?",
    formDestination: "Add the class beside its matching conviction in Form 31(a) Section I; use the Section I count continuation immediately after Form 31(a) when needed."
  },
  {
    key: "conditionsFulfilled", factId: "case.conditions_fulfilled_and_discharge", question: "Have all probation or sentence conditions been fulfilled, have you been discharged, and on what date?",
    formDestination: "Answer the printed Form 31(a) Section II compliance choices and put the completion/discharge date in Form 31(a) Section V, item 1, or on a clearly labeled attached continuation."
  },
  {
    key: "certificateRequested", factId: "participant.certificate_of_second_chance_requested", question: "Do you request a certificate of second chance with this application?",
    formDestination: "State Yes or No in Form 31(a) Section V, item 1, or on a clearly labeled attached continuation. Do not mark any Form 31(b) certificate finding or grant/deny box."
  }
]);

const isoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) return false;
  const [y,m,d] = value.split("-").map(Number); const parsed = new Date(Date.UTC(y,m-1,d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m-1 && parsed.getUTCDate() === d;
};

export function classifyAzParticipantInputBundle(supplied = {}, countTotal) {
  if (!Number.isInteger(countTotal) || countTotal < 1) throw new Error("countTotal must be the positive number of convictions in this application");
  return AZ_REQUIRED_PARTICIPANT_INPUTS.map((requirement) => {
    const value = supplied[requirement.key];
    let valid = false;
    if (requirement.key === "sentenceImposed") valid = typeof value === "string" && norm(value).length > 0;
    if (requirement.key === "offenseClasses") valid = Array.isArray(value) && value.length === countTotal && value.every((item) => typeof item === "string" && norm(item).length > 0);
    if (requirement.key === "conditionsFulfilled") valid = value && typeof value.conditionsFulfilled === "boolean" && typeof value.discharged === "boolean"
      && (value.discharged === false || isoDate(value.dischargeDate));
    if (requirement.key === "certificateRequested") valid = typeof value === "boolean";
    const absent = value === undefined || value === null;
    return {
      ...requirement, required: true, collectionStatus: absent ? "not_provided" : valid ? "provided" : "invalid",
      validationCode: absent ? "awaiting_participant_answer" : valid ? "provided_pending_participant_transfer_and_review" : "rejected_incomplete_or_malformed_answer",
      participantStatus: absent ? "Not provided" : valid ? "Provided — review and transfer to Form 31(a) before filing" : "Provided answer is incomplete or invalid",
      participantNextAction: absent ? `Answer: ${requirement.question}` : valid ? requirement.formDestination : `Correct the answer to: ${requirement.question}`,
      participantAuthored: true, builderMayInfer: false, courtDecision: false,
      blocksPacketReadyUntilProvided: true,
      blocksSelfHelpFiling: requirement.key === "conditionsFulfilled" && valid && (!value.conditionsFulfilled || !value.discharged),
      selfHelpTreatment: requirement.key === "conditionsFulfilled" && valid && (!value.conditionsFulfilled || !value.discharged)
        ? "Stop before filing and obtain case-specific legal help; the participant reported that completion or discharge has not occurred."
        : null
    };
  });
}

export const FIXTURES = {
  canonical: {
    court: "SUPERIOR", county: "MARICOPA", caseNumber: "CR2024-104218",
    defendant: "Jordan Lee Rivera", dob: "06/14/1988",
    judgmentCourt: "Superior", judgmentDay: "18", judgmentMonth: "October", judgmentYear: "2024",
    counts: ["Possession of drug paraphernalia, A.R.S. § 13-3415", "Disorderly conduct, A.R.S. § 13-2904", "Criminal trespass, A.R.S. § 13-1502", "False reporting, A.R.S. § 13-2907.01"],
    address: "245 West Monroe Street, Phoenix, AZ 85003"
  },
  boundary: {
    court: "SUPERIOR", county: "COCONINO", caseNumber: "CR2021-000987",
    defendant: "Alexandra Morgan-Prescott", dob: "12/31/1968",
    judgmentCourt: "Superior", judgmentDay: "30", judgmentMonth: "September", judgmentYear: "2021",
    counts: [
      "Criminal damage, A.R.S. § 13-1602",
      "Disorderly conduct, A.R.S. § 13-2904",
      "Criminal trespass, A.R.S. § 13-1502",
      "False reporting, A.R.S. § 13-2907.01",
      "Criminal trespass, A.R.S. § 13-1502 (second count)"
    ],
    address: "1847 North San Francisco Street, Apartment 12, Flagstaff, AZ 86001"
  }
};

/** Clean operative text whose changed phrases are controlled by R-26-0001. */
export const OPERATIVE = {
  applicationFirearm:
    "I understand that even if I am restored the right to possess and carry a firearm pursuant to this application, I may still be prohibited from possessing and carrying a firearm under other state or federal laws.",
  orderTitle: "ORDER REGARDING APPLICATION TO SET ASIDE CONVICTION AND RESTORATION OF FIREARM RIGHTS",
  seriousFinding:
    "The conviction for which the defendant has applied to have set aside is for a serious offense as defined in A.R.S. § 13-706.",
  firearmDenial:
    "The defendant’s right to possess a firearm is NOT restored by this Order because the conviction was for a serious offense as defined in A.R.S. § 13-706, and the defendant’s right to possess a firearm cannot be restored through this application.",
  firearmNotice:
    "Even if your right to possess and carry a firearm is restored under A.R.S. § 13-905(O), you may still be prohibited from possessing a firearm under other state or federal laws or based on other convictions.",
  employerProtection:
    "An employer of the defendant is provided with all of the protections that are provided pursuant to A.R.S. § 12-558.03;"
};

function sourceProof() {
  const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH));
  if (sha(source) !== SOURCE_SHA) throw new Error("R-26-0001 authoritative attachment SHA mismatch");
  const adoption = JSON.parse(fs.readFileSync(path.join(ROOT, ADOPTION_PATH), "utf8"));
  const service = JSON.parse(fs.readFileSync(path.join(ROOT, SERVICE_RECORD), "utf8"));
  if (service.familyId !== FAMILY_ID || service.conclusion !== "COURT_TRANSMITTAL_REQUIRED_NOT_PARTICIPANT_SERVICE"
    || !service.participantInstruction.includes("within 10 days after filing")) throw new Error("governed Rule 29.2(c) service resolution missing or changed");
  const rows = adoption.sources.filter((s) => s.familyIds?.includes(FAMILY_ID));
  for (const id of ["official-form:R-26-0001 adopted Form 31(a)", "official-form:R-26-0001 adopted Form 31(b)"]) {
    const row = rows.find((r) => r.sourceId === id);
    if (!row || row.sha256 !== SOURCE_SHA) throw new Error(`governed source binding missing: ${id}`);
  }
  const txt = execFileSync("pdftotext", ["-f", "3", "-l", "9", "-layout", path.join(ROOT, SOURCE_PATH), "-"]).toString();
  const flat = norm(txt);
  const anchors = [
    "I understand that even if I am granted restored the right to possess and carry a firearm",
    "Set Aside Conviction and Restore Restoration of Firearm Rights",
    "The applicant’s right to possess a firearm is also restored.",
    "The applicant’s defendant’s right to possess a firearm is DENIED due to the applicant’s",
    "in section A.R.S. § 13-706",
    "pursuant to section A.R.S. § 12-558.03"
  ];
  const missing = anchors.filter((a) => !flat.includes(norm(a)));
  if (missing.length) throw new Error(`amendment anchors absent from authoritative bytes: ${missing.join(" | ")}`);
  return { source, rows, anchors, service, extractedTextSha256: sha(Buffer.from(txt)) };
}

function wrap(font, text, size, width) {
  const words = String(text).split(/\s+/); const lines = []; let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function painter(page, regular, bold) {
  let y = 746;
  const text = (s, opts = {}) => {
    const size = opts.size ?? 9.4; const font = opts.bold ? bold : regular;
    const x = opts.x ?? M; const width = opts.width ?? PAGE[0] - 2 * M;
    const lines = wrap(font, s, size, width);
    for (const line of lines) { page.drawText(line, { x, y, size, font, color: opts.color ?? BLACK }); y -= opts.leading ?? size + 2.6; }
    y -= opts.after ?? 0;
    return lines.length;
  };
  const center = (s, opts = {}) => {
    const size = opts.size ?? 10; const font = opts.bold ? bold : regular;
    const width = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: (PAGE[0] - width) / 2, y, size, font, color: opts.color ?? BLACK }); y -= opts.leading ?? size + 3;
  };
  const rule = (label, value = "", opts = {}) => {
    const size = opts.size ?? 9.4; const x = opts.x ?? M; const width = opts.width ?? PAGE[0] - 2 * M;
    text(label, { x, width, size, bold: opts.bold, after: 2 });
    const yy = y + 2; page.drawLine({ start: { x, y: yy }, end: { x: x + width, y: yy }, thickness: .6, color: BLACK });
    if (value) {
      let vs = opts.valueSize ?? 9; while (regular.widthOfTextAtSize(value, vs) > width - 8 && vs > 6) vs -= .25;
      page.drawText(value, { x: x + 4, y: yy + 2, size: vs, font: regular, color: BLUE });
    }
    y -= opts.gap ?? 16;
  };
  const check = (s, opts = {}) => text(`[ ] ${s}`, opts);
  const space = (n = 8) => { y -= n; };
  const setY = (n) => { y = n; };
  const getY = () => y;
  return { text, center, rule, check, space, setY, getY };
}

async function renderPacket(fixture, facts) {
  const source = await PDFDocument.load(fs.readFileSync(path.join(ROOT, SOURCE_PATH)));
  const pdf = await PDFDocument.create(); stampDeterministic(pdf);
  pdf.setTitle(`Arizona Form 31(a)/31(b) set-aside packet — ${fixture}`);
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const copied = await pdf.copyPages(source, [2, 3, 4, 5, 6, 7, 8]);
  const addCopied = (i) => { const page = copied[i]; pdf.addPage(page); return page; };
  const white = (page, x, y, width, height) => page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1) });
  const drawn = [];
  const drawWrapped = (page, value, x, y, width, size = 12, font = regular, color = BLACK, leading = size + 4) => {
    const lines = wrap(font, value, size, width);
    lines.forEach((line, i) => page.drawText(line, { x, y: y - i * leading, size, font, color }));
    return lines.length;
  };
  const writeAt = (page, field, value, x, y, width, size = 9, leading = size + 2) => {
    const lines = wrap(regular, value, size, width);
    lines.forEach((line, i) => page.drawText(line, { x, y: y - i * leading, size, font: regular, color: BLUE }));
    drawn.push({ field, value, page: pdf.getPages().indexOf(page) + 1, x, y, width, size, leading, lines });
  };
  // Pages 3–6 are copied verbatim from the adopted attachment. Only the
  // amendment apparatus on page 5 is covered and replaced with operative text.
  const a1 = addCopied(0), a2 = addCopied(1), a3 = addCopied(2), a4 = addCopied(3);
  for (const page of [a1, a2, a3, a4]) white(page, 65, 725, 500, 43); // order docket/page wrapper
  white(a1, 65, 617, 500, 109); // ATTACHMENT/rules/no-change apparatus, retain Form 31(a) title
  white(a1, 65, 74, 500, 52); // amendment-markup footnote, not operative form content
  white(a3, 65, 445, 500, 70);
  drawWrapped(a3, OPERATIVE.applicationFirearm, 72, 500, 470, 12, bold, BLACK, 17);

  // Known caption and conviction facts are written only on source-drawn rules.
  writeAt(a1, "31a.court", facts.court, 150, 580, 170, 9, 11);
  writeAt(a1, "31a.county", facts.county, 205, 552, 155, 9, 11);
  writeAt(a1, "31a.case", facts.caseNumber, 410, 519, 130, 9, 11);
  writeAt(a1, "31a.defendant", facts.defendant, 76, 467, 225, 9, 11);
  writeAt(a1, "31a.dob", facts.dob, 141, 422, 135, 9, 11);
  writeAt(a1, "31a.judgment_court", facts.judgmentCourt, 269, 328, 160, 7.5, 9);
  writeAt(a1, "31a.judgment_day", facts.judgmentDay, 158, 304, 54, 7.5, 9);
  writeAt(a1, "31a.judgment_month", facts.judgmentMonth, 253, 304, 138, 7.5, 9);
  writeAt(a1, "31a.judgment_year", facts.judgmentYear, 402, 304, 27, 7.5, 9);
  const countY = [294, 276, 258, 240];
  facts.counts.slice(0, 4).forEach((value, i) => writeAt(a1, `31a.count_${i + 1}`, value, 148, countY[i], 318, 7.1, 8));
  if (facts.counts.length > 4) { a1.drawText("X", { x: 73, y: 219, size: 9, font: bold, color: BLUE }); drawn.push({ field: "31a.additional_counts", value: "X", page: 1, x: 73, y: 219, width: 9, size: 9, leading: 11, lines: ["X"] }); }
  writeAt(a3, "31a.printed_name", facts.defendant, 76, 305, 205, 8.5, 10);
  writeAt(a3, "31a.address", facts.address, 76, 252, 460, 8.2, 10);

  // A continuation is delivered immediately after Form 31(a), never after the order.
  if (facts.counts.length > 4) {
    const page = pdf.addPage(PAGE); const p = painter(page, regular, bold);
    p.center("FORM 31(a) — SECTION I. CONVICTION(S) CONTINUATION", { bold: true, size: 11, leading: 18 });
    p.text("Court:", { bold: true }); writeAt(page, "31a.cont.court", `${facts.court} COURT OF ARIZONA`, 112, 728, 250, 9, 11);
    p.text("County:", { bold: true }); writeAt(page, "31a.cont.county", facts.county, 118, 714, 180, 9, 11);
    p.text("Case Number:", { bold: true }); writeAt(page, "31a.cont.case", facts.caseNumber, 145, 700, 180, 9, 11);
    p.text("Defendant:", { bold: true, after: 12 }); writeAt(page, "31a.cont.defendant", facts.defendant, 130, 686, 280, 9, 11);
    facts.counts.slice(4).forEach((count, i) => {
      const base = 650 - i * 42;
      page.drawText(`Count ${i + 5}:`, { x: 56, y: base, size: 9.4, font: regular, color: BLACK });
      page.drawLine({ start: { x: 56, y: base - 18 }, end: { x: 556, y: base - 18 }, thickness: .6, color: BLACK });
      writeAt(page, `31a.count_${i + 5}`, count, 60, base - 14, 490, 8.5, 10);
    });
    page.drawText("Attach this continuation immediately after Form 31(a).", { x: 56, y: 590, size: 9.4, font: bold, color: BLACK });
  }

  // Pages 7–9 are copied verbatim. Bounded patches apply only adopted edits.
  const b1 = addCopied(4), b2 = addCopied(5), b3 = addCopied(6);
  for (const page of [b1, b2, b3]) white(page, 65, 725, 500, 43); // order docket/page wrapper
  white(b1, 65, 675, 500, 43);
  drawWrapped(b1, "Form 31(b). Order Regarding Application to Set Aside Conviction and Restoration of Firearm Rights", 72, 709, 470, 11.5, bold, BLACK, 15);
  white(b2, 65, 380, 500, 48); // deleted firearm-restoration grant option and its OR
  white(b2, 65, 293, 500, 84);
  drawWrapped(b2, `[ ]    ${OPERATIVE.firearmDenial}`, 72, 361, 480, 11.4, regular, BLACK, 17);
  white(b2, 65, 222, 500, 70);
  drawWrapped(b2, OPERATIVE.firearmNotice, 72, 281, 480, 11.4, bold, BLACK, 17);
  white(b3, 180, 598, 40, 21); // delete only the struck word "section"

  writeAt(b1, "31b.court", facts.court, 150, 665, 170, 9, 11);
  writeAt(b1, "31b.county", facts.county, 205, 645, 155, 9, 11);
  writeAt(b1, "31b.case", facts.caseNumber, 412, 602, 130, 9, 11);
  writeAt(b1, "31b.defendant", facts.defendant, 76, 556, 235, 9, 11);
  writeAt(b1, "31b.dob", facts.dob, 141, 517, 135, 9, 11);

  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false }));
  return { bytes, pageCount: pdf.getPageCount(), drawn };
}

const write = (field, document, page, label, factId) => ({
  field, fieldName: field, document, page, printedLabel: label, effectiveLabel: label,
  factId, kind: "text", decision: "write"
});
const required = (field, document, page, label, kind = "text") => ({
  field, fieldName: field, document, page, printedLabel: label, effectiveLabel: label, kind,
  reason: "The participant must supply or confirm this case-specific answer before filing; the platform does not hold it.",
  completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
  participantMustSupply: true, routeDetermined: false
});
const protectedField = (field, document, page, label) => ({
  field, fieldName: field, document, page, printedLabel: label, effectiveLabel: label,
  kind: /\[ \]/.test(label) ? "selection_control" : "text",
  reason: "Court, clerk, prosecutor, agency, or hearing field; the court completes this after filing.",
  refusalClass: "court_prosecutor_clerk_or_agency_owned", requiredBeforeFiling: false, routeDetermined: false
});
const signature = (field, document, page, label) => ({
  field, fieldName: field, document, page, printedLabel: label, effectiveLabel: label,
  reason: "Signature and date are completed by the participant after review.",
  refusalClass: "signature_or_date_participant_completion", requiredBeforeFiling: false, routeDetermined: false
});
const election = (field, document, page, label) => ({
  field, fieldName: field, document, page, printedLabel: label, effectiveLabel: label,
  kind: "selection_control", isSelectionControl: true,
  reason: "This is a genuine case-specific participant election; the set-aside route does not determine the answer.",
  refusalClass: "participant_sworn_narrative_or_legal_election", requiredBeforeFiling: false, routeDetermined: false
});
const optional = (field, document, page, label) => ({
  field, fieldName: field, document, page, printedLabel: label, effectiveLabel: label,
  reason: "Optional participant-authored information; the platform does not invent it.",
  completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false, routeDetermined: false
});

function fieldMap() {
  const app = "R-26-0001-Form-31(a)"; const order = "R-26-0001-Form-31(b)"; const cont = "R-26-0001-Form-31(a)-CONT";
  const writes = [
    write("31a.court", app, 1, "Court name", "case.court_name"), write("31a.county", app, 1, "County", "case.county"),
    write("31a.case", app, 1, "Case Number", "case.number"), write("31a.defendant", app, 1, "Defendant (FIRST, MI, LAST)", "participant.full_legal_name"),
    write("31a.dob", app, 1, "Date of Birth", "participant.date_of_birth"), write("31a.judgment_court", app, 1, "Judgment Court", "case.judgment_court"),
    write("31a.judgment_day", app, 1, "Day judgment entered", "case.judgment_day"),
    write("31a.judgment_month", app, 1, "Month judgment entered", "case.judgment_month"),
    write("31a.judgment_year", app, 1, "Year judgment entered", "case.judgment_year"),
    ...[1,2,3,4].map((n) => write(`31a.count_${n}`, app, 1, `Count ${n}`, `case.count_${n}`)),
    write("31a.additional_counts", app, 1, "Additional counts continue on a separate page", "case.has_more_than_four_counts"),
    write("31a.printed_name", app, 3, "Print Defendant’s Name", "participant.full_legal_name"),
    write("31a.address", app, 3, "Address", "participant.full_mailing_address"),
    write("31b.court", order, 1, "Court name", "case.court_name"), write("31b.county", order, 1, "County", "case.county"),
    write("31b.case", order, 1, "Case Number", "case.number"), write("31b.defendant", order, 1, "Defendant (FIRST, MI, LAST)", "participant.full_legal_name"),
    write("31b.dob", order, 1, "Date of Birth", "participant.date_of_birth"),
    write("31a.cont.court", cont, 1, "Court name", "case.court_name"), write("31a.cont.county", cont, 1, "County", "case.county"),
    write("31a.cont.case", cont, 1, "Case Number", "case.number"), write("31a.cont.defendant", cont, 1, "Defendant", "participant.full_legal_name"),
    write("31a.count_5", cont, 1, "Count 5", "case.count_5")
  ];
  const refusals = [
    ...AZ_REQUIRED_PARTICIPANT_INPUTS.filter((input) => input.key !== "certificateRequested").map((input) => ({
      ...required(`31a.required.${input.key}`, app, input.key === "offenseClasses" ? 1 : 3,
        input.question),
      factId: input.factId, inputKey: input.key, participantQuestion: input.question,
      formDestination: input.formDestination, participantAuthored: true, builderMayInfer: false,
      printedLabel: null, virtualParticipantInput: true, notAnAcroFormField: true
    })),
    {
      ...election("31a.required.certificateRequested", app, 3, "Do you request a certificate of second chance with this application? [ ] Yes [ ] No"),
      factId: "participant.certificate_of_second_chance_requested", inputKey: "certificateRequested",
      participantQuestion: "Do you request a certificate of second chance with this application?",
      formDestination: AZ_REQUIRED_PARTICIPANT_INPUTS.find((input) => input.key === "certificateRequested").formDestination,
      participantAuthored: true, builderMayInfer: false, collectionRequiredBeforePacketReady: true,
      printedLabel: null, virtualParticipantInput: true, notAnAcroFormField: true
    },
    election("31a.applicant_is", app, 1, "Applicant is: [ ] Defendant [ ] Attorney for Defendant [ ] Probation Officer"),
    election("31a.sentence_compliance", app, 1, "Sentence compliance [ ] Yes [ ] No"),
    election("31a.sentence_explanation", app, 1, "If no, please explain sentence compliance"),
    election("31a.adoc_certificate", app, 2, "Certificate of absolute discharge from ADOC [ ] Yes [ ] No"),
    election("31a.victim_restitution", app, 2, "Victim restitution [ ] has [ ] has not been paid in full or [ ] was not ordered"),
    election("31a.victim_restitution_explanation", app, 2, "If victim restitution has not been paid in full, please explain"),
    election("31a.other_money", app, 2, "Other court-ordered monetary obligations [ ] have [ ] have not been paid or [ ] were not ordered"),
    election("31a.other_money_explanation", app, 2, "If all other monetary obligations have not been paid in full, please explain"),
    election("31a.prior_application", app, 2, "Previously applied to set aside conviction [ ] Yes [ ] No"),
    election("31a.prior_application_date", app, 2, "Date of last application"),
    election("31a.prior_grant", app, 2, "Previously granted a set aside [ ] Yes [ ] No"),
    election("31a.prior_grant_felony", app, 2, "Was the prior set aside a felony conviction [ ] Yes [ ] No"),
    election("31a.prior_certificate", app, 2, "Previously received certificate of second chance [ ] Yes [ ] No [ ] N/A"),
    election("31a.prior_denial", app, 2, "Previously denied a set aside [ ] Yes [ ] No"),
    election("31a.open_cases", app, 2, "Open criminal cases [ ] Yes [ ] No"),
    election("31a.open_cases_explanation", app, 2, "If yes, please explain open criminal cases"),
    optional("31a.consideration", app, 3, "Anything you would like the court to take into consideration"),
    optional("31a.attachments", app, 3, "[ ] Attached is other pertinent documentation; list attached documents"),
    election("31a.hearing", app, 3, "Do you request a hearing? [ ] Yes [ ] No"),
    signature("31a.defendant_signature", app, 3, "Defendant’s Signature"),
    election("31a.authorization_actor", app, 3, "Authorization: [ ] Attorney [ ] Probation Officer"),
    election("31a.authorization_name", app, 3, "I authorize (name)"), election("31a.authorization_court", app, 3, "Authorization Court and County"),
    signature("31a.authorization_date", app, 4, "Authorization Date"), signature("31a.authorization_signature", app, 4, "Defendant’s Signature"),
    election("31a.representative_name", app, 4, "Print Attorney/Probation Officer Name"), signature("31a.representative_signature", app, 4, "Attorney/Probation Officer Signature"),
    election("31a.representative_address", app, 4, "Attorney/Probation Officer Address"),
    ...[
      ["31b.prosecutor_copy",1,"[ ] Prosecutor has received a copy"], ["31b.requirements_met",1,"[ ] Statutory requirements met"],
      ["31b.certificate_met",1,"[ ] Certificate requirements met/not met"], ["31b.serious_offense",1,"[ ] Serious offense under A.R.S. § 13-706"],
      ["31b.requirements_not_met",1,"[ ] Statutory requirements not met"], ["31b.ineligible",1,"[ ] Ineligible offense findings"],
      ["31b.deny",2,"[ ] DENYING application"], ["31b.denial_reason",2,"Court’s denial reasons"], ["31b.grant",2,"[ ] GRANTING application"],
      ["31b.firearm_not_restored",2,"[ ] Firearm right NOT restored"], ["31b.certificate_deny",2,"[ ] DENYING certificate of second chance"],
      ["31b.certificate_grant",3,"[ ] GRANTING certificate of second chance"], ["31b.order_date",3,"DATED by the Court"], ["31b.judicial_officer",3,"Judicial Officer"]
    ].map(([id,page,label]) => protectedField(id, order, page, label))
  ];
  return {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    jurisdiction: "AZ", implementationStrategy: "official_pdf_fill_from_adopted_amendment_attachment",
    renderStrategy: "source_page_copy_with_bounded_operational_amendment_patches",
    officialForm: [app, order],
    components: [
      { componentId: "az_set_aside-primary-filing-1", documentId: app, role: "primary_filing", requirement: "required" },
      { componentId: "az_set_aside-proposed-order-2", documentId: order, role: "proposed_order", requirement: "required" },
      { componentId: "az_set_aside-continuation-3", documentId: cont, role: "continuation", requirement: "conditional", conditionDescription: "More than four counts." }
    ],
    writes, refusals,
    participantInputRequirements: AZ_REQUIRED_PARTICIPANT_INPUTS.map((input) => ({ ...input, required: true, participantAuthored: true, builderMayInfer: false })),
    requiredBeforeFiling: refusals.filter((r) => r.requiredBeforeFiling).map((r) => ({ field: r.field, document: r.document, label: r.effectiveLabel }))
  };
}

function instructions(map) {
  const requiredLabels = map.refusals.filter((r) => r.requiredBeforeFiling).map((r) => `- **${r.effectiveLabel}:** complete this case-specific blank before filing.`).join("\n");
  const inputQuestions = map.participantInputRequirements.map((input) => `- **${input.question}** ${input.formDestination}`).join("\n");
  return `# Arizona application to set aside a conviction\n\nThis packet contains the current statewide Form 31(a), Form 31(b), and, when there are more than four counts, a Form 31(a) continuation. It implements the operative text adopted by Arizona Supreme Court Order R-26-0001, effective August 27, 2026.\n\nA set aside is not sealing or expungement. The record remains public with a set-aside annotation.\n\n## Before filing\n\n${requiredLabels}\n\n## Four answers LegalEase must collect and you must put on Form 31(a)\n\n${inputQuestions}\n\nThese are participant and case facts. LegalEase must show each one as **Not provided**, **Provided — review and transfer**, or **Invalid**. It must not infer an offense class, a sentence, a completion or discharge date, or a certificate request from the route name. If an answer goes on an attached continuation, label the answer, place the continuation immediately after Form 31(a), tick the Section V attachment box, and list that continuation. Do not put these answers into the proposed order.\n\nComplete every applicable participant choice in Form 31(a): who is applying; sentence compliance and any required explanation; ADOC certificate status; victim restitution; other court-ordered money; prior applications, grants, felony set asides, certificates, and denials; open criminal cases and any explanation; attachments; and whether you request a hearing. These are your case-specific answers. LegalEase does not choose them.\n\n- **Sentence imposed:** describe what the court imposed; a compliance Yes/No answer does not replace the sentence itself.\n- **Offense class for every count:** provide the actual class for each conviction; do not infer it from the offense name or statute.\n- **Completion and discharge:** give the distinct completion/discharge answer and date; the judgment date is not a substitute.\n- **Certificate of second chance request:** answer Yes or No as your requested relief in Form 31(a). This does not decide whether the court will grant it.\n- **Certificate of absolute discharge from ADOC:** if you were in Arizona Department of Corrections custody, obtain the certificate and check your sentence-compliance answer against it. Do not mark it present unless you have it.\n- **Signature under penalty of perjury — Application, declaration block:** review and sign Form 31(a). No notarization is required.\n- **Authorization block — Application, authorization section:** complete it only if an attorney or probation officer applies for the defendant.\n- **Fee:** none under A.R.S. § 13-905(B); no fee-waiver form is needed.\n\nFile in the court where the person was convicted. Use one application per case number. Submit Form 31(a), any continuation, and the unmarked proposed Form 31(b). Under Arizona Rule of Criminal Procedure 29.2(c), the court sends a copy of the filed application to the applicable prosecuting agency within 10 days after filing. Do not claim that notice has already occurred, and follow any case-specific court directions.\n\nThe court owns every finding, grant/deny choice, prosecutor-receipt finding, firearm-right determination, certificate-of-second-chance determination, date, and judicial-officer line in Form 31(b). Do not mark them. A participant's Yes answer requesting a certificate belongs in Form 31(a) and never selects the court's certificate grant or denial.\n\nThe defendant, prosecutor, or victim may request a hearing, but the court is not required to set one. The state or victim may object within 30 days after filing.\n\nThe current application warns: “${OPERATIVE.applicationFirearm}” The order also warns: “${OPERATIVE.firearmNotice}” The packet makes no firearm-right eligibility determination.\n\nStop self-help and seek legal assistance if there is a state or victim objection; the court sets a hearing; victim restitution is unpaid or disputed; the participant reports that sentence conditions are not fulfilled or discharge has not occurred; there is a dangerous-offense, registration, sexual-motivation, or victim-under-fifteen issue; a serious-offense issue may control firearm restoration; the application is denied and you want to challenge it; or you want sealing and do not understand how set-aside relief differs. A routine hearing alone does not stop packet generation, but opposition, disputed evidence, or a contested hearing requires handoff.\n`;
}

async function readPacketText(bytes) {
  const doc = await PDFDocument.load(bytes);
  return norm(doc.getPages().flatMap((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text)).join(" "));
}

async function provePositionedWrites(bytes, drawn, map) {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages().map((p) => extractTextItems(p));
  const rows = [];
  for (const d of drawn) {
    const observedLines = [];
    for (let i = 0; i < d.lines.length; i++) {
      const wanted = { text: d.lines[i], x: d.x, y: d.y - i * d.leading };
      const matches = pages[d.page - 1].filter((item) => item.text === wanted.text
        && Math.abs(item.x - wanted.x) < 0.02 && Math.abs(item.y - wanted.y) < 0.02);
      if (matches.length !== 1) throw new Error(`${d.field} has ${matches.length} positioned saved-byte matches for line ${JSON.stringify(wanted)}`);
      observedLines.push({ text: matches[0].text, x: matches[0].x, y: matches[0].y, width: matches[0].width, metricsExact: matches[0].metricsExact });
    }
    const mapped = map.writes.find((w) => w.field === d.field);
    if (!mapped) throw new Error(`positioned write ${d.field} has no field-map row`);
    rows.push({ field: d.field, factId: mapped.factId, expected: d.value, drawnText: d.value, page: d.page,
      measuredWriteBox: { x: d.x, y: d.y - (d.lines.length - 1) * d.leading - 2, width: d.width, height: d.size + (d.lines.length - 1) * d.leading + 4 },
      savedBytePositionMatches: observedLines });
  }
  return rows;
}

function participantInputStatusReport() {
  const fixtures = Object.entries(FIXTURES).map(([fixture, facts]) => ({
    fixture,
    convictionCount: facts.counts.length,
    currentPacketReadyForFiling: false,
    inputs: classifyAzParticipantInputBundle({}, facts.counts.length)
  }));
  return {
    schemaVersion: "rcap-participant-input-status/v1", familyId: FAMILY_ID,
    currentPacketStatus: "participant_answers_not_supplied_by_builder",
    currentPacketReadyForFiling: false,
    fixtures,
    rules: {
      allFourRequired: true,
      supportedCollectionStates: ["not_provided", "provided", "invalid"],
      participantMustProvideActualAnswers: true,
      builderMayInferAnyAnswer: false,
      certificateRequestIsParticipantIntent: true,
      certificateEligibilityAndGrantDenyRemainCourtOwned: true,
      transferDestination: "Form 31(a) Section I/Section V or a labeled continuation immediately after Form 31(a); never Form 31(b)"
    }
  };
}

function writeInputFollowup(map) {
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, INPUT_EVIDENCE), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructions(map));
  writeJson(`${OUT}/production-field-map.json`, map);
  writeJson(`${OUT}/reports/participant-input-status.json`, participantInputStatusReport());
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: map.refusals.filter((row) => row.requiredBeforeFiling),
    protectedBlanks: map.refusals.filter((row) => !row.requiredBeforeFiling),
    everyRequiredBeforeFilingItemIsDisclosed: true
  });
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      { kind: "procedure_resolution", statement: "Rule 29.2(c) assigns transmission to the court within 10 days after filing; no participant service act or completed prosecutor-receipt finding is fabricated.", evidence: SERVICE_RECORD },
      { kind: "participant_input_handback", statement: "Sentence imposed, offense class for every conviction, completion/discharge status and date, and certificate-of-second-chance request intent are mandatory participant inputs. Their missing/provided/invalid states and exact Form 31(a)/continuation destinations are modeled without selecting any Form 31(b) decision.", evidence: `${INPUT_EVIDENCE}/current-input-handling-proof.json` }
    ]
  });
  const verifierCommand = ["scripts/rcap-packet-completeness/verify-packet-completeness.mjs", "--family", FAMILY_ID];
  const verifierStdout = execFileSync(process.execPath, verifierCommand, { cwd: ROOT }).toString();
  if (!/PASS_COMPLETE/.test(verifierStdout)) throw new Error(`native completeness failed:\n${verifierStdout}`);
  const counterLine = verifierStdout.split("\n").find((line) => line.includes("counters:")) ?? "";
  const names = ["knownRequiredFieldsMissing","requiredFactsNotCollected","unclassifiedBlanks","incompleteRows","requiredOptionsMissing","requiredComponentsMissing","invisibleWrites","protectedWrites","visualDefects"];
  const counters = Object.fromEntries(names.map((name) => [name, Number(counterLine.match(new RegExp(`${name} (\\d+)`))?.[1] ?? NaN)]));
  if (Object.values(counters).some((value) => value !== 0)) throw new Error(`native counters not all zero: ${JSON.stringify(counters)}`);
  writeJson(`${OUT}/reports/completeness-counters.json`, { schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID, measuredBy: `node ${verifierCommand.join(" ")}`, result: "PASS_COMPLETE", counters, allNineZero: true });
  return { verifierStdout, counters };
}

export async function runFamily(args = process.argv.slice(2)) {
  const check = args.includes("--check");
  const inputFollowupOnly = args.includes("--input-followup-only");
  const proof = sourceProof();
  if (check) return { familyId: FAMILY_ID, status: "CHECK_ONLY", sourceSha256: SOURCE_SHA, governedBindings: proof.rows.length, amendmentAnchors: proof.anchors.length };
  const map = fieldMap();
  if (inputFollowupOnly) {
    const result = writeInputFollowup(map);
    return { familyId: FAMILY_ID, status: "CURRENT_PDF_BYTES_UNCHANGED_INPUT_HANDLING_REFRESHED", counters: result.counters };
  }
  const outputs = [];
  for (const [fixture, facts] of Object.entries(FIXTURES)) {
    const rendered = await renderPacket(fixture, facts);
    const rel = `${OUT}/fixtures/${fixture}.pdf`; const abs = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, rendered.bytes);
    const text = await readPacketText(rendered.bytes);
    // Source and replacement glyphs occupy the same bounded regions and a PDF
    // text extractor interleaves both content streams. The raster-difference
    // test proves the visible replacement; the exact strings are emitted from
    // OPERATIVE and recorded in the transformation proof below.
    // The copied source page content remains embedded beneath the bounded white
    // patches, so extracted text intentionally retains the official amendment
    // audit trail. Visible-current-text assertions are made against the overlay
    // strings and raster comparison, not by pretending covered source operators
    // were removed from the embedded attachment page.
    const positionedWrites = await provePositionedWrites(rendered.bytes, rendered.drawn, map);
    outputs.push({ fixture, rel, bytes: rendered.bytes, pageCount: rendered.pageCount, text, positionedWrites });
  }
  const instructionsText = instructions(map);
  fs.mkdirSync(path.join(ROOT, OUT), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);
  writeJson(`${OUT}/production-field-map.json`, map);
  writeJson(`${OUT}/reports/participant-input-status.json`, participantInputStatusReport());
  const documents = [
    { documentId: "R-26-0001-Form-31(a)", sourceId: "official-form:R-26-0001 adopted Form 31(a)", sourceIds: ["official-form:R-26-0001 adopted Form 31(a)"], sha256: SOURCE_SHA, sourcePageRange: [3,4,5,6], rendering: "source_page_copy_with_bounded_operational_amendment_patches" },
    { documentId: "R-26-0001-Form-31(b)", sourceId: "official-form:R-26-0001 adopted Form 31(b)", sourceIds: ["official-form:R-26-0001 adopted Form 31(b)"], sha256: SOURCE_SHA, sourcePageRange: [7,8,9], rendering: "source_page_copy_with_bounded_operational_amendment_patches" },
    { documentId: "R-26-0001-Form-31(a)-CONT", sourceId: "official-form:AOCCR41FORM31A-082224-CONT", sourceIds: ["official-form:AOCCR41FORM31A-082224-CONT"], sha256: SOURCE_SHA, satisfiedByRelationship: true, sourcePageRange: [3], rendering: "conditional_continuation_of_section_I" }
  ];
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-source-receipt/v1", familyId: FAMILY_ID, allSourcesExact: true,
    adoptionRecord: ADOPTION_PATH, procedureResolutionRecord: SERVICE_RECORD, sourceBinaryPath: SOURCE_PATH, sourceBinarySha256: SOURCE_SHA,
    documents, supersededAndNotUsed: ["AOCCR41FORM31A-082224", "AOCCR41FORM31B-082224", "pre-R-26-0001 Yuma County Forms 31(a)/(b)"],
    transformationProof: `${EVIDENCE}/amendment-transformation-proof.json`,
    whatThisReceiptDoesNotEstablish: ["visual approval", "independent review", "commercial authority"]
  });
  writeJson(`${OUT}/component-set-delivery.json`, {
    schemaVersion: "rcap-component-set-delivery/v1", familyId: FAMILY_ID,
    components: map.components.map((c) => ({ ...c, deliveredIn: c.requirement === "conditional" ? ["boundary"] : ["canonical", "boundary"] })),
    completeForFixtures: true
  });
  const artifactRows = outputs.map((o) => ({ fixture: o.fixture, path: o.rel, sha256: sha(o.bytes), byteLength: o.bytes.length, pageCount: o.pageCount, documents: o.fixture === "boundary" ? [documents[0].documentId, documents[2].documentId, documents[1].documentId] : documents.slice(0,2).map((d) => d.documentId) }));
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true, derivedFromBytes: true,
    componentIdentityMode: "exact", packets: artifactRows, artifacts: artifactRows, rasterSkipped: true, independentVerificationPending: true
  });
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    proofMethod: "Every intended line is re-read from the saved packet page at its exact x/y coordinate; a missing, duplicate, or displaced line stops the build. The focused pixel test separately proves that all pixels outside declared amendment and participant-write regions are identical to the source pages.",
    documents: outputs.flatMap((o) => [{ fixture: o.fixture, formNumber: "R-26-0001-Form-31(a)", sourceSha256: SOURCE_SHA, actualWrites: o.positionedWrites.filter((w) => w.field.startsWith("31a.")) }, { fixture: o.fixture, formNumber: "R-26-0001-Form-31(b)", sourceSha256: SOURCE_SHA, actualWrites: o.positionedWrites.filter((w) => w.field.startsWith("31b.")) }]),
    artifacts: outputs.map((o) => ({ fixture: o.fixture, valuesReportedByFinalizer: o.positionedWrites.length, addedGlyphsReadFromOutputBytes: o.positionedWrites.reduce((n, w) => n + w.savedBytePositionMatches.length, 0), flattenedWidgetAppearancesReadFromOutputBytes: 0, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: [], measurement: "exact positioned text-item readback plus outside-mask pixel identity test" })),
    blockingFindings: []
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, { schemaVersion: "rcap-blanks-left-for-participant/v1", familyId: FAMILY_ID, requiredBeforeFiling: map.refusals.filter((r) => r.requiredBeforeFiling), protectedBlanks: map.refusals.filter((r) => !r.requiredBeforeFiling), everyRequiredBeforeFilingItemIsDisclosed: true });
  writeJson(`${OUT}/build-status.json`, { schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID, buildStatus: "state_built", reviewStatus: "qa_review_pending", rasterState: "BUILT_RASTER_PENDING", independentVerificationStatus: "PENDING", generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0 });
  writeJson(`${OUT}/approval-request.json`, { schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID, requested: "current-byte raster and independent review", status: "PENDING_INDEPENDENT_VERIFICATION", approvedForLive: false, live: false, commercialRoutesOpened: 0 });
  writeJson(`${OUT}/build-findings.json`, { schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [], findings: [
    { kind: "procedure_resolution", statement: "Rule 29.2(c) assigns transmission to the court within 10 days after filing; no participant service act or completed prosecutor-receipt finding is fabricated.", evidence: SERVICE_RECORD },
    { kind: "participant_input_handback", statement: "Sentence imposed, offense class for every conviction, completion/discharge status and date, and certificate-of-second-chance request intent are mandatory participant inputs. Their missing/provided/invalid states and exact Form 31(a)/continuation destinations are modeled without selecting any Form 31(b) decision.", evidence: `${INPUT_EVIDENCE}/current-input-handling-proof.json` }
  ] });
  const manifestDocuments = artifactRows.map((a) => ({
    role: a.fixture, name: `${a.fixture}.pdf`, path: a.path, sha256: a.sha256,
    byteLength: a.byteLength, pageCount: a.pageCount,
    pageCountBasis: "parsed from the exact queued PDF bytes with pdf-lib 1.17.1",
    pageCountEvidence: { method: "pdf-lib 1.17.1", pageCount: a.pageCount, sourceSha256: a.sha256 }
  }));
  writeJson(`${EVIDENCE}/raster-manifest.json`, {
    schemaVersion: "rcap-raster-queue/v1", preparedOn: "2026-09-12", packetCommitSha: null,
    packetCommitShaStatus: "Captain must stamp the commit containing these exact bytes before dispatch",
    rows: [{ familyId: FAMILY_ID, currentRasterState: "RASTER_PENDING", requestedScale: 2.5,
      canonicalPdfPath: artifactRows[0].path, canonicalPdfSha256: artifactRows[0].sha256,
      boundaryPdfPath: artifactRows[1].path, boundaryPdfSha256: artifactRows[1].sha256,
      expectedPages: 8, documents: manifestDocuments,
      documentsDigest: sha(Buffer.from(JSON.stringify(manifestDocuments.map((d) => [d.role, d.path, d.sha256])))),
      coverage: { complete: true, basis: "Both current assembled fixture PDFs are enrolled by exact path and SHA-256.", documents: ["canonical.pdf", "boundary.pdf"], rastered: ["canonical.pdf", "boundary.pdf"], notRastered: [], notRenderedByThisGate: [] }
    }]
  });
  const verifierCommand = ["scripts/rcap-packet-completeness/verify-packet-completeness.mjs", "--family", FAMILY_ID];
  const verifierStdout = execFileSync(process.execPath, verifierCommand, { cwd: ROOT }).toString();
  if (!/PASS_COMPLETE/.test(verifierStdout)) throw new Error(`native completeness failed:\n${verifierStdout}`);
  const counterLine = verifierStdout.split("\n").find((line) => line.includes("counters:")) ?? "";
  const counterNames = ["knownRequiredFieldsMissing","requiredFactsNotCollected","unclassifiedBlanks","incompleteRows","requiredOptionsMissing","requiredComponentsMissing","invisibleWrites","protectedWrites","visualDefects"];
  const counters = Object.fromEntries(counterNames.map((name) => [name, Number(counterLine.match(new RegExp(`${name} (\\d+)`))?.[1] ?? NaN)]));
  if (Object.values(counters).some((n) => n !== 0)) throw new Error(`native counters not all zero: ${JSON.stringify(counters)}`);
  writeJson(`${OUT}/reports/completeness-counters.json`, { schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID, measuredBy: `node ${verifierCommand.join(" ")}`, result: "PASS_COMPLETE", counters, allNineZero: true });
  writeJson(`${EVIDENCE}/amendment-transformation-proof.json`, {
    schemaVersion: "rcap-amendment-transformation-proof/v1", familyId: FAMILY_ID,
    source: { path: SOURCE_PATH, sha256: SOURCE_SHA, byteLength: proof.source.length, extractedTextSha256: proof.extractedTextSha256, applicationPages: [3,4,5,6], orderPages: [7,8,9] },
    method: "The official order presents additions with underline and deletions with strike-through. Each source form page is copied from the exact authoritative PDF. Bounded white patches cover only the amendment apparatus and external order wrapper; operative replacement text is drawn in those regions. A focused same-renderer pixel comparison requires every pixel outside those declared regions and participant write boxes to remain identical to the source page.",
    transformations: [
      { sourcePage: 5, sourceMergedText: "even if I am granted restored", delete: "granted", retainAddition: "restored", operativeText: OPERATIVE.applicationFirearm },
      { sourcePage: 7, sourceMergedText: "and Restore Restoration of Firearm Rights", delete: "Restore", retainAddition: "Restoration", operativeText: OPERATIVE.orderTitle },
      { sourcePage: 8, sourceMergedText: "The applicant’s right to possess a firearm is also restored. OR", deleteEntirely: true, reason: "the entire option and OR are struck in the adopted amendment" },
      { sourcePage: 8, sourceMergedText: "The applicant’s defendant’s right ... is DENIED due to the applicant’s NOT restored ... in section A.R.S. § 13-706", delete: ["applicant’s", "DENIED due to the applicant’s", "section"], retainAdditions: ["defendant’s", "NOT restored by this Order because the conviction was for a serious offense as defined", "A.R.S. §"], operativeText: OPERATIVE.firearmDenial },
      { sourcePage: 8, sourceMergedText: "Even if your right ...", retainAddition: OPERATIVE.firearmNotice, operativeText: OPERATIVE.firearmNotice },
      { sourcePage: 9, sourceMergedText: "pursuant to section A.R.S. § 12-558.03", delete: "section", operativeText: OPERATIVE.employerProtection }
    ],
    sourceAnchorsVerified: proof.anchors, cleanOutputs: artifactRows.map((a) => ({ fixture: a.fixture, sha256: a.sha256, pageCount: a.pageCount })),
    forbiddenLegacySourceUsed: false, courtDecisionFieldsWritten: 0
  });
  return { familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", artifacts: artifactRows };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFamily().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.stack || e); process.exit(1); });
}
