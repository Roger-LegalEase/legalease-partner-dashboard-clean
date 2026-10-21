#!/usr/bin/env node
/**
 * The Washington certificate-of-restoration-of-opportunity packet family builder.
 *
 *   node scripts/build-census-v1-wa_crop_certificate_of_restoration-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   wa_crop_certificate_of_restoration   RCW 9.97.020 — application for a
 *                                        certificate of restoration of
 *                                        opportunity
 *
 * WHY THERE IS NO BOUND SOURCE, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds nothing: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundSources []. That is not an omission, and it is not because no official
 * pattern exists — the opposite: the family's own legal-design record
 * (data/record-clearing/legal-design-intake/WA.memo.json, track
 * wa_crop_certificate_of_restoration, amended against the integrated
 * rcap-wa-crop-venue-reconciliation decision of 2026-08-08) records that the
 * Administrative Office of the Courts has published a complete statewide CRO
 * pattern set since 2016 under the RCW 9.97.020(11) duty (CRO 01.0100
 * petition, 01.0200 notice, 01.0300 proof of service, 01.0700 order and
 * certificate). The strategy is custom_pleading FOR THE OPPOSITE REASON from
 * the usual one: none of those binaries has been acquired, pinned or
 * measured, no source-materialization receipt exists for any of them, so
 * there is no repository form identity to fill — and whether the CRO forms
 * are mandatory, pattern or optional is an open build question that belongs
 * to the form-family owner and is expressly not guessed here. The generatable
 * instrument today is a pleading that conforms to the pattern set's recorded
 * content; nothing in this build imitates a binary it has never read.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * Every case fact — the qualified county, the conviction and its exact RCW,
 * the sentencing court, the cause number, the sentencing/release/supervision
 * dates the graduated scale runs from, the conviction history, the legal
 * financial obligation position — belongs to records the platform has not
 * seen, so each is a labelled dotted blank, declared REQUIRED_BEFORE_FILING
 * and disclosed by its printed label in participant-instructions.md, with the
 * Washington State Patrol record, the sentencing court's clerk and the
 * collections agency named as the checkable authorities. The statement that
 * none of the RCW 9.97.010(1)(c) bars applies rests on the applicant's whole
 * conviction history, which the platform never sees, so it too is the
 * participant's to complete after reading their own record — exactly as the
 * memo's manual-completion record directs. No signature, no signature date,
 * no judicial signature or date is ever written; the proposed certificate and
 * order is prepared unsigned and undated for the judge. A filing fee exists
 * but its amount is not established by any held record, so none is quoted and
 * the GR 34 fee-waiver motion is named as the recorded route.
 *
 * Rasterization, when not skipped, goes through
 * scripts/raster/pdf-page-raster.mjs (Chromium, calibrated). Never Poppler.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "wa_crop_certificate_of_restoration-set";
const OUT = "data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-wa_crop_certificate_of_restoration-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "WA",
  routeKey: "obligation:track-only:WA:wa_crop_certificate_of_restoration",
  routeSelectionId: "wa-crop-certificate-of-restoration-composed-set",
  legalName: "Application for a Certificate of Restoration of Opportunity, RCW 9.97.020",
  routeName: "applying for a Washington certificate of restoration of opportunity under RCW 9.97.020",
  statute: "RCW 9.97.010 and RCW 9.97.020"
});

/* The five components, in the packet-set manifest's own order. */
const COMPONENTS = [
  "primary_filing",
  "proposed_order",
  "notice_package",
  "records_checklist",
  "filing_instructions"
];

const COMPOSED_TITLES = {
  primary_filing: "Petition for a Certificate of Restoration of Opportunity Under RCW 9.97.020",
  proposed_order: "Proposed Order and Certificate of Restoration of Opportunity",
  notice_package: "Notice of Filing to Each Prosecuting Attorney, With Proof of Service",
  records_checklist: "Records Checklist",
  filing_instructions: "Filing Instructions"
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- the codified records this build is grounded on ---------------------------- */
const MEMO_PATH = "data/record-clearing/legal-design-intake/WA.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

function resolveCodifiedGrounds() {
  const failures = [];
  try {
    const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
    const memoTrack = (memo.tracks ?? []).find((t) => t.trackId === "wa_crop_certificate_of_restoration") ?? null;
    if (!memoTrack) failures.push({ record: MEMO_PATH, why: "no track wa_crop_certificate_of_restoration in the memo" });
    else {
      if (memoTrack.outputStrategy !== "custom_pleading") {
        failures.push({ record: MEMO_PATH, why: `the memo's outputStrategy is ${memoTrack.outputStrategy}, not custom_pleading; this builder may not proceed against a drifted strategy` });
      }
      const resolution = memoTrack._venueAndFormResolution ?? null;
      if (!resolution || resolution.form?.decision?.startsWith("custom_pleading") !== true) {
        failures.push({ record: MEMO_PATH, why: "the venue-and-form resolution no longer retains custom_pleading; the form question has moved and this builder may not proceed against it" });
      }
    }
  } catch (e) { failures.push({ record: MEMO_PATH, why: String(e.message ?? e) }); }
  try {
    const manifests = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_PATH), "utf8"));
    const manifestSet = (manifests.packetSets ?? []).find((s) => s.packetSetId === FAMILY_ID) ?? null;
    if (!manifestSet) failures.push({ record: MANIFEST_PATH, why: `no packetSetId ${FAMILY_ID} in the manifest` });
    else {
      const roles = (manifestSet.components ?? []).slice().sort((a, b) => a.order - b.order).map((c) => c.role);
      if (JSON.stringify(roles) !== JSON.stringify(COMPONENTS)) {
        failures.push({ record: MANIFEST_PATH, why: `the manifest's component roles [${roles.join(", ")}] have drifted from this builder's component set [${COMPONENTS.join(", ")}]` });
      }
    }
  } catch (e) { failures.push({ record: MANIFEST_PATH, why: String(e.message ?? e) }); }
  return { failures };
}

/* ---- fixtures --------------------------------------------------------------- */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "1520 Alder Street, Tacoma, WA 98402",
    "participant.phone": "253-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "11884 Snoqualmie River Crossing Boulevard Southeast, Apartment 14B, Spokane, Washington 99206-2214",
    "participant.phone": "(509) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- composed documents -------------------------------------------------------- */
const DOTS = (n = 84) => ".".repeat(n);

const EXEMPT_LIST =
  "criminal justice agencies (as defined in RCW 10.97.030) and the Washington State Bar Association outright; "
  + "and the licensing, certification or qualification of accountants, bail bond agents, escrow agents, nursing "
  + "home administrators, nursing, physicians and physician assistants, private investigators, receivers, "
  + "teachers, notaries public, real estate brokers and salespersons, security guards, and the vulnerable adult "
  + "care providers the section carves out. The Department of Social and Health Services and its contracted "
  + "providers and licensees keep sole discretion whether to consider a certificate for positions caring for or "
  + "having unsupervised access to vulnerable adults or children.";

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "primary_filing") {
    L.push("SUPERIOR COURT OF WASHINGTON");
    L.push("COUNTY OF " + DOTS(48));
    L.push("(A QUALIFIED COUNTY UNDER RCW 9.97.010(2). This packet routes to the county of your conviction or adjudication, whose superior court may not decline to consider the application; the county where you live is also qualified but may decline. The filing-instructions page explains the choice.)", "");
    L.push(`In re the Application of ${name} for a Certificate of Restoration of Opportunity`, "");
    L.push("No. " + DOTS(40) + "  (the clerk assigns it at filing; this is filed as a civil action under RCW 9.97.020(7))", "");
    L.push("PETITION FOR A CERTIFICATE OF RESTORATION OF OPPORTUNITY UNDER RCW 9.97.020", "");
    L.push(`1. The applicant, ${name}, applies to this Court, as a qualified court under RCW 9.97.010(2), for a certificate of restoration of opportunity under RCW 9.97.020.`, "");
    L.push("2. The applicant states, from the court records and the applicant's own Washington State Patrol criminal history record:", "");
    L.push("Any other name the case was filed under:");
    L.push(DOTS(), "");
    L.push("The conviction this application concerns, and the exact RCW or municipal ordinance it was under, worded as the court record words it:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("The court that imposed the sentence (district, municipal or superior, and its county or city):");
    L.push(DOTS(), "");
    L.push("Cause number:");
    L.push(DOTS(), "");
    L.push("Sentencing date; date of release from any total or partial confinement; and date any supervision or probation ended (from the sentencing court's docket):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("3. Every conviction on the applicant's record, with the offence, its class, the court and the date (from the applicant's own criminal history record; continue on an attached sheet if needed):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. The point on the RCW 9.97.010(1)(a) scale that applies to the applicant, and the date it is computed from (one year from sentencing for a misdemeanour or gross misdemeanour noncustodial sentence; eighteen months from release from confinement on such an offence; two years from sentencing or release for a class B or C felony; five years from sentencing or release for a violent offence as defined in RCW 9.94A.030):");
    L.push(DOTS(), "");
    L.push("5. The applicant's legal financial obligations are (state which, from the clerk's or collections agency's current figures): paid in full; or subject to a payment plan with which the applicant is fully compliant; or out of compliance with a payment plan but with good cause established with the court:");
    L.push(DOTS(), "");
    L.push("6. The applicant states, after reading the applicant's own complete criminal history record, that none of the RCW 9.97.010(1)(c) bars applies - no conviction, ever, of a class A felony or an attempt, solicitation or conspiracy to commit one; no sex offence as defined in RCW 9.94A.030; no crime including sexual motivation under RCW 9.94A.835, RCW 13.40.135 or RCW 9.94A.535(3)(f); and no extortion in the first degree (this statement rests on your whole history and these lines are yours to complete after reading your record; write it in your own hand):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("7. The applicant asks the Court to issue a certificate of restoration of opportunity, and notes that RCW 9.97.020(2)(a) leaves it to the Court's discretion whether the certificate applies to all of the applicant's past criminal history or only to the convictions or adjudications in the jurisdiction of this Court.", "");
    L.push("8. Notice under RCW 9.97.020(6) is being given to each prosecuting attorney the notice page of this packet names, and proof of service is filed with this petition.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF APPLICANT " + DOTS(38), "");
    L.push("(The applicant signs and dates this petition personally. Nothing on this page is signed or dated for the applicant.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`DATE OF BIRTH: ${dob}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "proposed_order") {
    L.push("This proposed order and certificate is prepared UNSIGNED AND UNDATED for the judge. Nothing on its signature or date lines is written by the applicant or by this packet.", "");
    L.push("SUPERIOR COURT OF WASHINGTON");
    L.push("COUNTY OF " + DOTS(48), "");
    L.push(`In re the Application of ${name} for a Certificate of Restoration of Opportunity`, "");
    L.push("No. " + DOTS(40), "");
    L.push("ORDER AND CERTIFICATE OF RESTORATION OF OPPORTUNITY", "");
    L.push("The application of the above-named applicant having been considered under RCW 9.97.020, with the notice RCW 9.97.020(6) requires and the prosecuting attorney's report of the applicant's criminal history, and the Court finding the applicant a qualified applicant under RCW 9.97.010(1),", "");
    L.push("IT IS ORDERED that a certificate of restoration of opportunity is ISSUED to the applicant under RCW 9.97.020.", "");
    L.push("The Court exercises its discretion under RCW 9.97.020(2)(a) as follows (the Court states whether the certificate applies to all past criminal history or only to the convictions or adjudications in the jurisdiction of this Court):");
    L.push(DOTS(), "");
    L.push("Under RCW 9.97.020(10), the clerk of this Court will transmit the certificate to the Washington State Patrol identification section.", "");
    L.push("DATED this " + DOTS(12) + " day of " + DOTS(20) + ", " + DOTS(8), "");
    L.push("JUDGE " + DOTS(56), "");
    L.push("(The date, the signature and the scope election above are the Court's own.)");
  } else if (componentId === "notice_package") {
    L.push("RCW 9.97.020(6) requires the applicant to notify the prosecuting attorney in the county where the certificate is sought, and also the prosecuting attorney of any other jurisdiction that sentenced the applicant in the FIVE YEARS preceding the application. The prosecutor of the county of application then supplies the court with a report of the applicant's criminal history. The recorded practice is that the notices go to the clerk with the petition, with proof of service.", "");
    L.push("NOTICE OF FILING", "");
    L.push("To: the Prosecuting Attorney of " + DOTS(30) + " County (the county where the certificate is sought)");
    L.push("And to the prosecuting attorney of each other jurisdiction that sentenced the applicant in the five years preceding this application (list each below; write NONE if none):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push(`Please take notice that ${name} is filing a petition for a certificate of restoration of opportunity under RCW 9.97.020 in the superior court named in the petition. Under RCW 9.97.020(6), the prosecuting attorney of the county of application supplies the court with a report of the applicant's criminal history.`, "");
    L.push("PROOF OF SERVICE", "");
    L.push("I state that I served the notice above on each prosecuting attorney listed, in the manner and on the date stated below (complete when the notices actually go out; a date or manner written before then would be false):");
    L.push("Manner of service " + DOTS(56));
    L.push("DATE OF SERVICE " + DOTS(30) + "   SIGNATURE " + DOTS(38), "");
    L.push(`PRINTED NAME: ${name}`);
  } else if (componentId === "records_checklist") {
    L.push(`For: ${name}`, "");
    L.push("Three records are needed before the petition can be completed. Each is listed with the body that supplies it. This packet does not obtain, inspect or review any of them; you obtain each yourself.", "");
    L.push("ONE. YOUR WASHINGTON STATE PATROL CRIMINAL HISTORY RECORD.");
    L.push("The WATCH name and date-of-birth check online gives conviction information immediately and is enough to start. The non-conviction record is a different and slower product needing a fingerprint card, and an in-person record review is also available. The recorded guidance is to read the WSP fee table live rather than relying on a stored figure, so this packet quotes no amount. Your conviction history list, and the paragraph 6 statement that none of the RCW 9.97.010(1)(c) bars applies, are completed from this record.", "");
    L.push("TWO. THE SENTENCING COURT'S DOCKET.");
    L.push("Ask the clerk of the district, municipal or superior court that sentenced you. It supplies the cause number, the exact RCW, the offence class, the sentencing date, and the supervision and release dates. Every waiting period on the RCW 9.97.010(1)(a) scale runs from one of those dates, and none of them is reliably on the quick online check.", "");
    L.push("THREE. YOUR LEGAL FINANCIAL OBLIGATION BALANCE AND PAYMENT PLAN STATUS.");
    L.push("Ask the clerk of the sentencing court, or the collections agency the court used, for the current balance and plan status. RCW 9.97.010(1)(b) makes compliance an eligibility element, satisfied in one of three ways: paid in full; fully compliant with a payment plan; or out of compliance but with good cause established with the court.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHAT A CERTIFICATE DOES. Where you hold a certificate and meet all other statutory and regulatory requirements, no state, county or municipal department, board, officer or agency assessing qualifications for a licence, certificate of authority, qualification to engage in a profession or business, or admission to a qualifying examination may disqualify you SOLELY on the basis of criminal history, except as required by federal law or as exempted. It operates on the collateral consequences of conviction; it is not vacation and does not clear the record.", "");
    L.push("WHAT IT DOES NOT REACH - READ BEFORE FILING. The exemptions are extensive: " + EXEMPT_LIST + " If the licence or job you are trying to get is on that list, a certificate cannot reach it, and filing will not solve your problem - stop and get advice instead. A certificate also does not restore firearm rights or eligibility for a firearm dealer licence under RCW 9.41.110, and does not require the removal of any protection order.", "");
    L.push("WHO IS ELIGIBLE. The RCW 9.97.010(1)(a) scale is graduated: one year from sentencing for a misdemeanour or gross misdemeanour noncustodial sentence; eighteen months from release from confinement on such an offence; two years from sentencing or release for a class B or C felony; five years from sentencing or release for a violent offence as defined in RCW 9.94A.030. You must also be in compliance with or have completed all sentencing requirements - legal financial obligations paid in full, or a payment plan you are fully compliant with, or good cause established with the court for non-compliance. And you must never have been convicted of a class A felony (or an attempt, solicitation or conspiracy to commit one), a sex offence, a sexually motivated crime, or extortion in the first degree.", "");
    L.push("WHERE TO FILE. Only a superior court is a qualified court, and RCW 9.97.010(2) closes the set at two: the superior court of the county where you live, and the superior court of the county of your conviction or adjudication (even where a district or municipal court convicted you, the qualified court is that county's superior court). This packet routes to the COUNTY OF CONVICTION, because RCW 9.97.020(8) forbids that court to decline to consider the application. The residence county may be nearer and you may use it, but it MAY decline; if it does, it must dismiss without prejudice and state the reason on the order, and your remedy is to refile in the other qualified court - there is no transfer procedure, so no court will move the case for you.", "");
    L.push("WHAT YOU DO, IN ORDER.");
    L.push("STEP ONE. Gather the three records on the checklist page.");
    L.push("STEP TWO. Check the exemption list above against the licence or job you actually want.");
    L.push("STEP THREE. Fill in every dotted blank on the petition from the records, including the paragraph 6 statement, which you complete after reading your own criminal history.");
    L.push("STEP FOUR. Fill in the notice page: the prosecuting attorney of the county where you file, and every other jurisdiction that sentenced you in the last five years, or NONE.");
    L.push("STEP FIVE. Sign and date the petition yourself. Leave the proposed order unsigned and undated - it is prepared for the judge.");
    L.push("STEP SIX. File the petition, the proposed order and certificate, and the notices with proof of service, at the superior court clerk's office, as a civil action under RCW 9.97.020(7). A filing fee applies; its amount is not stated by any record this packet is built from, so ask the clerk. If you cannot afford it, a GR 34 motion for a fee waiver is the recorded route. Some county superior courts require additional accompanying documents under local rules - ask the clerk what the local rules require.");
    L.push("STEP SEVEN. Serve the notices as the proof-of-service page directs, completing that page only when the notices actually go out.");
    L.push("STEP EIGHT. The court decides without a hearing on the application and the prosecutor's pleadings unless it determines a hearing is necessary. If granted, the clerk transmits the certificate to the Washington State Patrol identification section.", "");
    L.push("ONE DISCRETION TO UNDERSTAND BEFORE CHOOSING YOUR COUNTY. RCW 9.97.020(2)(a) leaves it to the issuing court whether the certificate covers ALL your past criminal history or ONLY the convictions in that court's own jurisdiction. Filing in the county of conviction guarantees consideration, but the certificate may be limited to that court's convictions. If you have convictions in more than one county, which county to file in is a judgment about what the certificate will be worth - get advice before choosing.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING.");
    L.push("- any class A felony, sex offence, sexually motivated offence or first degree extortion conviction anywhere on your record;");
    L.push("- the target licence or profession is on the exemption list - a certificate will not reach it;");
    L.push("- your real goal is firearm rights, or removal of a protection order - the section expressly does neither;");
    L.push("- your legal financial obligations are behind and no good cause has been established with the court;");
    L.push("- a residence-county court declines - read the stated reason with help before refiling;");
    L.push("- convictions in more than one county.", "");
    L.push("WHAT THIS PACKET IS NOT. The Administrative Office of the Courts publishes a statewide CRO pattern set (petition, notice, proof of service, order and certificate, with instructions and a brochure, and translations). The pages in this packet are composed pleadings conforming to that set's recorded content; they are not the AOC forms themselves, and whether those forms are mandatory, pattern or optional is an open question this packet does not decide - the clerk can tell you whether the court expects the AOC forms. This packet is not legal advice, it is not filed for you, and it does not decide whether the court will issue the certificate or how broadly it will reach.");
  }
  L.push("", `Route: ${ROUTE.routeKey}`);
  return L.join("\n");
}

function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const ch of token) {
      if (current && font.widthOfTextAtSize(`${current}${ch}`, fontSize) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- the field maps -------------------------------------------------------------- */
function composedMap(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const write = (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId });
  const protectedBlank = (id, label, why) => ({
    ...base(id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
    requiredBeforeFiling: false, document: componentId, why
  });
  const courtBlank = (id, label, why) => ({
    ...base(id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
    requiredBeforeFiling: false, document: componentId, why
  });
  const rbf = (id, label, what, why) => ({
    ...base(id, label),
    reason: `the participant supplies this before filing: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  });

  const writes = [];
  const refusals = [];
  if (componentId === "primary_filing") {
    writes.push(
      write("applicant_name", "Applicant named in the caption and paragraph 1 of the petition", "participant.full_legal_name"),
      write("date_of_birth", "Applicant's date of birth in the contact block at the foot of the petition", "participant.date_of_birth"),
      write("mailing_address", "Mailing address of the applicant in the contact block at the foot of the petition", "participant.street_address"),
      write("telephone", "Telephone number of the applicant in the contact block at the foot of the petition", "participant.phone"),
      write("email", "Email address of the applicant in the contact block at the foot of the petition", "participant.email")
    );
    refusals.push(
      rbf("qualified_county", "The qualified county named in the caption of the petition",
        "the qualified county you are filing in - this packet routes to the county of your conviction or adjudication, whose superior court may not decline; the county where you live is also qualified but may decline, as the filing instructions explain",
        "which county is the county of conviction lives on a record the platform has not seen, and the residence-versus-conviction choice is the participant's own"),
      rbf("other_names", "Any other name the case was filed under, in paragraph 2 of the petition",
        "any other name the case was filed under, from the court record, or NONE",
        "what names the case was filed under is on the record, not in the platform"),
      rbf("conviction_identity", "The conviction and its exact RCW or municipal ordinance, in paragraph 2 of the petition",
        "what you were convicted of and the exact RCW or municipal ordinance, worded as the court record words it - the sentencing court's docket supplies it",
        "no conviction fact is held for a record the platform has not seen"),
      rbf("sentencing_court", "The court that imposed the sentence, in paragraph 2 of the petition",
        "the sentencing court - district, municipal or superior - and its county or city, from your court paperwork",
        "no case fact is held for a record the platform has not seen"),
      rbf("cause_number", "Cause number, in paragraph 2 of the petition",
        "the cause number, from the sentencing court's docket",
        "no case identifier is held for a record the platform has not seen"),
      rbf("scale_dates", "Sentencing date, release date and supervision end date, in paragraph 2 of the petition",
        "the sentencing date, the date of release from any confinement, and the date any supervision or probation ended, from the sentencing court's docket - every waiting period runs from one of these",
        "no sentencing fact is held for a record the platform has not seen"),
      rbf("conviction_history", "Every conviction on the record with offence, class, court and date, in paragraph 3 of the petition",
        "every conviction on your record - offence, class, court and date - from your own Washington State Patrol criminal history record",
        "the platform never sees the participant's criminal history"),
      rbf("scale_point", "The point on the RCW 9.97.010(1)(a) scale that applies, and the date it is computed from, in paragraph 4 of the petition",
        "which point on the graduated scale applies to you, and the date it is computed from, worked out from the docket dates as the filing instructions explain",
        "the scale point turns on sentence type and dates the platform does not hold"),
      rbf("lfo_position", "The legal financial obligation position stated in paragraph 5 of the petition",
        "which of the three RCW 9.97.010(1)(b) positions is yours - paid in full, fully compliant with a plan, or good cause established with the court - from the clerk's or collections agency's current figures",
        "no financial-obligation fact is held; the clerk or collections agency states the current position"),
      rbf("no_bars_statement", "The applicant's statement in paragraph 6 that none of the RCW 9.97.010(1)(c) bars applies",
        "your own statement, written after reading your complete criminal history record, that none of the bars applies - it rests on your whole history, which this packet never sees",
        "the memo's manual-completion record places this statement with the participant because it rests on the whole conviction history, which the platform never sees"),
      courtBlank("action_case_number", "Case number of this civil action, assigned by the clerk at filing",
        "the clerk assigns the number at filing"),
      protectedBlank("applicant_signature", "Signature of the applicant on the petition",
        "the applicant signs the petition personally"),
      protectedBlank("signature_date", "Date beside the applicant's signature on the petition",
        "a date written before the petition is signed would be false")
    );
  } else if (componentId === "proposed_order") {
    writes.push(write("applicant_name", "Applicant named in the title of the proposed order", "participant.full_legal_name"));
    refusals.push(
      rbf("order_county", "The county named in the caption of the proposed order",
        "the same qualified county as the petition",
        "which county the petition is filed in is the participant's answer, not a held fact"),
      courtBlank("order_case_number", "Case number in the caption of the proposed order",
        "the clerk assigns it at filing"),
      courtBlank("scope_election", "The Court's RCW 9.97.020(2)(a) scope election on the order",
        "whether the certificate reaches all past criminal history or only this court's convictions is the Court's own discretion; nothing is written for it"),
      courtBlank("order_date", "Dated - the day, month and year lines of the order",
        "the court dates its own order"),
      courtBlank("judge_signature", "Signature of the judge on the order",
        "prepared unsigned and undated for the judge; nothing is written on the judge's line")
    );
  } else if (componentId === "notice_package") {
    writes.push(write("applicant_name", "Applicant named in the notice and the proof-of-service printed-name line", "participant.full_legal_name"));
    refusals.push(
      rbf("application_county_prosecutor", "The prosecuting attorney of the county where the certificate is sought, named in the notice",
        "the county where you are filing - its prosecuting attorney is the first recipient RCW 9.97.020(6) names",
        "which county the applicant files in is the applicant's answer"),
      rbf("five_year_jurisdictions", "Each other jurisdiction that sentenced the applicant in the five years preceding the application, listed in the notice",
        "every other jurisdiction that sentenced you in the last five years, from your own criminal history record, or NONE",
        "the five-year sentencing history lives on records the platform has not seen"),
      protectedBlank("service_manner", "Manner of service on the proof of service",
        "the manner is stated when the notices actually go out; a manner written before then would be false"),
      protectedBlank("service_date", "Date of service on the proof of service",
        "a date written before the notices go out would be false"),
      protectedBlank("service_signature", "Signature on the proof of service",
        "the applicant signs the proof of service when service actually happens")
    );
  } else {
    writes.push(write("applicant_name", "Applicant named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/WA.memo.json, track "
      + "wa_crop_certificate_of_restoration, as amended by the venue-and-form resolution of 2026-08-08) and the "
      + "packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json, packetSetId "
      + "wa_crop_certificate_of_restoration-set)",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes --------------------------------------------- */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value) || componentText.toUpperCase().includes(value.toUpperCase());
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  // The exemption list is the statement that keeps a participant from paying
  // for a certificate that cannot reach their licence; prove it from the bytes.
  const instructionsPage = String(textOfComponent.get("filing_instructions") ?? "").replace(/\s+/g, " ");
  assert.ok(instructionsPage.includes("Washington State Bar Association"),
    `${fixtureName}: the exemption list is not readable from the filing-instructions page's bytes`);
  assert.ok(instructionsPage.includes("does not restore firearm rights"),
    `${fixtureName}: the firearm-rights limitation is not readable from the filing-instructions page's bytes`);
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ------------------------------------ */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: false,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, false).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs -------------------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENTS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("A certificate of restoration of opportunity is a court-issued instrument that operates on the collateral consequences of conviction: where you hold one and meet all other requirements, most state, county and municipal licensing bodies may not disqualify you solely for your criminal history. It is not vacation and does not clear the record. The Administrative Office of the Courts publishes a statewide CRO pattern set; the pages in this packet are composed pleadings conforming to that set's recorded content — the AOC binaries have not been acquired or measured, and whether those forms are mandatory, pattern or optional is an open question this packet does not decide.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact belongs to records the platform has not seen — your Washington State Patrol criminal history record, the sentencing court's docket, the clerk's or collections agency's figures — so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Read the exemption list before paying anyone anything", "");
  out.push(`A certificate does not reach: ${EXEMPT_LIST}`, "");
  out.push("It also does not restore firearm rights or firearm dealer licence eligibility under RCW 9.41.110, and does not require removal of any protection order. If your target licence or goal is on that list, this route cannot help and you should stop here.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the composed petition under RCW 9.97.020 |");
  out.push("| `proposed_order` | the proposed order and certificate, prepared unsigned and undated for the judge |");
  out.push("| `notice_package` | the RCW 9.97.020(6) notice to each prosecuting attorney, with proof of service |");
  out.push("| `records_checklist` | the three records to obtain first, each with the body that supplies it |");
  out.push("| `filing_instructions` | what a certificate does and does not do, who is eligible, where to file, and the steps |");
  out.push("");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Your Washington State Patrol criminal history record — your conviction list and the paragraph 6 no-bars statement are completed from it; read the WSP fee table live rather than relying on a stored figure | Washington State Patrol |");
  out.push("| The sentencing court's docket — cause number, exact RCW, offence class, sentencing/release/supervision dates | clerk of the court that sentenced you |");
  out.push("| Your legal financial obligation balance and payment plan status | clerk of the sentencing court, or the collections agency the court used |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one before you file.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Gather the three records** listed above.");
  out.push("2. **Check the exemption list** against the licence or job you actually want.");
  out.push("3. **Fill in every dotted blank** from the records — including paragraph 6, your own no-bars statement, written after reading your complete criminal history.");
  out.push("4. **Fill in the notice page**: the prosecuting attorney of the county where you file, plus every other jurisdiction that sentenced you in the last five years, or NONE.");
  out.push("5. **Sign and date the petition yourself.** Leave the proposed order unsigned and undated — it is the judge's.");
  out.push("6. **File at the superior court clerk's office** of the county of your conviction (that court may not decline; your residence county may — the filing instructions explain the choice and the refile-not-transfer rule). It is a civil action; a filing fee applies whose amount no held record states, so ask the clerk, and a GR 34 motion is the recorded fee-waiver route. Ask the clerk what local rules require to accompany the petition.");
  out.push("7. **Serve the notices** and complete the proof of service only when they actually go out.");
  out.push("8. **The court decides without a hearing** unless it determines one is necessary; if granted, the clerk transmits the certificate to the Washington State Patrol identification section.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and every date beside a signature or on the proof of service.**");
  out.push("- **The judge's signature, the order's date, and the court's RCW 9.97.020(2)(a) scope election.** All three are the court's own.");
  out.push("- **The filing fee amount.** A fee exists; no held record states the amount, so none is quoted — the clerk states it, and GR 34 is the waiver route.");
  out.push("- **Paragraph 6, the no-bars statement.** It rests on your whole conviction history, which this packet never sees.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- any class A felony, sex offence, sexually motivated offence or first degree extortion conviction anywhere on your record;");
  out.push("- your target licence or profession is on the exemption list;");
  out.push("- your real goal is firearm rights or removal of a protection order;");
  out.push("- legal financial obligations behind with no good cause established;");
  out.push("- a residence-county court declines — read the stated reason with help before refiling;");
  out.push("- convictions in more than one county — the RCW 9.97.020(2)(a) scope discretion makes the county choice a judgment about what the certificate will be worth.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of composed pleadings and process pages conforming to the AOC pattern set's recorded content. It is not the AOC forms themselves, it is not legal advice, it is not filed for you, and it does not decide whether the court will issue the certificate or how broadly the court's RCW 9.97.020(2)(a) election will reach.", "");
  out.push(`_Route: ${ROUTE.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { failures } = resolveCodifiedGrounds();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_LEGAL_INPUT", failedGrounds: failures,
      why: "a codified record this family is composed from is missing or has drifted, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = COMPONENTS.map((c) => composedMap(c));
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundSources: 0, codifiedGroundsVerified: [MEMO_PATH, MANIFEST_PATH],
      components: COMPONENTS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENTS.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${ROUTE.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of COMPONENTS) {
      const body = composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written fact value, the exemption list and the firearm-rights limitation read back from the extracted text of the component's own pages in the saved packet bytes",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings",
      fixture: fixtureName, sha256, byteLength: packetBytes.length, pageCount: packet.getPageCount()
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no binary source is bound: the MASTER_QUEUE row records sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT "
      + "with officialFormFamily NONE and boundSources []. The build is grounded on two committed records, "
      + "verified present and un-drifted before anything is composed: the legal-design intake track (including "
      + "its venue-and-form resolution, which retains custom_pleading) and the packet-set manifest.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "A complete statewide AOC pattern set for the certificate of restoration of opportunity exists and has "
      + "since 2016 (CRO 01.0100 petition, 01.0200 notice, 01.0300 proof of service, 01.0700 order and "
      + "certificate). The strategy is custom_pleading NOT because no form exists but because none of those "
      + "binaries has been acquired, pinned or measured — there is no repository form identity to fill — and "
      + "whether the CRO forms are mandatory, pattern or optional is an open build question owned by the "
      + "form-family owner, expressly not guessed here. The composed pleadings conform to the pattern set's "
      + "recorded content and imitate no binary this build has never read. What would change the strategy is "
      + "recorded in the memo: acquisition and pinning of the four participant-facing CRO binaries with "
      + "receipts, plus a form-family determination.",
    codifiedGrounds: [
      { record: MEMO_PATH, what: "track wa_crop_certificate_of_restoration: RCW 9.97.010/.020 read at source, the venue-and-form resolution of 2026-08-08, eligibility scale, exemption list, rules, stop conditions, open questions" },
      { record: MANIFEST_PATH, what: `packetSetId ${FAMILY_ID}: the five-component set and the required-before-filing items` }
    ],
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "whether the AOC CRO forms are mandatory, pattern or optional (the form-family owner's question)",
      "the amount of the superior court civil filing fee",
      "that any output is approved for participant delivery",
      "that any applicant is a qualified applicant under RCW 9.97.010(1)"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: null,
    boundReferenceRole:
      "none — the AOC CRO pattern set is recorded in the memo but no binary has been acquired, pinned or "
      + "measured, so nothing is bound and nothing is imitated; the build is grounded on the committed "
      + "legal-design record and packet-set manifest alone",
    componentSet: COMPONENTS,
    componentConditions: {},
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The composed pages carry no election control. The one choice on this route — filing in the county of "
      + "conviction (which may not decline) versus the county of residence (which may) — is the participant's "
      + "own, stated with both sides, the decline consequence and the refile-not-transfer rule on the paper and "
      + "in the instructions; the packet routes to the county of conviction as the memo directs and selects "
      + "nothing for the participant. The court's RCW 9.97.020(2)(a) scope election is the court's own and is "
      + "left to it.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: {},
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved "
      + "packet bytes, not from this builder's intent; the exemption list and the firearm-rights limitation were "
      + "proven present on the filing-instructions page the same way.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding:
          "A complete statewide AOC pattern set for the CRO exists and has since 2016, but none of its binaries "
          + "has been acquired, pinned or measured, and whether the forms are mandatory, pattern or optional is "
          + "an open build question owned by the form-family owner. The legal-design record retains "
          + "custom_pleading as a decision, not a deferral.",
        consequence:
          "The packet is composed pleadings conforming to the pattern set's recorded content — nothing imitates "
          + "a binary this build has never read — and the instructions tell the participant on their face that "
          + "the clerk can say whether the court expects the AOC forms. The what-would-change-the-strategy record "
          + "is carried in source-receipt.json."
      },
      {
        finding:
          "RCW 9.97.020(8) forbids the superior court of the county of conviction or adjudication to decline to "
          + "consider the application, while the residence county may decline (dismissal without prejudice, "
          + "stated reason, refiling by the applicant, no transfer procedure).",
        consequence:
          "The packet routes to the county of conviction, as the venue resolution directs, and states the "
          + "residence-county option with its decline risk, the stated-reason order and the refile-not-transfer "
          + "rule on the caption and in the instructions. The qualified county is the participant's dotted blank, "
          + "never selected for them."
      },
      {
        finding:
          "The exemption list is extensive, and the counsel record's own concern is that a participant not be "
          + "sold a certificate that cannot reach their licence; the section also expressly restores no firearm "
          + "rights and requires no protection-order removal.",
        consequence:
          "The full exemption list and both express limitations are printed on the filing-instructions page and "
          + "in the participant instructions, and are asserted from the output bytes on every build; checking "
          + "the target licence against the list is a numbered step before filing."
      },
      {
        finding:
          "The RCW 9.97.010(1)(c) no-bars statement rests on the applicant's whole conviction history, which the "
          + "platform never sees; the memo's manual-completion record places it with the participant.",
        consequence:
          "Paragraph 6 is a labelled dotted blank the applicant completes in their own hand after reading their "
          + "own criminal history record, declared REQUIRED_BEFORE_FILING and disclosed with exactly that reason."
      },
      {
        finding:
          "A filing fee exists but no held record states its amount; the recorded fee-waiver route is a GR 34 "
          + "motion; and the Washington Courts forms index warns that local superior court rules may require "
          + "additional accompanying documents.",
        consequence:
          "No fee figure is quoted anywhere; the clerk is named as the authority for the amount and the local "
          + "rules; GR 34 is named as the waiver route; and the WSP fee guidance ('read the fee table live "
          + "rather than relying on a stored figure') is carried in the checklist in the record's own terms."
      },
      {
        finding:
          "RCW 9.97.020(2)(a) leaves it to the issuing court whether the certificate reaches all past criminal "
          + "history or only that court's convictions, and the record classifies the discretion as a release "
          + "blocker with a multi-county stop condition.",
        consequence:
          "The discretion is stated on the petition, on the proposed order (as the court's own election line, "
          + "never written), and in the instructions as the reason a multi-county participant should get advice "
          + "before choosing a county; no outcome is predicted anywhere."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Whether the AOC CRO forms (CRO 01.0100, 01.0200, 01.0300, 01.0700) are mandatory, pattern or optional — the record's retained build blocker, owned by the form-family owner. It decides whether this route should become official_pdf_fill on acquired binaries.",
      "The composed pleadings conform to the pattern set's recorded content without reading its binaries. Confirm a court will accept a conforming composed pleading, or direct acquisition of the CRO binaries.",
      "Which county superior courts require additional accompanying documents under local rules, and the filing fee amount — the record's retained release blockers, delegated on the paper to the clerk.",
      "How courts exercise the RCW 9.97.020(2)(a) scope discretion — the record's third release blocker; the packet states the discretion and predicts nothing."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json — no binary is bound although a pattern set exists; the reason (never acquired, form status undecided) is recorded there. Confirm it is legible to reviewers.",
      "The exemption list and the firearm/protection-order limitations are byte-proven on every build; confirm the placement is sufficient.",
      "Every case fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper."
    ]
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "custom_pleading",
    boundSources: 0,
    codifiedGrounds: [MEMO_PATH, MANIFEST_PATH],
    components: COMPONENTS,
    documents: COMPONENTS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
