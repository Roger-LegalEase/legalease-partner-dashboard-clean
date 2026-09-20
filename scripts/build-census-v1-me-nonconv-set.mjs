#!/usr/bin/env node
/**
 * The Maine non-conviction confidentiality packet family builder.
 *
 *   node scripts/build-census-v1-me-nonconv-set.mjs [--check]
 *
 * One census-v1 family, two alternative units, strategy custom_pleading:
 *
 *   me-nonconv-confidential-by-operation-of-law   16 M.R.S. § 703(2) makes the
 *       listed non-conviction dispositions confidential BY OPERATION OF LAW.
 *       Nothing is filed, no court has any role, and no motion exists —
 *       process guidance only.
 *
 *   me-nonconv-709-correction-request   16 M.R.S. § 709 gives the person the
 *       right to inspect their own criminal history record information and to
 *       request amendment or correction. No official form exists and the
 *       statute prescribes none, so the packet drafts a controlled,
 *       participant-signed written request — generated only where the agency
 *       record is demonstrably inaccurate.
 *
 * Maine does not seal or expunge non-convictions on motion; generating a court
 * filing for the base branch would be affirmatively wrong. The family's own
 * legal-design record — data/record-clearing/legal-design-intake/ME.memo.json,
 * track me-nonconv — models the two units as alternatives and resolves the
 * correction request to custom_pleading, which is what this build renders.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform writes only the participant's identity and contact facts on the
 * § 709 request. Every record fact — court, docket number, charge, disposition
 * and its date, what the Bureau record shows and what it should show — is a
 * labelled dotted blank declared REQUIRED_BEFORE_FILING and disclosed in
 * participant-instructions.md, with the clerk of the court that handled the
 * case and the State Bureau of Identification named as the checkable
 * authorities. The with-prejudice and plea-agreement questions decide the
 * § 703(2) classification and are never inferred: where the participant's
 * documents do not say, the line stays blank and the participant is routed to
 * the clerk or to advice. No signature or date is ever written, no fee figure
 * is published (the Bureau's record-search fees are confirmed with the Bureau),
 * and the packet promises no confidentiality on the deferred-disposition
 * branch, whose § 703(2) status is a recorded open question.
 */
import {
  mapHelpers, composedMapOf, runIfMain, DOTS
} from "./rcap-custom-pleading/composed-family-host.mjs";

const FAMILY_ID = "me-nonconv-set";
const OUT = "data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading";

const ROUTE = Object.freeze({
  routeKeys: [
    "obligation:unit:ME:me-nonconv:me-nonconv-709-correction-request",
    "obligation:unit:ME:me-nonconv:me-nonconv-confidential-by-operation-of-law"
  ],
  legalName: "Confidential Criminal History Record Information for Non-Conviction Dispositions, and the § 709 Inspection and Correction Request, 16 M.R.S. ch. 7",
  routeName: "a Maine case that did not end in a conviction: confidentiality by operation of law under 16 M.R.S. § 703(2), and the § 709 inspection and correction request where the agency record is wrong",
  statutes: ["16 M.R.S. § 703(2)", "16 M.R.S. § 705", "16 M.R.S. § 708", "16 M.R.S. § 709", "5 M.R.S. ch. 375, subch. 7"]
});

const COMPONENTS = [
  { id: "process_guidance", role: "process_guidance", title: "Is Your Record Already Confidential? The Classification Worksheet" },
  {
    id: "primary_filing", role: "primary_filing", title: "Inspection and Correction Request Under 16 M.R.S. Sec. 709",
    condition: "Sent only where the agency record is demonstrably inaccurate - most often where the State Bureau of Identification is still carrying, as public, a disposition that 16 M.R.S. Sec. 703(2) makes confidential, or is carrying a disposition that is simply wrong. Where the record is accurate, nothing is sent: the confidentiality of a Sec. 703(2) disposition is automatic."
  },
  {
    id: "attachment", role: "attachment", title: "Attachment Checklist for the Sec. 709 Request",
    condition: "Accompanies the Sec. 709 request wherever the participant holds a disposition order."
  },
  { id: "instructions", role: "instructions", title: "Instructions, and the Escalation Path" }
];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Douglas Emmett Thibodeau",
    "participant.date_of_birth": "1990-09-14",
    "participant.street_address": "77 Schooner Point Road, Rockland, ME 04841",
    "participant.phone": "207-555-0129",
    "participant.email": "douglas.thibodeau@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Marie-Therese O'Callaghan-Beauchemin",
    "participant.date_of_birth": "1957-12-31",
    "participant.street_address": "2201 Upper Moosehead Wilderness Township Road, Lot 118, Greenville Junction, Maine 04442-9917",
    "participant.phone": "(207) 555-0186 ext. 5521",
    "participant.email": "marie.therese.ocallaghan.beauchemin@longmailexample.org"
  }
};

/* ---- composed bodies ------------------------------------------------------------ *
 * Everything below is traceable to the family's committed records, named inline:
 *   [MEMO]     data/record-clearing/legal-design-intake/ME.memo.json, track me-nonconv
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json, me-nonconv-set
 */
function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const component = COMPONENTS.find((c) => c.id === componentId);
  const L = [];
  L.push(component.title.toUpperCase(), "");
  if (componentId === "process_guidance") {
    L.push(`Prepared for: ${name}`, "");
    L.push("MAINE DOES NOT SEAL OR EXPUNGE NON-CONVICTIONS ON MOTION. There is no petition, no motion and no court filing on this route. Instead, 16 M.R.S. Sec. 703(2) makes the listed non-conviction dispositions confidential criminal history record information BY OPERATION OF LAW: automatically, with no filing and no court involvement. Confidential information may be disseminated only to the recipients 16 M.R.S. Sec. 705 lists, and a criminal justice agency may not confirm its existence or nonexistence to anyone not entitled to receive it.", "");
    L.push("STEP ONE - CLASSIFY YOUR DISPOSITION AGAINST THE Sec. 703(2) LIST. The listed categories include:");
    L.push("- a summons or arrest without disposition, where more than one year has elapsed, no active prosecution is pending and you are not a fugitive;");
    L.push("- a decision by law enforcement not to refer the matter to a prosecutor;");
    L.push("- a decision by a prosecutor not to initiate or approve criminal proceedings;");
    L.push("- a grand jury finding of insufficient evidence;");
    L.push("- a charge dismissed with prejudice by the court, or dismissed with finality by a prosecutor outside a plea agreement;");
    L.push("- an acquittal - which does NOT include a verdict or accepted plea of not criminally responsible by reason of insanity;");
    L.push("- a mistrial with prejudice;");
    L.push("- termination for lack of subject matter jurisdiction, or for want of jurisdiction over the defendant;");
    L.push("- and the remaining paragraphs of Sec. 703(2), which include a pardoned conviction.", "");
    L.push("Two dismissal facts decide the classification and neither can be guessed: whether the dismissal was WITH PREJUDICE, and whether a prosecutor's dismissal was OUTSIDE A PLEA AGREEMENT. Your court paperwork answers them; where it does not, ask the office that keeps the records of the court that handled the case, or get advice.", "");
    L.push("A DEFERRED DISPOSITION IS NOT PROMISED ANYTHING HERE. Whether a charge dismissed after a completed deferred disposition falls inside Sec. 703(2) is not established by any statute, Bureau guidance or decision, because a deferred disposition arises from a written agreement with the State. This packet does not promise confidentiality on that branch; verify what the Bureau record actually shows, and get advice if it matters.", "");
    L.push("IF YOUR DISPOSITION IS OUTSIDE THE LIST, Maine offers no relief for it on this route, and this packet says so plainly rather than routing you to a request that will be refused.", "");
    L.push("STEP TWO - SEE WHAT THE STATE ACTUALLY HOLDS. Request your own Maine criminal history record from the Maine State Police, State Bureau of Identification: order online through the Bureau's public criminal history request service, or by mail to State House Station #42, Augusta, ME 04333-0042. The Bureau charges a fee for the standard record search and a higher fee for a notarised background check; confirm the current amounts with the Bureau, because no figure is published here.", "");
    L.push("STEP THREE - SEPARATE THE THREE PLACES A RECORD SHOWS UP. They have different remedies, and people conflate them:");
    L.push("- THE BUREAU RECORD. If it treats a confidential disposition as public, or is simply wrong, the Sec. 709 request in this packet is the remedy.");
    L.push("- THE COURT DOCKET. Court records sit outside this route entirely: Sec. 709(6) does not reach them, and public access to court records is governed by Supreme Judicial Court rule under 16 M.R.S. Sec. 708. A case may remain visible on a public docket even when the Bureau record is correct.");
    L.push("- A PRIVATE BACKGROUND-CHECK COMPANY'S REPORT. A private vendor's stale database is a consumer-reporting problem with the vendor, not a Bureau problem.", "");
    L.push("Where is the record actually causing you a problem? Write it here after checking your Bureau record, your court paperwork, or the vendor report - it decides which remedy, if any, this packet holds for you:");
    L.push(DOTS());
  } else if (componentId === "primary_filing") {
    L.push("USE THIS PAGE ONLY IF the agency record is demonstrably inaccurate - most often, the State Bureau of Identification is carrying as public a disposition that 16 M.R.S. Sec. 703(2) makes confidential, or is carrying a disposition that is simply wrong. If the Bureau record is accurate, send nothing: Sec. 703(2) confidentiality is automatic and there is nothing to request.", "");
    L.push("To: the Maine criminal justice agency that maintains the record, principally:");
    L.push("Maine State Police, State Bureau of Identification");
    L.push("State House Station #42, Augusta, ME 04333-0042");
    L.push("(delivered in person or by mail)", "");
    L.push("RE: Request for amendment or correction of criminal history record information under 16 M.R.S. Sec. 709", "");
    L.push(`I, ${name}, request, under 16 M.R.S. Sec. 709(1) and (2), that the criminal history record information the agency maintains about me be amended or corrected as set out below. Sec. 709(2) provides that the agency has fifteen days to investigate and to notify me of its decision, with reasons for any refusal.`, "");
    L.push(`Date of birth: ${dob}`, "");
    L.push("The record concerned, identified from my court paperwork:", "");
    L.push("Court that handled the case, and its county:");
    L.push(DOTS(), "");
    L.push("Docket number, where my paperwork states one:");
    L.push(DOTS(), "");
    L.push("What I was charged with:");
    L.push(DOTS(), "");
    L.push("How the case ended, copied from the court order or docket entry - including, for a dismissal, whether it was with prejudice or was outside a plea agreement, exactly as the paperwork says; where the paperwork does not say, this line is left blank and I will ask the court's records office before sending this request:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Date the case ended that way:");
    L.push(DOTS(), "");
    L.push("What the agency record currently shows about this case, copied from my own Bureau record:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("The amendment or correction requested - what the record should show instead, and where the disposition is one 16 M.R.S. Sec. 703(2) lists, the paragraph of Sec. 703(2) it falls under, taken from the classification worksheet in this packet:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Attached are the court order or docket entry showing the disposition, and the page of my own record showing what is currently carried, per the attachment checklist of this packet.", "");
    L.push("This request states facts from my own court paperwork and record. It asserts nothing about the agency's conduct.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(46), "");
    L.push("(You sign and date this request personally. Nothing on this page is signed or dated for you.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "attachment") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Attach these to the Sec. 709 request. Each is named here and obtained by you; nothing is obtained, inspected or authenticated for you.", "");
    L.push("ONE. The court order or docket entry showing how each charge ended - and, for a dismissal, whether it was with prejudice or without prejudice. That single word decides the Sec. 703(2) classification. Ask the office that keeps the records of the court that handled the case.");
    L.push("TWO. The page of your own Maine criminal history record, from the State Bureau of Identification, showing what is currently carried for this case.", "");
    L.push("Send copies, not your only originals.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHICH UNIT IS YOURS", "");
    L.push("This packet carries two alternatives and at most one applies:");
    L.push("- THE BASE BRANCH: your disposition is on the Sec. 703(2) list and the Bureau record already treats it correctly. NOTHING IS FILED OR SENT. The confidentiality is automatic. The classification worksheet is the whole of this branch.");
    L.push("- THE CORRECTION BRANCH: the agency record is demonstrably inaccurate. You send the Sec. 709 request in this packet, in writing, to the agency that holds the record - principally the State Bureau of Identification, in person or by mail. There is no official form and the statute prescribes none. No one else is served, and no fee attaches to a Sec. 709 request.", "");
    L.push("WHAT HAPPENS AFTER YOU SEND THE REQUEST, FROM THE STATUTE", "");
    L.push("- Sec. 709(2): the agency has FIFTEEN DAYS to investigate and to notify you of its decision, with reasons for any refusal.");
    L.push("- Sec. 709(3): on a refusal, you may take an administrative appeal to the head of the agency, who must complete it within THIRTY DAYS. This packet does not draft that appeal: an administrative appeal is a contested proceeding and is work for a lawyer.");
    L.push("- If the appeal is refused, you may file a STATEMENT OF DISAGREEMENT, which must accompany any future dissemination of the disputed information.");
    L.push("- Final agency action is reviewable in the Superior Court under 5 M.R.S. ch. 375, subch. 7. This packet does not draft any court filing.");
    L.push("- On correction, Sec. 709 requires the agency to notify prior recipients within thirty days.", "");
    L.push("WHAT THIS ROUTE DOES NOT REACH", "");
    L.push("- COURT RECORDS. Sec. 709(6) does not apply to court records; access to them is governed by Supreme Judicial Court rules. A case may remain visible on a public docket even when the Bureau record is correct, and this packet says so plainly rather than implying the docket is cured.");
    L.push("- PRIVATE VENDOR DATABASES, which are a consumer-reporting problem with the vendor.", "");
    L.push("MONEY. No fee attaches to the confidentiality itself and none to a Sec. 709 request. The Bureau charges a fee for your own record search and a higher fee for a notarised background check; no amount is published here - confirm the current amounts with the State Bureau of Identification.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF SENDING ANYTHING", "");
    L.push("Stop, and take this packet to a lawyer or a legal-aid office, if any of these is true:");
    L.push("- your paperwork does not say whether a dismissal was with prejudice, or whether it was part of a plea agreement;");
    L.push("- you need a COURT record restricted rather than a Bureau record treated as confidential - that is 16 M.R.S. Sec. 708 and court-rule territory, outside this route;");
    L.push("- the case ended with a verdict or accepted plea of not criminally responsible by reason of insanity;");
    L.push("- the case was a deferred disposition - its Sec. 703(2) status is not established, and this packet promises nothing for it;");
    L.push("- the agency refuses the correction and you want to appeal to the agency head or seek Superior Court review;");
    L.push("- you are not a United States citizen - a non-conviction disposition can still carry immigration consequences.", "");
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a classification worksheet, a controlled written request and instructions. It is not a court filing of any kind - Maine provides none for this - it is not legal advice, and it does not promise that any record is or will become confidential.");
  }
  L.push("", `Route: ${ROUTE.routeKeys[0]}`);
  return L.join("\n");
}

/* ---- the field maps -------------------------------------------------------------- */
function maps() {
  const out = [];
  {
    const h = mapHelpers("process_guidance");
    const writes = [h.write("participant_name", "Participant named on the classification worksheet", "participant.full_legal_name")];
    const refusals = [
      h.rbf("problem_location", "Where the record is actually causing a problem - the Bureau record, the court docket, or a private vendor's report",
        "where the record is actually hurting you, decided after you have your own Bureau record from the State Bureau of Identification, your court paperwork from the court's records office, or the vendor's report - it decides which remedy, if any, this packet holds",
        "the three problems have three different remedies and only the participant's own documents can say which applies")
    ];
    out.push(composedMapOf("process_guidance", FAMILY, writes, refusals));
  }
  {
    const h = mapHelpers("primary_filing");
    const writes = [
      h.write("requester_name", "Requester named in the Sec. 709 request", "participant.full_legal_name"),
      h.write("date_of_birth", "Requester's date of birth, printed in the Sec. 709 request", "participant.date_of_birth"),
      h.write("mailing_address", "Mailing address of the requester in the contact block at the foot of the request", "participant.street_address"),
      h.write("telephone", "Telephone number of the requester in the contact block at the foot of the request", "participant.phone"),
      h.write("email", "Email address of the requester in the contact block at the foot of the request", "participant.email")
    ];
    const refusals = [
      h.rbf("record_court", "Court that handled the case, and its county",
        "which court handled the case and its county, from your court paperwork; the court's records office can confirm both",
        "no court identity is held for this record"),
      h.rbf("docket_number", "Docket number of the case, where the paperwork states one",
        "the docket number, copied from your court paperwork where it states one",
        "no case identifier is held for this record"),
      h.rbf("charge_description", "What the requester was charged with",
        "the charge, worded as your court paperwork words it",
        "no charge fact is held for this record"),
      h.rbf("disposition_statement", "How the case ended, copied from the court order or docket entry, including any with-prejudice or plea-agreement wording exactly as the paperwork says",
        "how the case ended, copied exactly - for a dismissal, whether it was with prejudice and whether it was outside a plea agreement decide the Sec. 703(2) classification; where your paperwork does not say, leave the line blank and ask the court's records office before sending, or get advice",
        "the two dismissal facts decide the classification and neither can be inferred; where the order is silent the field stays blank and the participant is routed to the records office or to advice"),
      h.rbf("disposition_date", "Date the case ended, from the record",
        "the date the case ended, taken from the court order or docket entry",
        "no disposition fact is held for this record"),
      h.rbf("record_currently_shows", "What the agency record currently shows about the case, copied from the requester's own Bureau record",
        "what your own Bureau record currently carries for this case, copied from the record itself - obtain it from the State Bureau of Identification first",
        "what the agency currently carries can only come from the participant's own record"),
      h.rbf("correction_requested", "The amendment or correction requested, with the Sec. 703(2) paragraph where one applies",
        "what the record should show instead, and - where the disposition is on the Sec. 703(2) list - which paragraph it falls under, taken from the classification worksheet",
        "the correction is the participant's own request, grounded on their own paperwork; the platform asserts nothing about the agency's conduct"),
      h.protectedBlank("requester_signature", "Signature of the requester on the Sec. 709 request",
        "the participant signs the request personally"),
      h.protectedBlank("signature_date", "Date beside the requester's signature on the request",
        "a date written before the request is signed would be false")
    ];
    out.push(composedMapOf("primary_filing", FAMILY, writes, refusals));
  }
  {
    const h = mapHelpers("attachment");
    out.push(composedMapOf("attachment", FAMILY,
      [h.write("participant_name", "Participant named on the attachment checklist", "participant.full_legal_name")], []));
  }
  {
    const h = mapHelpers("instructions");
    out.push(composedMapOf("instructions", FAMILY,
      [h.write("participant_name", "Participant named on the instructions", "participant.full_legal_name")], []));
  }
  return out;
}

/* ---- participant instructions ----------------------------------------------------- */
function participantInstructions(rbf) {
  const titles = Object.fromEntries(COMPONENTS.map((c) => [c.id, c.title]));
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you send anything — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("Maine does not seal or expunge non-convictions on motion. Under 16 M.R.S. § 703(2) the listed non-conviction dispositions are confidential **by operation of law** — automatically, with no filing and no court involvement. This packet therefore carries two alternatives: a classification worksheet (the base branch, on which nothing is sent), and a § 709 inspection and correction request (sent only where the agency record is demonstrably inaccurate). No official form exists for a § 709 request and the statute prescribes none, which is why the request is a composed, controlled letter.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every record fact is a labelled dotted blank listed below, and you fill it from your own paperwork, never from memory.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `process_guidance` | the § 703(2) classification worksheet: is the record already confidential, and where is it actually hurting you |");
  out.push("| `primary_filing` | the composed § 709 inspection and correction request — **conditional**: sent only where the agency record is demonstrably inaccurate |");
  out.push("| `attachment` | the checklist of what accompanies the request — **conditional**: wherever you hold a disposition order |");
  out.push("| `instructions` | the fifteen-day investigation duty, the escalation path, and what this route does not reach |");
  out.push("");

  out.push("## Documents you must obtain first", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Your own Maine criminal history record — on this track it is the whole point: it is the only way to see whether the State is carrying the case and whether it is treated as confidential; the Bureau charges a fee for the search, confirmed with the Bureau | Maine State Police, State Bureau of Identification — online, or by mail to State House Station #42, Augusta, ME 04333-0042 |");
  out.push("| The court order or docket entry showing how each charge ended — and, for a dismissal, whether it was **with prejudice** and whether it was **outside a plea agreement**; those two facts decide the § 703(2) classification | the records office of the court that handled the case |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one from the records.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${titles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date beside it.** The § 709 request is yours alone.");
  out.push("- **Any with-prejudice or plea-agreement assertion your paperwork does not make.** Those two facts decide the classification, neither can be inferred, and a silent order routes you to the court's records office or to advice.");
  out.push("- **The administrative appeal and any Superior Court filing.** The escalation path is described in the instructions only; contested proceedings are work for a lawyer.");
  out.push("- **Every fee figure.** The Bureau's current search fees are confirmed with the Bureau.", "");

  out.push("## When to stop and get help instead", "");
  out.push("- your paperwork does not say whether a dismissal was with prejudice, or whether it was part of a plea agreement;");
  out.push("- you need a court record restricted rather than a Bureau record treated as confidential — that is § 708 and court-rule territory, outside this route;");
  out.push("- the case ended with a verdict or accepted plea of not criminally responsible by reason of insanity;");
  out.push("- the case was a deferred disposition, whose § 703(2) status is not established — this packet promises nothing for it;");
  out.push("- the agency refuses the correction and you want to appeal or seek Superior Court review;");
  out.push("- you are not a United States citizen.", "");

  out.push("## What this packet is not", "");
  out.push("A classification worksheet, a controlled written request and instructions — not a court filing (Maine provides none for this), not legal advice, and no promise that any record is or will become confidential, on the deferred-disposition branch or any other.", "");
  out.push(`_Routes: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

const FAMILY = {
  familyId: FAMILY_ID,
  outDir: OUT,
  buildScript: "scripts/build-census-v1-me-nonconv-set.mjs",
  jurisdiction: "ME",
  route: ROUTE,
  components: COMPONENTS,
  composedFrom:
    "the legal-design intake record (data/record-clearing/legal-design-intake/ME.memo.json, track me-nonconv, "
    + "composition mode 'alternative' over two units) and the packet-set manifest "
    + "(data/record-clearing/legal-design-packet-set-manifests.json, me-nonconv-set)",
  compositionSources: [
    "data/record-clearing/legal-design-intake/ME.memo.json",
    "data/record-clearing/legal-design-packet-set-manifests.json"
  ],
  composedBody,
  maps,
  fixtures: FIXTURES,
  participantInstructions,
  formIdentityNote:
    "No official Maine form exists for a 16 M.R.S. § 709 inspection and correction request and the statute "
    + "prescribes none, so the request is a composed, controlled, participant-signed letter — exactly what the "
    + "legal-design record resolves (custom_pleading on the correction unit). The base unit files nothing at all: "
    + "§ 703(2) confidentiality is automatic, no court has any role, and generating a court form for a Maine "
    + "non-conviction would be affirmatively wrong.",
  routeSelectionNote:
    "The two units are alternatives, not stages: nothing is sent on the base branch, and the § 709 request is "
    + "conditional on the agency record being demonstrably inaccurate — a condition printed on the request's own "
    + "face. Which unit applies turns on what the participant's own Bureau record shows, so neither is selected "
    + "for them and no route election appears on the paper.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that any particular disposition falls inside 16 M.R.S. § 703(2) — in particular a charge dismissed after a completed deferred disposition, whose status is a recorded open question",
    "the State Bureau of Identification's current record-search fees",
    "anything about court dockets, which § 709(6) does not reach and Supreme Judicial Court rules govern"
  ],
  buildFindings: [
    {
      finding:
        "Maine's non-conviction relief is confidentiality BY OPERATION OF LAW under 16 M.R.S. § 703(2): no filing "
        + "exists, no court has any role, and the legal-design record states that generating a court form for this "
        + "branch would be affirmatively wrong.",
      consequence:
        "The base unit is a classification worksheet and verification walkthrough, rendered as process guidance "
        + "with no filing; the only composed instrument in the packet is the § 709 correction request, conditional "
        + "on a demonstrably inaccurate agency record, with its condition printed on its own face."
    },
    {
      finding:
        "Whether a charge dismissed after a completed deferred disposition is confidential under § 703(2) is NOT "
        + "ESTABLISHED: § 703(2)(G) reaches a dismissal with prejudice or a prosecutor's dismissal with finality "
        + "outside a plea agreement, and a Maine deferred disposition arises from a written agreement with the "
        + "State, making the carve-out a live question no statute, guidance or decision resolves.",
      consequence:
        "The packet fails closed: it promises no confidentiality on the deferred-disposition branch, prints the "
        + "branch as a stop-and-get-help condition, and tells the participant to verify what the Bureau record "
        + "actually shows."
    },
    {
      finding:
        "The with-prejudice and plea-agreement facts decide the § 703(2) classification of every dismissal, and "
        + "neither can be inferred from a silent order.",
      consequence:
        "The request's disposition paragraph instructs the participant to copy the paperwork's exact wording, and "
        + "where the paperwork is silent the line stays blank and the participant is routed to the court's records "
        + "office or to advice — never to a guessed characterization."
    },
    {
      finding:
        "Section 709(6) does not reach court records, 16 M.R.S. § 708 leaves public access to them to Supreme "
        + "Judicial Court rule, and whether docket entries for confidential dispositions remain publicly "
        + "accessible in practice is a recorded open question.",
      consequence:
        "The packet says plainly that a case may remain visible on a public docket even when the Bureau record is "
        + "correct, separates the Bureau record, the court docket and private vendor databases into three problems "
        + "with three remedies, and implies no docket cure."
    },
    {
      finding:
        "Sections 709(3) and (4) provide an escalation path — administrative appeal to the agency head within "
        + "thirty days, a statement of disagreement accompanying future dissemination, and Superior Court review "
        + "under 5 M.R.S. ch. 375 subch. 7 — which the legal-design record classifies as attorney work.",
      consequence:
        "The escalation path is described in the instructions only; no appeal and no court filing is generated, "
        + "and the stop conditions route a refused correction to counsel."
    }
  ],
  counselQuestions: [
    "Does a 17-A M.R.S. § 1903 dismissal after a completed deferred disposition fall inside 16 M.R.S. § 703(2)(G), given that it is a dismissal with prejudice but arises from a written agreement with the State? Until answered, the packet promises no confidentiality on that branch.",
    "Whether court docket entries for confidential dispositions are publicly accessible in practice, and what if anything a participant can do about that — the packet states the docket is not cured; confirm that treatment.",
    "The substantive content of § 703(2) paragraphs K and L has not been mapped to participant-facing categories; the worksheet lists the confirmed paragraphs and refers to 'the remaining paragraphs' — confirm or supply the mapping.",
    "Whether the composed § 709 request's structure — identification, current record, requested correction, § 703(2) paragraph — is sufficient where no form exists and the statute prescribes none."
  ],
  reviewerAttention: [
    "The § 709 request is conditional and its condition is printed on its own face; confirm the condition is legible and that the base branch visibly sends nothing.",
    "The deferred-disposition branch is promised nothing anywhere in the packet; confirm no page implies otherwise.",
    "The Bureau's mailing address (State House Station #42, Augusta, ME 04333-0042) is printed from the family's own record; confirm it at review.",
    "No fee figure is published; the Bureau is named for its own current amounts."
  ]
};

runIfMain(FAMILY, import.meta.url);
export { FAMILY };
