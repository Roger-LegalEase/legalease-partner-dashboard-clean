#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — the Oklahoma custom-pleading family.
 *
 *   node "scripts/build-census-v1-rcap-ok-custom-pleading.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * The MASTER_QUEUE row for this family carries SIXTEEN route keys across
 * EIGHT committed tracks: several of the sixteen are pathway variants of one
 * track — for example the three deferred-dismissal pathways all belong to
 * ok_18_19_deferred_dismissal — and the committed specifications record ONE
 * component set per TRACK, not per pathway. This build composes one set of
 * pages per track and states the track's own statutory ground on each,
 * because that is what the committed record describes. Where a track carries
 * more than one pathway, the pathway is a fact of the participant's record
 * that changes which category they fall in, not a different instrument, and
 * the committed generation requirements ask for it directly.
 *
 * All eight are participant-filed and all eight are custom pleadings: the
 * specifications record a composed primary filing and a composed proposed
 * order for each and name no official form.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-ok-custom-pleading",
  "worklistGroupId": "rcap-ok-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-ok-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading",
  "jurisdiction": "OK",
  "legalName": "Oklahoma Expungement Petitions — 22 O.S. §§ 18, 19, 991c and 60.18, and the identity-theft route",
  "routeName": "asking an Oklahoma court to expunge a record under the section of Title 22 that fits the participant's own record",
  "statutes": [
    "22 O.S. § 18",
    "22 O.S. § 19",
    "22 O.S. § 19a",
    "22 O.S. § 60.18",
    "22 O.S. § 991c",
    "Senate Bill 2030 (2026)"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-only:OK:ok_identity_theft"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:ok_identity_theft+ok_18_19_deferred_dismissal+ok_18_19_felony_conviction+ok_18_19_misdemeanor_conviction+ok_18_19_nonconviction+ok_18_19_pardon+ok_991c_deferred+ok_vpo_60_18",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"ok_identity_theft\"",
        "Petition to Expunge an Identity Theft or Wrong-Person Record (22 O.S. § 18 identity-theft category, with § 19a)",
        "Where a record was created in the participant's name through identity theft, or otherwise identifies the wrong person, t",
        "The district court in the county where the arrest information is located. Multiple arrests in the same county may be com",
        "22 O.S. § 18",
        "22 O.S. § 19",
        "22 O.S. § 19a",
        "22 O.S. § 60.18",
        "22 O.S. § 991c",
        "Senate Bill 2030 (2026)",
        "What is your full legal name, and have you used any other names?",
        "What is your date of birth?",
        "In which Oklahoma county is the arrest information located?",
        "What is the district court case number, and what was the arresting agency?",
        "Describe the offence in the words used on the record, rather than by any category number.",
        "How did the case end, and on what date?",
        "What other arrests do you have in that same county?",
        "What other convictions or pending charges do you have, anywhere?",
        "Have you paid all fines, costs and restitution on the case?",
        "Was the case handled in a tribal court, or does a tribal record exist for the same events?",
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "Do you want the arrest record cleared as well as the court record?",
        "How did your name come to be on this record, and when did you find out?",
        "The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest rec",
        "By the court's notice. The proposed order must identify every agency to which it applies.",
        "File the petition and proposed order in the district court of the county where the arrest information is located. Multip",
        "\"trackId\": \"ok_18_19_deferred_dismissal\"",
        "Petition to Expunge After a Deferred or Delayed Sentence Dismissal (22 O.S. §§ 18 and 19)",
        "Where a deferred or delayed sentence has been completed and the case dismissed, the section 18 categories provide a peti",
        "When did you finish the deferred or delayed sentence, and was the case then dismissed?",
        "\"trackId\": \"ok_18_19_felony_conviction\"",
        "Petition to Expunge a Felony Conviction (22 O.S. §§ 18 and 19)",
        "The section 18 categories provide petition routes for felony convictions, including a reclassified-felony route with a s",
        "Has the offence you were convicted of since been reclassified as a misdemeanour?",
        "Have you had any separate misdemeanour convictions, and when?",
        "\"trackId\": \"ok_18_19_misdemeanor_conviction\"",
        "Petition to Expunge a Misdemeanor Conviction (22 O.S. §§ 18 and 19)",
        "The section 18 categories provide petition routes for misdemeanour convictions on stated waiting periods and prior-recor",
        "When did you finish the sentence, including any probation, and pay everything owed?",
        "\"trackId\": \"ok_18_19_nonconviction\"",
        "Petition to Expunge a Non-Conviction or Innocence Record (22 O.S. §§ 18 and 19)",
        "The section 18 categories include records where the person was not charged, was acquitted, was factually innocent, or wh",
        "Has the prosecutor confirmed the case will not be refiled?",
        "\"trackId\": \"ok_18_19_pardon\"",
        "Petition to Expunge After a Pardon (22 O.S. §§ 18 and 19)",
        "A section 18 category provides a petition route following a pardon. Obtaining the pardon itself is a matter for the Gove",
        "On what date was the pardon granted, and do you have the document?",
        "\"trackId\": \"ok_991c_deferred\"",
        "Motion to Expunge the Court Record of a Completed Deferred Sentence (22 O.S. § 991c)",
        "A section 991c expungement updates the court record of a completed deferred sentence so the case shows as dismissed. It ",
        "The district court that entered the deferred sentence.",
        "What is your full legal name?",
        "Which Oklahoma county and district court handled the case?",
        "What is the case number?",
        "When did you finish the deferred sentence and everything it required?",
        "Is your goal to have the arrest itself no longer show, as well as the court case?",
        "Not established for the section 991c motion. The Oklahoma State Bureau of Investigation states that expunging a court re",
        "Not established.",
        "File the motion in the district court that entered the deferred sentence.",
        "\"trackId\": \"ok_vpo_60_18\"",
        "Petition to Expunge Victim Protective Order Records (22 O.S. § 60.18)",
        "Title 22 section 60.18 provides for expungement of victim protective order records. The review classifies this as custom",
        "\"componentId\": \"ok_identity_theft-free-route-screen-1\"",
        "\"componentId\": \"ok_identity_theft-primary-filing-2\"",
        "\"componentId\": \"ok_identity_theft-proposed-order-3\"",
        "\"componentId\": \"ok_identity_theft-record-gathering-instructions-4\"",
        "\"componentId\": \"ok_identity_theft-fee-disclosure-5\"",
        "\"componentId\": \"ok_identity_theft-hearing-instructions-6\"",
        "\"componentId\": \"ok_identity_theft-effect-disclosure-7\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-free-route-screen-1\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-record-gathering-instructions-4\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-fee-disclosure-5\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-hearing-instructions-6\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-effect-disclosure-7\"",
        "\"componentId\": \"ok_18_19_felony_conviction-free-route-screen-1\"",
        "\"componentId\": \"ok_18_19_felony_conviction-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_felony_conviction-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_felony_conviction-record-gathering-instructions-4\"",
        "\"componentId\": \"ok_18_19_felony_conviction-fee-disclosure-5\"",
        "\"componentId\": \"ok_18_19_felony_conviction-hearing-instructions-6\"",
        "\"componentId\": \"ok_18_19_felony_conviction-effect-disclosure-7\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-free-route-screen-1\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-record-gathering-instructions-4\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-fee-disclosure-5\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-hearing-instructions-6\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-effect-disclosure-7\"",
        "\"componentId\": \"ok_18_19_nonconviction-free-route-screen-1\"",
        "\"componentId\": \"ok_18_19_nonconviction-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_nonconviction-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_nonconviction-record-gathering-instructions-4\"",
        "\"componentId\": \"ok_18_19_nonconviction-fee-disclosure-5\"",
        "\"componentId\": \"ok_18_19_nonconviction-hearing-instructions-6\"",
        "\"componentId\": \"ok_18_19_nonconviction-effect-disclosure-7\"",
        "\"componentId\": \"ok_18_19_pardon-free-route-screen-1\"",
        "\"componentId\": \"ok_18_19_pardon-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_pardon-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_pardon-record-gathering-instructions-4\"",
        "\"componentId\": \"ok_18_19_pardon-fee-disclosure-5\"",
        "\"componentId\": \"ok_18_19_pardon-hearing-instructions-6\"",
        "\"componentId\": \"ok_18_19_pardon-effect-disclosure-7\"",
        "\"componentId\": \"ok_991c_deferred-arrest-record-screen-1\"",
        "\"componentId\": \"ok_991c_deferred-primary-filing-2\"",
        "\"componentId\": \"ok_991c_deferred-proposed-order-3\"",
        "\"componentId\": \"ok_991c_deferred-effect-disclosure-4\"",
        "\"componentId\": \"ok_vpo_60_18-free-route-screen-1\"",
        "\"componentId\": \"ok_vpo_60_18-primary-filing-2\"",
        "\"componentId\": \"ok_vpo_60_18-proposed-order-3\"",
        "\"componentId\": \"ok_vpo_60_18-record-gathering-instructions-4\"",
        "\"componentId\": \"ok_vpo_60_18-fee-disclosure-5\"",
        "\"componentId\": \"ok_vpo_60_18-hearing-instructions-6\"",
        "\"componentId\": \"ok_vpo_60_18-effect-disclosure-7\"",
        "What happened with the protective order — was it dismissed, denied, or did it expire?"
      ]
    },
    {
      "recordId": "legal-design-specifications:ok_identity_theft+ok_18_19_deferred_dismissal+ok_18_19_felony_conviction+ok_18_19_misdemeanor_conviction+ok_18_19_nonconviction+ok_18_19_pardon+ok_991c_deferred+ok_vpo_60_18",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"ok_identity_theft-primary-filing-2\"",
        "\"componentId\": \"ok_identity_theft-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_deferred_dismissal-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_felony_conviction-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_felony_conviction-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_misdemeanor_conviction-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_nonconviction-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_nonconviction-proposed-order-3\"",
        "\"componentId\": \"ok_18_19_pardon-primary-filing-2\"",
        "\"componentId\": \"ok_18_19_pardon-proposed-order-3\"",
        "\"componentId\": \"ok_991c_deferred-primary-filing-2\"",
        "\"componentId\": \"ok_991c_deferred-proposed-order-3\"",
        "\"componentId\": \"ok_vpo_60_18-primary-filing-2\"",
        "\"componentId\": \"ok_vpo_60_18-proposed-order-3\""
      ]
    },
    {
      "recordId": "route-obligation-census:16-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-only:OK:ok_identity_theft",
        "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
        "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement",
        "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement",
        "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
        "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement",
        "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement",
        "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
        "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement",
        "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
        "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed",
        "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed",
        "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement",
        "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
        "obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c",
        "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"
      ]
    }
  ],
  "components": [
    {
      "id": "ok_identity_theft-free-route-screen-1",
      "routeKey": "obligation:track-only:OK:ok_identity_theft",
      "routeKeys": ["obligation:track-only:OK:ok_identity_theft"],
      "role": "free_route_screen",
      "title": "Check the free route first - Clear an Oklahoma record that is not yours",
      "description": "the page that asks, before anything is paid for, whether Oklahoma now seals this record without a petition (Clear an Oklahoma record that is not yours)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS PAGE BEFORE YOU PAY FOR ANYTHING.",
        "",
        "Oklahoma now seals some records WITHOUT a petition. If your record is one of them, filing the petition in this packet costs you money and time you did not have to spend.",
        "",
        "WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS",
        "",
        "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them.",
        "",
        "The registry records, as a point where self-help ends: Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against.",
        "",
        "THE QUESTION THIS PAGE EXISTS TO ASK",
        "",
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "{{DOTS}}",
        "",
        "WHAT LEGALEASE CANNOT TELL YOU HERE",
        "",
        "This packet does NOT decide whether the free route reaches you. No committed record in this repository resolves the amended Senate Bill 2030 (2026) text, and the registry records that question as open. So this page asks it rather than answering it.",
        "",
        "WHAT TO DO",
        "",
        "- Request your OSBI criminal history record. The registry records that it establishes what the state holds and whether anything has already been sealed under Clean Slate.",
        "- Ask the district court clerk in the county where the arrest information is located whether your record has already been sealed without a petition.",
        "- If either answer is yes, or if you are not sure, STOP. Do not file the petition in this packet, and get advice before you pay any fee.",
        "",
        "If the free route does not reach you, the rest of this packet is for the route named at the foot of this page: Clear an Oklahoma record that is not yours."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_identity_theft-primary-filing-2",
      "routeKey": "obligation:track-only:OK:ok_identity_theft",
      "routeKeys": ["obligation:track-only:OK:ok_identity_theft"],
      "title": "Petition - Clear an Oklahoma record that is not yours",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an Oklahoma record that is not yours)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO EXPUNGE AN IDENTITY THEFT OR WRONG-PERSON RECORD (22 O.S. § 18 IDENTITY-THEFT CATEGORY, WITH § 19A)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Where a record was created in the participant's name through identity theft, or otherwise identifies the wrong person, the section 18 identity-theft category with section 19a provides the route. The review classifies this as custom_pleading and approves it with limitations. Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - ide full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - ide date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - ide county] In which Oklahoma county is the arrest information located?",
        "(Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - ide case number] What is the district court case number, and what was the arresting agency?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - ide offence description] Describe the offence in the words used on the record, rather than by any category number.",
        "(Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - ide disposition and date] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - ide same county arrests] What other arrests do you have in that same county?",
        "(Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - ide prior record] What other convictions or pending charges do you have, anywhere?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - ide restitution] Have you paid all fines, costs and restitution on the case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - ide tribal record] Was the case handled in a tribal court, or does a tribal record exist for the same events?",
        "(Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - ide free route checked] Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "(Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - ide arrest record too] Do you want the arrest record cleared as well as the court record?",
        "(Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - idt how misidentified] How did your name come to be on this record, and when did you find out?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_identity",
          "label": "The court named in the caption of the petition - the printed line IN THE ............ COURT",
          "supply": "the Oklahoma district court for the county where the arrest information is located - take the county from the certified court record and confirm the court with that county's district court clerk",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "rbf",
          "id": "fact_ideFullLegalName",
          "label": "Item C1 - ide full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideDateOfBirth",
          "label": "Item C2 - ide date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideCounty",
          "label": "Item C3 - ide county",
          "supply": "In which Oklahoma county is the arrest information located? (Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideCaseNumber",
          "label": "Item C4 - ide case number",
          "supply": "What is the district court case number, and what was the arresting agency?",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideOffenceDescription",
          "label": "Item C5 - ide offence description",
          "supply": "Describe the offence in the words used on the record, rather than by any category number. (Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideDispositionAndDate",
          "label": "Item C6 - ide disposition and date",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideSameCountyArrests",
          "label": "Item C7 - ide same county arrests",
          "supply": "What other arrests do you have in that same county? (Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_idePriorRecord",
          "label": "Item C8 - ide prior record",
          "supply": "What other convictions or pending charges do you have, anywhere?",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideRestitution",
          "label": "Item C9 - ide restitution",
          "supply": "Have you paid all fines, costs and restitution on the case?",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideTribalRecord",
          "label": "Item C10 - ide tribal record",
          "supply": "Was the case handled in a tribal court, or does a tribal record exist for the same events? (Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideFreeRouteChecked",
          "label": "Item C11 - ide free route checked",
          "supply": "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything? (Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ideArrestRecordToo",
          "label": "Item C12 - ide arrest record too",
          "supply": "Do you want the arrest record cleared as well as the court record? (Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_idtHowMisidentified",
          "label": "Item C13 - idt how misidentified",
          "supply": "How did your name come to be on this record, and when did you find out?",
          "why": "the committed track registry records this as a required generation input for ok_identity_theft, and the platform holds no value for it"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ok_identity_theft-proposed-order-3",
      "routeKey": "obligation:track-only:OK:ok_identity_theft",
      "routeKeys": ["obligation:track-only:OK:ok_identity_theft"],
      "title": "Proposed Order - Clear an Oklahoma record that is not yours",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clear an Oklahoma record that is not yours)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026). The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_court_identity",
          "label": "The court named in the caption of the proposed order - the printed line IN THE ............ COURT",
          "supply": "the same Oklahoma district court you name on the petition, written into the proposed order so the two captions match",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "ok_identity_theft-record-gathering-instructions-4",
      "routeKey": "obligation:track-only:OK:ok_identity_theft",
      "routeKeys": ["obligation:track-only:OK:ok_identity_theft"],
      "role": "record_gathering_instructions",
      "title": "Records Checklist - Clear an Oklahoma record that is not yours",
      "description": "the records the committed registry requires the participant to obtain, who holds each and how (Clear an Oklahoma record that is not yours)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE RECORDS YOU MUST HAVE IN FRONT OF YOU",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "[ ] Certified court record and disposition",
        "    Who holds it: The district court clerk in the county where the case was filed.",
        "    How to obtain it: Ask the district court clerk for the certified docket and the order or judgment showing how the case ended. The category screen runs on the offence description and the disposition, both of which come from this record.",
        "    Requirement: required; required BEFORE filing.",
        "",
        "[ ] OSBI criminal history record",
        "    Who holds it: Oklahoma State Bureau of Investigation.",
        "    How to obtain it: Request a criminal history record from OSBI. It establishes what the state holds, which arrests exist in the county and whether anything has already been sealed under Clean Slate.",
        "    Requirement: required; not required before filing, but the registry records it as required.",
        "",
        "WHAT THESE RECORDS DECIDE",
        "",
        "The registry records that the category screen for this route runs on the offence DESCRIPTION and the disposition, not on a category paragraph number: three consecutive years of amendments have made the numbering unstable. Both the description and the disposition come from the certified court record. Copy them as that record words them.",
        "",
        "This page is a checklist. It is not filed with the court and it asserts nothing about your case."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_identity_theft-fee-disclosure-5",
      "routeKey": "obligation:track-only:OK:ok_identity_theft",
      "routeKeys": ["obligation:track-only:OK:ok_identity_theft"],
      "role": "fee_disclosure",
      "title": "What this costs - Clear an Oklahoma record that is not yours",
      "description": "the fee and waiver position the committed registry records for this route, and the question it leaves open (Clear an Oklahoma record that is not yours)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "THE FEE, AS RECORDED",
        "",
        "The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question.",
        "",
        "THE WAIVER, AS RECORDED",
        "",
        "Not established. The district court filing fee position is an open question.",
        "",
        "WHAT YOU DO ABOUT IT, AS RECORDED",
        "",
        "Payment of the $150 OSBI processing fee for an arrest-record expungement, by cashier's check or money order - Sent to OSBI, not to the court. OSBI does not accept personal checks, and the court-record expungement is free while the arrest-record one is not. LegalEase does not handle payment.",
        "",
        "WHAT THIS PACKET DOES NOT TELL YOU",
        "",
        "It does not tell you the district court filing fee. The registry records that fee as not established and as an open question, and it records no waiver position for it. Ask the district court clerk in the county where you file, before you go, and ask in the same call whether that court has any fee-waiver route. A filing you cannot pay for is a filing you cannot make.",
        "",
        "LegalEase does not handle any payment on this route."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_identity_theft-hearing-instructions-6",
      "routeKey": "obligation:track-only:OK:ok_identity_theft",
      "routeKeys": ["obligation:track-only:OK:ok_identity_theft"],
      "role": "hearing_instructions",
      "title": "The hearing and the notice - Clear an Oklahoma record that is not yours",
      "description": "where this is filed, who the court notifies, and where self-help ends at the hearing (Clear an Oklahoma record that is not yours)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE HEARING, THE NOTICE AND WHO IS TOLD",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "WHERE THIS GOES",
        "",
        "Oklahoma district court for the county where the arrest information is located.",
        "",
        "The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements.",
        "",
        "Venue: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions.",
        "",
        "THE NOTICE, AS RECORDED",
        "",
        "The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records.",
        "",
        "SERVICE, AS RECORDED",
        "",
        "By the court's notice. The proposed order must identify every agency to which it applies.",
        "",
        "WHAT YOU DO",
        "",
        "- File the petition and the proposed order with the district court clerk. You file; the court sets the hearing and gives the notice.",
        "- Make sure the proposed order names every agency it applies to. The registry records that as a packet instruction for this route in those words: The proposed order must name every agency.",
        "- Go to the hearing. Take the certified court record with you.",
        "",
        "WHERE SELF-HELP ENDS AT THE HEARING",
        "",
        "The registry records prosecutor objection, and any contested hearing, as a point where self-help ends. If the prosecuting agency objects, or the court sets a contested hearing, stop and get a lawyer. The papers in this packet still stand; what ends is doing it alone."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_identity_theft-effect-disclosure-7",
      "routeKey": "obligation:track-only:OK:ok_identity_theft",
      "routeKeys": ["obligation:track-only:OK:ok_identity_theft"],
      "role": "effect_disclosure",
      "title": "What an order does, and what it does not - Clear an Oklahoma record that is not yours",
      "description": "the effect the committed registry records for an order on this route, including the sealing-versus-destruction point (Clear an Oklahoma record that is not yours)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT AN ORDER ON THIS ROUTE ACTUALLY DOES - AND WHAT IT DOES NOT",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "SAID PLAINLY",
        "",
        "Oklahoma calls this expungement and in most adult contexts it means SEALING, not destruction. A fully sealed record is unavailable to the public and to law enforcement; a partially sealed record is hidden from the public but still available to law enforcement, and which one you get is a real difference in outcome. A sealed record can be unsealed later on a finding of changed conditions or compelling reason.",
        "",
        "WHAT THIS PACKET CANNOT PROMISE",
        "",
        "It cannot promise the court will grant the order, and it cannot promise which category of sealing you will land in. Both are the court's decisions. This page tells you what the committed record says the order does, so that nobody tells you it does more."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_deferred_dismissal-free-route-screen-1",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement"],
      "role": "free_route_screen",
      "title": "Check the free route first - Clear an Oklahoma case after a deferred sentence was dismissed",
      "description": "the page that asks, before anything is paid for, whether Oklahoma now seals this record without a petition (Clear an Oklahoma case after a deferred sentence was dismissed)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS PAGE BEFORE YOU PAY FOR ANYTHING.",
        "",
        "Oklahoma now seals some records WITHOUT a petition. If your record is one of them, filing the petition in this packet costs you money and time you did not have to spend.",
        "",
        "WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS",
        "",
        "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them.",
        "",
        "The registry records, as a point where self-help ends: Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against.",
        "",
        "THE QUESTION THIS PAGE EXISTS TO ASK",
        "",
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "{{DOTS}}",
        "",
        "WHAT LEGALEASE CANNOT TELL YOU HERE",
        "",
        "This packet does NOT decide whether the free route reaches you. No committed record in this repository resolves the amended Senate Bill 2030 (2026) text, and the registry records that question as open. So this page asks it rather than answering it.",
        "",
        "WHAT TO DO",
        "",
        "- Request your OSBI criminal history record. The registry records that it establishes what the state holds and whether anything has already been sealed under Clean Slate.",
        "- Ask the district court clerk in the county where the arrest information is located whether your record has already been sealed without a petition.",
        "- If either answer is yes, or if you are not sure, STOP. Do not file the petition in this packet, and get advice before you pay any fee.",
        "",
        "If the free route does not reach you, the rest of this packet is for the route named at the foot of this page: Clear an Oklahoma case after a deferred sentence was dismissed."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_deferred_dismissal-primary-filing-2",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement"],
      "title": "Petition - Clear an Oklahoma case after a deferred sentence was dismissed",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an Oklahoma case after a deferred sentence was dismissed)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO EXPUNGE AFTER A DEFERRED OR DELAYED SENTENCE DISMISSAL (22 O.S. §§ 18 AND 19)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Where a deferred or delayed sentence has been completed and the case dismissed, the section 18 categories provide a petition route. This is distinct from the section 991c motion, which updates the court record to show the case as dismissed but does not remove the arrest record, and the two must be screened together. Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - 18 full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - 18 date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - 18 county] In which Oklahoma county is the arrest information located?",
        "(Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - 18 case number] What is the district court case number, and what was the arresting agency?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - 18 offence description] Describe the offence in the words used on the record, rather than by any category number.",
        "(Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - 18 disposition and date] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - 18 same county arrests] What other arrests do you have in that same county?",
        "(Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - 18 prior record] What other convictions or pending charges do you have, anywhere?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - 18 restitution] Have you paid all fines, costs and restitution on the case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - 18 tribal record] Was the case handled in a tribal court, or does a tribal record exist for the same events?",
        "(Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - 18 free route checked] Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "(Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - 18 arrest record too] Do you want the arrest record cleared as well as the court record?",
        "(Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - dfd completion] When did you finish the deferred or delayed sentence, and was the case then dismissed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_identity",
          "label": "The court named in the caption of the petition - the printed line IN THE ............ COURT",
          "supply": "the Oklahoma district court for the county where the arrest information is located - take the county from the certified court record and confirm the court with that county's district court clerk",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FullLegalName",
          "label": "Item C1 - 18 full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DateOfBirth",
          "label": "Item C2 - 18 date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_County",
          "label": "Item C3 - 18 county",
          "supply": "In which Oklahoma county is the arrest information located? (Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_CaseNumber",
          "label": "Item C4 - 18 case number",
          "supply": "What is the district court case number, and what was the arresting agency?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_OffenceDescription",
          "label": "Item C5 - 18 offence description",
          "supply": "Describe the offence in the words used on the record, rather than by any category number. (Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DispositionAndDate",
          "label": "Item C6 - 18 disposition and date",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_SameCountyArrests",
          "label": "Item C7 - 18 same county arrests",
          "supply": "What other arrests do you have in that same county? (Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_PriorRecord",
          "label": "Item C8 - 18 prior record",
          "supply": "What other convictions or pending charges do you have, anywhere?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_Restitution",
          "label": "Item C9 - 18 restitution",
          "supply": "Have you paid all fines, costs and restitution on the case?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_TribalRecord",
          "label": "Item C10 - 18 tribal record",
          "supply": "Was the case handled in a tribal court, or does a tribal record exist for the same events? (Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FreeRouteChecked",
          "label": "Item C11 - 18 free route checked",
          "supply": "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything? (Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_ArrestRecordToo",
          "label": "Item C12 - 18 arrest record too",
          "supply": "Do you want the arrest record cleared as well as the court record? (Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dfdCompletion",
          "label": "Item C13 - dfd completion",
          "supply": "When did you finish the deferred or delayed sentence, and was the case then dismissed?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_deferred_dismissal, and the platform holds no value for it"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ok_18_19_deferred_dismissal-proposed-order-3",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement"],
      "title": "Proposed Order - Clear an Oklahoma case after a deferred sentence was dismissed",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clear an Oklahoma case after a deferred sentence was dismissed)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026). The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_court_identity",
          "label": "The court named in the caption of the proposed order - the printed line IN THE ............ COURT",
          "supply": "the same Oklahoma district court you name on the petition, written into the proposed order so the two captions match",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "ok_18_19_deferred_dismissal-record-gathering-instructions-4",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement"],
      "role": "record_gathering_instructions",
      "title": "Records Checklist - Clear an Oklahoma case after a deferred sentence was dismissed",
      "description": "the records the committed registry requires the participant to obtain, who holds each and how (Clear an Oklahoma case after a deferred sentence was dismissed)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE RECORDS YOU MUST HAVE IN FRONT OF YOU",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "[ ] Certified court record and disposition",
        "    Who holds it: The district court clerk in the county where the case was filed.",
        "    How to obtain it: Ask the district court clerk for the certified docket and the order or judgment showing how the case ended. The category screen runs on the offence description and the disposition, both of which come from this record.",
        "    Requirement: required; required BEFORE filing.",
        "",
        "[ ] OSBI criminal history record",
        "    Who holds it: Oklahoma State Bureau of Investigation.",
        "    How to obtain it: Request a criminal history record from OSBI. It establishes what the state holds, which arrests exist in the county and whether anything has already been sealed under Clean Slate.",
        "    Requirement: required; not required before filing, but the registry records it as required.",
        "",
        "WHAT THESE RECORDS DECIDE",
        "",
        "The registry records that the category screen for this route runs on the offence DESCRIPTION and the disposition, not on a category paragraph number: three consecutive years of amendments have made the numbering unstable. Both the description and the disposition come from the certified court record. Copy them as that record words them.",
        "",
        "This page is a checklist. It is not filed with the court and it asserts nothing about your case."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_deferred_dismissal-fee-disclosure-5",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement"],
      "role": "fee_disclosure",
      "title": "What this costs - Clear an Oklahoma case after a deferred sentence was dismissed",
      "description": "the fee and waiver position the committed registry records for this route, and the question it leaves open (Clear an Oklahoma case after a deferred sentence was dismissed)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "THE FEE, AS RECORDED",
        "",
        "The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question.",
        "",
        "THE WAIVER, AS RECORDED",
        "",
        "Not established. The district court filing fee position is an open question.",
        "",
        "WHAT YOU DO ABOUT IT, AS RECORDED",
        "",
        "Payment of the $150 OSBI processing fee for an arrest-record expungement, by cashier's check or money order - Sent to OSBI, not to the court. OSBI does not accept personal checks, and the court-record expungement is free while the arrest-record one is not. LegalEase does not handle payment.",
        "",
        "WHAT THIS PACKET DOES NOT TELL YOU",
        "",
        "It does not tell you the district court filing fee. The registry records that fee as not established and as an open question, and it records no waiver position for it. Ask the district court clerk in the county where you file, before you go, and ask in the same call whether that court has any fee-waiver route. A filing you cannot pay for is a filing you cannot make.",
        "",
        "LegalEase does not handle any payment on this route."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_deferred_dismissal-hearing-instructions-6",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement"],
      "role": "hearing_instructions",
      "title": "The hearing and the notice - Clear an Oklahoma case after a deferred sentence was dismissed",
      "description": "where this is filed, who the court notifies, and where self-help ends at the hearing (Clear an Oklahoma case after a deferred sentence was dismissed)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE HEARING, THE NOTICE AND WHO IS TOLD",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "WHERE THIS GOES",
        "",
        "Oklahoma district court for the county where the arrest information is located.",
        "",
        "The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements.",
        "",
        "Venue: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions.",
        "",
        "THE NOTICE, AS RECORDED",
        "",
        "The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records.",
        "",
        "SERVICE, AS RECORDED",
        "",
        "By the court's notice. The proposed order must identify every agency to which it applies.",
        "",
        "WHAT YOU DO",
        "",
        "- File the petition and the proposed order with the district court clerk. You file; the court sets the hearing and gives the notice.",
        "- Make sure the proposed order names every agency it applies to. The registry records that as a packet instruction for this route in those words: The proposed order must name every agency.",
        "- Go to the hearing. Take the certified court record with you.",
        "",
        "WHERE SELF-HELP ENDS AT THE HEARING",
        "",
        "The registry records prosecutor objection, and any contested hearing, as a point where self-help ends. If the prosecuting agency objects, or the court sets a contested hearing, stop and get a lawyer. The papers in this packet still stand; what ends is doing it alone."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_deferred_dismissal-effect-disclosure-7",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement", "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement"],
      "role": "effect_disclosure",
      "title": "What an order does, and what it does not - Clear an Oklahoma case after a deferred sentence was dismissed",
      "description": "the effect the committed registry records for an order on this route, including the sealing-versus-destruction point (Clear an Oklahoma case after a deferred sentence was dismissed)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT AN ORDER ON THIS ROUTE ACTUALLY DOES - AND WHAT IT DOES NOT",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "SAID PLAINLY",
        "",
        "Oklahoma calls this expungement and in most adult contexts it means SEALING, not destruction. A fully sealed record is unavailable to the public and to law enforcement; a partially sealed record is hidden from the public but still available to law enforcement, and which one you get is a real difference in outcome. A sealed record can be unsealed later on a finding of changed conditions or compelling reason.",
        "",
        "WHAT THIS PACKET CANNOT PROMISE",
        "",
        "It cannot promise the court will grant the order, and it cannot promise which category of sealing you will land in. Both are the court's decisions. This page tells you what the committed record says the order does, so that nobody tells you it does more."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_felony_conviction-free-route-screen-1",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor", "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement", "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement"],
      "role": "free_route_screen",
      "title": "Check the free route first - Clear an Oklahoma felony conviction",
      "description": "the page that asks, before anything is paid for, whether Oklahoma now seals this record without a petition (Clear an Oklahoma felony conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS PAGE BEFORE YOU PAY FOR ANYTHING.",
        "",
        "Oklahoma now seals some records WITHOUT a petition. If your record is one of them, filing the petition in this packet costs you money and time you did not have to spend.",
        "",
        "WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS",
        "",
        "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them.",
        "",
        "The registry records, as a point where self-help ends: Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against.",
        "",
        "THE QUESTION THIS PAGE EXISTS TO ASK",
        "",
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "{{DOTS}}",
        "",
        "WHAT LEGALEASE CANNOT TELL YOU HERE",
        "",
        "This packet does NOT decide whether the free route reaches you. No committed record in this repository resolves the amended Senate Bill 2030 (2026) text, and the registry records that question as open. So this page asks it rather than answering it.",
        "",
        "WHAT TO DO",
        "",
        "- Request your OSBI criminal history record. The registry records that it establishes what the state holds and whether anything has already been sealed under Clean Slate.",
        "- Ask the district court clerk in the county where the arrest information is located whether your record has already been sealed without a petition.",
        "- If either answer is yes, or if you are not sure, STOP. Do not file the petition in this packet, and get advice before you pay any fee.",
        "",
        "If the free route does not reach you, the rest of this packet is for the route named at the foot of this page: Clear an Oklahoma felony conviction."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_felony_conviction-primary-filing-2",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor", "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement", "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement"],
      "title": "Petition - Clear an Oklahoma felony conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an Oklahoma felony conviction)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO EXPUNGE A FELONY CONVICTION (22 O.S. §§ 18 AND 19)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "The section 18 categories provide petition routes for felony convictions, including a reclassified-felony route with a short window that the review directs be screened before the longer routes, and a one-felony route carrying a separate-misdemeanour look-back. Both are recorded as manual completion items because the category text was amended again by SB 2030 and has not been read. Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - 18 full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - 18 date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - 18 county] In which Oklahoma county is the arrest information located?",
        "(Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - 18 case number] What is the district court case number, and what was the arresting agency?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - 18 offence description] Describe the offence in the words used on the record, rather than by any category number.",
        "(Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - 18 disposition and date] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - 18 same county arrests] What other arrests do you have in that same county?",
        "(Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - 18 prior record] What other convictions or pending charges do you have, anywhere?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - 18 restitution] Have you paid all fines, costs and restitution on the case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - 18 tribal record] Was the case handled in a tribal court, or does a tribal record exist for the same events?",
        "(Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - 18 free route checked] Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "(Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - 18 arrest record too] Do you want the arrest record cleared as well as the court record?",
        "(Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - fel reclassified] Has the offence you were convicted of since been reclassified as a misdemeanour?",
        "(Asked because the review directs that the reclassified-felony route be screened before the longer routes, and it carries a much shorter window.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - fel other misdemeanors] Have you had any separate misdemeanour convictions, and when?",
        "(Asked because the one-felony route carries a separate-misdemeanour look-back the review directs be encoded.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_identity",
          "label": "The court named in the caption of the petition - the printed line IN THE ............ COURT",
          "supply": "the Oklahoma district court for the county where the arrest information is located - take the county from the certified court record and confirm the court with that county's district court clerk",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FullLegalName",
          "label": "Item C1 - 18 full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DateOfBirth",
          "label": "Item C2 - 18 date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_County",
          "label": "Item C3 - 18 county",
          "supply": "In which Oklahoma county is the arrest information located? (Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_CaseNumber",
          "label": "Item C4 - 18 case number",
          "supply": "What is the district court case number, and what was the arresting agency?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_OffenceDescription",
          "label": "Item C5 - 18 offence description",
          "supply": "Describe the offence in the words used on the record, rather than by any category number. (Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DispositionAndDate",
          "label": "Item C6 - 18 disposition and date",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_SameCountyArrests",
          "label": "Item C7 - 18 same county arrests",
          "supply": "What other arrests do you have in that same county? (Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_PriorRecord",
          "label": "Item C8 - 18 prior record",
          "supply": "What other convictions or pending charges do you have, anywhere?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_Restitution",
          "label": "Item C9 - 18 restitution",
          "supply": "Have you paid all fines, costs and restitution on the case?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_TribalRecord",
          "label": "Item C10 - 18 tribal record",
          "supply": "Was the case handled in a tribal court, or does a tribal record exist for the same events? (Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FreeRouteChecked",
          "label": "Item C11 - 18 free route checked",
          "supply": "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything? (Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_ArrestRecordToo",
          "label": "Item C12 - 18 arrest record too",
          "supply": "Do you want the arrest record cleared as well as the court record? (Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_felReclassified",
          "label": "Item C13 - fel reclassified",
          "supply": "Has the offence you were convicted of since been reclassified as a misdemeanour? (Asked because the review directs that the reclassified-felony route be screened before the longer routes, and it carries a much shorter window.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_felOtherMisdemeanors",
          "label": "Item C14 - fel other misdemeanors",
          "supply": "Have you had any separate misdemeanour convictions, and when? (Asked because the one-felony route carries a separate-misdemeanour look-back the review directs be encoded.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_felony_conviction, and the platform holds no value for it"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ok_18_19_felony_conviction-proposed-order-3",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor", "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement", "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement"],
      "title": "Proposed Order - Clear an Oklahoma felony conviction",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clear an Oklahoma felony conviction)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026). The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_court_identity",
          "label": "The court named in the caption of the proposed order - the printed line IN THE ............ COURT",
          "supply": "the same Oklahoma district court you name on the petition, written into the proposed order so the two captions match",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "ok_18_19_felony_conviction-record-gathering-instructions-4",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor", "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement", "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement"],
      "role": "record_gathering_instructions",
      "title": "Records Checklist - Clear an Oklahoma felony conviction",
      "description": "the records the committed registry requires the participant to obtain, who holds each and how (Clear an Oklahoma felony conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE RECORDS YOU MUST HAVE IN FRONT OF YOU",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "[ ] Certified court record and disposition",
        "    Who holds it: The district court clerk in the county where the case was filed.",
        "    How to obtain it: Ask the district court clerk for the certified docket and the order or judgment showing how the case ended. The category screen runs on the offence description and the disposition, both of which come from this record.",
        "    Requirement: required; required BEFORE filing.",
        "",
        "[ ] OSBI criminal history record",
        "    Who holds it: Oklahoma State Bureau of Investigation.",
        "    How to obtain it: Request a criminal history record from OSBI. It establishes what the state holds, which arrests exist in the county and whether anything has already been sealed under Clean Slate.",
        "    Requirement: required; not required before filing, but the registry records it as required.",
        "",
        "WHAT THESE RECORDS DECIDE",
        "",
        "The registry records that the category screen for this route runs on the offence DESCRIPTION and the disposition, not on a category paragraph number: three consecutive years of amendments have made the numbering unstable. Both the description and the disposition come from the certified court record. Copy them as that record words them.",
        "",
        "This page is a checklist. It is not filed with the court and it asserts nothing about your case."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_felony_conviction-fee-disclosure-5",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor", "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement", "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement"],
      "role": "fee_disclosure",
      "title": "What this costs - Clear an Oklahoma felony conviction",
      "description": "the fee and waiver position the committed registry records for this route, and the question it leaves open (Clear an Oklahoma felony conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "THE FEE, AS RECORDED",
        "",
        "The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question.",
        "",
        "THE WAIVER, AS RECORDED",
        "",
        "Not established. The district court filing fee position is an open question.",
        "",
        "WHAT YOU DO ABOUT IT, AS RECORDED",
        "",
        "Payment of the $150 OSBI processing fee for an arrest-record expungement, by cashier's check or money order - Sent to OSBI, not to the court. OSBI does not accept personal checks, and the court-record expungement is free while the arrest-record one is not. LegalEase does not handle payment.",
        "",
        "WHAT THIS PACKET DOES NOT TELL YOU",
        "",
        "It does not tell you the district court filing fee. The registry records that fee as not established and as an open question, and it records no waiver position for it. Ask the district court clerk in the county where you file, before you go, and ask in the same call whether that court has any fee-waiver route. A filing you cannot pay for is a filing you cannot make.",
        "",
        "LegalEase does not handle any payment on this route."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_felony_conviction-hearing-instructions-6",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor", "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement", "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement"],
      "role": "hearing_instructions",
      "title": "The hearing and the notice - Clear an Oklahoma felony conviction",
      "description": "where this is filed, who the court notifies, and where self-help ends at the hearing (Clear an Oklahoma felony conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE HEARING, THE NOTICE AND WHO IS TOLD",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "WHERE THIS GOES",
        "",
        "Oklahoma district court for the county where the arrest information is located.",
        "",
        "The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements.",
        "",
        "Venue: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions.",
        "",
        "THE NOTICE, AS RECORDED",
        "",
        "The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records.",
        "",
        "SERVICE, AS RECORDED",
        "",
        "By the court's notice. The proposed order must identify every agency to which it applies.",
        "",
        "WHAT YOU DO",
        "",
        "- File the petition and the proposed order with the district court clerk. You file; the court sets the hearing and gives the notice.",
        "- Make sure the proposed order names every agency it applies to. The registry records that as a packet instruction for this route in those words: The proposed order must name every agency.",
        "- Go to the hearing. Take the certified court record with you.",
        "",
        "WHERE SELF-HELP ENDS AT THE HEARING",
        "",
        "The registry records prosecutor objection, and any contested hearing, as a point where self-help ends. If the prosecuting agency objects, or the court sets a contested hearing, stop and get a lawyer. The papers in this packet still stand; what ends is doing it alone."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_felony_conviction-effect-disclosure-7",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor", "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement", "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement"],
      "role": "effect_disclosure",
      "title": "What an order does, and what it does not - Clear an Oklahoma felony conviction",
      "description": "the effect the committed registry records for an order on this route, including the sealing-versus-destruction point (Clear an Oklahoma felony conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT AN ORDER ON THIS ROUTE ACTUALLY DOES - AND WHAT IT DOES NOT",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "SAID PLAINLY",
        "",
        "Oklahoma calls this expungement and in most adult contexts it means SEALING, not destruction. A fully sealed record is unavailable to the public and to law enforcement; a partially sealed record is hidden from the public but still available to law enforcement, and which one you get is a real difference in outcome. A sealed record can be unsealed later on a finding of changed conditions or compelling reason.",
        "",
        "WHAT THIS PACKET CANNOT PROMISE",
        "",
        "It cannot promise the court will grant the order, and it cannot promise which category of sealing you will land in. Both are the court's decisions. This page tells you what the committed record says the order does, so that nobody tells you it does more."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_misdemeanor_conviction-free-route-screen-1",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement"],
      "role": "free_route_screen",
      "title": "Check the free route first - Clear an Oklahoma misdemeanor conviction",
      "description": "the page that asks, before anything is paid for, whether Oklahoma now seals this record without a petition (Clear an Oklahoma misdemeanor conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS PAGE BEFORE YOU PAY FOR ANYTHING.",
        "",
        "Oklahoma now seals some records WITHOUT a petition. If your record is one of them, filing the petition in this packet costs you money and time you did not have to spend.",
        "",
        "WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS",
        "",
        "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them.",
        "",
        "The registry records, as a point where self-help ends: Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against.",
        "",
        "THE QUESTION THIS PAGE EXISTS TO ASK",
        "",
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "{{DOTS}}",
        "",
        "WHAT LEGALEASE CANNOT TELL YOU HERE",
        "",
        "This packet does NOT decide whether the free route reaches you. No committed record in this repository resolves the amended Senate Bill 2030 (2026) text, and the registry records that question as open. So this page asks it rather than answering it.",
        "",
        "WHAT TO DO",
        "",
        "- Request your OSBI criminal history record. The registry records that it establishes what the state holds and whether anything has already been sealed under Clean Slate.",
        "- Ask the district court clerk in the county where the arrest information is located whether your record has already been sealed without a petition.",
        "- If either answer is yes, or if you are not sure, STOP. Do not file the petition in this packet, and get advice before you pay any fee.",
        "",
        "If the free route does not reach you, the rest of this packet is for the route named at the foot of this page: Clear an Oklahoma misdemeanor conviction."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_misdemeanor_conviction-primary-filing-2",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement"],
      "title": "Petition - Clear an Oklahoma misdemeanor conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an Oklahoma misdemeanor conviction)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO EXPUNGE A MISDEMEANOR CONVICTION (22 O.S. §§ 18 AND 19)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "The section 18 categories provide petition routes for misdemeanour convictions on stated waiting periods and prior-record conditions. Because section 18 has been amended in three consecutive years and renumbered, the screen runs on the category description rather than the paragraph number, which is the review's single best judgment call and is preserved here. Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - 18 full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - 18 date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - 18 county] In which Oklahoma county is the arrest information located?",
        "(Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - 18 case number] What is the district court case number, and what was the arresting agency?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - 18 offence description] Describe the offence in the words used on the record, rather than by any category number.",
        "(Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - 18 disposition and date] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - 18 same county arrests] What other arrests do you have in that same county?",
        "(Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - 18 prior record] What other convictions or pending charges do you have, anywhere?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - 18 restitution] Have you paid all fines, costs and restitution on the case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - 18 tribal record] Was the case handled in a tribal court, or does a tribal record exist for the same events?",
        "(Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - 18 free route checked] Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "(Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - 18 arrest record too] Do you want the arrest record cleared as well as the court record?",
        "(Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - mis sentence complete] When did you finish the sentence, including any probation, and pay everything owed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_identity",
          "label": "The court named in the caption of the petition - the printed line IN THE ............ COURT",
          "supply": "the Oklahoma district court for the county where the arrest information is located - take the county from the certified court record and confirm the court with that county's district court clerk",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FullLegalName",
          "label": "Item C1 - 18 full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DateOfBirth",
          "label": "Item C2 - 18 date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_County",
          "label": "Item C3 - 18 county",
          "supply": "In which Oklahoma county is the arrest information located? (Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_CaseNumber",
          "label": "Item C4 - 18 case number",
          "supply": "What is the district court case number, and what was the arresting agency?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_OffenceDescription",
          "label": "Item C5 - 18 offence description",
          "supply": "Describe the offence in the words used on the record, rather than by any category number. (Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DispositionAndDate",
          "label": "Item C6 - 18 disposition and date",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_SameCountyArrests",
          "label": "Item C7 - 18 same county arrests",
          "supply": "What other arrests do you have in that same county? (Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_PriorRecord",
          "label": "Item C8 - 18 prior record",
          "supply": "What other convictions or pending charges do you have, anywhere?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_Restitution",
          "label": "Item C9 - 18 restitution",
          "supply": "Have you paid all fines, costs and restitution on the case?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_TribalRecord",
          "label": "Item C10 - 18 tribal record",
          "supply": "Was the case handled in a tribal court, or does a tribal record exist for the same events? (Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FreeRouteChecked",
          "label": "Item C11 - 18 free route checked",
          "supply": "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything? (Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_ArrestRecordToo",
          "label": "Item C12 - 18 arrest record too",
          "supply": "Do you want the arrest record cleared as well as the court record? (Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_misSentenceComplete",
          "label": "Item C13 - mis sentence complete",
          "supply": "When did you finish the sentence, including any probation, and pay everything owed?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_misdemeanor_conviction, and the platform holds no value for it"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ok_18_19_misdemeanor_conviction-proposed-order-3",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement"],
      "title": "Proposed Order - Clear an Oklahoma misdemeanor conviction",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clear an Oklahoma misdemeanor conviction)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026). The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_court_identity",
          "label": "The court named in the caption of the proposed order - the printed line IN THE ............ COURT",
          "supply": "the same Oklahoma district court you name on the petition, written into the proposed order so the two captions match",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "ok_18_19_misdemeanor_conviction-record-gathering-instructions-4",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement"],
      "role": "record_gathering_instructions",
      "title": "Records Checklist - Clear an Oklahoma misdemeanor conviction",
      "description": "the records the committed registry requires the participant to obtain, who holds each and how (Clear an Oklahoma misdemeanor conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE RECORDS YOU MUST HAVE IN FRONT OF YOU",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "[ ] Certified court record and disposition",
        "    Who holds it: The district court clerk in the county where the case was filed.",
        "    How to obtain it: Ask the district court clerk for the certified docket and the order or judgment showing how the case ended. The category screen runs on the offence description and the disposition, both of which come from this record.",
        "    Requirement: required; required BEFORE filing.",
        "",
        "[ ] OSBI criminal history record",
        "    Who holds it: Oklahoma State Bureau of Investigation.",
        "    How to obtain it: Request a criminal history record from OSBI. It establishes what the state holds, which arrests exist in the county and whether anything has already been sealed under Clean Slate.",
        "    Requirement: required; not required before filing, but the registry records it as required.",
        "",
        "WHAT THESE RECORDS DECIDE",
        "",
        "The registry records that the category screen for this route runs on the offence DESCRIPTION and the disposition, not on a category paragraph number: three consecutive years of amendments have made the numbering unstable. Both the description and the disposition come from the certified court record. Copy them as that record words them.",
        "",
        "This page is a checklist. It is not filed with the court and it asserts nothing about your case."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_misdemeanor_conviction-fee-disclosure-5",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement"],
      "role": "fee_disclosure",
      "title": "What this costs - Clear an Oklahoma misdemeanor conviction",
      "description": "the fee and waiver position the committed registry records for this route, and the question it leaves open (Clear an Oklahoma misdemeanor conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "THE FEE, AS RECORDED",
        "",
        "The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question.",
        "",
        "THE WAIVER, AS RECORDED",
        "",
        "Not established. The district court filing fee position is an open question.",
        "",
        "WHAT YOU DO ABOUT IT, AS RECORDED",
        "",
        "Payment of the $150 OSBI processing fee for an arrest-record expungement, by cashier's check or money order - Sent to OSBI, not to the court. OSBI does not accept personal checks, and the court-record expungement is free while the arrest-record one is not. LegalEase does not handle payment.",
        "",
        "WHAT THIS PACKET DOES NOT TELL YOU",
        "",
        "It does not tell you the district court filing fee. The registry records that fee as not established and as an open question, and it records no waiver position for it. Ask the district court clerk in the county where you file, before you go, and ask in the same call whether that court has any fee-waiver route. A filing you cannot pay for is a filing you cannot make.",
        "",
        "LegalEase does not handle any payment on this route."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_misdemeanor_conviction-hearing-instructions-6",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement"],
      "role": "hearing_instructions",
      "title": "The hearing and the notice - Clear an Oklahoma misdemeanor conviction",
      "description": "where this is filed, who the court notifies, and where self-help ends at the hearing (Clear an Oklahoma misdemeanor conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE HEARING, THE NOTICE AND WHO IS TOLD",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "WHERE THIS GOES",
        "",
        "Oklahoma district court for the county where the arrest information is located.",
        "",
        "The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements.",
        "",
        "Venue: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions.",
        "",
        "THE NOTICE, AS RECORDED",
        "",
        "The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records.",
        "",
        "SERVICE, AS RECORDED",
        "",
        "By the court's notice. The proposed order must identify every agency to which it applies.",
        "",
        "WHAT YOU DO",
        "",
        "- File the petition and the proposed order with the district court clerk. You file; the court sets the hearing and gives the notice.",
        "- Make sure the proposed order names every agency it applies to. The registry records that as a packet instruction for this route in those words: The proposed order must name every agency.",
        "- Go to the hearing. Take the certified court record with you.",
        "",
        "WHERE SELF-HELP ENDS AT THE HEARING",
        "",
        "The registry records prosecutor objection, and any contested hearing, as a point where self-help ends. If the prosecuting agency objects, or the court sets a contested hearing, stop and get a lawyer. The papers in this packet still stand; what ends is doing it alone."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_misdemeanor_conviction-effect-disclosure-7",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement"],
      "role": "effect_disclosure",
      "title": "What an order does, and what it does not - Clear an Oklahoma misdemeanor conviction",
      "description": "the effect the committed registry records for an order on this route, including the sealing-versus-destruction point (Clear an Oklahoma misdemeanor conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT AN ORDER ON THIS ROUTE ACTUALLY DOES - AND WHAT IT DOES NOT",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "SAID PLAINLY",
        "",
        "Oklahoma calls this expungement and in most adult contexts it means SEALING, not destruction. A fully sealed record is unavailable to the public and to law enforcement; a partially sealed record is hidden from the public but still available to law enforcement, and which one you get is a real difference in outcome. A sealed record can be unsealed later on a finding of changed conditions or compelling reason.",
        "",
        "WHAT THIS PACKET CANNOT PROMISE",
        "",
        "It cannot promise the court will grant the order, and it cannot promise which category of sealing you will land in. Both are the court's decisions. This page tells you what the committed record says the order does, so that nobody tells you it does more."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_nonconviction-free-route-screen-1",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed", "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed", "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement"],
      "role": "free_route_screen",
      "title": "Check the free route first - Clear an Oklahoma arrest that did not end in a conviction",
      "description": "the page that asks, before anything is paid for, whether Oklahoma now seals this record without a petition (Clear an Oklahoma arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS PAGE BEFORE YOU PAY FOR ANYTHING.",
        "",
        "Oklahoma now seals some records WITHOUT a petition. If your record is one of them, filing the petition in this packet costs you money and time you did not have to spend.",
        "",
        "WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS",
        "",
        "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them.",
        "",
        "The registry records, as a point where self-help ends: Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against.",
        "",
        "THE QUESTION THIS PAGE EXISTS TO ASK",
        "",
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "{{DOTS}}",
        "",
        "WHAT LEGALEASE CANNOT TELL YOU HERE",
        "",
        "This packet does NOT decide whether the free route reaches you. No committed record in this repository resolves the amended Senate Bill 2030 (2026) text, and the registry records that question as open. So this page asks it rather than answering it.",
        "",
        "WHAT TO DO",
        "",
        "- Request your OSBI criminal history record. The registry records that it establishes what the state holds and whether anything has already been sealed under Clean Slate.",
        "- Ask the district court clerk in the county where the arrest information is located whether your record has already been sealed without a petition.",
        "- If either answer is yes, or if you are not sure, STOP. Do not file the petition in this packet, and get advice before you pay any fee.",
        "",
        "If the free route does not reach you, the rest of this packet is for the route named at the foot of this page: Clear an Oklahoma arrest that did not end in a conviction."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_nonconviction-primary-filing-2",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed", "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed", "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement"],
      "title": "Petition - Clear an Oklahoma arrest that did not end in a conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an Oklahoma arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO EXPUNGE A NON-CONVICTION OR INNOCENCE RECORD (22 O.S. §§ 18 AND 19)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "The section 18 categories include records where the person was not charged, was acquitted, was factually innocent, or where the charge was dismissed. The petition goes to the district court in the county where the arrest information is located, the court gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records, and the standard is a balancing test: the court may seal if the harm to privacy or the danger of unwarranted adverse consequences outweighs the public interest in retaining the records. Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - 18 full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - 18 date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - 18 county] In which Oklahoma county is the arrest information located?",
        "(Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - 18 case number] What is the district court case number, and what was the arresting agency?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - 18 offence description] Describe the offence in the words used on the record, rather than by any category number.",
        "(Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - 18 disposition and date] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - 18 same county arrests] What other arrests do you have in that same county?",
        "(Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - 18 prior record] What other convictions or pending charges do you have, anywhere?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - 18 restitution] Have you paid all fines, costs and restitution on the case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - 18 tribal record] Was the case handled in a tribal court, or does a tribal record exist for the same events?",
        "(Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - 18 free route checked] Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "(Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - 18 arrest record too] Do you want the arrest record cleared as well as the court record?",
        "(Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - ncv no refile] Has the prosecutor confirmed the case will not be refiled?",
        "(Asked because prosecutor no-refile confirmation is a self-help boundary the review identifies, and several non-conviction categories turn on it.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_identity",
          "label": "The court named in the caption of the petition - the printed line IN THE ............ COURT",
          "supply": "the Oklahoma district court for the county where the arrest information is located - take the county from the certified court record and confirm the court with that county's district court clerk",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FullLegalName",
          "label": "Item C1 - 18 full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DateOfBirth",
          "label": "Item C2 - 18 date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_County",
          "label": "Item C3 - 18 county",
          "supply": "In which Oklahoma county is the arrest information located? (Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_CaseNumber",
          "label": "Item C4 - 18 case number",
          "supply": "What is the district court case number, and what was the arresting agency?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_OffenceDescription",
          "label": "Item C5 - 18 offence description",
          "supply": "Describe the offence in the words used on the record, rather than by any category number. (Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DispositionAndDate",
          "label": "Item C6 - 18 disposition and date",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_SameCountyArrests",
          "label": "Item C7 - 18 same county arrests",
          "supply": "What other arrests do you have in that same county? (Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_PriorRecord",
          "label": "Item C8 - 18 prior record",
          "supply": "What other convictions or pending charges do you have, anywhere?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_Restitution",
          "label": "Item C9 - 18 restitution",
          "supply": "Have you paid all fines, costs and restitution on the case?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_TribalRecord",
          "label": "Item C10 - 18 tribal record",
          "supply": "Was the case handled in a tribal court, or does a tribal record exist for the same events? (Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FreeRouteChecked",
          "label": "Item C11 - 18 free route checked",
          "supply": "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything? (Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_ArrestRecordToo",
          "label": "Item C12 - 18 arrest record too",
          "supply": "Do you want the arrest record cleared as well as the court record? (Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ncvNoRefile",
          "label": "Item C13 - ncv no refile",
          "supply": "Has the prosecutor confirmed the case will not be refiled? (Asked because prosecutor no-refile confirmation is a self-help boundary the review identifies, and several non-conviction categories turn on it.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_nonconviction, and the platform holds no value for it"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ok_18_19_nonconviction-proposed-order-3",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed", "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed", "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement"],
      "title": "Proposed Order - Clear an Oklahoma arrest that did not end in a conviction",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clear an Oklahoma arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026). The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_court_identity",
          "label": "The court named in the caption of the proposed order - the printed line IN THE ............ COURT",
          "supply": "the same Oklahoma district court you name on the petition, written into the proposed order so the two captions match",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "ok_18_19_nonconviction-record-gathering-instructions-4",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed", "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed", "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement"],
      "role": "record_gathering_instructions",
      "title": "Records Checklist - Clear an Oklahoma arrest that did not end in a conviction",
      "description": "the records the committed registry requires the participant to obtain, who holds each and how (Clear an Oklahoma arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE RECORDS YOU MUST HAVE IN FRONT OF YOU",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "[ ] Certified court record and disposition",
        "    Who holds it: The district court clerk in the county where the case was filed.",
        "    How to obtain it: Ask the district court clerk for the certified docket and the order or judgment showing how the case ended. The category screen runs on the offence description and the disposition, both of which come from this record.",
        "    Requirement: required; required BEFORE filing.",
        "",
        "[ ] OSBI criminal history record",
        "    Who holds it: Oklahoma State Bureau of Investigation.",
        "    How to obtain it: Request a criminal history record from OSBI. It establishes what the state holds, which arrests exist in the county and whether anything has already been sealed under Clean Slate.",
        "    Requirement: required; not required before filing, but the registry records it as required.",
        "",
        "WHAT THESE RECORDS DECIDE",
        "",
        "The registry records that the category screen for this route runs on the offence DESCRIPTION and the disposition, not on a category paragraph number: three consecutive years of amendments have made the numbering unstable. Both the description and the disposition come from the certified court record. Copy them as that record words them.",
        "",
        "This page is a checklist. It is not filed with the court and it asserts nothing about your case."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_nonconviction-fee-disclosure-5",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed", "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed", "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement"],
      "role": "fee_disclosure",
      "title": "What this costs - Clear an Oklahoma arrest that did not end in a conviction",
      "description": "the fee and waiver position the committed registry records for this route, and the question it leaves open (Clear an Oklahoma arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "THE FEE, AS RECORDED",
        "",
        "The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question.",
        "",
        "THE WAIVER, AS RECORDED",
        "",
        "Not established. The district court filing fee position is an open question.",
        "",
        "WHAT YOU DO ABOUT IT, AS RECORDED",
        "",
        "Payment of the $150 OSBI processing fee for an arrest-record expungement, by cashier's check or money order - Sent to OSBI, not to the court. OSBI does not accept personal checks, and the court-record expungement is free while the arrest-record one is not. LegalEase does not handle payment.",
        "",
        "WHAT THIS PACKET DOES NOT TELL YOU",
        "",
        "It does not tell you the district court filing fee. The registry records that fee as not established and as an open question, and it records no waiver position for it. Ask the district court clerk in the county where you file, before you go, and ask in the same call whether that court has any fee-waiver route. A filing you cannot pay for is a filing you cannot make.",
        "",
        "LegalEase does not handle any payment on this route."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_nonconviction-hearing-instructions-6",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed", "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed", "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement"],
      "role": "hearing_instructions",
      "title": "The hearing and the notice - Clear an Oklahoma arrest that did not end in a conviction",
      "description": "where this is filed, who the court notifies, and where self-help ends at the hearing (Clear an Oklahoma arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE HEARING, THE NOTICE AND WHO IS TOLD",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "WHERE THIS GOES",
        "",
        "Oklahoma district court for the county where the arrest information is located.",
        "",
        "The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements.",
        "",
        "Venue: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions.",
        "",
        "THE NOTICE, AS RECORDED",
        "",
        "The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records.",
        "",
        "SERVICE, AS RECORDED",
        "",
        "By the court's notice. The proposed order must identify every agency to which it applies.",
        "",
        "WHAT YOU DO",
        "",
        "- File the petition and the proposed order with the district court clerk. You file; the court sets the hearing and gives the notice.",
        "- Make sure the proposed order names every agency it applies to. The registry records that as a packet instruction for this route in those words: The proposed order must name every agency.",
        "- Go to the hearing. Take the certified court record with you.",
        "",
        "WHERE SELF-HELP ENDS AT THE HEARING",
        "",
        "The registry records prosecutor objection, and any contested hearing, as a point where self-help ends. If the prosecuting agency objects, or the court sets a contested hearing, stop and get a lawyer. The papers in this packet still stand; what ends is doing it alone."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_nonconviction-effect-disclosure-7",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement", "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed", "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed", "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement"],
      "role": "effect_disclosure",
      "title": "What an order does, and what it does not - Clear an Oklahoma arrest that did not end in a conviction",
      "description": "the effect the committed registry records for an order on this route, including the sealing-versus-destruction point (Clear an Oklahoma arrest that did not end in a conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT AN ORDER ON THIS ROUTE ACTUALLY DOES - AND WHAT IT DOES NOT",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "SAID PLAINLY",
        "",
        "Oklahoma calls this expungement and in most adult contexts it means SEALING, not destruction. A fully sealed record is unavailable to the public and to law enforcement; a partially sealed record is hidden from the public but still available to law enforcement, and which one you get is a real difference in outcome. A sealed record can be unsealed later on a finding of changed conditions or compelling reason.",
        "",
        "WHAT THIS PACKET CANNOT PROMISE",
        "",
        "It cannot promise the court will grant the order, and it cannot promise which category of sealing you will land in. Both are the court's decisions. This page tells you what the committed record says the order does, so that nobody tells you it does more."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_pardon-free-route-screen-1",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement"],
      "role": "free_route_screen",
      "title": "Check the free route first - Clear an Oklahoma record after a pardon",
      "description": "the page that asks, before anything is paid for, whether Oklahoma now seals this record without a petition (Clear an Oklahoma record after a pardon)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS PAGE BEFORE YOU PAY FOR ANYTHING.",
        "",
        "Oklahoma now seals some records WITHOUT a petition. If your record is one of them, filing the petition in this packet costs you money and time you did not have to spend.",
        "",
        "WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS",
        "",
        "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them.",
        "",
        "The registry records, as a point where self-help ends: Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against.",
        "",
        "THE QUESTION THIS PAGE EXISTS TO ASK",
        "",
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "{{DOTS}}",
        "",
        "WHAT LEGALEASE CANNOT TELL YOU HERE",
        "",
        "This packet does NOT decide whether the free route reaches you. No committed record in this repository resolves the amended Senate Bill 2030 (2026) text, and the registry records that question as open. So this page asks it rather than answering it.",
        "",
        "WHAT TO DO",
        "",
        "- Request your OSBI criminal history record. The registry records that it establishes what the state holds and whether anything has already been sealed under Clean Slate.",
        "- Ask the district court clerk in the county where the arrest information is located whether your record has already been sealed without a petition.",
        "- If either answer is yes, or if you are not sure, STOP. Do not file the petition in this packet, and get advice before you pay any fee.",
        "",
        "If the free route does not reach you, the rest of this packet is for the route named at the foot of this page: Clear an Oklahoma record after a pardon."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_pardon-primary-filing-2",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement"],
      "title": "Petition - Clear an Oklahoma record after a pardon",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an Oklahoma record after a pardon)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO EXPUNGE AFTER A PARDON (22 O.S. §§ 18 AND 19)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "A section 18 category provides a petition route following a pardon. Obtaining the pardon itself is a matter for the Governor and the Pardon and Parole Board and is outside scope; this track begins once the participant holds one. Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - 18 full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - 18 date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - 18 county] In which Oklahoma county is the arrest information located?",
        "(Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - 18 case number] What is the district court case number, and what was the arresting agency?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - 18 offence description] Describe the offence in the words used on the record, rather than by any category number.",
        "(Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - 18 disposition and date] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - 18 same county arrests] What other arrests do you have in that same county?",
        "(Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - 18 prior record] What other convictions or pending charges do you have, anywhere?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - 18 restitution] Have you paid all fines, costs and restitution on the case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - 18 tribal record] Was the case handled in a tribal court, or does a tribal record exist for the same events?",
        "(Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - 18 free route checked] Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "(Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - 18 arrest record too] Do you want the arrest record cleared as well as the court record?",
        "(Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - pdn pardon date] On what date was the pardon granted, and do you have the document?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_identity",
          "label": "The court named in the caption of the petition - the printed line IN THE ............ COURT",
          "supply": "the Oklahoma district court for the county where the arrest information is located - take the county from the certified court record and confirm the court with that county's district court clerk",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FullLegalName",
          "label": "Item C1 - 18 full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DateOfBirth",
          "label": "Item C2 - 18 date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_County",
          "label": "Item C3 - 18 county",
          "supply": "In which Oklahoma county is the arrest information located? (Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_CaseNumber",
          "label": "Item C4 - 18 case number",
          "supply": "What is the district court case number, and what was the arresting agency?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_OffenceDescription",
          "label": "Item C5 - 18 offence description",
          "supply": "Describe the offence in the words used on the record, rather than by any category number. (Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_DispositionAndDate",
          "label": "Item C6 - 18 disposition and date",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_SameCountyArrests",
          "label": "Item C7 - 18 same county arrests",
          "supply": "What other arrests do you have in that same county? (Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_PriorRecord",
          "label": "Item C8 - 18 prior record",
          "supply": "What other convictions or pending charges do you have, anywhere?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_Restitution",
          "label": "Item C9 - 18 restitution",
          "supply": "Have you paid all fines, costs and restitution on the case?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_TribalRecord",
          "label": "Item C10 - 18 tribal record",
          "supply": "Was the case handled in a tribal court, or does a tribal record exist for the same events? (Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_FreeRouteChecked",
          "label": "Item C11 - 18 free route checked",
          "supply": "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything? (Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_18_ArrestRecordToo",
          "label": "Item C12 - 18 arrest record too",
          "supply": "Do you want the arrest record cleared as well as the court record? (Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pdnPardonDate",
          "label": "Item C13 - pdn pardon date",
          "supply": "On what date was the pardon granted, and do you have the document?",
          "why": "the committed track registry records this as a required generation input for ok_18_19_pardon, and the platform holds no value for it"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ok_18_19_pardon-proposed-order-3",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement"],
      "title": "Proposed Order - Clear an Oklahoma record after a pardon",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clear an Oklahoma record after a pardon)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026). The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_court_identity",
          "label": "The court named in the caption of the proposed order - the printed line IN THE ............ COURT",
          "supply": "the same Oklahoma district court you name on the petition, written into the proposed order so the two captions match",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "ok_18_19_pardon-record-gathering-instructions-4",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement"],
      "role": "record_gathering_instructions",
      "title": "Records Checklist - Clear an Oklahoma record after a pardon",
      "description": "the records the committed registry requires the participant to obtain, who holds each and how (Clear an Oklahoma record after a pardon)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE RECORDS YOU MUST HAVE IN FRONT OF YOU",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "[ ] Certified court record and disposition",
        "    Who holds it: The district court clerk in the county where the case was filed.",
        "    How to obtain it: Ask the district court clerk for the certified docket and the order or judgment showing how the case ended. The category screen runs on the offence description and the disposition, both of which come from this record.",
        "    Requirement: required; required BEFORE filing.",
        "",
        "[ ] OSBI criminal history record",
        "    Who holds it: Oklahoma State Bureau of Investigation.",
        "    How to obtain it: Request a criminal history record from OSBI. It establishes what the state holds, which arrests exist in the county and whether anything has already been sealed under Clean Slate.",
        "    Requirement: required; not required before filing, but the registry records it as required.",
        "",
        "WHAT THESE RECORDS DECIDE",
        "",
        "The registry records that the category screen for this route runs on the offence DESCRIPTION and the disposition, not on a category paragraph number: three consecutive years of amendments have made the numbering unstable. Both the description and the disposition come from the certified court record. Copy them as that record words them.",
        "",
        "This page is a checklist. It is not filed with the court and it asserts nothing about your case."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_pardon-fee-disclosure-5",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement"],
      "role": "fee_disclosure",
      "title": "What this costs - Clear an Oklahoma record after a pardon",
      "description": "the fee and waiver position the committed registry records for this route, and the question it leaves open (Clear an Oklahoma record after a pardon)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "THE FEE, AS RECORDED",
        "",
        "The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question.",
        "",
        "THE WAIVER, AS RECORDED",
        "",
        "Not established. The district court filing fee position is an open question.",
        "",
        "WHAT YOU DO ABOUT IT, AS RECORDED",
        "",
        "Payment of the $150 OSBI processing fee for an arrest-record expungement, by cashier's check or money order - Sent to OSBI, not to the court. OSBI does not accept personal checks, and the court-record expungement is free while the arrest-record one is not. LegalEase does not handle payment.",
        "",
        "WHAT THIS PACKET DOES NOT TELL YOU",
        "",
        "It does not tell you the district court filing fee. The registry records that fee as not established and as an open question, and it records no waiver position for it. Ask the district court clerk in the county where you file, before you go, and ask in the same call whether that court has any fee-waiver route. A filing you cannot pay for is a filing you cannot make.",
        "",
        "LegalEase does not handle any payment on this route."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_pardon-hearing-instructions-6",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement"],
      "role": "hearing_instructions",
      "title": "The hearing and the notice - Clear an Oklahoma record after a pardon",
      "description": "where this is filed, who the court notifies, and where self-help ends at the hearing (Clear an Oklahoma record after a pardon)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE HEARING, THE NOTICE AND WHO IS TOLD",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "WHERE THIS GOES",
        "",
        "Oklahoma district court for the county where the arrest information is located.",
        "",
        "The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements.",
        "",
        "Venue: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions.",
        "",
        "THE NOTICE, AS RECORDED",
        "",
        "The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records.",
        "",
        "SERVICE, AS RECORDED",
        "",
        "By the court's notice. The proposed order must identify every agency to which it applies.",
        "",
        "WHAT YOU DO",
        "",
        "- File the petition and the proposed order with the district court clerk. You file; the court sets the hearing and gives the notice.",
        "- Make sure the proposed order names every agency it applies to. The registry records that as a packet instruction for this route in those words: The proposed order must name every agency.",
        "- Go to the hearing. Take the certified court record with you.",
        "",
        "WHERE SELF-HELP ENDS AT THE HEARING",
        "",
        "The registry records prosecutor objection, and any contested hearing, as a point where self-help ends. If the prosecuting agency objects, or the court sets a contested hearing, stop and get a lawyer. The papers in this packet still stand; what ends is doing it alone."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_18_19_pardon-effect-disclosure-7",
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
      "routeKeys": ["obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement"],
      "role": "effect_disclosure",
      "title": "What an order does, and what it does not - Clear an Oklahoma record after a pardon",
      "description": "the effect the committed registry records for an order on this route, including the sealing-versus-destruction point (Clear an Oklahoma record after a pardon)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT AN ORDER ON THIS ROUTE ACTUALLY DOES - AND WHAT IT DOES NOT",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "SAID PLAINLY",
        "",
        "Oklahoma calls this expungement and in most adult contexts it means SEALING, not destruction. A fully sealed record is unavailable to the public and to law enforcement; a partially sealed record is hidden from the public but still available to law enforcement, and which one you get is a real difference in outcome. A sealed record can be unsealed later on a finding of changed conditions or compelling reason.",
        "",
        "WHAT THIS PACKET CANNOT PROMISE",
        "",
        "It cannot promise the court will grant the order, and it cannot promise which category of sealing you will land in. Both are the court's decisions. This page tells you what the committed record says the order does, so that nobody tells you it does more."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_991c_deferred-arrest-record-screen-1",
      "routeKey": "obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c",
      "routeKeys": ["obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c"],
      "role": "arrest_record_screen",
      "title": "What this motion does not do - Update an Oklahoma deferred sentence so the case shows as dismissed",
      "description": "the page that states, before anything is filed, that a section 991c order does not remove the arrest record (Update an Oklahoma deferred sentence so the case shows as dismissed)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS PAGE FIRST. A SECTION 991c ORDER DOES NOT CLEAR YOUR ARREST RECORD.",
        "",
        "WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS",
        "",
        "A section 991c expungement updates the court record of a completed deferred sentence so the case shows as dismissed. It is not a full record clearing: the Oklahoma State Bureau of Investigation states in terms that \"A Section 991(c) expungement will not expunge (remove) the arrest record.\" The review calls this the most important consumer-facing point in Oklahoma, because a participant who obtains only a section 991c order and is told their record is clear has been misled. Every section 991c motion is therefore paired with a section 18 arrest-record screen.",
        "",
        "The registry's packet instruction for this route is a single sentence: Always pair a Sec. 991c motion with a Sec. 18 arrest-record screen.",
        "",
        "THE QUESTION THIS PAGE EXISTS TO ASK",
        "",
        "Is your goal to have the arrest itself no longer show, as well as the court case?",
        "{{DOTS}}",
        "",
        "IF THE ANSWER IS YES",
        "",
        "The motion in this packet is not enough on its own. An arrest-record expungement is a separate route under 22 O.S. Sec. 18, with its own petition, its own hearing and its own cost - the registry records that expunging a court record is free while a separate arrest-record expungement carries a $150 processing fee. Ask about that route before you rely on this one, and do not tell anyone your record is clear on the strength of a section 991c order alone.",
        "",
        "WHAT TO DO",
        "",
        "- Request your OSBI criminal history record. The registry records that it shows what the state holds on the arrest, which is precisely what the section 991c order will not change.",
        "- Read that record before you decide whether this motion, on its own, does what you want."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_991c_deferred-primary-filing-2",
      "routeKey": "obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c",
      "routeKeys": ["obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c"],
      "title": "Petition - Update an Oklahoma deferred sentence so the case shows as dismissed",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Update an Oklahoma deferred sentence so the case shows as dismissed)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(The Oklahoma district court that entered the deferred sentence - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "MOTION TO EXPUNGE THE COURT RECORD OF A COMPLETED DEFERRED SENTENCE (22 O.S. § 991C)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under 22 O.S. § 991c; 22 O.S. § 18; 22 O.S. § 19 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "A section 991c expungement updates the court record of a completed deferred sentence so the case shows as dismissed. It is not a full record clearing: the Oklahoma State Bureau of Investigation states in terms that \"A Section 991(c) expungement will not expunge (remove) the arrest record.\" The review calls this the most important consumer-facing point in Oklahoma, because a participant who obtains only a section 991c order and is told their record is clear has been misled. Every section 991c motion is therefore paired with a section 18 arrest-record screen. Oklahoma says expungement but in most adult contexts means sealing. Fully sealed records are unavailable to the public and to law enforcement, with OSBI retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement. Title 22 section 19 does not authorise physical destruction, a sealed record may be unsealed on changed conditions or a compelling reason, and under section 19(N) a sealed record not unsealed within ten years may be obliterated or destroyed.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - dfc full legal name] What is your full legal name?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - dfc county] Which Oklahoma county and district court handled the case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - dfc case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - dfc completion date] When did you finish the deferred sentence and everything it required?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - dfc arrest record goal] Is your goal to have the arrest itself no longer show, as well as the court case?",
        "(Asked because a section 991c order does not remove the arrest record, and a participant whose real goal is the arrest record needs a section 18 petition instead of, or as well as, this motion.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under 22 O.S. § 991c; 22 O.S. § 18; 22 O.S. § 19.",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_identity",
          "label": "The court named in the caption of the petition - the printed line IN THE ............ COURT",
          "supply": "the Oklahoma district court for the county where the arrest information is located - take the county from the certified court record and confirm the court with that county's district court clerk",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "rbf",
          "id": "fact_dfcFullLegalName",
          "label": "Item C1 - dfc full legal name",
          "supply": "What is your full legal name?",
          "why": "the committed track registry records this as a required generation input for ok_991c_deferred, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dfcCounty",
          "label": "Item C2 - dfc county",
          "supply": "Which Oklahoma county and district court handled the case?",
          "why": "the committed track registry records this as a required generation input for ok_991c_deferred, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dfcCaseNumber",
          "label": "Item C3 - dfc case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for ok_991c_deferred, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dfcCompletionDate",
          "label": "Item C4 - dfc completion date",
          "supply": "When did you finish the deferred sentence and everything it required?",
          "why": "the committed track registry records this as a required generation input for ok_991c_deferred, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dfcArrestRecordGoal",
          "label": "Item C5 - dfc arrest record goal",
          "supply": "Is your goal to have the arrest itself no longer show, as well as the court case? (Asked because a section 991c order does not remove the arrest record, and a participant whose real goal is the arrest record needs a section 18 petition instead of, or as well as, this motion.)",
          "why": "the committed track registry records this as a required generation input for ok_991c_deferred, and the platform holds no value for it"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ok_991c_deferred-proposed-order-3",
      "routeKey": "obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c",
      "routeKeys": ["obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c"],
      "title": "Proposed Order - Update an Oklahoma deferred sentence so the case shows as dismissed",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Update an Oklahoma deferred sentence so the case shows as dismissed)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(The Oklahoma district court that entered the deferred sentence)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under 22 O.S. § 991c; 22 O.S. § 18; 22 O.S. § 19. The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_court_identity",
          "label": "The court named in the caption of the proposed order - the printed line IN THE ............ COURT",
          "supply": "the same Oklahoma district court you name on the petition, written into the proposed order so the two captions match",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "ok_991c_deferred-effect-disclosure-4",
      "routeKey": "obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c",
      "routeKeys": ["obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c"],
      "role": "effect_disclosure",
      "title": "What an order does, and what it does not - Update an Oklahoma deferred sentence so the case shows as dismissed",
      "description": "the effect the committed registry records for an order on this route, including the sealing-versus-destruction point (Update an Oklahoma deferred sentence so the case shows as dismissed)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT AN ORDER ON THIS ROUTE ACTUALLY DOES - AND WHAT IT DOES NOT",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "Oklahoma says expungement but in most adult contexts means sealing. Fully sealed records are unavailable to the public and to law enforcement, with OSBI retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement. Title 22 section 19 does not authorise physical destruction, a sealed record may be unsealed on changed conditions or a compelling reason, and under section 19(N) a sealed record not unsealed within ten years may be obliterated or destroyed.",
        "",
        "SAID PLAINLY",
        "",
        "A section 991c order changes how the COURT record reads. It does not remove the ARREST record. Do not say your record is clear on the strength of this order alone.",
        "",
        "WHAT THIS PACKET CANNOT PROMISE",
        "",
        "It cannot promise the court will grant the order, and it cannot promise which category of sealing you will land in. Both are the court's decisions. This page tells you what the committed record says the order does, so that nobody tells you it does more."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_vpo_60_18-free-route-screen-1",
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief",
      "routeKeys": ["obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"],
      "role": "free_route_screen",
      "title": "Check the free route first - Clear an Oklahoma protective order record",
      "description": "the page that asks, before anything is paid for, whether Oklahoma now seals this record without a petition (Clear an Oklahoma protective order record)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "READ THIS PAGE BEFORE YOU PAY FOR ANYTHING.",
        "",
        "Oklahoma now seals some records WITHOUT a petition. If your record is one of them, filing the petition in this packet costs you money and time you did not have to spend.",
        "",
        "WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS",
        "",
        "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them.",
        "",
        "The registry records, as a point where self-help ends: Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against.",
        "",
        "THE QUESTION THIS PAGE EXISTS TO ASK",
        "",
        "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "{{DOTS}}",
        "",
        "WHAT LEGALEASE CANNOT TELL YOU HERE",
        "",
        "This packet does NOT decide whether the free route reaches you. No committed record in this repository resolves the amended Senate Bill 2030 (2026) text, and the registry records that question as open. So this page asks it rather than answering it.",
        "",
        "WHAT TO DO",
        "",
        "- Request your OSBI criminal history record. The registry records that it establishes what the state holds and whether anything has already been sealed under Clean Slate.",
        "- Ask the district court clerk in the county where the arrest information is located whether your record has already been sealed without a petition.",
        "- If either answer is yes, or if you are not sure, STOP. Do not file the petition in this packet, and get advice before you pay any fee.",
        "",
        "If the free route does not reach you, the rest of this packet is for the route named at the foot of this page: Clear an Oklahoma protective order record."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_vpo_60_18-primary-filing-2",
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief",
      "routeKeys": ["obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"],
      "title": "Petition - Clear an Oklahoma protective order record",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an Oklahoma protective order record)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PETITION TO EXPUNGE VICTIM PROTECTIVE ORDER RECORDS (22 O.S. § 60.18)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Title 22 section 60.18 provides for expungement of victim protective order records. The review classifies this as custom_pleading and approves it with limitations; the section's text was not read. Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - vpo full legal name] What is your full legal name, and have you used any other names?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - vpo date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - vpo county] In which Oklahoma county is the arrest information located?",
        "(Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - vpo case number] What is the district court case number, and what was the arresting agency?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - vpo offence description] Describe the offence in the words used on the record, rather than by any category number.",
        "(Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - vpo disposition and date] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - vpo same county arrests] What other arrests do you have in that same county?",
        "(Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - vpo prior record] What other convictions or pending charges do you have, anywhere?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - vpo restitution] Have you paid all fines, costs and restitution on the case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - vpo tribal record] Was the case handled in a tribal court, or does a tribal record exist for the same events?",
        "(Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - vpo free route checked] Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything?",
        "(Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - vpo arrest record too] Do you want the arrest record cleared as well as the court record?",
        "(Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - vpo outcome] What happened with the protective order — was it dismissed, denied, or did it expire?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_identity",
          "label": "The court named in the caption of the petition - the printed line IN THE ............ COURT",
          "supply": "the Oklahoma district court for the county where the arrest information is located - take the county from the certified court record and confirm the court with that county's district court clerk",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoFullLegalName",
          "label": "Item C1 - vpo full legal name",
          "supply": "What is your full legal name, and have you used any other names?",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoDateOfBirth",
          "label": "Item C2 - vpo date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoCounty",
          "label": "Item C3 - vpo county",
          "supply": "In which Oklahoma county is the arrest information located? (Asked because venue is the district court in the county where the arrest information is located, and because multiple arrests in the same county may be combined in one petition while separate counties need separate petitions.)",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoCaseNumber",
          "label": "Item C4 - vpo case number",
          "supply": "What is the district court case number, and what was the arresting agency?",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoOffenceDescription",
          "label": "Item C5 - vpo offence description",
          "supply": "Describe the offence in the words used on the record, rather than by any category number. (Asked because three consecutive years of amendments and renumbering have made the category paragraph numbers unstable, so the screen runs on the description.)",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoDispositionAndDate",
          "label": "Item C6 - vpo disposition and date",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoSameCountyArrests",
          "label": "Item C7 - vpo same county arrests",
          "supply": "What other arrests do you have in that same county? (Asked because same-county arrests may be combined in one petition, which saves the participant filings.)",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoPriorRecord",
          "label": "Item C8 - vpo prior record",
          "supply": "What other convictions or pending charges do you have, anywhere?",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoRestitution",
          "label": "Item C9 - vpo restitution",
          "supply": "Have you paid all fines, costs and restitution on the case?",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoTribalRecord",
          "label": "Item C10 - vpo tribal record",
          "supply": "Was the case handled in a tribal court, or does a tribal record exist for the same events? (Asked because Oklahoma orders do not reach tribal records and the review records tribal records as a live post-McGirt issue requiring explicit escalation.)",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoFreeRouteChecked",
          "label": "Item C11 - vpo free route checked",
          "supply": "Would you like us to check first whether your record is one that Oklahoma now seals without a petition, before you pay anything? (Asked first and deliberately, because SB 2030 provides for sealing of certain records without petition and the review's central warning is that a paid petition must not be generated for someone entitled to a free route.)",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoArrestRecordToo",
          "label": "Item C12 - vpo arrest record too",
          "supply": "Do you want the arrest record cleared as well as the court record? (Asked because the Oklahoma State Bureau of Investigation states that expunging a court record is free while expunging an arrest record requires a $150 processing fee, plus possible local law enforcement fees.)",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_vpoOutcome",
          "label": "Item C13 - vpo outcome",
          "supply": "What happened with the protective order — was it dismissed, denied, or did it expire?",
          "why": "the committed track registry records this as a required generation input for ok_vpo_60_18, and the platform holds no value for it"
        },
        {
          "kind": "court",
          "id": "case_number",
          "label": "Case number of this filing, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "ok_vpo_60_18-proposed-order-3",
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief",
      "routeKeys": ["obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"],
      "title": "Proposed Order - Clear an Oklahoma protective order record",
      "role": "proposed_order",
      "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Clear an Oklahoma protective order record)",
      "condition": null,
      "body": [
        "IN THE {{DOTS:60}} COURT",
        "(Oklahoma district court for the county where the arrest information is located)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "This matter came before the Court on the petition of the petitioner under 22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026). The Court, having considered the petition and anything filed with it,",
        "",
        "ORDERS that {{DOTS:56}}",
        "",
        "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
        "",
        "DATED {{DOTS:30}}",
        "",
        "{{DOTS:50}}",
        "(The court signs here if, and only if, it grants the petition.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "order_court_identity",
          "label": "The court named in the caption of the proposed order - the printed line IN THE ............ COURT",
          "supply": "the same Oklahoma district court you name on the petition, written into the proposed order so the two captions match",
          "why": "the committed track registry records the venue as the district court in the county where the arrest information is located, and the platform holds no county or court for this participant; the committed generation requirements ask for it directly"
        },
        {
          "kind": "court",
          "id": "order_case_number",
          "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
          "why": "the proposed order is filed with the petition, before any number exists"
        },
        {
          "kind": "court",
          "id": "order_decision",
          "label": "The decision line of the proposed order, decided by the court",
          "why": "every decision on the proposed order is the court's"
        },
        {
          "kind": "court",
          "id": "order_signing_line",
          "label": "Signing line of the proposed order, for the court",
          "why": "the court signs the order if, and only if, it grants the petition"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date line of the proposed order, for the court",
          "why": "the court dates the order when it decides"
        }
      ]
    },
    {
      "id": "ok_vpo_60_18-record-gathering-instructions-4",
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief",
      "routeKeys": ["obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"],
      "role": "record_gathering_instructions",
      "title": "Records Checklist - Clear an Oklahoma protective order record",
      "description": "the records the committed registry requires the participant to obtain, who holds each and how (Clear an Oklahoma protective order record)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE RECORDS YOU MUST HAVE IN FRONT OF YOU",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "[ ] Certified court record and disposition",
        "    Who holds it: The district court clerk in the county where the case was filed.",
        "    How to obtain it: Ask the district court clerk for the certified docket and the order or judgment showing how the case ended. The category screen runs on the offence description and the disposition, both of which come from this record.",
        "    Requirement: required; required BEFORE filing.",
        "",
        "[ ] OSBI criminal history record",
        "    Who holds it: Oklahoma State Bureau of Investigation.",
        "    How to obtain it: Request a criminal history record from OSBI. It establishes what the state holds, which arrests exist in the county and whether anything has already been sealed under Clean Slate.",
        "    Requirement: required; not required before filing, but the registry records it as required.",
        "",
        "WHAT THESE RECORDS DECIDE",
        "",
        "The registry records that the category screen for this route runs on the offence DESCRIPTION and the disposition, not on a category paragraph number: three consecutive years of amendments have made the numbering unstable. Both the description and the disposition come from the certified court record. Copy them as that record words them.",
        "",
        "This page is a checklist. It is not filed with the court and it asserts nothing about your case."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_vpo_60_18-fee-disclosure-5",
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief",
      "routeKeys": ["obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"],
      "role": "fee_disclosure",
      "title": "What this costs - Clear an Oklahoma protective order record",
      "description": "the fee and waiver position the committed registry records for this route, and the question it leaves open (Clear an Oklahoma protective order record)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "THE FEE, AS RECORDED",
        "",
        "The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question.",
        "",
        "THE WAIVER, AS RECORDED",
        "",
        "Not established. The district court filing fee position is an open question.",
        "",
        "WHAT YOU DO ABOUT IT, AS RECORDED",
        "",
        "Payment of the $150 OSBI processing fee for an arrest-record expungement, by cashier's check or money order - Sent to OSBI, not to the court. OSBI does not accept personal checks, and the court-record expungement is free while the arrest-record one is not. LegalEase does not handle payment.",
        "",
        "WHAT THIS PACKET DOES NOT TELL YOU",
        "",
        "It does not tell you the district court filing fee. The registry records that fee as not established and as an open question, and it records no waiver position for it. Ask the district court clerk in the county where you file, before you go, and ask in the same call whether that court has any fee-waiver route. A filing you cannot pay for is a filing you cannot make.",
        "",
        "LegalEase does not handle any payment on this route."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_vpo_60_18-hearing-instructions-6",
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief",
      "routeKeys": ["obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"],
      "role": "hearing_instructions",
      "title": "The hearing and the notice - Clear an Oklahoma protective order record",
      "description": "where this is filed, who the court notifies, and where self-help ends at the hearing (Clear an Oklahoma protective order record)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE HEARING, THE NOTICE AND WHO IS TOLD",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "WHERE THIS GOES",
        "",
        "Oklahoma district court for the county where the arrest information is located.",
        "",
        "The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements.",
        "",
        "Venue: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions.",
        "",
        "THE NOTICE, AS RECORDED",
        "",
        "The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records.",
        "",
        "SERVICE, AS RECORDED",
        "",
        "By the court's notice. The proposed order must identify every agency to which it applies.",
        "",
        "WHAT YOU DO",
        "",
        "- File the petition and the proposed order with the district court clerk. You file; the court sets the hearing and gives the notice.",
        "- Make sure the proposed order names every agency it applies to. The registry records that as a packet instruction for this route in those words: The proposed order must name every agency.",
        "- Go to the hearing. Take the certified court record with you.",
        "",
        "WHERE SELF-HELP ENDS AT THE HEARING",
        "",
        "The registry records prosecutor objection, and any contested hearing, as a point where self-help ends. If the prosecuting agency objects, or the court sets a contested hearing, stop and get a lawyer. The papers in this packet still stand; what ends is doing it alone."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "ok_vpo_60_18-effect-disclosure-7",
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief",
      "routeKeys": ["obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief"],
      "role": "effect_disclosure",
      "title": "What an order does, and what it does not - Clear an Oklahoma protective order record",
      "description": "the effect the committed registry records for an order on this route, including the sealing-versus-destruction point (Clear an Oklahoma protective order record)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT AN ORDER ON THIS ROUTE ACTUALLY DOES - AND WHAT IT DOES NOT",
        "",
        "Everything below is quoted from the committed legal-design track registry's own record for this route. Nothing on this page is composed by this build and nothing is filed with it.",
        "",
        "Oklahoma says expungement but in most adult contexts means sealing: expungement is statutorily defined as the sealing of criminal records and of any public civil record involving actions brought by and against the State arising from the same arrest, transaction or occurrence. Fully sealed records are unavailable to the public and to law enforcement, with the Oklahoma State Bureau of Investigation retaining them for research and statistical purposes; partially sealed records are hidden from the public but remain available to law enforcement, and which category a participant lands in is a material outcome difference that must be disclosed. On an order the official actions are deemed never to have occurred, the person and criminal justice agencies may reply that no such action occurred and no such record exists, and employers, schools and state and local agencies may not require disclosure of sealed information. Title 22 section 19 does not authorise physical destruction; a sealed record may be unsealed later on a finding of changed conditions or compelling reason, and under section 19(N) a record ordered sealed that is not unsealed within ten years may be obliterated or destroyed at the end of that period.",
        "",
        "SAID PLAINLY",
        "",
        "Oklahoma calls this expungement and in most adult contexts it means SEALING, not destruction. A fully sealed record is unavailable to the public and to law enforcement; a partially sealed record is hidden from the public but still available to law enforcement, and which one you get is a real difference in outcome. A sealed record can be unsealed later on a finding of changed conditions or compelling reason.",
        "",
        "WHAT THIS PACKET CANNOT PROMISE",
        "",
        "It cannot promise the court will grant the order, and it cannot promise which category of sealing you will land in. Both are the court's decisions. This page tells you what the committed record says the order does, so that nobody tells you it does more."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
  ],
  "fixtures": {
    "canonical": {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Magnolia Street, Springfield 62704",
      "participant.phone": "555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    "boundary": {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Tallahatchie Crossing Road, Apartment 14B, Fort Saint Clairsville 39501-2214",
      "participant.phone": "(228) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },
  "composedFromNote": "the committed legal-design track registry (data/record-clearing/legal-design-track-registry.json), the committed custom-pleading specifications (data/record-clearing/legal-design-specifications.json) and the committed route-obligation census (data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json), each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official statewide participant form for this route; the committed specifications record its component set as composed pleadings. Every page in this packet is therefore composed by this build from the committed records, and no official form was substituted or invented.",
  "routeSelectionNote": "This family carries more than one statutory route. Every composed page states its own route in its footer and its own statutory ground in its body, and the participant instructions carry a table saying which set of pages belongs to which situation. No election control is printed on any page, because the route is determined by the participant's own record and not by a box on a form.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:track-only:OK:ok_identity_theft",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "free_route_screen: ok_identity_theft-free-route-screen-1; primary_filing: ok_identity_theft-primary-filing-2; proposed_order: ok_identity_theft-proposed-order-3; record_gathering_instructions: ok_identity_theft-record-gathering-instructions-4; fee_disclosure: ok_identity_theft-fee-disclosure-5; hearing_instructions: ok_identity_theft-hearing-instructions-6; effect_disclosure: ok_identity_theft-effect-disclosure-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:misdemeanor-deferred-dismissal-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "free_route_screen: ok_18_19_deferred_dismissal-free-route-screen-1; primary_filing: ok_18_19_deferred_dismissal-primary-filing-2; proposed_order: ok_18_19_deferred_dismissal-proposed-order-3; record_gathering_instructions: ok_18_19_deferred_dismissal-record-gathering-instructions-4; fee_disclosure: ok_18_19_deferred_dismissal-fee-disclosure-5; hearing_instructions: ok_18_19_deferred_dismissal-hearing-instructions-6; effect_disclosure: ok_18_19_deferred_dismissal-effect-disclosure-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:nonviolent-felony-deferred-dismissal-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "free_route_screen: ok_18_19_deferred_dismissal-free-route-screen-1; primary_filing: ok_18_19_deferred_dismissal-primary-filing-2; proposed_order: ok_18_19_deferred_dismissal-proposed-order-3; record_gathering_instructions: ok_18_19_deferred_dismissal-record-gathering-instructions-4; fee_disclosure: ok_18_19_deferred_dismissal-fee-disclosure-5; hearing_instructions: ok_18_19_deferred_dismissal-hearing-instructions-6; effect_disclosure: ok_18_19_deferred_dismissal-effect-disclosure-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_deferred_dismissal:up-to-two-felony-deferred-dismissal-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "free_route_screen: ok_18_19_deferred_dismissal-free-route-screen-1; primary_filing: ok_18_19_deferred_dismissal-primary-filing-2; proposed_order: ok_18_19_deferred_dismissal-proposed-order-3; record_gathering_instructions: ok_18_19_deferred_dismissal-record-gathering-instructions-4; fee_disclosure: ok_18_19_deferred_dismissal-fee-disclosure-5; hearing_instructions: ok_18_19_deferred_dismissal-hearing-instructions-6; effect_disclosure: ok_18_19_deferred_dismissal-effect-disclosure-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:felony-reclassified-as-a-misdemeanor",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "Oklahoma § 18 Expungement Petition — reclassified felony",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:not-more-than-two-eligible-felony-convictions-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "free_route_screen: ok_18_19_felony_conviction-free-route-screen-1; primary_filing: ok_18_19_felony_conviction-primary-filing-2; proposed_order: ok_18_19_felony_conviction-proposed-order-3; record_gathering_instructions: ok_18_19_felony_conviction-record-gathering-instructions-4; fee_disclosure: ok_18_19_felony_conviction-fee-disclosure-5; hearing_instructions: ok_18_19_felony_conviction-hearing-instructions-6; effect_disclosure: ok_18_19_felony_conviction-effect-disclosure-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_felony_conviction:one-eligible-nonviolent-felony-conviction-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "free_route_screen: ok_18_19_felony_conviction-free-route-screen-1; primary_filing: ok_18_19_felony_conviction-primary-filing-2; proposed_order: ok_18_19_felony_conviction-proposed-order-3; record_gathering_instructions: ok_18_19_felony_conviction-record-gathering-instructions-4; fee_disclosure: ok_18_19_felony_conviction-fee-disclosure-5; hearing_instructions: ok_18_19_felony_conviction-hearing-instructions-6; effect_disclosure: ok_18_19_felony_conviction-effect-disclosure-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:fine-only-misdemeanor-conviction-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "Oklahoma § 18 Expungement Petition — fine-only misdemeanor",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_misdemeanor_conviction:other-eligible-misdemeanor-conviction-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "free_route_screen: ok_18_19_misdemeanor_conviction-free-route-screen-1; primary_filing: ok_18_19_misdemeanor_conviction-primary-filing-2; proposed_order: ok_18_19_misdemeanor_conviction-proposed-order-3; record_gathering_instructions: ok_18_19_misdemeanor_conviction-record-gathering-instructions-4; fee_disclosure: ok_18_19_misdemeanor_conviction-fee-disclosure-5; hearing_instructions: ok_18_19_misdemeanor_conviction-hearing-instructions-6; effect_disclosure: ok_18_19_misdemeanor_conviction-effect-disclosure-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:acquittal-dismissal-or-other-no-conviction-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "free_route_screen: ok_18_19_nonconviction-free-route-screen-1; primary_filing: ok_18_19_nonconviction-primary-filing-2; proposed_order: ok_18_19_nonconviction-proposed-order-3; record_gathering_instructions: ok_18_19_nonconviction-record-gathering-instructions-4; fee_disclosure: ok_18_19_nonconviction-fee-disclosure-5; hearing_instructions: ok_18_19_nonconviction-hearing-instructions-6; effect_disclosure: ok_18_19_nonconviction-effect-disclosure-7",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:arrest-with-no-charges-filed",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "Oklahoma § 18 Expungement Petition — arrest with no charges",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:conviction-reversed-and-case-dismissed",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "Oklahoma § 18 Expungement Petition — reversal and dismissal",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_nonconviction:dna-factual-innocence-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "Oklahoma § 18 Expungement Petition — DNA factual innocence",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_18_19_pardon:pardon-based-expungement",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "Oklahoma § 18 Expungement Petition — full pardon",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_991c_deferred:deferred-sentence-court-record-expungement-under-991-c",
      "statute": "22 O.S. § 991c; 22 O.S. § 18; 22 O.S. § 19",
      "instrument": "Oklahoma § 991c Court-Record Expungement Packet",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:OK:ok_vpo_60_18:victim-protective-order-record-relief",
      "statute": "22 O.S. § 18; 22 O.S. § 19; 22 O.S. § 19a; 22 O.S. § 60.18; 22 O.S. § 991c; Senate Bill 2030 (2026)",
      "instrument": "Oklahoma VPO Sealing Motion under § 60.18",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION — Clear an Oklahoma record that is not yours",
      "The committed track registry records the destination as **Oklahoma district court for the county where the arrest information is located**. The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements. Venue as recorded: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions. Filing as recorded: File the petition and proposed order in the district court of the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties need separate petitions."
    ],
    [
      "FEE_AND_WAIVER — Clear an Oklahoma record that is not yours",
      "Fee as recorded: The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question. Fee waiver as recorded: Not established. The district court filing fee position is an open question."
    ],
    [
      "SERVICE — Clear an Oklahoma record that is not yours",
      "Service as recorded: By the court's notice. The proposed order must identify every agency to which it applies. Notice as recorded: The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records."
    ],
    [
      "SELF_HELP_STOP — Clear an Oklahoma record that is not yours",
      "**Stop and get help if:** Any dispute about whether the participant is the subject of the record. **Stop and get help if:** Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against. **Stop and get help if:** Any category question, which is screened by description rather than by paragraph number because three consecutive years of amendments have made the numbering unstable. **Stop and get help if:** Prosecutor objection, and any contested hearing. **Stop and get help if:** Records in more than one county, which need separate petitions. **Stop and get help if:** Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation. **Stop and get help if:** Immigration exposure. **Stop and get help if:** Tribal records are not reachable and are a live Oklahoma issue"
    ],
    [
      "FILING_DESTINATION — Clear an Oklahoma case after a deferred sentence was dismissed",
      "The committed track registry records the destination as **Oklahoma district court for the county where the arrest information is located**. The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements. Venue as recorded: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions. Filing as recorded: File the petition and proposed order in the district court of the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties need separate petitions."
    ],
    [
      "FEE_AND_WAIVER — Clear an Oklahoma case after a deferred sentence was dismissed",
      "Fee as recorded: The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question. Fee waiver as recorded: Not established. The district court filing fee position is an open question."
    ],
    [
      "SERVICE — Clear an Oklahoma case after a deferred sentence was dismissed",
      "Service as recorded: By the court's notice. The proposed order must identify every agency to which it applies. Notice as recorded: The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records."
    ],
    [
      "SELF_HELP_STOP — Clear an Oklahoma case after a deferred sentence was dismissed",
      "**Stop and get help if:** Any case where only a section 991c order has been obtained, which leaves the arrest record in place. **Stop and get help if:** Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against. **Stop and get help if:** Any category question, which is screened by description rather than by paragraph number because three consecutive years of amendments have made the numbering unstable. **Stop and get help if:** Prosecutor objection, and any contested hearing. **Stop and get help if:** Records in more than one county, which need separate petitions. **Stop and get help if:** Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation. **Stop and get help if:** Immigration exposure. **Stop and get help if:** Tribal records are not reachable and are a live Oklahoma issue"
    ],
    [
      "FILING_DESTINATION — Clear an Oklahoma felony conviction",
      "The committed track registry records the destination as **Oklahoma district court for the county where the arrest information is located**. The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements. Venue as recorded: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions. Filing as recorded: File the petition and proposed order in the district court of the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties need separate petitions."
    ],
    [
      "FEE_AND_WAIVER — Clear an Oklahoma felony conviction",
      "Fee as recorded: The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question. Fee waiver as recorded: Not established. The district court filing fee position is an open question."
    ],
    [
      "SERVICE — Clear an Oklahoma felony conviction",
      "Service as recorded: By the court's notice. The proposed order must identify every agency to which it applies. Notice as recorded: The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records."
    ],
    [
      "SELF_HELP_STOP — Clear an Oklahoma felony conviction",
      "**Stop and get help if:** Any felony category or waiting-period question, until the categories as amended by SB 2030 are read. **Stop and get help if:** Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against. **Stop and get help if:** Any category question, which is screened by description rather than by paragraph number because three consecutive years of amendments have made the numbering unstable. **Stop and get help if:** Prosecutor objection, and any contested hearing. **Stop and get help if:** Records in more than one county, which need separate petitions. **Stop and get help if:** Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation. **Stop and get help if:** Immigration exposure. **Stop and get help if:** Tribal records are not reachable and are a live Oklahoma issue"
    ],
    [
      "FILING_DESTINATION — Clear an Oklahoma misdemeanor conviction",
      "The committed track registry records the destination as **Oklahoma district court for the county where the arrest information is located**. The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements. Venue as recorded: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions. Filing as recorded: File the petition and proposed order in the district court of the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties need separate petitions."
    ],
    [
      "FEE_AND_WAIVER — Clear an Oklahoma misdemeanor conviction",
      "Fee as recorded: The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question. Fee waiver as recorded: Not established. The district court filing fee position is an open question."
    ],
    [
      "SERVICE — Clear an Oklahoma misdemeanor conviction",
      "Service as recorded: By the court's notice. The proposed order must identify every agency to which it applies. Notice as recorded: The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records."
    ],
    [
      "SELF_HELP_STOP — Clear an Oklahoma misdemeanor conviction",
      "**Stop and get help if:** Any waiting-period calculation, until the categories as amended by SB 2030 are read. **Stop and get help if:** Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against. **Stop and get help if:** Any category question, which is screened by description rather than by paragraph number because three consecutive years of amendments have made the numbering unstable. **Stop and get help if:** Prosecutor objection, and any contested hearing. **Stop and get help if:** Records in more than one county, which need separate petitions. **Stop and get help if:** Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation. **Stop and get help if:** Immigration exposure. **Stop and get help if:** Tribal records are not reachable and are a live Oklahoma issue"
    ],
    [
      "FILING_DESTINATION — Clear an Oklahoma arrest that did not end in a conviction",
      "The committed track registry records the destination as **Oklahoma district court for the county where the arrest information is located**. The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements. Venue as recorded: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions. Filing as recorded: File the petition and proposed order in the district court of the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties need separate petitions."
    ],
    [
      "FEE_AND_WAIVER — Clear an Oklahoma arrest that did not end in a conviction",
      "Fee as recorded: The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question. Fee waiver as recorded: Not established. The district court filing fee position is an open question."
    ],
    [
      "SERVICE — Clear an Oklahoma arrest that did not end in a conviction",
      "Service as recorded: By the court's notice. The proposed order must identify every agency to which it applies. Notice as recorded: The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records."
    ],
    [
      "SELF_HELP_STOP — Clear an Oklahoma arrest that did not end in a conviction",
      "**Stop and get help if:** Prosecutor no-refile confirmation, which the review records as a self-help boundary. **Stop and get help if:** Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against. **Stop and get help if:** Any category question, which is screened by description rather than by paragraph number because three consecutive years of amendments have made the numbering unstable. **Stop and get help if:** Prosecutor objection, and any contested hearing. **Stop and get help if:** Records in more than one county, which need separate petitions. **Stop and get help if:** Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation. **Stop and get help if:** Immigration exposure. **Stop and get help if:** Tribal records are not reachable and are a live Oklahoma issue"
    ],
    [
      "FILING_DESTINATION — Clear an Oklahoma record after a pardon",
      "The committed track registry records the destination as **Oklahoma district court for the county where the arrest information is located**. The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements. Venue as recorded: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions. Filing as recorded: File the petition and proposed order in the district court of the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties need separate petitions."
    ],
    [
      "FEE_AND_WAIVER — Clear an Oklahoma record after a pardon",
      "Fee as recorded: The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question. Fee waiver as recorded: Not established. The district court filing fee position is an open question."
    ],
    [
      "SERVICE — Clear an Oklahoma record after a pardon",
      "Service as recorded: By the court's notice. The proposed order must identify every agency to which it applies. Notice as recorded: The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records."
    ],
    [
      "SELF_HELP_STOP — Clear an Oklahoma record after a pardon",
      "**Stop and get help if:** Applying for the pardon itself, which is a Pardon and Parole Board matter and out of scope. **Stop and get help if:** Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against. **Stop and get help if:** Any category question, which is screened by description rather than by paragraph number because three consecutive years of amendments have made the numbering unstable. **Stop and get help if:** Prosecutor objection, and any contested hearing. **Stop and get help if:** Records in more than one county, which need separate petitions. **Stop and get help if:** Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation. **Stop and get help if:** Immigration exposure. **Stop and get help if:** Tribal records are not reachable and are a live Oklahoma issue"
    ],
    [
      "FILING_DESTINATION — Update an Oklahoma deferred sentence so the case shows as dismissed",
      "The committed track registry records the destination as **The Oklahoma district court that entered the deferred sentence**. A motion in the sentencing court. No standard statewide form was identified. The order updates the court record; it does not reach the arrest record held by OSBI or by the arresting agency. Venue as recorded: The district court that entered the deferred sentence. Filing as recorded: File the motion in the district court that entered the deferred sentence."
    ],
    [
      "FEE_AND_WAIVER — Update an Oklahoma deferred sentence so the case shows as dismissed",
      "Fee as recorded: Not established for the section 991c motion. The Oklahoma State Bureau of Investigation states that expunging a court record is free; a separate arrest-record expungement carries a $150 processing fee. Fee waiver as recorded: Not established."
    ],
    [
      "SERVICE — Update an Oklahoma deferred sentence so the case shows as dismissed",
      "Service as recorded: Not established. Notice as recorded: Not established for this motion."
    ],
    [
      "SELF_HELP_STOP — Update an Oklahoma deferred sentence so the case shows as dismissed",
      "**Stop and get help if:** Any participant whose goal is the arrest record rather than the court record, who needs the section 18 route and should not be sold this motion alone. **Stop and get help if:** Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation. **Stop and get help if:** Immigration exposure. **Stop and get help if:** Tribal records are not reachable and are a live Oklahoma issue"
    ],
    [
      "FILING_DESTINATION — Clear an Oklahoma protective order record",
      "The committed track registry records the destination as **Oklahoma district court for the county where the arrest information is located**. The court sets a hearing and gives thirty days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records. The proposed order must identify every agency to which it applies. No standard statewide petition form was identified, so the pleading is generated to the statutory content requirements. Venue as recorded: The district court in the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties require separate petitions. Filing as recorded: File the petition and proposed order in the district court of the county where the arrest information is located. Multiple arrests in the same county may be combined in one petition; separate counties need separate petitions."
    ],
    [
      "FEE_AND_WAIVER — Clear an Oklahoma protective order record",
      "Fee as recorded: The Oklahoma State Bureau of Investigation states that expunging a court record is free and that expunging an arrest record requires a $150 processing fee, which may be accompanied by fees to local law enforcement agencies. OSBI accepts cashier's checks or money orders and will not accept personal checks. The district court filing fee is not established and is recorded as an open question. Fee waiver as recorded: Not established. The district court filing fee position is an open question."
    ],
    [
      "SERVICE — Clear an Oklahoma protective order record",
      "Service as recorded: By the court's notice. The proposed order must identify every agency to which it applies. Notice as recorded: The court sets a hearing and gives 30 days' notice to the prosecuting agency, the arresting agency, the Oklahoma State Bureau of Investigation and any other agency holding relevant records."
    ],
    [
      "SELF_HELP_STOP — Clear an Oklahoma protective order record",
      "**Stop and get help if:** Every protective order matter, until section 60.18 is read and its conditions established. **Stop and get help if:** Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against. **Stop and get help if:** Any category question, which is screened by description rather than by paragraph number because three consecutive years of amendments have made the numbering unstable. **Stop and get help if:** Prosecutor objection, and any contested hearing. **Stop and get help if:** Records in more than one county, which need separate petitions. **Stop and get help if:** Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation. **Stop and get help if:** Immigration exposure. **Stop and get help if:** Tribal records are not reachable and are a live Oklahoma issue"
    ]
  ],
  "instructionsIntro": [
    "This packet is composed from committed repository records, not from an official form: no committed record names an official statewide participant form for these routes.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every fact about your own case belongs to the record itself, so each one is a labelled dotted blank listed below, and you fill it from the record, never from memory."
  ],
  "instrumentChoice": {
    "heading": "Which pages in this packet are yours",
    "intro": [
      "This packet carries more than one route. Use only the pages for the route that matches your own record, and leave the rest unused."
    ],
    "rows": [
      [
        "Clear an Oklahoma record that is not yours",
        "Where a record was created in the participant's name through identity theft, or otherwise identifies the wrong person, the section 18 identity-theft category with section 19a provides the route.",
        "one declared route: `obligation:track-only:OK:ok_identity_theft`"
      ],
      [
        "Clear an Oklahoma case after a deferred sentence was dismissed",
        "Where a deferred or delayed sentence has been completed and the case dismissed, the section 18 categories provide a petition route.",
        "**3 declared routes**, all served by this one set: `misdemeanor-deferred-dismissal-expungement`; `nonviolent-felony-deferred-dismissal-expungement`; `up-to-two-felony-deferred-dismissal-expungement`"
      ],
      [
        "Clear an Oklahoma felony conviction",
        "The section 18 categories provide petition routes for felony convictions, including a reclassified-felony route with a short window that the review directs be screened before the longer routes, and a one-felony route carrying a separate-misdemeanour look-back.",
        "**3 declared routes**, all served by this one set: `felony-reclassified-as-a-misdemeanor`; `not-more-than-two-eligible-felony-convictions-expungement`; `one-eligible-nonviolent-felony-conviction-expungement`"
      ],
      [
        "Clear an Oklahoma misdemeanor conviction",
        "The section 18 categories provide petition routes for misdemeanour convictions on stated waiting periods and prior-record conditions.",
        "**2 declared routes**, all served by this one set: `fine-only-misdemeanor-conviction-expungement`; `other-eligible-misdemeanor-conviction-expungement`"
      ],
      [
        "Clear an Oklahoma arrest that did not end in a conviction",
        "The section 18 categories include records where the person was not charged, was acquitted, was factually innocent, or where the charge was dismissed. All four are declared routes of one track and all four are served by this one set of pages, which is why the petition names all four in its footer rather than one of them. WHICH of the four you are on is a fact of your own record, and it changes the allegations you write on the petition - the committed generation requirements ask for the disposition and its date directly. If you cannot tell which, that is a question for a lawyer, not one to guess at.",
        "**4 declared routes**, all served by this one set: `acquittal-dismissal-or-other-no-conviction-expungement`; `arrest-with-no-charges-filed`; `conviction-reversed-and-case-dismissed`; `dna-factual-innocence-expungement`"
      ],
      [
        "Clear an Oklahoma record after a pardon",
        "A section 18 category provides a petition route following a pardon.",
        "one declared route: `pardon-based-expungement`"
      ],
      [
        "Update an Oklahoma deferred sentence so the case shows as dismissed",
        "A section 991c expungement updates the court record of a completed deferred sentence so the case shows as dismissed.",
        "one declared route: `deferred-sentence-court-record-expungement-under-991-c`"
      ],
      [
        "Clear an Oklahoma protective order record",
        "Title 22 section 60.18 provides for expungement of victim protective order records.",
        "one declared route: `victim-protective-order-record-relief`"
      ]
    ],
    "footnotes": [
      "Every page states in its footer every declared route the set it belongs to serves, so the sixteen routes this family declares are the sixteen the pages name. Where a set serves more than one route, the routes share one instrument and differ in the facts you allege, not in the paper. If two routes could fit your record, that is a question for a lawyer or a legal-aid office, not a choice to guess at."
    ]
  },
  "documentsToObtain": [
    [
      "Obtain Certified court record and disposition. Ask the district court clerk for the certified docket and the order or judgment showing how the case ended. The category screen runs on the offence description and the disposition, both of which come from this record.",
      "The district court clerk in the county where the case was filed"
    ],
    [
      "Obtain OSBI criminal history record. Request a criminal history record from OSBI. It establishes what the state holds, which arrests exist in the county and whether anything has already been sealed under Clean Slate.",
      "Oklahoma State Bureau of Investigation"
    ],
    [
      "Obtain Certified court record showing completion of the deferred sentence. Ask the district court clerk for the certified docket and the order showing the deferred sentence was completed.",
      "The district court clerk"
    ],
    [
      "Obtain OSBI criminal history record. Request a criminal history record from OSBI. It shows what the state holds on the arrest, which is precisely what the section 991c order will not change.",
      "Oklahoma State Bureau of Investigation"
    ]
  ],
  "steps": [
    "**Read the filing instructions page for your route.** It names the court or office this goes to, what the record says about cost and about service, and when to stop.",
    "**Fill every labelled dotted blank on the pages for your route**, from the record itself. Do not guess a date, an offence wording, a case number or an office name.",
    "**Sign and date each page that carries a signing line, personally.** The platform never signs for you and never dates a signing line.",
    "**Do not sign or date any certificate or proof of delivery until the papers have actually been delivered.**",
    "**File the pages for your route where the filing instructions page says they go**, and ask that office what it charges and how it accepts filings before you go.",
    "**Leave every page that belongs to the court or the prosecuting attorney blank.** Those decisions are not yours to make."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every line of a proposed order that decides anything**, including the court's own signing and date lines. The order is the court's to make.",
    "**Every case number in every caption.** If the court assigns one, it does so at filing, and the pages in this set are filed together before any number exists."
  ],
  "recordSays": [
    [
      "Clear an Oklahoma record that is not yours",
      "One petition per county; combine same-county arrests"
    ],
    [
      "Clear an Oklahoma record that is not yours",
      "The proposed order must name every agency"
    ],
    [
      "Clear an Oklahoma record that is not yours",
      "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them."
    ],
    [
      "Clear an Oklahoma case after a deferred sentence was dismissed",
      "One petition per county; combine same-county arrests"
    ],
    [
      "Clear an Oklahoma case after a deferred sentence was dismissed",
      "The proposed order must name every agency"
    ],
    [
      "Clear an Oklahoma case after a deferred sentence was dismissed",
      "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them."
    ],
    [
      "Clear an Oklahoma felony conviction",
      "One petition per county; combine same-county arrests"
    ],
    [
      "Clear an Oklahoma felony conviction",
      "The proposed order must name every agency"
    ],
    [
      "Clear an Oklahoma felony conviction",
      "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them."
    ],
    [
      "Clear an Oklahoma misdemeanor conviction",
      "One petition per county; combine same-county arrests"
    ],
    [
      "Clear an Oklahoma misdemeanor conviction",
      "The proposed order must name every agency"
    ],
    [
      "Clear an Oklahoma misdemeanor conviction",
      "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them."
    ],
    [
      "Clear an Oklahoma arrest that did not end in a conviction",
      "One petition per county; combine same-county arrests"
    ],
    [
      "Clear an Oklahoma arrest that did not end in a conviction",
      "The proposed order must name every agency"
    ],
    [
      "Clear an Oklahoma arrest that did not end in a conviction",
      "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them."
    ],
    [
      "Clear an Oklahoma record after a pardon",
      "One petition per county; combine same-county arrests"
    ],
    [
      "Clear an Oklahoma record after a pardon",
      "The proposed order must name every agency"
    ],
    [
      "Clear an Oklahoma record after a pardon",
      "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them."
    ],
    [
      "Update an Oklahoma deferred sentence so the case shows as dismissed",
      "Always pair a § 991c motion with a § 18 arrest-record screen"
    ],
    [
      "Clear an Oklahoma protective order record",
      "One petition per county; combine same-county arrests"
    ],
    [
      "Clear an Oklahoma protective order record",
      "The proposed order must name every agency"
    ],
    [
      "Clear an Oklahoma protective order record",
      "Building the packet product against the pre-SB 2030 text risks generating paid petitions for people who could have used a free portal, and risks telling people they are Clean Slate eligible when the amendment removed them."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "Any dispute about whether the participant is the subject of the record.",
    "Any participant who may be reached by the SB 2030 sealing-without-petition route, until the amended text is read. Recommending a paid petition to someone entitled to a free route is the specific harm the review warns against.",
    "Any category question, which is screened by description rather than by paragraph number because three consecutive years of amendments have made the numbering unstable.",
    "Prosecutor objection, and any contested hearing.",
    "Records in more than one county, which need separate petitions.",
    "Federal, tribal, military and out-of-state records. Tribal records are a live Oklahoma issue post-McGirt and are an explicit escalation.",
    "Immigration exposure.",
    "Tribal records are not reachable and are a live Oklahoma issue",
    "Any case where only a section 991c order has been obtained, which leaves the arrest record in place.",
    "Any felony category or waiting-period question, until the categories as amended by SB 2030 are read.",
    "Any waiting-period calculation, until the categories as amended by SB 2030 are read.",
    "Prosecutor no-refile confirmation, which the review records as a self-help boundary.",
    "Applying for the pardon itself, which is a Pardon and Parole Board matter and out of scope.",
    "Any participant whose goal is the arrest record rather than the court record, who needs the section 18 route and should not be sold this motion alone.",
    "Every protective order matter, until section 60.18 is read and its conditions established."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official OK form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that any record falls in one Title 22 category rather than another, which the committed generation requirements make a participant fact"
  ],
  "buildFindings": [
    {
      "finding": "The MASTER_QUEUE row for this family binds no document source, and that is the recorded design: its sourceStatus is CUSTOM_PLEADING_FROM_CODIFIED_TEXT and its implementationStrategy is custom_pleading.",
      "consequence": "Every page is composed from committed repository records, each bound by SHA-256 and anchor-verified before composing. No official form was substituted and none was invented."
    },
    {
      "finding": "The committed track registry records this route's destination and venue, and records its fee, fee-waiver, notice and service rules — in several places as an express non-statement.",
      "consequence": "The packet states the destination the registry holds, states each recorded rule in the registry's own words, and where the registry records a non-statement it names the specific office that answers the question rather than gesturing at the court."
    },
    {
      "finding": "The family's sixteen route keys resolve to eight committed tracks; the committed specifications record one component set per track and none per pathway.",
      "consequence": "One set of composed pages is built per track, each stating its own statutory ground, and the pathway distinctions inside a track are carried as the committed generation requirements that ask for them. No pathway is dropped and none is given an instrument the record does not describe."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for these routes.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content.",
    "Sixteen route keys resolve to eight committed component sets. Confirm that one set of pages per track, with the pathway carried as a recorded participant fact, is the right presentation for the pathway variants."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family carries 8 statutory routes in one packet; each page states its own route and the instructions carry a which-pages-are-yours table."
  ]
};

/* ============================================================================
 * SHARED COMPOSED-PLEADING BUILD CORE.
 *
 * Everything above this line is this family's own: its committed-record
 * bindings, its composed pages, its field maps, its instructions content.
 * Everything below is family-independent plumbing: deterministic rendering,
 * byte proof, the builder's own count of the nine completeness counters, and
 * the census-v1 output records. It is copied whole into each family's own
 * exclusive script rather than imported, because a build host shared across
 * families cannot be changed for one of them without moving the bytes of the
 * rest, and every family here owns only itself.
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

/* ---- committed-record binding ------------------------------------------------ *
 * This family binds no Master Library binary: its authority is a set of
 * COMMITTED repository records named in SPEC.records. Each is bound by exact
 * SHA-256 at build time, and each anchor string is a statement this build
 * RELIES ON, re-read from the committed bytes before anything is composed. The
 * build refuses if a record is missing or an anchor is no longer there.
 */
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
      failures.push({ recordId: rec.recordId, path: rec.path, why: `the committed record no longer contains ${missing.length} anchor statement(s) this build relies on`, missingAnchors: missing });
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

/* ---- deterministic composed-page rendering ---------------------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("′", "'");
}

/* ---- block-aware page breaking ---------------------------------------------- *
 * Page breaking here is block-aware, and that is the whole point of it.
 *
 * A block is one logical source line together with every row it wraps to. A
 * block is never divided by a page break it did not need, so a wrapped value can
 * no longer be widowed away from the label that explains it: the reader never
 * meets a bare postcode at the top of a page with its MAILING ADDRESS label on
 * the page before.
 *
 * Long tokens break at their own separators rather than at whichever character
 * happened to reach the margin. A route key is colon- and hyphen-delimited, so
 * every row ends on a real boundary instead of producing "...-expung" / "ement".
 *
 * The route trailer is internal machine metadata rather than pleading text, so
 * it is additionally never left as the sole occupant of a participant-facing
 * page; when the body ends flush with a page boundary the last content block is
 * pulled down to keep it company.
 *
 * Nothing is dropped to make any of this fit. Where a single block is genuinely
 * taller than a page it continues onto the next one, which is continuation
 * rather than truncation.
 */
const TRAILER_LINE = /^(Route: |Route:$|Routes this set serves \()/;
/* The petitioner's own contact details are one block to a reader, not four
 * independent lines: a telephone number under no name answers nothing. They are
 * kept on one page together. */
const CONTACT_LINE = /^(PRINTED NAME|MAILING ADDRESS|TELEPHONE|EMAIL):/;

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  const rowsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;
  const fits = (s) => font.widthOfTextAtSize(s, fontSize) <= maxWidth;

  /* A token with no spaces still has natural break points at its own
   * separators. Breaking there keeps every row ending on a boundary a reader
   * recognises. A run with no separator at all is hard-split only as a last
   * resort, because dropping it is not an option. */
  const splitToken = (token) => {
    const chunks = [];
    let current = "";
    const flushOversized = () => {
      while (!fits(current)) {
        let cut = current.length - 1;
        while (cut > 1 && !fits(current.slice(0, cut))) cut--;
        chunks.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    };
    for (const piece of token.split(/(?<=[:_/.-])/)) {
      if (current && !fits(`${current}${piece}`)) { chunks.push(current); current = piece; }
      else current += piece;
      flushOversized();
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => fits(w) ? [w] : splitToken(w));
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (fits(candidate)) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };

  /* Lay every block out into pages before drawing anything, so that the trailer
   * can be caught sitting alone while the layout is still only a plan. */
  const source = sanitizePdfText(fullText).split("\n");
  const blocks = [];
  for (let i = 0; i < source.length; i++) {
    const raw = source[i];
    /* A run of consecutive contact lines is gathered into a single block, so the
     * page break can only fall before the name or after the email. */
    if (CONTACT_LINE.test(raw)) {
      const run = [];
      while (i < source.length && CONTACT_LINE.test(source[i])) run.push(...wrap(source[i++]));
      i--;
      blocks.push({ index: blocks.length, rows: run, trailer: false });
      continue;
    }
    blocks.push({ index: blocks.length, rows: wrap(raw), trailer: TRAILER_LINE.test(raw) });
  }
  /*
   * Rule 1b: the closing execution unit is one block, blank separators and all.
   *
   * Rule 1 stopped the contact block being torn in half. It stopped it by
   * pushing the whole run of four contact lines onto the next page, and that
   * next page then held nothing to say what they belonged to. Oklahoma canonical
   * and boundary pages 15, 27, 39 and 51, and Washington canonical and boundary
   * page 12, each opened on "PRINTED NAME:" and carried a mailing address, a
   * telephone number, an email address and the route footer, while the
   * "DATE ... SIGNATURE OF PETITIONER" line those details execute -- and the
   * sentence saying the petitioner signs personally -- were both on the page
   * before.
   *
   * The signature line, the instruction that governs it, the petitioner's own
   * contact details and the route footer that closes the document are one thing
   * to a reader. They are now one unit: the page break falls before the
   * signature line or not at all, and the participant meets a signature page
   * that says on its own face what is being signed.
   *
   * Neither Rule 1 nor the trailer pull-down below could reach this. A block
   * here is a run of consecutive non-empty source lines, and the blank
   * separators divide this unit into four of them; and soleOccupant needs a page
   * whose every row is a trailer row, which these pages are not, because they
   * carry four participant-facing contact lines as well.
   *
   * Ported from the North Dakota composer, where the unit is the same and the
   * pagination underneath it is not.
   */
  const EXECUTION_LINE = /\bSIGNATURE OF\b/;
  const executionStart = blocks.findIndex((block) => block.rows.some((row) => EXECUTION_LINE.test(row)));
  let executionEnd = blocks.length;
  while (executionEnd > executionStart + 1 && blocks[executionEnd - 1].rows.every((row) => row === "")) executionEnd -= 1;
  const executionRows = executionStart < 0
    ? 0
    : blocks.slice(executionStart, executionEnd).reduce((total, block) => total + block.rows.length, 0);

  const paginate = (keepExecutionWhole) => {
    const pages = [[]];
    for (const block of blocks) {
      let page = pages[pages.length - 1];
      /* Rule 1b: the closing execution unit is measured whole, blanks included,
       * before its first row is placed. */
      if (keepExecutionWhole && block.index === executionStart
          && executionRows <= rowsPerPage && page.length + executionRows > rowsPerPage) {
        pages.push([]);
        page = pages[pages.length - 1];
      }
      if (block.rows.length <= rowsPerPage && page.length + block.rows.length > rowsPerPage) {
        pages.push([]);
        page = pages[pages.length - 1];
      }
      for (const text of block.rows) {
        if (page.length === rowsPerPage) { pages.push([]); page = pages[pages.length - 1]; }
        page.push({ text, block: block.index, trailer: block.trailer });
      }
    }

    const soleOccupant = (page) => page.length > 0 && page.every((r) => r.trailer || r.text === "");
    for (let guard = 0; guard < blocks.length && pages.length > 1 && soleOccupant(pages[pages.length - 1]); guard++) {
      const last = pages[pages.length - 1];
      const previous = pages[pages.length - 2];
      const moving = previous[previous.length - 1].block;
      const moved = [];
      while (previous.length > 0 && previous[previous.length - 1].block === moving) moved.unshift(previous.pop());
      if (moved.length === 0 || moved.length + last.length > rowsPerPage) { previous.push(...moved); break; }
      last.unshift(...moved);
      if (previous.length === 0) pages.splice(pages.length - 2, 1);
    }
    return pages;
  };

  /*
   * Rule 1b costs a page whenever it fires, so it fires only where the defect is.
   *
   * Most components close on the page they were already closing on: the
   * signature line, the contact details and the footer sit together with room to
   * spare, and forcing the unit onto a fresh page there would add a page to a
   * component that never had the defect. FIX17 measured exactly that on North
   * Dakota -- an unconditional first version added an eighth page to the pardoned
   * boundary packet for nothing -- and made the rule conditional. That property is
   * carried here rather than re-argued: the layout is settled once, exactly as
   * before, and Rule 1b is applied only if that settled layout actually divides
   * the unit across a page break. Where it does not, paginate(false) is the
   * pagination this family already shipped, row for row.
   */
  const unitPageCount = (laid) => new Set(
    laid.flatMap((rows, index) => rows
      .filter((r) => r.text !== "" && r.block >= executionStart && r.block < executionEnd)
      .map(() => index)),
  ).size;
  let pages = paginate(false);
  if (executionStart >= 0 && unitPageCount(pages) > 1) pages = paginate(true);

  /*
   * Proof, not intention: every drawn row of the closing execution unit landed
   * on one page. This is the assertion that no packet can ship a page of contact
   * details severed from the signature line they execute. A unit taller than a
   * whole page is exempt and still flows, because there is no page it could fit
   * on.
   */
  if (executionStart >= 0 && executionRows <= rowsPerPage) {
    const drawn = pages.flatMap((rows, index) => rows
      .filter((r) => r.text !== "" && r.block >= executionStart && r.block < executionEnd)
      .map((r) => ({ page: index, text: r.text })));
    const first = drawn.length ? drawn[0].page : null;
    for (const row of drawn) {
      assert.equal(row.page, first,
        `${title}: the closing execution unit was split across a page break at ${JSON.stringify(row.text.slice(0, 60))}`);
    }
  }

  for (const rows of pages) {
    const page = pdf.addPage([width, height]);
    for (const [index, row] of rows.entries()) {
      if (row.text) {
        page.drawText(row.text, { x: margin, y: height - margin - index * lineHeight, size: fontSize, font, color: rgb(0, 0, 0) });
      }
    }
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- the composed page, rendered from this family's declared lines ----------- *
 * A body line is plain text with three substitutions: {{factId}} writes a fact
 * the platform holds, {{DOTS}} prints a full-width dotted blank, and
 * {{DOTS:n}} prints one n characters wide. Nothing else is interpolated, so a
 * page can never carry a value the fact table does not hold.
 */
function composedBody(componentId, facts) {
  const c = COMPONENT[componentId];
  const lines = [c.title.toUpperCase(), ""];
  for (const raw of c.body) {
    lines.push(String(raw).replace(/\{\{([A-Za-z0-9_.:]+)\}\}/g, (_m, token) => {
      if (token === "DOTS") return DOTS();
      if (token.startsWith("DOTS:")) return DOTS(Number(token.slice(5)));
      const value = facts[token];
      assert.ok(value !== undefined, `${componentId}: the page interpolates ${token}, which the fixture does not hold`);
      return String(value);
    }));
  }
  const served = c.routeKeys ?? [c.routeKey];
  lines.push("", served.length === 1
    ? `Route: ${served[0]}`
    : `Routes this set serves (${served.length}): ${served.join(" ; ")}`);
  return lines.join("\n");
}

/* ---- field-map helpers, in the maps-with-canonical-and-boundary shape -------- */
function mapHelpers(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    clerkBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
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

function composedMap(componentId) {
  const c = COMPONENT[componentId];
  const h = mapHelpers(componentId);
  const writes = (c.writes ?? []).map((w) => h.write(w.id, w.label, w.factId));
  const refusals = (c.blanks ?? []).map((b) => {
    if (b.kind === "rbf") return h.rbf(b.id, b.label, b.supply, b.why);
    if (b.kind === "protected") return h.protectedBlank(b.id, b.label, b.why);
    if (b.kind === "court") return h.clerkBlank(b.id, b.label, b.why);
    throw new Error(`${componentId}.${b.id}: unknown blank kind ${b.kind}`);
  });
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: c.routeKey,
      ...(c.condition ? { conditional: true, conditionDescription: c.condition } : {})
    },
    structuralClass: "composed_document",
    composedFrom: SPEC.composedFromNote,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes --------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. Wrapped lines are joined on spaces
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

/* ---- outputs ------------------------------------------------------------------- */
function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
}

/*
 * The required-before-filing list, in the order the participant meets the
 * blanks: component by component, and within a component in the order the
 * committed record declares the facts. Sorting these alphabetically would print
 * item C10 above item C2 on a page where they are numbered in sequence.
 */
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

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${SPEC.routeName}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  if (SPEC.instrumentChoice) {
    out.push(`## ${SPEC.instrumentChoice.heading}`, "");
    for (const p of SPEC.instrumentChoice.intro) out.push(p, "");
    out.push("| Instrument | When it is yours | The declared routes this set serves |", "| --- | --- | --- |");
    for (const [instr, when, routes] of SPEC.instrumentChoice.rows) out.push(`| ${instr} | ${when} | ${routes} |`);
    out.push("");
    for (const p of SPEC.instrumentChoice.footnotes ?? []) out.push(p, "");
  }

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c.id}\` | ${c.description} |`);
  out.push("");

  out.push("## Where this is filed, what it costs, and who must be served", "");
  out.push("| Question | What the repository establishes, or the authority that answers it |", "| --- | --- |");
  for (const [q, answer] of SPEC.obligationTable) out.push(`| ${q} | ${answer} |`);
  out.push("");

  if ((SPEC.recordSays ?? []).length > 0) {
    out.push("## What the committed record says you must know", "");
    out.push("Each of these is carried here in the words of the committed record it comes from, because a participant who does not know it may file the wrong thing, or file something they did not need to file at all.", "");
    for (const [where, what] of SPEC.recordSays) out.push(`- **${where}** — ${what}`);
    out.push("");
  }

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    /*
     * On three families in this lane the committed records say the participant
     * files nothing at all, and a heading reading "before filing" would tell
     * them the opposite of what the rest of the packet says. The heading is
     * therefore the family's to state; every other family keeps the default.
     */
    out.push(`## ${SPEC.documentsHeading ?? "Documents you must obtain before filing"}`, "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPONENT[doc]?.title ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  if ((SPEC.notTold ?? []).length > 0) {
    out.push("## What this packet does not tell you", "");
    for (const n of SPEC.notTold) out.push(`- ${n}`);
    out.push("");
  }

  out.push("## When to stop and get help instead of filing", "");
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
  if (failures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed record this family composes from is missing or no longer carries an anchor statement, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = COMPONENT_IDS.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      components: COMPONENT_IDS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENT_IDS.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${SPEC.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of COMPONENT_IDS) {
      const body = composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, COMPONENT[componentId].title);
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
      documents, components: COMPONENT_IDS
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
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.worklistGroupId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod: "committed repository records bound by exact SHA-256 at build time, with every relied-on statement re-read from the committed bytes as an anchor before composing",
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: true,
    formIdentityNote: SPEC.formIdentityNote,
    /* Bound as committedRecords, not documents: these are the AUTHORITY this
     * family composes from, not documents of the packet, and no rendered
     * artifact should be expected to carry them. */
    committedRecords: resolved.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId,
      pathInRepository: r.path, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority",
      role: r.role,
      anchorStatementsVerified: r.anchorsVerified
    })),
    composedComponentsAuthoredByThisBuild: COMPONENT_IDS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family composes for",
      ...(SPEC.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey), renderStrategy: "composed_pleading",
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: null,
    boundReferenceRole: "none — this family composes from committed records; no official binary is bound and none is included",
    componentSet: COMPONENT_IDS,
    componentConditions: Object.fromEntries(SPEC.components.filter((c) => c.condition).map((c) => [c.id, c.condition])),
    componentRoutes: Object.fromEntries(SPEC.components.map((c) => [c.id, c.routeKey])),
    // Every declared route each component serves, not just the first. A track
    // whose pathways share one instrument serves all of them from one set, and a
    // record that named one of them read as a route this family declared and did
    // not serve.
    componentRoutesServed: Object.fromEntries(SPEC.components.map((c) => [c.id, c.routeKeys ?? [c.routeKey]])),
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: SPEC.routeSelectionsMade ?? [],
    routeSelectionNote: SPEC.routeSelectionNote,
    participantFacingObligations: SPEC.obligationTable.map(([question, answer]) => ({ question, answer })),
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENT_IDS,
    componentConditions: Object.fromEntries(SPEC.components.filter((c) => c.condition).map((c) => [c.id, c.condition])),
    boundReferenceSource: null,
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
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
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
    implementationStrategy: "custom_pleading",
    recordsBound: resolved.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    components: COMPONENT_IDS,
    documents: COMPONENT_IDS,
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
