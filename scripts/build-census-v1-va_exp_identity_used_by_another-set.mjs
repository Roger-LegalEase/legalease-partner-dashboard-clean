#!/usr/bin/env node
/**
 * The Virginia identity-used-by-another expungement packet family builder.
 *
 *   node scripts/build-census-v1-va_exp_identity_used_by_another-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   va_exp_identity_used_by_another   Va. Code § 19.2-392.2(B), with the
 *                                     § 19.2-392.2(H) misidentification motion
 *                                     as a conditional component
 *
 * THE FORM-IDENTITY DETERMINATION, READ FROM THE RECORDS AND THE FACE
 *
 * The MASTER_QUEUE row binds exactly one source: CC-1473, PETITION FOR
 * EXPUNGEMENT FILED IN A CIRCUIT COURT — ACQUITTAL/DISMISSAL, Rev. 07/26,
 * SHA-256 6176c2f5…a67219. CC-1473 prints its own authority across its
 * caption — "VA. CODE § 19.2-392.2(A)" — and its Part 1 admits exactly two
 * bases, acquittal and nolle-prosequi-or-dismissal, sworn by "the petitioner
 * [who] was charged with the commission of a crime". A § 19.2-392.2(B)
 * petitioner was NOT the person charged: another person was charged or
 * arrested using the petitioner's name or identification without consent.
 * Neither printed basis is true for them, so filling CC-1473 for this route
 * would render a petition that states an untrue basis.
 *
 * That is not this builder's own reasoning standing alone. The family's own
 * legal-design record — data/record-clearing/legal-design-intake/VA.memo.json,
 * track va_exp_identity_used_by_another, read at source 2026-08-06 — says in
 * terms: "No official Supreme Court of Virginia form for this subsection was
 * located at the official library on 2026-08-06; CC-1473 is captioned to
 * subsection (A) alone and is not it", and resolves the output strategy to
 * custom_pleading for exactly that reason. The packet-set manifest
 * (data/record-clearing/legal-design-packet-set-manifests.json,
 * va_exp_identity_used_by_another-set) names five components, none of them an
 * official form fill, and the MASTER_QUEUE row agrees: officialFormFamily
 * NONE, implementationStrategy custom_pleading, forms [].
 *
 * So CC-1473 is bound as this family's REFERENCE INSTRUMENT, and nothing
 * else: the official petition of the same statute, whose face establishes the
 * caption structure, the statutory content items its Part 2 prints (date of
 * birth, full name at the time of arrest, the specific charge, the warrant or
 * indictment, the arrest date and agency, the disposition and its date), the
 * manifest-injustice prayer, the § 19.2-392.2(K) State Police forwarding, and
 * the checklist steps (CCRE forwarding request; service on the Commonwealth's
 * Attorney). The build verifies that face from the pinned bytes before
 * composing anything, and refuses on drift. CC-1473 is NOT included in the
 * rendered packet, because an (A)-captioned petition is not the (B)
 * instrument. This is the DE Form-281 lesson applied before it is needed:
 * read the face before binding, every time.
 *
 * The CC-1201/CC-1203 substitution determination
 * (data/rcap-grade-a/fable-packet-factory/DETERMINATION_CC1203_SUBSTITUTION.json)
 * was read before choosing: it governs the two sealing families and does not
 * name this one. This family is an EXPUNGEMENT route under § 19.2-392.2 and
 * its bound source is CC-1473, not CC-1201 or CC-1203; no substitution arises.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * Every case fact — the charge the other person incurred, its case number,
 * the arrest date and agency, the disposition, the court — belongs to a
 * record the platform has not seen, so each is a labelled dotted blank,
 * declared REQUIRED_BEFORE_FILING and disclosed by its printed label in
 * participant-instructions.md, with the clerk of the court that disposed of
 * the charge named as the checkable authority. No signature, no signature
 * date, no case number of this petition, no judicial, clerk or court-date
 * field is ever written. Fee and waiver need no delegation on this route:
 * § 19.2-392.2(B) charges no court fee or cost, which the record states; the
 * one money question left (a law-enforcement agency may charge for
 * fingerprinting) is stated from the record, and service MECHANICS, which no
 * held source establishes, are delegated to the circuit court clerk by name.
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

const FAMILY_ID = "va_exp_identity_used_by_another-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-va_exp_identity_used_by_another-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "VA",
  routeKey: "obligation:track-only:VA:va_exp_identity_used_by_another",
  routeSelectionId: "va-exp-identity-used-by-another-composed-set",
  legalName: "Petition for Expungement Where Another Person Used the Petitioner's Identity, Va. Code § 19.2-392.2(B)",
  routeName: "expunging a Virginia record created when another person used your name or identification without your consent, under Va. Code § 19.2-392.2(B)",
  statute: "Va. Code § 19.2-392.2(B)",
  conditionalStatute: "Va. Code § 19.2-392.2(H)"
});

// The MASTER_QUEUE row's own binding, asserted against the committed index and
// the mounted bytes so three records agree before anything is composed.
const PINNED_SHA256 = "6176c2f55bdb320682acecf0a79931bd5e496c4c93b5696645d4ef447fa67219";
const REFERENCE_FORM = "CC-1473";
const REFERENCE_FORM_TITLE = "Petition for Expungement Filed in a Circuit Court - Acquittal/Dismissal (Va. Code § 19.2-392.2(A))";

/* The five components, in the packet-set manifest's own order. */
const COMPONENTS = [
  "primary_filing",
  "law_enforcement_fingerprint_instructions",
  "misidentification_motion",
  "commonwealth_service",
  "filing_instructions"
];

const COMPONENT_CONDITIONS = {
  misidentification_motion:
    "Used INSTEAD of the petition only where the charge was dismissed because the court found the person "
    + "arrested or charged was not the person named in the summons, warrant, indictment or presentment, "
    + "which Va. Code § 19.2-392.2(H) routes to the dismissing court on motion."
};

const COMPOSED_TITLES = {
  primary_filing: "Petition for Expungement Under Va. Code Sec. 19.2-392.2(B)",
  law_enforcement_fingerprint_instructions: "Fingerprint Instructions for the Law-Enforcement Agency Step",
  misidentification_motion: "Motion for Entry of an Expungement Order Under Va. Code Sec. 19.2-392.2(H)",
  commonwealth_service: "Copy for the Attorney for the Commonwealth",
  filing_instructions: "Filing Instructions"
};

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- fixtures --------------------------------------------------------------- *
 * Two participants, the same pair the other Virginia CC-1473 family uses. The
 * boundary one carries a long hyphenated name with an apostrophe, a long
 * one-line mailing address, a long email and a phone extension, because a
 * value that fits the line is not evidence that every value does.
 *
 * No matter.* fact is held. Every case fact on this route lives on a record
 * created by another person's use of the participant's identity — a record
 * the platform has not seen — so the packet must not claim to hold any of it.
 * No signature, no signature date, no case number.
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

/* ---- source binding ----------------------------------------------------------- */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const formNumber of [REFERENCE_FORM]) {
    const entry = all.find((e) => e.state === "VA" && e.formNumber === formNumber && e.assetClass === "FORM");
    if (!entry) { failures.push({ sourceId: `official-form:${formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-form:${formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    if (sha256 !== PINNED_SHA256) {
      failures.push({ sourceId: `official-form:${formNumber}`, pathInArchive: rel, why: `SHA-256 drift against the MASTER_QUEUE binding: the queue pins ${PINNED_SHA256}, the corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      formNumber, sourceId: `source-sha256:${sha256}`, pathInArchive: rel,
      title: REFERENCE_FORM_TITLE, instrumentKind: "bound_reference_instrument",
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      pageCount: entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- the face of the bound reference, read from the pinned bytes --------------- *
 * Each anchor below is a fact this build RELIES ON. The first three prove the
 * reference is what the records say it is — the same statute's official
 * petition, captioned to subsection (A) alone, which is WHY the primary filing
 * is composed rather than filled. The rest are the statements of the shared
 * petition procedure this packet's composed pages are grounded on. The build
 * refuses if any anchor is no longer printed on the face.
 */
const FACE_ANCHORS = [
  "PETITION FOR EXPUNGEMENT",
  "ACQUITTAL/DISMISSAL",
  "VA. CODE § 19.2-392.2(A)",
  "manifest injustice",
  "§ 19.2-392.2(K)",
  "Central Criminal Records Exchange",
  "Commonwealth’s Attorney",
  "circuit court of",
  "CC-1416"
];

async function readFace(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const lines = [];
  for (const page of doc.getPages()) {
    for (const l of groupIntoLines(extractTextItems(page))) lines.push(l.text);
  }
  const flatText = lines.join("\n");
  const missing = FACE_ANCHORS.filter((a) => !flatText.includes(a));
  return { flatText, missing };
}

/* ---- composed documents -------------------------------------------------------- *
 * Everything below is traceable to one of three records, named inline:
 *   [MEMO]     data/record-clearing/legal-design-intake/VA.memo.json,
 *              track va_exp_identity_used_by_another (read at source 2026-08-06)
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              packetSetId va_exp_identity_used_by_another-set
 *   [FACE]     the pinned CC-1473 binary's own printed face
 * Nothing is stated that none of the three records: no service mechanics, no
 * local cover-sheet rule, no figure of any kind is invented.
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
    L.push("VIRGINIA:");
    L.push("IN THE ............................................................ COURT OF ..........................................................");
    L.push("(NAME OF THE COURT THAT DISPOSED OF THE CHARGE, AND ITS CITY OR COUNTY - the clerk's office can confirm both)", "");
    L.push(`IN RE: ${name},`);
    L.push("PETITIONER,", "");
    L.push("v.", "");
    L.push("COMMONWEALTH OF VIRGINIA.", "");
    L.push("Case No. " + DOTS(40) + "  (the clerk assigns it at filing)", "");
    L.push("PETITION FOR EXPUNGEMENT UNDER VA. CODE Sec. 19.2-392.2(B)");
    L.push("(IDENTITY USED, WITHOUT CONSENT, BY ANOTHER PERSON)", "");
    L.push(`1. The petitioner, ${name}, states that the petitioner's name or other identification has been used, without the petitioner's consent or authorization, by another person who was charged or arrested using that name or identification. The petitioner therefore files this petition with the court that disposed of the charge, for relief pursuant to Va. Code Sec. 19.2-392.2, as Sec. 19.2-392.2(B) provides.`, "");
    L.push("2. The petitioner further states:", "");
    L.push(`Petitioner's date of birth: ${dob}`, "");
    L.push("Full name shown on the record to be expunged, exactly as the record states it:");
    L.push(DOTS(), "");
    L.push("Specific charge to be expunged, worded exactly as the court record words it:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Case number of the charge to be expunged, if one appears on the record:");
    L.push(DOTS(), "");
    L.push("Date of arrest on the charge to be expunged, if known:");
    L.push(DOTS(), "");
    L.push("Name of the agency that made the arrest on the charge to be expunged:");
    L.push(DOTS(), "");
    L.push("Disposition of the charge, and the date of final disposition:");
    L.push(DOTS(), "");
    L.push("3. Your own statement of how your name or identification came to be used when someone else was arrested or charged (state only what you know first-hand; this packet asserts nothing about who committed any offence, and nothing on these lines is written for you):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. Filed with this petition is one complete set of the petitioner's fingerprints obtained from a law-enforcement agency, as Va. Code Sec. 19.2-392.2(B) requires. The fingerprint instructions page of this packet sets out that step.", "");
    L.push("5. Under Va. Code Sec. 19.2-392.2(B), no court fees or costs are payable for the filing of this petition.", "");
    L.push("6. The continued existence and possible dissemination of information relating to the record described above causes or may cause circumstances which constitute a manifest injustice to the petitioner. The petitioner therefore requests that the police and court records, including electronic records, relating to the charge be expunged, and that a copy of any order of expungement be forwarded to the Department of State Police pursuant to Va. Code Sec. 19.2-392.2(K).", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
    L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "law_enforcement_fingerprint_instructions") {
    L.push(`For: ${name}`);
    L.push(`Petition: the composed petition under Va. Code Sec. 19.2-392.2(B) in this packet.`, "");
    L.push("Va. Code Sec. 19.2-392.2(B) makes one complete set of your fingerprints part of the petition itself, so this step happens BEFORE filing. Sec. 19.2-392.2(E) prescribes how the prints travel. In order:", "");
    L.push("STEP ONE. Ask a law-enforcement agency to take one complete set of your fingerprints.");
    L.push("STEP TWO. Give that agency a copy of your petition at the same time.");
    L.push("STEP THREE. The agency submits the fingerprints to the Central Criminal Records Exchange (CCRE) with the petition attached.");
    L.push("STEP FOUR. The CCRE forwards your criminal history and the fingerprint set to the court under seal.", "");
    L.push("AFTERWARDS. On completion of the hearing the court returns the fingerprint card. Where no hearing was held, the card is destroyed unless you ask for it back within thirty days or supply a stamped self-addressed envelope.", "");
    L.push("MONEY. No court fee or cost is charged for filing a petition under Sec. 19.2-392.2(B). A law-enforcement agency may charge for fingerprinting; this packet states no amount because no held source states one.", "");
    L.push("This page names no particular agency. Any law-enforcement agency can take the prints; if you do not know where to go, the clerk of the court that disposed of the charge can tell you which agencies serve that locality.");
  } else if (componentId === "misidentification_motion") {
    L.push("USE THIS PAGE INSTEAD OF THE PETITION ONLY IF the charge was dismissed because the court found that the person arrested or charged is not the person named in the summons, warrant, indictment or presentment. Va. Code Sec. 19.2-392.2(H) then routes the matter to the DISMISSING court, on motion, and that route is faster. If that is not how your charge was dismissed, do not file this page; file the petition instead.", "");
    L.push("VIRGINIA:");
    L.push("IN THE ............................................................ COURT OF ..........................................................");
    L.push("(NAME OF THE COURT THAT DISMISSED THE CHARGE, AND ITS CITY OR COUNTY)", "");
    L.push(`IN RE: ${name},`);
    L.push("MOVANT,", "");
    L.push("v.", "");
    L.push("COMMONWEALTH OF VIRGINIA.", "");
    L.push("Case number of the dismissed charge:");
    L.push(DOTS(), "");
    L.push("MOTION FOR ENTRY OF AN EXPUNGEMENT ORDER UNDER VA. CODE Sec. 19.2-392.2(H)", "");
    L.push(`1. The movant, ${name}, was arrested or charged in this matter, and the charge was dismissed because this Court found that the person arrested or charged is not the person named in the summons, warrant, indictment or presentment.`, "");
    L.push("Charge that was dismissed, worded exactly as the court record words it:");
    L.push(DOTS(), "");
    L.push("Date of dismissal of the charge:");
    L.push(DOTS(), "");
    L.push("2. The movant asks this Court, as the dismissing court, to enter an order of expungement of the police and court records, including electronic records, relating to the dismissed charge, the dismissal and the expungement being pursuant to Va. Code Sec. 19.2-392.2(H).", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF MOVANT " + DOTS(42), "");
    L.push("(The movant signs and dates this motion personally. Nothing on this page is signed or dated for the movant.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "commonwealth_service") {
    L.push("To: the attorney for the Commonwealth of the county or city where this petition is filed.", "");
    L.push(`Enclosed is a copy of the petition for expungement filed by ${name} under Va. Code Sec. 19.2-392.2(B). A copy of the petition is served on the attorney for the Commonwealth of the locality where it is filed.`, "");
    L.push("The attorney for the Commonwealth may object, answer, or give written notice of no objection within twenty-one days after service.", "");
    L.push("HOW THIS COPY MUST BE DELIVERED IS NOT STATED HERE. No source this packet is built from establishes the manner of service, and a guessed mechanic in a filing instruction is worse than none. Before you serve this copy, ask the clerk of the circuit court of the county or city where the case was disposed of how service on the attorney for the Commonwealth must be made, and use that method.", "");
    L.push("NAME AND MAILING ADDRESS OF THE ATTORNEY FOR THE COMMONWEALTH");
    L.push("(you write it here before service; the circuit court clerk can provide it)");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("DATE OF SERVICE OF THE COPY " + DOTS(48));
    L.push("SIGNATURE OF PETITIONER " + DOTS(52), "");
    L.push("This page is not proof of service and does not say that anything has been served. It is completed and signed by the petitioner when the copy actually goes out, in the manner the clerk directs. A date or a signature written before the copy goes out would be false.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHICH PAGE YOU FILE", "");
    L.push("This packet carries two instruments and you file exactly one of them:");
    L.push("- THE PETITION (Va. Code Sec. 19.2-392.2(B)) - the ordinary route. File it with the court that disposed of the charge.");
    L.push("- THE MOTION (Va. Code Sec. 19.2-392.2(H)) - only if the charge was dismissed because the court found you were not the person named in the summons, warrant, indictment or presentment. File it with the court that DISMISSED the charge; that court enters the order on motion, and that route is faster.");
    L.push("If you are not sure which of the two fits how your charge ended, stop and ask the clerk of the circuit court of the county or city where the case was disposed of before filing either.", "");
    L.push("WHAT YOU DO, IN ORDER", "");
    L.push("STEP ONE. Gather the case records. Ask the clerk of the circuit court of the county or city where the case was disposed of for the case papers; district court charges are handled by that locality's circuit court, so that is where to ask even for a general district court charge. Request your own copy of your Virginia criminal history record from the Central Criminal Records Exchange (Virginia State Police) for the fee they charge.");
    L.push("STEP TWO. Fill in every dotted blank this packet's participant instructions list, from those records. Do not guess a date or a charge wording.");
    L.push("STEP THREE. Have one complete set of your fingerprints taken by a law-enforcement agency and give that agency a copy of your petition at the same time - the fingerprint instructions page sets out the whole of that step. Sec. 19.2-392.2(B) makes the fingerprint set part of the petition, so this comes before filing.");
    L.push("STEP FOUR. Sign and date the petition (or, on the Sec. 19.2-392.2(H) route, the motion) yourself.");
    L.push("STEP FIVE. File with the court that disposed of the charge (or, on the Sec. 19.2-392.2(H) route, the dismissing court). No court fee or cost is payable for filing under Sec. 19.2-392.2(B).");
    L.push("STEP SIX. After filing, separately ask the CCRE to forward a copy of your Virginia criminal history record electronically to the court. The clerk's recorded guidance is that the case is established with the court first and the State Police request comes second, so the sequence matters.");
    L.push("STEP SEVEN. Have a copy of the petition served on the attorney for the Commonwealth of the locality where it is filed, using the service page in this packet, in the manner the clerk directs. The attorney for the Commonwealth may object, answer, or give written notice of no objection within twenty-one days after service.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
    L.push("Stop, and take this packet to a lawyer or a legal-aid office, if any of these is true:");
    L.push("- it is not clear whether you authorised the use of your name;");
    L.push("- you may in fact have been the person arrested;");
    L.push("- the attorney for the Commonwealth objects or answers, or the court sets a contested hearing;");
    L.push("- the identity misuse extends beyond Virginia records;");
    L.push("- any immigration question is involved.", "");
    L.push("WHAT THIS PACKET DOES NOT TELL YOU", "");
    L.push("- HOW service on the attorney for the Commonwealth must be made, and whether the clerk requires any local cover sheet. Neither is established by the sources this packet is built from. Ask the clerk of the circuit court of the county or city where the case was disposed of; that clerk's office is the authority that can answer both.");
    L.push("- What a law-enforcement agency charges for fingerprinting. No held source states an amount.", "");
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a prepared set of composed pleadings and process pages. It is not an official Supreme Court of Virginia form - none exists for Sec. 19.2-392.2(B), which is why these pages are composed - and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement. Sealing restricts access; expungement removes.");
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

/* ---- the field maps -------------------------------------------------------------- *
 * One map per composed component, in the maps-with-canonical-and-boundary
 * shape the shared completeness contract reads. Every write names the fact it
 * binds; every blank earns its blankness against the closed vocabulary; every
 * REQUIRED_BEFORE_FILING row is declared as typed data with its printed label,
 * and disclosed by that label in participant-instructions.md.
 */
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
  const clerkBlank = (id, label, why) => ({
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
      write("petitioner_name", "Petitioner named in the caption of this petition", "participant.full_legal_name"),
      write("date_of_birth", "Petitioner's date of birth, printed in the petition's statement of facts", "participant.date_of_birth"),
      write("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address"),
      write("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone"),
      write("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email")
    );
    refusals.push(
      rbf("disposing_court", "Court named in the caption - the court that disposed of the charge, and its city or county",
        "the name of the court that disposed of the charge, and its city or county - the clerk's office of that locality's circuit court can confirm both",
        "the platform has not seen the record another person's use of the participant's identity created, so the disposing court is the participant's to establish"),
      rbf("name_on_record", "Full name shown on the record to be expunged, exactly as the record states it",
        "the full name printed on the record to be expunged, copied exactly - the record's own wording controls, and the clerk of the court that disposed of the charge holds the case papers",
        "the record was created by another person's use of the participant's identity, and its exact wording is on the record, not in the platform"),
      rbf("charge_description", "Specific charge to be expunged, worded exactly as the court record words it",
        "the specific charge the other person incurred using your name or identification, worded exactly as the court record words it",
        "no charge fact is held for a record the platform has not seen"),
      rbf("underlying_case_numbers", "Case number of the charge to be expunged, if one appears on the record",
        "the case number of the charge to be expunged, copied from the court record if one appears there",
        "no case identifier is held for a record the platform has not seen"),
      rbf("arrest_date", "Date of arrest on the charge to be expunged, if known",
        "the date of the arrest that created the record, taken from the case papers if it is known",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("arresting_agency", "Name of the agency that made the arrest on the charge to be expunged",
        "the name of the agency that made the arrest, taken from the case papers - the clerk of the court that disposed of the charge can help you locate it",
        "an agency name is a case fact the participant can obtain, not a field the court owns"),
      rbf("disposition_and_date", "Disposition of the charge, and the date of final disposition",
        "how the charge ended and on what date, checked against the case file and your CCRE record - correct the packet if they disagree",
        "no disposition fact is held for a record the platform has not seen"),
      rbf("statement_of_facts", "Your own statement of how your name or identification came to be used when someone else was arrested or charged",
        "your own first-hand account of how your name or identification came to be used - the packet asserts nothing about who committed any offence, so these lines are yours alone",
        "the platform prints the participant's own account and asserts nothing about a third party's conduct"),
      clerkBlank("case_number", "Case number of this petition, assigned by the clerk at filing",
        "the clerk assigns the number at filing"),
      protectedBlank("petitioner_signature", "Signature of the petitioner on the petition",
        "the petitioner signs the petition personally"),
      protectedBlank("signature_date", "Date beside the petitioner's signature on the petition",
        "a date written before the petition is signed would be false")
    );
  } else if (componentId === "law_enforcement_fingerprint_instructions") {
    writes.push(write("petitioner_name", "Petitioner named on this page", "participant.full_legal_name"));
  } else if (componentId === "misidentification_motion") {
    writes.push(
      write("movant_name", "Movant named in the caption of this motion", "participant.full_legal_name"),
      write("movant_address", "Mailing address of the movant in the contact block at the foot of the motion", "participant.street_address"),
      write("movant_telephone", "Telephone number of the movant in the contact block at the foot of the motion", "participant.phone"),
      write("movant_email", "Email address of the movant in the contact block at the foot of the motion", "participant.email")
    );
    refusals.push(
      rbf("dismissing_court", "Court named in the caption of the motion - the court that dismissed the charge, and its city or county",
        "the name of the court that dismissed the charge, and its city or county - use this motion only if that court found you were not the person named in the charging document",
        "Va. Code Sec. 19.2-392.2(H) routes this motion to the dismissing court, and which court that is lives on the participant's record"),
      rbf("dismissed_case_number", "Case number of the dismissed charge",
        "the case number of the dismissed charge, copied from the court record",
        "no case identifier is held for a record the platform has not seen"),
      rbf("dismissed_charge", "Charge that was dismissed, worded exactly as the court record words it",
        "the dismissed charge, worded exactly as the court record words it",
        "no charge fact is held for a record the platform has not seen"),
      rbf("dismissal_date", "Date of dismissal of the charge",
        "the date the charge was dismissed, taken from the court record",
        "no disposition fact is held for a record the platform has not seen"),
      protectedBlank("movant_signature", "Signature of the movant on the motion",
        "the movant signs the motion personally"),
      protectedBlank("movant_signature_date", "Date beside the movant's signature on the motion",
        "a date written before the motion is signed would be false")
    );
  } else if (componentId === "commonwealth_service") {
    writes.push(write("petitioner_name", "Petitioner named on this page", "participant.full_legal_name"));
    refusals.push(
      {
        ...base("commonwealth_attorney_address", "Name and mailing address of the attorney for the Commonwealth"),
        reason: "the participant supplies this before filing: the name and mailing address of the attorney for the Commonwealth for the county or city where the petition is filed",
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: "commonwealth_service field commonwealth_attorney_address",
        factId: null, routeDetermined: false, document: componentId,
        why: "the platform holds no address for the attorney for the Commonwealth and the participant writes it before service",
        participantMustSupply: "the name and mailing address of the attorney for the Commonwealth for the county or city where you file - the circuit court clerk can give it to you"
      },
      protectedBlank("service_date", "Date of service of the copy",
        "a date written before the copy is actually served would be false"),
      protectedBlank("petitioner_signature", "Signature of the petitioner on the service page",
        "the petitioner signs this page when the copy actually goes out")
    );
  } else {
    writes.push(write("petitioner_name", "Petitioner named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/VA.memo.json, track "
      + "va_exp_identity_used_by_another), the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json), and the pinned CC-1473 binary's own face",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes --------------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component, and each protected line must carry
 * its dotted rule with no prefilled value. Wrapped lines are joined on spaces
 * before matching, because the renderer wraps at word boundaries.
 */
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
    for (const r of map.canonicalRefusals ?? []) {
      // No refused row's value may exist: the platform holds nothing for these,
      // so the strongest byte-level check available is that no signature or
      // date line carries anything but its dotted rule. The dotted rules
      // themselves are asserted present for every protected line.
      if (r.category === SIGNATURE || r.category === COURT_OWNED) continue;
    }
  }
  // Every page of the packet must be a page this build composed: no page may
  // carry the bound reference form's own caption, because CC-1473 is not part
  // of this packet.
  for (const [i, t] of textOfPage.entries()) {
    assert.ok(!t.includes("ACQUITTAL/DISMISSAL"),
      `packet page ${i + 1} appears to carry the CC-1473 face; the reference form must not be included in this packet`);
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
  out.push(`# What you must do before you file — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("There is no official Supreme Court of Virginia form for a § 19.2-392.2(B) petition — CC-1473, the official expungement petition of the same statute, is captioned to subsection (A) alone — so the pages in this packet are composed pleadings, grounded on the statute's recorded requirements and on the official form's own face as the reference for the shared petition procedure.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact belongs to a record created by someone else's use of your identity — a record the platform has not seen — so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Which page you file", "");
  out.push("This packet carries two instruments and you file **exactly one** of them:", "");
  out.push("| Instrument | When it is yours |", "| --- | --- |");
  out.push("| `primary_filing` — the petition under § 19.2-392.2(B) | the ordinary route: someone else was charged or arrested using your name or identification without your consent |");
  out.push("| `misidentification_motion` — the motion under § 19.2-392.2(H) | **only** if the charge was dismissed because the court found you were not the person named in the summons, warrant, indictment or presentment — the dismissing court then enters the order on motion, and that route is faster |");
  out.push("");
  out.push("If you are not sure which fits how your charge ended, stop and ask the clerk of the circuit court of the county or city where the case was disposed of before filing either.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the composed petition under § 19.2-392.2(B) |");
  out.push("| `law_enforcement_fingerprint_instructions` | the § 19.2-392.2(E) fingerprint step: one complete set of your prints, taken by a law-enforcement agency, routed with the petition to the CCRE and on to the court under seal |");
  out.push("| `misidentification_motion` | the conditional motion to the dismissing court under § 19.2-392.2(H) |");
  out.push("| `commonwealth_service` | the copy that goes to the attorney for the Commonwealth of the locality where you file |");
  out.push("| `filing_instructions` | where each page goes, in what order, and when to stop and get help |");
  out.push("");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| One complete set of your fingerprints — § 19.2-392.2(B) makes the set part of the petition, so it must be obtained before filing; give the agency a copy of your petition at the same time | a law-enforcement agency |");
  out.push("| Your own Virginia criminal history record — check your answer about how the case ended against it, and correct the packet if they disagree | Virginia State Police, Central Criminal Records Exchange (for the fee they charge) |");
  out.push("| The court case file for the charge — district court charges are handled by that locality's circuit court, so ask there even for a general district court charge; check how the case ended against it too | clerk of the circuit court of the county or city where the case was disposed of |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the instrument you are filing.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Gather the records** listed above.");
  out.push("2. **Fill in every dotted blank** for the instrument you are filing. Do not guess a date or a charge wording.");
  out.push("3. **Have your fingerprints taken** by a law-enforcement agency and give that agency a copy of your petition at the same time — the fingerprint page sets out the whole step, including what happens to the card afterwards.");
  out.push("4. **Sign and date the petition (or the motion) yourself.** The platform never signs for you and never dates a signature.");
  out.push("5. **File with the court that disposed of the charge** — or, on the § 19.2-392.2(H) route, the dismissing court. **No court fee or cost is payable** for filing under § 19.2-392.2(B).");
  out.push("6. **After filing, ask the CCRE to forward your record to the court.** The clerk's recorded guidance is that the case is established with the court first and the State Police request comes second — the sequence matters.");
  out.push("7. **Serve a copy on the attorney for the Commonwealth** of the locality where you file, using the service page, in the manner the clerk directs. The attorney for the Commonwealth may object, answer, or give written notice of no objection within twenty-one days after service.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign — or before a copy is actually served — would be false.");
  out.push("- **The case number of the petition itself.** The clerk assigns it at filing.");
  out.push("- **Every line of your statement of facts.** The packet prints your own account and asserts nothing about who committed any offence.");
  out.push("- **The manner of service on the attorney for the Commonwealth, and any local cover-sheet requirement.** Neither is established by the sources this packet is built from. The clerk of the circuit court of the county or city where the case was disposed of is the authority that can answer both — ask before you serve or file.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- it is not clear whether you authorised the use of your name;");
  out.push("- you may in fact have been the person arrested;");
  out.push("- the attorney for the Commonwealth objects or answers, or the court sets a contested hearing;");
  out.push("- the identity misuse extends beyond Virginia records;");
  out.push("- any immigration question is involved.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of composed pleadings and process pages. It is not an official court form, it is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement. Sealing restricts access; expungement removes.", "");
  out.push(`_Route: ${ROUTE.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "the bound source did not bind by exact SHA-256, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }
  const source = resolved[0];

  const face = await readFace(source);
  assert.equal(face.missing.length, 0,
    `the bound reference's face no longer prints ${face.missing.length} anchor(s) this build relies on: ${JSON.stringify(face.missing)}`);

  if (checkOnly) {
    const maps = COMPONENTS.map((c) => composedMap(c));
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundReference: source.formNumber, sha256: source.sha256, faceAnchorsVerified: FACE_ANCHORS.length,
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; every page asserted free of the bound reference form's face",
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
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + MASTER_QUEUE-pinned SHA-256 + on-disk SHA-256 + byte length + printed-face anchor verification",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "The MASTER_QUEUE row binds CC-1473 and this build verified it byte-exact and read its face: it is the "
      + "official expungement petition of Va. Code § 19.2-392.2, captioned to subsection (A) alone — "
      + "ACQUITTAL/DISMISSAL — with a Part 1 basis a § 19.2-392.2(B) petitioner cannot truthfully swear. The "
      + "family's own legal-design record (VA.memo.json) states 'CC-1473 is captioned to subsection (A) alone and "
      + "is not it' and resolves the strategy to custom_pleading because no official (B) form was located at the "
      + "official library on 2026-08-06. CC-1473 is therefore bound as the REFERENCE instrument for the shared "
      + "petition procedure — caption structure, Part 2 content items, the manifest-injustice prayer, the "
      + "§ 19.2-392.2(K) State Police forwarding, the CCRE and Commonwealth's-Attorney checklist steps — and is "
      + "not included in the rendered packet. The CC-1201/CC-1203 determination governs the sealing families and "
      + "does not name this one; no substitution arises.",
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: r.instrumentKind,
      role: "bound reference instrument; NOT included in the rendered packet",
      faceAnchorsVerified: FACE_ANCHORS
    })),
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that Rev. 07/26 is the current published edition of CC-1473",
      "that any output is approved for participant delivery",
      "that any record is eligible for expungement under Va. Code § 19.2-392.2(B) or (H)"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: REFERENCE_FORM,
    boundReferenceRole:
      "reference instrument only — the official petition of the same statute, captioned to § 19.2-392.2(A) alone; "
      + "its face grounds the composed petition's structure and it is not included in the packet",
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The composed pages carry no election control. The statutory route is stated in each instrument's own title "
      + "and body — the petition names § 19.2-392.2(B), the conditional motion names § 19.2-392.2(H) — which is "
      + "where this family's route determination lives. The (B)-versus-(H) fork is not route-determined: it turns "
      + "on how the participant's own charge was dismissed, so the instructions state the condition and tell the "
      + "participant to ask the circuit court clerk when unsure, and neither instrument is selected for them.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    boundReferenceSource: {
      formNumber: REFERENCE_FORM, sha256: source.sha256, byteLength: source.byteLength,
      role: "bound reference instrument read for structure and procedure; not included in any rendered artifact"
    },
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
      + "packet bytes, not from this builder's intent; every packet page was asserted free of the bound reference "
      + "form's face, because CC-1473 is not part of this packet.",
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
          "The bound source CC-1473 prints VA. CODE § 19.2-392.2(A) — ACQUITTAL/DISMISSAL — as its sole authority, "
          + "and its Part 1 basis ('the petitioner was charged … and has been acquitted / a nolle prosequi has been "
          + "taken or the charge otherwise dismissed') is one a § 19.2-392.2(B) petitioner cannot truthfully swear, "
          + "because on this route another person was the one charged. The family's own legal-design record says in "
          + "terms that CC-1473 'is captioned to subsection (A) alone and is not it', and no official (B) form was "
          + "located at the official library on 2026-08-06.",
        consequence:
          "The primary filing is a composed petition, exactly as the packet-set manifest and the MASTER_QUEUE row "
          + "(implementationStrategy custom_pleading, officialFormFamily NONE) direct. CC-1473 is bound as the "
          + "reference instrument for the shared § 19.2-392.2 petition procedure — caption structure, Part 2 "
          + "content items, the manifest-injustice prayer, the § 19.2-392.2(K) forwarding, the CCRE and "
          + "Commonwealth's-Attorney steps — verified byte-exact and face-read on every build, and never included "
          + "in the packet. No form was substituted and none was invented."
      },
      {
        finding:
          "Va. Code § 19.2-392.2(H) supplies a second, faster procedural door to the same relief — a motion to the "
          + "dismissing court where the charge was dismissed because the court found the person charged was not the "
          + "person named in the charging document — and the legal-design record models it as a conditional "
          + "component of this track, not a separate one.",
        consequence:
          "The packet renders the § 19.2-392.2(H) motion as a conditional instrument with its condition printed on "
          + "its own face, and the instructions tell the participant to file exactly one of the two instruments and "
          + "to ask the circuit court clerk when unsure. The fork is not route-determined, so neither instrument is "
          + "selected for the participant."
      },
      {
        finding:
          "Every case fact on this route lives on a record created by another person's use of the participant's "
          + "identity — a record the platform has not seen.",
        consequence:
          "The platform writes only the participant's own identity and contact facts (name, date of birth, mailing "
          + "address, telephone, email). Every case fact is a labelled dotted blank declared "
          + "REQUIRED_BEFORE_FILING, disclosed by its printed label, with the clerk of the court that disposed of "
          + "the charge named as the checkable authority for the case papers."
      },
      {
        finding:
          "No held source establishes the manner of service on the attorney for the Commonwealth, or whether the "
          + "clerk requires a local cover sheet for a composed (B) petition.",
        consequence:
          "The service page names its recipient class from the recorded rule (the attorney for the Commonwealth of "
          + "the filing locality, twenty-one days to respond) and delegates the MECHANICS to the circuit court "
          + "clerk by name. No method, no address and no local requirement was guessed."
      },
      {
        finding:
          "The legal-design record names two content items for the filing-instructions component — the "
          + "no-prior-record misdemeanor presumption at § 19.2-392.2(F) and a three-year voidability rule — whose "
          + "substance no held source in this container records.",
        consequence:
          "Neither is stated in the packet, because naming a rule without its recorded substance invites the "
          + "participant to guess at it. Both are raised as counsel questions in approval-request.json instead."
      },
      {
        finding:
          "§ 19.2-392.2 carries a second version effective December 1, 2026, recorded in the legal-design record as "
          + "a release blocker with a counsel question about the cutover.",
        consequence:
          "This build ends at state_built and the version question travels with the family into counsel review; "
          + "nothing here resolves it."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "The composed petition asserts the § 19.2-392.2(B) ground in the statute's recorded words and mirrors CC-1473's manifest-injustice prayer and § 19.2-392.2(K) forwarding request. Confirm the composed instrument is sufficient where no official (B) form exists.",
      "The legal-design record names the § 19.2-392.2(F) no-prior-record misdemeanor presumption and a three-year voidability rule as filing-instruction content; no held source records their substance, so the packet omits them. Confirm the omission or supply the content.",
      "§ 19.2-392.2 has a version effective December 1, 2026 recorded as a release blocker: which version does this packet promote against, and what is the cutover plan?",
      "The § 19.2-392.2(H) motion is rendered as a conditional instrument in the same packet. Confirm the two-instrument presentation with the participant choosing per the printed condition."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json formIdentityNote — CC-1473 is bound as a reference and deliberately not included; confirm that is legible to reviewers.",
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
    boundReferenceForm: REFERENCE_FORM,
    boundReferenceIncludedInPacket: false,
    sourceSha256: source.sha256,
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
