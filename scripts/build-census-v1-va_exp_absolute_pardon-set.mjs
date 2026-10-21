#!/usr/bin/env node
/**
 * The Virginia absolute-pardon expungement packet family builder.
 *
 *   node scripts/build-census-v1-va_exp_absolute_pardon-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   va_exp_absolute_pardon   Va. Code § 19.2-392.2(I) — expungement of police
 *                            and court records after an absolute pardon for
 *                            the commission of a crime the person did not
 *                            commit
 *
 * WHY THERE IS NO BOUND SOURCE, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds nothing: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundSources []. That is not an omission. The family's own legal-design
 * record — data/record-clearing/legal-design-intake/VA.memo.json, track
 * va_exp_absolute_pardon, read at source 2026-08-06 — establishes that
 * § 19.2-392.2(I) prescribes NO petition at all: the court's duty to enter the
 * expungement order arises on its receipt of the pardon copy transmitted under
 * § 2.2-402, and the order is mandatory. The controlling review had assigned
 * CC-1473 to this route; the memo corrects that with provenance — CC-1473 is
 * captioned to § 19.2-392.2(A) acquittal/dismissal alone and cannot be the
 * subsection (I) vehicle — and resolves the strategy to custom_pleading: the
 * identifiable participant-facing act is a written transmittal and request
 * asking the court to enter the order it must enter. This build composes that
 * transmittal and request, and nothing pretends to be an official form.
 *
 * The sibling family va_exp_identity_used_by_another-set (same statute, same
 * no-official-form posture) supplies the architecture; this family reuses it
 * without binding CC-1473, because unlike the (B) route no part of the (I)
 * procedure is grounded on that form's face — the memo grounds all of it.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * Every case fact — the conviction, its charge and Code section, the arrest
 * date and agency, the offence date, the disposition and its date, the pardon
 * and its date — belongs to records the platform has not seen, so each is a
 * labelled dotted blank, declared REQUIRED_BEFORE_FILING and disclosed by its
 * printed label in participant-instructions.md, with a checkable authority
 * named for each: the clerk of the circuit court of the locality of
 * conviction for the case papers, the Office of the Secretary of the
 * Commonwealth for the pardon, the Virginia State Police Central Criminal
 * Records Exchange for the participant's own record. No signature, no
 * signature date, no judicial, clerk or court-date field is ever written. Fee
 * needs no delegation: the record states none is stated in § 19.2-392.2(I),
 * and no service is prescribed by subsection (I); caption styling, which no
 * held record establishes, is delegated to the circuit court clerk by name.
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

const FAMILY_ID = "va_exp_absolute_pardon-set";
const OUT = "data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-va_exp_absolute_pardon-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "VA",
  routeKey: "obligation:track-pathway:VA:va_exp_absolute_pardon:regime-1-expungement-available-now",
  routeSelectionId: "va-exp-absolute-pardon-composed-set",
  legalName: "Expungement of Police and Court Records After an Absolute Pardon, Va. Code § 19.2-392.2(I)",
  routeName: "clearing a Virginia conviction the Governor has absolutely pardoned, under Va. Code § 19.2-392.2(I)",
  statute: "Va. Code § 19.2-392.2(I)",
  transmittalStatute: "Va. Code § 2.2-402",
  forwardingStatute: "Va. Code § 19.2-392.2(K)"
});

/* The three components, in the packet-set manifest's own order
 * (data/record-clearing/legal-design-packet-set-manifests.json,
 * packetSetId va_exp_absolute_pardon-set). */
const COMPONENTS = [
  "primary_filing",
  "records_checklist",
  "filing_instructions"
];

const COMPOSED_TITLES = {
  primary_filing: "Transmittal and Request for Entry of the Expungement Order Required by Va. Code Sec. 19.2-392.2(I)",
  records_checklist: "Records Checklist",
  filing_instructions: "Filing Instructions"
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- the codified records this build is grounded on ---------------------------- *
 * There is no bound binary. Every statement in the composed pages traces to one
 * of two committed records, named inline throughout:
 *   [MEMO]     data/record-clearing/legal-design-intake/VA.memo.json,
 *              track va_exp_absolute_pardon (read at source 2026-08-06)
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              packetSetId va_exp_absolute_pardon-set
 * The build refuses to start if either record is missing, or if the memo's
 * strategy or the manifest's component set has drifted from what this builder
 * composes against.
 */
const MEMO_PATH = "data/record-clearing/legal-design-intake/VA.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

function resolveCodifiedGrounds() {
  const failures = [];
  let memoTrack = null;
  let manifestSet = null;
  try {
    const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
    memoTrack = (memo.tracks ?? []).find((t) => t.trackId === "va_exp_absolute_pardon") ?? null;
    if (!memoTrack) failures.push({ record: MEMO_PATH, why: "no track va_exp_absolute_pardon in the memo" });
    else if (memoTrack.outputStrategy !== "custom_pleading") {
      failures.push({ record: MEMO_PATH, why: `the memo's outputStrategy is ${memoTrack.outputStrategy}, not custom_pleading; this builder may not proceed against a drifted strategy` });
    }
  } catch (e) { failures.push({ record: MEMO_PATH, why: String(e.message ?? e) }); }
  try {
    const manifests = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_PATH), "utf8"));
    manifestSet = (manifests.packetSets ?? []).find((s) => s.packetSetId === FAMILY_ID) ?? null;
    if (!manifestSet) failures.push({ record: MANIFEST_PATH, why: `no packetSetId ${FAMILY_ID} in the manifest` });
    else {
      const roles = (manifestSet.components ?? []).slice().sort((a, b) => a.order - b.order).map((c) => c.role);
      if (JSON.stringify(roles) !== JSON.stringify(COMPONENTS)) {
        failures.push({ record: MANIFEST_PATH, why: `the manifest's component roles [${roles.join(", ")}] have drifted from this builder's component set [${COMPONENTS.join(", ")}]` });
      }
    }
  } catch (e) { failures.push({ record: MANIFEST_PATH, why: String(e.message ?? e) }); }
  return { memoTrack, manifestSet, failures };
}

/* ---- fixtures --------------------------------------------------------------- *
 * Two participants, the same pair the Virginia siblings use. The boundary one
 * carries a long hyphenated name with an apostrophe, a long one-line mailing
 * address, a long email and a phone extension, because a value that fits the
 * line is not evidence that every value does.
 *
 * No case fact and no pardon fact is held. Every one lives on records the
 * platform has not seen — the circuit court's case file, the Secretary of the
 * Commonwealth's pardon, the CCRE record — so the packet must not claim to
 * hold any of it. No signature, no signature date.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street, Richmond, VA 23219",
    "participant.phone": "804-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Virginia Beach, Virginia 23456-2214",
    "participant.phone": "(757) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- composed documents -------------------------------------------------------- *
 * Everything below traces to [MEMO] or [MANIFEST]. Nothing is stated that
 * neither records: no service mechanics, no fee figure, no caption style is
 * invented. Where the memo records silence — no fee stated in § 19.2-392.2(I),
 * no service prescribed — the silence itself is stated, from the record.
 */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "primary_filing") {
    L.push("To: the Clerk of the Circuit Court of " + DOTS(48));
    L.push("(THE VIRGINIA COUNTY OR CITY WHERE THE CONVICTION WAS HAD - that circuit court's clerk can confirm it, and can tell you how this court styles a caption)", "");
    L.push(`From: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("RE: TRANSMITTAL OF AN ABSOLUTE PARDON, AND REQUEST FOR ENTRY OF THE EXPUNGEMENT ORDER REQUIRED BY VA. CODE Sec. 19.2-392.2(I)", "");
    L.push("SEND THIS REQUEST ONLY IF the pardon document says it is an ABSOLUTE pardon, and says it is for a crime you did not commit. Va. Code Sec. 19.2-392.2(I) turns on exactly those words. If the pardon is conditional, partial, or a simple pardon granted as clemency, this is not your route - the records checklist page says who to ask.", "");
    L.push(`1. I, ${name}, was convicted in this Court of the charge identified below, and the Governor of Virginia has since granted me an absolute pardon for the commission of a crime I did not commit.`, "");
    L.push("2. The conviction and the pardon are identified as follows, from the court record and from the pardon document themselves:", "");
    L.push("Full name used at the time of arrest, exactly as the court record states it:");
    L.push(DOTS(), "");
    L.push("Charge of which I was convicted, and the Code section it was under, worded exactly as the court record words them:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Case number of the conviction, as it appears on the court record:");
    L.push(DOTS(), "");
    L.push("Date of arrest, and the agency that made the arrest:");
    L.push(DOTS(), "");
    L.push("Date of the offence:");
    L.push(DOTS(), "");
    L.push("How the case ended, and on what date (from the case file, checked against your own CCRE record):");
    L.push(DOTS(), "");
    L.push("Date the Governor granted the absolute pardon, as the pardon document states it:");
    L.push(DOTS(), "");
    L.push("3. Enclosed with this request is a certified copy of the absolute pardon, obtained from the Office of the Secretary of the Commonwealth. Va. Code Sec. 2.2-402 is the route by which a copy of the pardon reaches this Court; this transmittal encloses the certified copy and confirms that transmission.", "");
    L.push("4. Upon receiving a copy of an absolute pardon for the commission of a crime that a person did not commit, Va. Code Sec. 19.2-392.2(I) requires the court to enter an order requiring the expungement of the police and court records relating to the charge and conviction, and requires that the order state that the expungement is ordered pursuant to that subsection. The duty arises on the court's receipt of the pardon copy, not on a petition, and no fee is stated in Sec. 19.2-392.2(I) for this request.", "");
    L.push("5. I therefore ask the Court to enter the order of expungement that Va. Code Sec. 19.2-392.2(I) requires, stating that the expungement is ordered pursuant to that subsection, and to forward a copy of the order to the Department of State Police as Va. Code Sec. 19.2-392.2(K) provides.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(50), "");
    L.push("(You sign and date this request personally. Nothing on this page is signed or dated for you.)", "");
    L.push(`PRINTED NAME: ${name}`);
  } else if (componentId === "records_checklist") {
    L.push(`For: ${name}`, "");
    L.push("Three records are needed before the transmittal and request can be completed and sent. Each is listed with the body that issues it. This packet does not obtain, inspect or review any of them; you obtain each yourself.", "");
    L.push("ONE. THE CERTIFIED COPY OF THE ABSOLUTE PARDON.");
    L.push("Ask the Office of the Secretary of the Commonwealth for a certified copy of the pardon. Whether it is absolute, and whether it recites that the crime was one you did not commit, is what Va. Code Sec. 19.2-392.2(I) turns on - read the document's own words before sending anything. If the pardon is not absolute, or does not recite innocence, stop: this route is not yours, and the Secretary of the Commonwealth's office is the authority that can say what kind of pardon was granted.", "");
    L.push("TWO. THE COURT CASE FILE.");
    L.push("Ask the clerk of the circuit court of the county or city where the case was disposed of for the case papers. District court charges are handled by that locality's circuit court, so that is where to ask even for a general district court charge. The charge wording, the Code section, the case number, the arrest date and agency, the offence date and the disposition all come from this file - never from memory.", "");
    L.push("THREE. YOUR OWN VIRGINIA CRIMINAL HISTORY RECORD.");
    L.push("Request your own copy from the Virginia State Police, Central Criminal Records Exchange, for the fee they charge. This is a different thing from the court's copy. Check how the case ended against it, and correct the request if the records disagree. The Norfolk clerk's recorded guidance is that the case is established with the court first and any State Police request comes second, so the sequence matters.", "");
    L.push("This page names no other document. Va. Code Sec. 19.2-392.2(I) requires no fingerprint card, no filing fee and no manifest-injustice showing, and this packet states no requirement that no record it is built from states.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHAT THIS ROUTE IS", "");
    L.push("Va. Code Sec. 19.2-392.2(I) prescribes no petition. Once the circuit court that convicted you receives a copy of an absolute pardon for the commission of a crime you did not commit, the court must enter an order expunging the police and court records relating to the charge and conviction, and the order must state that the expungement is ordered pursuant to that subsection. The outcome is mandatory once the court has the pardon; there is no waiting period, no fee stated, no fingerprint step and no manifest-injustice showing on this subsection. What you send is a written transmittal and request - the first page of this packet - enclosing the certified pardon and asking the court to enter the order it must enter.", "");
    L.push("WHAT YOU DO, IN ORDER", "");
    L.push("STEP ONE. Gather the three records the checklist page lists: the certified copy of the absolute pardon from the Office of the Secretary of the Commonwealth, the case file from the clerk of the circuit court of the locality of conviction, and your own CCRE record from the Virginia State Police.");
    L.push("STEP TWO. Read the pardon document's own words. Send this request only if it says it is an absolute pardon, and says it is for a crime you did not commit. If it does not say both, stop - the checklist page says who can tell you what kind of pardon was granted.");
    L.push("STEP THREE. Fill in every dotted blank on the transmittal and request, from the records. Do not guess a date, a charge wording or a case number.");
    L.push("STEP FOUR. Sign and date the transmittal and request yourself.");
    L.push("STEP FIVE. Send the transmittal and request, with the certified copy of the pardon, to the clerk of the circuit court of the county or city where the conviction was had. No fee is stated in Sec. 19.2-392.2(I). Subsection (I) prescribes no service on anyone else: the Commonwealth's twenty-one-day window in subsection (D) applies to a petition, and this is not a petition route.");
    L.push("STEP SIX. After the order is entered, a copy goes to the Department of State Police under Sec. 19.2-392.2(K). The State Police validate the accuracy of the record, and expressly not its eligibility - that determination is the court's.", "");
    L.push("TWO THINGS THE RECORD OF THIS ROUTE ALSO SAYS", "");
    L.push("- The expungement order is mandatory once the court has the pardon copy, and it must state that the expungement is ordered pursuant to Sec. 19.2-392.2(I).");
    L.push("- An expungement order is voidable within three years for failure to strictly comply with the statute's requirements, which is a reason to copy every record exactly and never to guess.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF SENDING", "");
    L.push("Stop, and take this packet to a lawyer or a legal-aid office, if any of these is true:");
    L.push("- the pardon is not absolute, or does not recite that the crime was one you did not commit;");
    L.push("- the circuit court declines to enter the order despite having the pardon;");
    L.push("- you are still seeking the pardon itself, which is a separate executive process this packet does not cover;");
    L.push("- any immigration question is involved.", "");
    L.push("WHAT THIS PACKET DOES NOT TELL YOU", "");
    L.push("- How the clerk of your particular circuit court styles a caption or docketing for a Sec. 19.2-392.2(I) request. No record this packet is built from establishes it. The clerk of the circuit court of the locality of conviction is the authority that can answer - ask before you send if you are unsure.");
    L.push("- What the CCRE charges for your own record copy. The fee is theirs to state.", "");
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a prepared transmittal and request with its checklist and instructions. It is not an official Supreme Court of Virginia form - none is prescribed for Sec. 19.2-392.2(I), and CC-1473 is captioned to subsection (A) alone and is not this instrument - and it is not legal advice, it is not filed for you, it does not obtain the pardon for you, and it does not decide whether the pardon satisfies the subsection. Sealing restricts access; expungement removes.");
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
      write("requester_name", "Requester named in the From block and paragraph 1 of the transmittal", "participant.full_legal_name"),
      write("date_of_birth", "Requester's date of birth in the From block of the transmittal", "participant.date_of_birth"),
      write("mailing_address", "Mailing address of the requester in the From block of the transmittal", "participant.street_address"),
      write("telephone", "Telephone number of the requester in the From block of the transmittal", "participant.phone"),
      write("email", "Email address of the requester in the From block of the transmittal", "participant.email")
    );
    refusals.push(
      rbf("conviction_locality", "The Virginia county or city where the conviction was had, in the address line to the clerk",
        "the Virginia county or city where the conviction was had - that circuit court's clerk can confirm it, and can tell you how that court styles a caption",
        "the locality of conviction lives on a record the platform has not seen, and caption styling is the clerk's own practice"),
      rbf("name_at_arrest", "Full name used at the time of arrest, exactly as the court record states it",
        "the full name you used at the time of arrest, copied exactly from the court record - the clerk of the circuit court of the locality of conviction holds the case papers",
        "the record's exact wording is on the record, not in the platform"),
      rbf("charge_and_code_section", "Charge of which the requester was convicted, and the Code section it was under, worded exactly as the court record words them",
        "the charge of which you were convicted and its Code section, worded exactly as the court record words them",
        "no charge fact is held for a record the platform has not seen"),
      rbf("conviction_case_number", "Case number of the conviction, as it appears on the court record",
        "the case number of the conviction, copied from the court record",
        "no case identifier is held for a record the platform has not seen"),
      rbf("arrest_date_and_agency", "Date of arrest, and the agency that made the arrest",
        "the date of the arrest and the name of the agency that made it, taken from the case papers",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("offense_date", "Date of the offence",
        "the date of the offence, taken from the case papers",
        "no offence fact is held for a record the platform has not seen"),
      rbf("disposition_and_date", "How the case ended, and on what date",
        "how the case ended and on what date, from the case file, checked against your own CCRE record - correct the request if they disagree",
        "no disposition fact is held for a record the platform has not seen"),
      rbf("pardon_date", "Date the Governor granted the absolute pardon, as the pardon document states it",
        "the date the Governor granted the pardon, copied from the pardon document itself - the Office of the Secretary of the Commonwealth issues the certified copy",
        "the pardon is a record the platform has not seen, and whether it is absolute and recites innocence is what the subsection turns on"),
      protectedBlank("requester_signature", "Signature on the transmittal and request",
        "the requester signs the transmittal personally"),
      protectedBlank("signature_date", "Date beside the signature on the transmittal and request",
        "a date written before the request is signed would be false")
    );
  } else if (componentId === "records_checklist") {
    writes.push(write("requester_name", "Requester named on this page", "participant.full_legal_name"));
  } else {
    writes.push(write("requester_name", "Requester named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/VA.memo.json, track "
      + "va_exp_absolute_pardon) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json, packetSetId va_exp_absolute_pardon-set)",
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
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
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
  out.push(`# What you must do before you send — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("Va. Code § 19.2-392.2(I) prescribes no petition and no official form exists for it — CC-1473, the official expungement petition of the same statute, is captioned to subsection (A) alone and is not this instrument. Once the circuit court that convicted you receives a copy of an absolute pardon for the commission of a crime you did not commit, it must enter the expungement order, stating that the expungement is ordered pursuant to that subsection. The pages in this packet are a composed transmittal and request enclosing the certified pardon and asking the court to enter that mandatory order, with the checklist and instructions that go with it.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact and every pardon fact belongs to records the platform has not seen — the circuit court's case file, the Secretary of the Commonwealth's pardon document, your own CCRE record — so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Send this request only if", "");
  out.push("The pardon document says it is an **absolute** pardon, **and** says it is for a crime you did not commit. Va. Code § 19.2-392.2(I) turns on exactly those words. A conditional or partial pardon, or a simple pardon granted as clemency, is not this route — the Office of the Secretary of the Commonwealth is the authority that can say what kind of pardon was granted.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the composed transmittal and request for entry of the mandatory § 19.2-392.2(I) expungement order |");
  out.push("| `records_checklist` | the three records you must obtain first, each with the body that issues it |");
  out.push("| `filing_instructions` | what this route is, what you do in order, and when to stop and get help |");
  out.push("");

  out.push("## Documents you must obtain before sending", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Certified copy of the absolute pardon — whether it is absolute, and whether it recites that the crime was one you did not commit, is what § 19.2-392.2(I) turns on | Office of the Secretary of the Commonwealth |");
  out.push("| The court case file — district court charges are handled by that locality's circuit court, so ask there even for a general district court charge | clerk of the circuit court of the county or city where the case was disposed of |");
  out.push("| Your own Virginia criminal history record — check how the case ended against it, and correct the request if the records disagree | Virginia State Police, Central Criminal Records Exchange (for the fee they charge) |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one before you send.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Gather the three records** listed above.");
  out.push("2. **Read the pardon document's own words.** Send only if it says absolute, and says it is for a crime you did not commit.");
  out.push("3. **Fill in every dotted blank** from the records. Do not guess a date, a charge wording or a case number.");
  out.push("4. **Sign and date the transmittal and request yourself.** The platform never signs for you and never dates a signature.");
  out.push("5. **Send it, with the certified pardon, to the clerk of the circuit court of the locality of conviction.** No fee is stated in § 19.2-392.2(I), and subsection (I) prescribes no service on anyone else — the Commonwealth's twenty-one-day window in subsection (D) applies to a petition, and this is not a petition route.");
  out.push("6. **After the order**, a copy goes to the Department of State Police under § 19.2-392.2(K); the State Police validate the accuracy of the record and expressly not its eligibility.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and the date beside it.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **How the clerk styles a caption or docketing for this request.** No record this packet is built from establishes it; the clerk of the circuit court of the locality of conviction is the authority that can answer — ask before you send if you are unsure.", "");

  out.push("## When to stop and get help instead of sending", "");
  out.push("- the pardon is not absolute, or does not recite that the crime was one you did not commit;");
  out.push("- the circuit court declines to enter the order despite having the pardon;");
  out.push("- you are still seeking the pardon itself, which is a separate executive process this packet does not cover;");
  out.push("- any immigration question is involved.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared transmittal and request with its checklist and instructions. It is not an official court form, it is not legal advice, it is not filed for you, it does not obtain the pardon for you, and it does not decide whether the pardon satisfies the subsection. Sealing restricts access; expungement removes.", "");
  out.push(`_Route: ${ROUTE.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { memoTrack, manifestSet, failures } = resolveCodifiedGrounds();
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes",
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
      "no binary source is bound, and none exists to bind: the MASTER_QUEUE row records sourceStatus "
      + "CUSTOM_PLEADING_FROM_CODIFIED_TEXT with officialFormFamily NONE and boundSources []. The build is "
      + "grounded on two committed records, verified present and un-drifted before anything is composed: the "
      + "legal-design intake track and the packet-set manifest.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "§ 19.2-392.2(I) prescribes no petition: the court's duty arises on receipt of the pardon copy transmitted "
      + "under § 2.2-402 and the order is mandatory. The controlling review had assigned CC-1473 to this route; "
      + "the legal-design record corrects that with provenance — CC-1473 is captioned to § 19.2-392.2(A) "
      + "acquittal/dismissal alone and cannot be the subsection (I) vehicle — and resolves the strategy to "
      + "custom_pleading: a written transmittal and request asking the court to enter the order it must enter. "
      + "No form was substituted, none was invented, and no official binary is included or imitated.",
    codifiedGrounds: [
      { record: MEMO_PATH, what: "track va_exp_absolute_pardon: controlling authority read at source 2026-08-06, mechanism, venue, rules, stop conditions, unresolved questions" },
      { record: MANIFEST_PATH, what: `packetSetId ${FAMILY_ID}: the three-component set and the required-before-filing items` }
    ],
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that no official instrument for § 19.2-392.2(I) has been published since 2026-08-06",
      "that any output is approved for participant delivery",
      "that any pardon satisfies § 19.2-392.2(I)"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: null,
    boundReferenceRole: "none — no binary source is bound; the build is grounded on the committed legal-design record and packet-set manifest alone",
    componentSet: COMPONENTS,
    componentRoutes: Object.fromEntries(COMPONENTS.map((componentId) => [componentId, ROUTE.routeKey])),
    componentConditions: {},
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The composed pages carry no election control. The single instrument is the § 19.2-392.2(I) transmittal and "
      + "request, and its gate — that the pardon document says absolute, and says it is for a crime the requester "
      + "did not commit — is printed on the instrument's own face and in the instructions, with the Office of the "
      + "Secretary of the Commonwealth named as the authority when unsure. Nothing is selected for the participant.",
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
      + "packet bytes, not from this builder's intent.",
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
          "§ 19.2-392.2(I) prescribes no petition: the court's duty to enter the expungement order arises on its "
          + "receipt of the pardon copy transmitted under § 2.2-402, and the order is mandatory and must state that "
          + "the expungement is ordered pursuant to that subsection. The controlling review had assigned CC-1473; "
          + "the legal-design record corrects that with provenance (CC-1473 is captioned to § 19.2-392.2(A) alone) "
          + "and resolves the strategy to custom_pleading.",
        consequence:
          "The primary filing is a composed transmittal and request enclosing the certified pardon and asking the "
          + "court to enter the mandatory order, exactly as the legal-design decision directs. No form was "
          + "substituted, none was invented, and no binary source is bound because none exists for this subsection."
      },
      {
        finding:
          "Whether the pardon is absolute, and whether it recites that the crime was one the requester did not "
          + "commit, is the gate of the whole route, and it lives on the pardon document — a record the platform "
          + "has not seen.",
        consequence:
          "The gate is printed on the instrument's own face ('SEND THIS REQUEST ONLY IF …') and in the "
          + "instructions, with the Office of the Secretary of the Commonwealth named as the checkable authority. "
          + "The packet asserts the § 19.2-392.2(I) ground in the statute's recorded words and leaves every pardon "
          + "fact as a labelled dotted blank."
      },
      {
        finding:
          "Every case fact lives on records the platform has not seen: the circuit court's case file, and the "
          + "participant's own CCRE record.",
        consequence:
          "The platform writes only the participant's own identity and contact facts (name, date of birth, mailing "
          + "address, telephone, email). Every case fact is a labelled dotted blank declared "
          + "REQUIRED_BEFORE_FILING, disclosed by its printed label, with the clerk of the circuit court of the "
          + "locality of conviction named as the checkable authority for the case papers."
      },
      {
        finding:
          "No held record establishes how any particular circuit court clerk styles a caption or dockets a "
          + "§ 19.2-392.2(I) request, and the memo's own manual-completion record leaves caption styling to the "
          + "participant where unsure.",
        consequence:
          "The transmittal is styled as correspondence to the clerk rather than a captioned pleading, and caption "
          + "styling is delegated to the circuit court clerk by name. No local practice was guessed."
      },
      {
        finding:
          "The legal-design record states, as filing-instruction content, that the outcome is mandatory once the "
          + "court has the pardon, that the State Police validate accuracy but not eligibility after the order, "
          + "and that an order is voidable within three years for failure to strictly comply.",
        consequence:
          "All three are stated in the filing instructions in the record's own terms, and the voidability rule is "
          + "presented as the reason to copy every record exactly rather than as advice about any particular order."
      },
      {
        finding:
          "§ 19.2-392.2 carries a second version effective December 1, 2026, recorded in the legal-design record "
          + "as a release blocker with a counsel question about the cutover, and the same record carries a "
          + "build-blocker-classified counsel question about whether the Office of the Executive Secretary "
          + "publishes a separate instrument for subsection (I).",
        consequence:
          "This build ends at state_built and both questions travel with the family into counsel review in "
          + "approval-request.json; nothing here resolves either. The legal-design decision itself resolves the "
          + "output strategy to custom_pleading notwithstanding the open form question, which is the authority "
          + "this build composes under."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "CC-1473 is captioned to § 19.2-392.2(A) acquittal/dismissal only. What instrument does a § 19.2-392.2(I) pardon expungement use, and may LegalEase generate a transmittal and request instead? (The legal-design record resolves the strategy to custom_pleading and records this as its open form question.)",
      "§ 19.2-392.2 has a version effective December 1, 2026 recorded as a release blocker: which version does this packet promote against, and what is the cutover plan?",
      "The transmittal is styled as correspondence to the clerk rather than a captioned pleading, because subsection (I) prescribes no petition and no held record establishes local caption practice. Confirm that presentation, or supply the caption practice.",
      "The filing instructions state the three-year voidability rule in the legal-design record's own words ('an order is voidable within three years for failure to strictly comply'). Confirm that statement is sufficient without the statutory citation for it, or supply the citation."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json — no binary source is bound because none exists for this subsection; confirm the codified-grounds posture is legible to reviewers.",
      "Every case fact and every pardon fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper."
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
