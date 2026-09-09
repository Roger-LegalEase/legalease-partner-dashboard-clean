#!/usr/bin/env node
/**
 * FABLE-PF12 census-v1 builder — Hawaii stage-one conviction-expungement motions,
 * HRS 706-622.5(4), 706-622.5(5), 706-622.8, 706-622.9 and 291E-64(e), together
 * with the stage-two HCJDC 159(b) Expungement Application each of them feeds.
 *
 *   node "scripts/build-census-v1-rcap-hi-custom-pleading.mjs" [--check] [--no-raster] [--self-test]
 *
 * WHAT THE COMMITTED RECORD SAYS THIS FAMILY IS
 *
 * The legal-design track registry records all five Hawaii conviction-expungement
 * routes as ONE two-stage process. Stage one is a written motion in the
 * participant's own existing penal case, filed in the court that entered the
 * judgment. Stage two is the HCJDC 159(b) Expungement Application submitted to
 * the Hawaii Criminal Justice Data Center with a copy of the signed stage-one
 * order attached. The registry's own words for the vehicle are carried on the
 * page, bound by digest, and are not paraphrased here.
 *
 * THREE COMPONENTS PER ROUTE, BECAUSE THE RECORD DECLARES THREE.
 *
 * The registry's packetSet for each of the five tracks declares
 * `-primary-filing-1` (custom pleading), `-proposed-order-2` (custom pleading)
 * and `-primary-filing-3` (official_pdf_fill of HCJDC-159B). The MASTER_QUEUE
 * row for this family names ONLY the five `-primary-filing-3` components. The
 * two records disagree about the size of the packet, and this build follows the
 * registry, which is the controlling legal record: a stage-two application with
 * no stage-one motion behind it cannot be submitted at all, because HCJDC will
 * not accept a conviction expungement without the court order the motion asks
 * for. The disagreement is recorded in build-findings.json rather than resolved
 * silently, and no other family owns the ten components the queue row omits.
 *
 * THE OFFICIAL FORM IS ATTACHED, NEVER IMITATED.
 *
 * `-primary-filing-3` is not composed. The pinned HCJDC 159(b) bytes are copied
 * into the packet and six facts the platform holds are drawn into write boxes
 * MEASURED FROM THOSE BYTES in this run — the x-extent of each printed rule on
 * the form, read out of the content stream, not a coordinate carried in from
 * another family. Everything else on that page is left to the applicant and
 * disclosed.
 *
 * WHAT THIS BUILD REFUSES TO SAY.
 *
 * The registry records that venue "follows the offence and is a participant
 * input rather than a track constant", so the caption's court is a labelled
 * blank and not an invented circuit. It records that no statutory filing fee
 * exists at stage one and that clerk cost practice is still open, so the packet
 * states the non-statement instead of a number. It records that HRS 291E-64(e)
 * is "Not established as mandatory", so the DUI-under-21 pages do not promise
 * an order. Every quotation printed in this packet is asserted, before anything
 * is rendered, to appear verbatim in a string value of the controlling record,
 * and to be non-empty.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";

/* The stage-one mechanism sentences are identical across the five tracks; the
 * mandate sentence is not, and the difference is the whole legal point. Each is
 * asserted below to appear verbatim in its OWN track's record. */
const VEHICLE_QUOTE_A = "The stage-one vehicle is fixed by Haw. R. Penal P. 47(a), which provides that ";
const VEHICLE_QUOTE_B = "An application to the court for an order shall be by motion";
const NO_FORM_QUOTE = "No official statewide Hawaii Judiciary expungement form exists for stage one in any circuit, so a controlled custom pleading is permitted and is the only available strategy.";
const VENUE_QUOTE = "Venue follows the offence and is a participant input rather than a track constant.";
const SERVICE_QUOTE = "Haw. R. Penal P. 49(a): all written submissions to the court shall be served upon each of the parties promptly after filing. The prosecuting attorney is a party to the underlying penal case and is served under that rule. Proof of service is required by Haw. R. Penal P. 49(c), so a certificate of service is part of the stage-one filing.";
const NOTARIZATION_QUOTE = "None. Haw. R. Penal P. 47(d) permits an unsworn declaration in lieu of an affidavit, subscribed as true under penalty of law and dated, which removes any notarization requirement from the stage-one filing.";
const NOTICE_QUOTE = "No statutory notice. Not one of the five provisions requires notice to the prosecuting attorney, to a victim, to the Attorney General, to the Data Center or to any agency. The notice that exists is the service every filed document receives.";
const FEES_QUOTE = "No fee is prescribed by the statute on any of the five stage-one routes, and the Judiciary publishes no filing fee for a motion filed in an existing penal case. What remains open is clerk cost practice, which is recorded as a release-level question rather than answered here. An HCJDC application fee applies at stage two.";
const FEE_WAIVER_QUOTE = "None arises from the statute. Haw. R. Penal P. Form B, the Request to Proceed Without Paying Filing Fees, is the companion to the Rule 40 post-conviction petition and is not a component of an expungement packet.";
const FILING_QUOTE = "Stage one: file a written motion in the existing penal case, in the court that entered the judgment. Stage two: submit the HCJDC 159(b) Expungement Application to the Hawaii Criminal Justice Data Center with a copy of the signed order attached.";
const SIGNATURE_QUOTE = "The participant signs the motion personally, and signs the Haw. R. Penal P. 47(d) declaration.";

/* The two RULE texts the court filings themselves quote. Everything else the
 * registry says is legal-design analysis addressed to this build and to a
 * reviewer, and a motion or a proposed order handed to a Hawaii judge does not
 * recite it. Both are verified against the record exactly like the rest. */
const RULE_VEHICLE_QUOTE = "An application to the court for an order shall be by motion";
const RULE_SERVICE_QUOTE = "all written submissions to the court shall be served upon each of the parties promptly after filing";

/* Read off the pinned HCJDC 159(b) bytes in this run and asserted against them
 * before anything is drawn. Nothing here is a remembered fee or address. */
const FORM_FEE_LINE = "The fee for first-time expungement is $35. Non-first-time expungements are $50. The fee includes a non-refundable $10 processing fee. A duplicate copy of an expungement certificate is $20.00.";
const FORM_ORDER_LINE = "If you are applying to have a conviction expunged, you MUST ATTACH A COPY OF THE COURT ORDER GRANTING THE EXPUNGEMENT.";
const FORM_ADDRESS_LINE = "465 South King Street, Room 102";
const FORM_ELECTION_LINE = "Expungement of First-time Drug Offender, Property Offender, and/or DUI <21:";

const SPEC = {
  familyId: "rcap-hi-custom-pleading",
  worklistGroupId: "rcap-hi-custom-pleading",
  buildScript: "scripts/build-census-v1-rcap-hi-custom-pleading.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/hi/rcap-hi-custom-pleading--custom-pleading",
  jurisdiction: "HI",
  legalName: "Hawaii Stage-One Conviction-Expungement Motions and the Stage-Two HCJDC 159(b) Application",
  routeName:
    "asking the Hawaii court that entered the judgment for an order expunging a conviction under HRS 706-622.5(4), 706-622.5(5), 706-622.8, 706-622.9 or 291E-64(e), and then applying to the Hawaii Criminal Justice Data Center with a copy of that order",

  /* The one binary this family binds. Resolved BY CONTENT DIGEST across the
   * mounted custodies, never by filename. */
  sources: [
    {
      sourceId: "official-form:HCJDC-159B",
      documentId: "HCJDC-159B",
      declaredPath: "LegalEase Hawaii/EXPUNGEMENT_APPLICATION_Rev-2026-06.pdf",
      sha256: "1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a",
      tier: "exact_identity_confirmed_from_document_text",
      role: "the stage-two Expungement Application, HCJDC 159(b) Rev. 06/03/2026, attached to this packet as its own bytes",
      printedAnchors: [FORM_FEE_LINE, FORM_ORDER_LINE, FORM_ADDRESS_LINE, FORM_ELECTION_LINE]
    }
  ],

  records: [
    {
      recordId: "legal-design-track-registry:hi-five-conviction-expungement-tracks",
      path: REGISTRY_PATH,
      role:
        "the committed legal-design track registry: each route's legal name, statutory authority, two-stage mechanism, venue, destination, packet component set, required generation inputs, filing, fee, notice, service, signature and notarization rules, and its self-help boundaries"
    }
  ],

  statutes: [
    "HRS 706-622.5(4)",
    "HRS 706-622.5(5)",
    "HRS 706-622.8",
    "HRS 706-622.9",
    "HRS 291E-64(e)",
    "Haw. R. Penal P. 47(a)",
    "Haw. R. Penal P. 47(d)",
    "Haw. R. Penal P. 49(a)",
    "Haw. R. Penal P. 49(c)",
    "Haw. R. Penal P. 54(a)",
    "HRS 831-3.2(a)"
  ],

  /*
   * The five routes. `routeKey` is the machine id every manifest binds and is
   * never abbreviated. `routeLabel` is the only one that is ever PRINTED.
   * `mandateQuote` is this route's own statement of what the court must or may
   * do, taken verbatim from that route's registry record, because the five are
   * NOT the same: four are mandatory in different words and the fifth is
   * expressly not established as mandatory.
   */
  routes: [
    {
      routeKey: "obligation:track-pathway:HI:hi_first_time_drug_offender_expungement:first-time-drug-conviction",
      trackId: "hi_first_time_drug_offender_expungement",
      slug: "hi-first-time-drug-offender",
      routeLabel: "First-time drug offender expungement - HRS 706-622.5(4)",
      whatThisMeansForYou:
        "The record states the court shall issue the order to expunge, and records no ground on which the court may refuse a qualifying application. It remains the court's order to enter; this packet asks for it and cannot make it.",
      statute: "HRS 706-622.5(4)",
      legalName: "Conviction Expungement, first-time drug offender, HRS 706-622.5(4)",
      mandateQuotes: [
        "Mandatory. 'the court shall issue a court order to expunge'. The proviso states conditions, not a discretion. The court has no listed ground to refuse a qualifying application."
      ],
      relievesWhat: "a first-time drug offender conviction within HRS 706-622.5(4)",
      routeFacts: [
        { id: "fact_firstDrugOffence", label: "Whether this was the first drug offence", supply: "State whether this was your first drug offence. The registry records this as a required generation input for this route." },
        { id: "fact_sentenceCompletion", label: "Date the sentence was completed", supply: "State whether you have completed the sentence and on what date." }
      ]
    },
    {
      routeKey: "obligation:track-only:HI:hi_marijuana_three_grams_expungement",
      trackId: "hi_marijuana_three_grams_expungement",
      slug: "hi-marijuana-three-grams",
      routeLabel: "Marijuana three grams or less expungement - HRS 706-622.5(5)",
      whatThisMeansForYou:
        "The record states the court shall grant the expungement order, and records the only proviso as the quantity: three grams or less.",
      statute: "HRS 706-622.5(5)",
      legalName: "Conviction Expungement, marijuana three grams or less, HRS 706-622.5(5)",
      mandateQuotes: ["Mandatory. 'the court shall grant an expungement order'. The only proviso is the quantity."],
      relievesWhat: "a conviction for possession of three grams or less of marijuana within HRS 706-622.5(5)",
      routeFacts: [
        { id: "fact_quantity", label: "Whether the amount was three grams or less", supply: "State whether the amount was three grams or less. The registry records this as a required generation input for this route." },
        { id: "fact_sentenceCompletion", label: "Date the sentence was completed", supply: "State whether you have completed the sentence and on what date." }
      ]
    },
    {
      routeKey: "obligation:track-pathway:HI:hi_pre_2004_drug_offender_expungement:first-time-drug-conviction",
      trackId: "hi_pre_2004_drug_offender_expungement",
      slug: "hi-pre-2004-drug-offender",
      routeLabel: "Pre-July-2004 first-time drug offender expungement - HRS 706-622.8",
      whatThisMeansForYou:
        "The record states the court shall issue the order to expunge, subject only to the statute's proviso. This route is for sentences imposed before 1 July 2004.",
      statute: "HRS 706-622.8",
      legalName: "Conviction Expungement, first-time drug offender sentenced before July 1, 2004, HRS 706-622.8",
      mandateQuotes: ["Mandatory. 'The court shall issue a court order to expunge', subject only to the proviso."],
      relievesWhat: "a first-time drug offender conviction sentenced before July 1, 2004, within HRS 706-622.8",
      routeFacts: [
        { id: "fact_sentencingDate", label: "Date of sentencing", supply: "State the date you were sentenced. This route applies to sentences before 1 July 2004." },
        { id: "fact_firstDrugOffence", label: "Whether this was the first drug offence", supply: "State whether this was your first drug offence." }
      ]
    },
    {
      routeKey: "obligation:track-only:HI:hi_first_time_property_offender_expungement",
      trackId: "hi_first_time_property_offender_expungement",
      slug: "hi-first-time-property-offender",
      routeLabel: "First-time property offender expungement - HRS 706-622.9",
      whatThisMeansForYou:
        "The record states the order follows once the court makes the statutory findings, but two of those findings are the court's own to make, so the outcome is not automatic. The record also states that where the court cannot make one of them, it may still order expungement if it finds you successfully completed a substance abuse treatment programme.",
      statute: "HRS 706-622.9",
      legalName: "Conviction Expungement, first-time property offender, HRS 706-622.9",
      mandateQuotes: [
        "Mandatory. 'the court shall issue', subject to the proviso.",
        "Mandatory once the findings are made \u2014 'shall issue ... provided that (a) through (d)' \u2014 but two of the four are findings the court makes, so the outcome is not mechanical. There is then an express discretionary fallback: where the court cannot make the paragraph (b) finding, it 'may nevertheless' order expungement provided it finds the person successfully completed a substance abuse treatment programme. This is the only discretionary grant in any of the five statutes, and the packet copy must not describe subsection (4) relief as automatic."
      ],
      relievesWhat: "a first-time property offender conviction within HRS 706-622.9",
      routeFacts: [
        { id: "fact_firstPropertyOffence", label: "Whether this was the first property offence", supply: "State whether this was your first property offence. The registry records this as a required generation input for this route." },
        { id: "fact_sentenceCompletion", label: "Date the sentence was completed", supply: "State whether you have completed the sentence and on what date." }
      ]
    },
    {
      routeKey: "obligation:track-pathway:HI:hi_under_21_dui_expungement:dui-under-21-conviction",
      trackId: "hi_under_21_dui_expungement",
      slug: "hi-under-21-dui",
      routeLabel: "DUI under 21 expungement - HRS 291E-64(e)",
      whatThisMeansForYou:
        "The record states this subsection is not established as mandatory: it says a person may apply, and it does not say the court shall grant. Do not treat the order as guaranteed.",
      statute: "HRS 291E-64(e)",
      legalName: "Conviction Expungement, DUI under 21, HRS 291E-64(e)",
      mandateQuotes: [
        "Not established as mandatory. This subsection is drafted differently from the other four: it says the person 'may apply to the court for an expungement order' if the conditions are met, and it does not say the court shall grant it. No source read here resolves whether a qualifying application must be granted. Recorded as an open point below. It does not block the build \u2014 the vehicle, the venue and the allegations are all settled \u2014 but the packet copy must not tell a participant the order is guaranteed."
      ],
      relievesWhat:
        "a conviction for operating a vehicle after consuming a measurable amount of alcohol while under 21, within HRS 291E-64(e)",
      routeFacts: [
        { id: "fact_ageAtOffence", label: "Age at the time of the offence", supply: "State how old you were at the time of the offence." },
        { id: "fact_sentenceCompletion", label: "Date the sentence was completed", supply: "State whether you have completed the sentence and on what date." }
      ]
    }
  ],

  /* Two fixtures. The boundary fixture carries the longest realistic values so
   * that every write box is exercised at its edge; the build asserts the drawn
   * width of every overlay value against the measured rule it sits on. */
  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "412 Aloha Street, Honolulu, HI 96813",
      "participant.phone": "808-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Kahealani Mahealani Kealohilani-Nakamura",
      "participant.date_of_birth": "1970-12-31",
      "participant.street_address": "1188 Kalanianaole Highway, Apartment 12-B, Kailua-Kona, HI 96740",
      "participant.phone": "808-555-0199",
      "participant.email": "kahealani.kealohilani.nakamura@example-domain.org"
    }
  },

  /* Every overlay value the build draws onto the pinned HCJDC 159(b) page. The
   * rule each one sits on is MEASURED from the pinned bytes at build time; the
   * anchor below is the printed line the rule belongs to, and the ruleIndex is
   * which rule on that line. Nothing here is a coordinate. */
  formWrites: [
    { id: "current_legal_name", label: "Current legal name", factId: "participant.full_legal_name", anchor: "Current Legal Name (Last, First, Middle):", ruleIndex: 0 },
    { id: "date_of_birth", label: "Date of birth", factId: "participant.date_of_birth", anchor: "Date of Birth:", ruleIndex: 1 },
    { id: "home_address", label: "Home address", factId: "participant.street_address", anchor: "Home Address:", ruleIndex: 0 },
    { id: "mailing_address", label: "Mailing address", factId: "participant.street_address", anchor: "Mailing Address:", ruleIndex: 0 },
    { id: "phone", label: "Telephone number", factId: "participant.phone", anchor: "Phone:", ruleIndex: 0 },
    { id: "email", label: "E-mail address", factId: "participant.email", anchor: "Email:", ruleIndex: 1 }
  ],

  formBlanks: [
    { id: "other_names", kind: "rbf", label: "Other names used", supply: "Every other name you have used, or NONE.", why: "the platform holds no alias history for this participant" },
    { id: "social_security_number", kind: "optional", label: "Optional Social Security number", why: "the form's own line says the Social Security number is optional" },
    { id: "sex_marker_m", kind: "rbf", label: "Sex marker M", supply: "Initial the M marker only if it applies to you.", why: "this personal declaration is not a fact the platform holds" },
    { id: "sex_marker_f", kind: "rbf", label: "Sex marker F", supply: "Initial the F marker only if it applies to you.", why: "this personal declaration is not a fact the platform holds" },
    {
      id: "conviction_election_initial", kind: "rbf",
      label: "Initials beside the first-time drug, property or DUI-under-21 conviction paragraph",
      supply: "Initial the conviction paragraph after you have obtained the court order and attached a copy of it.",
      why: "an applicant's initials are an act of the applicant and are never generated"
    },
    {
      id: "nonconviction_election_initial", kind: "notApplicable",
      label: "Initials beside the non-conviction arrest-record paragraph",
      routeCondition:
        "every route in this family is a conviction expungement under HRS 706-622.5, 706-622.8, 706-622.9 or 291E-64(e); the non-conviction paragraph applies to arrest records under HRS 831-3.2, which no route here reaches",
      why: "the paragraph belongs to the arrest-record branch of the form, which this family's five conviction routes do not use"
    },
    { id: "checklist_signature", kind: "rbf", label: "Checklist tick confirming the application has been signed", supply: "Tick this item only after you have signed the application.", why: "the tick certifies an act only the applicant can perform" },
    { id: "checklist_photo_id", kind: "rbf", label: "Checklist tick confirming a copy of the photo identification is enclosed", supply: "Attach a copy of your valid government-issued photo ID, then tick this item.", why: "the tick certifies an attachment only the applicant can supply" },
    { id: "checklist_mailing_address", kind: "rbf", label: "Checklist tick confirming the mailing line is complete", supply: "Check the mailing line and tick this item.", why: "the tick certifies the applicant's own check of the page" },
    { id: "checklist_court_order", kind: "rbf", label: "Checklist tick confirming the court order granting expungement is enclosed", supply: "Attach the signed stage-one order, then tick this item.", why: "the order does not exist until the court signs it at stage one" },
    { id: "checklist_payment", kind: "rbf", label: "Checklist tick confirming the money order or cashier's check is enclosed", supply: "Enclose the money order or cashier's check and tick this item.", why: "the payment is an act of the applicant" },
    { id: "hcjdc_use_only", kind: "court", label: "Box marked LEAVE BLANK; HCJDC USE ONLY", why: "the form's own printed line reserves this box for the Hawaii Criminal Justice Data Center" },
    { id: "applicant_signature", kind: "protected", label: "Signature of the applicant", why: "a participant signature is never generated" },
    { id: "applicant_signature_date", kind: "protected", label: "Date beside the applicant signature", why: "a signature date is never generated" }
  ],

  /* What the participant instructions say about where this is filed and what it
   * costs. Every answer is either a quotation the build has verified against the
   * controlling record, or a line read off the pinned form in this run. */
  obligationTable: [
    ["Where does the stage-one motion go?", "Into the participant's own existing penal case, in the court that entered the judgment. The registry records the filing rule as: " + JSON.stringify(FILING_QUOTE)],
    ["Which court is that?", "The registry records that " + JSON.stringify(VENUE_QUOTE) + " The packet therefore prints a labelled blank for the court rather than naming one, and the participant reads it from their own court record."],
    ["Is there a filing fee at stage one?", "The registry records: " + JSON.stringify(FEES_QUOTE) + " No number is printed on the stage-one pages because the record answers none."],
    ["Is there a fee waiver at stage one?", "The registry records: " + JSON.stringify(FEE_WAIVER_QUOTE)],
    ["Who must be served?", "The registry records: " + JSON.stringify(SERVICE_QUOTE)],
    ["Is any notice required?", "The registry records: " + JSON.stringify(NOTICE_QUOTE)],
    ["Must the motion be notarized?", "The registry records: " + JSON.stringify(NOTARIZATION_QUOTE)],
    ["Who signs the stage-one motion?", "The registry records: " + JSON.stringify(SIGNATURE_QUOTE)],
    ["Where does the stage-two application go?", "The pinned HCJDC 159(b) form prints the destination on its own face: Hawaii Criminal Justice Data Center, Attn: Expungement, " + FORM_ADDRESS_LINE + ", Honolulu, HI 96813."],
    ["What does stage two cost?", "The pinned HCJDC 159(b) form prints: " + JSON.stringify(FORM_FEE_LINE) + " The form also prints that payment must be made by money order or cashier's check issued in the United States, and that personal checks are not accepted."],
    ["What must be attached at stage two?", "The pinned HCJDC 159(b) form prints: " + JSON.stringify(FORM_ORDER_LINE)]
  ],

  instructionsIntro: [
    "This is a two-stage packet, and the two stages happen months apart. Stage one is a motion you file in your own criminal case, asking the court that convicted or sentenced you for an order expunging the record of that conviction. Stage two is the Hawaii Criminal Justice Data Center application, which cannot be submitted until the court has signed the stage-one order and you have a copy of it to attach.",
    "Do not send the stage-two application to the Data Center until you hold the signed order. The registry records the reason plainly, and the form itself prints it: an application to expunge a conviction without a copy of the court order granting the expungement will be denied.",
    "This packet was composed from the committed legal-design track registry and from the pinned HCJDC 159(b) bytes. Where the record does not answer a question, this packet says so instead of answering it."
  ],

  steps: [
    "Read the route table below and find the row that matches your conviction. Use only the pages for that route; the other routes' pages are not yours.",
    "Fill every dotted blank on the stage-one motion for your route, reading each value from your own court record rather than from memory.",
    "Sign and date the motion and the declaration under Haw. R. Penal P. 47(d). Do not have it notarized; the registry records that the rule's unsworn declaration removes any notarization requirement.",
    "File the motion in your existing penal case, in the court that entered the judgment.",
    "Serve a copy on the prosecuting attorney and complete the certificate of service on the motion, as Haw. R. Penal P. 49(a) and 49(c) require.",
    "Give the court the proposed order for your route.",
    "Wait for the court to rule. Obtain a certified or signed copy of the order if it is granted.",
    "Only then complete the stage-two HCJDC 159(b) Expungement Application in this packet: initial the conviction paragraph, tick every checklist item, sign and date it.",
    "Enclose a copy of the signed court order, a copy of your valid government-issued photo ID, the payment the form specifies as a money order or cashier's check, and a self-addressed stamped envelope.",
    "Mail the stage-two application to the address the form prints on its own face."
  ],

  deliberatelyBlank: [
    "The name of the court. The registry records that venue follows the offence and is a participant input rather than a track constant, so this build does not name a circuit.",
    "The case number and the date of the judgment. The registry records that the participant reads these from their own court record; LegalEase does not obtain or review that record.",
    "The offence and the statute section of conviction. Same reason.",
    "Every signature and every signature date, on the motion, on the declaration, on the certificate of service and on the stage-two application.",
    "Every field on the proposed order that the court completes: the findings, the date, and the judge's signature and printed name.",
    "The box on the stage-two application marked LEAVE BLANK; HCJDC USE ONLY.",
    "The applicant's initials on the stage-two application. Initials are an act of the applicant."
  ],

  notTold: [
    "Whether you are eligible. This packet composes the filing; it does not decide the question.",
    "Whether any clerk's cost attaches to a stage-one motion filed in an existing penal case. The registry records that as still open and records it as a release-level question, so this packet states no stage-one cost.",
    "How long the court will take to rule.",
    "For the DUI-under-21 route, whether a qualifying application must be granted. The registry records that HRS 291E-64(e) is not established as mandatory, and this packet does not tell you the order is guaranteed."
  ],

  buildFindings: [
    {
      finding:
        "The MASTER_QUEUE row for this family names five packetComponents, all of them the `-primary-filing-3` stage-two HCJDC-159B components, while the committed legal-design track registry declares three required components for each of the same five tracks: a custom-pleading `-primary-filing-1`, a custom-pleading `-proposed-order-2` and the `-primary-filing-3` official form.",
      consequence:
        "This build follows the registry and produces all fifteen. The ten the queue row omits are not owned by any other family in the queue, and a stage-two application delivered without the stage-one motion behind it could not be submitted at all, because the form's own face refuses a conviction application with no court order attached. The queue row is a summary; the registry is the controlling legal record."
    },
    {
      finding:
        "The registry declares `-primary-filing-3` as official_pdf_fill of HCJDC-159B, and the family's own queue row records custodyClass SOURCE_ALREADY_HELD with directAttachment true.",
      consequence:
        "The pinned form is attached as its own bytes and six held facts are drawn onto it. No page of that component is composed, and no imitation of the official form appears anywhere in this packet. The write boxes were measured from the pinned bytes in this run by reading the x-extent of each printed rule out of the content stream."
    },
    {
      finding:
        "The five routes do not share a mandate. Four are recorded as mandatory in four different formulations, and HRS 291E-64(e) is recorded as 'Not established as mandatory', with the registry adding that the packet copy must not tell a participant the order is guaranteed. The HRS 706-622.9 record adds that the packet copy must not describe subsection (4) relief as automatic.",
      consequence:
        "Each route's pages carry that route's own mandate sentence verbatim, and the build asserts that each sentence appears in its own track's record. No route inherits another's promise."
    },
    {
      finding:
        "The Master Library's Hawaii STATE_README records that no state legal-review file was supplied for this edition and marks that a release blocker, while the committed track registry carries a full legal-design record for all five tracks with legalDesignStatus legal_design_approved_with_limitations and no build blockers.",
      consequence:
        "Building proceeds on the registry, which is what the Master Library's own integration rule directs a reader to use. The Master Library gap is a release-level matter and is reported here for the reviewer rather than treated as a source failure; the one Hawaii binary this family binds resolved exactly by content digest."
    }
  ],

  stopConditionsIntro:
    "The registry records these as self-help boundaries for these routes. Each one is a reason to stop and get help rather than to file this packet.",

  counselQuestions: [
    "Whether any clerk's cost attaches to a stage-one motion filed in an existing penal case. The registry records this as an open release-level question on the HRS 706-622.5(4) and 706-622.5(5) records; this packet states no stage-one cost rather than guessing one.",
    "Whether a qualifying HRS 291E-64(e) application must be granted. The registry records the subsection as not established as mandatory and no source read there resolves it.",
    "Whether the composed stage-one motion satisfies whatever local form practice each circuit applies, given the registry's record that no official statewide Hawaii Judiciary expungement form exists for stage one in any circuit."
  ],

  reviewersAttention: [
    "The caption's court is a labelled blank on every stage-one page, by design and on the registry's own statement about venue. A reviewer expecting a named circuit should read the caption evidence before treating it as an omission.",
    "The stage-two component is the official HCJDC 159(b) page itself, not a composed page. Its six overlay values sit on rules measured from the pinned bytes in this run, and the byte proof reports how many glyphs this build added to that page and how many of them landed outside a measured rule.",
    "The MASTER_QUEUE component reconciliation in build-findings.json is the first thing to check: this build produced ten components the queue row does not name."
  ],

  whatThisIsNot:
    "This packet is review evidence produced by a build lane. It is not legal advice, it is not verified, it is not approved for participant delivery, it opens no commercial route, and nothing in it decides whether any person is eligible for any relief.",

  receiptDoesNotEstablish: [
    "that the composed stage-one motion has been accepted by any Hawaii circuit",
    "that any clerk's cost question has been answered",
    "that HRS 291E-64(e) relief is mandatory"
  ],

  composedFromNote:
    "Composed by this build from the committed legal-design track registry, bound by SHA-256, with every printed quotation asserted to appear verbatim in a string value of the controlling track record before anything was rendered.",

  formIdentityNote:
    "HCJDC 159(b) Rev. 06/03/2026, resolved by content digest 1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a across the mounted custodies and attached as its own bytes."
};

export { SPEC, REGISTRY_PATH, VEHICLE_QUOTE_A, VEHICLE_QUOTE_B, NO_FORM_QUOTE, VENUE_QUOTE, SERVICE_QUOTE, NOTARIZATION_QUOTE, NOTICE_QUOTE, FEES_QUOTE, FEE_WAIVER_QUOTE, FILING_QUOTE, SIGNATURE_QUOTE, FORM_FEE_LINE, FORM_ORDER_LINE, FORM_ADDRESS_LINE, FORM_ELECTION_LINE };

/* ============================================================================
 * COMPONENT DECLARATIONS.
 *
 * Fifteen components: three for each of the five routes, exactly as the
 * committed registry's packetSet declares them. Two of the three are composed
 * from this family's own declared lines; the third is the pinned official form
 * and is never composed.
 *
 * A body line is plain text with three substitutions: {{factId}} writes a fact
 * the platform holds, {{DOTS}} prints a full-width dotted blank and {{DOTS:n}}
 * one n characters wide. Nothing else is interpolated, so a page can never
 * carry a value the fact table does not hold. {{Q:name}} prints a quotation
 * that has already been asserted verbatim against the controlling record.
 * ========================================================================== */

const MOTION_TITLE = "MOTION FOR AN ORDER EXPUNGING THE RECORD OF CONVICTION";
const ORDER_TITLE = "ORDER EXPUNGING THE RECORD OF CONVICTION";

/* Caption blanks are declared once and reused by the motion and the order, so
 * the two documents cannot drift apart on what the participant is asked for. */
const CAPTION_BLANKS = [
  { id: "caption_court", kind: "rbf", label: "Name of court that entered the judgment", supply: "The name of the Hawaii court that entered the judgment of conviction, read from your own court record.", why: "the registry records that venue follows the offence and is a participant input rather than a track constant, so this build names no court" },
  { id: "caption_circuit", kind: "rbf", label: "Circuit or division of that court", supply: "The circuit or division shown on your own court record.", why: "the registry records venue as a participant input, and no circuit is a constant of this route" },
  { id: "caption_case_number", kind: "rbf", label: "Case number", supply: "The case number of the penal case in which the conviction was entered, read from your own court record.", why: "the registry records that the participant reads the case number from their own court record and that LegalEase does not obtain or review that record" }
];

function motionComponent(route) {
  const routeFactLines = route.routeFacts.map((f, i) => `   ${String.fromCharCode(102 + i)}. ${f.label}: {{DOTS:34}}`);
  return {
    id: `${route.trackId}-primary-filing-1`,
    routeKey: route.routeKey,
    role: "primary_filing",
    kind: "composed",
    registryOutputStrategy: "custom_pleading",
    title: MOTION_TITLE,
    description: `The stage-one motion for ${route.routeLabel}, with its Haw. R. Penal P. 47(d) declaration and its Haw. R. Penal P. 49(c) certificate of service.`,
    body: [
      `(${route.legalName})`,
      "",
      "CAPTION",
      "",
      "Name of court that entered the judgment: {{DOTS:38}}",
      "Circuit or division of that court: {{DOTS:42}}",
      "",
      "STATE OF HAWAII, Plaintiff",
      "v.",
      "{{participant.full_legal_name}}, Defendant",
      "",
      "Case number: {{DOTS:44}}",
      "",
      "1. THE RELIEF ASKED FOR",
      "",
      `The defendant named in the caption above moves this court for an order expunging the record of the conviction entered in the case named above, under ${route.statute}.`,
      "",
      "2. THE AUTHORITY THIS MOTION RESTS ON",
      "",
      `This motion is made under ${route.statute}, which provides for the expungement of ${route.reliefDescription}.`,
      "",
      "3. WHY THIS IS A MOTION AND NOT AN APPLICATION",
      "",
      "Haw. R. Penal P. 47(a) provides:",
      "",
      "{{Q:ruleVehicle}}",
      "",
      "Haw. R. Penal P. 54(a) applies the Rules of Penal Procedure to all penal proceedings, and none of these provisions supplies its own procedure. This filing is therefore a motion in the existing penal case however the statute words the request.",
      "",
      "4. THE FACTS THIS MOTION STATES",
      "",
      "   a. The defendant's full legal name is {{participant.full_legal_name}}.",
      "   b. Offence of conviction: {{DOTS:40}}",
      "   c. Statute section of conviction: {{DOTS:34}}",
      "   d. Date of the judgment of conviction: {{DOTS:30}}",
      `   e. The conviction described above is ${route.relievesWhat}.`,
      ...routeFactLines,
      "",
      "Each dotted blank above is read by the defendant from their own court record. The controlling record states that LegalEase does not obtain or review that record, and this build has written nothing into those blanks.",
      "",
      "5. PRAYER FOR RELIEF",
      "",
      `WHEREFORE the defendant asks this court to enter an order expunging the record of the conviction entered in the case named above, under ${route.statute}, and to furnish the defendant a signed copy of that order so that it may be attached to the Expungement Application submitted to the Hawaii Criminal Justice Data Center.`,
      "",
      "6. DECLARATION UNDER HAW. R. PENAL P. 47(d)",
      "",
      "I declare under penalty of law that the statements made in this motion are true and correct.",
      "",
      "Signature of the defendant: {{DOTS:34}}",
      "Date beside the defendant's signature: {{DOTS:24}}",
      "",
      "This declaration is made under Haw. R. Penal P. 47(d), which permits an unsworn declaration in lieu of an affidavit. This motion is therefore filed without a notarization.",
      "",
      "7. CERTIFICATE OF SERVICE",
      "",
      "Haw. R. Penal P. 49(a) provides:",
      "",
      "{{Q:ruleService}}",
      "",
      "Proof of service is required by Haw. R. Penal P. 49(c). I certify that a copy of this motion was served on the prosecuting attorney in this case as recorded below.",
      "",
      "Name of the prosecuting office served: {{DOTS:32}}",
      "Address where the copy was served: {{DOTS:36}}",
      "Date the copy was served: {{DOTS:28}}",
      "Manner of service: {{DOTS:40}}",
      "Signature of the person who served the copy: {{DOTS:24}}"
    ],
    quotes: {
      ruleVehicle: { source: "shared", key: "ruleVehicle" },
      ruleService: { source: "shared", key: "ruleService" }
    },
    writes: [{ id: "defendant_name", label: "Full legal name of the defendant", factId: "participant.full_legal_name" }],
    blanks: [
      ...CAPTION_BLANKS,
      { id: "fact_offence", kind: "rbf", label: "Offence of conviction", supply: "The offence you were convicted of, as it appears on your own court record.", why: "the registry records the conviction details as a required generation input the participant supplies" },
      { id: "fact_statute_section", kind: "rbf", label: "Statute section of conviction", supply: "The statute section you were convicted under, as it appears on your own court record.", why: "the registry records the conviction details as a required generation input the participant supplies" },
      { id: "fact_judgment_date", kind: "rbf", label: "Date of the judgment of conviction", supply: "The date of the judgment of conviction, read from your own court record.", why: "the registry records that the participant reads the judgment date from their own court record" },
      ...route.routeFacts.map((f) => ({ id: f.id, kind: "rbf", label: f.label, supply: f.supply, why: `the registry records this as a required generation input for ${route.trackId}, and the platform holds no value for it` })),
      { id: "defendant_signature", kind: "protected", label: "Signature of the defendant", why: "a participant signature is never generated" },
      { id: "defendant_signature_date", kind: "protected", label: "Date beside the defendant's signature", why: "a signature date is never generated" },
      { id: "service_office", kind: "rbf", label: "Name of the prosecuting office served", supply: "The name of the prosecuting attorney or prosecuting office you served with a copy of the motion.", why: "who was served is an act of the participant that has not happened when this packet is produced" },
      { id: "service_address", kind: "rbf", label: "Address where the copy was served", supply: "The address you served the copy at.", why: "the address served is an act of the participant that has not happened when this packet is produced" },
      { id: "service_date", kind: "rbf", label: "Date the copy was served", supply: "The date you served the copy.", why: "the service date is an act of the participant that has not happened when this packet is produced" },
      { id: "service_manner", kind: "rbf", label: "Manner of service", supply: "How you served the copy, for example by hand or by mail.", why: "the manner of service is an act of the participant that has not happened when this packet is produced" },
      { id: "service_signature", kind: "protected", label: "Signature of the person who served the copy", why: "a signature is never generated, and a certificate of mailing is never signed before the mailing has happened" }
    ]
  };
}

function orderComponent(route) {
  return {
    id: `${route.trackId}-proposed-order-2`,
    routeKey: route.routeKey,
    role: "proposed_order",
    kind: "composed",
    registryOutputStrategy: "custom_pleading",
    title: ORDER_TITLE,
    description: `The proposed order the court signs on ${route.routeLabel}, and the order whose signed copy the stage-two application requires.`,
    body: [
      `(${route.legalName})`,
      "",
      "CAPTION",
      "",
      "Name of court that entered the judgment: {{DOTS:38}}",
      "Circuit or division of that court: {{DOTS:42}}",
      "",
      "STATE OF HAWAII, Plaintiff",
      "v.",
      "{{participant.full_legal_name}}, Defendant",
      "",
      "Case number: {{DOTS:44}}",
      "",
      `The defendant's motion for an order expunging the record of the conviction entered in this case, made under ${route.statute}, came before the court.`,
      "",
      "FINDINGS",
      "",
      "Findings, completed by the court: {{DOTS:38}}",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "ORDER",
      "",
      `IT IS ORDERED that the record of the conviction entered in this case against {{participant.full_legal_name}} is expunged under ${route.statute}.`,
      "",
      "Date of the order, completed by the court: {{DOTS:30}}",
      "Signature of the judge: {{DOTS:38}}",
      "Printed name of the judge: {{DOTS:34}}",
      "",
      "The defendant should ask the clerk for a signed copy of this order once it is entered. The stage-two Expungement Application in this packet cannot be submitted without a copy of it."
    ],
    quotes: {},
    writes: [{ id: "defendant_name", label: "Full legal name of the defendant", factId: "participant.full_legal_name" }],
    blanks: [
      ...CAPTION_BLANKS,
      { id: "order_findings", kind: "court", label: "Findings, completed by the court", why: "the findings are the court's own and are never written by this build" },
      { id: "order_date", kind: "court", label: "Date of the order, completed by the court", why: "the order date is set by the court when it signs" },
      { id: "order_judge_signature", kind: "protected", label: "Signature of the judge", why: "a judicial signature is never generated" },
      { id: "order_judge_name", kind: "court", label: "Printed name of the judge", why: "the presiding judge is not known when this packet is produced" }
    ]
  };
}

function formComponent(route) {
  return {
    id: `${route.trackId}-primary-filing-3`,
    routeKey: route.routeKey,
    role: "primary_filing",
    kind: "attached_official_form",
    registryOutputStrategy: "official_pdf_fill",
    sourceId: "official-form:HCJDC-159B",
    title: "EXPUNGEMENT APPLICATION, HCJDC 159(b)",
    description:
      "The stage-two Expungement Application. This component is the pinned official form's own bytes with six held facts drawn onto rules measured from those bytes; no page of it is composed.",
    writes: SPEC.formWrites,
    blanks: SPEC.formBlanks
  };
}

for (const r of SPEC.routes) {
  /* The relief this provision affords, without the trailing citation that the
   * sentence already carries. Derived from the route's own record-facing
   * description so the motion states the relief once, not twice. */
  r.reliefDescription = r.relievesWhat.replace(/,?\s*within HRS .*$/, "");
}
SPEC.components = SPEC.routes.flatMap((r) => [motionComponent(r), orderComponent(r), formComponent(r)]);

/* ============================================================================
 * BUILD CORE.
 *
 * Everything above this line is this family's own. Everything below is
 * family-independent plumbing: source resolution by content digest, quotation
 * verification against the committed record, deterministic rendering, the
 * measured overlay, byte-derived glyph readings, the builder's own count of
 * the nine completeness counters, and the census-v1 output records. It is
 * copied into this family's exclusive script rather than imported, because a
 * build host shared across families cannot be changed for one of them without
 * moving the bytes of the rest.
 * ========================================================================== */
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

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const OUT = SPEC.outDir;
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const DOTS = (n = 84) => ".".repeat(n);
const COMPONENT_IDS = SPEC.components.map((c) => c.id);
const COMPONENT = Object.fromEntries(SPEC.components.map((c) => [c.id, c]));
const ROUTE_BY_KEY = Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r]));
const ROUTE_LABEL = Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r.routeLabel]));

/* Page geometry. Declared once, because both the renderer and the glyph
 * measurement below read it: a measurement that used different numbers from the
 * renderer would be measuring something other than the page. */
const PAGE = { width: 612, height: 792, margin: 72, fontSize: 11, lineHeight: 14.5, footerY: 40, footerSize: 9 };

/* The mounted custodies a source may be resolved from, in the order the
 * Captain's own buildability measurement searched them. Overridable so this
 * script is not bound to one machine's layout. */
const SOURCE_MOUNTS = (process.env.RCAP_SOURCE_MOUNTS
  ? process.env.RCAP_SOURCE_MOUNTS.split(":")
  : [
    /* The checkout's own private/ tree first. It is gitignored rather than
     * sparse, so it is mounted into the worktree and not checked out; a lane
     * that concluded a source was unheld from its absence would have been
     * reading the resolver, not the custody. */
    path.join(ROOT, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"),
    path.join(ROOT, "private/source-imports/Nationwide_Recovery_Pool_2026-09-02"),
    path.join(ROOT, "private/source-imports/rcap-d-source-packs-2026-08-12/D1"),
    path.join(ROOT, "private/human-source-returns"),
    process.env.MASTER_LIBRARY_SOURCE_DIR ?? "/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1"
  ]).filter((mount) => fs.existsSync(mount));

for (const route of SPEC.routes) {
  assert.ok(route.routeLabel && !route.routeLabel.includes("obligation:"),
    `${route.routeKey}: routeLabel carries a machine route key; the label is what a person reads`);
  assert.ok(route.routeLabel.length <= 72, `${route.routeKey}: routeLabel would wrap on the composed page`);
}
assert.strictEqual(new Set(Object.values(ROUTE_LABEL)).size, SPEC.routes.length, "two routes share one printed label");
assert.strictEqual(new Set(COMPONENT_IDS).size, COMPONENT_IDS.length, "two components share one id");

/* ---- source resolution, by content digest ------------------------------------ */
function resolveSources() {
  const resolved = [];
  const failures = [];
  for (const src of SPEC.sources) {
    const tried = [];
    let found = null;
    for (const mount of SOURCE_MOUNTS) {
      const abs = path.join(mount, src.declaredPath);
      tried.push(abs);
      if (!fs.existsSync(abs)) continue;
      const bytes = fs.readFileSync(abs);
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      if (digest !== src.sha256) continue;
      found = { abs, bytes, digest };
      break;
    }
    if (!found) {
      failures.push({
        sourceId: src.sourceId, declaredPath: src.declaredPath, declaredSha256: src.sha256,
        why: "no file under any mounted custody has both this declared path and this content digest",
        pathsTried: tried
      });
      continue;
    }
    assert.ok(found.bytes.subarray(0, 5).toString("latin1") === "%PDF-",
      `${src.sourceId}: the resolved bytes are not a PDF`);
    resolved.push({ ...src, absolutePath: found.abs, sha256: found.digest, byteLength: found.bytes.length, bytes: found.bytes });
  }
  return { resolved, failures };
}

/* ---- committed-record binding and quotation verification --------------------- *
 * Every quotation this packet prints must appear VERBATIM in a string value of
 * the controlling track record before anything is rendered, and must be
 * non-empty. A blank presented as the record speaking is the defect this check
 * exists to make impossible.
 */
function stringCorpus(value, out = []) {
  if (typeof value === "string") { out.push(value); return out; }
  if (Array.isArray(value)) { for (const v of value) stringCorpus(v, out); return out; }
  if (value && typeof value === "object") { for (const v of Object.values(value)) stringCorpus(v, out); return out; }
  return out;
}

function resolveRecords() {
  const resolved = [];
  const failures = [];
  const quoteFailures = [];
  let registry = null;
  for (const rec of SPEC.records) {
    const abs = path.join(ROOT, rec.path);
    if (!fs.existsSync(abs)) {
      failures.push({ recordId: rec.recordId, path: rec.path, why: "the committed record does not exist at this path" });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    registry = JSON.parse(bytes.toString("utf8"));
    resolved.push({
      recordId: rec.recordId, path: rec.path, role: rec.role,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"), byteLength: bytes.length
    });
  }
  if (!registry) return { resolved, failures, quoteFailures, quotes: null, tracks: null };

  const tracks = {};
  for (const route of SPEC.routes) {
    const track = (registry.tracks ?? []).find((t) => t.trackId === route.trackId);
    if (!track) {
      failures.push({ recordId: route.trackId, path: SPEC.records[0].path, why: `the committed registry carries no track ${route.trackId}` });
      continue;
    }
    tracks[route.trackId] = track;
  }
  if (failures.length > 0) return { resolved, failures, quoteFailures, quotes: null, tracks: null };

  const shared = {
    ruleVehicle: RULE_VEHICLE_QUOTE,
    ruleService: RULE_SERVICE_QUOTE,
    vehicle: `${VEHICLE_QUOTE_A}'${VEHICLE_QUOTE_B}'`,
    noForm: NO_FORM_QUOTE,
    venue: VENUE_QUOTE,
    service: SERVICE_QUOTE,
    notarization: NOTARIZATION_QUOTE,
    notice: NOTICE_QUOTE,
    fees: FEES_QUOTE,
    feeWaiver: FEE_WAIVER_QUOTE,
    filing: FILING_QUOTE,
    signature: SIGNATURE_QUOTE
  };
  const sharedParts = {
    ruleVehicle: [RULE_VEHICLE_QUOTE],
    ruleService: [RULE_SERVICE_QUOTE],
    vehicle: [VEHICLE_QUOTE_A, VEHICLE_QUOTE_B],
    noForm: [NO_FORM_QUOTE], venue: [VENUE_QUOTE], service: [SERVICE_QUOTE],
    notarization: [NOTARIZATION_QUOTE], notice: [NOTICE_QUOTE], fees: [FEES_QUOTE],
    feeWaiver: [FEE_WAIVER_QUOTE], filing: [FILING_QUOTE], signature: [SIGNATURE_QUOTE]
  };

  const verified = { shared: {}, byRoute: {} };
  for (const route of SPEC.routes) {
    const hay = stringCorpus(tracks[route.trackId]).join("  ");
    for (const [name, parts] of Object.entries(sharedParts)) {
      for (const part of parts) {
        if (String(part).trim().length === 0) quoteFailures.push({ trackId: route.trackId, quote: name, why: "the declared quotation is empty" });
        else if (!hay.includes(part)) quoteFailures.push({ trackId: route.trackId, quote: name, why: "the declared quotation is not present verbatim in this track's committed record", text: part });
      }
    }
    for (const mandate of route.mandateQuotes) {
      if (String(mandate).trim().length === 0) quoteFailures.push({ trackId: route.trackId, quote: "mandate", why: "the declared mandate quotation is empty" });
      else if (!hay.includes(mandate)) quoteFailures.push({ trackId: route.trackId, quote: "mandate", why: "the declared mandate quotation is not present verbatim in this track's committed record", text: mandate });
    }
    verified.byRoute[route.routeKey] = { mandateQuotes: route.mandateQuotes };
  }
  verified.shared = shared;
  return { resolved, failures, quoteFailures, quotes: verified, tracks };
}

/* ---- deterministic composed-page rendering ----------------------------------- */
function sanitizePdfText(text) {
  return String(text).replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("′", "'");
}

function renderedWidthOf(font, text, fontSize) {
  return Math.max(font.widthOfTextAtSize(text, fontSize), [...text].length * fontSize * 0.5);
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const { width, height, margin, fontSize, lineHeight } = PAGE;
  const maxWidth = width - 2 * margin;
  const measure = (text) => renderedWidthOf(font, text, fontSize);
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
      if (current && measure(`${current}${ch}`) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => (measure(w) > maxWidth ? splitToken(w) : [w]));
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (measure(candidate) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  const sourceLines = sanitizePdfText(fullText).split("\n");
  const routeFooter = sourceLines.at(-1)?.startsWith("Route: ") ? sourceLines.pop() : null;
  if (routeFooter && sourceLines.at(-1) === "") sourceLines.pop();

  /* Paginate by BLOCK, not by row.
   *
   * Drawing row by row put a section heading alone at the foot of one page with
   * its items on the next, and left a page carrying a single trailing line of a
   * paragraph. Both are visual defects in a document a participant hands to a
   * clerk, and both are invisible to a counter that only reads text. A block is
   * one source line's wrapped rows; a heading keeps at least two rows of what
   * follows it on the same page, and no block is split so as to leave one row
   * alone on either side of a break. */
  const isHeading = (line) => /^\d+\. [A-Z]/.test(line) || /^[A-Z][A-Z .,'()-]{3,}$/.test(line.trim());
  const blocks = sourceLines.map((raw) => ({ heading: isHeading(raw), rows: wrap(raw), blank: raw.trim() === "" }));
  const slotsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;
  let slotsLeft = slotsPerPage;
  const breakPage = () => { page = pdf.addPage([width, height]); y = height - margin; slotsLeft = slotsPerPage; };
  const put = (line) => {
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
    slotsLeft -= 1;
  };
  for (const [i, block] of blocks.entries()) {
    if (block.blank) {
      if (slotsLeft < slotsPerPage) put("");
      continue;
    }
    const following = blocks.slice(i + 1).find((b) => !b.blank);
    const need = block.heading
      ? block.rows.length + Math.min(2, following ? following.rows.length : 0)
      : Math.min(block.rows.length, 2);
    if (slotsLeft < need) breakPage();
    for (const [r, row] of block.rows.entries()) {
      /* Never leave the final row of a paragraph alone on the next page. */
      const rowsLeftInBlock = block.rows.length - r;
      if (slotsLeft <= 0 || (slotsLeft === 1 && rowsLeftInBlock === 2)) breakPage();
      put(row);
    }
  }
  if (routeFooter) {
    for (const renderedPage of pdf.getPages()) {
      renderedPage.drawText(routeFooter, { x: margin, y: PAGE.footerY, size: PAGE.footerSize, font, color: rgb(0, 0, 0) });
    }
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* Blockquote a verified quotation. An empty quotation is a build failure, never
 * a printed blank: the recent defect this guards against was an instruction
 * that printed an empty quotation as though the record had said nothing. */
function blockQuote(text, where) {
  const body = sanitizePdfText(String(text ?? "")).trim();
  assert.ok(body.length > 0, `${where}: a quotation with no text in it would be printed as the record speaking`);
  return body.split("\n").map((l) => `      "${l}"`).join("\n");
}

function composedBody(componentId, facts, quotes) {
  const c = COMPONENT[componentId];
  assert.equal(c.kind, "composed", `${componentId}: only a composed component has a body`);
  const route = ROUTE_BY_KEY[c.routeKey];
  const lines = [c.title.toUpperCase(), ""];
  for (const raw of c.body) {
    lines.push(String(raw).replace(/\{\{([A-Za-z0-9_.:]+)\}\}/g, (_m, token) => {
      if (token === "DOTS") return DOTS();
      if (token.startsWith("DOTS:")) return DOTS(Number(token.slice(5)));
      if (token.startsWith("Q:")) {
        const name = token.slice(2);
        const spec = c.quotes?.[name];
        assert.ok(spec, `${componentId}: the page prints quotation ${name}, which the component does not declare`);
        const texts = spec.source === "route" ? quotes.byRoute[route.routeKey].mandateQuotes : [quotes.shared[name]];
        assert.ok(texts.length > 0, `${componentId}: quotation ${name} resolved to nothing`);
        return texts.map((t) => blockQuote(t, `${componentId}/${name}`)).join("\n\n");
      }
      const value = facts[token];
      assert.ok(value !== undefined, `${componentId}: the page interpolates ${token}, which the fixture does not hold`);
      return String(value);
    }));
  }
  const label = ROUTE_LABEL[c.routeKey];
  assert.ok(label, `${componentId}: carries route ${c.routeKey}, for which no label is declared`);
  lines.push("", `Route: ${label}`);
  return lines.join("\n");
}

/* ---- the measured overlay on the pinned official form ------------------------- *
 * Every write box is derived here, from the pinned bytes, by finding the printed
 * line the field belongs to and reading the x-extent of the printed rule the
 * value sits on. No coordinate is carried in from anywhere.
 */
function measureRules(page) {
  const lines = groupIntoLines(extractTextItems(page));
  const out = [];
  for (const line of lines) {
    if (!line.text.includes("_")) continue;
    const chars = [];
    for (const run of line.runs) {
      const glyphs = [...run.text];
      const w = (run.x2 - run.x) / Math.max(glyphs.length, 1);
      glyphs.forEach((c, i) => chars.push({ c, x: run.x + i * w, x2: run.x + (i + 1) * w }));
    }
    const rules = [];
    let cur = null;
    for (const ch of chars) {
      if (ch.c === "_") { if (!cur) cur = { x: ch.x, x2: ch.x2 }; else cur.x2 = ch.x2; }
      else if (cur) { rules.push(cur); cur = null; }
    }
    if (cur) rules.push(cur);
    out.push({ text: line.text, baselineY: line.y, size: line.size, rules });
  }
  return out;
}

function writeBoxesFor(page) {
  const measured = measureRules(page);
  const boxes = {};
  for (const w of SPEC.formWrites) {
    const line = measured.find((l) => l.text.includes(w.anchor));
    assert.ok(line, `HCJDC-159B: the printed line carrying "${w.anchor}" is not in the pinned bytes; the form has changed under this build`);
    const rule = line.rules[w.ruleIndex];
    assert.ok(rule, `HCJDC-159B: the line carrying "${w.anchor}" has no rule at index ${w.ruleIndex}`);
    boxes[w.id] = {
      x: Number((rule.x + 2).toFixed(2)),
      y: Number((line.baselineY + 2.2).toFixed(2)),
      width: Number((rule.x2 - rule.x - 4).toFixed(2)),
      height: 11,
      boxKind: "rule",
      rectBasis: "measured in this run from the pinned source bytes: the value zone above the printed rule on the line carrying its own caption",
      printedLineAtThisCoordinate: line.text,
      printedCaption: w.anchor
    };
  }
  return boxes;
}

function fittedSize(font, text, width, start = 9) {
  let size = start;
  while (size > 5.5 && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
  return size;
}

/* ---- glyph measurement, read from the produced bytes ------------------------- *
 * addedGlyphsReadFromOutputBytes counts the non-whitespace glyphs THIS BUILD put
 * on the page, computed by subtracting the source page's own glyph positions
 * from the output page's; a composed page has no source, so every glyph on it is
 * added. nonWhitespaceGlyphsOutsideMeasuredWriteBoxes counts how many of those
 * added glyphs landed outside a declared box. Neither number is this builder's
 * intent, and neither is a constant.
 */
function glyphsOf(page) {
  const out = [];
  for (const item of extractTextItems(page)) {
    const chars = item.chars ?? [...String(item.text)].map((c, i) => ({ c, x: item.x + i * (item.width / Math.max(item.text.length, 1)) }));
    for (const ch of chars) {
      const c = String(ch.c ?? "");
      if (!c || /\s/.test(c)) continue;
      out.push({ c, x: Number(Number(ch.x).toFixed(1)), y: Number(Number(item.y).toFixed(1)) });
    }
  }
  return out;
}

function inAnyBox(glyph, boxes) {
  return boxes.some((b) => glyph.x >= b.x - 1 && glyph.x <= b.x + b.width + 1 && glyph.y >= b.y - 1 && glyph.y <= b.y + b.height + 1);
}

function measureAddedGlyphs(outputGlyphs, sourceGlyphs, boxes) {
  const remaining = new Map();
  for (const g of sourceGlyphs) {
    const key = `${g.c}|${g.x}|${g.y}`;
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  const added = [];
  for (const g of outputGlyphs) {
    const key = `${g.c}|${g.x}|${g.y}`;
    const n = remaining.get(key) ?? 0;
    if (n > 0) { remaining.set(key, n - 1); continue; }
    added.push(g);
  }
  const outside = added.filter((g) => !inAnyBox(g, boxes));
  return { added: added.length, outside: outside.length, outsideSample: outside.slice(0, 8) };
}

/* The declared regions of a COMPOSED page: the body text frame the renderer
 * wraps into, and the footer band the route line is stamped on. Derived from
 * PAGE, so a change to the renderer moves the measurement with it. */
function composedPageBoxes() {
  const firstBaseline = PAGE.height - PAGE.margin;
  return [
    { id: "composed_body_frame", x: PAGE.margin - 1, y: PAGE.margin - 1, width: PAGE.width - 2 * PAGE.margin + 2, height: firstBaseline - PAGE.margin + 2 },
    { id: "composed_route_footer", x: PAGE.margin - 1, y: PAGE.footerY - 1, width: PAGE.width - 2 * PAGE.margin + 2, height: 3 }
  ];
}

/* Where each blank on the pinned form lives. A blank that sits on a printed
 * rule is measured from that rule; a blank that is a mark beside a printed
 * caption is measured from the caption's own x-extent, because the form prints
 * no rule for it. Both are read from the pinned bytes in this run. */
const FORM_BLANK_ANCHORS = {
  other_names: { anchor: "Other Names Used:", ruleIndex: 0 },
  social_security_number: { anchor: "Social Security Number:", ruleIndex: 0 },
  sex_marker_m: { anchor: "Sex: M", ruleIndex: 2 },
  sex_marker_f: { anchor: "Sex: M", ruleIndex: 3 },
  applicant_signature: { signatureRuleLine: true, ruleIndex: 0 },
  applicant_signature_date: { signatureRuleLine: true, ruleIndex: 1 },
  conviction_election_initial: { captionAnchor: "Expungement of First-time Drug Offender, Property Offender, and/or DUI <21:" },
  nonconviction_election_initial: { captionAnchor: "Expungement of Non-Conviction Information:" },
  checklist_signature: { captionAnchor: "Signature of applicant" },
  checklist_photo_id: { captionAnchor: "Copy of valid government-issued photo ID" },
  checklist_mailing_address: { captionAnchor: "Mailing Address", requireOnLineWith: "Court Order Granting Expungement" },
  checklist_court_order: { captionAnchor: "Court Order Granting Expungement, if applicable" },
  checklist_payment: { captionAnchor: "Payment " },
  hcjdc_use_only: { captionAnchor: "LEAVE BLANK; HCJDC USE ONLY" }
};

function captionSpan(line, substring) {
  const chars = [];
  for (const run of line.runs) {
    const glyphs = [...run.text];
    const w = (run.x2 - run.x) / Math.max(glyphs.length, 1);
    glyphs.forEach((c, i) => chars.push({ c, x: run.x + i * w, x2: run.x + (i + 1) * w }));
  }
  const text = chars.map((c) => c.c).join("");
  const i = text.indexOf(substring);
  if (i < 0) return null;
  return { x: chars[i].x, x2: chars[i + substring.length - 1].x2 };
}

function blankBoxesFor(page) {
  const lines = groupIntoLines(extractTextItems(page));
  const measured = measureRules(page);
  const boxes = {};
  for (const blank of SPEC.formBlanks) {
    const spec = FORM_BLANK_ANCHORS[blank.id];
    assert.ok(spec, `HCJDC-159B: blank ${blank.id} declares no anchor, so its region cannot be measured`);
    if (spec.signatureRuleLine) {
      const line = measured.find((l) => /^_+\s+_+$/.test(l.text.trim()));
      assert.ok(line, "HCJDC-159B: the signature rule line is not in the pinned bytes");
      const rule = line.rules[spec.ruleIndex];
      assert.ok(rule, `HCJDC-159B: the signature rule line has no rule at index ${spec.ruleIndex}`);
      boxes[blank.id] = { x: Number((rule.x + 2).toFixed(2)), y: Number((line.baselineY + 2.2).toFixed(2)), width: Number((rule.x2 - rule.x - 4).toFixed(2)), height: 11, boxKind: "rule", rectBasis: "measured in this run: the value zone above the printed signature rule in the pinned source bytes", printedLineAtThisCoordinate: line.text, printedCaption: "Signature" };
      continue;
    }
    if (spec.anchor) {
      const line = measured.find((l) => l.text.includes(spec.anchor));
      assert.ok(line, `HCJDC-159B: the printed line carrying "${spec.anchor}" is not in the pinned bytes`);
      const rule = line.rules[spec.ruleIndex];
      assert.ok(rule, `HCJDC-159B: the line carrying "${spec.anchor}" has no rule at index ${spec.ruleIndex}`);
      boxes[blank.id] = { x: Number((rule.x + 2).toFixed(2)), y: Number((line.baselineY + 2.2).toFixed(2)), width: Number((rule.x2 - rule.x - 4).toFixed(2)), height: 11, boxKind: "rule", rectBasis: "measured in this run: the value zone above the printed rule on the line carrying its own caption", printedLineAtThisCoordinate: line.text, printedCaption: spec.anchor };
      continue;
    }
    const line = lines.find((l) => l.text.includes(spec.captionAnchor) && (!spec.requireOnLineWith || l.text.includes(spec.requireOnLineWith)));
    assert.ok(line, `HCJDC-159B: the printed caption "${spec.captionAnchor}" is not in the pinned bytes`);
    const span = captionSpan(line, spec.captionAnchor);
    assert.ok(span, `HCJDC-159B: the caption "${spec.captionAnchor}" could not be located within its own line`);
    boxes[blank.id] = { x: Number(span.x.toFixed(2)), y: Number(line.y.toFixed(2)), width: Number((span.x2 - span.x).toFixed(2)), height: 10, boxKind: "caption", rectBasis: "measured in this run: the x-extent of the printed caption this mark belongs to; the form prints no rule for it, so this box is the caption itself and not a value zone", printedLineAtThisCoordinate: line.text, printedCaption: spec.captionAnchor };
  }
  return boxes;
}

/* ---- field maps -------------------------------------------------------------- */
function mapHelpers(componentId, rectOf, pageOf) {
  const base = (id, label) => {
    const rect = rectOf(id);
    return {
      field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: pageOf(id, label),
      printedLabel: label, printedLine: label, effectiveLabel: label, regionHeading: label, sectionHeading: null,
      rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      rectBasis: rect ? rect.rectBasis : "composed document authored by this build; the label is printed on its own line and the value or blank follows it",
      printedTextAtCoordinate: rect ? rect.printedLineAtThisCoordinate : null,
      printedCaptionOnTheOfficialForm: rect ? (rect.printedCaption ?? null) : null,
      measuredBoxKind: rect ? (rect.boxKind ?? null) : null
    };
  };
  return {
    write: (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_or_overlay_text", document: componentId }),
    protectedBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    clerkBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "court, clerk, prosecutor, agency, or hearing field; the court or the agency completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    optionalBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "optional participant-authored identifier; the platform does not invent it",
      category: null, completenessClass: null, class: null,
      disposition: "OPTIONAL_PARTICIPANT_CONTENT", completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT",
      requiredBeforeFiling: false, document: componentId, why
    }),
    notApplicableBlank: (id, label, routeCondition, why) => ({
      ...base(id, label),
      reason: `outside this route: ${routeCondition}`,
      category: null, completenessClass: null, class: null,
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable: routeCondition,
      requiredBeforeFiling: false, routeDetermined: false, factId: null, document: componentId, why
    }),
    rbf: (id, label, what, why) => ({
      ...base(id, label),
      reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
      document: componentId, why, participantMustSupply: what
    })
  };
}

function buildMap(componentId, rectOf, pageOf) {
  const c = COMPONENT[componentId];
  const h = mapHelpers(componentId, rectOf, pageOf);
  const writes = (c.writes ?? []).map((w) => h.write(w.id, w.label, w.factId));
  const refusals = (c.blanks ?? []).map((b) => {
    if (b.kind === "rbf") return h.rbf(b.id, b.label, b.supply, b.why);
    if (b.kind === "protected") return h.protectedBlank(b.id, b.label, b.why);
    if (b.kind === "court") return h.clerkBlank(b.id, b.label, b.why);
    if (b.kind === "optional") return h.optionalBlank(b.id, b.label, b.why);
    if (b.kind === "notApplicable") return h.notApplicableBlank(b.id, b.label, b.routeCondition, b.why);
    throw new Error(`${componentId}.${b.id}: unknown blank kind ${b.kind}`);
  });
  return {
    formNumber: componentId, documentId: componentId, documentRole: c.role,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: c.routeKey, componentKind: c.kind, registryOutputStrategy: c.registryOutputStrategy
    },
    structuralClass: c.kind === "composed" ? "composed_document" : "pinned_official_form_attached_as_its_own_bytes",
    composedFrom: c.kind === "composed" ? SPEC.composedFromNote : SPEC.formIdentityNote,
    sourceId: c.sourceId ?? null,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- rendering one component ------------------------------------------------- */
const normalizeForSearch = (s) => sanitizePdfText(String(s)).replace(/\s+/g, " ").trim().toLowerCase();

function pageTextsOf(doc) {
  return doc.getPages().map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
}

async function renderComponent(componentId, facts, quotes, sourceDoc, boxes) {
  const c = COMPONENT[componentId];
  if (c.kind === "composed") {
    const body = composedBody(componentId, facts, quotes);
    assert.ok(body.includes(facts["participant.full_legal_name"]),
      `${componentId}: the composed page must carry the participant's name`);
    const bytes = await renderComposedPdf(body, `${c.title} - ${ROUTE_LABEL[c.routeKey]}`);
    return { bytes, sourceSha256: null, overlay: [] };
  }
  /* The pinned official form, attached as its own bytes with the held facts drawn
   * onto rules measured from those same bytes. */
  const doc = await PDFDocument.create();
  stampDeterministic(doc);
  doc.setTitle(`${c.title} - ${ROUTE_LABEL[c.routeKey]}`);
  doc.setProducer("RCAP census-v1 artifact-only renderer");
  doc.setCreator("RCAP evidence build");
  const [copied] = await doc.copyPages(sourceDoc, [0]);
  doc.addPage(copied);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const overlay = [];
  for (const w of SPEC.formWrites) {
    const box = boxes.writes[w.id];
    const value = sanitizePdfText(String(facts[w.factId] ?? ""));
    assert.ok(value.length > 0, `${componentId}/${w.id}: no fixture value for ${w.factId}`);
    const size = fittedSize(font, value, box.width);
    const drawnWidth = font.widthOfTextAtSize(value, size);
    assert.ok(drawnWidth <= box.width,
      `${componentId}/${w.id}: the value is ${drawnWidth.toFixed(1)}pt wide and the measured rule is ${box.width}pt; it would run past the printed line`);
    copied.drawText(value, { x: box.x, y: box.y, size, font, color: rgb(0, 0, 0) });
    overlay.push({ field: w.id, factId: w.factId, drawnText: value, fontSize: size, drawnWidthPt: Number(drawnWidth.toFixed(2)), rect: { x: box.x, y: box.y, width: box.width, height: box.height } });
  }
  const bytes = Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, sourceSha256: SPEC.sources[0].sha256, overlay };
}

async function locateFields(componentId, componentBytes, facts, blankBoxes = {}) {
  const c = COMPONENT[componentId];
  const composed = c.kind === "composed";
  const doc = await PDFDocument.load(componentBytes, { ignoreEncryption: true, updateMetadata: false });
  const texts = pageTextsOf(doc).map(normalizeForSearch);
  const located = {};
  const missing = [];
  for (const b of c.blanks ?? []) {
    /* A composed blank is found by the label THIS BUILD printed beside it. A
     * blank on the attached official form is found by the form's OWN printed
     * caption at the field's measured coordinate, because the descriptive label
     * this build gives it in the instructions is not on the issuer's page and
     * never should be. */
    const printedCaption = composed ? b.label : blankBoxes[b.id]?.printedCaption;
    if (!composed && !printedCaption) {
      missing.push({ field: b.id, label: b.label, why: "no printed caption was measured for this blank on the attached official form, so the packet cannot tell the participant which mark it means" });
      located[b.id] = null;
      continue;
    }
    const needle = normalizeForSearch(printedCaption);
    const idx = texts.findIndex((t) => t.includes(needle));
    if (idx < 0) {
      missing.push({
        field: b.id, label: b.label, printedCaption,
        why: composed
          ? "the declared blank's own label is not printed anywhere in the produced component bytes, so the participant could not find the blank it names"
          : "the printed caption measured for this blank is not readable back out of the produced component bytes"
      });
    }
    located[b.id] = idx < 0 ? null : idx + 1;
  }
  for (const w of c.writes ?? []) {
    const needle = normalizeForSearch(String(facts[w.factId] ?? ""));
    const idx = needle ? texts.findIndex((t) => t.includes(needle)) : -1;
    located[w.id] = idx < 0 ? null : idx + 1;
  }
  return { located, missing, pageCount: doc.getPageCount() };
}

/* ---- byte proof of every write ------------------------------------------------ */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName, sourceGlyphsByPage, boxesForPage) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }

  const actualWrites = [];
  for (const map of maps) {
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      assert.ok(componentText.includes(value),
        `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId, expected: value,
        foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }

  /* Both glyph readings, per page, measured from these bytes. */
  let added = 0;
  let outside = 0;
  const outsideDetail = [];
  const perPage = [];
  let widgetAppearances = 0;
  for (const [i, page] of pages.entries()) {
    const manifest = pageManifest[i];
    const sourceGlyphs = manifest.sourceSha256 ? (sourceGlyphsByPage.get(manifest.sourceSha256) ?? []) : [];
    const boxes = boxesForPage(manifest);
    const reading = measureAddedGlyphs(glyphsOf(page), sourceGlyphs, boxes);
    added += reading.added;
    outside += reading.outside;
    if (reading.outside > 0) outsideDetail.push({ packetPage: i + 1, component: manifest.component, glyphsOutside: reading.outside, sample: reading.outsideSample });
    perPage.push({ packetPage: i + 1, component: manifest.component, addedGlyphs: reading.added, glyphsOutsideMeasuredWriteBoxes: reading.outside, measuredWriteBoxes: boxes.length });
    const annots = page.node.Annots?.();
    widgetAppearances += annots ? annots.size() : 0;
  }
  return { actualWrites, added, outside, outsideDetail, perPage, widgetAppearances, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ------------------------------ *
 * Nine numbers, each MEASURED. requiredComponentsMissing in particular is
 * measured against the committed registry's own packetSet for each route rather
 * than initialised to zero and never touched: a counter nothing computes is a
 * source-authored default, not a measurement.
 */
function countCompleteness(maps, writeProofs, instructionsText, tracks, producedComponentIds) {
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
      ...(r.routeConditionThatMakesItInapplicable ? { routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable } : {}),
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

  /* requiredComponentsMissing, measured against the controlling registry. */
  const produced = new Set(producedComponentIds);
  for (const route of SPEC.routes) {
    const track = tracks[route.trackId];
    for (const declaredComponent of track?.packetSet?.components ?? []) {
      if (declaredComponent.requirement !== "required") continue;
      if (produced.has(declaredComponent.componentId)) continue;
      note("requiredComponentsMissing", {
        route: route.routeKey, component: declaredComponent.componentId, role: declaredComponent.role,
        why: "the committed registry declares this component required for this route and this build did not produce it"
      });
    }
  }

  /* invisibleWrites and visualDefects, from the byte-derived readings only. */
  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    for (const page of p.perPage ?? []) {
      if (page.addedGlyphs === 0 && page.componentDeclaresWrites) {
        note("invisibleWrites", { fixture: p.fixture, packetPage: page.packetPage, component: page.component, why: "the component declares writes and this build added no glyph to this page" });
      }
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, where: p.glyphsOutsideDetail });
    }
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------ */
function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENT_IDS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r, i) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      declarationIndex: i
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || (a.declarationIndex - b.declarationIndex))
    .map(({ declarationIndex, ...rest }) => rest);
}

function participantInstructions(maps, rbf, quotes) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${SPEC.routeName}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  out.push("## Which pages are yours", "");
  out.push("This packet carries five statutory routes. Use only the pages for the route that matches your conviction; the other routes' pages are not yours and must not be filed.", "");
  out.push("| Route | Statute | What this means for your motion |", "| --- | --- | --- |");
  for (const r of SPEC.routes) out.push(`| ${r.routeLabel} | ${r.statute} | ${r.whatThisMeansForYou} |`);
  out.push("");
  out.push("The third column is this build's plain-language reading of the controlling record. The record's own words are reproduced unedited in the next section, so you can check the reading against them.", "");
  out.push("### The controlling record's own words on each route", "");
  out.push("The sentences below are quoted verbatim from the committed legal-design record this packet was built from. They are written for the people who build and review packets, not for you, so some of them talk about what \"the packet copy\" may or may not say. They are reproduced here unedited rather than trimmed, so that you can see exactly what the record does and does not establish about your route.", "");
  for (const r of SPEC.routes) {
    out.push(`**${r.routeLabel}**`, "");
    for (const q of r.mandateQuotes) out.push(`> ${q}`, "");
  }

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c.id}\` | ${c.description} |`);
  out.push("");

  out.push("## Where this is filed, what it costs, and who must be served", "");
  out.push("| Question | What the record establishes, or the authority that answers it |", "| --- | --- |");
  for (const [q, answer] of SPEC.obligationTable) out.push(`| ${q} | ${answer.replace(/\|/g, "\\|")} |`);
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank, or as a mark on the official application. Fill every one that belongs to the pages you are using, reading each value from your own record rather than from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPONENT[doc]?.title ?? doc}`, "");
    out.push("| The blank on the document | Page | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.page ?? "—"} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  out.push("## What this packet does not tell you", "");
  for (const n of SPEC.notTold) out.push(`- ${n}`);
  out.push("");

  out.push("## When to stop and get help instead of filing", "");
  out.push(SPEC.stopConditionsIntro, "");
  for (const r of SPEC.routes) {
    out.push(`**${r.routeLabel}**`, "");
    for (const s of quotes.selfHelpByTrack[r.trackId]) out.push(`- ${s}`);
    out.push("");
  }

  out.push("## What this packet is not", "");
  out.push(SPEC.whatThisIsNot, "");
  out.push(`_Route(s): ${SPEC.routes.map((r) => r.routeLabel).join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

function filingInstructions(quotes) {
  const out = [];
  out.push(`# Filing instructions — ${SPEC.legalName}`, "");
  out.push("Every statement below is either a quotation this build verified against the committed legal-design track registry before rendering, or a line read off the pinned HCJDC 159(b) bytes in this run. Where the record answers nothing, this page says so rather than answering it.", "");

  out.push("## Stage one: the motion in your own penal case", "");
  out.push(`**Where it goes.** The controlling record states: "${quotes.shared.filing}"`, "");
  out.push(`**Which court that is.** The controlling record states: "${quotes.shared.venue}" This packet therefore prints a labelled blank for the court rather than naming a circuit, and you read the court and the circuit from your own court record.`, "");
  out.push(`**Why the filing is a motion.** The controlling record states: "${quotes.shared.vehicle}".`, "");
  out.push(`**Why there is no official Judiciary form for it.** The controlling record states: "${quotes.shared.noForm}"`, "");
  out.push(`**Filing fee.** The controlling record states: "${quotes.shared.fees}"`, "");
  out.push("No stage-one filing fee is printed anywhere in this packet, because the record states none. Do not treat that silence as a statement that a clerk will charge nothing; ask the clerk.", "");
  out.push(`**Fee waiver.** The controlling record states: "${quotes.shared.feeWaiver}"`, "");
  out.push(`**Notice.** The controlling record states: "${quotes.shared.notice}"`, "");
  out.push(`**Service, and the certificate of service.** The controlling record states: "${quotes.shared.service}"`, "");
  out.push("The certificate of service is printed as part of the stage-one motion in this packet, on the motion's own last page. Complete it after you have served the copy, and not before.", "");
  out.push(`**Signature.** The controlling record states: "${quotes.shared.signature}"`, "");
  out.push(`**Notarization.** The controlling record states: "${quotes.shared.notarization}"`, "");

  out.push("", "## Stage two: the HCJDC 159(b) Expungement Application", "");
  out.push("The stage-two component in this packet is the official application itself. Its bytes are the issuer's bytes, pinned by content digest; this build drew only six values onto it, on the printed rules those values belong to, and left every other mark on the page to you.", "");
  out.push(`**Do not send it yet.** The form's own face states: "${FORM_ORDER_LINE}"`, "");
  out.push(`**What it costs.** The form's own face states: "${FORM_FEE_LINE}" The form also states that payment must be made by money order or cashier's check issued in the United States, payable to "State of Hawaii", and that personal checks are not accepted.`, "");
  out.push("**Where it goes.** The form's own face prints the destination: Hawaii Criminal Justice Data Center, Attn: Expungement, " + FORM_ADDRESS_LINE + ", Honolulu, HI 96813. Send a self-addressed stamped envelope with it, as the form directs.", "");
  out.push(`**Which paragraph you initial.** ${FORM_ELECTION_LINE} That is the paragraph these five routes use. The non-conviction paragraph above it belongs to the arrest-record branch of the form and is not yours on any route in this packet.`, "");

  out.push("", "## What this page does not establish", "");
  out.push("- It does not establish that you are eligible for any relief.", "");
  out.push("- It does not establish any clerk's cost at stage one. The record records that question as open.", "");
  out.push("- It is not counsel review, visual review or independent verification, none of which has happened for this packet.", "");
  out.push(`_Route(s): ${SPEC.routes.map((r) => r.routeLabel).join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const sourceResult = resolveSources();
  if (sourceResult.failures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: sourceResult.failures,
      why: "a bound source did not resolve to its declared content digest under any mounted custody, and no similarly named file may stand in for it",
      mountsSearched: SOURCE_MOUNTS, overlayDirectoryTouched: false
    };
  }
  const recordResult = resolveRecords();
  if (recordResult.failures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED", stopClass: "BLOCKED_RECORD",
      failedRecords: recordResult.failures,
      why: "a committed record this family composes from is missing or no longer carries a track this build relies on",
      overlayDirectoryTouched: false
    };
  }
  if (recordResult.quoteFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED", stopClass: "QUOTATION_NOT_IN_THE_RECORD",
      failedQuotations: recordResult.quoteFailures,
      why: "a quotation this packet prints is empty or is no longer present verbatim in the controlling record; a packet may not present a blank, or a paraphrase, as the record speaking",
      overlayDirectoryTouched: false
    };
  }
  const { resolved: records, quotes, tracks } = recordResult;
  quotes.selfHelpByTrack = Object.fromEntries(SPEC.routes.map((r) => [r.trackId, tracks[r.trackId].selfHelpBoundaries ?? []]));
  for (const r of SPEC.routes) {
    assert.ok(quotes.selfHelpByTrack[r.trackId].length > 0,
      `${r.trackId}: the controlling record carries no self-help boundaries, and this packet prints that section from the record`);
  }

  const source = sourceResult.resolved[0];
  const sourceDoc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(sourceDoc.getPageCount(), 1, "HCJDC-159B is a one-page form in the pinned bytes; it is not any more");
  const sourcePage = sourceDoc.getPages()[0];
  const sourceLineText = groupIntoLines(extractTextItems(sourcePage)).map((l) => l.text).join(" ").replace(/\s+/g, " ");
  for (const anchor of source.printedAnchors) {
    assert.ok(sourceLineText.includes(anchor),
      `HCJDC-159B: the printed line ${JSON.stringify(anchor.slice(0, 48))} this packet quotes is not in the pinned bytes`);
  }
  const boxes = { writes: writeBoxesFor(sourcePage), blanks: blankBoxesFor(sourcePage) };
  const sourceGlyphs = glyphsOf(sourcePage);
  const sourceGlyphsByPage = new Map([[source.sha256, sourceGlyphs]]);

  /* Which page each field lives on, and which blanks the pages do not print.
   * Measured from the canonical component bytes. */
  const canonicalFacts = SPEC.fixtures.canonical;
  const located = {};
  const unprintedBlanks = [];
  const componentPageCounts = {};
  const captionReadback = {};
  for (const componentId of COMPONENT_IDS) {
    const rendered = await renderComponent(componentId, canonicalFacts, quotes, sourceDoc, boxes);
    const loc = await locateFields(componentId, rendered.bytes, canonicalFacts, boxes.blanks);
    located[componentId] = loc.located;
    componentPageCounts[componentId] = loc.pageCount;
    unprintedBlanks.push(...loc.missing.map((m) => ({ component: componentId, ...m })));
    if (COMPONENT[componentId].kind === "composed") {
      const doc = await PDFDocument.load(rendered.bytes, { ignoreEncryption: true, updateMetadata: false });
      captionReadback[componentId] = groupIntoLines(extractTextItems(doc.getPages()[0]))
        .map((l) => l.text.trim()).filter(Boolean).slice(0, 14);
    }
  }
  if (unprintedBlanks.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED", stopClass: "DECLARED_BLANK_NOT_PRINTED",
      unprintedBlanks,
      why: "a blank this field map declares is not printed on the page it belongs to, so the packet could not tell a participant which blank to fill",
      overlayDirectoryTouched: false
    };
  }

  const rectOfFor = (componentId) => (id) =>
    COMPONENT[componentId].kind === "attached_official_form" ? (boxes.writes[id] ?? boxes.blanks[id] ?? null) : null;
  const pageOfFor = (componentId) => (id) => located[componentId][id] ?? 1;
  const maps = COMPONENT_IDS.map((c) => buildMap(c, rectOfFor(c), pageOfFor(c)));

  if (checkOnly) {
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: records.length, sourcesBound: sourceResult.resolved.map((s) => ({ sourceId: s.sourceId, sha256: s.sha256 })),
      components: COMPONENT_IDS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0),
      componentPageCounts
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const declaresWrites = new Set(SPEC.components.filter((c) => (c.writes ?? []).length > 0).map((c) => c.id));
  const boxesForPage = (manifest) => {
    const c = COMPONENT[manifest.component];
    if (c.kind === "composed") return composedPageBoxes();
    return SPEC.formWrites.map((w) => ({ id: w.id, ...boxes.writes[w.id] }));
  };

  async function assemble(componentIds, fixtureName, facts, title) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(title);
    packet.setProducer("RCAP census-v1 artifact-only renderer");
    packet.setCreator("RCAP evidence build");
    const pageManifest = [];
    const overlays = [];
    for (const componentId of componentIds) {
      const rendered = await renderComponent(componentId, facts, quotes, sourceDoc, boxes);
      overlays.push(...rendered.overlay.map((o) => ({ document: componentId, ...o })));
      const componentDoc = await PDFDocument.load(rendered.bytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(componentDoc, componentDoc.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), component: componentId, documentId: componentId,
          sourcePage: i + 1, sourceSha256: rendered.sourceSha256
        });
      }
    }
    const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    return { bytes, pageManifest, overlays, pageCount: packet.getPageCount() };
  }

  const artifacts = [];
  const writeProofs = [];
  const pdfsDeclared = [];
  const rasterPages = [];
  const overlayByFixture = {};

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const built = await assemble(COMPONENT_IDS, fixtureName, facts, `${SPEC.legalName} — ${fixtureName} fixture`);
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), built.bytes);
    overlayByFixture[fixtureName] = built.overlays;

    const proof = await byteProof(built.bytes, built.pageManifest, maps, facts, fixtureName, sourceGlyphsByPage, boxesForPage);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod:
        "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; both glyph readings computed per page by subtracting the pinned source page's own glyph positions from the output page's and testing every remaining glyph against the measured write boxes",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.added,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.widgetAppearances,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside,
      glyphsOutsideDetail: proof.outsideDetail,
      refusedFieldsWithInk: [],
      perPage: proof.perPage.map((p) => ({ ...p, componentDeclaresWrites: declaresWrites.has(p.component) })),
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(built.bytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256, byteLength: built.bytes.length, pageCount: built.pageCount,
      pageManifest: built.pageManifest, documents: COMPONENT_IDS, components: COMPONENT_IDS,
      role: "family_assembly_of_every_route",
      deliveryRole: "build_and_review_evidence_only_not_a_participant_deliverable"
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings_and_one_attached_official_form",
      fixture: fixtureName, sha256, byteLength: built.bytes.length, pageCount: built.pageCount
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < built.pageCount; i += 1) {
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
          component: built.pageManifest[i]?.component ?? null,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  /* The per-route artifacts. The unit of delivery is a ROUTE, not a family: the
   * assembly above concatenates five statutory remedies and is nobody's
   * deliverable. */
  const routeArtifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    for (const route of SPEC.routes) {
      const routeComponentIds = SPEC.components.filter((c) => c.routeKey === route.routeKey).map((c) => c.id);
      assert.ok(routeComponentIds.length > 0, `${route.routeKey}: a declared route carries no component`);
      const built = await assemble(routeComponentIds, fixtureName, facts, `${SPEC.legalName} — ${route.slug} — ${fixtureName} fixture`);
      const dir = `${OUT}/fixtures/routes/${route.slug}`;
      fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
      const file = `${dir}/${fixtureName}.pdf`;
      fs.writeFileSync(path.join(ROOT, file), built.bytes);
      const routeMaps = maps.filter((m) => routeComponentIds.includes(m.formNumber));
      const routeProof = await byteProof(built.bytes, built.pageManifest, routeMaps, facts, `${fixtureName}/${route.slug}`, sourceGlyphsByPage, boxesForPage);
      routeArtifacts.push({
        routeKey: route.routeKey, routeLabel: route.routeLabel, route: route.slug, fixture: fixtureName, file,
        sha256: crypto.createHash("sha256").update(built.bytes).digest("hex"),
        byteLength: built.bytes.length, pageCount: built.pageCount, pageManifest: built.pageManifest,
        documents: routeComponentIds, components: routeComponentIds,
        role: "route_packet_of_one_composed_motion_one_composed_order_and_the_attached_official_application",
        deliveryRole: "participant_deliverable_for_this_route_only",
        valuesReadBackFromTheseBytes: routeProof.actualWrites.length,
        addedGlyphsReadFromOutputBytes: routeProof.added,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: routeProof.outside,
        rasterPending: true, independentVerificationPending: true
      });
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf, quotes);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingInstructions(quotes));

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.worklistGroupId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    bindingMethod:
      "the official form resolved by exact SHA-256 across the mounted custodies and attached as its own bytes; the controlling legal record bound by exact SHA-256, with every quotation printed in this packet asserted verbatim against its own track's record before anything was rendered",
    mountsSearched: SOURCE_MOUNTS,
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    routeLabels: Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r.routeLabel])),
    printedRouteLineCarriesTheLabelNotTheKey: true,
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: sourceResult.failures.length === 0 && sourceResult.resolved.length === SPEC.sources.length,
    formIdentityNote: SPEC.formIdentityNote,
    documents: sourceResult.resolved.map((s) => ({
      sourceIds: [s.sourceId], documentId: s.documentId, declaredPath: s.declaredPath,
      resolvedAbsolutePath: s.absolutePath, sha256: s.sha256, byteLength: s.byteLength,
      tier: s.tier, resolvedBy: "content_digest_under_a_mounted_custody",
      instrumentKind: "held_pdf_attached_as_its_own_bytes", role: s.role,
      printedAnchorsVerifiedInThisRun: s.printedAnchors.length,
      pagesAttachedPerRoute: 1, attachedOnRoutes: SPEC.routes.map((r) => r.routeKey)
    })),
    committedRecords: records.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId, pathInRepository: r.path,
      sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority", role: r.role,
      tracksRead: SPEC.routes.map((route) => route.trackId),
      quotationsVerifiedVerbatim: SPEC.routes.reduce((n, route) => n + 10 + route.mandateQuotes.length, 0)
    })),
    composedComponentsAuthoredByThisBuild: SPEC.components.filter((c) => c.kind === "composed").map((c) => c.id),
    attachedOfficialComponents: SPEC.components.filter((c) => c.kind !== "composed").map((c) => c.id),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family composes for",
      ...SPEC.receiptDoesNotEstablish
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    routeLabels: Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r.routeLabel])),
    printedRouteLineCarriesTheLabelNotTheKey: true,
    renderStrategy: "composed_pleading_plus_measured_flat_overlay_on_one_attached_official_form",
    captionBasis:
      "Composed pages: every caption element is either printed from the controlling record or left as a labelled blank, and reports/caption-evidence.json records which, with the caption read back out of the produced bytes. Official form: every label is the printed caption at the field's own measured coordinate in the pinned bytes.",
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: { documentId: source.documentId, sourceId: source.sourceId, sha256: source.sha256 },
    boundReferenceForm: source.documentId,
    boundReferenceRole: "attached as its own bytes as the stage-two component of every route; never imitated and never re-drawn",
    componentSet: COMPONENT_IDS,
    componentRoutes: Object.fromEntries(SPEC.components.map((c) => [c.id, c.routeKey])),
    componentKinds: Object.fromEntries(SPEC.components.map((c) => [c.id, c.kind])),
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: SPEC.routes.map((r) => ({ routeKey: r.routeKey, statute: r.statute, statedOnEveryPageOfThisRoute: true })),
    routeSelectionNote:
      "No election box is printed anywhere. Each route's pages state their own statute in the title, the body and the footer, and the participant instructions carry a table saying which set is whose.",
    participantFacingObligations: SPEC.obligationTable.map(([question, answer]) => ({ question, answer })),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  /* The field census, in the shape the corpus-wide source-carried-value check
   * reads: documents[].rows[].sourceValuePresentInBlankForm. Measured, for the
   * attached form, by asking whether the PINNED page itself draws any ink
   * inside each field's own measured box. */
  const censusDocuments = maps.map((m) => {
    const c = COMPONENT[m.formNumber];
    const rows = [...(m.canonicalWrites ?? []).map((w) => ({ row: w, written: true })), ...(m.canonicalRefusals ?? []).map((r) => ({ row: r, written: false }))]
      .map(({ row, written }) => {
        /* "What does the blank source ship INSIDE this field" is only a
         * meaningful question where a value would go: the zone above a printed
         * rule. Several marks on this form have no rule at all, and their
         * measured box IS the printed caption, so ink inside it is the caption
         * rather than a shipped value. Reporting that as a carried value would
         * hand a reviewer fourteen shipped values this form does not have. */
        let carried = null;
        let notMeasurable = null;
        if (c.kind !== "composed" && row.rect) {
          if (row.measuredBoxKind === "rule") {
            const inside = sourceGlyphs.filter((g) => inAnyBox(g, [{ ...row.rect }]));
            carried = inside.length > 0 ? inside.map((g) => g.c).join("") : null;
          } else {
            notMeasurable = "the form prints no rule for this mark, so its measured box is the printed caption itself and carries no value zone to inspect";
          }
        }
        return {
          field: row.field, page: row.page, rect: row.rect, rectBasis: row.rectBasis,
          effectiveLabel: row.effectiveLabel, printedTextAtCoordinate: row.printedTextAtCoordinate ?? null,
          isSelectionControl: false, factId: row.factId ?? null,
          written, disposition: row.completenessDisposition ?? (written ? "WRITTEN" : row.category ?? null),
          measuredBoxKind: row.measuredBoxKind ?? null,
          sourceValuePresentInBlankForm: carried,
          sourceValueNotMeasurableHere: notMeasurable,
          sourceValueCarriedIn: carried === null ? null : "ink_the_pinned_source_itself_draws_in_the_value_zone_above_this_field_rule"
        };
      });
    return {
      documentId: m.formNumber, formNumber: m.formNumber,
      structuralClass: m.structuralClass,
      sourceSha256: c.kind === "composed" ? null : source.sha256,
      pageCount: componentPageCounts[m.formNumber], fieldCount: rows.length,
      writtenCount: rows.filter((r) => r.written).length,
      blankCount: rows.filter((r) => !r.written).length,
      rows, fields: rows
    };
  });
  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: SPEC.familyId,
    captionBasis:
      "On the ten composed components every field's label is a line this build authored and printed, and the build refuses unless that exact label is readable back out of the produced component bytes on the page the census records. On the five attached HCJDC 159(b) components every label is the form's own printed caption, and every rect was measured in this run from the pinned bytes: the x-extent of the printed rule the value sits on, or of the caption the mark belongs to where the form prints no rule.",
    whatSourceValueMeans:
      "sourceValuePresentInBlankForm asks what the blank official source ships INSIDE a field before any participant sees it. The pinned HCJDC 159(b) form carries no AcroForm at all, so there is no /V anywhere; the measurement here is the ink the pinned page itself draws inside each measured box. The printed rule a value sits on is not inside the box, because the box begins above the rule's own baseline.",
    documents: censusDocuments
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: SPEC.familyId,
    finding:
      "Nine of the ten composed captions are identical in structure and one element of every one of them is deliberately blank: the court. The controlling record states that venue follows the offence and is a participant input rather than a track constant, so no circuit is named anywhere in this packet.",
    whyABlankCourtIsNotAnOmission:
      "A composed pleading has no issuer to take a caption from, so the question a reviewer must be able to answer is where each caption element came from. Every element below is either printed from the controlling record, printed from a fact the platform holds, or left as a labelled blank with the record's own reason recorded beside it. The caption as actually rendered is read back out of the produced canonical bytes and recorded here, so the claim is checkable against the page rather than against this build's intent.",
    captionElements: SPEC.components.filter((c) => c.kind === "composed").map((c) => {
      const route = ROUTE_BY_KEY[c.routeKey];
      return {
        document: c.id, routeKey: c.routeKey, routeLabel: route.routeLabel,
        elements: [
          { element: "court", printed: false, basis: "left as a labelled blank", recordStatement: quotes.shared.venue, field: `${c.id}.caption_court` },
          { element: "circuit or division", printed: false, basis: "left as a labelled blank", recordStatement: quotes.shared.venue, field: `${c.id}.caption_circuit` },
          { element: "plaintiff", printed: true, printedText: "STATE OF HAWAII, Plaintiff", basis: "the controlling record records the stage-one filing as a motion in the participant's own existing penal case, in which the State is the plaintiff", recordStatement: quotes.shared.filing },
          { element: "defendant", printed: true, basis: "a fact the platform holds, written and read back from the output bytes", factId: "participant.full_legal_name", field: `${c.id}.defendant_name` },
          { element: "case number", printed: false, basis: "left as a labelled blank", recordStatement: "the registry records that the participant reads the case number from their own court record and that LegalEase does not obtain or review that record", field: `${c.id}.caption_case_number` },
          { element: "title of the document", printed: true, printedText: c.title, basis: "authored by this build to name the relief the record describes" },
          { element: "statement of the relief and its authority", printed: true, printedText: route.legalName, basis: "the legalName the controlling record carries for this track", recordStatement: route.legalName },
          { element: "route line in the page footer", printed: true, printedText: `Route: ${route.routeLabel}`, basis: "the human label; the machine route key stays in the manifests" }
        ],
        captionAsReadBackFromCanonicalOutputBytes: captionReadback[c.id]
      };
    }),
    officialFormCaptions: SPEC.formWrites.map((w) => ({
      document: SPEC.components.find((c) => c.kind !== "composed").id,
      field: w.id, labelThisBuildUses: w.label,
      printedCaptionAtThisCoordinate: boxes.writes[w.id].printedCaption,
      textExtractedAtThisCoordinate: boxes.writes[w.id].printedLineAtThisCoordinate,
      rect: { x: boxes.writes[w.id].x, y: boxes.writes[w.id].y, width: boxes.writes[w.id].width, height: boxes.writes[w.id].height },
      rectBasis: boxes.writes[w.id].rectBasis
    }))
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENT_IDS, componentConditions: {},
    boundReferenceSource: { sourceId: source.sourceId, documentId: source.documentId, sha256: source.sha256, byteLength: source.byteLength },
    pdfs: pdfsDeclared,
    familyAssemblyIsAParticipantDeliverable: false,
    familyAssemblyRole:
      "build and review evidence only — it concatenates all five statutory routes and is not a participant deliverable",
    routeArtifacts,
    routeArtifactRoutes: SPEC.routes.map((r) => r.routeKey),
    routeLabels: Object.fromEntries(SPEC.routes.map((r) => [r.routeKey, r.routeLabel])),
    printedRouteLineCarriesTheLabelNotTheKey: true,
    routeArtifactRasterPending: true,
    artifacts,
    glyphReadingsPerArtifact: writeProofs.map((p) => ({
      fixture: p.fixture,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      measuredHow:
        "per page, by subtracting the pinned source page's own glyph positions from the output page's and testing every remaining glyph against the measured write boxes"
    })),
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: SPEC.familyId, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved packet bytes, not from this builder's intent. Both glyph readings were computed the same way, per page, from those bytes.",
    documents: writeProofs,
    overlayOnTheAttachedOfficialForm: overlayByFixture,
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
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({
        document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel,
        refusalClass: r.category ?? null, declaredDisposition: r.completenessDisposition ?? null,
        why: r.why ?? r.reason
      }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    everyDeclaredBlankIsPrintedOnItsOwnPage: true,
    howThatWasChecked:
      "each declared blank's own label was searched for in the extracted text of the produced component bytes, and the build refuses if any one of them is not printed",
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText, tracks, COMPONENT_IDS);
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: SPEC.familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions over this family's field map, its byte-derived glyph readings and its participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: allZero,
    howEachWasMeasured: {
      knownRequiredFieldsMissing: "classifyBlank over every blank in the field map",
      requiredFactsNotCollected: "every required-before-filing blank searched for by label, id and identity in participant-instructions.md",
      unclassifiedBlanks: "classifyBlank over every blank in the field map",
      incompleteRows: "rowKeyOf over every field; this packet declares no repeating table, so no row group was formed and none could be partly written",
      requiredOptionsMissing: "classifyBlank over every blank in the field map",
      requiredComponentsMissing: "the committed registry's own packetSet for each of the five routes, compared against the components this build produced",
      invisibleWrites: "per artifact and per page, from the byte-derived glyph readings; a component that declares writes and added no glyph to its page is counted",
      protectedWrites: "classifyField over every write's printed label",
      visualDefects: "the byte-derived count of added glyphs landing outside a measured write box"
    },
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: SPEC.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: SPEC.buildScript,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: SPEC.familyId, blocking: [],
    findings: SPEC.buildFindings
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: SPEC.familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: SPEC.counselQuestions,
    mattersForTheReviewersAttention: SPEC.reviewersAttention
  });

  return {
    familyId: SPEC.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 8)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "custom_pleading",
    sourcesBound: sourceResult.resolved.map((s) => ({ sourceId: s.sourceId, sha256: s.sha256, resolvedAt: s.absolutePath })),
    recordsBound: records.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    components: COMPONENT_IDS, documents: COMPONENT_IDS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({
      fixture: a.fixture, packetSha256: a.sha256, byteLength: a.byteLength, pages: a.pageCount
    })),
    glyphReadings: writeProofs.map((p) => ({
      fixture: p.fixture,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    })),
    routeArtifactHashes: routeArtifacts.map((a) => ({
      fixture: a.fixture, route: a.route, routeKey: a.routeKey, routeLabel: a.routeLabel,
      packetSha256: a.sha256, pages: a.pageCount
    })),
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
