#!/usr/bin/env node
// Route-obligation census v1 — packet family `wv_conv_nonviolent_felony-set`.
//
//   node scripts/build-census-v1-wv_conv_nonviolent_felony-set.mjs [--check] [--no-raster]
//
// West Virginia, expunging a nonviolent felony conviction under
// W. Va. Code § 61-11-26(a)(2) and (b)(3). Route
// `obligation:track-pathway:WV:wv_conv_nonviolent_felony:eligible-conviction-expungement-under-w-va-code-61-11-26`.
//
// ONE FORM, THREE COMPONENTS, AND THE REASON THAT IS NOT A SHRUNK PACKET
//
// The committed packet-set manifest declares six components. Three of them —
// the primary filing, the verification and the certificate of service — all
// carry officialFormId SCA-C907, because the Supreme Court of Appeals publishes
// them as one four-page instrument: the petition on pages 1 and 2, the
// verification on page 3 and the certificate of service on page 4. The packet
// delivers that instrument whole, so all three are rendered. The remaining
// three components are process_guidance and are carried in
// participant-instructions.md, which is where guidance about serving, referral
// and filing belongs; the record's own component table is printed in the guide
// so a reader can check the six against what they received.
//
// WHAT THIS PACKET REFUSES TO DECIDE, AND WHY THAT IS MOST OF THE FORM
//
// The committed record is unusually explicit about what a build may not put on
// this petition, and it is the heart of the family: "The nonviolent
// determination and the same-transaction analysis are legal conclusions, not
// participant questions." Section 61-11-26(p)(5) defines a nonviolent felony
// partly by two express JUDICIAL FINDINGS — that the circuit court finds it
// consistent with the purposes of the article and not to involve violence or
// potential violence. A build cannot make a judicial finding, and a build that
// ticked the eligibility recital would be asserting one on a petition VERIFIED
// UNDER OATH BEFORE A NOTARY.
//
// So page 1's four eligibility recitals are left unticked. Two of them are not
// on this route at all and say so on their own printed face — they are the
// § 61-11-26a three-year branch, and this family is § 61-11-26 — and are
// declared not applicable against a named route condition. The other two are
// the § 61-11-26 single-felony and multiple-felony recitals, and which applies
// is decided by how many felonies there were and whether they arose from the
// same transaction, which the record records as a legal conclusion AND as a
// self-help stop condition. Both are disclosed to the participant with the
// record's own words beside them.
//
// EVERY FELONY HERE IS A REFERRAL TRIGGER
//
// The committed record's first stop condition is not a nuance: "Any felony
// conviction. Every West Virginia felony expungement is a referral trigger and
// the participant should have a lawyer review the petition before it is filed."
// The guide says so before it says anything about how to fill the form in.
//
// A built family is a built family. It is not verified, not approved and not
// sellable, and this builder issues no verdict on its own packets.

const FAMILY_ID = "wv_conv_nonviolent_felony-set";
const ROUTE_KEY = "obligation:track-pathway:WV:wv_conv_nonviolent_felony:eligible-conviction-expungement-under-w-va-code-61-11-26";
const PETITION = "petition";

const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const PACKET_SET_ID = "wv_conv_nonviolent_felony-set";

/*
 * SENTENCES THE COMMITTED RECORD REQUIRES THIS PACKET TO CARRY.
 *
 * The build host this family copied carries a Maine-specific gate in the other
 * direction: it asserts that a word the Maine record FORBIDS never appears in
 * the generated guide. There is no forbidden word here — "expungement" is the
 * statutory term in West Virginia and appears in the title of the form itself —
 * so that gate is not carried over, and this one is put in its place.
 *
 * Each string below is a statement the committed record makes and that a
 * participant is worse off for not being told. They are asserted over the
 * GENERATED guide before a byte of the overlay directory exists, so a later
 * edit cannot quietly drop one, and a family that loses one stops with its
 * directory untouched.
 */
const REQUIRED_PHRASES = [
  "Every West Virginia felony expungement is a referral trigger",
  "The nonviolent determination and the same-transaction analysis are legal conclusions, not participant questions",
  "A DUI conviction does not automatically block expungement",
  "$200",
  "$100",
  "none under § 61-11-26",
  "30 days"
];

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-wv_conv_nonviolent_felony-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/wv/wv-conv-nonviolent-felony-set--official-pdf-fill",
  jurisdiction: "WV",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Verified Petition to Expunge a Nonviolent Felony Conviction, W. Va. Code § 61-11-26(a)(2) and (b)(3)",
  routeName: "petitioning a West Virginia circuit court to expunge a nonviolent felony conviction under W. Va. Code § 61-11-26",
  statutes: [
    "W. Va. Code § 61-11-26(a)(2)", "W. Va. Code § 61-11-26(b)(3)", "W. Va. Code § 61-11-26(c)",
    "W. Va. Code § 61-11-26(e)", "W. Va. Code § 61-11-26(i)(3)", "W. Va. Code § 61-11-26(n)",
    "W. Va. Code § 61-11-26(p)(2)", "W. Va. Code § 61-11-26(p)(3)", "W. Va. Code § 61-11-26(p)(5)",
    "W. Va. Code § 59-1-11(a)(1)"
  ],
  routes: [{ routeKey: ROUTE_KEY }],

  records: [
    {
      recordId: "packet-set-manifest:wv_conv_nonviolent_felony-set",
      path: PACKET_SET_MANIFESTS,
      role:
        "the committed packet-set manifest for this exact packet set. Its six components and its "
        + "seventeen-item requiredBeforeFiling list are read from these bytes at build time and printed "
        + "verbatim into participant-instructions.md",
      mustContain: [
        "\"packetSetId\": \"wv_conv_nonviolent_felony-set\"",
        "\"componentId\": \"wv_conv_nonviolent_felony-primary-filing-1\"",
        "\"componentId\": \"wv_conv_nonviolent_felony-verification-2\"",
        "\"componentId\": \"wv_conv_nonviolent_felony-certificate-of-service-3\"",
        "\"componentId\": \"wv_conv_nonviolent_felony-service-package-4\"",
        "\"componentId\": \"wv_conv_nonviolent_felony-attorney-referral-notice-5\"",
        "\"componentId\": \"wv_conv_nonviolent_felony-filing-instructions-6\"",
        "The characterisation of the felony as nonviolent — SCA-C907, page 1, the eligibility recitals.",
        "The same-transaction or series-of-transactions characterisation — SCA-C907, page 1, where more than one felony is listed.",
        "Recipient street addresses, delivery-method election, and the certificate of service date and signature — SCA-C907, page 4.",
        "Circuit court case number — SCA-C907, page 1, caption block."
      ]
    },
    {
      recordId: "track-registry:wv_conv_nonviolent_felony",
      path: "data/record-clearing/legal-design-track-registry.json",
      role:
        "the committed legal-design track registry entry for this track. It settles the venue and destination "
        + "this packet states, the five-year clock and what it runs from, the filing fee and the State Police "
        + "fee, the express absence of a fee waiver, the five service recipients, the thirty-day opposition "
        + "and reply periods, the two packet instructions and the ten stop conditions the packet carries word "
        + "for word",
      mustContain: [
        "\"trackId\": \"wv_conv_nonviolent_felony\"",
        "The circuit court in which the conviction or convictions occurred.",
        "Clerk of the circuit court of the county of conviction",
        "The circuit clerk charges the § 59-1-11(a)(1) civil-action fee, which the official text sets at $200, and $100 is paid to the records division of the West Virginia State Police on grant under § 61-11-26(n).",
        "none under § 61-11-26. The $100 State Police fee is waived only on a § 61-11-26a petition.",
        "Opposing parties have 30 days from receipt to file a notice of opposition; the petitioner has 30 days after service of the opposition to reply.",
        "The petitioner serves the five § 61-11-26(e) recipients. The prosecuting attorney serves identified victims.",
        "Required on the SCA-C907 verification, page 3.",
        "A DUI conviction does not automatically block expungement of an unrelated otherwise expungeable felony if the DUI conviction is at least five years old when the petition is filed.",
        "The nonviolent determination and the same-transaction analysis are legal conclusions, not participant questions.",
        "Any felony conviction. Every West Virginia felony expungement is a referral trigger and the participant should have a lawyer review the petition before it is filed.",
        "Whether multiple felonies arose from the same transaction or series of transactions.",
        "The court sets the matter for hearing under § 61-11-26(i)(3)",
        "Any prior expungement, which likely exhausts the once-per-lifetime rule."
      ]
    },
    {
      recordId: "route-obligation-census:WV:wv_conv_nonviolent_felony",
      path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      role: "the committed route-obligation census: the exact route key this family serves",
      mustContain: [ROUTE_KEY]
    }
  ],

  officialComponents: {
    [PETITION]: {
      sourceId: "official-form:SCA-C907",
      documentId: "SCA-C907",
      formNumber: "SCA-C907",
      officialTitle: "Petition for Expungement of Felony Violations (SCA-C907), Rev. 06/04/2019",
      revision: "REV-2019-06-04",
      instrumentKind: "WV § 61-11-26 verified felony expungement petition, verification and certificate of service",
      sha256: "2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222",
      acroform: true,
      captionOnly: false,
      /*
       * THE PETITIONER'S ADDRESS, ON THE TWO STACKED LINES THE FORM PRINTS FOR
       * IT, AND THE VERIFICATION'S NAME LINE.
       *
       * `PetAdd1` and `PetAdd2` are one address block in two widgets, and BOTH
       * match the street-address descriptor - it matches `addr(ess)?\\s*(line\\s*)?\\d`
       * - so the ordinary channel would print the street line on both and
       * deliver a petition whose address has no city, state or ZIP.
       *
       * `PetitionerName2` is the verification's own name line on page 3: "I,
       * ______ after making oath or affirmation to tell the truth". A bare "2"
       * suffix on a name field is not something the descriptor list knows, and
       * a verification sworn before a notary with no name in it is not a
       * verification.
       *
       * Each is written through the finalizer's own narrativeAcrossFields
       * channel, one held fact per field and no caller text of any kind. The
       * channel resolves each fact from the same facts set as every other
       * write, runs the same protect test on the caption and the field name,
       * fits the value to that widget's own rectangle, and refuses it whole
       * rather than truncating.
       */
      narrativeLines: [
        { factId: "participant.street_address", fields: ["PetAdd1"] },
        { factId: "participant.city_state_zip", fields: ["PetAdd2"] },
        { factId: "participant.full_legal_name", fields: ["PetitionerName2"] }
      ],
      /*
       * THE THREE SIGNATURE-ADJACENT WIDGETS OF THE CERTIFICATE OF SERVICE,
       * REFUSED BY ROLE.
       *
       * `CertifyName`, `CertifyDay`, `CertifyMonth` and `CertifyYear` are the
       * opening of a certificate that a service has ALREADY HAPPENED. None of
       * them may carry a value before the papers are delivered, and the
       * committed manifest says so in its own words: "Recipient street
       * addresses, delivery-method election, and the certificate of service
       * date and signature - SCA-C907, page 4." `CertifyName` would otherwise
       * bind the petitioner's own name through the ordinary channel, which is
       * how a certificate of service gets signed by a build.
       */
      unwritable: [
        { field: "CertifyName", class: "certificate_of_service_before_service" },
        { field: "CertifyDay", class: "certificate_of_service_before_service" },
        { field: "CertifyMonth", class: "certificate_of_service_before_service" },
        { field: "CertifyYear", class: "certificate_of_service_before_service" },
        { field: "PetSocSecno", class: "government_identifier" },
        /*
         * FOUR FIELDS THAT WERE WRITTEN, WRONGLY, AND PASSED ALL NINE
         * COUNTERS BEFORE THIS BUILD READ ITS OWN OUTPUT.
         *
         * Item d on page 2 asks for the petitioner's "current name, previous
         * names, and all aliases" on two lines. Item e asks for "all of
         * petitioner's addresses from the date of offense to current" on two
         * more. The field map declared all four required-before-filing, and
         * the finalizer wrote them anyway: `PetitionersCurrentName1` and
         * `...2` match the name descriptor on a bare \bname\b, and
         * `PetitionersOffenseAddress1` and `...2` match the street-address
         * descriptor. The delivered page carried the legal name on both name
         * lines and the current street address on both address lines.
         *
         * That is not a formatting problem. Item d asks for three things and a
         * legal name alone ASSERTS there are no previous names and no aliases.
         * Item e asks for a residence history and one address written twice
         * ASSERTS the petitioner has lived at one address since the offence.
         * This petition is verified under oath before a notary under
         * § 61-11-26, and the committed record separately names the address
         * history as a manual completion item.
         *
         * The nine counters could not see it: the completeness contract reads
         * the MAP, the map said these were blanks, and the ink audit charges
         * only glyphs OUTSIDE a measured box. Diffing the delivered pages
         * against the pinned source found it.
         *
         * Role is checked first in the finalizer and is not overridable by any
         * name or caption match, which is the only refusal that holds here -
         * the map's own refusal did not. The gate below asserts the two agree
         * from now on.
         */
        { field: "PetitionersCurrentName1", class: "asks_for_more_than_the_platform_holds" },
        { field: "PetitionersCurrentName2", class: "asks_for_more_than_the_platform_holds" },
        { field: "PetitionersOffenseAddress1", class: "asks_for_more_than_the_platform_holds" },
        { field: "PetitionersOffenseAddress2", class: "asks_for_more_than_the_platform_holds" }
      ]
    }
  },

  officialCells: {},

  components: [PETITION],
  componentTitles: {
    [PETITION]: "SCA-C907 — Petition for Expungement of Felony Violations, its Verification and its Certificate of Service"
  },
  componentConditions: {},
  componentDescriptions: {
    [PETITION]:
      "the Supreme Court of Appeals' own four-page instrument, delivered exactly as it publishes it: the "
      + "petition on pages 1 and 2, the verification you swear before a notary on page 3, and the certificate "
      + "of service on page 4. Your name, address, telephone number and the county of conviction are filled "
      + "in; every fact about the conviction, every eligibility recital, and all of pages 3 and 4 are yours"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Casey Lorraine Whitmore",
      "participant.street_address": "34 Kanawha Boulevard East",
      "participant.city_state_zip": "Charleston, WV 25301",
      "participant.phone": "304-555-0142",
      "matter.county": "Kanawha"
    },
    boundary: {
      "participant.full_legal_name": "Jean-Baptiste Ouellette-Michaud III",
      "participant.street_address": "1785 Upper Buckhannon Ridge Road, Apartment 3B",
      "participant.city_state_zip": "Philippi, WV 26416-1183",
      "participant.phone": "(304) 555-0199 ext. 4417",
      "matter.county": "Pocahontas"
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "SCA-C907 is the Supreme Court of Appeals of West Virginia's own published Petition for Expungement of "
    + "Felony Violations, Rev. 06/04/2019, four pages, bound by exact SHA-256 through the committed corpus "
    + "index - resolved BY DIGEST rather than by form number or filename - and delivered as the Court issues "
    + "it, all four pages including the verification and the certificate of service. Nothing is composed, "
    + "substituted or invented. The committed manifest's three official_pdf_fill components all name this one "
    + "form because the Court publishes them as one instrument.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the instrument and by the recital this packet does NOT tick. SCA-C907 serves both "
    + "W. Va. Code § 61-11-26 and § 61-11-26a and prints four mutually exclusive eligibility recitals for "
    + "them. This family is the § 61-11-26 nonviolent-felony route, so the two § 61-11-26a recitals - the "
    + "three-year branch, which the form's own text conditions on § 61-11-26a(a)(1) or (a)(2) and on "
    + "documentation under § 61-11-26a(b) - are declared not applicable against a named route condition. The "
    + "two that remain are BOTH on this route: one for a single felony and one for multiple felonies arising "
    + "from the same transaction. Which of those two applies is not the route's to settle. The committed "
    + "record states it directly - \"The nonviolent determination and the same-transaction analysis are legal "
    + "conclusions, not participant questions\" - and § 61-11-26(p)(5) makes two of the four limbs of the "
    + "nonviolent definition express findings of the circuit court. Neither is ticked and both are disclosed.",

  routeSelectionsMade: [
    {
      selection: "statutory route",
      value: "W. Va. Code § 61-11-26, the nonviolent felony conviction route, and not § 61-11-26a",
      determinedBy:
        "the committed route-obligation census route key "
        + "obligation:track-pathway:WV:wv_conv_nonviolent_felony:eligible-conviction-expungement-under-w-va-code-61-11-26 "
        + "and the committed track registry, whose authority list is § 61-11-26 throughout and whose fee-waiver "
        + "entry distinguishes the two: \"none under § 61-11-26. The $100 State Police fee is waived only on a "
        + "§ 61-11-26a petition.\""
    },
    {
      selection: "instrument",
      value: "SCA-C907, delivered whole - petition, verification and certificate of service",
      determinedBy:
        "the committed packet-set manifest, whose three official_pdf_fill components - primary filing, "
        + "verification and certificate of service - all carry officialFormId SCA-C907"
    }
  ],

  instructionsHeading: "What to do — petitioning a West Virginia circuit court to expunge a nonviolent felony conviction under W. Va. Code § 61-11-26",

  instructionsIntro: [
    "**Have a lawyer look at this petition before you file it.** This is not a formality and it is not us being cautious. The committed record's first stop condition is: \"Any felony conviction. Every West Virginia felony expungement is a referral trigger and the participant should have a lawyer review the petition before it is filed.\"",
    "**This packet does not say your felony was nonviolent, and it will not.** Section 61-11-26(p)(5) defines a nonviolent felony partly by two things the CIRCUIT COURT has to find — that it is consistent with the purposes of the article and that it does not involve violence or potential violence to another person or the public. The committed record puts it plainly: \"The nonviolent determination and the same-transaction analysis are legal conclusions, not participant questions.\" This petition is verified under oath before a notary, and no build may swear to a legal conclusion on your behalf.",
    "The platform filled in your name, your address, your telephone number and the county of conviction. Every fact about the conviction itself — the case numbers, the charges, the dates, the sentence, the victims, the verdict — is yours to fill from the certified court records, never from memory.",
    "**A DUI conviction does not automatically block expungement of an unrelated otherwise expungeable felony if the DUI conviction is at least five years old when the petition is filed.** That is the committed record's own packet instruction and it is here because people assume the opposite."
  ],

  whoDecides: [
    "A judge of the circuit court in which the conviction occurred. The court may set the matter for hearing under § 61-11-26(i)(3), where the committed record records that it may examine law enforcement, confinement, parole, out-of-state and federal records and hear testimony.",
    "The five recipients you serve may oppose. The committed record records the timetable: \"Opposing parties have 30 days from receipt to file a notice of opposition; the petitioner has 30 days after service of the opposition to reply. Form SCA-C912 is the victim's notice of opposition and is filed by the victim.\" SCA-C912 is not in this packet because it is not yours to file.",
    "The prosecuting attorney serves identified victims. You do not.",
    "The five-year clock runs from the LATEST of three dates, not from the conviction: five years after conviction, after completion of any sentence of incarceration, or after completion of any period of supervision, whichever is later in time. On a felony the committed record notes it \"almost always runs from one of these, not from the conviction date.\""
  ],

  filingDestination: [
    "The clerk of the circuit court of the county of conviction. Venue, as the committed record records it: \"The circuit court in which the conviction or convictions occurred.\"",
    "Filing, in the record's own words: \"File the verified SCA-C907 petition, with the verification notarised and the certificate of service completed, with the clerk of the circuit court of the county of conviction, once five years have run from the later of conviction, release from incarceration and completion of supervision. Have a lawyer review the petition before filing.\""
  ],

  feeAndWaiver: [
    "The committed record states the fee: \"The circuit clerk charges the § 59-1-11(a)(1) civil-action fee, which the official text sets at $200, and $100 is paid to the records division of the West Virginia State Police on grant under § 61-11-26(n).\" The $200 is due at filing; the $100 is due only if the court grants the petition.",
    "**There is no fee waiver on this route.** The committed record: \"none under § 61-11-26. The $100 State Police fee is waived only on a § 61-11-26a petition.\" Ask the circuit clerk what it will accept if you cannot pay $200; this packet carries no waiver form because the record says none exists here."
  ],

  service: [
    "You serve five recipients, and the form lists seven numbered lines because two of them are conditional. The committed record: \"The petitioner serves the five § 61-11-26(e) recipients. The prosecuting attorney serves identified victims. On a felony route the institution of confinement is usually a live recipient.\"",
    "**Every recipient's street address is yours to look up and write in, and so is the delivery method and the date.** The committed manifest names them as items you complete: \"Recipient street addresses, delivery-method election, and the certificate of service date and signature — SCA-C907, page 4.\"",
    "**Nothing on page 4 is filled in by this platform.** A certificate of service certifies a delivery that has not happened yet. Complete it, sign it and date it AFTER you have actually served, never before.",
    "Notarization, as the record records it: \"Required on the SCA-C907 verification, page 3.\" Do not sign page 3 until you are in front of the notary."
  ],

  documentsToObtain: [
    ["Certified disposition, judgment order and sentencing order, and the indictment or information", "The circuit clerk of the county of conviction. Check the conviction date and the sentence against what you tell us — the committed record makes that check a step before filing, not a suggestion."],
    ["Written proof of release and of supervision completion", "The institution of confinement and the supervising probation or parole office. On a felony the five-year clock almost always runs from one of these rather than from the conviction date."],
    ["A copy of any current restitution, protection, restraining or no-contact order", "The clerk of the court that entered it. Item i on page 2 tells you in its own words to attach it: \"(If yes, attach copy of order to this petition)\"."],
    ["A copy of any order granting you an earlier expungement", "The court that granted it. Item m on page 3 says to attach it — and note the committed record's stop condition: \"Any prior expungement, which likely exhausts the once-per-lifetime rule.\""]
  ],

  steps: [
    "**Get a lawyer to review the petition.** Every West Virginia felony expungement is a referral trigger.",
    "**Get the certified court records and the written proof of release and supervision completion**, and work out the five-year date from the LATEST of conviction, release and end of supervision.",
    "**Fill in every blank listed below**, from those records rather than from memory.",
    "**Choose the eligibility recital on page 1 yourself**, with your lawyer. This packet ticks none of the four, and two of them are not on this route at all.",
    "**Sign page 2, then take page 3 to a notary and swear the verification in front of them.** Do not sign page 3 beforehand.",
    "**File with the clerk of the circuit court of the county of conviction and pay the $200 civil-action fee.**",
    "**Serve the five § 61-11-26(e) recipients**, then complete, sign and date the certificate of service on page 4 and file it.",
    "**Watch the 30-day windows.** An opposing party has 30 days from receipt to file a notice of opposition, and you have 30 days after service of an opposition to reply."
  ],

  deliberatelyBlank: [
    "**The four eligibility recitals on page 1.** Two are the § 61-11-26a three-year branch and are not on this route; the other two turn on whether your felonies arose from the same transaction, which the record records as a legal conclusion and as a stop condition.",
    "**Your signature on page 2, the verification signature and date on page 3, and the notarial block.** A verification is sworn testimony and no build may swear it.",
    "**Everything on page 4.** It certifies a service that has not happened.",
    "**Your Social Security number.** The shared semantics refuse a government identifier on any form, and this one prints only the last four digits after \"SSN: XXX-XX-\".",
    "**The three date-of-birth boxes on page 1.** See the note below.",
    "**The circuit court case number.** The committed manifest names it as an item you complete from the court record."
  ],

  notTold: [
    "Whether your felony is nonviolent within § 61-11-26(p)(5). Two of that definition's four limbs are express findings of the circuit court.",
    "Whether multiple felonies arose from the same transaction or series of transactions. The record records this as a legal conclusion and as a stop condition.",
    "Which of the three date-of-birth boxes on page 1 takes the month. The form prints only \"DOB: / /\" and its own three widgets are NAMED Day, then Month, then Year, left to right, which is the opposite of the usual American order. No committed record settles which the Court intends, so this packet writes none of the three and asks you to fill them in — putting a month where a day belongs on a petition sworn before a notary is not a formatting slip.",
    "Whether the court will grant it. It may set the matter for hearing and take evidence."
  ],

  stopConditions: [
    "Any felony conviction. Every West Virginia felony expungement is a referral trigger and the participant should have a lawyer review the petition before it is filed.",
    "Whether the felony is nonviolent within § 61-11-26(p)(5), which is a judicial finding.",
    "Whether multiple felonies arose from the same transaction or series of transactions.",
    "Any violence, domestic violence, household member, strangulation, sex, child victim, deadly weapon or dwelling burglary issue.",
    "Any pending charge.",
    "Any protection, no-contact, restitution or restraining order.",
    "Any identified victim who may oppose, and any notice of opposition actually filed.",
    "Any prior expungement, which likely exhausts the once-per-lifetime rule.",
    "The court sets the matter for hearing under § 61-11-26(i)(3), where it may examine law enforcement, confinement, parole, out-of-state and federal records and hear testimony.",
    "Firearm rights, immigration, professional licensing, law enforcement or corrections employment, or federal, tribal, military or out-of-state records questions."
  ],

  whatThisIsNot:
    "This is the Supreme Court of Appeals' own petition form, filled in with what the platform holds and left "
    + "blank everywhere it does not. It is not legal advice, it is not filed for you, it does not assert that "
    + "your felony is nonviolent, it does not choose your eligibility recital, and it does not decide whether "
    + "the court will grant it. Every West Virginia felony expungement is a referral trigger, and this packet "
    + "says so first rather than last.",

  receiptDoesNotEstablish: [
    "that any felony is nonviolent within W. Va. Code § 61-11-26(p)(5)",
    "that any felonies arose from the same transaction or series of transactions",
    "that five years have run from the later of conviction, release from incarceration and completion of supervision",
    "that any recipient named on the certificate of service is the right recipient for a particular case"
  ],

  buildFindings: [
    {
      finding:
        "The committed record forbids this build from making the determination the form's own eligibility "
        + "recitals assert: \"The nonviolent determination and the same-transaction analysis are legal "
        + "conclusions, not participant questions.\" Section 61-11-26(p)(5) makes two of the four limbs of the "
        + "nonviolent definition express findings OF THE CIRCUIT COURT, and this petition is verified under "
        + "oath before a notary.",
      consequence:
        "None of the four eligibility recitals on page 1 is ticked. The two § 61-11-26a recitals are declared "
        + "NOT_APPLICABLE_ON_THIS_ROUTE against a named route condition - they are the three-year branch and "
        + "this family is § 61-11-26. The two § 61-11-26 recitals are declared required-before-filing with "
        + "determinedByTheCaseNotTheRoute and the record's own sentence as the reason, and both are printed in "
        + "participant-instructions.md."
    },
    {
      finding:
        "The three date-of-birth widgets on page 1 are NAMED PetDOBDay, PetDOBMonth and PetDOBYear in that "
        + "left-to-right order, and the form prints nothing but \"DOB: / /\" above them. The widget names say "
        + "day-month-year; the ordinary American convention on a court form is month-day-year. The two "
        + "disagree and no committed record settles which the Supreme Court of Appeals intends.",
      consequence:
        "The platform holds the date of birth and writes none of the three boxes. All three are declared "
        + "required-before-filing and the guide tells the participant what the conflict is. Writing a month "
        + "into a box named Day on a petition sworn before a notary would assert a date of birth that is not "
        + "the participant's, and a filled box is harder to notice than an empty one. This is a source "
        + "question for whoever can read the Court's own guidance, and it is carried as a counsel question "
        + "rather than guessed."
    },
    {
      finding:
        "THIS FAMILY SHIPPED FOUR VALUES ONTO A SWORN PETITION THAT ITS OWN FIELD MAP DECLARED BLANK, AND ALL "
        + "NINE COUNTERS READ ZERO OVER IT. Item d on page 2 asks for the petitioner's \"current name, previous "
        + "names, and all aliases\" across two lines and item e asks for \"all of petitioner's addresses from "
        + "the date of offense to current\" across two more. The map declared all four required-before-filing. "
        + "The shared finalizer wrote them anyway - PetitionersCurrentName1 and ...2 match the name descriptor "
        + "on a bare \\bname\\b, PetitionersOffenseAddress1 and ...2 match the street-address descriptor - so "
        + "the delivered page carried the legal name on both name lines and the current street address on both "
        + "address lines.",
      consequence:
        "Item d asks for three things, and a legal name alone ASSERTS there are no previous names and no "
        + "aliases. Item e asks for a residence history, and one address written twice ASSERTS the petitioner "
        + "has lived at one address since the offence. Both assertions would have been made on a petition "
        + "verified under oath before a notary, and the committed record separately names the address history "
        + "as a manual completion item. All four are now refused BY ROLE, which the finalizer checks before any "
        + "name or caption match. "
        + "Two things about how it was found matter more than the fix. First, no counter could see it: the "
        + "completeness contract reads the MAP, the map was telling the truth about what it intended, and the "
        + "ink audit charges only glyphs outside a measured box - there are none on an AcroForm path. It was "
        + "found by diffing the delivered pages against the pinned source item by item and noticing ten added "
        + "items where the map declared six. Second, the same gap can open on any family on this path, so this "
        + "script now compares report.written against its own declared writes per document and per fixture and "
        + "STOPS rather than rendering when they disagree - stopClass "
        + "FINALIZER_WROTE_A_FIELD_THE_MAP_DECLARES_BLANK. That gate was tested by removing one refusal and "
        + "confirming it fires and names the field and the fact."
    },
    {
      finding:
        "`CertifyName` on page 4 binds the petitioner's own name through the ordinary descriptor channel, and "
        + "page 4 is a CERTIFICATE OF SERVICE - it certifies a delivery that has not happened when the packet "
        + "is produced.",
      consequence:
        "CertifyName and the three certificate date widgets are declared unwritable BY ROLE, which the "
        + "finalizer checks before any name or caption match, as well as protected in the field map. Nothing "
        + "on page 4 carries ink."
    },
    {
      finding:
        "`PetAdd1` and `PetAdd2` are one address block in two widgets and BOTH match the street-address "
        + "descriptor, and `PetitionerName2` - the verification's own name line on page 3 - matches no "
        + "descriptor at all.",
      consequence:
        "All three are written through the finalizer's own opt-in narrativeAcrossFields channel, one held fact "
        + "per field. Without it the petition would carry the street line twice with no city, state or ZIP, "
        + "and a verification sworn before a notary with no name in it. Reported for the lane that owns "
        + "scripts/rcap-official-forms/rcap-field-semantics.mjs, which this lane does not open."
    },
    {
      finding:
        "The widget named `MulitipleFelonlySatisfiesDate` on page 1 has a NEGATIVE height (-17) in its own "
        + "/Rect, and its name carries two typographical errors as the Court published them.",
      consequence:
        "Nothing is written into it - it is a § 61-11-26a recital date and is not on this route - so the "
        + "malformed rectangle affects no output here. It is recorded because a family that DID write to it "
        + "would be drawing into an inverted box, and because the field map must use the Court's own spelling "
        + "rather than a corrected one."
    },
    {
      finding:
        "The committed packet-set manifest declares six components. Three are official_pdf_fill and all three "
        + "name the same officialFormId, SCA-C907, because the Court publishes the petition, the verification "
        + "and the certificate of service as one four-page instrument. The other three are process_guidance.",
      consequence:
        "The instrument is delivered whole, so all three fill components are rendered. The three "
        + "process_guidance components are carried in participant-instructions.md, and the record's own "
        + "six-component table is printed in the guide so a reader can check what they received against what "
        + "the record declares."
    }
  ],

  counselQuestions: [
    "The date-of-birth boxes on page 1 are left blank because the widget names say day-month-year and the American convention says month-day-year. Confirm the order the Supreme Court of Appeals intends, or confirm that leaving them to the participant is right.",
    "None of the four page-1 eligibility recitals is ticked, and the two § 61-11-26 recitals are disclosed to the participant as case-determined. Confirm that leaving the recital unticked is preferable to a runtime that selects it, given that the petition is verified under oath.",
    "The packet writes the county of conviction into the caption but not the circuit court case number, because the committed manifest names the case number as a manual completion item and does not name the county. Confirm that split.",
    "The guide leads with the referral trigger rather than with instructions. Confirm the placement and the wording."
  ],

  reviewersAttention: [
    "Please check the raster shows page 3 and page 4 carrying NO ink at all except the petitioner's name on the verification line — no signature, no date, no notarial content, no recipient address, no delivery-method mark.",
    "Please check the raster shows all four eligibility checkboxes on page 1 unmarked, and the three date-of-birth boxes empty.",
    "The petitioner's address occupies two stacked widgets on page 1. Please check the raster shows the street line on the first and the city, state and ZIP on the second, and not the street twice.",
    "The BOUNDARY fixture carries a 46-character street line and a hyphenated three-part name to exercise the fitter on this form's narrow caption widgets; the canonical fixture shows ordinary values.",
    "Pages 2 and 4 should carry NO ink at all. An earlier build of this family wrote the legal name onto both lines of item d and the street address onto both lines of item e, and passed all nine counters doing it. Please check the raster shows item d and item e empty.",
    "Seven sentences the committed record makes are asserted over the generated guide before it is written — the referral trigger, the legal-conclusion sentence, the DUI sentence, the $200 and $100 fees, the express absence of a fee waiver and the 30-day windows. A guide that lost one would stop the family rather than ship."
  ],

  composedBody() {
    throw new Error("this family composes no pages: its only component is the official SCA-C907 instrument");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId !== PETITION) throw new Error(`no field map declared for component ${componentId}`);

    const notOnThisRoute = (id, label, condition, why, page) => ({
      ...h.optional(id, label, why, page),
      isSelectionControl: true, kind: "selection_control",
      reason: `not applicable on this route: ${condition}`,
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable: condition,
      routeDetermined: false
    });
    const caseDetermined = (id, label, what, why, page) => ({
      ...h.rbf(id, label, what, why, page),
      isSelectionControl: true, kind: "selection_control",
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt:
        "This family is the W. Va. Code § 61-11-26 nonviolent-felony route and BOTH of these recitals are on "
        + "it: one for a single felony and one for multiple felonies arising from the same transaction. Which "
        + "applies is decided by how many felonies there were and whether they arose from the same "
        + "transaction or series of transactions - facts of the record and, as the committed track registry "
        + "states, legal conclusions: \"The nonviolent determination and the same-transaction analysis are "
        + "legal conclusions, not participant questions.\" The registry additionally records the "
        + "same-transaction question as a self-help stop condition. The petition is verified under oath "
        + "before a notary under § 61-11-26, so an unticked recital is the only honest state for it."
    });
    const A26A =
      "This packet is built for the W. Va. Code § 61-11-26 nonviolent-felony route "
      + "(routeKey obligation:track-pathway:WV:wv_conv_nonviolent_felony:eligible-conviction-expungement-under-w-va-code-61-11-26). "
      + "This recital is the § 61-11-26a three-year branch, which the form's own printed text conditions on "
      + "§ 61-11-26a(a)(1) or § 61-11-26a(a)(2) and on documentation required under § 61-11-26a(b), and which "
      + "the committed track registry distinguishes from this route in terms: \"none under § 61-11-26. The "
      + "$100 State Police fee is waived only on a § 61-11-26a petition.\"";

    writes.push(
      h.write("PetitionerName1", "Petitioner (First/Middle/Last) in the caption at the head of page 1", "participant.full_legal_name", 1),
      h.write("County", "IN THE CIRCUIT COURT OF ______ COUNTY, WEST VIRGINIA", "matter.county", 1),
      h.write("PetAdd1", "Address: in the caption - first line", "participant.street_address", 1),
      h.write("PetAdd2", "Address: in the caption - second line", "participant.city_state_zip", 1),
      h.write("PetPhoneNum", "Phone No. in the caption", "participant.phone", 1),
      h.write("PetitionerName2", "The verification's own name line on page 3 - \"I, ______ after making oath or affirmation to tell the truth\"", "participant.full_legal_name", 3)
    );

    refusals.push(
      // ---- page 1, the viewer controls
      h.optional("ResetButton", "Reset - a viewer control on the form, never a filing fact",
        "the form's own button; it clears the form on screen and is not a blank on the filing", 1),
      h.optional("PrintForm", "Print this form - a viewer control, never a filing fact",
        "the form's own button; it prints the form and is not a blank on the filing", 1),

      // ---- page 1, the caption
      h.rbf("CircuitCaseNo", "Circuit Court Case No. in the caption",
        "the circuit court case number of the conviction, from the certified court records",
        "the committed packet-set manifest names this as an item the participant completes: \"Circuit court case number - SCA-C907, page 1, caption block\"", 1),
      h.rbf("MagCaseNo", "Magistrate Court Case No. in the caption",
        "the magistrate court case number, if the case began there; leave it blank if it did not",
        "the platform holds no magistrate court number and the record establishes none", 1),
      h.rbf("ConvictionDate", "Conviction Date: in the caption",
        "the date of the conviction, taken from the certified judgment order and checked against it rather than recalled",
        "the committed manifest makes checking the conviction date against the certified records a step before filing, and the platform holds no conviction date", 1),
      h.rbf("PetDOBDay", "DOB - the FIRST of the three boxes, which the form names Day",
        "the day of your date of birth if the Court intends day-month-year, or the month if it intends month-day-year. The form prints only \"DOB: / /\" and names its three widgets Day, Month and Year in that left-to-right order, which is the opposite of the usual American order. Ask the circuit clerk which the Court expects before you write in any of the three",
        "the widget names and the ordinary American convention disagree about which box takes the month, no committed record settles it, and a wrong number in a date of birth on a petition verified under oath is worse than an empty box", 1),
      h.rbf("PetDOBMonth", "DOB - the SECOND of the three boxes, which the form names Month",
        "the month of your date of birth if the Court intends day-month-year, or the day if it intends month-day-year. See the note on the first box",
        "the widget names and the ordinary American convention disagree about which box takes the month, and no committed record settles it", 1),
      h.rbf("PetDOBYear", "DOB - the THIRD of the three boxes, which the form names Year",
        "the four-digit year of your date of birth",
        "this build writes none of the three date-of-birth boxes, because writing the year alone into a date whose other two boxes are ambiguous would read as a date that had been checked", 1),
      h.rbf("PetSocSecno", "SSN: XXX-XX-____ in the caption",
        "the last four digits of your Social Security number, which is all this line asks for",
        "the shared semantics refuse a government identifier on any form, so the platform never writes one", 1),

      // ---- page 1, the charge table
      ...[1, 2, 3, 4].flatMap((n) => [
        h.rbf(`Charge${n}`, `CHARGE: - row ${n} of the felony table on page 1`,
          `the felony you were convicted of on row ${n}, worded exactly as the certified judgment order words it, with the Code section it was under`,
          "the platform holds no charge for this matter, and wording an offence differently from the judgment is how a petition gets denied", 1),
        h.rbf(`CaseNo${n}`, `CASE NO.: - row ${n} of the felony table on page 1`,
          `the case number for the felony on row ${n}`,
          "the platform holds no case number for this matter", 1)
      ]),

      // ---- page 1, the four eligibility recitals
      caseDetermined("SingleFelonyCB",
        "Eligibility recital - the box for a SINGLE felony conviction under § 61-11-26",
        "tick this recital only if it is true of your case, and only after a lawyer has reviewed it. The form states it as: \"For the expungement under WV Code §61-11-26 of a single above listed and described felony conviction, five years have passed since the completion of petitioner's sentence and any period of supervision.\"",
        "the platform holds no conviction, no sentence-completion date and no supervision-end date for this participant, and the nonviolent characterisation is an express finding of the circuit court", 1),
      h.rbf("SingleFelonyCompletionDate", "Eligibility recital, single felony under § 61-11-26 - \"The date of completion was: ____\"",
        "the date your sentence and any period of supervision were completed - the LATER of release from incarceration and the end of supervision, not the conviction date",
        "the platform holds no completion date, and the committed record notes that on a felony the five-year clock almost always runs from release or supervision rather than from conviction", 1),
      caseDetermined("MultipleFelonyCB",
        "Eligibility recital - the box for MULTIPLE felony convictions under § 61-11-26 arising from the same transaction",
        "tick this recital only if it is true of your case, and only after a lawyer has reviewed it. The form states it as: \"For the expungement under WV Code §61-11-26 of multiple above listed and described felony convictions, all the charges arose from the same transaction and five years have passed since any conviction and the completion of petitioner's sentence and any period of supervision.\" The committed record records the same-transaction question as a self-help stop condition as well as a legal conclusion",
        "whether multiple felonies arose from the same transaction or series of transactions is a legal conclusion the committed record refuses to put to the participant as a question and refuses to let a build assert", 1),
      h.rbf("MultipleFelonyCompletionDate", "Eligibility recital, multiple felonies under § 61-11-26 - \"The date of completion was: ____\"",
        "the date of completion for the multiple-felony recital, if that is the recital that applies",
        "the platform holds no completion date for this participant", 1),
      notOnThisRoute("SingleSatisfiedCB",
        "Eligibility recital - the box for a single felony under § 61-11-26a, the three-year branch",
        A26A,
        "a recital whose own printed text is conditioned on § 61-11-26a(a)(1) or (a)(2) and on § 61-11-26a(b) documentation is not on the § 61-11-26 route this packet is built for", 1),
      notOnThisRoute("SingleFelonySatisfiesDate",
        "Eligibility recital, single felony under § 61-11-26a - \"The date of completion was: ____\"",
        A26A,
        "the completion date belonging to a recital this route does not use", 1),
      notOnThisRoute("MultilpleSatisfiedCB",
        "Eligibility recital - the box for multiple felonies under § 61-11-26a, the three-year branch (the Court's own spelling of the field name is kept)",
        A26A,
        "a recital whose own printed text is conditioned on § 61-11-26a(a)(1) or (a)(2) and on § 61-11-26a(b) documentation is not on the § 61-11-26 route this packet is built for", 1),
      notOnThisRoute("MulitipleFelonlySatisfiesDate",
        "Eligibility recital, multiple felonies under § 61-11-26a - \"The date of completion was: ____\" (the Court's own spelling of the field name is kept, and this widget's own rectangle has a negative height)",
        A26A,
        "the completion date belonging to a recital this route does not use", 1),

      // ---- page 2
      h.rbf("PetitionersCurrentName1", "Item d - petitioner's current name, previous names and all aliases, first line",
        "your current name, every previous legal name and every alias you have been known by. The platform holds one legal name and this line asks for all three things at once, so it is yours to complete",
        "writing the legal name alone here would answer a third of the question and would assert that there are no previous names or aliases", 2),
      h.rbf("PetitionersCurrentName2", "Item d - petitioner's current name, previous names and all aliases, second line",
        "the continuation of your names and aliases",
        "the same question as the line above", 2),
      h.rbf("PetitionersOffenseAddress1", "Item e - all of petitioner's addresses from the date of offense to current, first line",
        "every place you have lived, in order, from the date of the offence to today, with the dates",
        "the committed record names address history since the offence as a manual completion item, and the platform holds one current address and no address history", 2),
      h.rbf("PetitionersOffenseAddress2", "Item e - all of petitioner's addresses from the date of offense to current, second line",
        "the continuation of your address history",
        "the same item as the line above", 2),
      h.rbf("PetArrestDate", "Item f - date of arrest",
        "the date you were arrested, from the certified court records",
        "the platform holds no arrest date for this matter", 2),
      h.rbf("Charges1", "Item g - the charges petitioner was convicted on, first line",
        "the charges you were convicted on, worded as the certified judgment order words them",
        "the platform holds no charge for this matter", 2),
      h.rbf("Charges2", "Item g - the charges petitioner was convicted on, second line",
        "the continuation of the charges",
        "the platform holds no charge for this matter", 2),
      h.rbf("VictimsNames1", "Item h - name(s) of victim(s) if applicable, first line",
        "the name of any identifiable victim, if there was one",
        "the platform holds no victim identity for this matter and would never write one", 2),
      h.rbf("VictimsNames2", "Item h - name(s) of victim(s) if applicable, second line",
        "the continuation of the victim names",
        "the platform holds no victim identity for this matter", 2),
      h.election("CurrentOrderCB1", "Item i - is there a CURRENT restitution, protection, restraining or no-contact order - the Yes box",
        "only the participant knows, and the form's own Yes branch requires the order to be attached to the petition; the route does not determine it", 2),
      h.election("CurrentOrderCB2", "Item i - is there a CURRENT restitution, protection, restraining or no-contact order - the No box",
        "the negative half of the same election", 2),
      h.election("PriorOrderCB1", "Item i - was there a PRIOR restitution, protection, restraining or no-contact order - the Yes box",
        "only the participant knows; the route does not determine it", 2),
      h.election("PriorOrderCB2", "Item i - was there a PRIOR restitution, protection, restraining or no-contact order - the No box",
        "the negative half of the same election", 2),
      h.rbf("Verdict1", "Item j - the Court's verdict and the punishment imposed, first line",
        "the verdict and the sentence the court imposed, from the certified judgment and sentencing orders",
        "the platform holds no verdict or sentence for this matter", 2),
      h.rbf("Verdict2", "Item j - the Court's verdict and the punishment imposed, second line",
        "the continuation of the verdict and sentence",
        "the platform holds no verdict or sentence for this matter", 2),
      h.rbf("GroundsForExpungement1", "Item k - grounds for the expungement request, first line",
        "why you are asking, in detail - for example employment or licensure",
        "this is a statement about the participant's own life and nobody can write it for them", 2),
      h.rbf("GroundsForExpungement2", "Item k - grounds for the expungement request, second line",
        "the continuation of your grounds",
        "this is a statement about the participant's own life", 2),
      ...[1, 2, 3, 4, 5].map((n) => h.rbf(`RehabilitationSteps${n}`,
        `Item l - steps taken since the offence towards personal rehabilitation, line ${n} of five`,
        "what you have done since the offence - treatment, work, study, family or community life - in detail",
        "the committed manifest names the rehabilitation statement as an item the participant completes, and it is a statement about their own life", 2)),

      // ---- page 3
      h.election("ExpungementCB1", "Item m - has petitioner ever been granted expungement or similar relief - the Yes box",
        "only the participant knows; the form's own Yes branch requires the order to be attached, and the committed record records a prior expungement as a stop condition that likely exhausts the once-per-lifetime rule", 3),
      h.election("ExpungementCB2", "Item m - has petitioner ever been granted expungement or similar relief - the No box",
        "the negative half of the same election", 3),

      // ---- page 4, the certificate of service
      h.protectedBlank("CertifyName", "Certificate of service - the name of the person certifying the service",
        "this certifies a service that has not happened; the field is also declared unwritable by role, which the finalizer checks before any name or caption match, because it would otherwise bind the petitioner's own name", 4),
      h.protectedBlank("CertifyDay", "Certificate of service - the day of the month of service",
        "a service date written before service would be false", 4),
      h.protectedBlank("CertifyMonth", "Certificate of service - the month of service",
        "a service date written before service would be false", 4),
      h.protectedBlank("CertifyYear", "Certificate of service - the year of service",
        "a service date written before service would be false", 4),
      h.rbf("StatePoliceSuperintendent1", "Certificate of service, recipient 1 - the Superintendent of the State Police, at ____",
        "the street address of the Superintendent of the West Virginia State Police, looked up before you serve",
        "the committed manifest names recipient street addresses as items the participant completes, and the platform holds none of them", 4),
      h.rbf("ProsecutingAttCounty", "Certificate of service, recipient 2 - the ______ County Prosecuting Attorney Office",
        "the county whose prosecuting attorney office you are serving",
        "the platform holds the county of conviction but the record assigns every certificate-of-service entry to the participant, and a served office is a fact about the service rather than about the case", 4),
      h.rbf("ProsecutingAttAdd", "Certificate of service, recipient 2 - the Prosecuting Attorney Office address",
        "the street address of that prosecuting attorney's office",
        "the committed manifest names recipient street addresses as items the participant completes", 4),
      h.rbf("ChiefLEO1", "Certificate of service, recipient 3 - the Chief of Police or other Executive Head of the Municipal Police Department where the offence was committed, first line",
        "the name and street address of that police department",
        "the committed manifest names recipient street addresses as items the participant completes", 4),
      h.rbf("ChiefLEO2", "Certificate of service, recipient 3 - the Chief of Police or other Executive Head of the Municipal Police Department, second line",
        "the continuation of that address",
        "the committed manifest names recipient street addresses as items the participant completes", 4),
      h.rbf("OffensesCommittedAt1", "Certificate of service, recipient 4 - the Superintendent or Warden of any institution in which the petitioner was confined, first line",
        "the name and street address of the institution you were confined in, if you were. The committed record notes that on a felony route the institution of confinement is usually a live recipient",
        "the platform holds no institution of confinement and no address for one", 4),
      h.rbf("OffensesCommittedAt2", "Certificate of service, recipient 4 - the Superintendent or Warden of any institution in which the petitioner was confined, second line",
        "the continuation of that address",
        "the platform holds no institution of confinement", 4),
      h.rbf("CircuitDisposedCharges", "Certificate of service, recipient 5 - the Circuit Court that disposed of the charges, at ____",
        "the street address of the circuit court that disposed of your charges",
        "the committed manifest names recipient street addresses as items the participant completes", 4),
      h.rbf("MagDisposedCharges", "Certificate of service, recipient 6 - the Magistrate Court that disposed of the charges, at ____",
        "the street address of the magistrate court, if one disposed of any of your charges",
        "the committed manifest names recipient street addresses as items the participant completes", 4),
      h.rbf("MunicipalDisposedCharges", "Certificate of service, recipient 7 - the Municipal Court that disposed of the charges, at ____",
        "the street address of the municipal court, if one disposed of any of your charges",
        "the committed manifest names recipient street addresses as items the participant completes", 4),
      h.protectedBlank("FirstClassMailCB", "Certificate of service - the First Class Mail delivery-method box",
        "the delivery method certifies how a service that has not happened was carried out; the committed manifest names the delivery-method election as an item completed after service", 4),
      h.protectedBlank("HandDeliveryCB", "Certificate of service - the Hand Delivery delivery-method box",
        "the delivery method certifies how a service that has not happened was carried out", 4),
      h.protectedBlank("CertifiedMailCB", "Certificate of service - the Certified Mail, Return Receipt delivery-method box",
        "the delivery method certifies how a service that has not happened was carried out", 4)
    );

    return { writes, refusals };
  }
};
/* ============================================================================
 * SHARED AGENCY-APPLICATION / COMPOSED BUILD CORE.
 *
 * Everything above this line is the family's own: its committed-record
 * bindings, its official-document bindings, its composed bodies, its field
 * maps and its instructions content. Everything below is family-independent
 * plumbing: deterministic rendering, byte proof, the builder's own count of
 * the nine completeness counters, and the census-v1 output records.
 *
 * It is a direct descendant of the composed-treatment core proven by the
 * FABLE-B12 builders, with ONE addition: a component may be an OFFICIAL
 * AGENCY DOCUMENT rather than a composed page. An agency application is not a
 * court filing, and the participant applies on the agency's own published
 * form; so where the agency publishes one, this core binds it by exact
 * SHA-256, writes only into measured boxes read from the document's own rule
 * strokes, and copies its pages into the packet. Where the agency publishes
 * none, no form is invented and the deliverable is the composed route sheet.
 *
 * DETERMINISM. Every PDFDocument.create() here is stamped through
 * stampDeterministic before it is saved, because pdf-lib writes the wall clock
 * into a created document and save({updateMetadata:false}) does not remove a
 * stamp that is already there. An overlaid official document keeps the source
 * document's own dates through carryDates() inside the finalizer. Two builds
 * of this family from the same inputs are therefore byte-identical, which is
 * what a hash-bound raster receipt depends on.
 * ========================================================================== */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay, finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { isoDateInPrintedOrder } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { resolveFact } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const OUT = SPEC.outDir;
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const MASTER_LIBRARY = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
export const DOTS = (n = 84) => ".".repeat(n);

const STRATEGY = SPEC.implementationStrategy ?? "participant_agency_application";
const OFFICIAL = SPEC.officialComponents ?? {};
const isOfficial = (componentId) => Object.hasOwn(OFFICIAL, componentId);

/* ---- committed-record binding ------------------------------------------------ *
 * The authority this family composes from is a set of COMMITTED repository
 * records, each bound by exact SHA-256 at build time, and each anchor string a
 * statement this build RELIES ON, re-read from the committed bytes before
 * anything is composed. The build refuses if a record is missing or an anchor
 * is no longer there. */
function resolveRecords() {
  const resolved = [];
  const failures = [];
  for (const rec of SPEC.records) {
    const abs = path.join(ROOT, rec.path);
    if (!fs.existsSync(abs)) {
      failures.push({ recordId: rec.recordId, path: rec.path, why: "the committed record does not exist at this path" });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const text = bytes.toString("utf8");
    const missing = (rec.mustContain ?? []).filter((a) => !text.includes(a));
    if (missing.length > 0) {
      failures.push({
        recordId: rec.recordId, path: rec.path,
        why: `the committed record no longer contains ${missing.length} anchor statement(s) this build relies on`,
        missingAnchors: missing
      });
      continue;
    }
    resolved.push({
      recordId: rec.recordId, path: rec.path, role: rec.role,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, anchorsVerified: (rec.mustContain ?? []).length
    });
  }
  return { resolved, failures };
}

/* ---- transport: an encrypted official binary, unlocked and PROVED --------------- *
 *
 * The identity is the pinned official binary and stays the pinned official
 * binary. This step exists because the corpus toolchain cannot READ those
 * bytes: CR-218 is encrypted with an empty user password and pdf-lib throws in
 * PDFCatalog.Pages before it reaches a page.
 *
 * pikepdf (libqpdf) opens the exact pinned bytes and saves a decrypted
 * derivative with deterministic_id, so the derivative is a function of the
 * pinned source and two builds agree. The derivative is then PROVED equivalent
 * to the official binary by the repository's own fidelity reader — page count,
 * page geometry, the terminal field set, every field difference, the page
 * content streams and XFA — and the family stops rather than rendering if any
 * of them differ. The source's own SHA-256 is recomputed before and after, so
 * a read that altered the source would be caught rather than assumed away.
 *
 * The derivative is written to a build-time temporary directory, is never
 * committed, and is deleted when the build ends. It is transport, not identity.
 */
const UNLOCK_FIDELITY_READER = "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py";

const UNLOCK_BRIDGE = `
import hashlib, importlib.util, json, os, sys
import pikepdf

request = json.loads(sys.argv[1])

def sha256_file(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()

def load_module(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(request["root"], rel))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

fidelity = load_module("pf07_fidelity_reader", request["fidelityReader"])

source = request["sourcePath"]
derived = request["derivedPath"]
pinned = request["pinnedSha256"]

before = sha256_file(source)
if before != pinned:
    print(json.dumps({"ok": False, "why": "the source on disk does not hash to the pinned SHA-256 before the read",
                      "observed": before, "pinned": pinned}))
    sys.exit(0)

with pikepdf.open(source) as pdf:
    source_encrypted = pdf.is_encrypted
    # deterministic_id derives the trailer /ID from the file contents. Without
    # it every save mints a fresh random /ID and the family can never rebuild
    # byte-identically.
    pdf.save(derived, deterministic_id=True)

after = sha256_file(source)

official = fidelity.describe(source)
derivative = fidelity.describe(derived)
delta = fidelity.diff(official, derivative)

with pikepdf.open(derived) as d:
    derived_encrypted = d.is_encrypted

equivalent = (
    delta["pageCount"] is None
    and not delta["pageGeometry"]
    and not delta["fieldsOnlyInOfficial"]
    and not delta["fieldsOnlyInDerivative"]
    and not delta["fieldDifferences"]
    and not delta["contentStreamChangedPages"]
)

print(json.dumps({
    "ok": True,
    "sourceSha256Before": before,
    "sourceSha256After": after,
    "sourceUnchanged": before == after == pinned,
    "sourceEncrypted": source_encrypted,
    "derivedSha256": sha256_file(derived),
    "derivedByteLength": os.path.getsize(derived),
    "derivedEncrypted": derived_encrypted,
    "equivalent": bool(equivalent),
    "delta": delta,
    "pikepdfVersion": pikepdf.__version__,
    "libqpdfVersion": pikepdf.__libqpdf_version__,
    "createdBy": "pikepdf.open(exact_pinned_source).save(derived, deterministic_id=True)",
    "fidelityLogic": request["fidelityReader"],
}))
`;

/**
 * Unlocks one bound document in place and returns the transport record. Throws
 * nothing: an unusable result is returned so the caller stops the family with
 * it rather than rendering.
 */
function unlockBoundDocument(b, scratchDir) {
  const sourcePath = path.join(scratchDir, `${b.doc.documentId}-pinned-source.pdf`);
  const derivedPath = path.join(scratchDir, `${b.doc.documentId}-unlocked-derivative.pdf`);
  fs.writeFileSync(sourcePath, b.bytes);

  let raw;
  try {
    raw = execFileSync("python3", ["-c", UNLOCK_BRIDGE, JSON.stringify({
      root: ROOT, sourcePath, derivedPath,
      pinnedSha256: b.doc.sha256,
      fidelityReader: UNLOCK_FIDELITY_READER
    })], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
      /* The bridge imports a module from a directory this lane does not own;
       * without this it leaves a __pycache__ behind in it. */
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
    });
  } catch (error) {
    return { ok: false, why: `the unlock bridge did not run: ${String(error.stderr ?? error.message).slice(0, 2000)}` };
  }
  let result;
  try { result = JSON.parse(raw.trim().split("\n").pop()); }
  catch { return { ok: false, why: `the unlock bridge returned output this build cannot read: ${raw.slice(0, 800)}` }; }

  if (result.ok !== true) return { ok: false, why: result.why, observed: result.observed ?? null };
  if (result.sourceUnchanged !== true) {
    return { ok: false, why: "the pinned source's SHA-256 did not survive the read unchanged", record: result };
  }
  if (result.derivedEncrypted !== false) {
    return { ok: false, why: "the derivative is still encrypted, so nothing was gained by it", record: result };
  }
  if (result.equivalent !== true) {
    return { ok: false, why: "the unlocked derivative is not equivalent to the official binary", record: result };
  }
  return { ok: true, derivedPath, record: result };
}

/* ---- official-document binding ------------------------------------------------ *
 * Resolved through the committed corpus index and its declared custody roots,
 * never by joining a path onto a guessed root: the index carries more than one
 * custody now and every custody but the Master Library writes
 * repository-relative paths. The pinned SHA-256 is what decides these are the
 * document's bytes, and it is re-computed from the file on disk. */
function resolveOfficialDocuments() {
  const bound = [];
  const failures = [];
  if (Object.keys(OFFICIAL).length === 0) return { bound, failures };
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const resolver = makeCorpusEntryResolver(index, {
    repoRoot: ROOT, masterLibraryRoot: path.join(ROOT, MASTER_LIBRARY)
  });
  for (const [componentId, doc] of Object.entries(OFFICIAL)) {
    /*
     * One document, several custodies, and only some of them mounted.
     *
     * Both of this family's binaries appear TWICE in the committed index at
     * the same SHA-256: once under master_library and once under
     * d_source_packs, which is a pinned release this container does not carry.
     * Taking the FIRST entry that carries the hash makes the binding depend on
     * the index's row order rather than on the bytes, and reports a document
     * as unmounted while its identical bytes sit on disk under another
     * custody.
     *
     * So every candidate entry is tried, and the one that binds is the one
     * whose bytes are PRESENT and hash to the pinned digest. That is a
     * stricter test than the original, not a looser one: identity is still the
     * SHA-256 and nothing is accepted on a path alone. The receipt records
     * which custody actually supplied the bytes.
     */
    const candidates = (index.entries ?? []).filter((e) => e.sha256 === doc.sha256);
    if (candidates.length === 0) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, why: "no committed corpus-index entry carries this SHA-256" });
      continue;
    }
    let boundHere = null;
    const tried = [];
    for (const entry of candidates) {
      const file = resolver.resolve(entry);
      if (file === null || !fs.existsSync(file)) {
        tried.push({ custody: entry.custody ?? "master_library", path: entry.path, why: "not mounted in this checkout" });
        continue;
      }
      const bytes = fs.readFileSync(file);
      const observed = crypto.createHash("sha256").update(bytes).digest("hex");
      if (observed !== doc.sha256) {
        tried.push({ custody: entry.custody ?? "master_library", path: entry.path, why: "the bytes on disk do not hash to the pinned SHA-256", observed });
        continue;
      }
      boundHere = { componentId, doc, bytes, entry, custody: entry.custody, pathInCustody: entry.path };
      break;
    }
    if (!boundHere) {
      failures.push({
        sourceId: doc.sourceId, componentId, sha256: doc.sha256, custodiesTried: tried,
        why: "the corpus index names this document in one or more custodies and none of them supplies bytes here that hash to the pinned SHA-256"
      });
      continue;
    }
    bound.push(boundHere);
  }
  return { bound, failures };
}

/* ---- measured write boxes, read from the document's own strokes ---------------- *
 * A write box is four strokes read from the page content stream — the rule
 * above, the rule below, and a vertical divider on each side — and never a
 * constant offset from a caption. The top of the box is measured too: it
 * begins a fixed clearance under the LOWEST printed line inside the cell, so a
 * caption that wraps to two lines cannot have a value drawn over its second
 * line. A cell that does not measure is recorded as geometry drift and nothing
 * is drawn in it. */
const RULE_TOLERANCE = 1.6;
const SPAN_OVERLAP = 0.55;
const CELL_INSET = 3;
const WRITE_BOX_LIFT = 3.5;
const CAPTION_CLEARANCE = 2.5;
const MIN_WRITE_BOX_HEIGHT = 7.5;
const MAX_WRITE_BOX_HEIGHT = 12;

/*
 * The second measured shape: a RULED BLANK.
 *
 * Not every official form draws a cell grid. Alaska's DPS CRI-103 draws a
 * printed caption followed by a single horizontal stroke, and there is no
 * vertical divider on either side of it — so the four-stroke cell test above
 * finds nothing and would report the whole form as geometry drift. The stroke
 * IS the measurement here: its own x and endX give the horizontal extent the
 * form intends for the value, and the value sits on it, which is why the
 * finalizer's protected-rule test is expressed in the same terms.
 *
 * The ceiling is still measured rather than assumed: the box stops a fixed
 * clearance below the lowest printed baseline that sits above this stroke
 * inside its own span, so a value can never be drawn over the caption of the
 * line above. Where nothing is printed above inside the span, the box takes
 * the maximum height and the fitter decides the rest.
 */
const BASELINE_ABOVE_RULE = 2;

function measureRuledBlank(page, cell) {
  const candidates = page.horizontal
    .filter((r) => Math.abs(r.y - cell.ruleY) <= RULE_TOLERANCE
      && Math.abs(r.x - cell.ruleFromX) <= RULE_TOLERANCE
      && Math.abs(r.endX - cell.ruleToX) <= RULE_TOLERANCE)
    .sort((a, b) => Math.abs(a.y - cell.ruleY) - Math.abs(b.y - cell.ruleY));
  const rule = candidates[0];
  if (!rule) return null;
  const boxBottom = rule.y + BASELINE_ABOVE_RULE;
  const above = page.items
    .filter((t) => String(t.text).trim() && t.x >= rule.x - 2 && t.x <= rule.endX + 2 && t.y > boxBottom + 2)
    .map((t) => t.y);
  const ceiling = above.length > 0 ? Math.min(...above) - CAPTION_CLEARANCE : boxBottom + MAX_WRITE_BOX_HEIGHT;
  const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
  const writeBox = {
    x: Number((rule.x + CELL_INSET).toFixed(2)),
    y: Number(boxBottom.toFixed(2)),
    width: Number((rule.endX - rule.x - CELL_INSET * 2).toFixed(2)),
    height: Math.max(0, height)
  };
  return {
    writeBox,
    tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
    rectBasis:
      "measured_ruled_blank: one horizontal stroke read from the page content stream — the rule the value is "
      + "written on — matched on its own y, start x and end x against the pinned binary, with the box ceiling "
      + "taken from the lowest printed baseline above it inside its own span",
    measuredCell: {
      ruleY: rule.y, ruleFromX: rule.x, ruleToX: rule.endX,
      ruleThickness: rule.height ?? null,
      lowestPrintedBaselineAboveInsideSpan: above.length > 0 ? Math.min(...above) : null
    }
  };
}

async function measureCells(bytes, cells) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const perPage = new Map();
  for (const [i, page] of pages.entries()) {
    const rules = await rulesOfPage(page);
    perPage.set(i + 1, {
      horizontal: rules.horizontal ?? [], vertical: rules.vertical ?? [],
      items: extractTextItems(page),
      size: page.getSize()
    });
  }
  const measured = [];
  const drift = [];
  for (const cell of cells) {
    const here = perPage.get(cell.page) ?? { horizontal: [], vertical: [], items: [] };
    if (Object.hasOwn(cell, "ruleY")) {
      const ruled = measureRuledBlank(here, cell);
      if (!ruled) {
        drift.push({
          cell: cell.key, page: cell.page, shape: "ruled_blank",
          expected: { ruleY: cell.ruleY, ruleFromX: cell.ruleFromX, ruleToX: cell.ruleToX },
          nearest: here.horizontal
            .filter((r) => Math.abs(r.y - cell.ruleY) <= 6)
            .map((r) => ({ y: r.y, x: r.x, endX: r.endX })).slice(0, 4)
        });
        continue;
      }
      measured.push({ ...cell, ...ruled, rect: ruled.writeBox });
      continue;
    }
    const cellHeight = cell.top - cell.bottom;
    const overlapOf = (v) => {
      const y0 = Number(v.y);
      const y1 = y0 + Number(v.height ?? 0);
      return Math.max(0, Math.min(y1, cell.top) - Math.max(y0, cell.bottom)) / cellHeight;
    };
    const hRule = (y) => here.horizontal
      .filter((r) => Math.abs(r.y - y) <= RULE_TOLERANCE)
      .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
    const vRule = (x) => here.vertical
      .filter((v) => Math.abs(v.x - x) <= RULE_TOLERANCE && overlapOf(v) >= SPAN_OVERLAP)
      .sort((a, b) => overlapOf(b) - overlapOf(a))[0];
    const top = hRule(cell.top);
    const bottom = hRule(cell.bottom);
    const left = vRule(cell.left);
    const right = vRule(cell.right);
    if (!top || !bottom || !left || !right) {
      drift.push({
        cell: cell.key, page: cell.page,
        expected: { top: cell.top, bottom: cell.bottom, left: cell.left, right: cell.right },
        found: { top: top?.y ?? null, bottom: bottom?.y ?? null, left: left?.x ?? null, right: right?.x ?? null }
      });
      continue;
    }
    const printedInCell = here.items
      .filter((t) => String(t.text).trim() && t.x >= left.x - 2 && t.x <= right.x + 2 && t.y >= bottom.y - 1 && t.y <= top.y + 1)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lowestPrintedLine = printedInCell.length > 0 ? Math.min(...printedInCell.map((t) => t.y)) : null;
    /*
     * Where in a measured cell the value sits.
     *
     * By default it sits on the cell's bottom rule, which is where a person
     * writing on paper puts it: the caption is printed at the top of the cell
     * and the line beneath is the line you write on.
     *
     * `writeUnderCaption` is for a TALL cell -- Alaska's DPS mailing-address
     * box is 80 points deep because it expects two or three lines -- where the
     * default would leave a single-line value floating sixty points below its
     * own caption. It places the box directly under the lowest printed line
     * inside the cell instead. BOTH rules are still measured, and the box is
     * still required to sit above the cell's own bottom rule; the flag moves
     * the value inside a measured cell and can never move it out of one.
     */
    const floor = bottom.y + WRITE_BOX_LIFT;
    const ceiling = lowestPrintedLine === null ? top.y - CAPTION_CLEARANCE : lowestPrintedLine - CAPTION_CLEARANCE;
    const boxBottom = cell.writeUnderCaption === true
      ? Math.max(floor, ceiling - MAX_WRITE_BOX_HEIGHT)
      : floor;
    const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
    const writeBox = {
      x: Number((left.x + CELL_INSET).toFixed(2)),
      y: Number(boxBottom.toFixed(2)),
      width: Number((right.x - left.x - CELL_INSET * 2).toFixed(2)),
      height: Math.max(0, height)
    };
    measured.push({
      ...cell, writeBox, rect: writeBox,
      tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
      placedUnderCaption: cell.writeUnderCaption === true,
      sitsAboveTheCellsOwnBottomRule: boxBottom >= bottom.y,
      lowestPrintedLineInCell: lowestPrintedLine,
      rectBasis:
        "measured_table_cell: four strokes read from the page content stream — the rule above, the rule below, "
        + "and the vertical divider on each side, each re-checked against the pinned binary",
      measuredCell: {
        topRuleY: top.y, bottomRuleY: bottom.y, leftDividerX: left.x, rightDividerX: right.x,
        leftDividerCoversCell: Number(overlapOf(left).toFixed(4)),
        rightDividerCoversCell: Number(overlapOf(right).toFixed(4)),
        topRuleSpan: [top.x, top.endX], bottomRuleSpan: [bottom.x, bottom.endX]
      },
      printedTextInThisCell: printedInCell.slice(0, 10).map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), extracted: t.text }))
    });
  }
  return { measured, drift, pageCount: pages.length };
}

/* ---- an AcroForm document's own census, read from the document ---------------- *
 * Every write box is the widget's own /Rect, read from the binary. No box is
 * derived from a caption position; the caption is captured separately and
 * decides only what a blank MEANS, never where it is.
 */
const FIELD_TYPE = (f) => {
  const n = f.constructor?.name ?? "";
  if (n === "PDFTextField") return "text";
  if (n === "PDFCheckBox") return "checkbox";
  if (n === "PDFRadioGroup") return "radio";
  if (n === "PDFDropdown") return "dropdown";
  if (n === "PDFOptionList") return "optionlist";
  return "unknown";
};

/*
 * MEASURED CAPTION CORRECTIONS.
 *
 * CR-218 prints every caption BELOW the rule it captions. The shared capture
 * (rcap-pdf-anchor-capture.mjs) looks above and to the left, so on this form it
 * reaches for the caption of the row ABOVE or finds nothing at all. The
 * finalizer's protect test runs on `effectiveLabel ?? name` before anything
 * else, so a caption that belongs to another blank does not merely mislabel
 * this one -- it decides it.
 *
 * This family writes six blanks and refuses nine. Corrections are recorded only
 * where the capture returns a caption this form does not print at that widget,
 * measured from the unlocked derivative's own page-1 content stream (the
 * derivative is proved equivalent to the pinned binary content stream for
 * content stream, so a position read from it is a position on the official
 * form).
 *
 * A correction that does not correct the caption it names is refused by
 * censusAcroForm below rather than applied, so a capture repaired upstream
 * stops this build instead of being silently overridden. The table is
 * populated from that refusal: this build was run once with it empty, the
 * captures were read from the census, and only the ones that are wrong are
 * corrected here.
 *
 * WHAT THIS DOES NOT DO. It does not disable, weaken or bypass a protect rule.
 * The protect test still runs, on the corrected caption AND on the field name.
 * It does not touch the shared capture, which every builder in the corpus sits
 * on and which this lane may not change; the finding stays reported in
 * build-findings.json for the lane that owns it.
 */
const CAPTION_CORRECTIONS = {
  "CR-218": {
    /*
     * THE MIS-WRITE. The conviction-date blank in paragraph 1 was captured with
     * the OPENING OF THE LINE ABOVE, truncated mid-word at "1.Defendant was c",
     * and the word "Defendant" in it matched the full-name descriptor: the
     * finalizer bound participant.full_legal_name and drew the participant's
     * NAME on the date-of-conviction rule of a sworn motion, so paragraph 1
     * would have read "convicted of the following crime of ____ on Casey
     * Lorraine Thibodeau." Measured on the pinned form: the widget is
     * x[159.50,324.00] y[511.90,525.60], and the words printed on its own line
     * to its left, beginning at x=72.00 y=513.20, are "on (mm/dd/yyyy) ."; the
     * captured string is printed at y=528.00, a whole line above.
     *
     * The correction alone would be enough to stop the wrong fact binding, and
     * it is not relied on alone: the field is ALSO refused by role in the
     * document's `unwritable` list, because a conviction date is a fact no held
     * record establishes for anybody. Role is tested before any caption and is
     * not overridable, so the true reason is the one that decides.
     */
    "on mmddyyyy": {
      capturedLabel: "1.Defendant was c",
      measuredLabel: "on (mm/dd/yyyy)",
      measuredAt: "page 1 rect x[159.50,324.00] y[511.90,525.60]; the form's own content stream prints \"on (mm/dd/yyyy) . This crime is eligible for sealing under 15 M.R.S. \u00a7\" as one run beginning x=72.00 y=513.20, on the widget's own line and to its left. The captured string is the first 17 characters of \"1.Defendant was convicted of the following crime of (name of crime)\", printed at x[54.00,398.69] y=528.00 -- the line above"
    },
    /*
     * THE DOCKET NUMBER, REFUSED ON A CAPTION FROM THE ROW BELOW. Captured
     * "Location (Town", which is printed at y=675.48; nothing matched it and
     * the caption block shipped with no docket number at all.
     */
    Text1: {
      capturedLabel: "Location (Town",
      measuredLabel: "Docket No.:",
      measuredAt: "page 1 rect x[415.50,658.80,581.20,671.30] as (x0,y0,x1,y1) = x[415.50,581.20] y[658.80,671.30]; the form prints \"Docket No.:\" at x[354.96,388.08] y=660.24, on the widget's own line and 27.4pt to its left. The captured \"Location (Town\" is printed at x[354.96,403.59] y=675.48, the row above"
    },
    /*
     * THE COUNTY, which bound correctly through its FIELD NAME while carrying
     * the caption of the row below. Corrected because the map, the disclosure
     * table and the refusal records all quote the effective label, and a
     * caption from another blank is a false statement about the paper.
     */
    County: {
      capturedLabel: "Location (Town",
      measuredLabel: "County:",
      measuredAt: "page 1 rect x[400.60,581.00] y[687.40,701.90]; the form prints \"County:\" at x[354.96,386.26] y=690.60, on the widget's own line and 14.3pt to its left. The captured \"Location (Town\" is printed at y=675.48, the row below"
    },
    "Location Town": {
      capturedLabel: null,
      measuredLabel: "Location (Town):",
      measuredAt: "page 1 rect x[441.50,581.50] y[672.20,686.60]; the form prints \"Location (Town:)\" at x[354.96,403.59] y=675.48, on the widget's own line and to its left. The capture reached nothing"
    },
    Defendant: {
      capturedLabel: null,
      measuredLabel: "Defendant",
      measuredAt: "page 1 rect x[31.70,237.70] y[672.20,686.80]; the form prints \"Defendant\" at x[242.28,280.12] y=675.48, on the widget's own line and 4.6pt to its right -- this form prints its captions after and below the rules they caption. The capture, which looks above and to the left, reached nothing"
    },
    "Defendants DOB mmddyyyy": {
      capturedLabel: "mm/dd/yyyy)",
      measuredLabel: "Defendant's DOB (mm/dd/yyyy):",
      measuredAt: "page 1 rect x[202.60,324.10] y[642.40,656.90]; the form prints the whole caption as one run at x[36.48,198.43] y=645.60, on the widget's own line and ending 4.2pt before it. The capture returned only its last eleven characters, which is why the printed order the field asks for is named explicitly in printedDateOrder rather than inferred from a fragment"
    },
    "1 Defendant was convicted of the following crime of name of crime": {
      capturedLabel: "1.Defendant was convicted of the following crime of (name of",
      measuredLabel: "1. Defendant was convicted of the following crime of (name of crime)",
      measuredAt: "page 1 rect x[401.20,576.10] y[526.70,541.20]; the form prints the whole sentence at x[54.00,398.69] y=528.00, on the widget's own line and ending 2.5pt before it. The capture cut it at 60 characters, which is CAPTION_MAX_CHARS in scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs"
    },
    /*
     * THE SIGNATURE LINE THE FORM LEAVES UNNAMED. The widget's field name is
     * the literal string "undefined" and the capture returned a stray
     * two-glyph run, so nothing about it said "signature" and it was refused
     * only because no descriptor happened to match. Corrected so the protect
     * test refuses it as what it is.
     */
    undefined: {
      capturedLabel: "\u0001y",
      measuredLabel: "Defendant's Signature",
      measuredAt: "page 1 rect x[324.00,580.70] y[229.30,243.80]; the form prints \"Defendant's Signature\" at x[329.40,455.53] y=217.10, directly beneath the widget. The captured \"\\u0001y\" is a stray two-glyph run at x[306.96,326.76] y=232.40"
    },
    /*
     * THE TWO MAILING-ADDRESS LINES, REFUSED AS ATTORNEY-PROTECTED. Both were
     * captured with the parenthetical of the attorney line -- "(Having an
     * attorney is not required for filing)" -- which is a protected category,
     * so the narrative pass refused both and the delivered motion carried no
     * address for the defendant while the platform held one.
     */
    1: {
      capturedLabel: "(Having an attorney is not required fo r filing)",
      measuredLabel: "Defendant's Mailing Address",
      measuredAt: "page 1 rect x[324.00,580.70] y[180.10,194.60]; the form prints \"Defendant's Mailing Address\" at x[329.40,491.56] y=153.10, beneath this widget and the one below it, which are the two lines of that block. The captured attorney parenthetical is printed at x[35.76,294.47] y=168.00 -- a different column, ending 29.5pt to the left of this widget"
    },
    2: {
      capturedLabel: "(Having an attorney is not required fo r filing)",
      measuredLabel: "Defendant's Mailing Address",
      measuredAt: "page 1 rect x[324.00,580.70] y[165.00,179.50]; the second line of the same block, captioned by the same printed run at x[329.40,491.56] y=153.10, on the same reasoning as the line above"
    },
    "Defendants Attorney and Maine Bar No": {
      capturedLabel: null,
      measuredLabel: "Defendant's Attorney and Maine Bar No. (Having an attorney is not required for filing)",
      measuredAt: "page 1 rect x[31.40,252.10] y[195.20,209.80]; the form prints \"Defendant's Attorney and Maine Bar No.\" at x[35.76,263.85] y=181.70 and its parenthetical at x[35.76,294.47] y=168.00, both beneath the widget. The capture reached nothing"
    }
  }
};

/** Corrections actually applied, so the report states them rather than implying them. */
const captionCorrectionsApplied = [];

async function censusAcroForm(bytes, documentId = null) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageIndexOfRef = new Map(pages.map((p, i) => [p.ref, i + 1]));
  const form = doc.getForm();
  const raw = form.getFields().map((f) => {
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      return {
        page: pageIndexOfRef.get(w.P()) ?? null,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height }
      };
    });
    return {
      name: f.getName(),
      type: FIELD_TYPE(f),
      multiline: (() => { try { return f.isMultiline?.() === true; } catch { return false; } })(),
      maxLength: (() => { try { return f.getMaxLength?.() ?? null; } catch { return null; } })(),
      widgets
    };
  });
  // Captions, page by page, so a widget's printed label comes from the page it
  // actually sits on.
  const byPage = new Map();
  for (const f of raw) for (const w of f.widgets) {
    if (!w.page) continue;
    if (!byPage.has(w.page)) byPage.set(w.page, []);
    byPage.get(w.page).push({ name: f.name, rect: w.rect });
  }
  const labelOf = new Map();
  for (const [pageNo, widgets] of byPage) {
    const context = captureWidgetContext(pages[pageNo - 1], widgets, { isFirstPage: pageNo === 1 });
    for (const c of context) if (!labelOf.has(c.name)) labelOf.set(c.name, c);
  }
  const corrections = (documentId && CAPTION_CORRECTIONS[documentId]) || {};
  const fields = raw.map((f) => {
    const c = labelOf.get(f.name) ?? {};
    const captured = c.effectiveLabel ?? null;
    const fix = Object.prototype.hasOwnProperty.call(corrections, f.name) ? corrections[f.name] : null;
    if (fix) {
      /* A correction that does not correct the caption it names is a stale
       * record, and a stale record is worse than none: it would silently keep
       * overriding a capture that had already been repaired upstream. */
      if (captured !== fix.capturedLabel) {
        throw new Error(
          `caption correction for ${documentId}.${f.name} expected the capture to return ` +
          `${JSON.stringify(fix.capturedLabel)} and it returned ${JSON.stringify(captured)}; ` +
          `re-measure the printed caption before this correction is used`);
      }
      captionCorrectionsApplied.push({
        document: documentId, field: f.name, capturedLabel: fix.capturedLabel,
        measuredLabel: fix.measuredLabel, measuredAt: fix.measuredAt
      });
    }
    return {
      ...f,
      effectiveLabel: fix ? fix.measuredLabel : captured,
      labelBasis: fix ? "measured_from_the_pinned_forms_own_300_dpi_raster_and_rule_strokes" : (c.labelBasis ?? null),
      regionHeading: c.regionHeading ?? null,
      regionIsDocumentTitle: c.regionIsDocumentTitle ?? false
    };
  });
  const documentTextLines = pages.flatMap((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text));
  return { fields, documentTextLines, pageCount: pages.length };
}

/* ---- what the official page actually carries, read from its own bytes -------- *
 * The finalizer's report says what this build BELIEVES it wrote. This says what
 * the paper shows, and it is the only channel that can catch the two failures
 * the report structurally cannot: ink that landed outside every box this family
 * measured, and ink sitting on a blank the map refused.
 *
 * The source's own printed text is subtracted first, by position and content,
 * because an official form prints captions inside and beside the very boxes it
 * strokes — counting those as our ink would report every form as defective.
 * What remains is exactly what this build added.
 */
const INK_TOLERANCE = 2.5;

async function itemsOfDocument(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => extractTextItems(page).map((t) => ({
    x: t.x, y: t.y, text: String(t.text ?? ""), width: t.width ?? 0
  })));
}

const inkKey = (t) => `${Math.round(t.x)}|${Math.round(t.y)}|${t.text}`;
const insideBox = (t, box) =>
  t.x >= box.x - INK_TOLERANCE && t.x <= box.x + box.width + INK_TOLERANCE
  && t.y >= box.y - INK_TOLERANCE && t.y <= box.y + box.height + INK_TOLERANCE;

async function auditOfficialInk(sourceBytes, outputBytes, boxes) {
  const source = await itemsOfDocument(sourceBytes);
  const output = await itemsOfDocument(outputBytes);
  const added = [];
  for (const [i, page] of output.entries()) {
    const before = new Map();
    for (const t of source[i] ?? []) before.set(inkKey(t), (before.get(inkKey(t)) ?? 0) + 1);
    for (const t of page) {
      const key = inkKey(t);
      const seen = before.get(key) ?? 0;
      if (seen > 0) { before.set(key, seen - 1); continue; }
      added.push({ page: i + 1, ...t });
    }
  }
  let glyphsOutsideMeasuredWriteBoxes = 0;
  const refusedFieldsWithInk = [];
  const written = boxes.filter((b) => b.written);
  const refused = boxes.filter((b) => !b.written);
  for (const t of added) {
    const glyphs = t.text.replace(/\s+/g, "").length;
    if (glyphs === 0) continue;
    /*
     * Ink is attributed to a WRITTEN box first, and ink a written box
     * accounts for is never also charged to a neighbour.
     *
     * AOC-CR-287 is why. Its petitioner block stacks four widgets 13pt tall
     * at 12pt intervals, so PetitionerAddr1 (y 667-680) and PetitionerAddr2
     * (y 655-668) OVERLAP by a point, and the street address drawn correctly
     * on line one has its origin inside line two's rectangle as well. Charged
     * to both, that reported a refused field carrying ink on a page where
     * nothing had gone wrong -- a false protected-write on a correct build,
     * which is the worst kind of finding because it teaches a reader to
     * distrust the counter.
     *
     * The real defect this test exists for survives the change intact: ink on
     * a refused blank that NO written box explains is still ink nobody
     * accounted for, and is still reported.
     */
    const explainedBy = written.filter((b) => b.page === t.page && insideBox(t, b.rect));
    if (explainedBy.length > 0) continue;
    glyphsOutsideMeasuredWriteBoxes += glyphs;
    for (const b of refused) {
      if (b.page === t.page && b.rect && insideBox(t, b.rect)) {
        refusedFieldsWithInk.push({ fieldId: b.key, drawnText: t.text, page: t.page });
      }
    }
  }
  return {
    addedTextItems: added.length,
    addedGlyphs: added.reduce((n, t) => n + t.text.replace(/\s+/g, "").length, 0),
    glyphsOutsideMeasuredWriteBoxes,
    refusedFieldsWithInk,
    method:
      "every text item of the finished document compared against the pinned source document's own items by "
      + "position and content; what remains is what this build added, and each added item is tested against "
      + "every measured box"
  };
}

/* ---- deterministic composed-page rendering ---------------------------------- */
export function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("Φ", "-");
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

/* ---- field-map helpers, in the maps-with-canonical-and-boundary shape -------- */
function mapHelpers(componentId) {
  const base = (id, label, page = 1) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: isOfficial(componentId)
      ? "measured_table_cell_read_from_the_official_documents_own_rule_strokes"
      : "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId, page = 1) => ({ ...base(id, label, page), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    agencyBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: "court, clerk, prosecutor, agency, or hearing field; the agency completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    /*
     * A control the reader marks, which THIS ROUTE does not determine.
     *
     * Only ever for an election that is genuinely the participant's: a route
     * that determines its own election must state it, and a packet built for
     * one statutory route may never hand that choice back. Every use of this
     * helper carries the reason the route leaves the choice open.
     */
    election: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      isSelectionControl: true, kind: "selection_control",
      reason: "a sworn assertion or legal election the route does not determine",
      category: "participant_sworn_narrative_or_legal_election",
      completenessClass: "participant_sworn_narrative_or_legal_election",
      class: "participant_sworn_narrative_or_legal_election",
      requiredBeforeFiling: false, routeDetermined: false, document: componentId, why
    }),
    /*
     * An ATTORNEY block on a form a self-represented participant files.
     * The platform holds no representation fact, and writing participant
     * data into a block the court reads as counsel's would tell the court
     * something untrue about who is appearing.
     */
    attorneyBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: `attorney-only, and no representation fact is held for this participant: ${why}`,
      category: null, completenessClass: null, class: null,
      requiredBeforeFiling: false, document: componentId, why
    }),
    /*
     * A blank the FORM ITSELF marks optional or conditional: a second address
     * line, a second offence rule, a number the form prints "(if known)".
     * Never for a blank the filing needs — that is a required fact wearing a
     * softer word, and the reason it may stay empty is the form's own, stated
     * here so a reader can check it against the printed page.
     */
    optional: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: `optional participant-authored content, and the platform does not invent it: ${why}`,
      category: null, completenessClass: null, class: null,
      requiredBeforeFiling: false, document: componentId, why
    }),
    rbf: (id, label, what, why, page = 1) => ({
      ...base(id, label, page),
      reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
      document: componentId, why, participantMustSupply: what
    })
  };
}

function composedMap(componentId) {
  const h = mapHelpers(componentId);
  const { writes, refusals } = SPEC.mapFor(componentId, h);
  return {
    formNumber: OFFICIAL[componentId]?.documentId ?? componentId,
    documentId: OFFICIAL[componentId]?.documentId ?? componentId,
    documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: SPEC.componentRoutes?.[componentId] ?? SPEC.routes[0].routeKey,
      ...(SPEC.componentConditions[componentId] ? { conditional: true, conditionDescription: SPEC.componentConditions[componentId] } : {})
    },
    structuralClass: isOfficial(componentId) ? "official_flat_document_with_measured_overlay" : "composed_document",
    composedFrom: isOfficial(componentId) ? null : SPEC.composedFromNote,
    officialSource: isOfficial(componentId)
      ? { sourceId: OFFICIAL[componentId].sourceId, sha256: OFFICIAL[componentId].sha256 } : null,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the writes ------------------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. For an overlaid official document
 * that is the page's own drawn text, which is where a flat overlay puts it. */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName, drawnValues) {
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
    const componentId = map.documentRole;
    const componentText = String(textOfComponent.get(componentId) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      // An official document's value is what the overlay actually drew, which
      // the fitter may have shrunk but never rewrites; a composed page's value
      // is the fact itself. A field the overlay REFUSED is not asserted here,
      // because the refusal is the record and inventing ink to match it would
      // be the defect this proof exists to catch.
      const drawn = drawnValues.get(`${componentId} ${w.field}`);
      if (isOfficial(componentId) && drawn === undefined) continue;
      const value = sanitizePdfText(String(drawn ?? facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${componentId}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${componentId}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: componentId, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ----------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: r.isSelectionControl === true,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      /*
       * THE THREE DECLARED CHANNELS THIS BUILDER'S OWN COUNT USED TO DROP.
       *
       * `classifyBlank` reaches NOT_APPLICABLE_ON_THIS_ROUTE only when a named
       * `routeConditionThatMakesItInapplicable` arrives, and it reaches
       * REQUIRED_BEFORE_FILING on a selection control only when
       * `determinedByTheCaseNotTheRoute` arrives with the reason beside it. The
       * shared build core this family copied forwarded neither, so every row
       * using either channel was classified here as if it had declared nothing,
       * while verify-packet-completeness.mjs, which forwards all three, reads
       * exactly the same field map correctly.
       *
       * That is the same defect the repository verifier's own comments record
       * twice ("this reader has silently dropped a key the contract decides
       * on"), arriving in a builder's self-count instead. A self-count that
       * cannot see a declaration the contract honours reports defects a family
       * does not have, and the temptation is then to reword the packet until
       * the wrong reader agrees. Forwarded verbatim; nothing is decided here.
       */
      ...(Object.hasOwn(r, "routeConditionThatMakesItInapplicable")
        ? { routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable ?? null } : {}),
      ...(Object.hasOwn(r, "determinedByTheCaseNotTheRoute")
        ? { determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true } : {}),
      ...(Object.hasOwn(r, "whyTheRouteCannotDetermineIt")
        ? { whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null } : {}),
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
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const r of p.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: p.fixture, field: r.fieldId ?? r, why: "a field the map refused carries ink in the output" });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------- */
function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(SPEC.components.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.documentRole, documentId: m.documentId, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

/*
 * WHAT THE COMMITTED RECORD ITSELF DECLARES MUST BE DONE BEFORE FILING.
 *
 * Read from the committed packet-set manifest AT BUILD TIME, by packet set id,
 * and printed verbatim. Three Illinois builders in this sprint printed none of
 * their own packet set's requiredBeforeFiling list because they never
 * referenced the record, and nine zero counters never saw it: the completeness
 * verifier reads canonical-side records and does not read
 * participant-instructions.md against the controlling record at all.
 *
 * So this is not a copy of the list. It IS the list, resolved from the bytes
 * whose SHA-256 the source receipt records, and a build whose record has
 * stopped declaring it STOPS rather than printing a guide the record no longer
 * supports.
 */
function declaredRequiredBeforeFiling() {
  const abs = path.join(ROOT, PACKET_SET_MANIFESTS);
  if (!fs.existsSync(abs)) {
    return { ok: false, why: `the committed packet-set manifest is not at ${PACKET_SET_MANIFESTS}` };
  }
  const bytes = fs.readFileSync(abs);
  let manifest;
  try { manifest = JSON.parse(bytes.toString("utf8")); }
  catch (error) { return { ok: false, why: `the committed packet-set manifest does not parse: ${error.message}` }; }
  const set = (manifest.packetSets ?? []).find((s) => s.packetSetId === PACKET_SET_ID);
  if (!set) {
    return { ok: false, why: `the committed packet-set manifest no longer carries packet set ${PACKET_SET_ID}` };
  }
  const items = (set.requiredBeforeFiling ?? []).map((s) => String(s)).filter((s) => s.trim().length > 0);
  if (items.length === 0) {
    return { ok: false, why: `packet set ${PACKET_SET_ID} no longer declares a requiredBeforeFiling list` };
  }
  const components = (set.components ?? []).map((c) => ({
    componentId: c.componentId, role: c.role, requirement: c.requirement,
    outputStrategy: c.outputStrategy, officialFormId: c.officialFormId ?? null,
    conditionDescription: c.conditionDescription ?? null
  }));
  if (components.length === 0) {
    return { ok: false, why: `packet set ${PACKET_SET_ID} no longer declares any components` };
  }
  return {
    ok: true, items, components,
    path: PACKET_SET_MANIFESTS, packetSetId: PACKET_SET_ID,
    packetSetVersion: set.version ?? null,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  };
}

/*
 * THE SENTENCES THIS JURISDICTION'S COMMITTED RECORD REQUIRES THE GUIDE TO
 * CARRY, ASSERTED OVER THE GENERATED BYTES.
 *
 * The host this family copied carries a Maine gate that forbids a word. West
 * Virginia forbids none - "expungement" is the statutory term and is printed in
 * the title of the form itself - so the gate is turned around rather than
 * dropped: the same discipline, applied to statements the record makes and a
 * participant is worse off for not being told.
 *
 * The list is REQUIRED_PHRASES above. It is checked against the generated guide
 * before a byte of the overlay directory exists, so a later edit cannot quietly
 * lose one, and a family that loses one stops with its directory untouched. The
 * function keeps the host's name and return shape so the caller is unchanged.
 */
function forbiddenWordBreaches(markdown) {
  const hay = String(markdown);
  return REQUIRED_PHRASES
    .filter((phrase) => !hay.includes(phrase))
    .map((phrase) => ({
      at: null,
      matched: phrase,
      context:
        "the committed record makes this statement and the generated participant guide does not carry it; "
        + "the packet is not built without it"
    }));
}

function participantInstructions(maps, rbf, declared) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${SPEC.instructionsHeading}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  out.push("## Who decides this, and what you do not file", "");
  for (const p of SPEC.whoDecides) out.push(p, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c}\` | ${SPEC.componentDescriptions[c]} |`);
  out.push("");

  out.push("## Where this goes", "");
  for (const p of SPEC.filingDestination) out.push(p, "");

  out.push("## What it costs", "");
  for (const p of SPEC.feeAndWaiver) out.push(p, "");

  out.push("## Who else has to be told", "");
  for (const p of SPEC.service) out.push(p, "");

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    out.push("## Documents you must obtain first", "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is a labelled blank on the page named beside it. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${SPEC.componentTitles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## Everything the committed record requires before you file", "");
  out.push(
    `These ${declared.items.length} items are printed word for word from the committed packet-set manifest for `
    + `packet set \`${declared.packetSetId}\` (version ${declared.packetSetVersion ?? "unversioned"}), read from `
    + `\`${declared.path}\` at build time. The file's SHA-256 is \`${declared.sha256}\`. Nothing here is this `
    + "packet's own restatement of the record: if the record changes, this list changes with it, and if the "
    + "record stops declaring it the packet is not built.", "");
  for (const item of declared.items) out.push(`- ${item}`);
  out.push("");

  out.push("### The components the same record declares for this packet set", "");
  out.push("| Component | Role | Required | How it is produced | Official form |", "| --- | --- | --- | --- | --- |");
  for (const c of declared.components) {
    out.push(`| \`${c.componentId}\` | ${c.role} | ${c.requirement}${c.conditionDescription ? ` — ${c.conditionDescription}` : ""} | ${c.outputStrategy} | ${c.officialFormId ?? "—"} |`);
  }
  out.push("");
  out.push(
    "The three `process_guidance` components are carried in this document rather than as separate PDFs. The "
    + "committed track registry records why: the record-gathering step is preparation before filing and the "
    + "follow-through step is ordinary post-filing handoff, so neither is a legally distinct unit. The "
    + "good-character affidavit request is guidance for the same reason — the affidavits are third parties' "
    + "sworn statements and this platform builds the request and does not draft the content.", "");

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  if ((SPEC.notTold ?? []).length > 0) {
    out.push("## What this packet does not tell you, and who does", "");
    for (const n of SPEC.notTold) out.push(`- ${n}`);
    out.push("");
  }

  out.push("## When to stop and get help", "");
  for (const s of SPEC.stopConditions) out.push(`- ${s}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(SPEC.whatThisIsNot, "");
  out.push(`_Route(s): ${SPEC.routes.map((r) => r.routeKey).join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------------ */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveRecords();
  const { bound, failures: sourceFailures } = resolveOfficialDocuments();
  if (failures.length > 0 || sourceFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE",
      failedSourceIdentities: [...failures, ...sourceFailures],
      why: "a committed record or a bound official document this family builds from is missing, unmounted, or no longer carries what this build relies on; nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }
  /*
   * TRANSPORT, BEFORE ANY CENSUS. A document whose spec declares transportUnlock
   * is carried through a proved-equivalent decryption; every later step -- the
   * census, the finalizer and the ink audit -- then reads the derivative, which
   * has been proved equal to the official binary rather than assumed to be.
   */
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "pf07-me-transport-"));
  const transportRecords = [];
  for (const b of bound) {
    if (!b.doc.transportUnlock) continue;
    const unlocked = unlockBoundDocument(b, scratchDir);
    if (!unlocked.ok) {
      fs.rmSync(scratchDir, { recursive: true, force: true });
      return {
        familyId: SPEC.familyId, status: "STOPPED",
        stopClass: "UNLOCKED_DERIVATIVE_IS_NOT_EQUIVALENT_TO_THE_OFFICIAL_BINARY",
        why: unlocked.why, sourceId: b.doc.sourceId, pinnedSha256: b.doc.sha256,
        evidence: unlocked.record ?? null,
        overlayDirectoryTouched: false
      };
    }
    b.officialBytes = b.bytes;
    b.bytes = fs.readFileSync(unlocked.derivedPath);
    b.transport = unlocked.record;
    transportRecords.push({ sourceId: b.doc.sourceId, documentId: b.doc.documentId, ...unlocked.record });
  }

  const boundByComponent = new Map(bound.map((b) => [b.componentId, b]));

  // Every cell this family writes into is measured from the official
  // document's own strokes before anything is drawn. A cell that does not
  // measure stops the family rather than being drawn at a guessed rectangle.
  // An AcroForm document is censused once, from the document itself, and the
  // census is reused for both fixtures: the geometry is a property of the form,
  // not of the facts written onto it.
  const censusByComponent = new Map();
  for (const b of bound) {
    if (b.doc.acroform === true) censusByComponent.set(b.componentId, await censusAcroForm(b.bytes, b.doc.documentId));
  }

  const cellsByComponent = new Map();
  const allDrift = [];
  for (const b of bound) {
    const cells = SPEC.officialCells?.[b.componentId] ?? [];
    if (cells.length === 0) { cellsByComponent.set(b.componentId, []); continue; }
    const { measured, drift } = await measureCells(b.bytes, cells);
    cellsByComponent.set(b.componentId, measured);
    for (const d of drift) allDrift.push({ component: b.componentId, ...d });
  }
  if (allDrift.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", geometryDrift: allDrift,
      why: "a write box could not be measured from the official document's own rule strokes; nothing is drawn at a guessed rectangle",
      overlayDirectoryTouched: false
    };
  }

  /*
   * Every censused field of every AcroForm document appears in the field map
   * exactly once, as a write or as a classified blank.
   *
   * The completeness audit reads the MAP, not the form: a field left out of
   * the map is a field nothing asks about, and a hundred and nineteen-field
   * petition could pass on nine declared rows. So the map is checked against
   * the document's own census before anything is rendered, and a family that
   * does not cover its own form stops rather than shipping a partial audit.
   */
  const coverageFailures = [];
  for (const b of bound) {
    if (b.doc.acroform !== true) continue;
    const census = censusByComponent.get(b.componentId);
    const { writes, refusals } = SPEC.mapFor(b.componentId, mapHelpers(b.componentId));
    const prefix = `${b.componentId}.`;
    const declared = [...writes, ...refusals].map((r) => String(r.field).slice(prefix.length));
    const seen = new Set();
    const twice = [];
    for (const d of declared) { if (seen.has(d)) twice.push(d); seen.add(d); }
    const censused = new Set(census.fields.map((f) => f.name));
    const missing = [...censused].filter((n) => !seen.has(n));
    const unknown = [...seen].filter((n) => !censused.has(n));
    if (missing.length || unknown.length || twice.length) {
      coverageFailures.push({
        component: b.componentId, documentId: b.doc.documentId,
        censusedFields: censused.size, declaredRows: declared.length,
        censusedButNotDeclared: missing, declaredButNotOnTheForm: unknown, declaredTwice: twice
      });
    }
  }
  if (coverageFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED", stopClass: "FIELD_MAP_DOES_NOT_COVER_THE_FORM",
      why:
        "the completeness audit reads the field map rather than the form, so a censused field missing from "
        + "the map is a blank nothing asks about; this family does not cover its own document and nothing was "
        + "rendered",
      coverageFailures, overlayDirectoryTouched: false
    };
  }

  /*
   * THE RECORD THE GUIDE PRINTS FROM, RESOLVED BEFORE ANYTHING IS RENDERED.
   *
   * participant-instructions.md prints the committed packet-set manifest's own
   * requiredBeforeFiling list and its own component table. If the record has
   * stopped declaring either, the guide would silently become this builder's
   * own account of a record that no longer says it. That is a stop, not a
   * degraded build, and it is taken here so that a family which stops leaves
   * its overlay directory untouched.
   */
  const declaredRecord = declaredRequiredBeforeFiling();
  if (!declaredRecord.ok) {
    return {
      familyId: SPEC.familyId, status: "STOPPED",
      stopClass: "RECORD_NO_LONGER_DECLARES_WHAT_THE_PACKET_PRINTS",
      why: declaredRecord.why,
      record: PACKET_SET_MANIFESTS, packetSetId: PACKET_SET_ID,
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = SPEC.components.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      officialDocumentsBound: bound.map((b) => ({ sourceId: b.doc.sourceId, sha256: b.doc.sha256, custody: b.custody })),
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      cellsMeasured: [...cellsByComponent.values()].reduce((n, c) => n + c.length, 0),
      components: SPEC.components,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  /*
   * THE GUIDE IS BUILT AND GATED BEFORE ANYTHING IS WRITTEN.
   *
   * The field map, the required-before-filing list and the participant guide
   * are all pure functions of the SPEC and the committed records, so they can
   * be produced -- and refused -- before a single byte of this family's output
   * directory is created. That ordering is the point: a family that stops must
   * leave its overlay directory byte-for-byte unchanged, and a guide checked
   * after the fixtures were rendered would have stopped a family that had
   * already half-written itself.
   */
  const maps = SPEC.components.map((c) => composedMap(c));
  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf, declaredRecord);
  const wordBreaches = forbiddenWordBreaches(instructionsText);
  if (wordBreaches.length > 0) {
    fs.rmSync(scratchDir, { recursive: true, force: true });
    return {
      familyId: SPEC.familyId, status: "STOPPED",
      stopClass: "FORBIDDEN_JURISDICTION_WORD_IN_PARTICIPANT_COPY",
      why:
        "the committed track registry directs that Maine participant copy never use the word "
        + "\"expungement\"; this guide uses it outside the sentences that exist to say Maine does not have it",
      breaches: wordBreaches,
      overlayDirectoryTouched: false
    };
  }

  const blocked = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, STALE_BLOCK), "utf8")).hashes ?? []);
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];
  const overlayReports = [];
  const inkAudits = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${SPEC.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];
    const drawnValues = new Map();

    for (const componentId of SPEC.components) {
      let componentBytes;
      let sourceSha = null;
      if (isOfficial(componentId)) {
        const b = boundByComponent.get(componentId);
        sourceSha = b.doc.sha256;
        let bytes;
        let report;
        let boxes;
        if (b.doc.acroform === true) {
          // An AcroForm document. Every decision about what MAY be written is
          // the shared semantics'; this supplies only the family's own explicit
          // mappings and its role classification, and then proves the result
          // from the artifact bytes rather than from the finalizer's report.
          const census = censusByComponent.get(componentId);
          const result = await finalizeOfficialForm({
            sourceBytes: b.bytes,
            /* The digest of the bytes actually handed over. Where a document was
             * carried through transport that is the proved-equivalent
             * derivative; the OFFICIAL identity is b.doc.sha256 and it is what
             * the receipt binds. */
            expectedSha256: b.transport ? b.transport.derivedSha256 : b.doc.sha256,
            census: census.fields,
            facts,
            explicitMappings: b.doc.explicitMappings ?? {},
            /* One held fact on the ruled line the form prints for it, where no
             * shared descriptor reaches the printed caption. Named per document
             * and empty for every document that does not name it, so the
             * petition is byte-unaffected. See the fee_waiver document's
             * narrativeLines note for the refusal it answers. */
            narrativeAcrossFields: b.doc.narrativeLines ?? [],
            /* The order the form prints beneath the blank, named per field by
             * this caller because this caller read the printed line. */
            printedDateOrderByField: b.doc.printedDateOrder ?? {},
            unwritableFields: (b.doc.unwritable ?? []).map((u) => ({ field: u.field, class: u.class })),
            captionOnly: b.doc.captionOnly === true,
            documentTextLines: census.documentTextLines,
            evaluateDeclaredMinimumSize: true,
            alignWidgetFontSizeToFit: true,
            /*
             * SYNTHESIZED CHECKBOX SQUARES, REFUSED BEFORE THEY ARE DRAWN.
             *
             * pdf-lib's default appearance provider paints a black stroked
             * square sized to the widget /Rect for any check box whose CURRENT
             * /AS state has no /AP /N entry, and flatten() stamps it into page
             * content. VF03 measured exactly that on the delivered bytes of the
             * sibling family nc_145_5_felony-set: 60 such squares across
             * AOC-CR-297 and AOC-CV-226, reproduced by a zero-write baseline,
             * so the ink was the sanitizer's and not the family's.
             *
             * The same condition holds on THIS family's binaries: read from the
             * pinned AOC-CR-298 (sha256 8f526257..) and AOC-CV-226 (sha256
             * 74057a13..), the unmarked selection widgets are /AS /Off with
             * /Yes the only state in /AP /N and /MK carrying no /BC and no /BG,
             * so under ISO 32000-1 12.5.5 a conforming viewer paints nothing
             * for the current state. Both AOC forms print their own smaller box
             * at each of those positions, so a synthesized square would hand
             * the participant a doubled outline where the court prints one.
             *
             * Opting in installs an EMPTY appearance for the state the source
             * omitted, so nothing is synthesized and nothing is flattened
             * there. It never touches a widget that ships its own appearance
             * for its current state, a widget of a field this run wrote, a
             * widget with no /AS, or a widget whose /AP /N is a bare stream.
             * Every intended mark and every write is unchanged. The delivered
             * bytes are scanned afterwards by
             * scripts/grade-a-packet-factory-24h/scan-synthesized-widget-borders.mjs,
             * which is the measurement rather than this note.
             */
            suppressSynthesizedAppearances: true,
            title: `${SPEC.jurisdiction} ${b.doc.documentId}`
          });
          bytes = result.bytes;
          report = result.report;
          const writtenNames = new Set(report.written.map((w) => w.field));
          /*
           * THE FINALIZER MAY WRITE NOTHING THE FIELD MAP DOES NOT DECLARE.
           *
           * This family shipped four values onto a sworn petition that its own
           * field map declared blank, and every one of the nine counters read
           * zero over it: the completeness contract reads the map, and the map
           * was telling the truth about what it intended. The gap was between
           * the map and the finalizer, and nothing in the factory was looking
           * at it.
           *
           * So the two are compared here, per document and per fixture, before
           * the bytes go anywhere. A field the finalizer wrote that the map
           * does not declare as a write is a value nobody declared and nobody
           * reviewed, and it stops the family rather than shipping. The
           * comparison is cheap, it is exact, and it is the check that would
           * have caught this the first time.
           */
          {
            const declaredWrites = new Set((SPEC.mapFor(componentId, mapHelpers(componentId)).writes ?? [])
              .map((w) => String(w.field).slice(`${componentId}.`.length)));
            const undeclared = [...writtenNames].filter((n) => !declaredWrites.has(n)).sort();
            if (undeclared.length > 0) {
              return {
                familyId: SPEC.familyId, status: "STOPPED",
                stopClass: "FINALIZER_WROTE_A_FIELD_THE_MAP_DECLARES_BLANK",
                fixture: fixtureName, component: componentId, documentId: b.doc.documentId,
                undeclaredWrites: undeclared.map((field) => ({
                  field,
                  factId: report.written.find((w) => w.field === field)?.factId ?? null
                })),
                why:
                  "the shared finalizer bound and wrote fields this family's field map declares as blanks left "
                  + "for the participant. The nine completeness counters cannot see this: they read the map, "
                  + "and the map is not what was rendered. Nothing was written to the overlay directory.",
                overlayDirectoryTouched: false
              };
            }
          }
          boxes = census.fields.flatMap((f) => (f.widgets ?? []).map((w) => ({
            key: f.name, page: w.page, rect: w.rect, written: writtenNames.has(f.name)
          })));
          for (const w of report.written) {
            const value = resolveFact(facts, w.factId);
            if (value !== undefined && value !== null && String(value) !== "") {
              /*
               * The byte proof looks for the string the page CARRIES, not the
               * string the fact is stored as. Where this build asked for a date
               * in the order the form prints beneath the blank, the ink is
               * "11/06/1990" and a proof that hunted for "1990-11-06" would
               * fail on a correct write -- or, worse, pass on an incorrect one
               * if it were ever relaxed. So the same transformation the
               * finalizer applied is applied here, from the same shared
               * function, and the proof still reads the delivered bytes.
               */
              const order = b.doc.printedDateOrder?.[w.field];
              const drawn = order ? isoDateInPrintedOrder(String(value), order, w.field) : String(value);
              drawnValues.set(`${componentId} ${componentId}.${w.field}`, drawn);
            }
          }
        } else {
          // A flat document. Every value sits on a stroke the form itself drew.
          const cells = cellsByComponent.get(componentId) ?? [];
          const writable = cells.filter((c) => c.fact && !c.tooShallowToWriteIn);
          const result = await finalizeFlatOverlay({
            sourceBytes: b.bytes,
            expectedSha256: b.doc.sha256,
            anchors: writable.map((c) => ({
              label: c.bindingLabel ?? c.label, page: c.page, writeBox: c.writeBox,
              factId: c.fact, protectedRules: []
            })),
            explicitMappings: Object.fromEntries(writable.map((c) => [c.bindingLabel ?? c.label, c.fact])),
            facts,
            documentTextLines: [],
            title: `${SPEC.jurisdiction} ${b.doc.documentId}`
          });
          bytes = result.bytes;
          report = result.report;
          const writtenAnchors = new Set(report.written.map((w) => w.anchor));
          for (const w of report.written) {
            const cell = writable.find((c) => (c.bindingLabel ?? c.label) === w.anchor);
            if (cell) drawnValues.set(`${componentId} ${componentId}.${cell.key}`, String(facts[cell.fact] ?? ""));
          }
          boxes = cells.map((c) => ({
            key: c.key, page: c.page, rect: c.writeBox,
            written: writtenAnchors.has(c.bindingLabel ?? c.label)
          }));
        }
        const ink = await auditOfficialInk(b.bytes, bytes, boxes);
        inkAudits.push({ fixture: fixtureName, component: componentId, documentId: b.doc.documentId, ...ink });
        overlayReports.push({ fixture: fixtureName, component: componentId, documentId: b.doc.documentId, ...report });
        componentBytes = Buffer.from(bytes);
      } else {
        const body = SPEC.composedBody(componentId, facts);
        assert.ok(body.includes(facts["participant.full_legal_name"]),
          `${componentId}: the composed page must carry the participant's name`);
        componentBytes = await renderComposedPdf(body, SPEC.componentTitles[componentId]);
      }
      const component = await PDFDocument.load(componentBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(component, component.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), component: componentId,
          documentId: OFFICIAL[componentId]?.documentId ?? componentId,
          sourcePage: i + 1, sourceSha256: sourceSha
        });
      }
      documents.push(OFFICIAL[componentId]?.documentId ?? componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    if (blocked.has(sha256)) {
      return { familyId: SPEC.familyId, status: "STOPPED", stopClass: "RENDERED_TO_A_BLOCKED_HASH", sha256 };
    }

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName, drawnValues);
    // The ink audit is per OFFICIAL document and is the only channel that can
    // see ink outside a measured box, or ink sitting on a blank the map
    // refused. A composed page raises no such question: this build authored
    // every mark on it.
    const inkHere = inkAudits.filter((a) => a.fixture === fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod:
        "every written fact value read back from the extracted text of its component's own pages in the saved "
        + "packet bytes, and every official document's finished text compared item by item against the pinned "
        + "source document's own text so that only what this build added is measured",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      flattenedWidgetNote:
        "zero by construction rather than by failure: an AcroForm document is flattened into page content "
        + "before it is copied into the packet, and a flat overlay draws into page content to begin with, so "
        + "every mark this family makes is counted as a glyph in the column beside this one",
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:
        inkHere.reduce((n, a) => n + a.glyphsOutsideMeasuredWriteBoxes, 0),
      refusedFieldsWithInk: inkHere.flatMap((a) => a.refusedFieldsWithInk.map((r) => ({ ...r, documentId: a.documentId }))),
      officialInkAudits: inkHere,
      actualWrites: proof.actualWrites
    });

    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: SPEC.components
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: SPEC.assembledPacketRole ?? "assembled_agency_application_packet",
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

  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.worklistGroupId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: STRATEGY,
    custodyClass: SPEC.custodyClass, acquisitionCommissioned: false,
    bindingMethod:
      "committed repository records bound by exact SHA-256 at build time with every relied-on statement re-read "
      + "from the committed bytes as an anchor"
      + (bound.length > 0 ? ", and every official agency document bound by exact SHA-256 resolved through the committed corpus index and its declared custody roots" : ""),
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: true,
    formIdentityNote: SPEC.formIdentityNote,
    agencyTreatmentNote: SPEC.agencyTreatmentNote,
    committedRecords: resolved.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId,
      pathInRepository: r.path, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority",
      role: r.role, anchorStatementsVerified: r.anchorsVerified
    })),
    /*
     * TRANSPORT IS RECORDED BESIDE IDENTITY AND NEVER IN PLACE OF IT. Each entry
     * below binds the OFFICIAL binary by its pinned SHA-256, recomputed from the
     * file on disk. Where the official binary had to be carried through a
     * decryption to be readable at all, the derivative's own digest, the method
     * that produced it and the equivalence that was proved of it are recorded
     * under `transport`, which is not an identity and is not a source.
     */
    transport: transportRecords,
    documents: bound.map((b) => ({
      sourceIds: [b.doc.sourceId], documentId: b.doc.documentId, formNumber: b.doc.formNumber ?? b.doc.documentId,
      officialTitle: b.doc.officialTitle, revision: b.doc.revision ?? null,
      sha256: b.doc.sha256, byteLength: b.bytes.length,
      custody: b.custody, pathInCustody: b.pathInCustody,
      matchedBy: "exact_pinned_sha256_recomputed_from_the_bytes_on_disk",
      ...(b.transport ? { transport: {
        why: b.doc.transportUnlock.why,
        method: b.transport.createdBy,
        derivedSha256: b.transport.derivedSha256,
        derivedByteLength: b.transport.derivedByteLength,
        sourceEncrypted: b.transport.sourceEncrypted,
        derivedEncrypted: b.transport.derivedEncrypted,
        officialSha256UnchangedByTheRead: b.transport.sourceUnchanged,
        equivalenceProvedBy: b.transport.fidelityLogic,
        equivalenceDelta: b.transport.delta,
        pikepdfVersion: b.transport.pikepdfVersion,
        libqpdfVersion: b.transport.libqpdfVersion,
        derivativeIsNotAnIdentity:
          "the bound identity is the official binary above; this derivative is a build-time transport copy, "
          + "is not committed, and is deleted when the build ends"
      } } : {}),
      corpusIndexAgrees: b.entry.sha256 === b.doc.sha256 && b.entry.byteLength === b.bytes.length,
      pageCount: b.entry.pageCount, acroFieldCount: b.entry.acroFieldCount,
      structuralClassObserved: b.entry.structuralClassObserved,
      instrumentKind: b.doc.instrumentKind ?? "participant_agency_application_form",
      /*
       * WHAT WAS ACTUALLY DONE TO THIS DOCUMENT'S PAGES, which is not the same
       * question as whether the family declared measured cells for it. This
       * read "delivered_unmodified" for every AcroForm document in the packet,
       * including the ones this build writes onto and flattens -- a false
       * statement about the delivered bytes sitting in the source receipt,
       * where it is exactly the sentence a reviewer would rely on.
       */
      renderStrategy: (SPEC.officialCells?.[b.componentId] ?? []).length > 0
        ? "measured_flat_overlay"
        : b.doc.acroform === true
          ? `acroform_filled_and_flattened_by_the_shared_official_form_finalizer${b.transport ? "_after_a_proven_equivalent_unlock" : ""}`
          : "delivered_unmodified"
    })),
    composedComponentsAuthoredByThisBuild: SPEC.components.filter((c) => !isOfficial(c)),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family prepares for",
      ...(SPEC.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    renderStrategy: bound.length > 0 ? "measured_flat_overlay_and_composed_pages" : "composed_agency_application",
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: STRATEGY,
    agencyTreatmentNote: SPEC.agencyTreatmentNote ?? null,
    officialForm: bound.length > 0 ? bound.map((b) => b.doc.documentId) : null,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: SPEC.routeSelectionsMade ?? [],
    routeSelectionNote: SPEC.routeSelectionNote,
    measuredCells: Object.fromEntries([...cellsByComponent.entries()].map(([k, v]) => [k, v.map((c) => ({
      key: c.key, page: c.page, label: c.label, fact: c.fact ?? null, rect: c.rect,
      rectBasis: c.rectBasis, measuredCell: c.measuredCell, tooShallowToWriteIn: c.tooShallowToWriteIn
    }))])),
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    boundOfficialDocuments: bound.map((b) => ({ documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: SPEC.familyId, derivedFromArtifactBytes: true,
    note: "Every written fact value was read back from the extracted text of its component's own pages in the saved packet bytes, not from this builder's intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    overlayReports: overlayReports.map((r) => ({
      fixture: r.fixture, component: r.component, documentId: r.documentId,
      sourceSha256: r.sourceSha256, outputSha256: r.outputSha256,
      written: r.written, refused: r.refused, unfittable: r.unfittable
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.documentRole, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: SPEC.familyId,
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
    schemaVersion: "rcap-family-build-status/v1", familyId: SPEC.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: SPEC.buildScript,
    implementationStrategy: STRATEGY,
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
    findings: SPEC.buildFindings,
    /* Stated, not implied: every caption this build corrected before the shared
     * protect test read it, with the capture it replaced and the measurement it
     * rests on. Two entries per fixture build, one per official AcroForm pass. */
    captionCorrectionsApplied
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: SPEC.familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    implementationStrategy: STRATEGY,
    counselQuestionsRaised: SPEC.counselQuestions,
    mattersForTheReviewersAttention: SPEC.reviewersAttention
  });

  fs.rmSync(scratchDir, { recursive: true, force: true });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: SPEC.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: STRATEGY,
    recordsBound: resolved.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    officialDocumentsBound: bound.map((b) => ({ sourceId: b.doc.sourceId, documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
    components: SPEC.components,
    documents: artifacts[0]?.documents ?? [],
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, bytes: a.byteLength, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); if (r.status === "STOPPED" || r.status === "BLOCKED_SOURCE") process.exit(1); })
    .catch((e) => { console.error(e); process.exit(1); });
}
