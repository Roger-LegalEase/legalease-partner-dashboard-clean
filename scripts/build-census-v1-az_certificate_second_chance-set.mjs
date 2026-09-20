#!/usr/bin/env node
/**
 * PF07 official-form packet family — Arizona, standalone application for a
 * Certificate of Second Chance under A.R.S. § 13-905(N), with its proposed
 * order.
 *
 *   node scripts/build-census-v1-az_certificate_second_chance-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-only:AZ:az_certificate_second_chance
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family with two Arizona Supreme Court forms, each
 * bound by exact SHA-256 and delivered as the Administrative Office of the
 * Courts publishes it:
 *
 *   * AOCCRSA3F-103023 — Application for Certificate of Second Chance,
 *     A.R.S. § 13-905, three pages. Page 1 is the caption and the eligibility
 *     elections, page 2 the convictions, the declaration under penalty of
 *     perjury and the defendant's signature block, page 3 the attorney's
 *     declaration.
 *   * AOCCRSA4F-103023 — Order Regarding Application for Certificate of Second
 *     Chance, two pages. Its caption block is the applicant's; everything from
 *     "THE COURT FINDS" onward is the court's and this packet writes on none
 *     of it.
 *
 * NEITHER FORM HAS AN ACROFORM. Both are flat documents, so every value sits
 * on a stroke the form itself drew: each write box is measured from the pinned
 * document's own content stream and a cell that does not measure stops the
 * family rather than being drawn at a guessed rectangle.
 *
 * THE FORM NUMBERS THE MANIFEST NAMES ARE NOT THE ONES THIS PACKET USES, AND
 * THAT IS A RECORDED DETERMINATION RATHER THAN A SUBSTITUTION
 *
 * The committed packet-set manifest names AOCCRSA3F-010122 and
 * AOCCRSA4F-010122. Those editions are not in the corpus. The committed captain
 * determination DET-AZ-SECOND-CHANCE-CURRENT-EDITION-IS-HELD re-points both
 * obligations to the 10/30/2023 edition and binds the held copies, recording
 * that "Both held files exist at their recorded pathInArchive and both SHA-256
 * values recompute exactly", and MASTER_QUEUE carries -010122 in
 * supersededSourceIds. This build binds the -103023 edition by exact SHA-256,
 * reads that determination from the committed record at build time as one of
 * its bound authorities, and STOPS if the determination is no longer there.
 * It does not decide the question itself.
 *
 * WHAT THE COURT WILL NOT LET THIS PACKET SAY
 *
 * The committed track registry holds AZ-8 as a RELEASE blocker: the current
 * revision of both forms must be confirmed on azcourts.gov before runtime
 * release, and both predate the 2024 rule amendments. That is a release gate
 * and not a build gate — the legal input for this family is SETTLED — so the
 * packet is built and the blocker is carried, in terms, into the approval
 * request and into what the source receipt expressly does not establish.
 *
 * THE ELECTIONS THIS ROUTE DOES NOT MAKE
 *
 * Page 1 of the application carries two eligibility elections and an applicant
 * election, and none of them is one this route decides:
 *
 *   * whether the applicant is the Defendant or the Attorney for Defendant;
 *   * whether the applicant previously received a set-aside order that did not
 *     include a certificate, and on what date;
 *   * whether the applicant did NOT previously receive a Certificate of Second
 *     Chance on the set aside of a felony conviction.
 *
 * Each turns on the applicant's own record. Section 13-905(L) allows only one
 * certificate on a felony set-aside, so the second and third are the statutory
 * bar itself; nothing here ticks either. The waiting period the form prints —
 * two years for a class 4, 5 or 6 felony, five years for a class 2 or 3, and
 * immediately for a misdemeanor — likewise turns on an offence class this
 * platform does not determine.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "az_certificate_second_chance-set";

const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const PACKET_SET_ID = "az_certificate_second_chance-set";

/*
 * The four address parts the platform holds, and the two one-line values the
 * Arizona forms print a single rule for. Composed in the FIXTURES from the
 * parts, never in the writer: a form that prints one rule for "City, State, Zip
 * Code" is asking for one value, and refusing it because the shared descriptor
 * registry has no one-line fact would be a held fact left off a filing under a
 * reason that reads like an unavailable one. Same treatment, and the same
 * reasoning, as census-v1-nm_conviction-set.
 */
const compose = (f) => ({
  ...f,
  "participant.city_state_zip": `${f["participant.city"]}, ${f["participant.state"]} ${f["participant.zip"]}`,
  "participant.full_mailing_address":
    `${f["participant.street_address"]}, ${f["participant.city"]}, ${f["participant.state"]} ${f["participant.zip"]}`
});

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-az_certificate_second_chance-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/az/az-certificate-second-chance-set--official-pdf-fill",
  jurisdiction: "AZ",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Application for Certificate of Second Chance, standalone, A.R.S. § 13-905(N)",
  routeName: "applying for a standalone Arizona Certificate of Second Chance under A.R.S. § 13-905(N)",
  statutes: ["A.R.S. § 13-905(K)", "A.R.S. § 13-905(L)", "A.R.S. § 13-905(M)", "A.R.S. § 13-905(N)", "A.R.S. § 12-558.03"],
  routes: [{ routeKey: "obligation:track-only:AZ:az_certificate_second_chance" }],

  records: [
    {
      recordId: "packet-set-manifest:az_certificate_second_chance-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role:
        "the committed packet-set manifest for this exact packet set. It settles the components, the filing "
        + "destination, and the fee, waiver, service and notarisation positions -- each of which, on this "
        + "route, is a statement that the source review did not establish one. Its requiredBeforeFiling list "
        + "is read from these bytes at build time and printed verbatim into participant-instructions.md",
      mustContain: [
        "File in the court of conviction.",
        "The source review does not state a filing fee for the standalone certificate application.",
        "The source review does not address a fee waiver.",
        "The source review does not state a service requirement for the standalone application.",
        "The source review does not state a notarization requirement.",
        "The applicant signs their own application.",
        "\"packetSetId\": \"az_certificate_second_chance-set\""
      ]
    },
    {
      recordId: "track-registry:az_certificate_second_chance",
      path: "data/record-clearing/legal-design-track-registry.json",
      role:
        "the committed legal-design track registry entry for this track. It settles the venue and destination "
        + "this packet states, the waiting-period tiers it explains, the single-certificate bar, the effect of "
        + "the certificate, and the form-currency release blocker the packet carries word for word",
      mustContain: [
        "Statewide Arizona law; file in the court of conviction.",
        "The court of conviction",
        "Where the victim requested post-conviction notice, the attorney for the state notifies them of the application.",
        "Section 13-905(L) allows only one certificate on a felony set-aside, counting multiple felonies from the same act or course of conduct as one.",
        "At least two years since the person fulfilled the conditions of probation or sentence",
        "release from barriers and disabilities in obtaining a Title 32 occupational license if otherwise qualified",
        "an express statement that the certificate is not a recommendation or sponsorship",
        "Current form currency for the standalone certificate-of-second-chance forms AOCCRSA3F and AOCCRSA4F must be confirmed on azcourts.gov before runtime release."
      ]
    },
    {
      /*
       * THE DETERMINATION THAT RE-POINTS THIS FAMILY'S TWO OBLIGATIONS.
       *
       * The manifest names the 01/01/22 editions and the corpus does not carry
       * them. Deciding to build from the 10/30/2023 edition instead is a source
       * identity determination, which a build lane may not make; this one is
       * already made, committed, and read here at build time. If it stops
       * being there this family stops, rather than quietly binding an edition
       * no record re-points it to.
       */
      recordId: "captain-source-identity-determination:DET-AZ-SECOND-CHANCE-CURRENT-EDITION-IS-HELD",
      path: "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json",
      role:
        "the committed captain determination that re-points this family's two obligations from the 01/01/2022 "
        + "editions the packet-set manifest names to the 10/30/2023 editions this packet binds. It is the "
        + "authority for the edition, and this lane makes no such determination of its own",
      mustContain: [
        "DET-AZ-SECOND-CHANCE-CURRENT-EDITION-IS-HELD",
        "Re-point both obligations to the 10/30/2023 edition and bind the held copies. ACQUIRE_EXACT_SOURCE -> ATTACH_HELD_SOURCE.",
        "Both held files exist at their recorded pathInArchive and both SHA-256 values recompute exactly.",
        "It binds an identity at the current edition. It approves no output and opens no route.",
        "A determination fixes an identity or removes an obligation that names nothing. It never invents a form, a fee, a waiver, a service recipient, a filing destination or an eligibility rule, and it never satisfies one identity by binding the binary of another."
      ]
    }
  ],

  officialComponents: {
    application: {
      sourceId: "official-form:AOCCRSA3F-103023",
      documentId: "AOCCRSA3F-103023",
      formNumber: "AOCCRSA3F-103023",
      officialTitle: "Application For Certificate Of Second Chance, A.R.S. § 13-905",
      revision: "REV-2023-10-30",
      instrumentKind: "primary_filing",
      sha256: "4e2b06d403e50f5cd6769b1ebc8d41e918c2a8ab9739b72724829023a548a91a",
      acroform: false,
      supersedes: "official-form:AOCCRSA3F-010122"
    },
    proposed_order: {
      sourceId: "official-form:AOCCRSA4F-103023",
      documentId: "AOCCRSA4F-103023",
      formNumber: "AOCCRSA4F-103023",
      officialTitle: "Order Regarding Application For Certificate Of Second Chance",
      revision: "REV-2023-10-30",
      instrumentKind: "proposed_order",
      sha256: "b3aae63fd8ae2fc891fed28ab2c0807d1b3564921912bc3ae67898aecedc635e",
      acroform: false,
      supersedes: "official-form:AOCCRSA4F-010122"
    }
  },

  /*
   * EVERY WRITING RULE ON BOTH FORMS, declared as a cell so that the field map
   * covers the paper.
   *
   * These are FLAT documents: there is no AcroForm and therefore no census to
   * check the map against, so a printed blank left out of this table is a blank
   * nothing asks about. Both forms were read rule by rule from their own
   * content streams and every horizontal stroke the shared reader returns is
   * declared below, each with the y and the x span it was measured at. The only
   * strokes deliberately not declared are the two 0.75pt borders of the "For
   * Clerk's Use Only" box on page 1 of each form, which are a box outline and
   * not a rule anything is written on.
   *
   * ONE PRINTED BLANK ON THE APPLICATION HAS NO CELL, and it is named rather
   * than hidden: the "on the ___ day of" blank in the judgment sentence on page
   * 2 is a 33.27pt stroke at y=680.97 x[434.93,468.20], and the shared rule
   * reader's minLength is 40pt, so it is not returned as a rule and cannot be
   * measured. It is carried in the field map as a required-before-filing row
   * with no measured rectangle, and named to the participant in the
   * instructions. See build-findings.json.
   */
  officialCells: {
    application: [
      // ---- page 1, the caption block
      /*
       * "Person Filing:" is the caption the form prints, and nothing in the
       * shared descriptor registry matches it -- decideBinding returns
       * no_allowlisted_fact_matches -- so the shared binder refuses the blank
       * outright and the applicant's name went missing from the head of both
       * forms on an earlier build of this family. bindingLabel names a phrase
       * the registry does resolve, "Person Filing Name" ->
       * participant.full_legal_name, for the same blank and the same fact. The
       * printed caption stays what the paper says.
       */
      { key: "person_filing", page: 1, ruleY: 706.97, ruleFromX: 142.80, ruleToX: 396.18,
        label: "Person Filing:", bindingLabel: "Person Filing Name",
        bindingLabelWhy:
          "the rule is the line for the name of the person filing, which on this route is the applicant; the "
          + "shared registry resolves \"Person Filing Name\" to participant.full_legal_name and resolves the "
          + "form's own \"Person Filing:\" to nothing at all",
        fact: "participant.full_legal_name" },
      { key: "address", page: 1, ruleY: 689.72, ruleFromX: 202.08, ruleToX: 396.18,
        label: "Address (if not protected):", fact: "participant.street_address" },
      { key: "city_state_zip", page: 1, ruleY: 672.45, ruleFromX: 180.08, ruleToX: 396.18,
        label: "City, State, Zip Code:", fact: "participant.city_state_zip" },
      { key: "telephone", page: 1, ruleY: 655.20, ruleFromX: 132.05, ruleToX: 396.18,
        label: "Telephone:", fact: "participant.phone" },
      { key: "email_address", page: 1, ruleY: 637.95, ruleFromX: 149.33, ruleToX: 396.18,
        label: "Email Address:", fact: "participant.email" },
      { key: "representing_lawyer_for", page: 1, ruleY: 620.70, ruleFromX: 264.35, ruleToX: 396.18,
        label: "Representing [ ] Self or [ ] Lawyer for", fact: null },
      { key: "lawyers_bar_number", page: 1, ruleY: 603.45, ruleFromX: 186.33, ruleToX: 396.18,
        label: "Lawyer's Bar Number:", fact: null },
      { key: "court_name", page: 1, ruleY: 568.67, ruleFromX: 161.08, ruleToX: 341.16,
        label: "____ COURT OF ARIZONA", fact: null },
      { key: "county", page: 1, ruleY: 548.42, ruleFromX: 217.35, ruleToX: 381.90,
        label: "IN ____ COUNTY", fact: "matter.county" },
      { key: "case_number", page: 1, ruleY: 512.90, ruleFromX: 437.43, ruleToX: 567.23,
        label: "Case Number:", fact: "matter.case_number" },
      { key: "defendant_name", page: 1, ruleY: 478.40, ruleFromX: 77.28, ruleToX: 282.63,
        label: "Defendant (FIRST, MI, LAST)", fact: "participant.full_legal_name" },

      // ---- page 2, the convictions and the declaration
      { key: "case_number_page_2", page: 2, ruleY: 742.97, ruleFromX: 432.18, ruleToX: 576.25,
        label: "Case Number:", fact: "matter.case_number" },
      { key: "judgment_month_and_year", page: 2, ruleY: 680.97, ruleFromX: 504.45, ruleToX: 573.25,
        label: "A Judgment of Guilt was entered in this Court against the defendant on the ___ day of ____", fact: null },
      { key: "count_1", page: 2, ruleY: 646.45, ruleFromX: 180.08, ruleToX: 504.21,
        label: "Count I:", fact: null },
      { key: "count_2", page: 2, ruleY: 629.20, ruleFromX: 180.08, ruleToX: 504.21,
        label: "Count II:", fact: null },
      { key: "count_3", page: 2, ruleY: 611.95, ruleFromX: 180.08, ruleToX: 504.21,
        label: "Count III:", fact: null },
      { key: "count_4", page: 2, ruleY: 594.67, ruleFromX: 180.08, ruleToX: 504.21,
        label: "Count IV:", fact: null },
      { key: "print_defendants_name", page: 2, ruleY: 404.88, ruleFromX: 72.03, ruleToX: 288.13,
        label: "Print Defendant's Name", fact: null },
      { key: "defendants_signature", page: 2, ruleY: 404.88, ruleFromX: 324.13, ruleToX: 576.26,
        label: "Defendant's Signature", fact: null },
      /*
       * The declaration block prints ONE rule captioned "Address", where page 1
       * prints two -- "Address (if not protected):" and "City, State, Zip
       * Code:". One rule is asking for one value, and that value is the whole
       * mailing address.
       *
       * The shared registry has ONE participant address descriptor,
       * participant.street_address, and it resolves this caption to that. The
       * cell writes participant.full_mailing_address instead, which
       * finalizeFlatOverlay allows because it takes the anchor's factId over
       * the decision's: the descriptor decides whether the blank may be written
       * at all, and the cell decides what goes in it. That difference is
       * DECLARED here rather than left to be discovered, and the flat-binding
       * gate stops the family if a cell ever differs from its descriptor
       * without saying so. Writing street_address alone would put an address
       * with no city, state or ZIP under a declaration made on penalty of
       * perjury.
       */
      { key: "declaration_address", page: 2, ruleY: 353.10, ruleFromX: 72.03, ruleToX: 504.21,
        label: "Address", fact: "participant.full_mailing_address",
        descriptorResolvesInsteadTo: "participant.street_address",
        descriptorDifferenceWhy:
          "the form prints one rule where page 1 prints two, so the answer is the whole mailing address; the "
          + "shared registry's only participant address descriptor is participant.street_address, and this "
          + "lane does not open the shared registry" },
      { key: "authorized_attorney_name", page: 2, ruleY: 232.33, ruleFromX: 190.83, ruleToX: 432.18,
        label: "I authorize my Attorney ____ to file this application for a Certificate of Second Chance with the Court.", fact: null },
      { key: "authorization_date", page: 2, ruleY: 146.05, ruleFromX: 72.03, ruleToX: 252.11,
        label: "Date, in the AUTHORIZATION TO PROCEED ON BEHALF OF DEFENDANT block", fact: null },
      { key: "authorization_signature", page: 2, ruleY: 146.05, ruleFromX: 324.13, ruleToX: 576.26,
        label: "Defendant's Signature, in the AUTHORIZATION TO PROCEED ON BEHALF OF DEFENDANT block", fact: null },

      // ---- page 3, the attorney's declaration
      { key: "case_number_page_3", page: 3, ruleY: 742.97, ruleFromX: 432.18, ruleToX: 576.25,
        label: "Case Number:", fact: "matter.case_number" },
      { key: "print_attorney_name", page: 3, ruleY: 637.95, ruleFromX: 72.03, ruleToX: 252.11,
        label: "Print Attorney Name", fact: null },
      { key: "attorney_signature", page: 3, ruleY: 637.95, ruleFromX: 324.13, ruleToX: 576.26,
        label: "Attorney Signature", fact: null },
      { key: "attorney_address", page: 3, ruleY: 586.17, ruleFromX: 72.03, ruleToX: 576.25,
        label: "Attorney Address", fact: null }
    ],
    proposed_order: [
      // ---- page 1, the caption block. Everything below it is the court's.
      { key: "person_filing", page: 1, ruleY: 706.97, ruleFromX: 142.80, ruleToX: 396.18,
        label: "Person Filing:", bindingLabel: "Person Filing Name",
        bindingLabelWhy: "the same blank, the same caption and the same reason as on the application above",
        fact: "participant.full_legal_name" },
      { key: "address", page: 1, ruleY: 689.72, ruleFromX: 202.08, ruleToX: 396.18,
        label: "Address (if not protected):", fact: "participant.street_address" },
      { key: "city_state_zip", page: 1, ruleY: 672.45, ruleFromX: 180.08, ruleToX: 396.18,
        label: "City, State, Zip Code:", fact: "participant.city_state_zip" },
      { key: "telephone", page: 1, ruleY: 655.20, ruleFromX: 132.05, ruleToX: 396.18,
        label: "Telephone:", fact: "participant.phone" },
      { key: "email_address", page: 1, ruleY: 637.95, ruleFromX: 149.33, ruleToX: 396.18,
        label: "Email Address:", fact: "participant.email" },
      { key: "representing_lawyer_for", page: 1, ruleY: 620.70, ruleFromX: 264.35, ruleToX: 396.18,
        label: "Representing [ ] Self or [ ] Lawyer for", fact: null },
      { key: "lawyers_bar_number", page: 1, ruleY: 603.45, ruleFromX: 186.33, ruleToX: 396.18,
        label: "Lawyer's Bar Number:", fact: null },
      { key: "court_name", page: 1, ruleY: 549.92, ruleFromX: 162.58, ruleToX: 342.66,
        label: "____ COURT OF ARIZONA", fact: null },
      { key: "county", page: 1, ruleY: 529.92, ruleFromX: 217.60, ruleToX: 382.15,
        label: "IN ____ COUNTY", fact: "matter.county" },
      { key: "case_number", page: 1, ruleY: 494.15, ruleFromX: 437.43, ruleToX: 567.98,
        label: "Case Number:", fact: "matter.case_number" },

      // ---- page 2, all of it the court's
      { key: "case_number_page_2", page: 2, ruleY: 742.97, ruleFromX: 432.18, ruleToX: 576.25,
        label: "Case Number:", fact: "matter.case_number" },
      { key: "dated_day", page: 2, ruleY: 706.97, ruleFromX: 136.05, ruleToX: 180.08,
        label: "DATED this ___ day of", fact: null },
      { key: "dated_month_and_year", page: 2, ruleY: 706.97, ruleFromX: 216.35, ruleToX: 360.15,
        label: "DATED this ___ day of ____ , ____", fact: null },
      { key: "judicial_officer", page: 2, ruleY: 637.95, ruleFromX: 324.13, ruleToX: 576.26,
        label: "Judicial Officer", fact: null }
    ]
  },

  components: ["application", "proposed_order"],
  componentTitles: {
    application: "AOCCRSA3F-103023 - Application for Certificate of Second Chance (A.R.S. § 13-905)",
    proposed_order: "AOCCRSA4F-103023 - Order Regarding Application for Certificate of Second Chance"
  },
  componentConditions: {},
  componentDescriptions: {
    application: "the Arizona Supreme Court's own application form. Your caption details are filled in; the convictions, the two eligibility elections and your signature are yours",
    proposed_order: "the order the judge signs. Only its caption block is filled in — every finding and every part of the order itself is the court's, and you write on none of it"
  },

  fixtures: {
    canonical: compose({
      "participant.full_legal_name": "Rosa Elena Villanueva",
      "participant.street_address": "1420 East Roosevelt Street, Unit 5",
      "participant.city": "Phoenix",
      "participant.state": "AZ",
      "participant.zip": "85006",
      "participant.phone": "602-555-0146",
      "participant.email": "r.villanueva@example.com",
      "matter.case_number": "CR2016-114872-001",
      "matter.county": "Maricopa"
    }),
    boundary: compose({
      "participant.full_legal_name": "Bartholomew Christiansen-Featherstone",
      "participant.street_address": "88214 North Old Ajo Stagecoach Trail, Space 117",
      "participant.city": "Sierra Vista",
      "participant.state": "AZ",
      "participant.zip": "85635-7412",
      "participant.phone": "(520) 555-0132 ext. 8841",
      "participant.email": "bartholomew.christiansen-featherstone@example-longdomain.org",
      "matter.case_number": "S1100CR201900000884-002",
      "matter.county": "Cochise"
    })
  },

  composedFromNote: null,

  formIdentityNote:
    "Both documents are the Arizona Supreme Court's own published forms at the 10/30/2023 edition, bound by "
    + "exact SHA-256 through the committed corpus index and delivered as the Administrative Office of the "
    + "Courts issues them. The committed packet-set manifest names the 01/01/2022 editions, which the corpus "
    + "does not carry; the committed captain determination "
    + "DET-AZ-SECOND-CHANCE-CURRENT-EDITION-IS-HELD re-points both obligations to the 10/30/2023 edition and "
    + "binds the held copies, and that determination is read from the committed record at build time and "
    + "recorded here as a bound authority. This lane made no determination of its own about which edition is "
    + "the right one.",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated by the instrument: AOCCRSA3F is the Arizona Supreme Court's form for a STANDALONE "
    + "application for a Certificate of Second Chance under A.R.S. § 13-905, filed where the court did not "
    + "include a certificate in an earlier set-aside order, and AOCCRSA4F is the order on it. Within that "
    + "route the application carries three elections and none of them is one this route decides. Whether the "
    + "applicant is the Defendant or the Attorney for Defendant is the participant's own. Whether they "
    + "previously received a set-aside order that did not include a certificate, and on what date, is a fact "
    + "about their own case. Whether they did NOT previously receive a certificate on the set aside of a "
    + "felony conviction is the § 13-905(L) single-certificate bar itself, which the committed track registry "
    + "records as counting multiple felonies from one act or course of conduct as one. Nothing is marked, and "
    + "every box is recorded as the participant's own.",

  routeSelectionsMade: [
    {
      selection: "instrument set",
      value: "AOCCRSA3F-103023 with AOCCRSA4F-103023 as the proposed order",
      determinedBy:
        "the committed packet-set manifest, whose two components name a primary_filing and a proposed_order "
        + "with outputStrategy official_pdf_fill, read together with the committed captain determination that "
        + "re-points both obligations to the 10/30/2023 edition"
    },
    {
      selection: "the standalone certificate application rather than the set-aside application",
      value: "A.R.S. § 13-905(N), applied for after a set-aside order that did not include a certificate",
      determinedBy:
        "the committed track registry's mechanism for this track: \"If the court did not include a certificate "
        + "in the set-aside order, the person may later apply for one after meeting the § 13-905(K) "
        + "requirements\""
    },
    {
      selection: "the edition of both forms",
      value: "the 10/30/2023 edition of each, not the 01/01/2022 edition the packet-set manifest names",
      determinedBy:
        "the committed captain determination DET-AZ-SECOND-CHANCE-CURRENT-EDITION-IS-HELD, bound as a record "
        + "by this build and verified by its own anchor statements at build time"
    }
  ],

  instructionsHeading: "Filing instructions — applying for an Arizona Certificate of Second Chance (A.R.S. § 13-905)",

  instructionsIntro: [
    "This packet is the Arizona Supreme Court's own **Application for Certificate of Second Chance (AOCCRSA3F)** and the **Order Regarding Application for Certificate of Second Chance (AOCCRSA4F)** that the judge signs.",
    "**This is the STANDALONE application.** It is for someone whose conviction has already been set aside where the court did not include a certificate in the set-aside order. If your set-aside is still to come, ask for the certificate on the set-aside application instead — that is one form rather than two.",
    "**What a certificate does, in the committed record's own words.** It releases you from barriers and disabilities in obtaining a Title 32 occupational licence if you are otherwise qualified; it gives your employer the evidentiary protections of A.R.S. § 12-558.03, and gives a housing provider the same protections. And it carries an express statement that the certificate **is not a recommendation or sponsorship**.",
    "The platform filled what it holds and nothing else: your name, your street address, your city, state and ZIP code, your telephone number, your email address, the county and the case number — on the caption block of BOTH forms — and your name again on the Defendant line and your full mailing address on the declaration block of the application.",
    "**You write on the application. You write nothing on the order.** Only the order's caption block is filled in. Everything from \"THE COURT FINDS\" onward — the findings, the denial reasons, the grant, the date and the judicial officer's signature — is the judge's.",
    "**The convictions are yours to list.** Page 2 asks for the date the Judgment of Guilt was entered and for each count you were convicted of. Copy them from the court record, not from memory."
  ],

  whoDecides: [
    "**A judge decides on the application.** The order in this packet is the form that decision is written on, and the judge either denies the application, giving reasons, or grants it under A.R.S. § 13-905.",
    "**The prosecutor gets a copy.** The order's own first finding is that \"The prosecutor has received a copy of the Application for Certificate of Second Chance\", so make sure the court has that copy — ask the clerk how the prosecutor is served in that court.",
    "**A victim may be notified.** The committed track record states it: where the victim requested post-conviction notice, the attorney for the state notifies them of the application.",
    "**Only one certificate on a felony set-aside.** A.R.S. § 13-905(L) allows one, and the committed record notes that multiple felonies from the same act or course of conduct count as one. If you have had a certificate before, this application will be denied.",
    "**If the state or a victim objects, or a hearing is set, or a denial arrives that you want to challenge**, the committed record names each of those as a point where self-help stops. Get an Arizona lawyer."
  ],

  filingDestination: [
    "**File in the court of conviction.** That is the committed manifest's instruction and the committed track record's destination: \"Statewide Arizona law; file in the court of conviction.\"",
    "**Write the court's name on the ____ COURT OF ARIZONA line yourself.** The platform holds your county and has written it on the IN ____ COUNTY line of both forms, but the name of the court that convicted you — the Superior Court, or a justice or municipal court — is a fact about your own case that no record here establishes.",
    "**Check the case number the platform wrote into the caption of both forms** against the court record before you file. It appears on page 1 and again at the top of every later page.",
    "**File the order with the application.** It is the form the judge signs; the court will not usually supply one for you."
  ],

  feeAndWaiver: [
    "**No fee is stated for this application, and that is a gap in the record rather than a promise that it is free.** The committed manifest's own words are \"The source review does not state a filing fee for the standalone certificate application\", and on the waiver, \"The source review does not address a fee waiver.\"",
    "**So ask the clerk of the court of conviction what it costs before you file**, and ask in the same breath what to do if you cannot pay it. Do not assume there is no fee and do not assume there is a waiver.",
    "**Nothing in this packet is a fee-waiver form**, because the committed record names none for this route."
  ],

  service: [
    "**No service requirement is stated for this application.** The committed manifest records \"The source review does not state a service requirement for the standalone application\", and neither form carries a certificate of service.",
    "**But the order's first finding is that the prosecutor has received a copy of the application**, so a copy plainly has to reach the prosecutor. Ask the clerk at filing how that court gets the application to the prosecutor, and whether you are expected to deliver it.",
    "**A victim may also be notified**, by the attorney for the state rather than by you, where the victim asked for post-conviction notice.",
    "**No notarisation is stated either.** The committed manifest records \"The source review does not state a notarization requirement\", and the application is a declaration under penalty of perjury rather than a sworn affidavit — you sign it, you do not swear it before an officer. Confirm with the clerk."
  ],

  documentsToObtain: [
    ["The set-aside order in your case — the application is for someone whose conviction was set aside WITHOUT a certificate, and the form asks for the date of that order", "the clerk of the court of conviction"],
    ["The judgment of guilt, showing the date it was entered and every count you were convicted of", "the clerk of the court of conviction"],
    ["Documentation that you finished probation or your sentence, and when — the waiting period runs from that date and not from the conviction", "the clerk of the court of conviction, or the supervising probation department"]
  ],

  steps: [
    "**Check the waiting period first.** The form prints it: if you were convicted of a class 4, 5 or 6 felony you must wait two years after fulfilling the conditions of probation or sentence; for a class 2 or 3 felony, five years; for a misdemeanor you may apply immediately. Which of those you are is a matter of the offence class on your own record.",
    "**Tick whether you are the Defendant or the Attorney for Defendant.** Both boxes are left empty; if you are filing for yourself, tick Defendant, and tick Self on the Representing line at the top of the page.",
    "**Tick the eligibility statement that is true of you, and fill in its date.** One says you previously received a set-aside order on ____ in this case that did not include a Certificate of Second Chance. The other says you did NOT previously receive a Certificate of Second Chance on the set aside of a felony conviction. Neither is ticked and neither date is filled in, because both are facts about your own record.",
    "**Write your date of birth** on the Date of Birth line on page 1 of the application. The form draws that blank with typed underscores rather than a rule, so the platform has no measured box to write it in — see the note below on what was deliberately left blank.",
    "**Complete the judgment sentence on page 2**: the day, the month and year the Judgment of Guilt was entered, and each count you were convicted of. If there are more than four counts, tick the box that says additional counts continue on a separate page and attach it.",
    "**Read the declaration before you sign it.** It says you understand the application may be denied if information in it is found to be inaccurate, and it is a declaration under penalty of perjury that the information is true and correct.",
    "**Print your name and sign the application, and write your address beneath it.** The platform has written your full mailing address on the Address line of that block; check it before you sign.",
    "**Leave the AUTHORIZATION TO PROCEED ON BEHALF OF DEFENDANT block and the whole of page 3 blank** unless a lawyer is filing for you. Page 3 is the attorney's own declaration.",
    "**Write the court's name on the ____ COURT OF ARIZONA line of BOTH forms.**",
    "**File the application and the order together, in the court of conviction**, and ask the clerk what the fee is, how the prosecutor gets its copy, and whether a hearing will be set.",
    "**Write nothing on the order below its caption block.** The findings, the denial reasons, the grant, the date and the judicial officer's signature are the court's."
  ],

  deliberatelyBlank: [
    "**Your date of birth, on both forms.** Both forms draw that blank with typed underscore characters rather than with a rule, so there is no stroke on the page for a value to sit on and this build measures no box for it. It is yours to write; the platform holds the fact and says so here rather than leaving you to wonder why it is empty.",
    "**The name of the court**, on the ____ COURT OF ARIZONA line of both forms.",
    "**Both eligibility elections on page 1 of the application, and the set-aside date one of them asks for.** They turn on your own record, and one of them is the § 13-905(L) single-certificate bar itself.",
    "**The Defendant / Attorney for Defendant election, and the Self / Lawyer for election at the top of page 1.**",
    "**The whole judgment sentence and the four count lines on page 2 of the application.** These are conviction facts from the court record.",
    "**The \"___ day of\" blank in the judgment sentence.** It is a 33.27pt stroke, shorter than the 40pt minimum the shared rule reader returns, so this build has no measured rectangle for it at all and declares no cell for it.",
    "**Every signature, every printed name in a signature block, and every date beside one**, on both forms.",
    "**The AUTHORIZATION TO PROCEED ON BEHALF OF DEFENDANT block on page 2, and the whole of page 3.** Both are for the case where a lawyer files for you; no representation fact is held for this participant.",
    "**The Lawyer's Bar Number line and the Representing ... Lawyer for line on both forms.**",
    "**Everything on the order from \"THE COURT FINDS\" onward**, including the findings, the denial reasons, the grant, the DATED line and the Judicial Officer's signature.",
    "**The For Clerk's Use Only box on page 1 of both forms.**"
  ],

  notTold: [
    "**Whether your offence was a class 2, 3, 4, 5 or 6 felony, or a misdemeanor.** The waiting period the form prints turns on it entirely, and the official record answers it.",
    "**When you fulfilled the conditions of probation or your sentence.** The waiting period runs from that date, not from the conviction.",
    "**Whether you have already had a Certificate of Second Chance.** A.R.S. § 13-905(L) allows one on a felony set-aside, and the committed record notes that multiple felonies from one act or course of conduct count as one.",
    "**Whether your set-aside order did or did not include a certificate.** That is what the order in your own case says.",
    "**What this application costs.** The committed record says the source review does not state a fee, and does not address a waiver. Ask the clerk.",
    "**Whether you must deliver a copy to the prosecutor yourself.** No service requirement is stated, but the order's first finding is that the prosecutor has received a copy. Ask the clerk."
  ],

  stopConditions: [
    "a state or victim objection — the committed track record names it;",
    "a hearing being set;",
    "a denial you want to challenge;",
    "any doubt about the class of your offence, because the whole waiting period turns on it;",
    "any earlier Certificate of Second Chance, because A.R.S. § 13-905(L) allows only one on a felony set-aside;",
    "any doubt about whether your conviction has actually been set aside, because this route exists only where it has;",
    "any immigration matter, because a certificate is not a set-aside and does not undo a conviction."
  ],

  whatThisIsNot:
    "This is a prepared set of official Arizona Supreme Court forms, delivered as the Administrative Office of "
    + "the Courts publishes them. It is not legal advice, it is not filed for you, and it does not decide "
    + "whether you are eligible for a Certificate of Second Chance. It is not an application to set aside a "
    + "conviction — this route exists only where a set-aside has already been granted without a certificate — "
    + "and it does not undo or seal a conviction. A certificate is expressly not a recommendation or "
    + "sponsorship, and the order in this packet is the judge's to complete and sign.",

  receiptDoesNotEstablish: [
    "that these are the current official editions of either form. The committed track registry holds AZ-8 as a RELEASE blocker in terms: \"Current form currency for the standalone certificate-of-second-chance forms AOCCRSA3F and AOCCRSA4F must be confirmed on azcourts.gov before runtime release.\" Both predate the 2024 rule amendments and neither was verified against the AOC forms page in the review this packet is built from",
    "that any particular Arizona conviction has been set aside, or set aside without a certificate",
    "that any waiting period under A.R.S. § 13-905(K) has run",
    "that the applicant has not already received a Certificate of Second Chance, which A.R.S. § 13-905(L) allows only once on a felony set-aside",
    "that any fee, waiver, service or notarisation requirement does or does not apply: the committed record records that the source review established none of them"
  ],

  buildFindings: [
    {
      finding:
        "NEITHER FORM HAS AN ACROFORM. Read from the pinned binaries, AOCCRSA3F-103023 (three pages) and "
        + "AOCCRSA4F-103023 (two pages) carry no AcroForm and no field of any kind; the committed corpus index "
        + "records acroFormPresent false and acroFieldCount 0 for both. Every blank on both forms is a printed "
        + "stroke.",
      consequence:
        "Both are built through the measured flat-overlay path: every write box is four numbers read from the "
        + "document's own content stream -- the y of the rule the value sits on and the x it starts and ends "
        + "at -- matched against the pinned binary at build time, with the box ceiling taken from the lowest "
        + "printed baseline above it inside its own span. A cell that does not measure stops the family; "
        + "nothing is drawn at a guessed rectangle."
      },
    {
      finding:
        "A FLAT DOCUMENT HAS NO CENSUS TO CHECK A FIELD MAP AGAINST. The coverage gate that stops an AcroForm "
        + "family whose map does not cover its own form cannot run here: there is no field list to compare "
        + "with. A printed blank left out of the cell table would be a blank nothing asks about and no counter "
        + "would see it.",
      consequence:
        "Both forms were read rule by rule from their own content streams and EVERY horizontal stroke the "
        + "shared reader returns is declared as a cell -- twenty-seven on the application and fourteen on the "
        + "order -- each with the y and x span it was measured at. The only strokes deliberately not declared "
        + "are the two 0.75pt borders of the For Clerk's Use Only box on page 1 of each form, which are a box "
        + "outline rather than a rule anything is written on."
    },
    {
      finding:
        "ONE PRINTED BLANK ON THE APPLICATION CANNOT BE MEASURED AT ALL. The \"on the ___ day of\" blank in "
        + "the judgment sentence on page 2 is a filled stroke 33.27 points wide at y=680.97 x[434.93,468.20]. "
        + "rulesOfPage in scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs takes minLength = 40, so it is "
        + "not returned as a rule and no write box can be measured for it. The wider blank beside it, the "
        + "month and year at x[504.45,573.25], is 68.80 points and is returned.",
      consequence:
        "No cell is declared for it, because a cell that cannot be measured stops the family and a rectangle "
        + "invented for it would be exactly what the measured path exists to prevent. It is carried in the "
        + "field map as a required-before-filing row with no measured rectangle, named in "
        + "participant-instructions.md under what was deliberately left blank, and the measurement is recorded "
        + "here. Nothing in the shared rule reader is changed by this lane; the threshold is reported for the "
        + "lane that owns it."
    },
    {
      finding:
        "THE DATE-OF-BIRTH BLANK ON BOTH FORMS IS TYPED UNDERSCORE CHARACTERS, NOT A RULE. On the application "
        + "it is the text run \"_______________________\" at x[144.50,283.74] y=428.40, and on the order "
        + "\"______________________\" on the Date of Birth line; the content stream carries no stroke at "
        + "either. The platform holds participant.date_of_birth and writes it on other families' forms.",
      consequence:
        "No cell is declared and no value is drawn, because there is no stroke for a measured box to sit on "
        + "and this build never draws at a guessed rectangle. The blank is declared required-before-filing "
        + "with the reason stated as what it is -- the form's own drawing, not an unavailable fact -- and "
        + "participant-instructions.md says in terms that the platform holds the date and why the line is "
        + "empty, rather than leaving the participant to wonder."
    },
    {
      finding:
        "THE PACKET-SET MANIFEST NAMES EDITIONS THE CORPUS DOES NOT CARRY. Its two components name "
        + "AOCCRSA3F-010122 and AOCCRSA4F-010122; the committed corpus index carries neither, and carries the "
        + "10/30/2023 edition of each in three custodies at one SHA-256 apiece.",
      consequence:
        "This build binds the 10/30/2023 edition on the authority of a committed captain determination, "
        + "DET-AZ-SECOND-CHANCE-CURRENT-EDITION-IS-HELD, which re-points both obligations and records that "
        + "both held files exist at their recorded path and both digests recompute exactly. That determination "
        + "is bound as a RECORD by this build, with five of its own statements re-read from the committed "
        + "bytes as anchors, so the family stops if it is no longer there. A build lane may not decide which "
        + "edition answers an obligation, and this one did not."
    },
    {
      finding:
        "AZ-8, THE FORM-CURRENCY RELEASE BLOCKER, IS OPEN AND IS NOT A BUILD BLOCKER. The committed track "
        + "registry holds it in terms: the current revision of both forms must be confirmed on azcourts.gov "
        + "before runtime release, both predate the 2024 rule amendments, and neither was verified against the "
        + "AOC forms page in the review. The family's legal input is recorded as SETTLED.",
      consequence:
        "Built, and the blocker carried rather than dissolved: it is the first thing the source receipt says "
        + "it does not establish, it is raised in the approval request, and it is named for the reviewer. A "
        + "release gate is not a build gate, and a packet that quietly dropped the gate on its way through a "
        + "build lane would be worse than one that was never built."
    },
    {
      finding:
        "THE CAPTION BLOCK IS THE SAME ON BOTH FORMS AND THE FACTS ARE WRITTEN ON BOTH. Person Filing, "
        + "Address, City/State/Zip, Telephone, Email, County and Case Number are printed on page 1 of the "
        + "application and again on page 1 of the order, and the case number is printed again at the top of "
        + "every later page of both.",
      consequence:
        "Each is written everywhere the form prints a rule for it -- eight cells on the application and seven "
        + "on the order. Two widgets that do not overlap are two places the form means the value to appear, "
        + "and a form that prints a case number on every page is not defective for doing so."
    },
    {
      finding:
        "THE FORMS PRINT ONE RULE FOR \"City, State, Zip Code\" AND ONE FOR THE DECLARATION \"Address\", each "
        + "asking for a value the platform holds in parts. Refusing them because the shared descriptor "
        + "registry has no one-line fact would state a fact about the descriptor list as though it were a fact "
        + "about what the platform holds.",
      consequence:
        "The fixtures compose participant.city_state_zip and participant.full_mailing_address from the four "
        + "held parts, exactly as census-v1-nm_conviction-set does and for the reason it records. The "
        + "composition is in the FIXTURES, never in the writer: no caller text reaches the page, and each "
        + "composed value is fitted to its own measured box and refused whole rather than truncated if it "
        + "will not fit."
    },
    {
      finding:
        "THE ORDER IS DELIVERED AS A COMPONENT AND WRITTEN ON ONLY IN ITS CAPTION. AOCCRSA4F is the judge's "
        + "order; below the caption block it carries the findings, the two denial reasons, the grant, the "
        + "DATED line and the Judicial Officer's signature.",
      consequence:
        "Ten cells are declared on its page 1 and four on its page 2; three of the fourteen are written and "
        + "all of them are caption-block facts. Every finding, every part of the order and every court "
        + "signature is declared with no fact and classified court-owned, and the instructions say in terms "
        + "that the participant writes nothing on it below the caption."
    },
    {
      finding:
        "THE GUIDE IS PRINTED FROM THE RECORD, NOT FROM THE BUILDER. The committed packet-set manifest "
        + "carries this packet set's own requiredBeforeFiling list, three of whose five lines are statements "
        + "that the source review established nothing -- about notarisation, about a fee and about a waiver.",
      consequence:
        "This build reads legal-design-packet-set-manifests.json at build time and prints that list verbatim "
        + "into participant-instructions.md with the count and the record's SHA-256 beside it, including the "
        + "three lines that record an absence, because paraphrasing a recorded absence into a reassurance is "
        + "how a gap becomes a promise. The fee and service sections then say in plain terms what the "
        + "participant should do about each. If the record stops declaring the list the build STOPS with "
        + "RECORD_NO_LONGER_DECLARES_WHAT_THE_PACKET_PRINTS."
    }
  ],

  counselQuestions: [
    "AZ-8, the form-currency release blocker, is open: both editions predate the 2024 rule amendments and neither was verified against azcourts.gov. The packet is built and the blocker carried. Confirm that building against the determined 10/30/2023 edition, with the blocker carried, is right.",
    "Both eligibility elections on page 1 are left unticked, including the one that asserts no prior Certificate of Second Chance. Confirm that the § 13-905(L) bar is the participant's assertion to make rather than a route selection.",
    "The packet states that no fee, no waiver, no service requirement and no notarisation requirement is established by the review, and tells the participant to ask the clerk about each. Confirm that stating the absence, rather than omitting the topic, is right.",
    "The order's first finding is that the prosecutor has received a copy of the application, while the record states no service requirement on the applicant. The packet tells the participant to ask the clerk how the prosecutor gets its copy. Confirm.",
    "The date of birth is left blank on both forms because the forms draw that blank with typed underscores and this build will not draw at an unmeasured rectangle. Confirm that leaving it, with the reason stated to the participant, is better than drawing at an estimated position.",
    "The proposed order is delivered with its caption block completed. Confirm that completing a judge's order's caption, and nothing else on it, is appropriate."
  ],

  reviewersAttention: [
    "Neither form has an AcroForm. Every value sits on a stroke measured from the form's own content stream; please check on the raster that each value sits on its printed rule and that none of them touches the printed caption to its left.",
    "The order is the judge's. Please check on the raster that nothing at all appears below its caption block on either page — no finding, no denial reason, no grant, no date, no judicial officer.",
    "The date-of-birth line on both forms is empty by design, because the forms draw it with typed underscores and no stroke exists to measure. The participant instructions say so in terms.",
    "The \"___ day of\" blank in the judgment sentence on application page 2 has no cell at all: at 33.27pt it is below the shared rule reader's 40pt minimum. It is named to the participant instead.",
    "The boundary fixture carries a 61-character email address, a 47-character street address, a 37-character name and a 23-character case number on rules between 130 and 505 points wide. Nothing in this build shortens a value: a value that will not fit its measured box is refused whole and reported. Please check on the raster that no value is clipped at a rule end and that none overruns it.",
    "Page 3 of the application and the AUTHORIZATION block on page 2 are the attorney's, and are blank by design.",
    "AZ-8, the form-currency release blocker, is open and is carried in the receipt and the approval request rather than resolved here.",
    "participant-instructions.md prints the committed packet-set manifest's own requiredBeforeFiling list verbatim, including its three lines that record what the source review did NOT establish."
  ],

  composedBody() {
    throw new Error("this family composes no pages: both components are official Arizona Supreme Court forms");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];

    const captionWrites = (page) => [
      h.write("person_filing", "Person Filing:", "participant.full_legal_name", page),
      h.write("address", "Address (if not protected):", "participant.street_address", page),
      h.write("city_state_zip", "City, State, Zip Code:", "participant.city_state_zip", page),
      h.write("telephone", "Telephone:", "participant.phone", page),
      h.write("email_address", "Email Address:", "participant.email", page),
      h.write("county", "IN ____ COUNTY", "matter.county", page),
      h.write("case_number", "Case Number:", "matter.case_number", page)
    ];
    const captionRefusals = (page) => [
      h.election("representing_lawyer_for", "Representing [ ] Self or [ ] Lawyer for",
        "whether the participant appears for themselves or by a lawyer is their own election, and the name of a represented person is written here only where a lawyer files", page),
      h.attorneyBlank("lawyers_bar_number", "Lawyer's Bar Number:",
        "completed only where a lawyer files for you; no representation fact is held for this participant", page),
      h.rbf("court_name", "____ COURT OF ARIZONA",
        "the name of the court that convicted you - the Superior Court of your county, or the justice or municipal court",
        "the platform holds the county and writes it on the line below, but no committed record establishes which Arizona court entered any particular conviction", page),
      h.rbf("date_of_birth_line", "Date of Birth: _______________________",
        "your date of birth, on the line the form prints for it",
        "the form draws this blank with typed underscore characters and not with a rule, so there is no stroke on the page for a measured write box to sit on; the platform HOLDS this fact and this build will not draw at a guessed rectangle", page)
    ];

    if (componentId === "application") {
      writes.push(
        ...captionWrites(1),
        h.write("defendant_name", "Defendant (FIRST, MI, LAST)", "participant.full_legal_name", 1),
        h.write("case_number_page_2", "Case Number:, at the head of page 2", "matter.case_number", 2),
        /*
         * The label is the caption the form PRINTS -- "Address" -- and nothing
         * else. An earlier build labelled it "Address, beneath the declaration
         * signature block", adding positional context that was true of the
         * page and fatal on the row: the completeness contract's classifyField
         * reads that label and returned PROTECTED_SIGNATURE on the word
         * "signature", so a held address written on the line the form prints
         * for it was counted as a protected field written. The context belongs
         * in the reason and in officialCells, where it is; a map label quotes
         * the paper.
         */
        h.write("declaration_address", "Address", "participant.full_mailing_address", 2),
        h.write("case_number_page_3", "Case Number:, at the head of page 3", "matter.case_number", 3)
      );
      refusals.push(
        ...captionRefusals(1),

        // ---- the applicant election and the two eligibility elections, page 1
        h.election("applicant_is_defendant", "Applicant is: [ ] Defendant",
          "whether the applicant is the defendant or an attorney for the defendant is the participant's own election", 1),
        h.election("applicant_is_attorney_for_defendant", "Applicant is: [ ] Attorney for Defendant",
          "the other half of the same election", 1),
        h.election("prior_set_aside_without_certificate", "[ ] Defendant is eligible for a Certificate of Second Chance because Defendant previously received a set aside order on ____ in this case that did not include a Certificate of Second Chance.",
          "whether a set-aside order was granted without a certificate, and on what date, are facts about the participant's own case; the committed track registry makes this the whole ground of the standalone route", 1),
        h.rbf("prior_set_aside_date", "the date in \"previously received a set aside order on ____ in this case\"",
          "the date of the set-aside order in your case, from the order itself",
          "no held record establishes the date of any participant's set-aside order, and the blank is drawn as typed underscores within the printed sentence rather than as a rule", 1),
        h.election("no_prior_certificate_of_second_chance", "[ ] Defendant DID NOT previously receive a Certificate of Second Chance on the set aside of a felony conviction.",
          "this is the A.R.S. § 13-905(L) single-certificate bar itself, which the committed track registry records as counting multiple felonies from one act or course of conduct as one; it is the participant's own assertion about their own record and this route does not make it for them", 1),

        // ---- page 2, the convictions
        h.rbf("judgment_day", "the \"on the ___ day of\" blank in \"A Judgment of Guilt was entered in this Court against the defendant on the ___ day of ____\"",
          "the day of the month the Judgment of Guilt was entered, from the court record",
          "this blank is a 33.27pt stroke and the shared rule reader returns nothing under 40pt, so this build measures no write box for it at all and declares no cell; it is named here rather than left invisible", 2),
        h.rbf("judgment_month_and_year", "the month and year in \"A Judgment of Guilt was entered ... on the ___ day of ____\"",
          "the month and year the Judgment of Guilt was entered, from the court record",
          "no held record establishes the date any participant's judgment of guilt was entered", 2),
        h.rbf("count_1", "Count I:",
          "the offence you were convicted of on the first count, exactly as the court record names it",
          "no held record establishes any participant's own convictions, and a count list completed in part reads as finished when it is not", 2),
        h.optional("count_2", "Count II:",
          "the form's own second count line, used only if you were convicted on more than one count", 2),
        h.optional("count_3", "Count III:",
          "the form's own third count line", 2),
        h.optional("count_4", "Count IV:",
          "the form's own fourth count line; if there are more, tick the box saying additional counts continue on a separate page and attach it", 2),
        h.election("additional_counts_continue", "[ ] Additional counts continue on a separate page.",
          "whether there are more counts than the form has room for is a fact about the participant's own case, and the separate page is not in this packet", 2),

        // ---- page 2, the declaration signature block
        h.protectedBlank("print_defendants_name", "Print Defendant's Name, beneath the declaration under penalty of perjury",
          "the printed name that accompanies a signature is part of the signature block and is made when the declaration is signed", 2),
        h.protectedBlank("defendants_signature", "Defendant's Signature, beneath the declaration under penalty of perjury",
          "the applicant signs their own application, as the committed record states in terms; this build never signs for a participant", 2),

        // ---- page 2, the authorization block
        h.attorneyBlank("authorized_attorney_name", "I authorize my Attorney ____ to file this application for a Certificate of Second Chance with the Court.",
          "the name of the lawyer authorised to file, used only where a lawyer files for you", 2),
        h.protectedBlank("authorization_date", "Date, in the AUTHORIZATION TO PROCEED ON BEHALF OF DEFENDANT block",
          "a date written before the authorisation is signed would be false", 2),
        h.protectedBlank("authorization_signature", "Defendant's Signature, in the AUTHORIZATION TO PROCEED ON BEHALF OF DEFENDANT block",
          "the defendant signs the authorisation personally, and only where a lawyer is to file for them", 2),

        // ---- page 3, the attorney's declaration
        h.attorneyBlank("print_attorney_name", "Print Attorney Name, on the attorney's declaration page",
          "the whole of page 3 is the attorney's own declaration and is used only where a lawyer files for you", 3),
        h.attorneyBlank("attorney_signature", "Attorney Signature, on the attorney's declaration page",
          "an attorney signs their own declaration; this build never signs for anybody", 3),
        h.attorneyBlank("attorney_address", "Attorney Address, on the attorney's declaration page",
          "part of the same attorney declaration", 3)
      );
    } else if (componentId === "proposed_order") {
      writes.push(
        ...captionWrites(1),
        h.write("case_number_page_2", "Case Number:, at the head of page 2 of the order", "matter.case_number", 2)
      );
      refusals.push(
        ...captionRefusals(1),

        // ---- everything below the caption is the court's
        h.agencyBlank("court_finds_prosecutor_received_copy", "THE COURT FINDS: [ ] The prosecutor has received a copy of the Application for Certificate of Second Chance.",
          "a finding is the court's", 1),
        h.agencyBlank("court_finds_requirements_not_met", "THE COURT FINDS: [ ] The defendant has not met the statutory requirements for the application.",
          "a finding is the court's", 1),
        h.agencyBlank("court_finds_requirements_met", "THE COURT FINDS: [ ] The defendant has met the statutory requirements for the application.",
          "a finding is the court's", 1),
        h.agencyBlank("order_denying", "IT IS ORDERED: [ ] DENYING the application for a Certificate of Second Chance for the following reasons:",
          "the order is the court's", 1),
        h.agencyBlank("order_denying_requirements_not_met", "[ ] The applicant has not met the statutory requirements for the application (as noted above):",
          "the court states its own reason", 1),
        h.agencyBlank("order_denying_other_reasons", "[ ] Other reasons:_____________________________________________________.",
          "the court states its own reason", 1),
        h.agencyBlank("order_granting", "IT IS ORDERED: [ ] GRANTING the application for a Certificate of Second Chance pursuant to A.R.S. § 13-905.",
          "the order is the court's", 1),
        h.agencyBlank("dated_day", "DATED this ___ day of",
          "the court dates its own order", 2),
        h.agencyBlank("dated_month_and_year", "DATED this ___ day of ____ , ____",
          "the court dates its own order", 2),
        h.agencyBlank("judicial_officer", "Judicial Officer",
          "the judicial officer signs the court's own order", 2)
      );
    }
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
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay, finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { decideBinding, resolveFact } from "./rcap-official-forms/rcap-field-semantics.mjs";
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
 * NO CAPTION CORRECTIONS, AND THE REASON IS STRUCTURAL RATHER THAN LUCKY.
 *
 * A caption correction exists to repair what the shared widget-caption capture
 * returns for an AcroForm field. Neither of this family's documents has an
 * AcroForm -- the committed corpus index records acroFormPresent false and
 * acroFieldCount 0 for both -- so censusAcroForm never runs, no caption is ever
 * captured, and there is nothing to correct.
 *
 * Every label this family quotes is read instead from the document's own
 * content stream and declared beside the rule it captions, in officialCells
 * above, with the y and x span each was measured at.
 */
const CAPTION_CORRECTIONS = {};

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

  /*
   * EVERY WRITABLE FLAT CELL BINDS, AND WHERE IT BINDS SOMETHING ELSE THAT IS
   * DECLARED. STOPS THE FAMILY OTHERWISE.
   *
   * WHAT WENT WRONG. finalizeFlatOverlay decides a flat anchor by running
   * decideBinding over the anchor's LABEL. A cell whose printed caption matches
   * no descriptor is refused with no_allowlisted_fact_matches, and a cell whose
   * caption matches a descriptor for a DIFFERENT fact than the cell declares is
   * refused with explicit_mapping_conflicts_with_field_name. Both refusals are
   * recorded in the overlay report and neither is visible to any of the nine
   * counters: the completeness audit reads the field MAP, which still claims
   * the write, and the byte proof only checks the values the finalizer says it
   * wrote. This family shipped with the applicant's name missing from the
   * "Person Filing:" line of BOTH forms and the address missing from the
   * declaration block, and returned PASS_COMPLETE with nine zeros.
   *
   * A flat document has no AcroForm census, so the coverage gate that catches
   * this for a filled form cannot run here. This is that gate for a flat one.
   *
   * Each writable cell must be in one of three declared states:
   *
   *   * the descriptor resolves its label to the fact the cell declares -- the
   *     ordinary case, nothing to declare;
   *   * the descriptor resolves the label to a DIFFERENT fact, and the cell
   *     says so in `descriptorResolvesInsteadTo`. The value written is still
   *     the cell's own fact, because finalizeFlatOverlay takes the anchor's
   *     factId over the decision's; the descriptor decides only whether the
   *     blank may be written at all. Arizona's declaration block is the case:
   *     the form prints one rule captioned "Address" and the shared registry
   *     has one participant address descriptor, participant.street_address,
   *     while the answer the rule is asking for is the whole mailing address;
   *   * the descriptor resolves the label to NOTHING, and the cell names a
   *     `bindingLabel` that does resolve, with `bindingLabelWhy` saying why
   *     that label describes the same blank. "Person Filing:" is the case:
   *     nothing in the registry matches it and "Person Filing Name" resolves to
   *     participant.full_legal_name.
   *
   * Anything else stops the family before a byte is rendered. An explicit
   * mapping is now passed ONLY for a cell that asks for one, because passing
   * one for every cell is what turned the second case into a refusal.
   */
  const flatBindingFailures = [];
  for (const [componentId, cells] of cellsByComponent) {
    for (const cell of cells) {
      if (!cell.fact || cell.tooShallowToWriteIn) continue;
      const label = cell.bindingLabel ?? cell.label;
      const decision = decideBinding(
        { name: label, pdfType: "text", effectiveLabel: label },
        { explicitMappings: {}, captionOnly: false, availableChargeRows: 0, documentAcceptsFill: true }
      );
      if (!decision.writable) {
        flatBindingFailures.push({
          component: componentId, cell: cell.key, page: cell.page,
          printedLabel: cell.label, bindingLabel: cell.bindingLabel ?? null,
          declaredFact: cell.fact, why: `the label binds nothing: ${decision.reason}`,
          fix: "name a bindingLabel the shared registry resolves for this blank, and say why it describes the same blank"
        });
        continue;
      }
      if (decision.factId !== cell.fact && cell.descriptorResolvesInsteadTo !== decision.factId) {
        flatBindingFailures.push({
          component: componentId, cell: cell.key, page: cell.page,
          printedLabel: cell.label, bindingLabel: cell.bindingLabel ?? null,
          declaredFact: cell.fact, descriptorResolvesTo: decision.factId,
          why: "the shared registry resolves this label to a different fact than the cell declares, and the cell does not declare that",
          fix: "set descriptorResolvesInsteadTo to the descriptor's fact, with the reason the cell writes a different one"
        });
      }
    }
  }
  if (flatBindingFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED",
      stopClass: "FLAT_CELL_BINDING_NOT_DECLARED",
      why:
        "a flat cell this family declares as a write would be refused by the shared binder, or would bind a "
        + "different fact than it declares, and neither is visible to any completeness counter",
      flatBindingFailures, overlayDirectoryTouched: false
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

  const blocked = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, STALE_BLOCK), "utf8")).hashes ?? []);
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = SPEC.components.map((c) => composedMap(c));
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
            expectedSha256: b.doc.sha256,
            census: census.fields,
            facts,
            explicitMappings: b.doc.explicitMappings ?? {},
            /* One held fact on the ruled line the form prints for it, where no
             * shared descriptor reaches the printed caption. Named per document
             * and empty for every document that does not name it, so the
             * petition is byte-unaffected. See the fee_waiver document's
             * narrativeLines note for the refusal it answers. */
            narrativeAcrossFields: b.doc.narrativeLines ?? [],
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
          boxes = census.fields.flatMap((f) => (f.widgets ?? []).map((w) => ({
            key: f.name, page: w.page, rect: w.rect, written: writtenNames.has(f.name)
          })));
          for (const w of report.written) {
            const value = resolveFact(facts, w.factId);
            if (value !== undefined && value !== null && String(value) !== "") {
              drawnValues.set(`${componentId} ${componentId}.${w.field}`, String(value));
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
            /* Only where a cell asks for one. An explicit mapping supplied for
             * every cell CONFLICTS with the shared registry on any label the
             * registry already resolves to a different fact, and the conflict
             * is a silent refusal. See the flat-binding gate above. */
            explicitMappings: Object.fromEntries(writable
              .filter((c) => c.needsExplicitMapping === true)
              .map((c) => [c.bindingLabel ?? c.label, c.fact])),
            facts,
            documentTextLines: [],
            title: `${SPEC.jurisdiction} ${b.doc.documentId}`
          });
          bytes = result.bytes;
          report = result.report;
          const writtenAnchors = new Set(report.written.map((w) => w.anchor));
          for (const w of report.written) {
            const cell = writable.find((c) => (c.bindingLabel ?? c.label) === w.anchor);
            if (cell) drawnValues.set(`${componentId} ${componentId}.${cell.key}`, String(resolveFact(facts, cell.fact) ?? ""));
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

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf, declaredRecord);
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
    documents: bound.map((b) => ({
      sourceIds: [b.doc.sourceId], documentId: b.doc.documentId, formNumber: b.doc.formNumber ?? b.doc.documentId,
      officialTitle: b.doc.officialTitle, revision: b.doc.revision ?? null,
      sha256: b.doc.sha256, byteLength: b.bytes.length,
      custody: b.custody, pathInCustody: b.pathInCustody,
      matchedBy: "exact_pinned_sha256_recomputed_from_the_bytes_on_disk",
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
