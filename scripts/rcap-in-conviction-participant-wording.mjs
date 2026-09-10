/**
 * Participant-facing wording for the three Indiana conviction expungement
 * families: in_conviction_misd-set (I.C. 35-38-9-2), in_conviction_d6-set
 * (35-38-9-3) and in_conviction_felony-set (35-38-9-4).
 *
 * WHY THIS FILE EXISTS
 *
 * The committed legal-design records hold two kinds of sentence in the same
 * fields, and until now the guidance PDF printed both kinds straight through to
 * the person holding it.
 *
 * The first kind is law: what expungement does to a record, that there is one
 * petition per lifetime, what filing early under Chastain permanently costs.
 * That belongs to the participant.
 *
 * The second kind is direction to whoever builds this product: "Build the
 * eligibility calendar and the 365-day window optimiser before the petition
 * generator", "Route to a legal-review gate before offering this track", "This
 * is a delivery gate, not a generation blocker", "Confirm the current charge and
 * turnaround at build time", "Verify each against the current text before the
 * evaluator uses them". None of that belongs in a document handed to a
 * participant. It names unbuilt components, internal review gates and internal
 * reference material, and it tells the reader to do things only the factory can
 * do.
 *
 * A third defect ran through both kinds and through the memo's stop conditions:
 * the reader was addressed in the third person -- "the participant", "the
 * person", "a petitioner" -- by the document they are holding.
 *
 * THE MARKER WAS NEVER THE DEFECT
 *
 * The leak was first visible as bracketed snake_case classifications
 * ("[scope_restriction]") and a trailing triage tag ("(impact: release_blocker;
 * affects: filing_process)"). Deleting those would have zeroed every leak
 * counter and left the roadmap sentence sitting in the participant's hands. So
 * this file does not strip markers. It decides, line by line, whether the
 * sentence is something a participant needs, and where it is, says it to them in
 * the second person.
 *
 * HOW THIS REFUSES TO ROT
 *
 * Every table below is keyed by the exact sentence the committed record holds,
 * and every lookup REFUSES an unknown key rather than passing it through. That
 * is deliberate and it is the same discipline the role and action tables in each
 * builder already use: the defect being repaired is unreviewed source text
 * reaching a participant, and a silent fallback would let the next new sentence
 * do it again. If a record changes, the build stops and a person decides what
 * the participant is told.
 *
 * THE GUARANTEE WAS HALF A GUARANTEE, AND THAT IS WHY THE LEAK REGREW
 *
 * When this file was first written only three of its tables were read through
 * the refusing lookup. ACTION_TEXT_WORDING, ACTION_CONDITION_WORDING and
 * ORDER_BLANK_WHY_WORDING were read as `table.get(key) ?? raw`, so any sentence
 * nobody had decided was printed to the participant unchanged -- including on
 * the page-2 action block where the original leak was found. A guarantee with a
 * fallback is not a guarantee; it is a default that happens to be quiet.
 *
 * Worse, `filingInstructions()` -- which builds pages 6-7 of every guidance PDF
 * -- imported none of this and printed the record straight through behind five
 * fallbacks that invented factory prose for a missing field. A sentence that
 * this module refuses on page 2 was printed unrefused on page 6.
 *
 * Every table is now read through `participantWording`, and every sentence
 * either function prints is decided here. A row whose committed text already
 * speaks properly to the reader is recorded WITH that text as its decision
 * rather than being allowed through by fallback, so the audit distinguishes
 * "read and kept" from "never read".
 *
 * `say: null` means the line was judged wholly internal and is not printed.
 * `judgement` is recorded into build-findings.json so the per-line calls can be
 * audited without re-deriving them.
 *
 * Nothing here states a fact about any participant's case, composes a document
 * name, or adds a legal conclusion the records do not carry. Where a sentence
 * was split, the participant half is preserved in substance and the removed half
 * is named in `removed`.
 */
import assert from "node:assert/strict";

/** The em-dash and section glyphs are normalised by each builder's own
 *  `sanitize`. Keys here are the record's own bytes, so they carry the record's
 *  own punctuation. */

/* ------------------------------------------------------------------ */
/* registryTrack.legalDesignLimitations                                */
/* ------------------------------------------------------------------ */

export const LIMITATION_WORDING = new Map([
  [
    "Never say records are destroyed. In Indiana expungement means records are sealed or restricted under § 35-38-9-1(k). The Office of Judicial Administration states plainly that court records are not deleted or destroyed under I.C. 35-38-9.",
    {
      say: "Expungement in Indiana does not destroy your records. Under § 35-38-9-1(k) they are sealed, or access to them is restricted. The Office of Judicial Administration states plainly that court records are not deleted or destroyed under I.C. 35-38-9.",
      removed: "the drafting instruction \"Never say records are destroyed\".",
      judgement: "Participant-facing. The instruction was addressed to whoever writes this document; what it protects against - a petitioner believing the record is gone - is one of the most consequential things to get wrong, so the fact underneath is stated to the participant directly."
    }
  ],
  [
    "Put only the last four digits of the Social Security number on the petition. The full number goes on the Confidential Information Form, filed as a confidential document, accompanied by the Notice of Exclusion of Confidential Information from Public Access. Do not persist the full number.",
    {
      say: "Put only the last four digits of your Social Security number on the petition. Your full number goes on the Confidential Information Form, which is filed as a confidential document together with the Notice of Exclusion of Confidential Information from Public Access.",
      removed: "\"Do not persist the full number\", which is a data-retention rule for the software and not an act the participant performs.",
      judgement: "Participant-facing and directly actionable: the participant completes these forms by hand, so this is an instruction they carry out."
    }
  ],
  [
    "Disclose that the expungement case file is public until the order is granted.",
    {
      say: "Your expungement case file is public until the order is granted.",
      removed: "the framing \"Disclose that\", which addressed the drafter.",
      judgement: "Participant-facing. A petitioner deciding whether to file needs to know the filing itself is public in the meantime."
    }
  ],
  [
    "One petition per lifetime under § 35-38-9-9(i). Petitions filed in separate counties count as one only if they land inside a single 365-day window. Build the eligibility calendar and the 365-day window optimiser before the petition generator; in Indiana the scheduling decision is worth more than the document.",
    {
      say: "You get one petition in your lifetime under § 35-38-9-9(i). If you have convictions in more than one county, petitions filed in separate counties count as a single petition only when they are all filed inside one 365-day window. When you file therefore matters as much as what you file, so get legal help with the timing before you file anything.",
      removed: "\"Build the eligibility calendar and the 365-day window optimiser before the petition generator\", a product roadmap instruction naming two unbuilt components of this system.",
      judgement: "Participant-facing, and the most consequential rule in the chapter. The roadmap sentence was direction to the build team; the reason it existed - that timing is worth more than the document - is true of the participant's decision too, so it is kept as a timing warning without naming any component. The stop conditions this packet already carries say the same thing."
    }
  ],
  [
    "Put a hard gate in front of any conviction filing: where the participant has any conviction not yet eligible, surface Chastain v. State and the consequence of filing early before letting them proceed. Under Chastain a petitioner cannot use the liberal amendment rule to add records that were not yet eligible when the initial petition was filed, so filing now can permanently cost a record that ripens later. This is a delivery gate, not a generation blocker.",
    {
      say: "If you have any conviction that is not yet eligible, do not file until you have legal advice. Under Chastain v. State you cannot later use the liberal amendment rule to add records that were not yet eligible when your first petition was filed, so filing now can permanently cost you a record that becomes eligible later.",
      removed: "the instruction to \"put a hard gate in front of any conviction filing\" and the classification \"This is a delivery gate, not a generation blocker\", both of which are internal engineering direction about where this system enforces the rule.",
      judgement: "Participant-facing. The middle sentence is a warning about irreversible harm and is the participant's to act on; it also addressed them in the third person, which is corrected here."
    }
  ],
  [
    "Whether an offence involved serious bodily injury decides between Sections 3, 4 and 5. Ask it explicitly and refer where the answer is unclear.",
    {
      say: "Whether your offence involved serious bodily injury decides whether Section 3, 4 or 5 applies to you. Answer it from your own court record, and get legal help if the answer is not clear.",
      removed: "\"Ask it explicitly and refer where the answer is unclear\", which is direction to whoever builds the intake questionnaire.",
      judgement: "Participant-facing. Which section applies changes the relief and the waiting period, so the participant needs the question and needs to know it can be hard to answer."
    }
  ],
  [
    "Explain the Section 7 effect honestly: court and public records stay public but must be clearly and visibly marked expunged, and the listed agencies add an entry noting the expunged status. This is weaker than Section 6 sealing.",
    {
      say: "Under the Section 7 effect your court records and public records stay public. They must be clearly and visibly marked as expunged, and the agencies listed in the order add an entry noting the expunged status. This is weaker than the Section 6 sealing that applies to a misdemeanour or a Class D or Level 6 felony.",
      removed: "the drafting instruction \"Explain the Section 7 effect honestly\".",
      judgement: "Participant-facing. It is the answer to what the participant actually gets if the petition succeeds, and it is weaker than most people expect."
    }
  ],
  [
    "The grant is discretionary. Route to a legal-review gate before offering this track, per the build order in the review.",
    {
      say: "The grant on this section is discretionary. The court may grant your petition; it is not required to, even where you meet every statutory condition.",
      removed: "\"Route to a legal-review gate before offering this track, per the build order in the review\", which is internal routing direction about how this system releases the track.",
      judgement: "Participant-facing. Whether the court must grant or merely may grant is the difference between an entitlement and a request, and the participant is the one deciding whether to spend a once-in-a-lifetime petition on it."
    }
  ],
  [
    "On granting a conviction expungement the court shall also order the related arrest records expunged under §§ 35-38-9-6(g) and 35-38-9-7(e). Tell the participant they do not file separately for those.",
    {
      say: "When the court grants a conviction expungement it shall also order the related arrest records expunged under §§ 35-38-9-6(g) and 35-38-9-7(e). You do not file separately for those.",
      removed: "the framing \"Tell the participant they\", which addressed the drafter and put the reader in the third person.",
      judgement: "Participant-facing. Without it a participant may file, and pay for, a second petition they do not need - and under the one-petition-per-lifetime rule that is not a harmless mistake."
    }
  ]
]);

/* ------------------------------------------------------------------ */
/* memoTrack.unresolvedQuestions                                       */
/* ------------------------------------------------------------------ */

export const OPEN_QUESTION_WORDING = new Map([
  [
    "The amount of the civil filing fee for a Sections 2 through 5 petition, whether it is charged per county, and whether an indigency waiver is available.",
    {
      say: "How much the civil filing fee is for a Sections 2 through 5 petition, whether it is charged separately in each county, and whether an indigency waiver is available. Ask the clerk of the court you are filing in.",
      judgement: "Participant-facing. It is a gap in what this packet can tell them and it has a remedy they can act on today, so the remedy is stated with it."
    }
  ],
  [
    "Whether the statewide exclusions the internal reference lists for Sections 2 through 5 — sex or violent offenders, official misconduct, homicide, human trafficking, two or more deadly-weapon felonies, elected officials — are stated in § 35-38-9-2 through 5 or elsewhere. Verify each against the current text before the evaluator uses them.",
    {
      say: "Where each of the statewide exclusions comes from in the statute - sex or violent offenders, official misconduct, homicide, human trafficking, two or more deadly-weapon felonies, elected officials. This packet has not confirmed whether each one is stated in § 35-38-9-2 through 5 or somewhere else, so check any exclusion that might apply to you against the current text of the statute, with legal help.",
      removed: "\"the internal reference\" and \"Verify each against the current text before the evaluator uses them\", which name this system's own research materials and its eligibility software.",
      judgement: "Participant-facing. The exclusion list printed elsewhere in this packet has not been traced to the statute, and a participant should not take an eligibility bar on trust when it has not been."
    }
  ],
  [
    "Whether the current Coalition for Court Access petition still tracks the renumbered subsections. At least one county packet still cites the lifetime rule to § 35-38-9-9(h).",
    {
      say: "Whether the Coalition for Court Access forms still match the renumbered subsections of the statute. At least one county packet still cites the one-petition-per-lifetime rule to § 35-38-9-9(h) rather than § 35-38-9-9(i); if you see that citation on a county form, it is the same rule.",
      judgement: "Participant-facing. Without it a participant who notices the mismatch may conclude the form is wrong, or that a different rule applies to them."
    }
  ]
]);

/* ------------------------------------------------------------------ */
/* memoTrack.selfHelpStopConditions                                    */
/* ------------------------------------------------------------------ */

/** Every stop condition is kept. The defect here was address, not content: a
 *  list of circumstances written about "the person" under a heading telling the
 *  reader to stop and get help, leaving them to map a third party onto
 *  themselves. */
export const STOP_CONDITION_WORDING = new Map([
  ["The prosecutor objects or files a notice in opposition.",
    "The prosecuting attorney objects to your petition, or files a notice in opposition."],
  ["A victim submits a statement in opposition.",
    "A victim submits a statement opposing your petition."],
  ["The court sets a hearing.",
    "The court sets a hearing on your petition."],
  ["The person has convictions in more than one county and the 365-day window is already partly consumed.",
    "You have convictions in more than one county and part of the 365-day window has already been used."],
  ["A conviction is not yet eligible and the person wants to file now, which is the Chastain trap.",
    "One of your convictions is not yet eligible and you want to file now. This is the situation Chastain v. State makes permanently costly."],
  ["The person has already filed a Sections 2 through 5 petition.",
    "You have already filed a Sections 2 through 5 petition."],
  ["Classification between Sections 2, 3, 4 and 5 is unclear, or turns on whether an offence caused serious bodily injury.",
    "It is unclear which of Sections 2, 3, 4 and 5 covers your conviction, or the answer turns on whether your offence caused serious bodily injury."],
  ["The person is a sex or violent offender or subject to registration.",
    "You are a sex or violent offender, or you are subject to registration."],
  ["Fines, fees, costs or restitution are unpaid or disputed.",
    "Any of your fines, fees, costs or restitution are unpaid or disputed."],
  ["Charges are pending anywhere, or the person is in a pretrial diversion programme.",
    "You have charges pending anywhere, or you are in a pretrial diversion programme."],
  ["The record involves a commercial driver's licence and 49 C.F.R. 384.226.",
    "Your record involves a commercial driver's licence and 49 C.F.R. 384.226."],
  ["Immigration, firearm, licensing or CDL consequences are in play.",
    "Your immigration status, your firearm rights, a professional licence or a CDL could be affected."],
  ["The person wants to attack the underlying conviction rather than expunge it.",
    "You want to challenge the conviction itself rather than expunge it."]
]);

/* ------------------------------------------------------------------ */
/* registryTrack.packetSet.participantActionRequired                   */
/* ------------------------------------------------------------------ */

/** EVERY action row is decided here, and the lookup refuses an unknown one.
 *  This table used to be consulted with `?? raw`, so a row nobody had read was
 *  printed to a participant unchanged -- on the very block where the first leak
 *  was found. A row whose committed text already speaks properly to the reader
 *  is recorded with that text as its decision, so "decided" and "unchanged" stay
 *  distinguishable in the audit rather than collapsing into a silent fallback. */
export const ACTION_TEXT_WORDING = new Map([
  [
    "Obtain Certified limited criminal history from the Indiana State Police. Request a certified limited criminal history from the Indiana State Police. Confirm the current charge and turnaround at build time.",
    {
      say: "Request a certified limited criminal history from the Indiana State Police. What it costs and how long it takes both change, so confirm the current fee and turnaround with the State Police when you request it.",
      removed: "\"Confirm the current charge and turnaround at build time\", which told this system's builders to re-check the fee when the packet is generated.",
      judgement: "Participant-facing once re-addressed. The participant is the one making the request, and the fee and turnaround are theirs to confirm; the repeated document name was also collapsed to one mention."
    }
  ],
  [
    "Check your answer to \"List every conviction you have in Indiana, in any county, and whether each is eligible yet.\" against Certified limited criminal history from the Indiana State Police, and correct the packet if they disagree.",
    {
      say: "Check your answer to \"List every conviction you have in Indiana, in any county, and whether each is eligible yet.\" against Certified limited criminal history from the Indiana State Police, and correct the packet if they disagree.",
      removed: null,
      judgement: "Printed as the record states it. It already addresses the reader in the second person, names an act only they can perform, and carries no direction to this system."
    }
  ],
  [
    "Obtain Confirmation that all fines, fees, costs and restitution are satisfied. Ask the clerk for the balance on the cause number, including any restitution.",
    {
      say: "Obtain Confirmation that all fines, fees, costs and restitution are satisfied. Ask the clerk for the balance on the cause number, including any restitution.",
      removed: null,
      judgement: "Printed as the record states it. Both sentences are imperatives addressed to the reader and name an act only they can perform."
    }
  ],
  [
    "Check your answer to \"Have you paid all fines, fees and court costs, and satisfied any restitution?\" against Confirmation that all fines, fees, costs and restitution are satisfied, and correct the packet if they disagree.",
    {
      say: "Check your answer to \"Have you paid all fines, fees and court costs, and satisfied any restitution?\" against Confirmation that all fines, fees, costs and restitution are satisfied, and correct the packet if they disagree.",
      removed: null,
      judgement: "Printed as the record states it. Second person throughout, and the act is the participant's."
    }
  ],
  [
    "Obtain Written prosecutor consent. Ask the prosecuting attorney for written consent. Silence is not consent.",
    {
      say: "Obtain Written prosecutor consent. Ask the prosecuting attorney for written consent. Silence is not consent.",
      removed: null,
      judgement: "Printed as the record states it. \"Silence is not consent\" is a rule the participant needs before they read a non-answer as agreement, and this packet asserts no consent has been given."
    }
  ],
  [
    "Check your answer to \"Has the prosecuting attorney given written consent, either to shorten the waiting period or to allow the filing?\" against Written prosecutor consent, and correct the packet if they disagree.",
    {
      say: "Check your answer to \"Has the prosecuting attorney given written consent, either to shorten the waiting period or to allow the filing?\" against Written prosecutor consent, and correct the packet if they disagree.",
      removed: null,
      judgement: "Printed as the record states it. Second person, and it asks the participant to check rather than asserting any prosecutor act."
    }
  ],
  [
    "Verification and signature — Petition, verification block.",
    {
      say: "Verification and signature — Petition, verification block.",
      removed: null,
      judgement: "Printed as the record states it. It names a blank on a document the participant is holding and where on it that blank sits; it addresses nobody in the third person and directs nothing to this system."
    }
  ],
  [
    "Section classification — Petition, offence classification.",
    {
      say: "Section classification — Petition, offence classification.",
      removed: null,
      judgement: "Printed as the record states it, on the same ground as the verification block."
    }
  ],
  [
    "Additional-information narrative — Petition, additional information.",
    {
      say: "Additional-information narrative — Petition, additional information.",
      removed: null,
      judgement: "Printed as the record states it, on the same ground as the verification block."
    }
  ],
  [
    "Full Social Security number — Confidential Information Form.",
    {
      say: "Full Social Security number — Confidential Information Form.",
      removed: null,
      judgement: "Printed as the record states it. The rule that constrains it -- last four digits on the petition, full number only on the confidential form -- is stated to the participant in the limitations section."
    }
  ],
  [
    "The petition is verified and signed by the petitioner.",
    {
      say: "The petition is verified, and you sign it yourself.",
      removed: null,
      judgement: "Participant-facing once re-addressed. Nothing was withheld: the sentence described the reader as \"the petitioner\" in a list of acts the reader must perform, which is the same third-person address repaired elsewhere in this packet. It states the requirement and asserts no signature has been made."
    }
  ],
  [
    "A civil filing fee applies to Sections 2 through 5. The amount, whether it is per county, and indigency waiver availability are unresolved.",
    {
      say: "A civil filing fee applies to Sections 2 through 5. This packet has not confirmed the amount, whether it is charged separately in each county, or whether an indigency waiver is available.",
      removed: null,
      judgement: "Participant-facing once the gap is owned. \"Are unresolved\" left it ambiguous whether the statute is unsettled or this packet simply has not checked; it is the second, and saying so keeps the participant from reading a research gap as a statement of Indiana law. The remedy -- ask the clerk -- is carried by the fee section and the open questions."
    }
  ],
  [
    "Unresolved. Indigency waiver availability has not been confirmed.",
    {
      say: "This packet has not confirmed whether an indigency waiver is available to you.",
      removed: null,
      judgement: "Participant-facing once re-addressed. A bare status token led a step marked required before filing, which reads as a verdict on the participant's own case rather than on this packet's research; the following sentence rescued it, but only after the reader had already met the word. Recast in the second person with the remedy this packet states elsewhere."
    }
  ],
  [
    "Service on the prosecuting attorney under the Trial Rules. The CCA appearance form carries a certificate of service to the county prosecutor; follow the form.",
    {
      say: "Service on the prosecuting attorney under the Trial Rules. The CCA appearance form carries a certificate of service to the county prosecutor; follow the form.",
      removed: null,
      judgement: "Printed as the record states it. It states a rule and directs the reader to the form; nothing in it speaks to this system."
    }
  ],
  [
    "File the verified petition, order, appearance, Notice of Exclusion and Confidential Information Form with a circuit or superior court in the county of conviction, as case type XP.",
    {
      say: "File the verified petition, order, appearance, Notice of Exclusion and Confidential Information Form with a circuit or superior court in the county of conviction, as case type XP.",
      removed: null,
      judgement: "Printed as the record states it. It is an imperative naming the documents and the destination, and it is the act the participant performs."
    }
  ]
]);

export const ACTION_CONDITION_WORDING = new Map([
  [
    "Applies only when the participant cannot pay the filing fee.",
    {
      say: "Applies only if you cannot pay the filing fee.",
      judgement: "Participant-facing. The condition is real; it addressed the reader in the third person."
    }
  ],
  [
    "Required to file a Section 5 petition, and required to shorten a waiting period on any conviction track.",
    {
      say: "Required to file a Section 5 petition, and required to shorten the waiting period on any conviction expungement.",
      removed: "the word \"track\", which is this system's name for a route it builds.",
      judgement: "Participant-facing. Only the internal noun changed."
    }
  ]
]);

/* ------------------------------------------------------------------ */
/* production-field-map `why` text, where it is shown to a participant  */
/* ------------------------------------------------------------------ */

/** The field map is an internal artifact and "this build" is accurate there, so
 *  the map is left alone and the wording is translated only where the guidance
 *  prints it to a participant. Every `why` the guidance prints is decided here
 *  and the lookup refuses an unknown one; the six that already describe an act
 *  of the court or the clerk are recorded with their own text, so a new one
 *  cannot arrive by fallback. */
export const ORDER_BLANK_WHY_WORDING = new Map([
  [
    "granting or denying the petition is the court's decision and this build makes none of it",
    "granting or denying the petition is the court's decision, and nothing in this packet decides it"
  ],
  [
    "the findings are the court's, made by a preponderance on the statutory conditions",
    "the findings are the court's, made by a preponderance on the statutory conditions"
  ],
  [
    "the decretal paragraphs are the court's judgment",
    "the decretal paragraphs are the court's judgment"
  ],
  [
    "the sealing directives are the court's, and the related arrest records are ordered expunged by the same order under I.C. 35-38-9-6(g) and 35-38-9-7(e)",
    "the sealing directives are the court's, and the related arrest records are ordered expunged by the same order under I.C. 35-38-9-6(g) and 35-38-9-7(e)"
  ],
  [
    "the court dates its own order",
    "the court dates its own order"
  ],
  [
    "the judge signs if and when the court enters the order",
    "the judge signs if and when the court enters the order"
  ],
  [
    "distribution of a signed order is the clerk's act",
    "distribution of a signed order is the clerk's act"
  ]
]);

/* ------------------------------------------------------------------ */
/* memoTrack.exclusions                                                */
/* ------------------------------------------------------------------ */

/** The exclusions block printed the committed strings straight through. One of
 *  them carried the passive remnant of a build-time instruction -- "Verify each
 *  against the current text before the evaluator uses them" survived as "to be
 *  verified against the current text", actorless, in a list of bars a
 *  participant is reading to decide whether they are eligible at all. The bar is
 *  kept; the remnant is not, because the open-questions section of this packet
 *  already tells the participant, in the second person, that this exclusion list
 *  has not been traced to the statute and that they should check any bar that
 *  might apply to them with legal help. Saying it twice, once without an actor,
 *  weakened the place it is said properly. */
export const EXCLUSION_WORDING = new Map([
  [
    "Offences involving serious bodily injury.",
    {
      say: "Offences involving serious bodily injury.",
      removed: null,
      judgement: "Printed as the record states it. It names the bar and nothing else."
    }
  ],
  [
    "Convictions excluded by the statutory exclusion structure, to be verified against the current text.",
    {
      say: "Convictions excluded by the statutory exclusion structure.",
      removed: "\"to be verified against the current text\", the actorless remnant of the build-time instruction \"Verify each against the current text before the evaluator uses them\". It named no one who must verify, and this packet's open-questions section states the same caveat to the participant directly, with the remedy.",
      judgement: "The bar is participant-facing and is kept. The trailing clause was direction to this system's own eligibility work, left standing in the passive voice; it told the reader nothing they could act on and blunted the properly-addressed warning that follows."
    }
  ],
  [
    "Convictions excluded by the statutory exclusion structure, which must be verified against the current text of §§ 35-38-9-2 through 5.",
    {
      say: "Convictions excluded by the statutory exclusion structure of §§ 35-38-9-2 through 5.",
      removed: "\"which must be verified against the current text\", the same actorless remnant. The statutory citation it carried is kept, because it tells the participant where the bar is written.",
      judgement: "As above. The citation is participant-facing and is preserved; the unattributed verification duty is not."
    }
  ],
  [
    "Charges pending anywhere.",
    {
      say: "Charges pending anywhere.",
      removed: null,
      judgement: "Printed as the record states it."
    }
  ],
  [
    "Unpaid fines, fees, court costs or unsatisfied restitution.",
    {
      say: "Unpaid fines, fees, court costs or unsatisfied restitution.",
      removed: null,
      judgement: "Printed as the record states it."
    }
  ],
  [
    "A conviction within the applicable period, or within a shorter period the prosecutor agreed to.",
    {
      say: "A conviction within the applicable period, or within a shorter period the prosecutor agreed to.",
      removed: null,
      judgement: "Printed as the record states it. It states the condition without asserting that any prosecutor has agreed to anything."
    }
  ]
]);

/* ------------------------------------------------------------------ */
/* registryTrack.venue, .destination.detail and .rules                 */
/* ------------------------------------------------------------------ */

/** WHY THIS TABLE HAD TO EXIST BEFORE THE FILING PAGE COULD BE CLOSED.
 *
 * `filingInstructions()` builds pages 6-7 of every guidance PDF and called none
 * of this module. It printed the venue, the destination detail and four action
 * descriptions straight from the record, each behind a `??` fallback that
 * invented factory prose ("the committed record holds no filing action for this
 * track.") if the field were ever absent. The guidance page printed the same
 * `rules` fields the same way.
 *
 * Two sentences therefore reached the participant twice, in the defective form,
 * from two different functions:
 *
 *   "The petition is verified and signed by the petitioner."   (rules.participantSignature
 *                                                               and the `sign` action)
 *   "Unresolved. Indigency waiver availability has not been confirmed."
 *                                                              (rules.feeWaiver
 *                                                               and the `apply_fee_waiver` action)
 *
 * Deciding them in one table and one voice is the point: a reader meets each
 * sentence once, said the same way, wherever in the document it appears. */
export const RULE_WORDING = new Map([
  [
    "A circuit or superior court in the county of conviction. A person with convictions in more than one county files in each, and those filings count as one petition only if they fall inside a 365-day window. Case type XP under Administrative Rule 8(B)(3).",
    {
      say: "A circuit or superior court in the county of conviction. If you have convictions in more than one county you file in each of them, and those filings count as a single petition only if they all fall inside a 365-day window. Case type XP under Administrative Rule 8(B)(3).",
      removed: null,
      judgement: "Participant-facing once re-addressed. Nothing was withheld: \"A person with convictions in more than one county files in each\" described the reader in the third person while stating the rule that decides where the reader files, which is the same address defect repaired elsewhere in this packet."
    }
  ],
  [
    "The petition is served on the prosecuting attorney under the Trial Rules. Where the prosecutor does not object or waives objection, the court may grant without a hearing under § 35-38-9-9(a). A victim may submit an oral or written statement.",
    {
      say: "The petition is served on the prosecuting attorney under the Trial Rules. Where the prosecutor does not object or waives objection, the court may grant without a hearing under § 35-38-9-9(a). A victim may submit an oral or written statement.",
      removed: null,
      judgement: "Printed as the record states it. It states what happens to the petition and what the court and a victim may do; it describes no act of the reader in the third person and directs nothing to this system."
    }
  ],
  [
    "File the verified petition, order, appearance, Notice of Exclusion and Confidential Information Form with a circuit or superior court in the county of conviction, as case type XP.",
    {
      say: "File the verified petition, order, appearance, Notice of Exclusion and Confidential Information Form with a circuit or superior court in the county of conviction, as case type XP.",
      removed: null,
      judgement: "Printed as the record states it. An imperative naming the documents and the destination; the act is the participant's."
    }
  ],
  [
    "A civil filing fee applies to Sections 2 through 5. The amount, whether it is per county, and indigency waiver availability are unresolved.",
    {
      say: "A civil filing fee applies to Sections 2 through 5. This packet has not confirmed the amount, whether it is charged separately in each county, or whether an indigency waiver is available.",
      removed: null,
      judgement: "Participant-facing once the gap is owned. \"Are unresolved\" left it open whether Indiana law is unsettled or this packet simply has not checked; it is the second. Naming the packet as the thing that has not checked keeps a research gap from being read as a statement of law."
    }
  ],
  [
    "Unresolved. Indigency waiver availability has not been confirmed.",
    {
      say: "This packet has not confirmed whether an indigency waiver is available to you.",
      removed: null,
      judgement: "Participant-facing once re-addressed. A bare status token led a step marked required before filing, which reads as a verdict on the reader's own case before the sentence that rescues it arrives. The remedy - ask the clerk of the court you are filing in - is stated twice elsewhere in this same document, so it is not repeated here."
    }
  ],
  [
    "The petition is served on the prosecuting attorney under the Trial Rules. A victim is entitled to submit an oral or written statement in support or opposition, with no right of cross-examination by the petitioner.",
    {
      say: "The petition is served on the prosecuting attorney under the Trial Rules. A victim is entitled to submit an oral or written statement in support or opposition, and you have no right to cross-examine them on it.",
      removed: null,
      judgement: "Participant-facing once re-addressed. \"The petitioner\" is the reader, and the clause states a limit on what the reader may do at their own hearing - among the worst places to make them work out that a third party is themselves."
    }
  ],
  [
    "Service on the prosecuting attorney under the Trial Rules. The CCA appearance form carries a certificate of service to the county prosecutor; follow the form.",
    {
      say: "Service on the prosecuting attorney under the Trial Rules. The CCA appearance form carries a certificate of service to the county prosecutor; follow the form.",
      removed: null,
      judgement: "Printed as the record states it. It states the rule and directs the reader to the form."
    }
  ],
  [
    "The petition is verified and signed by the petitioner.",
    {
      say: "The petition is verified, and you sign it yourself.",
      removed: null,
      judgement: "Participant-facing once re-addressed. Nothing was withheld. It asserts no signature has been made; it states that the signature is the reader's to make."
    }
  ],
  [
    "none",
    {
      say: "Not required.",
      removed: null,
      judgement: "The record's own enum value. Printed bare it read as \"Notarization: none\", which does not tell a participant whether notarisation is not required or simply not recorded here. It is the first. No statement is added about what the petition is instead; the signature line above already carries that."
    }
  ]
]);

/* ------------------------------------------------------------------ */
/* lookups that refuse                                                 */
/* ------------------------------------------------------------------ */

/**
 * Resolve a committed sentence to what the participant is told.
 * Returns `null` where the line was judged wholly internal.
 * Refuses -- and stops the build -- on any sentence not decided here.
 */
export function participantWording(table, key, what) {
  const row = table.get(key);
  assert.ok(row !== undefined,
    `no participant-facing wording has been decided for this ${what}, so it must not be printed to a participant:\n  ${key}\n` +
    "Decide whether a participant needs it. If they do, say it to them in the second person; if they do not, record it as internal and print nothing.");
  if (row === null) return null;
  if (typeof row === "string") return { say: row, removed: null, judgement: null };
  return row;
}

/** The audit trail for one family's per-line calls, for build-findings.json. */
export function wordingAudit(entries) {
  return entries.map(({ what, source, decided }) => ({
    what,
    committedSource: source,
    printedToParticipant: decided.say,
    withheldFromParticipant: decided.removed ?? null,
    judgement: decided.judgement ?? null
  }));
}
