import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, type PDFPage } from "pdf-lib";
import {
  montanaDeferredDocumentInputs, MT_DEFERRED_DOCUMENT_COMPONENTS as COMPONENTS,
  MT_DEFERRED_DOJ_SOURCE_SHA256
} from "@/lib/expungement-ai/mt-deferred-document-inputs";

const FAMILY_PATH = "data/rcap-all50/overlays/census-v1/mt/mt-deferred-dismissal-set--custom-pleading";
const DERIVED_SHA = "8aa6d7dc6382ba163a8d7bf2d1afc754059c4bd6e3bc951d0a51e2a00920fddc";
const GEOMETRY_SHA = "08fa0142ee20400310af6d163e6c9634d54ce932b63d33630367cafe2a544887";
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const ascii = (s: string) => s.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u00a0/g, " ");
function requireValue(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
type Geometry = { page: number; rect: [number, number, number, number]; text: string };
type Row = { component: string; page: number; field: string; value?: string; x: number; y: number; width: number; height: number; fontSize?: number; reason?: string };

/** Internal review bytes from a current protected snapshot. This function is not
 * an admission, worker, download or payment entry point. It re-runs the exact
 * mapping; callers cannot inject a supposedly approved map. Court text/layout
 * follows the retained builder, except the explicit prior-termination branch.
 * No original fixture or source asset is rewritten. */
export async function renderMontanaDeferredDocumentReview(
  snapshot: Parameters<typeof montanaDeferredDocumentInputs>[0],
  current: Parameters<typeof montanaDeferredDocumentInputs>[1]
) {
  const mapping = montanaDeferredDocumentInputs(snapshot, current);
  requireValue(mapping.status === "mapped_for_review", "MT document facts or source review remain unresolved");
  const f = mapping.inputs as Record<string, string>;
  const terminated = mapping.inputs.deferralTerminatedByOrder === true;
  const plan = { branch: f.chargeClass === "felony" ? "mandatory_no_revocation" : "discretionary",
    pleaPhrase: f.pleaOrVerdict === "verdict" ? "was found guilty by verdict" : `entered a plea of ${f.pleaOrVerdict}`,
    object: f.pleaOrVerdict === "verdict" ? "verdict" : "plea" };
  const pdf = await PDFDocument.create();
  // Stable PDF metadata only; never used as a signing, service or judicial date.
  pdf.setCreationDate(new Date("2026-09-13T00:00:00Z")); pdf.setModificationDate(new Date("2026-09-13T00:00:00Z"));
  pdf.setProducer("LegalEase MT staged document review"); pdf.setCreator("LegalEase");
  const font = await pdf.embedFont(StandardFonts.TimesRoman), bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  let page: PDFPage, y = 744, component = "", componentPage = 0;
  const pages: Array<{ page: number; component: string; sourcePage: number }> = [], writes: Row[] = [], blanks: Row[] = [];
  const newPage = () => { page = pdf.addPage([612, 792]); y = 744; pages.push({ page: pdf.getPageCount(), component, sourcePage: ++componentPage }); };
  const text = (value: string, { heading = false, fact = "", size = 11 } = {}) => {
    const fo = heading ? bold : font, lines: string[] = []; let line = "";
    for (const word of ascii(value).split(/\s+/)) {
      requireValue(fo.widthOfTextAtSize(word, size) <= 516, "MT document text does not fit");
      const next = line ? line + " " + word : word;
      if (fo.widthOfTextAtSize(next, size) > 516) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    for (const value of lines) { if (y < 62) newPage(); page.drawText(value, { x: 48, y, size, font: fo });
      if (fact) writes.push({ component, page: pdf.getPageCount(), field: fact, value, x: 48, y: y - 2, width: fo.widthOfTextAtSize(value, size), height: 15, fontSize: size }); y -= 15;
    } y -= heading ? 9 : 6;
  };
  const blank = (label: string, id: string, category = "signature_or_date_participant_completion") => {
    if (y < 88) newPage(); text(label + ": ________________________________________");
    blanks.push({ component, page: pdf.getPageCount(), field: id, x: 48, y: y + 2, width: 516, height: 21, reason: category });
  };
  const start = (id: string, title: string, caption = true) => { component = id; componentPage = 0; newPage(); text(title, { heading: true, size: 13 });
    if (caption) { text(f.courtName, { heading: true, fact: "courtName" }); text("County: " + f.sentencingCounty + ", Montana", { fact: "sentencingCounty" });
      text("STATE OF MONTANA, Plaintiff, v. " + f.fullName + ", Defendant", { fact: "fullName" }); text("Existing criminal case: " + f.caseNumber, { fact: "caseNumber" }); }
  };
  let sourceBinding: { originalSha256: string; derivedSha256: string; geometrySha256: string } | null = null;
  if (mapping.stage === "court_motion") {
  start(COMPONENTS[0],'MOTION TO STRIKE PLEA OR VERDICT, DISMISS CHARGE, AND SEAL CASE');
  text('Defendant contact: '+f.fullName+'; '+f.mailingAddress+'; '+f.phone+'; '+f.email,{fact:'mailingAddress'});
  text('Defendant moves under MCA 46-18-204 in this existing criminal case. The following are facts supplied and to be verified by Defendant, not findings made by this packet.');
  text('The charge is '+f.chargeName+' ('+f.chargeClass+').',{fact:'chargeName'});text('Defendant '+plan.pleaPhrase+'.',{fact:'pleaOrVerdict'});text('On '+f.sentencingDate+', the court deferred imposition of sentence; the sentence was not suspended.',{fact:'sentencingDate'});
  text((terminated ? 'By its order entered on '+f.terminationOrderDate+', the court terminated the remaining deferral time under MCA 46-18-208. ' : 'The period of deferral has expired. ')+'Defendant complied with all conditions, including applicable fines and fees. Defendant contacted the sentencing court clerk, checked the deferred sentence order and confirmed from the case record that no petition to revoke under MCA 46-18-203 was filed during the deferral period. These allegations are based on Defendant\'s confirmed facts.', terminated ? { fact: 'terminationOrderDate' } : {});
  text(plan.branch==='mandatory_no_revocation'?'FELONY BASIS: under MCA 46-18-204(1)(a), after a felony deferred sentence is completed the court shall strike the plea or verdict and dismiss the charge when no petition to revoke was filed during deferral. Defendant alleges that proviso is satisfied.':'MISDEMEANOR BASIS: Defendant requests the court exercise its discretion under MCA 46-18-204 to strike the plea or verdict and dismiss the charge after completed deferral. Relief is not represented as automatic.');
  text('Defendant requests: strike the '+plan.object+'; dismiss the named charge; direct the clerk to seal this case; classify records and data as confidential criminal justice information under MCA 44-5-103, with public access only by district court order upon good cause shown; and send a copy to the prosecuting agency. Defendant will provide a copy of the dismissal order to the Department of Justice as required by MCA 46-18-204(2).');
  text(terminated ? 'This motion does not request early termination. The court already terminated the remaining deferral time by the order identified above.' : 'This motion does not request early termination under MCA 46-18-208. It concerns completed deferral.');text('I declare under penalty of perjury under the laws of the State of Montana that the factual statements I supply above are true and correct.');blank('Defendant signature','signature');blank('Date signed','date');blank('City and state where signed','executionPlace');
  start(COMPONENTS[1],'CERTIFICATE OF SERVICE');text('Recipient: '+f.prosecutingOffice,{fact:'prosecutingOffice'});text('Mailing address: '+f.prosecutorAddress,{fact:'prosecutorAddress'});text('Office email for identification: '+f.prosecutorEmail,{fact:'prosecutorEmail'});text('I certify that, AFTER filing, I served a true copy of the file-stamped motion in the above existing criminal case on the prosecuting office identified above. Complete the actual service details only after service has occurred.');blank('Actual service date','serviceDate');blank('Method: mail or hand delivery','serviceMethod','participant_sworn_narrative_or_legal_election');blank('Printed name of actual server','serverName');blank('Server signature','serverSignature');text('The email identifies the office; it does not independently authorize email service. Confirm court-specific service procedure with the clerk. Printed name of actual server must be supplied before the service certificate is filed.');
  start(COMPONENTS[2],'PROPOSED ORDER');text('Matter: '+f.chargeName+' ('+f.chargeClass+'), sentencing date '+f.sentencingDate+'.',{fact:'chargeName'});text('FOR THE COURT: findings and judicial execution below are reserved for the presiding judge.');blank('Court finding of good cause under MCA 46-18-204','goodCause','court_prosecutor_clerk_or_agency_owned');blank('Court determination of completed deferral and applicable statutory conditions','statutoryFindings','court_prosecutor_clerk_or_agency_owned');text('Upon the court\'s findings of good cause and satisfaction of the applicable statutory conditions, IT IS ORDERED:');text('1. The '+plan.object+' in this case is stricken.');text('2. The charge of '+f.chargeName+' is dismissed.',{fact:'dismissedCharge'});text('3. The clerk shall seal the case.');text('4. All records and data are classified as confidential criminal justice information under MCA 44-5-103. Public access is permitted only by district court order upon good cause shown.');text('5. A copy of this order shall be sent to the prosecuting agency: '+f.prosecutingOffice+'.',{fact:'prosecutingOffice'});text('6. The Defendant is responsible for providing a copy of this dismissal order to the Montana Department of Justice under MCA 46-18-204(2).');blank('Order date','orderDate','court_prosecutor_clerk_or_agency_owned');blank('Presiding judge signature','judgeSignature','court_prosecutor_clerk_or_agency_owned');

  } else {
    const [bytes, geometryBytes] = await Promise.all([
      readFile(join(process.cwd(), FAMILY_PATH, "source-derived/doj-unfilled.pdf")),
      readFile(join(process.cwd(), FAMILY_PATH, "reports/doj-representation-prerequisite.json"))
    ]);
    const proof = JSON.parse(geometryBytes.toString()).proof as { sourceSha256: string; printedBlankLines: Geometry[]; checkboxes: Geometry[] };
    requireValue(hash(bytes) === DERIVED_SHA && hash(JSON.stringify(proof)) === GEOMETRY_SHA && proof.sourceSha256 === MT_DEFERRED_DOJ_SOURCE_SHA256, "MT retained DOJ source or geometry changed");
    sourceBinding = { originalSha256: proof.sourceSha256, derivedSha256: DERIVED_SHA, geometrySha256: GEOMETRY_SHA };
    const doj = await PDFDocument.load(bytes, { updateMetadata: false }), dojFont = await doj.embedFont(StandardFonts.Helvetica);
    requireValue(doj.getPageCount() === 2 && proof.printedBlankLines.length === 14 && proof.checkboxes.length === 4, "MT DOJ component shape changed");
    const fields = ["fullName", "arrestDate", "charge1", "charge2", "charge3", "charge4", "dateOfBirth", "optionalLast4SSN", "address1", "address2", "phone", "email", "signature", "signatureDate"];
    // These are two unlabeled return-address lines, not inferred address fields.
    // Wrap the participant's supplied address without dropping words or accents.
    const addressWidth = proof.printedBlankLines[8].rect[2] - proof.printedBlankLines[8].rect[0] - 2;
    const addressWords = f.mailingAddress.trim().split(/\s+/), addressLines: string[] = []; let addressLine = "";
    for (const word of addressWords) { const next = addressLine ? addressLine + " " + word : word;
      if (dojFont.widthOfTextAtSize(next, 10) > addressWidth && addressLine) { addressLines.push(addressLine); addressLine = word; } else addressLine = next; }
    if (addressLine) addressLines.push(addressLine);
    requireValue(addressLines.length <= 2, "MT return address requires layout review");
    const vals: Record<string, string> = { fullName: f.fullName, arrestDate: f.arrestDate, charge1: f.chargeName, dateOfBirth: f.dateOfBirth,
      address1: addressLines[0], ...(addressLines[1] ? { address2: addressLines[1] } : {}), phone: f.phone, email: f.email };
    for (const [index, box] of proof.printedBlankLines.entries()) {
      const field = fields[index], pg = doj.getPage(box.page - 1), [x0, , x1, y1] = box.rect;
      const row = { component: COMPONENTS[3], page: box.page, field, x: x0 + 1, y: pg.getHeight() - y1 + 2, width: x1 - x0 - 2, height: y1 - box.rect[1] };
      if (Object.hasOwn(vals, field)) { const value = vals[field]; let size = 10;
        while (dojFont.widthOfTextAtSize(value, size) > row.width && size > 7) size -= .25;
        requireValue(dojFont.widthOfTextAtSize(value, size) <= row.width, "MT DOJ fact requires layout review");
        pg.drawText(value, { x: row.x, y: row.y + 2, size, font: dojFont }); writes.push({ ...row, value, fontSize: size });
      } else blanks.push({ ...row, reason: field === "optionalLast4SSN" ? "optional_not_supplied" : field.startsWith("charge") || field === "address2" ? "no_additional_supplied_fact" : "participant_execution_only" });
    }
    for (const [index, box] of proof.checkboxes.entries()) {
      const pg = doj.getPage(box.page - 1), [x0, , x1, y1] = box.rect;
      const row = { component: COMPONENTS[3], page: box.page, field: ["misdemeanorExpungement", "marijuanaExpungement", "nonConvictionRemoval", "deferredImposition"][index], x: x0 + 3, y: pg.getHeight() - y1 + 5, width: x1 - x0 - 6, height: y1 - box.rect[1] - 6 };
      if (index === 3) { pg.drawText("X", { x: row.x, y: row.y, size: 10, font: dojFont }); writes.push({ ...row, value: "X", fontSize: 10 }); }
      else blanks.push({ ...row, reason: "other_request_type_not_selected" });
    }
    for (const [index, sourcePage] of (await pdf.copyPages(doj, doj.getPageIndices())).entries()) { pdf.addPage(sourcePage); pages.push({ page: pdf.getPageCount(), component: COMPONENTS[3], sourcePage: index + 1 }); }
  }
  const track = current.contract.track as { selfHelpStopConditions: string[] };
  const stops = track.selfHelpStopConditions.map(ascii);
  const retainedInstructions = [
  'BEFORE GENERATION: any noncitizen participant must stop for immigration advice. Dismissal after deferred imposition may still be a conviction for immigration purposes. This route describes sealing and confidential criminal justice information only. Do not assume the charge may be denied.',
  'CONTACT THE SENTENCING COURT CLERK FIRST. Ask: What is your process for a motion under MCA 46-18-204? Do you require a local form, cover sheet, or addendum? Has my case already been dismissed and sealed on the court\'s own motion? A current local procedure or form overrides this drafted motion. Stop if one applies; do not file a duplicate motion if relief already occurred.',
  'Obtain the deferred sentence order and confirm the existing criminal case number, sentencing court, sentencing date, crime and classification, plea or verdict, deferral period and completion. Deferred imposition is different from a suspended sentence; a suspended sentence does not qualify for this packet.',
  'Ask the clerk to confirm from the case record whether the prosecutor filed any petition to revoke during deferral under MCA 46-18-203. Do not assert absence without that confirmation. A filed petition defeats the mandatory felony limb and requires legal review even on a misdemeanor. Verify all conditions, including fines and fees, were completed. Obtain compliance records if asked; disputes require a stop.',
  'For a qualifying completed felony with no revocation petition, MCA 46-18-204(1)(a) uses shall; misdemeanor relief remains discretionary. This packet is for completed deferral only. Early termination under MCA 46-18-208 requires separate review, not an assumed expired period.',
  'Review all motion facts; sign the declaration under penalty of perjury under Montana law, giving the actual date and city/state. No notarization is required for that declaration. Do not fill the judge\'s findings, order date or signature.',
  'FILE FIRST, THEN SERVE. File the motion, certificate of service and proposed order with the clerk of the sentencing court in the SAME existing criminal case. Ask how the clerk wants the certificate handled before service is completed; do not sign a false certificate. Serve the file-stamped motion by mail or hand delivery on the county attorney or city attorney who prosecuted the case. Record actual method, recipient, date and server signature after service. Court and prosecutor responses/hearings are not assumed or assigned invented deadlines.',
  'No new civil case is commenced. No motion fee is expected, but whether a local court charges a motion fee remains unresolved: ask the clerk; this packet quotes no court fee. The adopted instructions state no fee for the CRISS request.',
  'AFTER THE COURT ORDER: obtain the signed dismissal order. The defendant is responsible for a SEPARATE DOJ CRISS submission; court sealing alone does not complete the DOJ record update. Use the retained 2024 CRISS Expungement/Removal Request Form, deferred-imposition request type only. Enclose the deferred sentence order and dismissal order; request certified judgment copies and include valid photo identification by default under the adopted fail-closed attachment treatment. Do not select misdemeanor expungement, marijuana expungement, or non-conviction removal.',
  'CRISS mailing destination from the held form: CRISS Expungement, 2225 11th Ave., PO Box 201403, Helena, MT 59620. Questions: 406-444-3625. The form says to allow 30 days for processing and that CRISS supplies a confirmation letter. Preserve mailing proof, copies and the response.',
  'VERIFY BOTH SYSTEMS: after the order and DOJ processing, check both Montana Public Access Portals and obtain a fresh CRISS criminal history record. Verify the case is sealed and treated as confidential criminal justice information; if it remains public or the DOJ charge remains, contact the relevant clerk/CRISS and obtain legal help as needed. Sealing is not destruction or a promise about permission to deny a charge.',
  'SELF-HELP STOPS: '+stops.join(' '),
  'REVIEW ARTIFACT LIMIT: these fixtures contain synthetic facts and example contact details. The court documents and instructions are drafted, and the required DOJ source-derived form is supplied separately for use only after the court order. Do not file these synthetic review fixtures.',
  'Required completion before service certificate filing: Printed name of actual server. The server is not assumed to be the defendant.',
  'RELEASE NOTES RETAINED: local procedure/fee, DOJ 2023-versus-2024 attachment practice, supporting-process asset-role mismatch, and denial-of-charge legal effect remain the adopted release blockers. No source-index reclassification or commercial authority is created.'
 ];
  start(COMPONENTS[4], "PARTICIPANT INSTRUCTIONS AND SEQUENTIAL CHECKLIST", false);
  // Court-only steps are not imposed again after an actual dismissal order.
  const selected = mapping.stage === "court_motion" ? [0,1,2,3,4,5,6,7,8,9,10,11,13] : [0,8,9,10];
  for (const index of selected) {
    let instruction = retainedInstructions[index];
    if (index === 0) instruction = instruction.replace("BEFORE GENERATION:", "BEFORE USING THESE DOCUMENTS:");
    if (index === 4 && terminated) instruction = "The court already terminated the remaining deferral time by an order entered on " + f.terminationOrderDate + ". Confirm that order and the applicable conditions; do not allege that the original full period expired. This motion requests dismissal under MCA 46-18-204, not a new early-termination order. The qualifying felony no-revocation limb is mandatory; misdemeanor relief remains discretionary.";
    text(instruction);
  }
  if (mapping.stage === "doj_after_order") text("Your supplied facts identify an existing dismissal order. This stage contains only the separate DOJ request and these instructions. Do not file a duplicate court motion. Sign and date the request yourself after checking its facts and the required enclosures; the optional last four SSN digits remain blank unless you choose to supply them yourself.");
  text("If the court has ordered sealing, records are treated as confidential criminal justice information. Agencies listed in MCA 44-5-103 retain access; DOJ identifies law enforcement, including the military and Border Patrol. Sealing does not destroy or erase the record and does not establish permission to deny a charge.");
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false }));
  return { bytes, mapping, pages, writes, blanks, sourceBinding, contractSha256: hash(JSON.stringify(current.contract)), inputSha256: hash(JSON.stringify({ inputs: mapping.inputs, inputSources: mapping.inputSources })),
    artifactSha256: hash(bytes), generationAllowed: false as const, paymentAllowed: false as const, verificationAuthority: false as const, admissionGranted: false as const };
}
