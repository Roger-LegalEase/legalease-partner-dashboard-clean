#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — the South Carolina custom-pleading family, ten
 * routes across ten committed tracks.
 *
 *   node "scripts/build-census-v1-rcap-sc-custom-pleading.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * TEN STATUTORY ROUTES IN ONE FAMILY, all participant-initiated, all built as
 * custom pleadings from the committed specifications' own component sets.
 * Three of the ten carry a second component the others do not: an attestation
 * request, addressed to the office the committed record names as the
 * attesting authority.
 *
 * THIS FAMILY'S MASTER_QUEUE ROW IS THE ONE EXCEPTION IN THIS LANE. Its
 * sourceStatus is SOURCE_BOUND_BY_HELD_BYTES with custodyClass
 * SOURCE_GENUINELY_MISSING and one bound source. That is a source-lane
 * finding about an official document this family does not compose from: this
 * build binds committed repository records only, states so in its receipt,
 * and composes no page from a document it does not hold. The missing custody
 * is reported, not papered over, and it is a question for the source lane
 * rather than a defect in what this packet says.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-sc-custom-pleading",
  "worklistGroupId": "rcap-sc-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-sc-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading",
  "jurisdiction": "SC",
  "legalName": "South Carolina Expungement Applications — §§ 17-1-40, 17-22-150, 22-5-910, 22-5-920, 22-5-930, 34-11-90(e), 44-53-450 and 56-5-750(f)",
  "routeName": "applying for a South Carolina expungement under the section that fits the participant's own record",
  "statutes": [
    "S.C. Code § 17-22-510",
    "S.C. Code § 17-22-520",
    "S.C. Code § 17-22-530(A)",
    "S.C. Code § 17-22-530(B)",
    "S.C. Code § 17-22-550",
    "S.C. Code § 17-22-940(D)",
    "S.C. Code § 17-22-940(E)",
    "S.C. Code § 44-53-450(A)",
    "S.C. Code § 44-53-450(B)",
    "S.C. Code § 44-53-450(C)",
    "S.C. Code § 44-53-370(c)",
    "S.C. Code § 44-53-370(d)",
    "S.C. Code § 44-53-375(A)",
    "S.C. Code § 17-22-310",
    "S.C. Code § 17-22-320",
    "S.C. Code § 17-22-330(A)",
    "S.C. Code § 17-22-330(C)",
    "S.C. Code § 17-22-330(D)",
    "S.C. Code § 17-22-350",
    "S.C. Code § 17-1-40(A)",
    "S.C. Code § 17-1-40(B)",
    "S.C. Code § 17-1-40(C)",
    "S.C. Code § 17-22-910",
    "S.C. Code § 17-22-930",
    "S.C. Code § 17-22-940(A)(1)",
    "S.C. Code § 17-22-940(G)",
    "S.C. Code § 17-22-940(H)",
    "S.C. Code § 17-1-65",
    "S.C. Code § 16-23-20",
    "2024 Act No. 111 (H.3594), § 20",
    "S.C. Code § 22-5-910(A)",
    "S.C. Code § 22-5-910(B)",
    "S.C. Code § 22-5-910(C)",
    "S.C. Code § 22-5-910(D)",
    "S.C. Code § 22-5-910(E)",
    "S.C. Code § 22-5-910(F)",
    "S.C. Code § 16-25-20(D)",
    "S.C. Code § 22-5-920(A)",
    "S.C. Code § 22-5-920(B)(1)",
    "S.C. Code § 22-5-920(B)(2)",
    "S.C. Code § 22-5-920(B)(3)",
    "S.C. Code Title 24, Chapter 19",
    "S.C. Code § 16-1-60",
    "S.C. Code § 16-25-30",
    "S.C. Code § 22-5-930(A)",
    "S.C. Code § 22-5-930(B)",
    "S.C. Code § 22-5-930(C)",
    "S.C. Code § 22-5-930(D)",
    "S.C. Code § 22-5-930(E)",
    "S.C. Code § 40-43-86(EE)",
    "S.C. Code § 44-53-450",
    "S.C. Code § 34-11-90(e)",
    "S.C. Code § 34-11-95",
    "S.C. Code § 56-5-750(B)(1)",
    "S.C. Code § 56-5-750(F)"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-only:SC:sc_aep"
    },
    {
      "routeKey": "obligation:track-only:SC:sc_conditional_discharge_44_53_450"
    },
    {
      "routeKey": "obligation:track-only:SC:sc_tep"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_17_1_40_general_sessions:general-sessions-non-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_17_1_65_handgun:eligible-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_22_5_910:eligible-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_22_5_920_yoa:eligible-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_22_5_930_drug:eligible-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_34_11_90e_check:eligible-conviction-expungement"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_56_5_750f:eligible-conviction-expungement"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:sc_aep+sc_conditional_discharge_44_53_450+sc_tep+sc_17_1_40_general_sessions+sc_17_1_65_handgun+sc_22_5_910+sc_22_5_920_yoa+sc_22_5_930_drug+sc_34_11_90e_check+sc_56_5_750f",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"sc_aep\"",
        "Solicitor Application to Destroy Arrest Records After Successful Alcohol Education Program Completion, S.C. Code § 17-22-530(A)",
        "The controlling citation is settled at source. Article 5 of Chapter 22, Title 17 is the Alcohol Education Program: § 17-",
        "Statewide statute administered circuit by circuit, each programme being under the direct supervision and control of the ",
        "S.C. Code § 17-22-510",
        "S.C. Code § 17-22-520",
        "S.C. Code § 17-22-530(A)",
        "S.C. Code § 17-22-530(B)",
        "S.C. Code § 17-22-550",
        "S.C. Code § 17-22-940(D)",
        "S.C. Code § 17-22-940(E)",
        "What is your full legal name, and every other name you have been known by?",
        "What is your date of birth?",
        "What was the charge, and what is the warrant, ticket or indictment number?",
        "In which South Carolina county was the offence committed?",
        "Was the case handled in magistrate court, municipal court or General Sessions court?",
        "On what date were you arrested or served, and which agency arrested you?",
        "How did the case end, and on what date?",
        "Did more than one charge come out of this same incident? If so, list them all.",
        "Have you ever had a South Carolina record expunged before, under any statute?",
        "Do you have any criminal charges pending anywhere right now, and if so since when?",
        "How old were you on the date of arrest?",
        "Had you ever had any other alcohol-related offence before this one?",
        "On what date did you successfully complete the Alcohol Education Program, and which circuit administered it?",
        "$250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later f",
        "None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's offic",
        "Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expu",
        "\"trackId\": \"sc_conditional_discharge_44_53_450\"",
        "Solicitor Application to Expunge Records After a First-Offence Drug Conditional Discharge, S.C. Code § 44-53-450(b)",
        "Read at source on 2026-08-06, § 44-53-450(A) allows a person not previously convicted of any offence under Article 3 of ",
        "Statewide statute. The conditional discharge itself may be entered in general sessions or summary court; the expungement",
        "S.C. Code § 44-53-450(A)",
        "S.C. Code § 44-53-450(B)",
        "S.C. Code § 44-53-450(C)",
        "S.C. Code § 44-53-370(c)",
        "S.C. Code § 44-53-370(d)",
        "S.C. Code § 44-53-375(A)",
        "Before this case, had you ever been convicted of any drug offence, in South Carolina, another state or a federal court?",
        "On what date did the court discharge you and dismiss the proceedings?",
        "Did you pay the conditional discharge fee — $350 in General Sessions or $150 in summary court — or was it waived for indigency?",
        "Have you ever had a conditional discharge under this section before?",
        "\"trackId\": \"sc_tep\"",
        "Solicitor Application to Destroy Arrest Records After Successful Traffic Education Program Completion, S.C. Code § 17-22-330(A)",
        "The controlling citation is settled at source. Article 3 of Chapter 22, Title 17 is the Traffic Education Program Act: §",
        "Statewide statute administered circuit by circuit under the direct supervision and control of the circuit solicitor, who",
        "S.C. Code § 17-22-310",
        "S.C. Code § 17-22-320",
        "S.C. Code § 17-22-330(A)",
        "S.C. Code § 17-22-330(C)",
        "S.C. Code § 17-22-330(D)",
        "S.C. Code § 17-22-350",
        "On what date did you successfully complete the Traffic Education Program, and which circuit or agency administered it?",
        "Did you get another traffic ticket in the six months after the ticket that put you in the programme?",
        "Did the incident cause anyone's death or a serious bodily injury?",
        "\"trackId\": \"sc_17_1_40_general_sessions\"",
        "Solicitor Application to Destroy Arrest Records of a General Sessions Non-Conviction, S.C. Code § 17-1-40",
        "Read at source on 2026-08-06, § 17-1-40(B)(1) provides that where a person's record is expunged under Article 9 of Chapt",
        "Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the off",
        "S.C. Code § 17-1-40(A)",
        "S.C. Code § 17-1-40(B)",
        "S.C. Code § 17-1-40(C)",
        "S.C. Code § 17-22-910",
        "S.C. Code § 17-22-930",
        "S.C. Code § 17-22-940(A)(1)",
        "S.C. Code § 17-22-940(G)",
        "S.C. Code § 17-22-940(H)",
        "Were these charges dropped as part of a deal in which you pleaded guilty to something else and were sentenced on it?",
        "Were you issued a courtesy summons rather than arrested?",
        "No $250 solicitor administrative fee, unless the charge was dismissed, discharged or nolle prossed as part of the plea a",
        "\"trackId\": \"sc_17_1_65_handgun\"",
        "Solicitor Application to Expunge an Old Unlawful Handgun Possession Conviction, S.C. Code § 17-1-65",
        "Read at source on 2026-08-06, § 17-1-65 provides that a person may apply for an expungement of one conviction for unlawf",
        "S.C. Code § 17-1-65",
        "S.C. Code § 16-23-20",
        "2024 Act No. 111 (H.3594), § 20",
        "On what date were you convicted of unlawful possession of a handgun?",
        "Does the sentencing paperwork show the conviction was under S.C. Code § 16-23-20?",
        "Have you ever applied before for an expungement of a handgun possession conviction under § 17-1-65?",
        "Do you have more than one conviction for unlawful possession of a handgun?",
        "\"trackId\": \"sc_22_5_910\"",
        "Solicitor Application to Expunge a First Low-Level Conviction or a Domestic Violence Third-Degree Conviction, S.C. Code § 22-5-910",
        "Read at source on 2026-08-06, § 22-5-910(A) allows a defendant convicted of a crime carrying a penalty of not more than ",
        "S.C. Code § 22-5-910(A)",
        "S.C. Code § 22-5-910(B)",
        "S.C. Code § 22-5-910(C)",
        "S.C. Code § 22-5-910(D)",
        "S.C. Code § 22-5-910(E)",
        "S.C. Code § 22-5-910(F)",
        "S.C. Code § 16-25-20(D)",
        "On what date were you convicted, counting a guilty plea, a no-contest plea, or forfeiting bail as a conviction?",
        "What was the maximum penalty for the offence you were convicted of — how many days of jail and what fine did the law allow?",
        "Did the offence involve operating a motor vehicle?",
        "Was the conviction for domestic violence in the third degree?",
        "Was the conviction a first offence of unlawful possession of a firearm or weapon?",
        "Have you had any other conviction anywhere, including in another state, since that conviction?",
        "Were you sentenced for more than one offence at the same sentencing, and did they come out of the same incident?",
        "Have you ever been under a bench warrant for failing to appear, and for how long?",
        "\"trackId\": \"sc_22_5_920_yoa\"",
        "Solicitor Application to Expunge a First-Offence Youthful Offender Act Conviction, S.C. Code § 22-5-920",
        "Read at source on 2026-08-06, § 22-5-920(B)(1) allows a defendant with a first offence conviction as a youthful offender",
        "S.C. Code § 22-5-920(A)",
        "S.C. Code § 22-5-920(B)(1)",
        "S.C. Code § 22-5-920(B)(2)",
        "S.C. Code § 22-5-920(B)(3)",
        "S.C. Code Title 24, Chapter 19",
        "S.C. Code § 16-1-60",
        "S.C. Code § 16-25-30",
        "Does your sentencing paperwork say you were sentenced under the Youthful Offender Act — not just that you were young enough to qualify?",
        "On what date did you finish the whole youthful offender sentence, including any probation and any parole?",
        "Have you had any conviction anywhere, including in another state, while you were serving that sentence or in the five years since you finished it?",
        "Did the offence involve driving, violence, a domestic relationship, or anything that put you on the sex offender registry?",
        "Were you given youthful offender sentences for more than one offence at the same sentencing, and did they come out of the same incident?",
        "\"trackId\": \"sc_22_5_930_drug\"",
        "Solicitor Application to Expunge a First-Offence Drug Conviction, S.C. Code § 22-5-930",
        "Read in full at source on 2026-08-06, § 22-5-930 has two branches. Subsection (A) reaches a first offence conviction for",
        "Statewide statute administered circuit by circuit; the section reaches convictions in magistrates court and general sess",
        "S.C. Code § 22-5-930(A)",
        "S.C. Code § 22-5-930(B)",
        "S.C. Code § 22-5-930(C)",
        "S.C. Code § 22-5-930(D)",
        "S.C. Code § 22-5-930(E)",
        "S.C. Code § 40-43-86(EE)",
        "S.C. Code § 44-53-450",
        "Was the conviction for simple possession, for unlawful possession of a prescription drug, or for possession with intent to distribute?",
        "What controlled substance was involved — was it marijuana or something else?",
        "On what date did you finish the whole sentence for this conviction, including any probation and any parole?",
        "Was this your first drug conviction of this kind?",
        "Had you had a conditional discharge at any point before you were arrested on this charge, and if so when?",
        "Have you had any other conviction anywhere since you finished the sentence?",
        "For a possession-with-intent conviction: have you completed a sentence for any other drug conviction or any felony conviction, and when?",
        "\"trackId\": \"sc_34_11_90e_check\"",
        "Solicitor Application to Expunge a First-Offence Fraudulent Check Conviction, S.C. Code § 34-11-90(e)",
        "Read at source on 2026-08-06, § 34-11-90(e) provides that after a conviction under the chapter on a first offence the de",
        "S.C. Code § 34-11-90(e)",
        "S.C. Code § 34-11-95",
        "On what date were you convicted, including a guilty plea, a no-contest plea or a bail forfeiture?",
        "What was the amount of the cheque?",
        "Have you had any other conviction of any kind in the year since that conviction?",
        "How many cheques were involved, and were they charged as separate offences?",
        "\"trackId\": \"sc_56_5_750f\"",
        "Solicitor Application to Expunge a First-Offence Failure to Stop for a Blue Light Conviction, S.C. Code § 56-5-750(F)",
        "Read at source on 2026-08-06, § 56-5-750(F) provides that after a conviction pursuant to subsection (B)(1) for a first o",
        "S.C. Code § 56-5-750(B)(1)",
        "S.C. Code § 56-5-750(F)",
        "On what date did the offence happen?",
        "Which part of the failure-to-stop statute were you convicted under, and was it charged as a misdemeanour or a felony?",
        "Did the incident cause anyone great bodily injury or death?",
        "On what date did you finish every term and condition of the sentence — fines, restitution, community service, probation, everything?",
        "Have you had any other conviction anywhere in the three years since you finished those terms?",
        "Was this your first conviction under this statute?"
      ]
    },
    {
      "recordId": "legal-design-specifications:sc_aep+sc_conditional_discharge_44_53_450+sc_tep+sc_17_1_40_general_sessions+sc_17_1_65_handgun+sc_22_5_910+sc_22_5_920_yoa+sc_22_5_930_drug+sc_34_11_90e_check+sc_56_5_750f",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"sc_aep-primary-filing-1\"",
        "\"componentId\": \"sc_aep-attestation-request-3\"",
        "\"componentId\": \"sc_conditional_discharge_44_53_450-primary-filing-1\"",
        "\"componentId\": \"sc_conditional_discharge_44_53_450-attestation-request-3\"",
        "\"componentId\": \"sc_tep-primary-filing-1\"",
        "\"componentId\": \"sc_tep-attestation-request-3\"",
        "\"componentId\": \"sc_17_1_40_general_sessions-primary-filing-1\"",
        "\"componentId\": \"sc_17_1_65_handgun-primary-filing-1\"",
        "\"componentId\": \"sc_22_5_910-primary-filing-1\"",
        "\"componentId\": \"sc_22_5_910-attestation-request-3\"",
        "\"componentId\": \"sc_22_5_920_yoa-primary-filing-1\"",
        "\"componentId\": \"sc_22_5_930_drug-primary-filing-1\"",
        "\"componentId\": \"sc_34_11_90e_check-primary-filing-1\"",
        "\"componentId\": \"sc_56_5_750f-primary-filing-1\""
      ]
    },
    {
      "recordId": "route-obligation-census:10-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-only:SC:sc_aep",
        "obligation:track-only:SC:sc_conditional_discharge_44_53_450",
        "obligation:track-only:SC:sc_tep",
        "obligation:track-pathway:SC:sc_17_1_40_general_sessions:general-sessions-non-conviction-expungement",
        "obligation:track-pathway:SC:sc_17_1_65_handgun:eligible-conviction-expungement",
        "obligation:track-pathway:SC:sc_22_5_910:eligible-conviction-expungement",
        "obligation:track-pathway:SC:sc_22_5_920_yoa:eligible-conviction-expungement",
        "obligation:track-pathway:SC:sc_22_5_930_drug:eligible-conviction-expungement",
        "obligation:track-pathway:SC:sc_34_11_90e_check:eligible-conviction-expungement",
        "obligation:track-pathway:SC:sc_56_5_750f:eligible-conviction-expungement"
      ]
    }
  ],
  "components": [
    {
      "id": "sc_aep-primary-filing-1",
      "routeKey": "obligation:track-only:SC:sc_aep",
      "title": "Petition - Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO DESTROY ARREST RECORDS AFTER SUCCESSFUL ALCOHOL EDUCATION PROGRAM COMPLETION, S.C. CODE § 17-22-530(A)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 17-22-510; S.C. Code § 17-22-520; S.C. Code § 17-22-530(A); S.C. Code § 17-22-530(B); S.C. Code § 17-22-550; S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "The controlling citation is settled at source. Article 5 of Chapter 22, Title 17 is the Alcohol Education Program: § 17-22-510 gives each circuit solicitor prosecutorial discretion to establish the programme, § 17-22-520 sets eligibility, and § 17-22-530 governs disposition on completion. Under § 17-22-530(A), when a person successfully completes an alcohol education programme the circuit solicitor shall effect a noncriminal disposition of the alcohol-related offence and no record may be maintained except by the Commission on Prosecution Coordination to prevent a second use; under § 17-22-530(B) the person may then apply to the court for an order to destroy all official records relating to the arrest. Section 17-22-520 confines eligibility to a person at least seventeen but under twenty-one at the time of arrest, with no prior alcohol-related offence and no significant history of prior delinquency or criminal activity, charged with one of eleven enumerated offences or another offence similar in nature and severity as determined by the circuit solicitor, expressly excluding the offences enumerated in §§ 56-5-2930 and 56-5-2933. Participation is once only. Section 17-22-940(D) names the alcohol education program director as an attestor and § 17-22-940(E)(1) exempts § 17-22-530(A) from the SLED verification fee.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - age at arrest] How old were you on the date of arrest?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - prior alcohol offense] Had you ever had any other alcohol-related offence before this one?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - aep completion date] On what date did you successfully complete the Alcohol Education Program, and which circuit administered it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 17-22-510; S.C. Code § 17-22-520; S.C. Code § 17-22-530(A); S.C. Code § 17-22-530(B); S.C. Code § 17-22-550; S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_ageAtArrest",
          "label": "Item C11 - age at arrest",
          "supply": "How old were you on the date of arrest?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorAlcoholOffense",
          "label": "Item C12 - prior alcohol offense",
          "supply": "Had you ever had any other alcohol-related offence before this one?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_aepCompletionDate",
          "label": "Item C13 - aep completion date",
          "supply": "On what date did you successfully complete the Alcohol Education Program, and which circuit administered it?",
          "why": "the committed track registry records this as a required generation input for sc_aep, and the platform holds no value for it"
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
      "id": "sc_aep-attestation-request-3",
      "routeKey": "obligation:track-only:SC:sc_aep",
      "title": "Request for Attestation - Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "role": "attestation_request",
      "description": "the written request to the office the record names as the attesting authority (Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program)",
      "condition": null,
      "body": [
        "TO: Solicitor's Office in the judicial circuit where the offence was committed",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST FOR ATTESTATION",
        "",
        "I am asking the office named above for the attestation the record requires before this matter can go forward.",
        "",
        "The matter this request concerns:",
        "",
        "Court or office that handled the matter:",
        "{{DOTS}}",
        "",
        "Case or docket number:",
        "{{DOTS}}",
        "",
        "Date of the disposition:",
        "{{DOTS}}",
        "",
        "What I am asking for:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE {{DOTS:44}}",
        "",
        "(The person named above signs and dates this request personally.)"
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
          "id": "addressee_detail",
          "label": "The exact office and postal address of the recipient of this request",
          "supply": "the exact office and postal address you are sending this to, confirmed with that office",
          "why": "which office holds the participant's own matter is a fact of that matter"
        },
        {
          "kind": "rbf",
          "id": "req_court",
          "label": "Court or office that handled the matter",
          "supply": "the court or office that handled your matter, exactly as the record names it",
          "why": "no court identity is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_case_number",
          "label": "Case or docket number of the matter this request concerns",
          "supply": "the case or docket number, copied from the record",
          "why": "no case identifier is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_disposition_date",
          "label": "Date of the disposition of the matter this request concerns",
          "supply": "the date of the disposition, copied from the record",
          "why": "no disposition date is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_ask",
          "label": "What the person making this request is asking the office to do",
          "supply": "what you are asking that office to do, in your own words",
          "why": "the platform never writes a participant's own request for them"
        },
        {
          "kind": "protected",
          "id": "request_signature",
          "label": "Signature of the person named in the caption, on the request",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "request_signature_date",
          "label": "Date beside the signature on the request",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "sc_aep-filing-instructions-4",
      "routeKey": "obligation:track-only:SC:sc_aep",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Destroy Arrest Records After Successful Alcohol Education Program Completion, S.C. Code § 17-22-530(A).",
        "",
        "The controlling citation is settled at source. Article 5 of Chapter 22, Title 17 is the Alcohol Education Program: § 17-22-510 gives each circuit solicitor prosecutorial discretion to establish the programme, § 17-22-520 sets eligibility, and § 17-22-530 governs disposition on completion. Under § 17-22-530(A), when a person successfully completes an alcohol education programme the circuit solicitor shall effect a noncriminal disposition of the alcohol-related offence and no record may be maintained except by the Commission on Prosecution Coordination to prevent a second use; under § 17-22-530(B) the person may then apply to the court for an order to destroy all official records relating to the arrest. Section 17-22-520 confines eligibility to a person at least seventeen but under twenty-one at the time of arrest, with no prior alcohol-related offence and no significant history of prior delinquency or criminal activity, charged with one of eleven enumerated offences or another offence similar in nature and severity as determined by the circuit solicitor, expressly excluding the offences enumerated in §§ 56-5-2930 and 56-5-2933. Participation is once only. Section 17-22-940(D) names the alcohol education program director as an attestor and § 17-22-940(E)(1) exempts § 17-22-530(A) from the SLED verification fee.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office. The alcohol education program director must attest by signature under § 17-22-940(D) before the solicitor and then a circuit court judge sign. No SLED verification fee is charged.",
        "Venue: Statewide statute administered circuit by circuit, each programme being under the direct supervision and control of the circuit solicitor. Apply to the Solicitor's Office in the judicial circuit where the offence was committed.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; NO SLED verification fee, because § 17-22-940(E)(1) exempts this route; and the $35 clerk of court filing fee under § 17-22-940(F). The § 17-22-550 programme enrolment fee of $250, and any provider fees, are programme costs; participation may not be denied for inability to pay and those fees may be waived or reduced at the solicitor's discretion. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- Fees: $250 program fee plus possible provider fees. Inability to pay cannot bar participation, and the solicitor may waive or reduce fees.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- The participant was terminated from the programme or the offence was reinstated.",
        "- The offence may be a DUI-type offence under § 56-5-2930 or § 56-5-2933, which the programme excludes.",
        "- The Alcohol Education Program Director will not attest.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_aep-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program)",
        "- sc_aep-attestation-request-3: the written request to the office the record names as the attesting authority (Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program)"
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
      "id": "sc_conditional_discharge_44_53_450-primary-filing-1",
      "routeKey": "obligation:track-only:SC:sc_conditional_discharge_44_53_450",
      "title": "Petition - Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a first South Carolina drug possession case that ended in a conditional discharge)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO EXPUNGE RECORDS AFTER A FIRST-OFFENCE DRUG CONDITIONAL DISCHARGE, S.C. CODE § 44-53-450(B)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 44-53-450(A); S.C. Code § 44-53-450(B); S.C. Code § 44-53-450(C); S.C. Code § 44-53-370(c); S.C. Code § 44-53-370(d); S.C. Code § 44-53-375(A); S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read at source on 2026-08-06, § 44-53-450(A) allows a person not previously convicted of any offence under Article 3 of Chapter 53, Title 44, or under any state or federal marijuana, stimulant, depressant or hallucinogenic drug statute, who pleads guilty to or is found guilty of possession of a controlled substance under § 44-53-370(c) or (d) or § 44-53-375(A), to be placed on probation without entry of a judgment of guilt, with the court discharging the person and dismissing the proceedings on fulfilment of the terms. The discharge is not a conviction for purposes of any disqualification or disability, a nonpublic record is retained by the Department of Narcotic and Dangerous Drugs under SLED solely to determine whether a later offence is a subsequent one, and the discharge and dismissal may occur only once with respect to any person. Subsection (B) is the expungement: on dismissal and discharge the person may apply to the court for an order expunging from all official records, other than the retained nonpublic record, all recordation relating to the arrest, indictment or information, trial, finding of guilt, and the dismissal and discharge, and if the court determines after hearing that the person was dismissed and discharged it shall enter the order, restoring the person in the contemplation of law to the status occupied before arrest. Subsection (C) requires payment before discharge of a fee of $350 in general sessions court or $150 in summary court, waivable, reducible or suspendable only for indigency. Section 17-22-940(D) requires the summary court judge to attest where the matter was in summary court, and § 17-22-940(E) exempts the route from SLED verification and its fee.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - prior drug conviction] Before this case, had you ever been convicted of any drug offence, in South Carolina, another state or a federal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - discharge date] On what date did the court discharge you and dismiss the proceedings?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - discharge fee paid] Did you pay the conditional discharge fee — $350 in General Sessions or $150 in summary court — or was it waived for indigency?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - prior conditional discharge] Have you ever had a conditional discharge under this section before?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 44-53-450(A); S.C. Code § 44-53-450(B); S.C. Code § 44-53-450(C); S.C. Code § 44-53-370(c); S.C. Code § 44-53-370(d); S.C. Code § 44-53-375(A); S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorDrugConviction",
          "label": "Item C11 - prior drug conviction",
          "supply": "Before this case, had you ever been convicted of any drug offence, in South Carolina, another state or a federal court?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dischargeDate",
          "label": "Item C12 - discharge date",
          "supply": "On what date did the court discharge you and dismiss the proceedings?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dischargeFeePaid",
          "label": "Item C13 - discharge fee paid",
          "supply": "Did you pay the conditional discharge fee — $350 in General Sessions or $150 in summary court — or was it waived for indigency?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorConditionalDischarge",
          "label": "Item C14 - prior conditional discharge",
          "supply": "Have you ever had a conditional discharge under this section before?",
          "why": "the committed track registry records this as a required generation input for sc_conditional_discharge_44_53_450, and the platform holds no value for it"
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
      "id": "sc_conditional_discharge_44_53_450-attestation-request-3",
      "routeKey": "obligation:track-only:SC:sc_conditional_discharge_44_53_450",
      "title": "Request for Attestation - Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "role": "attestation_request",
      "description": "the written request to the office the record names as the attesting authority (Clear a first South Carolina drug possession case that ended in a conditional discharge)",
      "condition": null,
      "body": [
        "TO: Solicitor's Office in the judicial circuit where the offence was committed",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST FOR ATTESTATION",
        "",
        "I am asking the office named above for the attestation the record requires before this matter can go forward.",
        "",
        "The matter this request concerns:",
        "",
        "Court or office that handled the matter:",
        "{{DOTS}}",
        "",
        "Case or docket number:",
        "{{DOTS}}",
        "",
        "Date of the disposition:",
        "{{DOTS}}",
        "",
        "What I am asking for:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE {{DOTS:44}}",
        "",
        "(The person named above signs and dates this request personally.)"
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
          "id": "addressee_detail",
          "label": "The exact office and postal address of the recipient of this request",
          "supply": "the exact office and postal address you are sending this to, confirmed with that office",
          "why": "which office holds the participant's own matter is a fact of that matter"
        },
        {
          "kind": "rbf",
          "id": "req_court",
          "label": "Court or office that handled the matter",
          "supply": "the court or office that handled your matter, exactly as the record names it",
          "why": "no court identity is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_case_number",
          "label": "Case or docket number of the matter this request concerns",
          "supply": "the case or docket number, copied from the record",
          "why": "no case identifier is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_disposition_date",
          "label": "Date of the disposition of the matter this request concerns",
          "supply": "the date of the disposition, copied from the record",
          "why": "no disposition date is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_ask",
          "label": "What the person making this request is asking the office to do",
          "supply": "what you are asking that office to do, in your own words",
          "why": "the platform never writes a participant's own request for them"
        },
        {
          "kind": "protected",
          "id": "request_signature",
          "label": "Signature of the person named in the caption, on the request",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "request_signature_date",
          "label": "Date beside the signature on the request",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "sc_conditional_discharge_44_53_450-filing-instructions-4",
      "routeKey": "obligation:track-only:SC:sc_conditional_discharge_44_53_450",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a first South Carolina drug possession case that ended in a conditional discharge)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Expunge Records After a First-Offence Drug Conditional Discharge, S.C. Code § 44-53-450(b).",
        "",
        "Read at source on 2026-08-06, § 44-53-450(A) allows a person not previously convicted of any offence under Article 3 of Chapter 53, Title 44, or under any state or federal marijuana, stimulant, depressant or hallucinogenic drug statute, who pleads guilty to or is found guilty of possession of a controlled substance under § 44-53-370(c) or (d) or § 44-53-375(A), to be placed on probation without entry of a judgment of guilt, with the court discharging the person and dismissing the proceedings on fulfilment of the terms. The discharge is not a conviction for purposes of any disqualification or disability, a nonpublic record is retained by the Department of Narcotic and Dangerous Drugs under SLED solely to determine whether a later offence is a subsequent one, and the discharge and dismissal may occur only once with respect to any person. Subsection (B) is the expungement: on dismissal and discharge the person may apply to the court for an order expunging from all official records, other than the retained nonpublic record, all recordation relating to the arrest, indictment or information, trial, finding of guilt, and the dismissal and discharge, and if the court determines after hearing that the person was dismissed and discharged it shall enter the order, restoring the person in the contemplation of law to the status occupied before arrest. Subsection (C) requires payment before discharge of a fee of $350 in general sessions court or $150 in summary court, waivable, reducible or suspendable only for indigency. Section 17-22-940(D) requires the summary court judge to attest where the matter was in summary court, and § 17-22-940(E) exempts the route from SLED verification and its fee.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office. Where the matter was in summary court the summary court judge must attest by signature under § 17-22-940(D) before the solicitor and then a circuit court judge sign. No SLED verification is required and no SLED fee is charged.",
        "Venue: Statewide statute. The conditional discharge itself may be entered in general sessions or summary court; the expungement application runs through the Solicitor's Office in the circuit where the offence was committed.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; NO SLED verification fee, because § 17-22-940(E)(1) exempts this route; and the $35 clerk of court filing fee under § 17-22-940(F). The § 44-53-450(C) conditional-discharge fee of $350 in general sessions court or $150 in summary court is a separate and earlier cost, payable before discharge and dismissal. Fee waiver as recorded: The § 44-53-450(C) conditional-discharge fee may be waived, reduced or suspended only in cases of indigency. The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- SLED retention: the Department of Narcotic and Dangerous Drugs under SLED retains nonpublic information under section 44-53-450.",
        "- Conditional discharge itself carries a fee before discharge or dismissal of $350 in General Sessions and $150 in summary court, with indigency-based waiver, reduction or suspension possible.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- Any prior drug conviction, which defeats the route entirely.",
        "- The terms and conditions were not fulfilled, or an adjudication of guilt was entered.",
        "- The § 44-53-450(C) fee is unpaid.",
        "- The Summary Court Judge will not attest.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_conditional_discharge_44_53_450-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a first South Carolina drug possession case that ended in a conditional discharge)",
        "- sc_conditional_discharge_44_53_450-attestation-request-3: the written request to the office the record names as the attesting authority (Clear a first South Carolina drug possession case that ended in a conditional discharge)"
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
      "id": "sc_tep-primary-filing-1",
      "routeKey": "obligation:track-only:SC:sc_tep",
      "title": "Petition - Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a South Carolina traffic charge after you completed the Traffic Education Program)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO DESTROY ARREST RECORDS AFTER SUCCESSFUL TRAFFIC EDUCATION PROGRAM COMPLETION, S.C. CODE § 17-22-330(A)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 17-22-310; S.C. Code § 17-22-320; S.C. Code § 17-22-330(A); S.C. Code § 17-22-330(C); S.C. Code § 17-22-330(D); S.C. Code § 17-22-350; S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "The controlling citation is settled at source. Article 3 of Chapter 22, Title 17 is the Traffic Education Program Act: § 17-22-310 gives each circuit solicitor prosecutorial discretion to establish a programme for persons who commit traffic-related offences punishable only by a fine and loss of four points or less, and bars participation where the offence resulted in death or serious bodily injury; § 17-22-320 confines eligibility to a person with no significant history of traffic violations and allows participation only once; and § 17-22-330(A) provides that on successful completion the administering governmental agency shall effect a noncriminal disposition of the offence, with no record maintained except by the programme to prevent a second use. Subsections (C) and (D) allow termination and reinstatement for violating the conditions, and require termination where the person receives a subsequent traffic violation in the six months following the ticket. Section 17-22-940(D) names the traffic education program director as an attestor and § 17-22-940(E)(1) exempts § 17-22-330(A) from the SLED verification fee.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - tep completion date] On what date did you successfully complete the Traffic Education Program, and which circuit or agency administered it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - subsequent violation] Did you get another traffic ticket in the six months after the ticket that put you in the programme?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - injury or death] Did the incident cause anyone's death or a serious bodily injury?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 17-22-310; S.C. Code § 17-22-320; S.C. Code § 17-22-330(A); S.C. Code § 17-22-330(C); S.C. Code § 17-22-330(D); S.C. Code § 17-22-350; S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_tepCompletionDate",
          "label": "Item C11 - tep completion date",
          "supply": "On what date did you successfully complete the Traffic Education Program, and which circuit or agency administered it?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_subsequentViolation",
          "label": "Item C12 - subsequent violation",
          "supply": "Did you get another traffic ticket in the six months after the ticket that put you in the programme?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_injuryOrDeath",
          "label": "Item C13 - injury or death",
          "supply": "Did the incident cause anyone's death or a serious bodily injury?",
          "why": "the committed track registry records this as a required generation input for sc_tep, and the platform holds no value for it"
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
      "id": "sc_tep-attestation-request-3",
      "routeKey": "obligation:track-only:SC:sc_tep",
      "title": "Request for Attestation - Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "role": "attestation_request",
      "description": "the written request to the office the record names as the attesting authority (Clear a South Carolina traffic charge after you completed the Traffic Education Program)",
      "condition": null,
      "body": [
        "TO: Solicitor's Office in the judicial circuit where the offence was committed",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST FOR ATTESTATION",
        "",
        "I am asking the office named above for the attestation the record requires before this matter can go forward.",
        "",
        "The matter this request concerns:",
        "",
        "Court or office that handled the matter:",
        "{{DOTS}}",
        "",
        "Case or docket number:",
        "{{DOTS}}",
        "",
        "Date of the disposition:",
        "{{DOTS}}",
        "",
        "What I am asking for:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE {{DOTS:44}}",
        "",
        "(The person named above signs and dates this request personally.)"
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
          "id": "addressee_detail",
          "label": "The exact office and postal address of the recipient of this request",
          "supply": "the exact office and postal address you are sending this to, confirmed with that office",
          "why": "which office holds the participant's own matter is a fact of that matter"
        },
        {
          "kind": "rbf",
          "id": "req_court",
          "label": "Court or office that handled the matter",
          "supply": "the court or office that handled your matter, exactly as the record names it",
          "why": "no court identity is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_case_number",
          "label": "Case or docket number of the matter this request concerns",
          "supply": "the case or docket number, copied from the record",
          "why": "no case identifier is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_disposition_date",
          "label": "Date of the disposition of the matter this request concerns",
          "supply": "the date of the disposition, copied from the record",
          "why": "no disposition date is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_ask",
          "label": "What the person making this request is asking the office to do",
          "supply": "what you are asking that office to do, in your own words",
          "why": "the platform never writes a participant's own request for them"
        },
        {
          "kind": "protected",
          "id": "request_signature",
          "label": "Signature of the person named in the caption, on the request",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "request_signature_date",
          "label": "Date beside the signature on the request",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "sc_tep-filing-instructions-4",
      "routeKey": "obligation:track-only:SC:sc_tep",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a South Carolina traffic charge after you completed the Traffic Education Program)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Destroy Arrest Records After Successful Traffic Education Program Completion, S.C. Code § 17-22-330(A).",
        "",
        "The controlling citation is settled at source. Article 3 of Chapter 22, Title 17 is the Traffic Education Program Act: § 17-22-310 gives each circuit solicitor prosecutorial discretion to establish a programme for persons who commit traffic-related offences punishable only by a fine and loss of four points or less, and bars participation where the offence resulted in death or serious bodily injury; § 17-22-320 confines eligibility to a person with no significant history of traffic violations and allows participation only once; and § 17-22-330(A) provides that on successful completion the administering governmental agency shall effect a noncriminal disposition of the offence, with no record maintained except by the programme to prevent a second use. Subsections (C) and (D) allow termination and reinstatement for violating the conditions, and require termination where the person receives a subsequent traffic violation in the six months following the ticket. Section 17-22-940(D) names the traffic education program director as an attestor and § 17-22-940(E)(1) exempts § 17-22-330(A) from the SLED verification fee.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office. The traffic education program director must attest by signature under § 17-22-940(D) before the solicitor and then a circuit court judge sign. No SLED verification fee is charged.",
        "Venue: Statewide statute administered circuit by circuit under the direct supervision and control of the circuit solicitor, who may contract with a county or municipality. Apply to the Solicitor's Office in the judicial circuit where the offence was committed.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; NO SLED verification fee, because § 17-22-940(E)(1) exempts this route; and the $35 clerk of court filing fee under § 17-22-940(F). The § 17-22-350 programme application fee of $140, which cannot be reduced or suspended, and the participation fee of up to $140 are programme costs; participation may not be denied for inability to pay and both are waived where the person is deemed unable to pay. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- The participant was terminated from the programme or the offence was reinstated.",
        "- A subsequent traffic violation was received within six months of the ticket.",
        "- The incident caused death or serious bodily injury.",
        "- The Traffic Education Program Director will not attest.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_tep-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a South Carolina traffic charge after you completed the Traffic Education Program)",
        "- sc_tep-attestation-request-3: the written request to the office the record names as the attesting authority (Clear a South Carolina traffic charge after you completed the Traffic Education Program)"
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
      "id": "sc_17_1_40_general_sessions-primary-filing-1",
      "routeKey": "obligation:track-pathway:SC:sc_17_1_40_general_sessions:general-sessions-non-conviction-expungement",
      "title": "Petition - Clear a South Carolina General Sessions charge that did not end in a conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a South Carolina General Sessions charge that did not end in a conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO DESTROY ARREST RECORDS OF A GENERAL SESSIONS NON-CONVICTION, S.C. CODE § 17-1-40",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 17-1-40(A); S.C. Code § 17-1-40(B); S.C. Code § 17-1-40(C); S.C. Code § 17-22-910; S.C. Code § 17-22-930; S.C. Code § 17-22-940(A)(1); S.C. Code § 17-22-940(E); S.C. Code § 17-22-940(G); S.C. Code § 17-22-940(H) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read at source on 2026-08-06, § 17-1-40(B)(1) provides that where a person's record is expunged under Article 9 of Chapter 22 because the person was charged with a criminal offence, or issued a courtesy summons, and the charge was discharged, proceedings were dismissed, or the person was found not guilty, the arrest and booking record, associated bench warrants, mug shots and fingerprints must be destroyed and no evidence of the record may be retained by any municipal, county or state agency. Two provisos qualify that destruction and must be disclosed: law enforcement and prosecution agencies retain the arrest and booking record, bench warrants, mug shots and fingerprints under seal for three years and one hundred twenty days, and may retain them indefinitely under seal for ongoing or future investigation and prosecution of the offence, administrative hearings and litigation defence; and detention and correctional facilities retain booking records and institutional files under seal for the same period. The route runs through the Solicitor's Office. Section 17-22-940(A)(1) exempts a § 17-1-40 applicant from the $250 administrative fee unless the charge was dismissed, discharged or nolle prossed as part of the plea arrangement under which the defendant pled guilty and was sentenced to other charges; § 17-22-940(E)(1) exempts the route from the $25 SLED verification fee and § 17-22-940(E) from SLED verification itself; and § 17-22-940(H) bars the clerk from charging a filing fee where the charge was discharged, dismissed, nolle prossed or the applicant was acquitted. Section 17-22-940(G) permits multiple charges from a single incident on one application.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - plea arrangement] Were these charges dropped as part of a deal in which you pleaded guilty to something else and were sentenced on it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - courtesy summons] Were you issued a courtesy summons rather than arrested?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 17-1-40(A); S.C. Code § 17-1-40(B); S.C. Code § 17-1-40(C); S.C. Code § 17-22-910; S.C. Code § 17-22-930; S.C. Code § 17-22-940(A)(1); S.C. Code § 17-22-940(E); S.C. Code § 17-22-940(G); S.C. Code § 17-22-940(H).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pleaArrangement",
          "label": "Item C11 - plea arrangement",
          "supply": "Were these charges dropped as part of a deal in which you pleaded guilty to something else and were sentenced on it?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtesySummons",
          "label": "Item C12 - courtesy summons",
          "supply": "Were you issued a courtesy summons rather than arrested?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_40_general_sessions, and the platform holds no value for it"
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
      "id": "sc_17_1_40_general_sessions-filing-instructions-2",
      "routeKey": "obligation:track-pathway:SC:sc_17_1_40_general_sessions:general-sessions-non-conviction-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a South Carolina General Sessions charge that did not end in a conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a South Carolina General Sessions charge that did not end in a conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Destroy Arrest Records of a General Sessions Non-Conviction, S.C. Code § 17-1-40.",
        "",
        "Read at source on 2026-08-06, § 17-1-40(B)(1) provides that where a person's record is expunged under Article 9 of Chapter 22 because the person was charged with a criminal offence, or issued a courtesy summons, and the charge was discharged, proceedings were dismissed, or the person was found not guilty, the arrest and booking record, associated bench warrants, mug shots and fingerprints must be destroyed and no evidence of the record may be retained by any municipal, county or state agency. Two provisos qualify that destruction and must be disclosed: law enforcement and prosecution agencies retain the arrest and booking record, bench warrants, mug shots and fingerprints under seal for three years and one hundred twenty days, and may retain them indefinitely under seal for ongoing or future investigation and prosecution of the offence, administrative hearings and litigation defence; and detention and correctional facilities retain booking records and institutional files under seal for the same period. The route runs through the Solicitor's Office. Section 17-22-940(A)(1) exempts a § 17-1-40 applicant from the $250 administrative fee unless the charge was dismissed, discharged or nolle prossed as part of the plea arrangement under which the defendant pled guilty and was sentenced to other charges; § 17-22-940(E)(1) exempts the route from the $25 SLED verification fee and § 17-22-940(E) from SLED verification itself; and § 17-22-940(H) bars the clerk from charging a filing fee where the charge was discharged, dismissed, nolle prossed or the applicant was acquitted. Section 17-22-940(G) permits multiple charges from a single incident on one application.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office, which supplies the mandatory blank order form, assists in completing it, obtains the signatures, files the completed order with the clerk of court and distributes certified copies. No SLED verification is required on this route and no SLED fee is charged.",
        "Venue: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed; the order is signed by a circuit court judge and filed with the clerk of court.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: No $250 solicitor administrative fee, unless the charge was dismissed, discharged or nolle prossed as part of the plea arrangement under which the defendant pled guilty and was sentenced to other charges, in which case the $250 applies. No $25 SLED verification fee. No $35 clerk of court filing fee where the charge was discharged, dismissed, nolle prossed or the applicant was acquitted. Fee waiver as recorded: The § 17-22-940(A)(1) exemption is the operative relief on this route and is automatic rather than discretionary. The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- The clerk filing fee is waived for section 17-1-40 non-convictions. No filing fee is charged by the clerk's office where the charge was discharged, dismissed, nol prossed, or the applicant was acquitted.",
        "- An applicant seeking expungement of General Sessions charges under section 17-1-40 is exempt from the administrative fee, unless the charge was dismissed, discharged or nolle prossed as part of a plea arrangement under which the defendant pled guilty and was sentenced on other charges.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- The dismissal was, or may have been, part of a plea arrangement under which the participant pled guilty to other charges. This changes the fee and complicates the application.",
        "- Several charges were brought and only some were dismissed.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- Dismissals tied to plea arrangements.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_17_1_40_general_sessions-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a South Carolina General Sessions charge that did not end in a conviction)"
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
      "id": "sc_17_1_65_handgun-primary-filing-1",
      "routeKey": "obligation:track-pathway:SC:sc_17_1_65_handgun:eligible-conviction-expungement",
      "title": "Petition - Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO EXPUNGE AN OLD UNLAWFUL HANDGUN POSSESSION CONVICTION, S.C. CODE § 17-1-65",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 17-1-65; S.C. Code § 16-23-20; S.C. Code § 17-22-940(E); 2024 Act No. 111 (H.3594), § 20 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read at source on 2026-08-06, § 17-1-65 provides that a person may apply for an expungement of one conviction for unlawful possession of a handgun as provided in § 16-23-20, if the conviction occurred prior to the enactment of the South Carolina Constitutional Carry/Second Amendment Preservation Act of 2024, and that an application under the section must be made within five years of the enactment of the section. The section was created by 2024 Act No. 111 (H.3594), § 20, effective March 7, 2024, which fixes both dates: the conviction must predate March 7, 2024, and the application must be made before March 7, 2029. SCCA 223C (06/2024), read at source on the same date, is the instrument for this route and not a general-purpose General Sessions destruction order: it recites that the defendant is entitled to have the records expunged 'according to S.C. Code Ann. § 17-1-65' and carries three findings tracking the section exactly — conviction under § 16-23-20 prior to the enactment of the Act on March 7, 2024; application submitted prior to March 7, 2029; and no previous application for expungement of a handgun possession conviction under § 17-1-65. The form also recites the § 17-1-40 sealed retentions and the § 22-5-910 SLED nonpublic retention, so the surviving records are stated on the order itself. This is a closing window and the deadline should be surfaced unprompted.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - conviction date] On what date were you convicted of unlawful possession of a handgun?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - conviction statute] Does the sentencing paperwork show the conviction was under S.C. Code § 16-23-20?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - prior handgun application] Have you ever applied before for an expungement of a handgun possession conviction under § 17-1-65?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - other handgun convictions] Do you have more than one conviction for unlawful possession of a handgun?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 17-1-65; S.C. Code § 16-23-20; S.C. Code § 17-22-940(E); 2024 Act No. 111 (H.3594), § 20.",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionDate",
          "label": "Item C11 - conviction date",
          "supply": "On what date were you convicted of unlawful possession of a handgun?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionStatute",
          "label": "Item C12 - conviction statute",
          "supply": "Does the sentencing paperwork show the conviction was under S.C. Code § 16-23-20?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorHandgunApplication",
          "label": "Item C13 - prior handgun application",
          "supply": "Have you ever applied before for an expungement of a handgun possession conviction under § 17-1-65?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_otherHandgunConvictions",
          "label": "Item C14 - other handgun convictions",
          "supply": "Do you have more than one conviction for unlawful possession of a handgun?",
          "why": "the committed track registry records this as a required generation input for sc_17_1_65_handgun, and the platform holds no value for it"
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
      "id": "sc_17_1_65_handgun-filing-instructions-2",
      "routeKey": "obligation:track-pathway:SC:sc_17_1_65_handgun:eligible-conviction-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Expunge an Old Unlawful Handgun Possession Conviction, S.C. Code § 17-1-65.",
        "",
        "Read at source on 2026-08-06, § 17-1-65 provides that a person may apply for an expungement of one conviction for unlawful possession of a handgun as provided in § 16-23-20, if the conviction occurred prior to the enactment of the South Carolina Constitutional Carry/Second Amendment Preservation Act of 2024, and that an application under the section must be made within five years of the enactment of the section. The section was created by 2024 Act No. 111 (H.3594), § 20, effective March 7, 2024, which fixes both dates: the conviction must predate March 7, 2024, and the application must be made before March 7, 2029. SCCA 223C (06/2024), read at source on the same date, is the instrument for this route and not a general-purpose General Sessions destruction order: it recites that the defendant is entitled to have the records expunged 'according to S.C. Code Ann. § 17-1-65' and carries three findings tracking the section exactly — conviction under § 16-23-20 prior to the enactment of the Act on March 7, 2024; application submitted prior to March 7, 2029; and no previous application for expungement of a handgun possession conviction under § 17-1-65. The form also recites the § 17-1-40 sealed retentions and the § 22-5-910 SLED nonpublic retention, so the surviving records are stated on the order itself. This is a closing window and the deadline should be surfaced unprompted.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office, which supplies the mandatory blank SCCA 223C order form, obtains the signatures, files the completed order and distributes certified copies. SLED verifies statutory eligibility and the $25 verification fee applies, § 17-1-65 not being on the § 17-22-940(E)(1) exemption list.",
        "Venue: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed; SCCA 223C is an order of the Court of General Sessions.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- Diary the March 7, 2029 section 17-1-65 deadline.",
        "- This is a closing window. A participant who misses March 7, 2029 loses the route permanently, and it is exactly the kind of deadline a product should surface unprompted.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- The conviction date is on or after 7 March 2024, or cannot be established from the record.",
        "- The conviction may not have been under § 16-23-20.",
        "- The participant has more than one handgun possession conviction, since the section reaches one.",
        "- The participant has applied under § 17-1-65 before.",
        "- The 7 March 2029 deadline is close enough that a delay would forfeit the route; the participant should be told plainly and referred if the solicitor's office cannot process it in time.",
        "- Any firearm rights question, which this route does not answer.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_17_1_65_handgun-primary-filing-1: the composed petition, on this route's own statutory ground (Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029)"
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
      "id": "sc_22_5_910-primary-filing-1",
      "routeKey": "obligation:track-pathway:SC:sc_22_5_910:eligible-conviction-expungement",
      "title": "Petition - Clear a low-level South Carolina conviction after three years",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a low-level South Carolina conviction after three years)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO EXPUNGE A FIRST LOW-LEVEL CONVICTION OR A DOMESTIC VIOLENCE THIRD-DEGREE CONVICTION, S.C. CODE § 22-5-910",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 22-5-910(A); S.C. Code § 22-5-910(B); S.C. Code § 22-5-910(C); S.C. Code § 22-5-910(D); S.C. Code § 22-5-910(E); S.C. Code § 22-5-910(F); S.C. Code § 16-25-20(D); S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read at source on 2026-08-06, § 22-5-910(A) allows a defendant convicted of a crime carrying a penalty of not more than thirty days imprisonment or a one thousand dollar fine, or both, or a first offence for unlawful possession of a firearm or weapon carrying not more than one year or a one thousand dollar fine, or both, to apply after three years from the date of the conviction to the circuit court for an order expunging the records of the arrest and conviction and any associated bench warrant; the section does not apply to an offence involving the operation of a motor vehicle. Subsection (B) sets five years for a domestic violence third degree conviction under § 16-25-20(D), or § 16-25-20(B)(1) as it existed before June 4, 2015. Subsection (C) requires no other conviction, including out-of-state convictions, during the applicable period. Subsection (E) defines conviction to include a guilty plea, a plea of nolo contendere or the forfeiting of bail, and provides that any number of subsection (A) offences sentenced at a single sentencing proceeding that are closely connected and arose out of the same incident may be treated as one conviction for expungement purposes. Subsection (F) bars expungement where the person has pending criminal charges of any kind unless they have been pending more than five years, tolled for any time under a bench warrant for failure to appear, allows the relief once only, and applies retroactively. Section 17-22-940(D) requires the summary court judge to attest, and § 17-22-940(E) requires SLED verification with the $25 fee.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - conviction date] On what date were you convicted, counting a guilty plea, a no-contest plea, or forfeiting bail as a conviction?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - penalty ceiling] What was the maximum penalty for the offence you were convicted of — how many days of jail and what fine did the law allow?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - motor vehicle offense] Did the offence involve operating a motor vehicle?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - domestic violence third] Was the conviction for domestic violence in the third degree?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - firearm possession] Was the conviction a first offence of unlawful possession of a firearm or weapon?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - convictions since period] Have you had any other conviction anywhere, including in another state, since that conviction?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C17 - closely connected offenses] Were you sentenced for more than one offence at the same sentencing, and did they come out of the same incident?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C18 - bench warrant history] Have you ever been under a bench warrant for failing to appear, and for how long?",
        "(Asked only where the participant has a pending charge, because the five-year pending-charge tolerance under § 22-5-910(F) is tolled for any time under such a warrant.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 22-5-910(A); S.C. Code § 22-5-910(B); S.C. Code § 22-5-910(C); S.C. Code § 22-5-910(D); S.C. Code § 22-5-910(E); S.C. Code § 22-5-910(F); S.C. Code § 16-25-20(D); S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionDate",
          "label": "Item C11 - conviction date",
          "supply": "On what date were you convicted, counting a guilty plea, a no-contest plea, or forfeiting bail as a conviction?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_penaltyCeiling",
          "label": "Item C12 - penalty ceiling",
          "supply": "What was the maximum penalty for the offence you were convicted of — how many days of jail and what fine did the law allow?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_motorVehicleOffense",
          "label": "Item C13 - motor vehicle offense",
          "supply": "Did the offence involve operating a motor vehicle?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_domesticViolenceThird",
          "label": "Item C14 - domestic violence third",
          "supply": "Was the conviction for domestic violence in the third degree?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_firearmPossession",
          "label": "Item C15 - firearm possession",
          "supply": "Was the conviction a first offence of unlawful possession of a firearm or weapon?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionsSincePeriod",
          "label": "Item C16 - convictions since period",
          "supply": "Have you had any other conviction anywhere, including in another state, since that conviction?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_closelyConnectedOffenses",
          "label": "Item C17 - closely connected offenses",
          "supply": "Were you sentenced for more than one offence at the same sentencing, and did they come out of the same incident?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_benchWarrantHistory",
          "label": "Item C18 - bench warrant history",
          "supply": "Have you ever been under a bench warrant for failing to appear, and for how long? (Asked only where the participant has a pending charge, because the five-year pending-charge tolerance under § 22-5-910(F) is tolled for any time under such a warrant.)",
          "why": "the committed track registry records this as a required generation input for sc_22_5_910, and the platform holds no value for it"
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
      "id": "sc_22_5_910-attestation-request-3",
      "routeKey": "obligation:track-pathway:SC:sc_22_5_910:eligible-conviction-expungement",
      "title": "Request for Attestation - Clear a low-level South Carolina conviction after three years",
      "role": "attestation_request",
      "description": "the written request to the office the record names as the attesting authority (Clear a low-level South Carolina conviction after three years)",
      "condition": null,
      "body": [
        "TO: Solicitor's Office in the judicial circuit where the offence was committed",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST FOR ATTESTATION",
        "",
        "I am asking the office named above for the attestation the record requires before this matter can go forward.",
        "",
        "The matter this request concerns:",
        "",
        "Court or office that handled the matter:",
        "{{DOTS}}",
        "",
        "Case or docket number:",
        "{{DOTS}}",
        "",
        "Date of the disposition:",
        "{{DOTS}}",
        "",
        "What I am asking for:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE {{DOTS:44}}",
        "",
        "(The person named above signs and dates this request personally.)"
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
          "id": "addressee_detail",
          "label": "The exact office and postal address of the recipient of this request",
          "supply": "the exact office and postal address you are sending this to, confirmed with that office",
          "why": "which office holds the participant's own matter is a fact of that matter"
        },
        {
          "kind": "rbf",
          "id": "req_court",
          "label": "Court or office that handled the matter",
          "supply": "the court or office that handled your matter, exactly as the record names it",
          "why": "no court identity is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_case_number",
          "label": "Case or docket number of the matter this request concerns",
          "supply": "the case or docket number, copied from the record",
          "why": "no case identifier is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_disposition_date",
          "label": "Date of the disposition of the matter this request concerns",
          "supply": "the date of the disposition, copied from the record",
          "why": "no disposition date is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_ask",
          "label": "What the person making this request is asking the office to do",
          "supply": "what you are asking that office to do, in your own words",
          "why": "the platform never writes a participant's own request for them"
        },
        {
          "kind": "protected",
          "id": "request_signature",
          "label": "Signature of the person named in the caption, on the request",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "request_signature_date",
          "label": "Date beside the signature on the request",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "sc_22_5_910-filing-instructions-4",
      "routeKey": "obligation:track-pathway:SC:sc_22_5_910:eligible-conviction-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a low-level South Carolina conviction after three years",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a low-level South Carolina conviction after three years)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Expunge a First Low-Level Conviction or a Domestic Violence Third-Degree Conviction, S.C. Code § 22-5-910.",
        "",
        "Read at source on 2026-08-06, § 22-5-910(A) allows a defendant convicted of a crime carrying a penalty of not more than thirty days imprisonment or a one thousand dollar fine, or both, or a first offence for unlawful possession of a firearm or weapon carrying not more than one year or a one thousand dollar fine, or both, to apply after three years from the date of the conviction to the circuit court for an order expunging the records of the arrest and conviction and any associated bench warrant; the section does not apply to an offence involving the operation of a motor vehicle. Subsection (B) sets five years for a domestic violence third degree conviction under § 16-25-20(D), or § 16-25-20(B)(1) as it existed before June 4, 2015. Subsection (C) requires no other conviction, including out-of-state convictions, during the applicable period. Subsection (E) defines conviction to include a guilty plea, a plea of nolo contendere or the forfeiting of bail, and provides that any number of subsection (A) offences sentenced at a single sentencing proceeding that are closely connected and arose out of the same incident may be treated as one conviction for expungement purposes. Subsection (F) bars expungement where the person has pending criminal charges of any kind unless they have been pending more than five years, tolled for any time under a bench warrant for failure to appear, allows the relief once only, and applies retroactively. Section 17-22-940(D) requires the summary court judge to attest, and § 17-22-940(E) requires SLED verification with the $25 fee.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office. The summary court judge must attest by signature under § 17-22-940(D). SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies.",
        "Venue: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed; the order is issued by the circuit court.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- Note on the SLED fee: section 22-5-910 is not on the verification-fee exemption list, so the $25 applies.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- Any motor vehicle offence.",
        "- Any domestic violence matter.",
        "- The statutory penalty ceiling for the offence cannot be established from the record.",
        "- The participant does not think of themselves as convicted because they forfeited bail, which § 22-5-910(E) treats as a conviction.",
        "- The participant has already used § 22-5-910 once.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- Bail forfeiture counts as a conviction under section 22-5-910.",
        "- LegalEase must not generate any statutory penalty ceiling, offence classification or first-offence status not taken from the record.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_22_5_910-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a low-level South Carolina conviction after three years)",
        "- sc_22_5_910-attestation-request-3: the written request to the office the record names as the attesting authority (Clear a low-level South Carolina conviction after three years)"
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
      "id": "sc_22_5_920_yoa-primary-filing-1",
      "routeKey": "obligation:track-pathway:SC:sc_22_5_920_yoa:eligible-conviction-expungement",
      "title": "Petition - Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO EXPUNGE A FIRST-OFFENCE YOUTHFUL OFFENDER ACT CONVICTION, S.C. CODE § 22-5-920",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 22-5-920(A); S.C. Code § 22-5-920(B)(1); S.C. Code § 22-5-920(B)(2); S.C. Code § 22-5-920(B)(3); S.C. Code Title 24, Chapter 19; S.C. Code § 16-1-60; S.C. Code § 16-25-30; S.C. Code § 17-22-940(E) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read at source on 2026-08-06, § 22-5-920(B)(1) allows a defendant with a first offence conviction as a youthful offender, for which the defendant was sentenced pursuant to Chapter 19 of Title 24, the Youthful Offender Act, and who has not been convicted of any offence including an out-of-state offence while serving the youthful offender sentence including probation and parole and for a period of five years from the date of completion of that sentence, to apply to the circuit court for an order expunging the records of the arrest and conviction. Convictions for driving under suspension, and for disturbing schools under § 16-17-420 before May 17, 2018, are excepted from the disqualifying set. Subsection (B)(2) excludes an offence involving the operation of a motor vehicle, an offence classified as a violent crime in § 16-1-60, an offence contained in Chapter 25 of Title 16 except as otherwise provided in § 16-25-30, and an offence for which registration is required under the Sex Offender Registry Act. Subsection (B)(3) makes the relief once only and applies it retroactively. Subsection (A) defines conviction to include a guilty plea, a plea of nolo contendere or the forfeiting of bail, and allows any number of offences receiving a youthful offender sentence at a single sentencing proceeding that are closely connected and arose out of the same incident to be treated as one conviction for expungement purposes. Section 17-22-940(E) requires SLED verification with the $25 fee and provides that a minor traffic-related conviction unrelated to driving under the influence is not a bar.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - yoa sentenced] Does your sentencing paperwork say you were sentenced under the Youthful Offender Act — not just that you were young enough to qualify?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - sentence completion date] On what date did you finish the whole youthful offender sentence, including any probation and any parole?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - convictions since completion] Have you had any conviction anywhere, including in another state, while you were serving that sentence or in the five years since you finished it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - excluded category] Did the offence involve driving, violence, a domestic relationship, or anything that put you on the sex offender registry?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - closely connected offenses] Were you given youthful offender sentences for more than one offence at the same sentencing, and did they come out of the same incident?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 22-5-920(A); S.C. Code § 22-5-920(B)(1); S.C. Code § 22-5-920(B)(2); S.C. Code § 22-5-920(B)(3); S.C. Code Title 24, Chapter 19; S.C. Code § 16-1-60; S.C. Code § 16-25-30; S.C. Code § 17-22-940(E).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_yoaSentenced",
          "label": "Item C11 - yoa sentenced",
          "supply": "Does your sentencing paperwork say you were sentenced under the Youthful Offender Act — not just that you were young enough to qualify?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sentenceCompletionDate",
          "label": "Item C12 - sentence completion date",
          "supply": "On what date did you finish the whole youthful offender sentence, including any probation and any parole?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionsSinceCompletion",
          "label": "Item C13 - convictions since completion",
          "supply": "Have you had any conviction anywhere, including in another state, while you were serving that sentence or in the five years since you finished it?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_excludedCategory",
          "label": "Item C14 - excluded category",
          "supply": "Did the offence involve driving, violence, a domestic relationship, or anything that put you on the sex offender registry?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_closelyConnectedOffenses",
          "label": "Item C15 - closely connected offenses",
          "supply": "Were you given youthful offender sentences for more than one offence at the same sentencing, and did they come out of the same incident?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_920_yoa, and the platform holds no value for it"
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
      "id": "sc_22_5_920_yoa-filing-instructions-2",
      "routeKey": "obligation:track-pathway:SC:sc_22_5_920_yoa:eligible-conviction-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Expunge a First-Offence Youthful Offender Act Conviction, S.C. Code § 22-5-920.",
        "",
        "Read at source on 2026-08-06, § 22-5-920(B)(1) allows a defendant with a first offence conviction as a youthful offender, for which the defendant was sentenced pursuant to Chapter 19 of Title 24, the Youthful Offender Act, and who has not been convicted of any offence including an out-of-state offence while serving the youthful offender sentence including probation and parole and for a period of five years from the date of completion of that sentence, to apply to the circuit court for an order expunging the records of the arrest and conviction. Convictions for driving under suspension, and for disturbing schools under § 16-17-420 before May 17, 2018, are excepted from the disqualifying set. Subsection (B)(2) excludes an offence involving the operation of a motor vehicle, an offence classified as a violent crime in § 16-1-60, an offence contained in Chapter 25 of Title 16 except as otherwise provided in § 16-25-30, and an offence for which registration is required under the Sex Offender Registry Act. Subsection (B)(3) makes the relief once only and applies it retroactively. Subsection (A) defines conviction to include a guilty plea, a plea of nolo contendere or the forfeiting of bail, and allows any number of offences receiving a youthful offender sentence at a single sentencing proceeding that are closely connected and arose out of the same incident to be treated as one conviction for expungement purposes. Section 17-22-940(E) requires SLED verification with the $25 fee and provides that a minor traffic-related conviction unrelated to driving under the influence is not a bar.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office. SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies.",
        "Venue: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed; the order is issued by the circuit court.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- The sentencing paperwork does not clearly record a Youthful Offender Act sentence.",
        "- Any motor vehicle offence, any § 16-1-60 violent crime, any Chapter 25 domestic violence offence, or any registration offence.",
        "- Any conviction during the service of the sentence or the five years following it, other than driving under suspension or a pre-May-2018 disturbing schools conviction.",
        "- The participant has already used § 22-5-920 once.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- YOA requires actual YOA sentencing.",
        "- LegalEase must not generate the statement that a person eligible for YOA sentencing qualifies under section 22-5-920 without having been sentenced under it.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_22_5_920_yoa-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act)"
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
      "id": "sc_22_5_930_drug-primary-filing-1",
      "routeKey": "obligation:track-pathway:SC:sc_22_5_930_drug:eligible-conviction-expungement",
      "title": "Petition - Clear a first South Carolina drug conviction",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a first South Carolina drug conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO EXPUNGE A FIRST-OFFENCE DRUG CONVICTION, S.C. CODE § 22-5-930",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 22-5-930(A); S.C. Code § 22-5-930(B); S.C. Code § 22-5-930(C); S.C. Code § 22-5-930(D); S.C. Code § 22-5-930(E); S.C. Code § 44-53-370(c); S.C. Code § 40-43-86(EE); S.C. Code § 44-53-450; S.C. Code § 17-22-940(E) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read in full at source on 2026-08-06, § 22-5-930 has two branches. Subsection (A) reaches a first offence conviction for either simple possession of a controlled substance under Article 3 of Chapter 53, Title 44, or unlawful possession of a prescription drug under § 40-43-86(EE), including charges for which the person would now be eligible for a conditional discharge under § 44-53-450, and allows application to the circuit court three years from the date of completion of the sentence including probation and parole, whether the conviction was in magistrates or general sessions court. Subsection (B) reaches a first offence conviction for possession with intent to distribute a controlled substance under the same article and allows application twenty years from the date of completion of any sentence including probation and parole for a drug conviction or any felony conviction. Subsection (C) requires no other conviction, including out-of-state convictions, during the three-year period, or no other drug or felony conviction during the twenty-year period. Subsection (D) bars expungement while criminal charges of any kind are pending unless they have been pending more than five years, tolled for time under a bench warrant for failure to appear; allows the relief once only; and bars it where the person has had a conditional discharge within the five years before the arrest for a simple possession of marijuana charge, or within the ten years before the arrest for any other controlled substance or a prescription drug charge. The section applies retroactively but does not affect a pre-existing enhanced conviction or sentence. Subsection (E) requires SLED to keep a nonpublic record.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - drug offense type] Was the conviction for simple possession, for unlawful possession of a prescription drug, or for possession with intent to distribute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - substance type] What controlled substance was involved — was it marijuana or something else?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - sentence completion date] On what date did you finish the whole sentence for this conviction, including any probation and any parole?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - prior drug offense] Was this your first drug conviction of this kind?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - prior conditional discharge] Had you had a conditional discharge at any point before you were arrested on this charge, and if so when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - convictions since period] Have you had any other conviction anywhere since you finished the sentence?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C17 - prior felony for pwid] For a possession-with-intent conviction: have you completed a sentence for any other drug conviction or any felony conviction, and when?",
        "(Asked only on the § 22-5-930(B) branch, because the twenty-year clock runs from completion of any sentence for a drug or felony conviction.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 22-5-930(A); S.C. Code § 22-5-930(B); S.C. Code § 22-5-930(C); S.C. Code § 22-5-930(D); S.C. Code § 22-5-930(E); S.C. Code § 44-53-370(c); S.C. Code § 40-43-86(EE); S.C. Code § 44-53-450; S.C. Code § 17-22-940(E).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_drugOffenseType",
          "label": "Item C11 - drug offense type",
          "supply": "Was the conviction for simple possession, for unlawful possession of a prescription drug, or for possession with intent to distribute?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_substanceType",
          "label": "Item C12 - substance type",
          "supply": "What controlled substance was involved — was it marijuana or something else?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sentenceCompletionDate",
          "label": "Item C13 - sentence completion date",
          "supply": "On what date did you finish the whole sentence for this conviction, including any probation and any parole?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorDrugOffense",
          "label": "Item C14 - prior drug offense",
          "supply": "Was this your first drug conviction of this kind?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorConditionalDischarge",
          "label": "Item C15 - prior conditional discharge",
          "supply": "Had you had a conditional discharge at any point before you were arrested on this charge, and if so when?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionsSincePeriod",
          "label": "Item C16 - convictions since period",
          "supply": "Have you had any other conviction anywhere since you finished the sentence?",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorFelonyForPwid",
          "label": "Item C17 - prior felony for pwid",
          "supply": "For a possession-with-intent conviction: have you completed a sentence for any other drug conviction or any felony conviction, and when? (Asked only on the § 22-5-930(B) branch, because the twenty-year clock runs from completion of any sentence for a drug or felony conviction.)",
          "why": "the committed track registry records this as a required generation input for sc_22_5_930_drug, and the platform holds no value for it"
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
      "id": "sc_22_5_930_drug-filing-instructions-2",
      "routeKey": "obligation:track-pathway:SC:sc_22_5_930_drug:eligible-conviction-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a first South Carolina drug conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a first South Carolina drug conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Expunge a First-Offence Drug Conviction, S.C. Code § 22-5-930.",
        "",
        "Read in full at source on 2026-08-06, § 22-5-930 has two branches. Subsection (A) reaches a first offence conviction for either simple possession of a controlled substance under Article 3 of Chapter 53, Title 44, or unlawful possession of a prescription drug under § 40-43-86(EE), including charges for which the person would now be eligible for a conditional discharge under § 44-53-450, and allows application to the circuit court three years from the date of completion of the sentence including probation and parole, whether the conviction was in magistrates or general sessions court. Subsection (B) reaches a first offence conviction for possession with intent to distribute a controlled substance under the same article and allows application twenty years from the date of completion of any sentence including probation and parole for a drug conviction or any felony conviction. Subsection (C) requires no other conviction, including out-of-state convictions, during the three-year period, or no other drug or felony conviction during the twenty-year period. Subsection (D) bars expungement while criminal charges of any kind are pending unless they have been pending more than five years, tolled for time under a bench warrant for failure to appear; allows the relief once only; and bars it where the person has had a conditional discharge within the five years before the arrest for a simple possession of marijuana charge, or within the ten years before the arrest for any other controlled substance or a prescription drug charge. The section applies retroactively but does not affect a pre-existing enhanced conviction or sentence. Subsection (E) requires SLED to keep a nonpublic record.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office. SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies.",
        "Venue: Statewide statute administered circuit by circuit; the section reaches convictions in magistrates court and general sessions court alike. Apply to the Solicitor's Office in the judicial circuit where the offence was committed.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- The offence is not clearly within one of the two branches of § 22-5-930.",
        "- Any prior conditional discharge, because the five-year and ten-year lookback bars turn on it and are measured from the date of arrest.",
        "- A possession-with-intent conviction, which carries a twenty-year clock and belongs with counsel.",
        "- The participant has already used § 22-5-930 once.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- LegalEase must not generate the statement that all drug convictions route to section 22-5-930.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_22_5_930_drug-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a first South Carolina drug conviction)"
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
      "id": "sc_34_11_90e_check-primary-filing-1",
      "routeKey": "obligation:track-pathway:SC:sc_34_11_90e_check:eligible-conviction-expungement",
      "title": "Petition - Clear a first South Carolina bad-check conviction after one year",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a first South Carolina bad-check conviction after one year)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO EXPUNGE A FIRST-OFFENCE FRAUDULENT CHECK CONVICTION, S.C. CODE § 34-11-90(E)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 34-11-90(e); S.C. Code § 34-11-95; S.C. Code § 17-22-910; S.C. Code § 17-22-940(E) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read at source on 2026-08-06, § 34-11-90(e) provides that after a conviction under the chapter on a first offence the defendant may, after one year from the date of the conviction, apply or cause someone acting on his behalf to apply to the court for an order expunging the records of the arrest and conviction. The provision does not apply to any crime classified as a felony, and a conviction is classified as a felony where the instrument drawn or uttered exceeds five thousand dollars. If the defendant has had no other conviction during the one-year period following the conviction, the court shall issue the order. No person has any rights under the section more than one time. After expungement SLED keeps a nonpublic record of the offence and the date of expungement to prevent a second use, which is not releasable under § 34-11-95 or the Freedom of Information Act except to authorised officials. 'Conviction' includes a guilty plea, a plea of nolo contendere, or the forfeiting of bail, and each instrument drawn or uttered constitutes a separate offence. Section 17-22-940(E) requires SLED verification on this route and provides that a conviction for any minor traffic-related offence unrelated to driving under the influence is not a bar.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - conviction date] On what date were you convicted, including a guilty plea, a no-contest plea or a bail forfeiture?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - instrument amount] What was the amount of the cheque?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - convictions since year] Have you had any other conviction of any kind in the year since that conviction?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - number of checks] How many cheques were involved, and were they charged as separate offences?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 34-11-90(e); S.C. Code § 34-11-95; S.C. Code § 17-22-910; S.C. Code § 17-22-940(E).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionDate",
          "label": "Item C11 - conviction date",
          "supply": "On what date were you convicted, including a guilty plea, a no-contest plea or a bail forfeiture?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_instrumentAmount",
          "label": "Item C12 - instrument amount",
          "supply": "What was the amount of the cheque?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionsSinceYear",
          "label": "Item C13 - convictions since year",
          "supply": "Have you had any other conviction of any kind in the year since that conviction?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_numberOfChecks",
          "label": "Item C14 - number of checks",
          "supply": "How many cheques were involved, and were they charged as separate offences?",
          "why": "the committed track registry records this as a required generation input for sc_34_11_90e_check, and the platform holds no value for it"
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
      "id": "sc_34_11_90e_check-filing-instructions-2",
      "routeKey": "obligation:track-pathway:SC:sc_34_11_90e_check:eligible-conviction-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a first South Carolina bad-check conviction after one year",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a first South Carolina bad-check conviction after one year)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Expunge a First-Offence Fraudulent Check Conviction, S.C. Code § 34-11-90(e).",
        "",
        "Read at source on 2026-08-06, § 34-11-90(e) provides that after a conviction under the chapter on a first offence the defendant may, after one year from the date of the conviction, apply or cause someone acting on his behalf to apply to the court for an order expunging the records of the arrest and conviction. The provision does not apply to any crime classified as a felony, and a conviction is classified as a felony where the instrument drawn or uttered exceeds five thousand dollars. If the defendant has had no other conviction during the one-year period following the conviction, the court shall issue the order. No person has any rights under the section more than one time. After expungement SLED keeps a nonpublic record of the offence and the date of expungement to prevent a second use, which is not releasable under § 34-11-95 or the Freedom of Information Act except to authorised officials. 'Conviction' includes a guilty plea, a plea of nolo contendere, or the forfeiting of bail, and each instrument drawn or uttered constitutes a separate offence. Section 17-22-940(E) requires SLED verification on this route and provides that a conviction for any minor traffic-related offence unrelated to driving under the influence is not a bar.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office. SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies on this route.",
        "Venue: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- SLED retention: SLED retains nonpublic information under section 34-11-90(e).",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- The cheque exceeded five thousand dollars, which makes the conviction a felony and closes the route.",
        "- Any conviction of any kind during the year following the conviction.",
        "- The participant has already used § 34-11-90(e) once.",
        "- More than one cheque was involved, since each instrument is a separate offence and each needs its own order and its own fees.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_34_11_90e_check-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a first South Carolina bad-check conviction after one year)"
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
      "id": "sc_56_5_750f-primary-filing-1",
      "routeKey": "obligation:track-pathway:SC:sc_56_5_750f:eligible-conviction-expungement",
      "title": "Petition - Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Solicitor's Office in the judicial circuit where the offence was committed - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "SOLICITOR APPLICATION TO EXPUNGE A FIRST-OFFENCE FAILURE TO STOP FOR A BLUE LIGHT CONVICTION, S.C. CODE § 56-5-750(F)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under S.C. Code § 56-5-750(B)(1); S.C. Code § 56-5-750(F); S.C. Code § 17-22-940(E) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Read at source on 2026-08-06, § 56-5-750(F) provides that after a conviction pursuant to subsection (B)(1) for a first offence, the person may, after three years from the date of completion of all terms and conditions of the sentence for the first offence, apply or cause someone acting on his behalf to apply to the court for an order expunging the records of the arrest and conviction. The provision does not apply to any crime classified as a felony. If the person has had no other conviction during the three-year period following completion of the terms and conditions, the court shall issue the order. No person has any rights under the section more than one time. After expungement both SLED and the Department of Motor Vehicles keep a nonpublic record of the offence and the date of expungement to prevent a second use, exempt from the Freedom of Information Act except to authorised officials. The review's caution about the amendment effective 12 May 2026 is answered: 2025 Act No. 38 (H.3127), section 1, effective May 12, 2026, reenacted subsection (A) unchanged, altered the subsection (B)(1) and (B)(2) penalties, added subsection (B)(3), and raised the subsection (C)(1) and (C)(2) penalties; it did not amend subsection (F), whose three-year first-offence expungement is unchanged. Section 17-22-940(E) requires SLED verification with the $25 fee and provides that a minor traffic-related conviction unrelated to driving under the influence is not a bar.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - applicant name] What is your full legal name, and every other name you have been known by?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - charge identity] What was the charge, and what is the warrant, ticket or indictment number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - offense county] In which South Carolina county was the offence committed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court level] Was the case handled in magistrate court, municipal court or General Sessions court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - arrest date] On what date were you arrested or served, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition detail] How did the case end, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - single incident charges] Did more than one charge come out of this same incident? If so, list them all.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - prior expungement use] Have you ever had a South Carolina record expunged before, under any statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - pending charges] Do you have any criminal charges pending anywhere right now, and if so since when?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - offense date] On what date did the offence happen?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - subsection charged] Which part of the failure-to-stop statute were you convicted under, and was it charged as a misdemeanour or a felony?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - injury or death] Did the incident cause anyone great bodily injury or death?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - terms completion date] On what date did you finish every term and condition of the sentence — fines, restitution, community service, probation, everything?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C15 - convictions since period] Have you had any other conviction anywhere in the three years since you finished those terms?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C16 - first offense status] Was this your first conviction under this statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under S.C. Code § 56-5-750(B)(1); S.C. Code § 56-5-750(F); S.C. Code § 17-22-940(E).",
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
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name",
          "supply": "What is your full legal name, and every other name you have been known by?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth",
          "supply": "What is your date of birth?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_chargeIdentity",
          "label": "Item C3 - charge identity",
          "supply": "What was the charge, and what is the warrant, ticket or indictment number?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCounty",
          "label": "Item C4 - offense county",
          "supply": "In which South Carolina county was the offence committed?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtLevel",
          "label": "Item C5 - court level",
          "supply": "Was the case handled in magistrate court, municipal court or General Sessions court?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C6 - arrest date",
          "supply": "On what date were you arrested or served, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDetail",
          "label": "Item C7 - disposition detail",
          "supply": "How did the case end, and on what date?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_singleIncidentCharges",
          "label": "Item C8 - single incident charges",
          "supply": "Did more than one charge come out of this same incident? If so, list them all.",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorExpungementUse",
          "label": "Item C9 - prior expungement use",
          "supply": "Have you ever had a South Carolina record expunged before, under any statute?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_pendingCharges",
          "label": "Item C10 - pending charges",
          "supply": "Do you have any criminal charges pending anywhere right now, and if so since when?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseDate",
          "label": "Item C11 - offense date",
          "supply": "On what date did the offence happen?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_subsectionCharged",
          "label": "Item C12 - subsection charged",
          "supply": "Which part of the failure-to-stop statute were you convicted under, and was it charged as a misdemeanour or a felony?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_injuryOrDeath",
          "label": "Item C13 - injury or death",
          "supply": "Did the incident cause anyone great bodily injury or death?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_termsCompletionDate",
          "label": "Item C14 - terms completion date",
          "supply": "On what date did you finish every term and condition of the sentence — fines, restitution, community service, probation, everything?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictionsSincePeriod",
          "label": "Item C15 - convictions since period",
          "supply": "Have you had any other conviction anywhere in the three years since you finished those terms?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_firstOffenseStatus",
          "label": "Item C16 - first offense status",
          "supply": "Was this your first conviction under this statute?",
          "why": "the committed track registry records this as a required generation input for sc_56_5_750f, and the platform holds no value for it"
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
      "id": "sc_56_5_750f-filing-instructions-2",
      "routeKey": "obligation:track-pathway:SC:sc_56_5_750f:eligible-conviction-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Solicitor Application to Expunge a First-Offence Failure to Stop for a Blue Light Conviction, S.C. Code § 56-5-750(F).",
        "",
        "Read at source on 2026-08-06, § 56-5-750(F) provides that after a conviction pursuant to subsection (B)(1) for a first offence, the person may, after three years from the date of completion of all terms and conditions of the sentence for the first offence, apply or cause someone acting on his behalf to apply to the court for an order expunging the records of the arrest and conviction. The provision does not apply to any crime classified as a felony. If the person has had no other conviction during the three-year period following completion of the terms and conditions, the court shall issue the order. No person has any rights under the section more than one time. After expungement both SLED and the Department of Motor Vehicles keep a nonpublic record of the offence and the date of expungement to prevent a second use, exempt from the Freedom of Information Act except to authorised officials. The review's caution about the amendment effective 12 May 2026 is answered: 2025 Act No. 38 (H.3127), section 1, effective May 12, 2026, reenacted subsection (A) unchanged, altered the subsection (B)(1) and (B)(2) penalties, added subsection (B)(3), and raised the subsection (C)(1) and (C)(2) penalties; it did not amend subsection (F), whose three-year first-offence expungement is unchanged. Section 17-22-940(E) requires SLED verification with the $25 fee and provides that a minor traffic-related conviction unrelated to driving under the influence is not a bar.",
        "",
        "WHERE IT GOES",
        "",
        "Solicitor's Office in the judicial circuit where the offence was committed",
        "The applicant applies to the solicitor's office. SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies. Both SLED and the Department of Motor Vehicles retain a nonpublic record after the order.",
        "Venue: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2).",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Fees require separate certified checks or money orders; no personal checks.",
        "- SLED criminal history first.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
        "- The solicitor or his designee declines to consent to the expungement.",
        "- Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
        "- Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
        "- Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
        "- Trafficking facts, juvenile matters, or any immigration question.",
        "- Federal, out-of-state, military or tribal records.",
        "- The conviction may be a felony or may be under a subsection other than (B)(1).",
        "- The incident involved injury, death or a high-speed pursuit.",
        "- The completion date of every term and condition cannot be established from the record.",
        "- The participant has already used § 56-5-750(F) once.",
        "- LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
        "- Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- sc_56_5_750f-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    }
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
      "routeKey": "obligation:track-only:SC:sc_aep",
      "statute": "S.C. Code § 17-22-510; S.C. Code § 17-22-520; S.C. Code § 17-22-530(A); S.C. Code § 17-22-530(B); S.C. Code § 17-22-550; S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E)",
      "instrument": "primary_filing: sc_aep-primary-filing-1; official_form_reference: sc_aep-official-form-reference-2; attestation_request: sc_aep-attestation-request-3; records_checklist: sc_aep-records-checklist-4; fee_instrument_schedule: sc_aep-fee-instrument-schedule-5; filing_instructions: sc_aep-filing-instructions-6",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:SC:sc_conditional_discharge_44_53_450",
      "statute": "S.C. Code § 44-53-450(A); S.C. Code § 44-53-450(B); S.C. Code § 44-53-450(C); S.C. Code § 44-53-370(c); S.C. Code § 44-53-370(d); S.C. Code § 44-53-375(A); S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E)",
      "instrument": "primary_filing: sc_conditional_discharge_44_53_450-primary-filing-1; official_form_reference: sc_conditional_discharge_44_53_450-official-form-reference-2; attestation_request: sc_conditional_discharge_44_53_450-attestation-request-3; records_checklist: sc_conditional_discharge_44_53_450-records-checklist-4; fee_instrument_schedule: sc_conditional_discharge_44_53_450-fee-instrument-schedule-5; filing_instructions: sc_conditional_discharge_44_53_450-filing-instructions-6",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:SC:sc_tep",
      "statute": "S.C. Code § 17-22-310; S.C. Code § 17-22-320; S.C. Code § 17-22-330(A); S.C. Code § 17-22-330(C); S.C. Code § 17-22-330(D); S.C. Code § 17-22-350; S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E)",
      "instrument": "primary_filing: sc_tep-primary-filing-1; official_form_reference: sc_tep-official-form-reference-2; attestation_request: sc_tep-attestation-request-3; records_checklist: sc_tep-records-checklist-4; fee_instrument_schedule: sc_tep-fee-instrument-schedule-5; filing_instructions: sc_tep-filing-instructions-6",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_17_1_40_general_sessions:general-sessions-non-conviction-expungement",
      "statute": "S.C. Code § 17-1-40(A); S.C. Code § 17-1-40(B); S.C. Code § 17-1-40(C); S.C. Code § 17-22-910; S.C. Code § 17-22-930; S.C. Code § 17-22-940(A)(1); S.C. Code § 17-22-940(E); S.C. Code § 17-22-940(G); S.C. Code § 17-22-940(H)",
      "instrument": "South Carolina § 17-1-40 Nonconviction Expungement Application",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_17_1_65_handgun:eligible-conviction-expungement",
      "statute": "S.C. Code § 17-1-65; S.C. Code § 16-23-20; S.C. Code § 17-22-940(E); 2024 Act No. 111 (H.3594), § 20",
      "instrument": "primary_filing: sc_17_1_65_handgun-primary-filing-1; official_form_reference: sc_17_1_65_handgun-official-form-reference-2; records_checklist: sc_17_1_65_handgun-records-checklist-3; fee_instrument_schedule: sc_17_1_65_handgun-fee-instrument-schedule-4; filing_instructions: sc_17_1_65_handgun-filing-instructions-5",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_22_5_910:eligible-conviction-expungement",
      "statute": "S.C. Code § 22-5-910(A); S.C. Code § 22-5-910(B); S.C. Code § 22-5-910(C); S.C. Code § 22-5-910(D); S.C. Code § 22-5-910(E); S.C. Code § 22-5-910(F); S.C. Code § 16-25-20(D); S.C. Code § 17-22-940(D); S.C. Code § 17-22-940(E)",
      "instrument": "primary_filing: sc_22_5_910-primary-filing-1; official_form_reference: sc_22_5_910-official-form-reference-2; attestation_request: sc_22_5_910-attestation-request-3; records_checklist: sc_22_5_910-records-checklist-4; fee_instrument_schedule: sc_22_5_910-fee-instrument-schedule-5; filing_instructions: sc_22_5_910-filing-instructions-6",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_22_5_920_yoa:eligible-conviction-expungement",
      "statute": "S.C. Code § 22-5-920(A); S.C. Code § 22-5-920(B)(1); S.C. Code § 22-5-920(B)(2); S.C. Code § 22-5-920(B)(3); S.C. Code Title 24, Chapter 19; S.C. Code § 16-1-60; S.C. Code § 16-25-30; S.C. Code § 17-22-940(E)",
      "instrument": "primary_filing: sc_22_5_920_yoa-primary-filing-1; official_form_reference: sc_22_5_920_yoa-official-form-reference-2; records_checklist: sc_22_5_920_yoa-records-checklist-3; fee_instrument_schedule: sc_22_5_920_yoa-fee-instrument-schedule-4; filing_instructions: sc_22_5_920_yoa-filing-instructions-5",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_22_5_930_drug:eligible-conviction-expungement",
      "statute": "S.C. Code § 22-5-930(A); S.C. Code § 22-5-930(B); S.C. Code § 22-5-930(C); S.C. Code § 22-5-930(D); S.C. Code § 22-5-930(E); S.C. Code § 44-53-370(c); S.C. Code § 40-43-86(EE); S.C. Code § 44-53-450; S.C. Code § 17-22-940(E)",
      "instrument": "primary_filing: sc_22_5_930_drug-primary-filing-1; official_form_reference: sc_22_5_930_drug-official-form-reference-2; records_checklist: sc_22_5_930_drug-records-checklist-3; fee_instrument_schedule: sc_22_5_930_drug-fee-instrument-schedule-4; filing_instructions: sc_22_5_930_drug-filing-instructions-5",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_34_11_90e_check:eligible-conviction-expungement",
      "statute": "S.C. Code § 34-11-90(e); S.C. Code § 34-11-95; S.C. Code § 17-22-910; S.C. Code § 17-22-940(E)",
      "instrument": "primary_filing: sc_34_11_90e_check-primary-filing-1; official_form_reference: sc_34_11_90e_check-official-form-reference-2; records_checklist: sc_34_11_90e_check-records-checklist-3; fee_instrument_schedule: sc_34_11_90e_check-fee-instrument-schedule-4; filing_instructions: sc_34_11_90e_check-filing-instructions-5",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:SC:sc_56_5_750f:eligible-conviction-expungement",
      "statute": "S.C. Code § 56-5-750(B)(1); S.C. Code § 56-5-750(F); S.C. Code § 17-22-940(E)",
      "instrument": "primary_filing: sc_56_5_750f-primary-filing-1; official_form_reference: sc_56_5_750f-official-form-reference-2; records_checklist: sc_56_5_750f-records-checklist-3; fee_instrument_schedule: sc_56_5_750f-fee-instrument-schedule-4; filing_instructions: sc_56_5_750f-filing-instructions-5",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION — Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office. The alcohol education program director must attest by signature under § 17-22-940(D) before the solicitor and then a circuit court judge sign. No SLED verification fee is charged. Venue as recorded: Statewide statute administered circuit by circuit, each programme being under the direct supervision and control of the circuit solicitor. Apply to the Solicitor's Office in the judicial circuit where the offence was committed. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; NO SLED verification fee, because § 17-22-940(E)(1) exempts this route; and the $35 clerk of court filing fee under § 17-22-940(F). The § 17-22-550 programme enrolment fee of $250, and any provider fees, are programme costs; participation may not be denied for inability to pay and those fees may be waived or reduced at the solicitor's discretion. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** The participant was terminated from the programme or the offence was reinstated. **Stop and get help if:** The offence may be a DUI-type offence under § 56-5-2930 or § 56-5-2933, which the programme excludes. **Stop and get help if:** The Alcohol Education Program Director will not attest. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office. Where the matter was in summary court the summary court judge must attest by signature under § 17-22-940(D) before the solicitor and then a circuit court judge sign. No SLED verification is required and no SLED fee is charged. Venue as recorded: Statewide statute. The conditional discharge itself may be entered in general sessions or summary court; the expungement application runs through the Solicitor's Office in the circuit where the offence was committed. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; NO SLED verification fee, because § 17-22-940(E)(1) exempts this route; and the $35 clerk of court filing fee under § 17-22-940(F). The § 44-53-450(C) conditional-discharge fee of $350 in general sessions court or $150 in summary court is a separate and earlier cost, payable before discharge and dismissal. Fee waiver as recorded: The § 44-53-450(C) conditional-discharge fee may be waived, reduced or suspended only in cases of indigency. The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** Any prior drug conviction, which defeats the route entirely. **Stop and get help if:** The terms and conditions were not fulfilled, or an adjudication of guilt was entered. **Stop and get help if:** The § 44-53-450(C) fee is unpaid. **Stop and get help if:** The Summary Court Judge will not attest. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office. The traffic education program director must attest by signature under § 17-22-940(D) before the solicitor and then a circuit court judge sign. No SLED verification fee is charged. Venue as recorded: Statewide statute administered circuit by circuit under the direct supervision and control of the circuit solicitor, who may contract with a county or municipality. Apply to the Solicitor's Office in the judicial circuit where the offence was committed. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; NO SLED verification fee, because § 17-22-940(E)(1) exempts this route; and the $35 clerk of court filing fee under § 17-22-940(F). The § 17-22-350 programme application fee of $140, which cannot be reduced or suspended, and the participation fee of up to $140 are programme costs; participation may not be denied for inability to pay and both are waived where the person is deemed unable to pay. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** The participant was terminated from the programme or the offence was reinstated. **Stop and get help if:** A subsequent traffic violation was received within six months of the ticket. **Stop and get help if:** The incident caused death or serious bodily injury. **Stop and get help if:** The Traffic Education Program Director will not attest. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear a South Carolina General Sessions charge that did not end in a conviction",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office, which supplies the mandatory blank order form, assists in completing it, obtains the signatures, files the completed order with the clerk of court and distributes certified copies. No SLED verification is required on this route and no SLED fee is charged. Venue as recorded: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed; the order is signed by a circuit court judge and filed with the clerk of court. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a South Carolina General Sessions charge that did not end in a conviction",
      "Fee as recorded: No $250 solicitor administrative fee, unless the charge was dismissed, discharged or nolle prossed as part of the plea arrangement under which the defendant pled guilty and was sentenced to other charges, in which case the $250 applies. No $25 SLED verification fee. No $35 clerk of court filing fee where the charge was discharged, dismissed, nolle prossed or the applicant was acquitted. Fee waiver as recorded: The § 17-22-940(A)(1) exemption is the operative relief on this route and is automatic rather than discretionary. The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a South Carolina General Sessions charge that did not end in a conviction",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a South Carolina General Sessions charge that did not end in a conviction",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** The dismissal was, or may have been, part of a plea arrangement under which the participant pled guilty to other charges. This changes the fee and complicates the application. **Stop and get help if:** Several charges were brought and only some were dismissed. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** Dismissals tied to plea arrangements. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office, which supplies the mandatory blank SCCA 223C order form, obtains the signatures, files the completed order and distributes certified copies. SLED verifies statutory eligibility and the $25 verification fee applies, § 17-1-65 not being on the § 17-22-940(E)(1) exemption list. Venue as recorded: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed; SCCA 223C is an order of the Court of General Sessions. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** The conviction date is on or after 7 March 2024, or cannot be established from the record. **Stop and get help if:** The conviction may not have been under § 16-23-20. **Stop and get help if:** The participant has more than one handgun possession conviction, since the section reaches one. **Stop and get help if:** The participant has applied under § 17-1-65 before. **Stop and get help if:** The 7 March 2029 deadline is close enough that a delay would forfeit the route; the participant should be told plainly and referred if the solicitor's office cannot process it in time. **Stop and get help if:** Any firearm rights question, which this route does not answer. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear a low-level South Carolina conviction after three years",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office. The summary court judge must attest by signature under § 17-22-940(D). SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies. Venue as recorded: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed; the order is issued by the circuit court. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a low-level South Carolina conviction after three years",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a low-level South Carolina conviction after three years",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a low-level South Carolina conviction after three years",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** Any motor vehicle offence. **Stop and get help if:** Any domestic violence matter. **Stop and get help if:** The statutory penalty ceiling for the offence cannot be established from the record. **Stop and get help if:** The participant does not think of themselves as convicted because they forfeited bail, which § 22-5-910(E) treats as a conviction. **Stop and get help if:** The participant has already used § 22-5-910 once. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** Bail forfeiture counts as a conviction under section 22-5-910. **Stop and get help if:** LegalEase must not generate any statutory penalty ceiling, offence classification or first-offence status not taken from the record. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office. SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies. Venue as recorded: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed; the order is issued by the circuit court. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** The sentencing paperwork does not clearly record a Youthful Offender Act sentence. **Stop and get help if:** Any motor vehicle offence, any § 16-1-60 violent crime, any Chapter 25 domestic violence offence, or any registration offence. **Stop and get help if:** Any conviction during the service of the sentence or the five years following it, other than driving under suspension or a pre-May-2018 disturbing schools conviction. **Stop and get help if:** The participant has already used § 22-5-920 once. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** YOA requires actual YOA sentencing. **Stop and get help if:** LegalEase must not generate the statement that a person eligible for YOA sentencing qualifies under section 22-5-920 without having been sentenced under it. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear a first South Carolina drug conviction",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office. SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies. Venue as recorded: Statewide statute administered circuit by circuit; the section reaches convictions in magistrates court and general sessions court alike. Apply to the Solicitor's Office in the judicial circuit where the offence was committed. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a first South Carolina drug conviction",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a first South Carolina drug conviction",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a first South Carolina drug conviction",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** The offence is not clearly within one of the two branches of § 22-5-930. **Stop and get help if:** Any prior conditional discharge, because the five-year and ten-year lookback bars turn on it and are measured from the date of arrest. **Stop and get help if:** A possession-with-intent conviction, which carries a twenty-year clock and belongs with counsel. **Stop and get help if:** The participant has already used § 22-5-930 once. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** LegalEase must not generate the statement that all drug convictions route to section 22-5-930. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear a first South Carolina bad-check conviction after one year",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office. SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies on this route. Venue as recorded: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a first South Carolina bad-check conviction after one year",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a first South Carolina bad-check conviction after one year",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a first South Carolina bad-check conviction after one year",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** The cheque exceeded five thousand dollars, which makes the conviction a felony and closes the route. **Stop and get help if:** Any conviction of any kind during the year following the conviction. **Stop and get help if:** The participant has already used § 34-11-90(e) once. **Stop and get help if:** More than one cheque was involved, since each instrument is a separate offence and each needs its own order and its own fees. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
    ],
    [
      "FILING_DESTINATION — Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
      "The committed track registry records the destination as **Solicitor's Office in the judicial circuit where the offence was committed**. The applicant applies to the solicitor's office. SLED verifies and documents statutory eligibility before the solicitor or his designee and then a circuit court judge sign, and the $25 SLED verification fee applies. Both SLED and the Department of Motor Vehicles retain a nonpublic record after the order. Venue as recorded: Statewide statute administered circuit by circuit. Apply to the Solicitor's Office in the judicial circuit where the offence was committed. Filing as recorded: Apply to the Solicitor's Office in the judicial circuit where the offence was committed, obtain the mandatory blank expungement order form from that office under § 17-22-930, and submit the completed application package with the required fee instruments. The solicitor files the completed order with the clerk of court and distributes certified copies; the applicant does not file it."
    ],
    [
      "FEE_AND_WAIVER — Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
      "Fee as recorded: $250 solicitor administrative fee per individual order under § 17-22-940(A), nonrefundable even if the charge is later found ineligible; $25 SLED verification fee under § 17-22-940(E)(1); and the $35 clerk of court filing fee under § 17-22-940(F) and § 8-21-310(C)(4), which the solicitor forwards and which is refunded if the charge is found statutorily ineligible. Under § 17-22-940(E), on this route a conviction for any minor traffic-related offence that is not related in any way to driving under the influence of alcohol or other drugs is not considered a bar to expungement. Fee waiver as recorded: The solicitor may waive the $250 fee only where a person has been falsely accused as a result of identity theft, § 17-22-940(J). Each solicitor's office also maintains a private donation account which may defray up to fifty per cent of the administrative fee on a first-come first-served basis, § 17-22-940(A)(2)."
    ],
    [
      "SERVICE — Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
      "Service as recorded: None by the participant. Distribution of the signed order to the arresting agency, detention facility, solicitor's office, the magistrate or municipal courts involved and SLED is performed by the solicitor's office under § 17-22-940(B)(7). Notice as recorded: No participant-facing notice or opposition window applies on the solicitor route. Eligibility is verified by SLED where required and the solicitor or his designee may decline to consent, in which case § 17-22-940(I) leaves the applicant to retained counsel and a circuit court determination."
    ],
    [
      "SELF_HELP_STOP — Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
      "**Stop and get help if:** SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that. **Stop and get help if:** The solicitor or his designee declines to consent to the expungement. **Stop and get help if:** Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence. **Stop and get help if:** Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied. **Stop and get help if:** Any drug conviction beyond a clean § 44-53-450(b) conditional discharge. **Stop and get help if:** Trafficking facts, juvenile matters, or any immigration question. **Stop and get help if:** Federal, out-of-state, military or tribal records. **Stop and get help if:** The conviction may be a felony or may be under a subsection other than (B)(1). **Stop and get help if:** The incident involved injury, death or a high-speed pursuit. **Stop and get help if:** The completion date of every term and condition cannot be established from the record. **Stop and get help if:** The participant has already used § 56-5-750(F) once. **Stop and get help if:** LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature. **Stop and get help if:** Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates."
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
        "Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
        "The controlling citation is settled at source."
      ],
      [
        "Clear a first South Carolina drug possession case that ended in a conditional discharge",
        "Read at source on 2026-08-06, § 44-53-450(A) allows a person not previously convicted of any offence under Article 3 of Chapter 53, Title 44, or under any state or federal marijuana, stimulant, depressant or hallucinogenic drug statute, who pleads guilty to or is found guilty of possession of a controlled substance under § 44-53-370(c) or (d) or § 44-53-375(A), to be placed on probation without entry of a judgment of guilt, with the court discharging the person and dismissing the proceedings on fulfilment of the terms."
      ],
      [
        "Clear a South Carolina traffic charge after you completed the Traffic Education Program",
        "The controlling citation is settled at source."
      ],
      [
        "Clear a South Carolina General Sessions charge that did not end in a conviction",
        "Read at source on 2026-08-06, § 17-1-40(B)(1) provides that where a person's record is expunged under Article 9 of Chapter 22 because the person was charged with a criminal offence, or issued a courtesy summons, and the charge was discharged, proceedings were dismissed, or the person was found not guilty, the arrest and booking record, associated bench warrants, mug shots and fingerprints must be destroyed and no evidence of the record may be retained by any municipal, county or state agency."
      ],
      [
        "Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
        "Read at source on 2026-08-06, § 17-1-65 provides that a person may apply for an expungement of one conviction for unlawful possession of a handgun as provided in § 16-23-20, if the conviction occurred prior to the enactment of the South Carolina Constitutional Carry/Second Amendment Preservation Act of 2024, and that an application under the section must be made within five years of the enactment of the section."
      ],
      [
        "Clear a low-level South Carolina conviction after three years",
        "Read at source on 2026-08-06, § 22-5-910(A) allows a defendant convicted of a crime carrying a penalty of not more than thirty days imprisonment or a one thousand dollar fine, or both, or a first offence for unlawful possession of a firearm or weapon carrying not more than one year or a one thousand dollar fine, or both, to apply after three years from the date of the conviction to the circuit court for an order expunging the records of the arrest and conviction and any associated bench warrant; the section does not apply to an offence involving the operation of a motor vehicle."
      ],
      [
        "Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
        "Read at source on 2026-08-06, § 22-5-920(B)(1) allows a defendant with a first offence conviction as a youthful offender, for which the defendant was sentenced pursuant to Chapter 19 of Title 24, the Youthful Offender Act, and who has not been convicted of any offence including an out-of-state offence while serving the youthful offender sentence including probation and parole and for a period of five years from the date of completion of that sentence, to apply to the circuit court for an order expunging the records of the arrest and conviction."
      ],
      [
        "Clear a first South Carolina drug conviction",
        "Read in full at source on 2026-08-06, § 22-5-930 has two branches."
      ],
      [
        "Clear a first South Carolina bad-check conviction after one year",
        "Read at source on 2026-08-06, § 34-11-90(e) provides that after a conviction under the chapter on a first offence the defendant may, after one year from the date of the conviction, apply or cause someone acting on his behalf to apply to the court for an order expunging the records of the arrest and conviction."
      ],
      [
        "Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
        "Read at source on 2026-08-06, § 56-5-750(F) provides that after a conviction pursuant to subsection (B)(1) for a first offence, the person may, after three years from the date of completion of all terms and conditions of the sentence for the first offence, apply or cause someone acting on his behalf to apply to the court for an order expunging the records of the arrest and conviction."
      ]
    ],
    "footnotes": [
      "Every page states its own route in its footer. If two routes could fit your record, that is a question for a lawyer or a legal-aid office, not a choice to guess at."
    ]
  },
  "documentsToObtain": [
    [
      "Obtain SLED criminal history record. Request your own criminal history record from SLED. It is the record the solicitor's office and SLED work from, and it is the only reliable way to see every charge and disposition on your record before you choose which one to spend an application on.",
      "South Carolina Law Enforcement Division"
    ],
    [
      "Obtain Court docket and certified disposition. Ask the clerk of the court that handled the case for the docket and, where available, a certified disposition. The docket carries the warrant or indictment number, the court level and the disposition date the application needs.",
      "Clerk of the magistrate, municipal or General Sessions court that handled the case"
    ],
    [
      "Obtain Alcohol Education Program completion certificate or letter. Ask the programme office for written confirmation that you successfully completed the programme and the completion date. Ask for the attestation at the same time.",
      "The circuit solicitor's Alcohol Education Program office or its contracted provider"
    ],
    [
      "Obtain Order of discharge and dismissal. Ask the clerk of the court that handled the case for the order discharging you and dismissing the proceedings. Section 44-53-450(B) makes the court's determination that you were dismissed and discharged the whole of the expungement standard, so this is the document the order turns on.",
      "Clerk of the general sessions or summary court that entered it"
    ],
    [
      "Obtain Traffic Education Program completion certificate or letter. Ask the administering agency for written confirmation that you successfully completed the programme and the completion date, and ask for the attestation at the same time.",
      "The governmental agency that administered the programme, being the circuit solicitor's office or the county or municipality it contracted with"
    ],
    [
      "Obtain SLED criminal history record. Request your own criminal history record from SLED. It is not required for this route, but it is the only reliable way to see every charge on your record before you choose which to apply for.",
      "South Carolina Law Enforcement Division"
    ],
    [
      "Obtain Sentencing sheet or judgment identifying the statute of conviction. Ask the clerk for the sentencing sheet or judgment and check that it names S.C. Code § 16-23-20 and that the conviction date is before 7 March 2024. Both are findings the order requires and neither can be taken from recollection.",
      "Clerk of the General Sessions court that sentenced the participant"
    ],
    [
      "Obtain Sentencing sheet or judgment showing the statutory penalty for the offence. Ask the clerk for the sentencing sheet or judgment. The statutory penalty ceiling, not the sentence you actually received, is what decides eligibility under § 22-5-910(A), and it must be taken from the record rather than from memory.",
      "Clerk of the court that handled the case"
    ],
    [
      "Obtain Sentencing sheet or judgment showing a Youthful Offender Act sentence. Ask the clerk for the sentencing sheet or judgment and check that it records a sentence under the Youthful Offender Act, Chapter 19 of Title 24. Being eligible for a youthful offender sentence is not the same as having received one, and this route needs the second. Check the paperwork rather than your recollection.",
      "Clerk of the General Sessions court that sentenced the participant"
    ],
    [
      "Obtain Written confirmation that probation and parole ended. Ask the Department of Probation, Parole and Pardon Services for written confirmation of the date your supervision ended. The five-year clock runs from completion of the whole sentence including probation and parole, not from the conviction.",
      "The South Carolina Department of Probation, Parole and Pardon Services"
    ],
    [
      "Obtain Written confirmation that probation and parole ended. Ask the Department of Probation, Parole and Pardon Services for written confirmation of the date your supervision ended. Both the three-year and the twenty-year clock run from completion of the sentence including probation and parole, not from the conviction date.",
      "The South Carolina Department of Probation, Parole and Pardon Services"
    ],
    [
      "Obtain Sentencing sheet and proof that every term and condition was completed. Ask the clerk for the sentencing sheet, which shows the subsection you were convicted under and whether it was a felony, and for proof that fines, restitution and any other condition are satisfied. The three-year clock runs from the date the last of those was completed.",
      "Clerk of the court that sentenced the participant, and the supervising probation office where applicable"
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
    "**Every case number in every caption.** If the court assigns one, it does so at filing, and the pages in this set are filed together before any number exists."
  ],
  "recordSays": [
    [
      "Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "Fees: $250 program fee plus possible provider fees. Inability to pay cannot bar participation, and the solicitor may waive or reduce fees."
    ],
    [
      "Clear a South Carolina underage-alcohol charge after you completed the Alcohol Education Program",
      "SLED criminal history first."
    ],
    [
      "Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "SLED retention: the Department of Narcotic and Dangerous Drugs under SLED retains nonpublic information under section 44-53-450."
    ],
    [
      "Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "Conditional discharge itself carries a fee before discharge or dismissal of $350 in General Sessions and $150 in summary court, with indigency-based waiver, reduction or suspension possible."
    ],
    [
      "Clear a first South Carolina drug possession case that ended in a conditional discharge",
      "SLED criminal history first."
    ],
    [
      "Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a South Carolina traffic charge after you completed the Traffic Education Program",
      "SLED criminal history first."
    ],
    [
      "Clear a South Carolina General Sessions charge that did not end in a conviction",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a South Carolina General Sessions charge that did not end in a conviction",
      "The clerk filing fee is waived for section 17-1-40 non-convictions. No filing fee is charged by the clerk's office where the charge was discharged, dismissed, nol prossed, or the applicant was acquitted."
    ],
    [
      "Clear a South Carolina General Sessions charge that did not end in a conviction",
      "An applicant seeking expungement of General Sessions charges under section 17-1-40 is exempt from the administrative fee, unless the charge was dismissed, discharged or nolle prossed as part of a plea arrangement under which the defendant pled guilty and was sentenced on other charges."
    ],
    [
      "Clear a South Carolina General Sessions charge that did not end in a conviction",
      "SLED criminal history first."
    ],
    [
      "Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "Diary the March 7, 2029 section 17-1-65 deadline."
    ],
    [
      "Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "This is a closing window. A participant who misses March 7, 2029 loses the route permanently, and it is exactly the kind of deadline a product should surface unprompted."
    ],
    [
      "Clear an old South Carolina unlawful handgun possession conviction — the window closes 7 March 2029",
      "SLED criminal history first."
    ],
    [
      "Clear a low-level South Carolina conviction after three years",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a low-level South Carolina conviction after three years",
      "Note on the SLED fee: section 22-5-910 is not on the verification-fee exemption list, so the $25 applies."
    ],
    [
      "Clear a low-level South Carolina conviction after three years",
      "SLED criminal history first."
    ],
    [
      "Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a South Carolina conviction you were sentenced for under the Youthful Offender Act",
      "SLED criminal history first."
    ],
    [
      "Clear a first South Carolina drug conviction",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a first South Carolina drug conviction",
      "SLED criminal history first."
    ],
    [
      "Clear a first South Carolina bad-check conviction after one year",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a first South Carolina bad-check conviction after one year",
      "SLED retention: SLED retains nonpublic information under section 34-11-90(e)."
    ],
    [
      "Clear a first South Carolina bad-check conviction after one year",
      "SLED criminal history first."
    ],
    [
      "Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
      "Fees require separate certified checks or money orders; no personal checks."
    ],
    [
      "Clear a first South Carolina failure-to-stop-for-a-blue-light conviction after three years",
      "SLED criminal history first."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "SLED verification has not yet occurred. Section 17-22-940(E) requires SLED to verify and document statutory eligibility before anyone signs, and LegalEase must never tell a participant they are eligible before that.",
    "The solicitor or his designee declines to consent to the expungement.",
    "Any felony; any violent crime under § 16-1-60; any domestic violence matter; any sex offender registration offence.",
    "Any pending charge, unless it has been pending more than five years and the tolling rule is clearly satisfied.",
    "Any drug conviction beyond a clean § 44-53-450(b) conditional discharge.",
    "Trafficking facts, juvenile matters, or any immigration question.",
    "Federal, out-of-state, military or tribal records.",
    "The participant was terminated from the programme or the offence was reinstated.",
    "The offence may be a DUI-type offence under § 56-5-2930 or § 56-5-2933, which the programme excludes.",
    "The Alcohol Education Program Director will not attest.",
    "LegalEase must not generate any statement that the participant is eligible before SLED has verified it, since SLED verification precedes every signature.",
    "Where the solicitor does not consent, § 17-22-940(I) leaves the applicant to retained counsel initiating an action in circuit court for a judicial determination of eligibility. Automated assistance ends there; the initial package still generates.",
    "Any prior drug conviction, which defeats the route entirely.",
    "The terms and conditions were not fulfilled, or an adjudication of guilt was entered.",
    "The § 44-53-450(C) fee is unpaid.",
    "The Summary Court Judge will not attest.",
    "A subsequent traffic violation was received within six months of the ticket.",
    "The incident caused death or serious bodily injury.",
    "The Traffic Education Program Director will not attest.",
    "The dismissal was, or may have been, part of a plea arrangement under which the participant pled guilty to other charges. This changes the fee and complicates the application.",
    "Several charges were brought and only some were dismissed.",
    "Dismissals tied to plea arrangements.",
    "The conviction date is on or after 7 March 2024, or cannot be established from the record.",
    "The conviction may not have been under § 16-23-20.",
    "The participant has more than one handgun possession conviction, since the section reaches one.",
    "The participant has applied under § 17-1-65 before.",
    "The 7 March 2029 deadline is close enough that a delay would forfeit the route; the participant should be told plainly and referred if the solicitor's office cannot process it in time.",
    "Any firearm rights question, which this route does not answer.",
    "Any motor vehicle offence.",
    "Any domestic violence matter.",
    "The statutory penalty ceiling for the offence cannot be established from the record.",
    "The participant does not think of themselves as convicted because they forfeited bail, which § 22-5-910(E) treats as a conviction.",
    "The participant has already used § 22-5-910 once.",
    "Bail forfeiture counts as a conviction under section 22-5-910.",
    "LegalEase must not generate any statutory penalty ceiling, offence classification or first-offence status not taken from the record.",
    "The sentencing paperwork does not clearly record a Youthful Offender Act sentence.",
    "Any motor vehicle offence, any § 16-1-60 violent crime, any Chapter 25 domestic violence offence, or any registration offence.",
    "Any conviction during the service of the sentence or the five years following it, other than driving under suspension or a pre-May-2018 disturbing schools conviction.",
    "The participant has already used § 22-5-920 once.",
    "YOA requires actual YOA sentencing.",
    "LegalEase must not generate the statement that a person eligible for YOA sentencing qualifies under section 22-5-920 without having been sentenced under it.",
    "The offence is not clearly within one of the two branches of § 22-5-930.",
    "Any prior conditional discharge, because the five-year and ten-year lookback bars turn on it and are measured from the date of arrest.",
    "A possession-with-intent conviction, which carries a twenty-year clock and belongs with counsel.",
    "The participant has already used § 22-5-930 once.",
    "LegalEase must not generate the statement that all drug convictions route to section 22-5-930.",
    "The cheque exceeded five thousand dollars, which makes the conviction a felony and closes the route.",
    "Any conviction of any kind during the year following the conviction.",
    "The participant has already used § 34-11-90(e) once.",
    "More than one cheque was involved, since each instrument is a separate offence and each needs its own order and its own fees.",
    "The conviction may be a felony or may be under a subsection other than (B)(1).",
    "The incident involved injury, death or a high-speed pursuit.",
    "The completion date of every term and condition cannot be established from the record.",
    "The participant has already used § 56-5-750(F) once."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official SC form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that the official South Carolina document recorded as genuinely missing in this family's queue row has been located — it has not, and nothing here composes from it"
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
      "finding": "This family's MASTER_QUEUE row reads sourceStatus SOURCE_BOUND_BY_HELD_BYTES with custodyClass SOURCE_GENUINELY_MISSING and one bound source, which is unlike every other family in this lane.",
      "consequence": "This build composes from committed repository records only and binds nothing else; the receipt records exactly what it bound. The missing official-document custody is a source-lane question and is reported here rather than papered over. No page in this packet is composed from a document this build does not hold."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for these routes.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family carries 10 statutory routes in one packet; each page states its own route and the instructions carry a which-pages-are-yours table.",
    "The MASTER_QUEUE row for this family records a genuinely missing official source. This build did not use it, did not substitute for it, and reports it."
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
  lines.push("", `Route: ${c.routeKey}`);
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
    out.push("| Instrument | When it is yours |", "| --- | --- |");
    for (const [instr, when] of SPEC.instrumentChoice.rows) out.push(`| ${instr} | ${when} |`);
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
