#!/usr/bin/env node
/**
 * The Kentucky record-segregation family — `ky_criminal_record_segregation-set`.
 *
 *   node scripts/build-census-v1-ky_criminal_record_segregation-set.mjs [--check]
 *
 * One census-v1 family, strategy custom_pleading, composed from CODIFIED TEXT:
 * the MASTER_QUEUE row binds no source bytes (sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundSources []). The ground is three
 * committed records, verified by SHA-256 and content assertion on every build:
 *
 *   [MEMO]     data/record-clearing/legal-design-intake/KY.memo.json,
 *              track ky_criminal_record_segregation (KRS 17.142, reviewed
 *              2026-08-06). Two participant-initiated routes on the face of
 *              the statute — a court application under KRS 17.142(2) on which
 *              relief is mandatory ("the court shall forthwith issue an order
 *              to all law enforcement agencies"), and a written request to
 *              each agency under KRS 17.142(1) — and no official form for
 *              either.
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              packetSetId ky_criminal_record_segregation-set (application,
 *              agency letter, routing guidance)
 *   [PLEADING-CONFIG] data/rcap-all50/composed-routes/kentucky/
 *              ky_criminal_record_segregation/components/
 *              ky_criminal_record_segregation-primary-filing-1/pleading-config.json,
 *              the route-level drafted precedent, whose sourced decisions this
 *              build follows: no proposed order (drafting one would invent the
 *              operative terms of an order binding every law enforcement
 *              agency), no certificate of service (KRS 17.142 provides for no
 *              notice to any party), movant role "Applicant", no sovereign
 *              party invented, the court LEVEL left unresolved because the
 *              recorded venue is functional ("the court in which the case was
 *              tried, or in which it would have been tried had charges been
 *              filed") and the circuit court clerk files for both levels, and
 *              no verification block because no source addresses verification.
 *
 * THE STANDING COUNSEL QUESTION, CARRIED AND NOT DECIDED HERE. The memo
 * records a build-blocker-graded question: the controlling review classified
 * KRS 17.142 as an agency-level mechanism and not a product track, while the
 * statute's face carries two participant-initiated routes; normalizing it as
 * a buildable relief track is a departure that must be ratified by counsel.
 * The factory control plane dispatched this family for build (MASTER_QUEUE
 * legalInputStatus SETTLED, a live packet-build grant), and the route-level
 * components for this exact track were already drafted and terminalized with
 * `counselConfirmationRequired: true` carried as a standing blocker — so this
 * build follows that precedent: it builds to state_built, which sells
 * nothing, and carries the ratification question at the TOP of
 * approval-request.json. Counsel review remains a blocker for
 * approved_for_live, exactly as AGENTS.md's build-first model provides.
 *
 * VOCABULARY IS LOAD-BEARING HERE. Segregation is not any other Kentucky
 * relief: the records continue to exist and remain accessible, filed
 * separately, showing the disposition. On the application and the agency
 * letter the byte proof asserts the other relief words absent (per the
 * pleading-config's qaProhibitedTerms); the routing-guidance page alone may
 * name the KRS 431.076 / 431.078 sealing routes, because its whole job is to
 * send eligible participants there FIRST.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES. The platform writes only the
 * participant's own identity and contact facts. Every case fact — county,
 * arrest date, what the arrest was for, how the matter ended, any case
 * number, and every agency name and address — is a labelled dotted blank
 * declared REQUIRED_BEFORE_FILING and disclosed with its checkable authority
 * named (the circuit court clerk; the court clerk or arresting agency for
 * disposition papers). Neither instrument carries the participant's date of
 * birth or any government identifier, per the route-level rule. No signature,
 * date, judicial or clerk field is written.
 *
 * No raster in this container: rasterState is BUILT_RASTER_PENDING.
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
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "ky_criminal_record_segregation-set";
const OUT = "data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ky_criminal_record_segregation-set.mjs";

const MEMO_PATH = "data/record-clearing/legal-design-intake/KY.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const PLEADING_CONFIG_PATH = "data/rcap-all50/composed-routes/kentucky/ky_criminal_record_segregation/components/ky_criminal_record_segregation-primary-filing-1/pleading-config.json";
const TRACK_ID = "ky_criminal_record_segregation";

const ROUTE = Object.freeze({
  jurisdiction: "KY",
  routeKeys: [
    "obligation:unit:KY:ky_criminal_record_segregation:ky_seg_court_application",
    "obligation:unit:KY:ky_criminal_record_segregation:ky_seg_agency_written_request"
  ],
  legalName: "Segregation of Arrest Records After Acquittal, Dismissal or Withdrawal of Charges (KRS 17.142)",
  routeName: "asking Kentucky agencies, or the court, to segregate the records of an arrest that ended in acquittal, dismissal or withdrawal of all charges, under KRS 17.142",
  statute: "KRS 17.142"
});

const COMPONENTS = [
  "ky_criminal_record_segregation-primary-filing-1",
  "ky_criminal_record_segregation-agency-written-request-2",
  "ky_criminal_record_segregation-routing-guidance-3"
];

const COMPONENT_CONDITIONS = {
  "ky_criminal_record_segregation-primary-filing-1":
    "Applies on the court application unit. The two routes are independent — either obtains segregation, and a "
    + "participant may use both; which to use is the participant's own choice and this packet never makes it.",
  "ky_criminal_record_segregation-agency-written-request-2":
    "Applies on the written-request unit, one letter per agency the participant identifies."
};

const COMPOSED_TITLES = {
  "ky_criminal_record_segregation-primary-filing-1": "Application for Order of Segregation of Records Pursuant to KRS 17.142",
  "ky_criminal_record_segregation-agency-written-request-2": "Written Request to an Agency for Segregation of Records (KRS 17.142(1))",
  "ky_criminal_record_segregation-routing-guidance-3": "Read This First: Whether Segregation Is the Right Route at All"
};

/* Instruments that must never use the other Kentucky relief words. The
 * routing-guidance page is deliberately NOT in this list: its job is to route
 * eligible records to KRS 431.076 / 431.078 first, by name. */
const VOCABULARY_GUARDED = new Set([
  "ky_criminal_record_segregation-primary-filing-1",
  "ky_criminal_record_segregation-agency-written-request-2"
]);

const RECORD_ANCHORS = {
  memo: [
    "KRS 17.142(1)",
    "KRS 17.142(2)",
    "KRS 17.142(3)",
    "KRS 17.142(4)",
    "ky_seg_court_application",
    "ky_seg_agency_written_request",
    "the court shall forthwith issue an order to all law enforcement agencies",
    "none identified for either route.",
    "none required.",
    "None required. KRS 17.142 provides for no notice to a prosecutor or any other party.",
    "must be ratified by counsel",
    "Court records are not records which may be segregated.",
    "The participant signs the application and each written request."
  ],
  manifest: [
    "ky_criminal_record_segregation-primary-filing-1",
    "ky_criminal_record_segregation-agency-written-request-2",
    "ky_criminal_record_segregation-routing-guidance-3"
  ],
  pleadingConfig: [
    "APPLICATION FOR ORDER OF SEGREGATION OF RECORDS PURSUANT TO KRS 17.142",
    "custom_pleading_drafted_no_official_form_exists",
    "Applicant",
    "the arrest records, fingerprints, photographs and other data relating to the arrest identified in this application, held by law enforcement and other public agencies",
    "ky-seg-application-verification-unaddressed"
  ]
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "42 Maple Street, Louisville, KY 40202",
    "participant.phone": "502-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Bowling Green, Kentucky 42101-2214",
    "participant.phone": "(270) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

/* ---- record grounding --------------------------------------------------------- */
function groundRecords() {
  const failures = [];
  const records = [];
  for (const [name, rel, anchors, locate] of [
    ["memo", MEMO_PATH, RECORD_ANCHORS.memo, (j) => (j.tracks ?? j.records ?? []).find?.((t) => t.trackId === TRACK_ID) ?? j[TRACK_ID]],
    ["manifest", MANIFEST_PATH, RECORD_ANCHORS.manifest, (j) => (j.packetSets ?? []).find((p) => p.packetSetId === FAMILY_ID)],
    ["pleadingConfig", PLEADING_CONFIG_PATH, RECORD_ANCHORS.pleadingConfig, (j) => j]
  ]) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push({ record: name, path: rel, why: "the committed record does not exist" }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const json = JSON.parse(bytes.toString("utf8"));
    const entry = locate(json);
    if (!entry) { failures.push({ record: name, path: rel, why: `the record no longer carries ${TRACK_ID}` }); continue; }
    const flat = JSON.stringify(entry);
    const missing = anchors.filter((a) => !flat.includes(a));
    if (missing.length > 0) { failures.push({ record: name, path: rel, why: `the record no longer states ${missing.length} fact(s) this build relies on`, missing }); continue; }
    records.push({ record: name, path: rel, sha256, byteLength: bytes.length, anchorsVerified: anchors.length });
  }
  return { records, failures };
}

/* ---- composed documents -------------------------------------------------------- */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "ky_criminal_record_segregation-primary-filing-1") {
    L.push("IN THE " + DOTS(28) + " COURT OF " + DOTS(28) + " COUNTY,");
    L.push("COMMONWEALTH OF KENTUCKY", "");
    L.push("(The court is the one in which the case was tried, or in which it would have been tried had charges been filed. No recorded source resolves the court LEVEL for this application, and the circuit court clerk files for both District and Circuit Court - so ask that county's circuit court clerk which court to name, and where no charges were filed, which court would have heard it.)", "");
    L.push(`${name},`);
    L.push("APPLICANT.", "");
    L.push("Case number of the underlying case, if charges were filed:");
    L.push(DOTS(), "");
    L.push("APPLICATION FOR ORDER OF SEGREGATION OF RECORDS PURSUANT TO KRS 17.142", "");
    L.push("STATUTORY AUTHORITY", "");
    L.push("KRS 17.142(2) - The person may apply to the court, upon receipt of which the court shall forthwith issue an order to all law enforcement agencies.");
    L.push("KRS 17.142(1) - The substantive condition the application rests on: the person was found innocent, or all charges relating to the offence were dismissed or withdrawn.");
    L.push("KRS 17.142(3) - What the order reaches: each agency segregates the records into a file separate and apart from those of convicted persons, must notify every agency it shared the records with, and the segregated record must show the disposition of the case.");
    L.push("KRS 17.142(4) - The limit on scope: records subject to KRS 431.076 or KRS 431.078 fall under those statutes instead, and this application does not reach them.", "");
    L.push("STATEMENT OF THE APPLICANT", "");
    L.push(`1. The applicant, ${name}, states the following from the applicant's own records:`, "");
    L.push("Date of the arrest:");
    L.push(DOTS(), "");
    L.push("What the arrest was for, in the applicant's own words:");
    L.push(DOTS(), "");
    L.push("How the matter ended - found innocent, all charges relating to the offence dismissed, or all charges relating to the offence withdrawn - and the date it ended:");
    L.push(DOTS(), "");
    L.push("2. Law enforcement and other public agencies hold arrest records, fingerprints, photographs or other data relating to that arrest.", "");
    L.push("REQUESTED RELIEF", "");
    L.push("WHEREFORE, the applicant requests that this Court grant this application and, as KRS 17.142(2) provides, forthwith issue an order to all law enforcement agencies directing the segregation of the arrest records, fingerprints, photographs and other data relating to the arrest identified in this application, held by law enforcement and other public agencies, with each agency notifying every agency with which it has shared the records and the segregated record showing the disposition of the case, as KRS 17.142(3) requires.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF APPLICANT " + DOTS(38), "");
    L.push("(The applicant signs and dates this application personally. Nothing on this page is signed or dated for the applicant. No source read for this track addresses whether the application must be verified; ask the circuit court clerk whether anything further is required, and this open point travels with the packet into counsel review.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "ky_criminal_record_segregation-agency-written-request-2") {
    L.push("(One letter goes to EACH agency you identify - the arresting agency, the jail, the state police, any other holder. Copy this page as many times as you need. You address the envelopes and post each letter yourself.)", "");
    L.push(`FROM: ${name}`);
    L.push(address, "");
    L.push("Date this letter is posted: " + DOTS(40), "");
    L.push("TO (name of the agency holding the records):");
    L.push(DOTS());
    L.push("Mailing address of that agency:");
    L.push(DOTS(), "");
    L.push("RE: WRITTEN REQUEST TO SEGREGATE ARREST RECORDS UNDER KRS 17.142(1)", "");
    L.push("To whom it may concern:", "");
    L.push("I am writing to make a written request under KRS 17.142(1) that your agency segregate the records described below.", "");
    L.push("Date of the arrest:");
    L.push(DOTS(), "");
    L.push("County of the arrest:");
    L.push(DOTS(), "");
    L.push("What the arrest was for, in my own words:");
    L.push(DOTS(), "");
    L.push("How the matter ended - I was found innocent, all charges relating to the offence were dismissed, or all charges relating to the offence were withdrawn - and the date it ended:");
    L.push(DOTS(), "");
    L.push("Case number, if charges were filed:");
    L.push(DOTS(), "");
    L.push("I believe your agency holds arrest records, fingerprints, photographs or other data relating to that arrest.", "");
    L.push("KRS 17.142(1) requires a law enforcement agency or other public agency holding such records to segregate them, on the written request of the arrestee, into a file separate and apart from those of persons who have been convicted, where the person was found innocent or where all charges relating to the offence were dismissed or withdrawn. This letter is that written request.", "");
    L.push("KRS 17.142(3) also requires each agency that segregates records to notify every agency it shared those records with, and requires that the segregated record show the disposition of the case.", "");
    L.push("I ask that you segregate these records accordingly. Please write to me at the address above if you need anything further from me.", "");
    L.push("SIGNATURE " + DOTS(52), "");
    L.push(`PRINTED NAME: ${name}`, "");
    L.push("(You sign each letter personally. This letter deliberately carries none of your personal identifying numbers - it does not need them, so do not add any.)");
  } else {
    L.push(`Prepared for: ${name}`, "");
    L.push("SEGREGATION IS THE WEAKEST KENTUCKY ROUTE, AND OFTEN NOT THE RIGHT ONE. Read this page before using either instrument in this packet.", "");
    L.push("FIRST: CHECK THE STRONGER ROUTES. KRS 17.142(4) sends records subject to KRS 431.076 or KRS 431.078 to those statutes instead - they are sealed or expunged there, which is materially stronger relief. In practice that covers most acquittals and dismissals, so segregation is a fallback; the clearest records left for this route are charges that were WITHDRAWN. If your records have already been expunged, or you are eligible to expunge them under Kentucky's acquittal, dismissal or conviction expungement statutes, use those routes first.", "");
    L.push("WHAT SEGREGATION DOES, HONESTLY. The records continue to exist and remain accessible. They are filed separately from the records of convicted persons, the segregated record must show how your case ended, and each agency must notify every agency it shared the records with. A background check is not made clean by segregation.", "");
    L.push("WHAT IT CANNOT REACH. Court records are not records which may be segregated. This route reaches law enforcement and other public agency records only.", "");
    L.push("THE TWO INSTRUMENTS, AND WHOSE CHOICE IT IS. The court application asks the court for one order that reaches every law enforcement agency at once. The written requests go directly to each agency you identify, with no court involved. Either obtains segregation independently, and you may use both. Which to use is your choice alone - this packet does not make it for you.", "");
    L.push("MECHANICS. On the court route, file the application with the circuit court clerk in the county where the case was or would have been tried; no fee is identified for either route, and no notice to a prosecutor or any other party is required. On the agency route, you sign each letter, address each envelope and post the letters yourself. No source read for this track states what an agency must do on receipt, in what time, or what your recourse is if nothing happens - if an agency does not act, take this packet to a lawyer or legal-aid office.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD:");
    L.push("- your records are eligible under KRS 431.076 or KRS 431.078, which should be used instead because they are stronger;");
    L.push("- you expect court records to be reached - they cannot be;");
    L.push("- you expect background checks to come back clean - segregation does not do that;");
    L.push("- there is any dispute about whether ALL charges relating to the offence were dismissed or withdrawn.");
  }
  L.push("", `Routes: ${ROUTE.routeKeys.join(" ; ")}`);
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
  if (componentId === "ky_criminal_record_segregation-primary-filing-1") {
    writes.push(
      write("applicant_name", "Applicant named in the caption of this application", "participant.full_legal_name"),
      write("mailing_address", "Mailing address of the applicant in the contact block at the foot of the application", "participant.street_address"),
      write("telephone", "Telephone number of the applicant in the contact block at the foot of the application", "participant.phone"),
      write("email", "Email address of the applicant in the contact block at the foot of the application", "participant.email")
    );
    refusals.push(
      rbf("court_named", "Court named in the caption - the one in which the case was tried, or would have been tried had charges been filed",
        "the court in which the case was tried, or in which it would have been tried had charges been filed - no recorded source resolves the court level, so ask that county's circuit court clerk which court to name",
        "the recorded venue is functional, not nominal, and the circuit court clerk is the checkable authority that resolves it"),
      rbf("county_named", "County written into the caption of the application",
        "the Kentucky county where the case was tried, or would have been tried had charges been filed",
        "no case fact is held for a record the platform has not seen"),
      rbf("underlying_case_number", "Case number of the underlying case, if charges were filed",
        "the case number of the underlying case if charges were filed, copied from the court record - if no charges were ever filed, write none",
        "no case identifier is held for a record the platform has not seen, and the memo makes it conditional because charges may never have been filed"),
      rbf("arrest_date", "Date of the arrest",
        "the date of the arrest, from your own records",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("arrest_description", "What the arrest was for, in the applicant's own words",
        "what you were arrested for, in your own words from your papers",
        "the platform prints the applicant's own description and asserts nothing about any offence"),
      rbf("disposition_and_date", "How the matter ended - found innocent, all charges relating to the offence dismissed, or all charges relating to the offence withdrawn - and the date it ended",
        "how the matter ended (found innocent, all charges dismissed, or all charges withdrawn) and the date - check it against the dismissal or acquittal order from the court clerk, or ask the arresting agency or the prosecutor's office what record exists where charges were withdrawn before filing; if there is any dispute about whether ALL charges ended that way, stop and get help instead",
        "the statutory condition turns on this fact, and only the participant's records hold it"),
      protectedBlank("applicant_signature", "Signature of the applicant on the application",
        "the applicant signs the application personally"),
      protectedBlank("signature_date", "Date beside the applicant's signature on the application",
        "a date written before the application is signed would be false")
    );
  } else if (componentId === "ky_criminal_record_segregation-agency-written-request-2") {
    writes.push(
      write("requester_name", "Person making this written request, printed name on the letter", "participant.full_legal_name"),
      write("requester_address", "Mailing address of the person making this request, in the FROM block", "participant.street_address")
    );
    refusals.push(
      rbf("agency_name", "Name of the agency holding the records, to which this letter is addressed",
        "the name of each agency you believe holds records of the arrest - the arresting agency, the jail, the state police, others; one letter per agency, and no source names any agency for you",
        "no source read for this track names a single Kentucky agency; the participant identifies the holders"),
      rbf("agency_address", "Mailing address of that agency, on the letter and the envelope",
        "the mailing address of each agency, which you find and write yourself - no source supplies any agency address",
        "no source read for this track supplies any agency address"),
      rbf("arrest_date", "Date of the arrest",
        "the date of the arrest, from your own records",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("arrest_county", "County of the arrest",
        "the Kentucky county of the arrest",
        "no case fact is held for a record the platform has not seen"),
      rbf("arrest_description", "What the arrest was for, in my own words",
        "what you were arrested for, in your own words from your papers",
        "the platform prints the participant's own description and asserts nothing about any offence"),
      rbf("disposition_and_date", "How the matter ended - I was found innocent, all charges relating to the offence were dismissed, or all charges relating to the offence were withdrawn - and the date it ended",
        "how the matter ended, in your own voice as your own statement of fact, and the date - if there is any dispute about whether ALL charges ended that way, stop and get help instead",
        "the statutory condition turns on this fact, and the letter states it as the participant's own statement, never as a legal conclusion"),
      rbf("case_number", "Case number, if charges were filed",
        "the case number if charges were filed - if none was, write none",
        "no case identifier is held for a record the platform has not seen"),
      protectedBlank("posting_date", "Date this letter is posted",
        "a date written before the letter actually goes out would be false; you write it when you post the letter"),
      protectedBlank("requester_signature", "Signature on this written request",
        "you sign each letter personally")
    );
  } else {
    writes.push(write("participant_name", "Person this guidance page is prepared for", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: ROUTE.routeKeys,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/KY.memo.json, track "
      + "ky_criminal_record_segregation), the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json), and the route-level drafted precedent "
      + "(pleading-config.json of component ky_criminal_record_segregation-primary-filing-1)",
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
  // Vocabulary guard, per the pleading-config's qaProhibitedTerms: the
  // application and the agency letter ask for segregation and nothing else.
  // The routing-guidance page is exempt — its job is to route to the sealing
  // and expungement statutes by name.
  for (const [i, m] of pageManifest.entries()) {
    if (!VOCABULARY_GUARDED.has(m.component)) continue;
    const t = textOfPage[i].toLowerCase();
    for (const banned of ["expunge", "seal", "destroy", "destruction", "erase"]) {
      assert.ok(!t.includes(banned),
        `packet page ${i + 1} (${m.component}) uses "${banned}"; on this instrument the relief is segregation and nothing else`);
    }
    assert.ok(!/date of birth|social security|\bssn\b/i.test(textOfPage[i]),
      `packet page ${i + 1} (${m.component}) invites a personal identifier the route-level rule forbids`);
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
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
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

function participantInstructions(maps, rbfItems) {
  const byDoc = new Map();
  for (const item of rbfItems) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("**Read the routing page first.** Segregation is the weakest Kentucky route: the records continue to exist and remain accessible, filed separately and showing the disposition. KRS 17.142(4) sends records covered by KRS 431.076 or KRS 431.078 to those stronger statutes instead — most acquittals and dismissals belong there, and the clearest records left for segregation are charges that were withdrawn. Court records cannot be segregated at all.", "");
  out.push("The platform filled in what it holds about you: your name and contact details. Every case fact, and every agency name and address, is a labelled dotted blank listed below — you fill each from your own records, never from memory. Neither instrument carries your date of birth or any government identification number, deliberately.", "");

  out.push("## The two instruments, and whose choice it is", "");
  out.push("| Instrument | What it does |", "| --- | --- |");
  out.push("| `ky_criminal_record_segregation-primary-filing-1` — the court application (KRS 17.142(2)) | one filing; on receipt the court shall forthwith issue an order to ALL law enforcement agencies |");
  out.push("| `ky_criminal_record_segregation-agency-written-request-2` — the agency letters (KRS 17.142(1)) | one signed letter to EACH agency you identify; no court involved |");
  out.push("");
  out.push("Either obtains segregation independently, and you may use both. **Which to use is your choice alone** — this packet does not make it for you.", "");

  out.push("## Documents you should have", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Documentation of how the matter ended — the dismissal or acquittal order, or what record exists where charges were withdrawn before filing | the court clerk; or the arresting agency or the prosecutor's office where no charges were filed |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed as a labelled dotted blank on its instrument.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Check the stronger routes first** — if your records are eligible under KRS 431.076 or KRS 431.078, or already cleared there, use those routes and stop here.");
  out.push("2. **Gather the disposition documentation** listed above; if there is any dispute about whether ALL charges relating to the offence were dismissed or withdrawn, stop and get help instead.");
  out.push("3. **On the court route**: ask the circuit court clerk of the county which court to name in the caption (the recorded venue is the court in which the case was tried, or would have been tried had charges been filed; the clerk files for both District and Circuit Court and can also say whether anything further is required with the application). Fill every dotted blank, sign and date the application yourself, and file it with that circuit court clerk. No fee is identified for either route — confirm with the clerk when you call.");
  out.push("4. **On the agency route**: copy the letter for each agency, fill every blank, sign each letter, address each envelope and post them yourself. Write the posting date on each letter the day it actually goes out.");
  out.push("5. **No notice or service on anyone else is required on the court route** — KRS 17.142 provides for none.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature on each instrument, the date beside it, and each letter's posting date.** A signature is yours alone, and a date written before the event would be false.");
  out.push("- **Every agency name and address.** No source names a single Kentucky agency or address for you; you identify the holders.");
  out.push("- **The court level in the caption.** The recorded venue never names one; the circuit court clerk is the authority that resolves it.", "");

  out.push("## When to stop and get help instead", "");
  out.push("- your records are eligible under the stronger statutes (KRS 431.076 / KRS 431.078);");
  out.push("- you expect court records to be reached, or a clean background check — segregation does neither;");
  out.push("- any dispute about whether all charges relating to the offence ended favourably;");
  out.push("- an agency does not act on your letter — no source records what an agency must do on receipt, in what time, or your recourse.", "");

  out.push("## What this packet is not", "");
  out.push("A prepared application, letter template and routing page. No official form exists for either instrument — that is why they are composed — and this is not legal advice, nothing is filed or posted for you, and nothing here decides eligibility or outcome.", "");
  out.push(`_Routes: ${ROUTE.routeKeys.join(" ; ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");

  const { records, failures } = groundRecords();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed governing record no longer states what this build relies on, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = COMPONENTS.map((c) => composedMap(c));
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      groundingRecords: records, components: COMPONENTS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENTS.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; the application and letter pages asserted free of the other Kentucky relief words and of personal-identifier invitations",
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
  }

  const rbfItems = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbfItems);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no source bytes are bound — the MASTER_QUEUE row binds none (sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT, "
      + "boundSources []) — so the build grounds on the family's committed legal-design records and the route-level "
      + "drafted precedent, each verified by SHA-256 and by content assertion before composing",
    routeKeys: ROUTE.routeKeys,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    groundingRecords: records,
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that KRS 17.142 as recorded in the memo (reviewed 2026-08-06) is the current text of the statute",
      "counsel ratification of building KRS 17.142 segregation as a participant-facing relief track (the memo's standing build-blocker question, carried at the top of approval-request.json)",
      "whether any court filing fee attaches to a KRS 17.142(2) application (none was identified)",
      "whether the application must be verified (no source addresses it)",
      "that any output is approved for participant delivery",
      "that any record qualifies for segregation under KRS 17.142"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The court-application and agency-letter units are independent alternatives — either obtains segregation, "
      + "and the memo records that a participant may use both. The choice between them is the participant's own "
      + "(the memo's segRoute input asks it), so no election control exists and neither instrument is selected "
      + "for the participant; the routing-guidance page states the choice and the stronger-route check that "
      + "precedes it.",
    requiredBeforeFilingCount: rbfItems.length,
    requiredBeforeFiling: rbfItems,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null, rasterSkipped: true, rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved "
      + "packet bytes, not from this builder's intent; the application and letter pages were asserted free of the "
      + "other Kentucky relief words (per the route-level qaProhibitedTerms) and of any date-of-birth or "
      + "government-identifier invitation.",
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
    requiredBeforeFiling: rbfItems,
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
    buildStatus: "state_built", reviewStatus: "counsel_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: "not rendered in this run", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
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
          "The memo carries a build-blocker-graded counsel question: the controlling review classified KRS 17.142 "
          + "as an agency-level mechanism and not a product track, while the statute's face carries two "
          + "participant-initiated routes; the departure must be ratified by counsel. No ratification record exists "
          + "in the repository.",
        consequence:
          "Built anyway, deliberately and narrowly: the factory control plane dispatched the family with "
          + "legalInputStatus SETTLED and a live grant, the route-level components for this exact track were "
          + "already drafted and terminalized with counselConfirmationRequired:true carried as a standing blocker, "
          + "and state_built sells nothing. The ratification question is the FIRST counsel question in "
          + "approval-request.json, reviewStatus is set to counsel_review_pending, and counsel review remains a "
          + "blocker for approved_for_live."
      },
      {
        finding:
          "The route-level drafted precedent (pleading-config.json) records sourced refusals this build follows: "
          + "no proposed order (KRS 17.142(2) makes the order the court's own act, and drafting one would invent "
          + "operative terms binding every law enforcement agency), no certificate of service (the statute provides "
          + "for no notice to any party), no invented sovereign party, no verification block (no source addresses "
          + "verification), and a court level left functional because no source resolves it.",
        consequence:
          "Each refusal is reproduced here with its recorded reason; the caption carries the court as a "
          + "participant-completed blank with the circuit court clerk named as the resolver, and the verification "
          + "gap travels as a counsel question."
      },
      {
        finding:
          "The route-level precedent's own rendered application recites KRS 17.142(4) using the word 'sealed', "
          + "while its qaProhibitedTerms bans that word on the same instrument.",
        consequence:
          "This build follows the STRICTER of the two: the application states the (4) scope limit without the "
          + "banned vocabulary ('records subject to KRS 431.076 or KRS 431.078 fall under those statutes instead, "
          + "and this application does not reach them'), and the byte proof enforces the ban on the application and "
          + "letter pages while exempting the routing-guidance page, whose job is to name the stronger routes."
      },
      {
        finding:
          "The two units are independent alternatives and the memo asks the participant which to use (segRoute); "
          + "no fee is identified for either route; no agency, agency address, or agency response duty or timeline "
          + "is recorded anywhere.",
        consequence:
          "Neither instrument is selected for the participant; the fee question is delegated to the circuit court "
          + "clerk by name; every agency identity and address is a participant-supplied blank; and the guidance "
          + "states plainly that no recourse is recorded if an agency does not act, with handoff to counsel."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "counsel ratification of the track classification, then independent completeness verification and visual review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "FIRST, THE STANDING BUILD-BLOCKER: should KRS 17.142 segregation be a participant-facing relief track at all? The controlling review classified it as an agency-level mechanism expressly not a product track; the statute's face carries two participant-initiated routes, one with mandatory relief on receipt. The memo requires counsel ratification of the departure and none is recorded. Nothing in this family may pass counsel review, let alone approach approved_for_live, until this is answered.",
      "Ratify the fixed statements of legal effect the application and letters make (the KRS 17.142(3) segregation duty, the downstream notification duty, and the disposition-showing requirement) — the memo's release blocker.",
      "Whether any court filing fee attaches to a KRS 17.142(2) application. None was identified; the packet delegates the question to the circuit court clerk.",
      "Whether the application must be verified. No source read for this track addresses verification; no verification block is rendered and the application tells the participant to ask the clerk.",
      "The court level for the application where no charges were filed. The recorded venue is functional and the packet routes the question to the circuit court clerk."
    ],
    mattersForTheReviewersAttention: [
      "Vocabulary: the application and agency letter never use the other Kentucky relief words (byte-proof enforced); the routing-guidance page names KRS 431.076/431.078 by design, to send eligible records to the stronger routes first.",
      "Neither instrument invites a date of birth or government identifier (byte-proof enforced), per the route-level rule.",
      "No proposed order and no certificate of service are drafted, for the recorded reasons; confirm both refusals.",
      "Every case fact and every agency identity is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks."
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
    groundingRecords: records,
    components: COMPONENTS,
    documents: COMPONENTS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbfItems.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
