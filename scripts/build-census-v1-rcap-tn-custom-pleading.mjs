#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — the Tennessee custom-pleading family, eleven
 * routes across eleven committed tracks.
 *
 *   node "scripts/build-census-v1-rcap-tn-custom-pleading.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * ELEVEN ROUTES IN ONE FAMILY, AND THEY ARE NOT ALL COURT FILINGS. This is
 * the distinction that matters most in this family and the one a packet gets
 * wrong by assuming every route ends in a petition.
 *
 * FIVE of the eleven — tn_eligible_conviction, tn_two_offense,
 * tn_illegal_voting, tn_post_pardon and tn_recovery_court — are recorded by
 * the committed specifications as a REQUEST TO THE DISTRICT ATTORNEY GENERAL
 * plus an ELIGIBILITY RECORD, and not as a petition at all. The committed
 * venue statement says why: § 40-32-108(e) makes the district attorney
 * general's office the PREPARER of the petition, and the petitioner files the
 * petition that office prepares with the clerk of the convicting court under
 * § 40-32-108(a). Composing a petition for those five would hand the
 * participant a document the statute does not ask them to write. This build
 * does not do that: it composes the request and the eligibility record the
 * record describes, and states in terms who prepares the petition.
 *
 * ONE of the eleven is a MOTION FOR PARTIAL REMOVAL with a count-by-count
 * schedule (tn_redaction), because redaction is charge-by-charge relief.
 *
 * The remaining five are petitions.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-tn-custom-pleading",
  "worklistGroupId": "rcap-tn-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-tn-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading",
  "jurisdiction": "TN",
  "legalName": "Tennessee Expunction Instruments — Title 40 chapters 32, 15 and 35, and the redaction and mistaken-identity routes",
  "routeName": "asking a Tennessee court, or the district attorney general's office the statute makes the preparer, for the expunction relief that fits the participant's own record",
  "statutes": [
    "T.C.A. § 40-32-109",
    "T.C.A. § 40-32-109(a)",
    "T.C.A. § 40-32-109(b)",
    "T.C.A. § 40-32-109(c)",
    "T.C.A. § 40-32-109(d)",
    "T.C.A. § 40-32-109(e)",
    "T.C.A. § 40-32-109(f)",
    "T.C.A. § 40-32-102(c)(1)",
    "T.C.A. § 40-32-110",
    "T.C.A. § 8-21-401",
    "T.C.A. § 40-32-107(c)",
    "T.C.A. § 40-32-107(c)(1)",
    "T.C.A. § 40-32-107(c)(2)",
    "T.C.A. § 2-19-107",
    "T.C.A. § 40-32-108",
    "T.C.A. § 40-32-108(a)",
    "T.C.A. § 40-32-108(d)(2)",
    "T.C.A. § 40-32-108(e)",
    "T.C.A. § 40-32-102(c)",
    "T.C.A. § 40-32-106(a)(1)(H)",
    "T.C.A. § 40-32-101",
    "T.C.A. § 40-32-106(a)(1)",
    "T.C.A. § 40-32-102(d)",
    "T.C.A. § 40-32-106(a)(2)",
    "T.C.A. § 40-32-102",
    "T.C.A. § 40-32-102(e)",
    "T.C.A. § 40-6-204(b)",
    "T.C.A. § 40-32-107(d)",
    "T.C.A. § 40-32-107(d)(1)(A)",
    "T.C.A. § 40-32-107(d)(1)(B)",
    "T.C.A. § 40-32-107(d)(1)(C)",
    "T.C.A. § 40-32-107(d)(2)",
    "T.C.A. § 40-32-107(d)(3)",
    "Public Chapter 719 (2026)",
    "T.C.A. § 40-32-106(d)(1)",
    "T.C.A. § 40-32-106(d)(2)",
    "T.C.A. § 40-32-106(d)(3)",
    "T.C.A. §§ 40-15-102 through 40-15-107",
    "T.C.A. § 40-15-105",
    "T.C.A. § 40-39-202",
    "T.C.A. § 40-32-107(e)",
    "T.C.A. § 40-32-107(e)(1)",
    "T.C.A. § 40-32-107(e)(2)",
    "T.C.A. § 40-32-107(e)(3)",
    "T.C.A. § 40-32-107(a)(1)",
    "T.C.A. § 40-32-107(a)(3)(A)",
    "T.C.A. § 55-10-401",
    "Public Chapter 1061 (2026)",
    "T.C.A. § 40-32-106(c)(2)",
    "T.C.A. § 40-32-106(a)",
    "T.C.A. § 40-32-107(a)",
    "T.C.A. § 40-32-107(a)(2)",
    "T.C.A. § 40-32-107(a)(3)",
    "T.C.A. § 40-32-107(a)(4)",
    "T.C.A. § 40-35-313",
    "T.C.A. § 40-32-107(b)",
    "T.C.A. § 40-32-107(b)(1)",
    "T.C.A. § 40-32-107(b)(2)",
    "T.C.A. § 40-32-107(b)(3)"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-only:TN:tn_arrest_no_court_record"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_illegal_voting"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_mistaken_identity"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_nonconviction_petition"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_post_pardon"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_pretrial_diversion"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_recovery_court"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_redaction"
    },
    {
      "routeKey": "obligation:track-pathway:TN:tn_eligible_conviction:pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107"
    },
    {
      "routeKey": "obligation:track-pathway:TN:tn_judicial_diversion:pathway-2-diversion-expunction-under-40-15-105-40-35-313"
    },
    {
      "routeKey": "obligation:track-pathway:TN:tn_two_offense:pathway-4-two-offense-expunction-under-40-32-101-k"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:tn_arrest_no_court_record+tn_illegal_voting+tn_mistaken_identity+tn_nonconviction_petition+tn_post_pardon+tn_pretrial_diversion+tn_recovery_court+tn_redaction+tn_eligible_conviction+tn_judicial_diversion+tn_two_offense",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"tn_arrest_no_court_record\"",
        "Expunction of an arrest record where the court has no history of the arrest, T.C.A. § 40-32-109",
        "Expunction of the arrest record, with the § 40-32-110 effect expressly applied by § 40-32-109(f): the petitioner is enti",
        "The court with jurisdiction over the offence for which the person was arrested, per § 40-32-109(a). The section states t",
        "T.C.A. § 40-32-109",
        "T.C.A. § 40-32-109(a)",
        "T.C.A. § 40-32-109(b)",
        "T.C.A. § 40-32-109(c)",
        "T.C.A. § 40-32-109(d)",
        "T.C.A. § 40-32-109(e)",
        "T.C.A. § 40-32-109(f)",
        "T.C.A. § 40-32-102(c)(1)",
        "T.C.A. § 40-32-110",
        "T.C.A. § 8-21-401",
        "What were you arrested for, and which agency arrested you?",
        "What is the date of the arrest?",
        "In which county did the arrest happen, and which court would have had jurisdiction over that offence?",
        "Were you ever arraigned, did you ever appear in court, and were you ever given a court date or a case number for this arrest?",
        "As far as you know, does any court file or court case exist for this arrest?",
        "What is the state control number on your TBI criminal history, and what does that history show about this arrest?",
        "Did this arrest end in a dismissal, a no true bill, a nolle prosequi, an acquittal, or a release without charge that the court actually recorded? If it did, the free § 40-32-106 route is the right one instead.",
        "Is there anything you can file that bears on there being no court record — a letter from a clerk, a records search result, anything else?",
        "A clerk's fee applies and is mandatory. Section 40-32-109(e) provides that a person petitioning the court for expunction",
        "Through the clerk. The participant does not effect service.",
        "A petition filed by the participant with the court with jurisdiction over the offence for which the person was arrested,",
        "\"trackId\": \"tn_illegal_voting\"",
        "Expunction of a conviction for illegal registration or voting, T.C.A. § 40-32-107(c) with procedure at § 40-32-108",
        "Expunction of the conviction record. Under T.C.A. § 40-32-110 the petitioner is entitled to have all public records of t",
        "The convicting court, under § 40-32-108(a). The request goes to the district attorney general for that judicial district",
        "T.C.A. § 40-32-107(c)",
        "T.C.A. § 40-32-107(c)(1)",
        "T.C.A. § 40-32-107(c)(2)",
        "T.C.A. § 2-19-107",
        "T.C.A. § 40-32-108",
        "T.C.A. § 40-32-108(a)",
        "T.C.A. § 40-32-108(d)(2)",
        "T.C.A. § 40-32-108(e)",
        "T.C.A. § 40-32-102(c)",
        "Which court convicted you, in which county, and which judicial district is that? The request goes to that district's district attorney general.",
        "What is the docket or case number?",
        "What is the exact T.C.A. section you were convicted under? This route reaches only § 2-19-107, illegal registration or voting.",
        "Does the judgment name T.C.A. § 2-19-107 specifically, rather than another elections or fraud provision?",
        "On what date was the offence committed?",
        "On what date were you convicted?",
        "On what date did you complete the entire sentence? The fifteen-year clock runs from then, and it is measured on the day the petition is filed.",
        "Is every fine, restitution amount, court cost and other assessment paid in full? Anything outstanding means the sentence is not complete.",
        "Have you completed any term of imprisonment or probation and met every condition of supervised or unsupervised release?",
        "List every other conviction you have anywhere, including federal and out-of-state convictions.",
        "Did this offence happen before any conviction you have for an offence that cannot be expunged?",
        "Have you ever been granted an expunction before under T.C.A. § 40-32-107(a), (b), (c) or (e)?",
        "What is the state control number on your TBI criminal history?",
        "Are you doing this to get your voting rights back? That is a separate remedy and this route does not deliver it.",
        "A clerk's fee applies. T.C.A. § 40-32-108(a) provides that a person applying for expunction of records under the section",
        "Two steps with different actors. The participant sends the request to the office of the district attorney general for th",
        "\"trackId\": \"tn_mistaken_identity\"",
        "Expunction where the person was arrested or charged due to mistaken identity, T.C.A. § 40-32-106(a)(1)(H)",
        "Mistaken identity is one of the enumerated non-conviction grounds in the reorganized § 40-32-106(a)(1), and Public Chapt",
        "Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous actio",
        "T.C.A. § 40-32-106(a)(1)(H)",
        "T.C.A. § 40-32-101",
        "T.C.A. § 40-32-106(a)(1)",
        "T.C.A. § 40-32-102(d)",
        "Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
        "What was the charge, and exactly how did the case end?",
        "On what date did the case end?",
        "What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
        "List every other conviction you have anywhere, including federal and out-of-state.",
        "Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
        "In your own words, how did this arrest or charge come to be attached to your name when it was not you?",
        "What do you have that shows it was not you — where you were at the time, identification documents, fingerprints, or anything else?",
        "Is there a job, a licence or a housing application that makes speed matter here?",
        "None. Mistaken identity is one of the § 40-32-106(a)(1) grounds, and those records must be removed and destroyed without",
        "A petition to the court having jurisdiction in the previous action, filed with that court's clerk.",
        "\"trackId\": \"tn_nonconviction_petition\"",
        "Free expunction of a non-conviction record by petition, T.C.A. § 40-32-106(a)",
        "Created by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608 effective 2026-03-25. Al",
        "T.C.A. § 40-32-106(a)(2)",
        "T.C.A. § 40-32-102",
        "T.C.A. § 40-32-102(e)",
        "T.C.A. § 40-6-204(b)",
        "Which of these describes how the case ended — dismissed, no true bill returned by the grand jury, arrested and released without being charged, nolle prosequi, or found not guilty?",
        "Was the case dismissed because you completed a diversion programme? If so this is a different, non-free route.",
        "Did any count in the case end in a conviction?",
        "Do you have cases in any other Tennessee county? Each county needs its own filing.",
        "Did a court case, a court file or any previous court action ever exist for this matter — were you arraigned, did you appear, were you given a court date or a case number? If nothing ever reached the court, a different route applies and it carries a fee.",
        "None. Section 40-32-106(a)(1) requires the records to be removed and destroyed without cost to the person, and the gener",
        "A petition to the court having jurisdiction in the previous action, filed with that court's clerk. A separate petition i",
        "\"trackId\": \"tn_post_pardon\"",
        "Expunction of a pardoned conviction, T.C.A. § 40-32-107(d) as amended by Public Chapter 719, with procedure at § 40-32-108",
        "Expunction of the pardoned conviction record, with the § 40-32-110 effect. The pardon by itself does not clear the recor",
        "T.C.A. § 40-32-107(d)",
        "T.C.A. § 40-32-107(d)(1)(A)",
        "T.C.A. § 40-32-107(d)(1)(B)",
        "T.C.A. § 40-32-107(d)(1)(C)",
        "T.C.A. § 40-32-107(d)(2)",
        "T.C.A. § 40-32-107(d)(3)",
        "Public Chapter 719 (2026)",
        "Which court convicted you, in which county, and which judicial district is that?",
        "What is the exact T.C.A. section you were convicted under? It is tested against a closed list of seven excluded felonies.",
        "Have you received a pardon from the Governor, and on what date?",
        "Did the board of parole return a positive vote to receive a pardon, and on what date?",
        "Was the conviction for an attempt, conspiracy, facilitation or solicitation to commit an offence? The exclusion list reaches those forms expressly.",
        "Was the offence a sexual offence requiring registration as a sexual offender or violent sexual offender, or any sexual offence involving a minor?",
        "In your own words, is there anything you want the court to know about whether the offence was violent? After the 2026 amendment this is something the court weighs rather than a bar, and it is your account to give.",
        "Have you ever been granted an expunction before under T.C.A. § 40-32-107(a), (b), (c) or (e)? Subsection (d) states no bar of its own, so this is recorded rather than applied against you.",
        "\"trackId\": \"tn_pretrial_diversion\"",
        "Expunction after successful completion of pretrial diversion, T.C.A. § 40-32-106(d)",
        "Prosecution is suspended under a memorandum of understanding with the district attorney general; the person does not ple",
        "T.C.A. § 40-32-106(d)(1)",
        "T.C.A. § 40-32-106(d)(2)",
        "T.C.A. § 40-32-106(d)(3)",
        "T.C.A. §§ 40-15-102 through 40-15-107",
        "T.C.A. § 40-15-105",
        "T.C.A. § 40-39-202",
        "Was it pretrial diversion, where you did not plead guilty and prosecution was suspended, or judicial diversion, where you entered a plea but no judgment of conviction was entered?",
        "Did you successfully complete everything the diversion required, and were the charges then dismissed?",
        "Was the offence a sexual offence or a violent sexual offence as Tennessee defines those for the registry? Those can be diverted but cannot be expunged.",
        "Have you already filed a petition to expunge this case?",
        "Did you sign a memorandum of understanding with the district attorney general suspending prosecution, without pleading guilty?",
        "A clerk's fee applies. Section 40-32-106(d)(3) requires the appropriate clerk's fee pursuant to T.C.A. § 8-21-401 for de",
        "\"trackId\": \"tn_recovery_court\"",
        "Expunction after completion of a certified recovery court programme following a prior DUI conviction, T.C.A. § 40-32-107(e) added by Public Chapter 1061, with procedure at § 40-32-108",
        "Expunction of one otherwise-eligible offence, with the § 40-32-110 effect. It does not expunge the DUI. A person seeking",
        "T.C.A. § 40-32-107(e)",
        "T.C.A. § 40-32-107(e)(1)",
        "T.C.A. § 40-32-107(e)(2)",
        "T.C.A. § 40-32-107(e)(3)",
        "T.C.A. § 40-32-107(a)(1)",
        "T.C.A. § 40-32-107(a)(3)(A)",
        "T.C.A. § 55-10-401",
        "Public Chapter 1061 (2026)",
        "Which court convicted you of the offence you want cleared, in which county, and which judicial district is that?",
        "What is the docket or case number for that offence?",
        "What is the exact T.C.A. section of the offence you want cleared? It has to be on the § 40-32-107(a)(1) eligible lists in its own right.",
        "Does the offence you want cleared involve a motor vehicle together with alcohol or a controlled substance? If it does, this route is closed for it.",
        "How many convictions do you have under T.C.A. § 55-10-401 for driving under the influence? More than one closes this route.",
        "What is the date of that DUI conviction? The ten-year interval runs from it.",
        "On what date was the offence you want cleared committed? It must be at least ten years after the DUI conviction.",
        "Did you successfully complete a certified recovery court programme, and on what date?",
        "On what date did you complete the entire sentence for the offence you want cleared?",
        "Is every fine, restitution amount, court cost and other assessment for that offence paid in full?",
        "Have you completed any term of imprisonment or probation for that offence and met every condition of supervised or unsupervised release?",
        "Are you hoping to clear the DUI itself? This route cannot do that, and it is important you know before anything is prepared.",
        "\"trackId\": \"tn_redaction\"",
        "Partial removal of records of charges not resulting in conviction in a mixed case, T.C.A. § 40-32-106(c)(2)",
        "The controlling review identified this remedy from a secondary profile and left its citation unresolved as the highest-v",
        "T.C.A. § 40-32-106(c)(2)",
        "T.C.A. § 40-32-106(a)",
        "Take the case count by count: what was each charge, and how did each one end? This route only reaches the counts that did not end in conviction.",
        "Which counts ended in a conviction? Those stay on your record.",
        "This clears the dismissed counts and leaves the conviction. Is that what you are looking for?",
        "Not established for the partial removal itself. The § 40-32-106(a) no-cost provision is framed around removal and destru",
        "A motion to the court having jurisdiction in the previous action, filed with that court's clerk, under the existing dock",
        "\"trackId\": \"tn_eligible_conviction\"",
        "Expunction of an eligible conviction, T.C.A. § 40-32-107(a) with procedure at § 40-32-108",
        "Public Chapter 268 of 2025 split the former § 40-32-101(g) conviction route along an eligibility and procedure seam: § 4",
        "Statewide statute with originating-court venue and prosecutor-office routing. The request goes to the office of the dist",
        "T.C.A. § 40-32-107(a)",
        "T.C.A. § 40-32-107(a)(2)",
        "T.C.A. § 40-32-107(a)(3)",
        "T.C.A. § 40-32-107(a)(4)",
        "What is the exact T.C.A. section you were convicted under? The offence name and class are not enough — Tennessee's eligible lists are section by section.",
        "On what date was the offence committed? This matters independently of the conviction date, because a 2026 change applies only to offences committed on or after 1 July 2026.",
        "Did the conviction occur on or after 1 November 1989?",
        "On what date did you finish the entire sentence — including any imprisonment or probation, all release conditions, and every fine, restitution amount, court cost and other assessment?",
        "Is every fine, restitution amount, court cost and other assessment paid in full? Anything outstanding means the sentence is not complete and the clock has not started.",
        "Have you ever had a conviction expunged in Tennessee before under T.C.A. § 40-32-107(a), (b), (c) or (e)? This route is available once in a lifetime and a previous grant under (a), (b) or (c) closes it. A grant under (e) is recorded because the statute is asymmetric on the point, and no bar is applied against you that the subsection does not state.",
        "Did you hold a commercial driver licence at the time, and did the offence involve a controlled substance or a commercial motor vehicle?",
        "Did your sentence require a period free from dependency on or abuse of alcohol or a controlled substance? If so, have you met at least one year of it?",
        "Was the conviction for burglary under T.C.A. § 39-13-1002? If so, the date of the offence decides whether the wait is five years or ten.",
        "Have you received a pardon from the Governor for this conviction? If you have, a different route may reach it even where this one cannot.",
        "If a DUI conviction is what is standing in the way: have you successfully completed a certified recovery court programme, and did the offence you want cleared happen at least ten years after that DUI conviction?",
        "A clerk's fee applies. Section 40-32-108(a) provides that a person applying for expunction of records under the section ",
        "Two steps with different actors. The participant requests the packet from the office of the district attorney general fo",
        "\"trackId\": \"tn_judicial_diversion\"",
        "Expunction after successful completion of judicial diversion, T.C.A. § 40-32-106(d) and § 40-35-313",
        "Judicial diversion under T.C.A. § 40-35-313 is a conditional guilty plea with no judgment of conviction entered: the cou",
        "T.C.A. § 40-35-313",
        "Did you enter a guilty plea that the court held without entering a judgment of conviction, and then complete probation?",
        "\"trackId\": \"tn_two_offense\"",
        "Expunction of up to two offences, T.C.A. § 40-32-107(b) with procedure at § 40-32-108",
        "Read at source on 2026-08-06. Section 40-32-107(b) defines an eligible petitioner as a person seeking expunction of no m",
        "T.C.A. § 40-32-107(b)",
        "T.C.A. § 40-32-107(b)(1)",
        "T.C.A. § 40-32-107(b)(2)",
        "T.C.A. § 40-32-107(b)(3)",
        "How many offences are you asking to clear? The limit is two.",
        "Are the two offences both misdemeanours, or one felony and one misdemeanour? Two felonies cannot be done on this route.",
        "Did the offences happen at the same time and place as part of one continuous incident with a single intent? If so they may count as one, leaving your second slot open.",
        "This pathway can be used once in your life. Do you have any other conviction that might become eligible later? Using it now closes the door on that."
      ]
    },
    {
      "recordId": "legal-design-specifications:tn_arrest_no_court_record+tn_illegal_voting+tn_mistaken_identity+tn_nonconviction_petition+tn_post_pardon+tn_pretrial_diversion+tn_recovery_court+tn_redaction+tn_eligible_conviction+tn_judicial_diversion+tn_two_offense",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"tn_arrest_no_court_record-petition-1\"",
        "\"componentId\": \"tn_illegal_voting-participant-request-to-district-attorney-1\"",
        "\"componentId\": \"tn_illegal_voting-participant-eligibility-record-2\"",
        "\"componentId\": \"tn_mistaken_identity-petition-1\"",
        "\"componentId\": \"tn_mistaken_identity-expedited-request-2\"",
        "\"componentId\": \"tn_nonconviction_petition-petition-1\"",
        "\"componentId\": \"tn_post_pardon-participant-request-to-district-attorney-1\"",
        "\"componentId\": \"tn_post_pardon-participant-eligibility-record-2\"",
        "\"componentId\": \"tn_pretrial_diversion-petition-1\"",
        "\"componentId\": \"tn_recovery_court-participant-request-to-district-attorney-1\"",
        "\"componentId\": \"tn_recovery_court-participant-eligibility-record-2\"",
        "\"componentId\": \"tn_redaction-motion-for-partial-removal-1\"",
        "\"componentId\": \"tn_redaction-count-by-count-schedule-2\"",
        "\"componentId\": \"tn_eligible_conviction-request-to-district-attorney-1\"",
        "\"componentId\": \"tn_eligible_conviction-eligibility-record-2\"",
        "\"componentId\": \"tn_judicial_diversion-petition-1\"",
        "\"componentId\": \"tn_two_offense-request-to-district-attorney-1\"",
        "\"componentId\": \"tn_two_offense-eligibility-record-2\""
      ]
    },
    {
      "recordId": "route-obligation-census:11-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-only:TN:tn_arrest_no_court_record",
        "obligation:track-only:TN:tn_illegal_voting",
        "obligation:track-only:TN:tn_mistaken_identity",
        "obligation:track-only:TN:tn_nonconviction_petition",
        "obligation:track-only:TN:tn_post_pardon",
        "obligation:track-only:TN:tn_pretrial_diversion",
        "obligation:track-only:TN:tn_recovery_court",
        "obligation:track-only:TN:tn_redaction",
        "obligation:track-pathway:TN:tn_eligible_conviction:pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107",
        "obligation:track-pathway:TN:tn_judicial_diversion:pathway-2-diversion-expunction-under-40-15-105-40-35-313",
        "obligation:track-pathway:TN:tn_two_offense:pathway-4-two-offense-expunction-under-40-32-101-k"
      ]
    }
  ],
  "components": [
    {
      "id": "tn_arrest_no_court_record-petition-1",
      "routeKey": "obligation:track-only:TN:tn_arrest_no_court_record",
      "title": "Petition - Clear an arrest that never reached a courtroom",
      "role": "petition",
      "description": "the composed petition, on this route's own statutory ground (Clear an arrest that never reached a courtroom)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The court with jurisdiction over the offence for which the person was arrested, filed through its clerk - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "EXPUNCTION OF AN ARREST RECORD WHERE THE COURT HAS NO HISTORY OF THE ARREST, T.C.A. § 40-32-109",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under T.C.A. § 40-32-109; T.C.A. § 40-32-109(a); T.C.A. § 40-32-109(b); T.C.A. § 40-32-109(c); T.C.A. § 40-32-109(d); T.C.A. § 40-32-109(e); T.C.A. § 40-32-109(f); T.C.A. § 40-32-102(c)(1); T.C.A. § 40-32-110; T.C.A. § 8-21-401 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Expunction of the arrest record, with the § 40-32-110 effect expressly applied by § 40-32-109(f): the petitioner is entitled to have all public records destroyed, is restored in contemplation of law to the status occupied before the arrest, must not suffer adverse effects or collateral disabilities by virtue of the offence, and is not guilty of perjury for failing to acknowledge the arrest in response to any inquiry. A person whose arrest record exists but for whom the court with jurisdiction over the offence for which the person was arrested has no history of the arrest within the court's records. This is the participant whose arrest never produced a court file — the case that the § 40-32-106 route cannot reach, because that route runs to the court having jurisdiction in the previous action and here there is no previous action in that court's records. This is the only one of the four additions that does NOT run through § 40-32-108, and it is the only Tennessee route in the entire chapter on which the participant writes the operative petition. Section 40-32-109 contains no cross-reference to § 40-32-108 of any kind, so § 40-32-108(e) — under which the office of the district attorney general must prepare the petition and proposed order — does not reach it. It also carries no waiting period, no 61-day pre-order clock, no rebuttable presumption and no two-year refiling bar, all of which live in § 40-32-108 alone. Section 40-32-109(a) uses the permissive 'may petition', where § 40-32-108(a) uses 'shall petition'. Codified through Public Chapter 608. Untouched by Public Chapters 719, 930 and 1061. Six subsections, (a) through (f), with no further subdivision numbering.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - arrest offence and agency] What were you arrested for, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - arrest date] What is the date of the arrest?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - county and court] In which county did the arrest happen, and which court would have had jurisdiction over that offence?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - ever arraigned or appeared] Were you ever arraigned, did you ever appear in court, and were you ever given a court date or a case number for this arrest?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - court file exists] As far as you know, does any court file or court case exist for this arrest?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - state control number] What is the state control number on your TBI criminal history, and what does that history show about this arrest?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - disposition that court recorded] Did this arrest end in a dismissal, a no true bill, a nolle prosequi, an acquittal, or a release without charge that the court actually recorded? If it did, the free § 40-32-106 route is the right one instead.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - evidence of absence] Is there anything you can file that bears on there being no court record — a letter from a clerk, a records search result, anything else?",
        "(Asked because § 40-32-109(b) permits the petitioner to file evidence, not because anything is required.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under T.C.A. § 40-32-109; T.C.A. § 40-32-109(a); T.C.A. § 40-32-109(b); T.C.A. § 40-32-109(c); T.C.A. § 40-32-109(d); T.C.A. § 40-32-109(e); T.C.A. § 40-32-109(f); T.C.A. § 40-32-102(c)(1); T.C.A. § 40-32-110; T.C.A. § 8-21-401.",
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
          "id": "fact_arrestOffenceAndAgency",
          "label": "Item C1 - arrest offence and agency",
          "supply": "What were you arrested for, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for tn_arrest_no_court_record, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C2 - arrest date",
          "supply": "What is the date of the arrest?",
          "why": "the committed track registry records this as a required generation input for tn_arrest_no_court_record, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_countyAndCourt",
          "label": "Item C3 - county and court",
          "supply": "In which county did the arrest happen, and which court would have had jurisdiction over that offence?",
          "why": "the committed track registry records this as a required generation input for tn_arrest_no_court_record, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_everArraignedOrAppeared",
          "label": "Item C4 - ever arraigned or appeared",
          "supply": "Were you ever arraigned, did you ever appear in court, and were you ever given a court date or a case number for this arrest?",
          "why": "the committed track registry records this as a required generation input for tn_arrest_no_court_record, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtFileExists",
          "label": "Item C5 - court file exists",
          "supply": "As far as you know, does any court file or court case exist for this arrest?",
          "why": "the committed track registry records this as a required generation input for tn_arrest_no_court_record, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_stateControlNumber",
          "label": "Item C6 - state control number",
          "supply": "What is the state control number on your TBI criminal history, and what does that history show about this arrest?",
          "why": "the committed track registry records this as a required generation input for tn_arrest_no_court_record, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionThatCourtRecorded",
          "label": "Item C7 - disposition that court recorded",
          "supply": "Did this arrest end in a dismissal, a no true bill, a nolle prosequi, an acquittal, or a release without charge that the court actually recorded? If it did, the free § 40-32-106 route is the right one instead.",
          "why": "the committed track registry records this as a required generation input for tn_arrest_no_court_record, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_evidenceOfAbsence",
          "label": "Item C8 - evidence of absence",
          "supply": "Is there anything you can file that bears on there being no court record — a letter from a clerk, a records search result, anything else? (Asked because § 40-32-109(b) permits the petitioner to file evidence, not because anything is required.)",
          "why": "the committed track registry records this as a required generation input for tn_arrest_no_court_record, and the platform holds no value for it"
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
      "id": "tn_arrest_no_court_record-filing-instructions-2",
      "routeKey": "obligation:track-only:TN:tn_arrest_no_court_record",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear an arrest that never reached a courtroom",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear an arrest that never reached a courtroom)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction of an arrest record where the court has no history of the arrest, T.C.A. § 40-32-109.",
        "",
        "Expunction of the arrest record, with the § 40-32-110 effect expressly applied by § 40-32-109(f): the petitioner is entitled to have all public records destroyed, is restored in contemplation of law to the status occupied before the arrest, must not suffer adverse effects or collateral disabilities by virtue of the offence, and is not guilty of perjury for failing to acknowledge the arrest in response to any inquiry. A person whose arrest record exists but for whom the court with jurisdiction over the offence for which the person was arrested has no history of the arrest within the court's records. This is the participant whose arrest never produced a court file — the case that the § 40-32-106 route cannot reach, because that route runs to the court having jurisdiction in the previous action and here there is no previous action in that court's records. This is the only one of the four additions that does NOT run through § 40-32-108, and it is the only Tennessee route in the entire chapter on which the participant writes the operative petition. Section 40-32-109 contains no cross-reference to § 40-32-108 of any kind, so § 40-32-108(e) — under which the office of the district attorney general must prepare the petition and proposed order — does not reach it. It also carries no waiting period, no 61-day pre-order clock, no rebuttable presumption and no two-year refiling bar, all of which live in § 40-32-108 alone. Section 40-32-109(a) uses the permissive 'may petition', where § 40-32-108(a) uses 'shall petition'. Codified through Public Chapter 608. Untouched by Public Chapters 719, 930 and 1061. Six subsections, (a) through (f), with no further subdivision numbering.",
        "",
        "WHERE IT GOES",
        "",
        "The court with jurisdiction over the offence for which the person was arrested, filed through its clerk",
        "Upon filing, the clerk serves the petition on the district attorney general for that judicial district. Both the petitioner and the district attorney general may file evidence. The clerk's office searches the court's records and certifies to the court whether there is any history of the arrest. The court reviews the clerk's certification and all evidence, and may enter the order if it finds there is no history of the arrest within the court's record. The petition on this route is the participant's own operative statutory petition, not a request to another office: § 40-32-109 contains no cross-reference to § 40-32-108, so the district-attorney preparation duty at § 40-32-108(e) does not govern here. The clerk's certification under (c) and the court's order under (d) remain instruments of their own actors and neither is generated or pre-completed.",
        "Venue: The court with jurisdiction over the offence for which the person was arrested, per § 40-32-109(a). The section states that forum inside the eligibility clause rather than as a standalone filing directive, and supplies it by implication: it is the court whose records the clerk searches under (c) and whose clerk serves the district attorney general under (a). Service is on the district attorney general for that judicial district, which is the only express geographic anchor. There is no residence-based venue and no alternative forum.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A clerk's fee applies and is mandatory. Section 40-32-109(e) provides that a person petitioning the court for expunction pursuant to the section must be charged the appropriate clerk's fee pursuant to T.C.A. § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed Tennessee Code and was not retrievable from an official Tennessee source, so no figure is quoted. This is the material difference from the § 40-32-106 route, which is free. Fee waiver as recorded: None established. Section 40-32-109 contains no indigency, waiver or without-cost provision, in express contrast to § 40-32-106(a)(1). Whether any general court-cost waiver reaches it was not established and none is asserted.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general for that judicial district on filing. Both the petitioner and the district attorney general may file evidence with the court under § 40-32-109(b).",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- No TBI certificate step arises on this route. Section 40-32-102(c)(1) expressly exempts the court from submitting a certificate where the expungement is pursuant to § 40-32-109, and § 40-32-109(d) directs the court to review only the clerk's certification and the evidence submitted.",
        "- Payment of the clerk's fee under T.C.A. § 8-21-401, which § 40-32-109(e) makes mandatory. There is no indigency, waiver or without-cost provision in § 40-32-109, in express contrast to § 40-32-106(a)(1). The participant must be told this route is not free before anything is prepared.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- The court does in fact have a record of the arrest. That takes the participant out of this route entirely and into the § 40-32-106 analysis, which is the free route; the participant is redirected there rather than handed off.",
        "- The district attorney general files evidence that the court does have a history of the arrest. That converts the matter into a contested question of fact and the participant is handed off to an attorney.",
        "- Whether a prior court action or court file ever existed is disputed. LegalEase does not adjudicate that question: the clerk searches and certifies and the court finds, so a disputed history is handed off to an attorney.",
        "- The participant cannot establish from the TBI criminal history that an arrest record exists at all. The participant is directed back to the TBI before the route reopens.",
        "- The participant is seeking relief for a case that reached the court and was dismissed, no-true-billed, nolle prossed or acquitted. That is the free § 40-32-106 route and the participant is redirected to it rather than paying here.",
        "- Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them.",
        "- The clerk's office searches the court's records and certifies to the court whether there is any history of the arrest. That certification is a clerk instrument, it is filed either way because it certifies whether there is any history, and it is never generated, pre-completed or predicted. The district attorney general is served by the clerk and may file evidence under (b). The court reviews and decides, and the grant is discretionary.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_arrest_no_court_record-petition-1: the composed petition, on this route's own statutory ground (Clear an arrest that never reached a courtroom)"
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
      "id": "tn_illegal_voting-participant-request-to-district-attorney-1",
      "routeKey": "obligation:track-only:TN:tn_illegal_voting",
      "title": "Request to the District Attorney General - Clear a conviction for illegal registration or voting",
      "role": "participant_request_to_district_attorney",
      "description": "the written request to the prosecutor's office the record names as the preparer (Clear a conviction for illegal registration or voting)",
      "condition": null,
      "body": [
        "TO: The office of the District Attorney General for the judicial district of the convicting court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST TO THE DISTRICT ATTORNEY GENERAL",
        "",
        "I am making the written request described below.",
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
      "id": "tn_illegal_voting-participant-eligibility-record-2",
      "routeKey": "obligation:track-only:TN:tn_illegal_voting",
      "title": "Eligibility Record - Clear a conviction for illegal registration or voting",
      "role": "participant_eligibility_record",
      "description": "the participant's own record of the facts the prosecutor's office will need (Clear a conviction for illegal registration or voting)",
      "condition": null,
      "body": [
        "TO: The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "ELIGIBILITY RECORD",
        "",
        "This page records, in one place, the facts the office named above will need in order to act. It is mine to complete from my own records.",
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
      "id": "tn_illegal_voting-filing-instructions-3",
      "routeKey": "obligation:track-only:TN:tn_illegal_voting",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a conviction for illegal registration or voting",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a conviction for illegal registration or voting)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction of a conviction for illegal registration or voting, T.C.A. § 40-32-107(c) with procedure at § 40-32-108.",
        "",
        "Expunction of the conviction record. Under T.C.A. § 40-32-110 the petitioner is entitled to have all public records of the expunged conviction destroyed in the manner set out in the chapter, restoring the person in contemplation of law to the status occupied before arrest, indictment, information, trial and conviction. A person convicted of illegal registration or voting under T.C.A. § 2-19-107, where fifteen years have elapsed since completion of the sentence, every sentence requirement has been fulfilled, the offence occurred prior to any conviction for an expunction-ineligible offence, and the person has not previously been granted expunction under § 40-32-107(a), (b) or (c). The fifteen-year wait is the longest in the chapter — three times the misdemeanour and Class E felony period and half again the Class C and D felony period — and it attaches to a single named offence rather than to an offence class. Codified through Public Chapter 608 and untouched by Public Chapters 719, 930 and 1061. Subsection (c) is not reached by the § 40-32-108(d)(2) rebuttable presumption, which is keyed only to petitioners eligible under § 40-32-107(a)(1)(A) to (E), so no presumption applies and the court weighs the interest of the petitioner against the best interests of justice and public safety.",
        "",
        "WHERE IT GOES",
        "",
        "The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court",
        "Once the district attorney general's office prepares the petition and proposed order, the petitioner files them with the clerk of the convicting court under § 40-32-108(a) and pays the clerk's fee under T.C.A. § 8-21-401. The generated artifact on this route is the participant's own controlled written request to the office of the district attorney general, together with the participant's controlled eligibility record. It is not the statutory petition and it is not the proposed order: T.C.A. § 40-32-108(e) requires both of those to be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk. LegalEase does not draft, complete, sign or hold out either instrument as its own, and does not make the district attorney general's legal determination.",
        "Venue: The convicting court, under § 40-32-108(a). The request goes to the district attorney general for that judicial district. A person with convictions in more than one judicial district deals with each separately.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A clerk's fee applies. T.C.A. § 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed Tennessee Code and was not retrievable from an official Tennessee source, so no figure is quoted. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized T.C.A. §§ 40-32-106 through 40-32-110. None is asserted.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner and may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The TBI certificate under T.C.A. § 40-32-102(c) is required on this route and an order of expunction must not be entered unless it is attached. It is a court instrument completed by court staff and submitted to the TBI. LegalEase does not generate it, does not complete it and does not assert it has been obtained.",
        "- Not official_pdf_fill, because no participant form exists: the Tennessee AOC publishes no expunction form of any kind, and TBI form BI-0333 is a court order carrying an approved-for-entry block with signature lines for defence, the district attorney general and the judge. Not process_guidance, because a genuine participant-facing written submission exists and its destination, addressee and operative content are all determined. The generated artifact is the request and the eligibility record, never the petition, the proposed order, the TBI certificate or the clerk's instrument.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- The office of the district attorney general declines to prepare the petition, or indicates it will oppose. Self-help stops and the participant is handed off to an attorney; the participant keeps the generated request, the controlled factual record and the instructions.",
        "- Eligibility is disputed by the district attorney general's office. That is a contested determination for that office and, on filing, for the court; it is handed off to an attorney rather than argued in the packet.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. Handed off to an attorney before anything is sent.",
        "- Any unpaid court costs, fines, restitution or other assessments, which mean the sentence is not complete. The participant is directed to the convicting court's clerk to resolve the balance before the route reopens.",
        "- Any borderline offence whose exact section cannot be matched against the current eligible list. Handed off to an attorney.",
        "- Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them.",
        "- Any question whether the conviction was under T.C.A. § 2-19-107 rather than another elections or fraud provision. The route reaches only that section, so an unresolved identification is handed off to an attorney rather than guessed.",
        "- Any collateral question about restoration of voting rights, which is a separate remedy under separate machinery and is referred out.",
        "- Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. They are prosecutor instruments. LegalEase generates the participant's request and eligibility record and nothing else, and never characterises either generated document as the district attorney general's petition or proposed order.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_illegal_voting-participant-request-to-district-attorney-1: the written request to the prosecutor's office the record names as the preparer (Clear a conviction for illegal registration or voting)",
        "- tn_illegal_voting-participant-eligibility-record-2: the participant's own record of the facts the prosecutor's office will need (Clear a conviction for illegal registration or voting)"
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
      "id": "tn_mistaken_identity-petition-1",
      "routeKey": "obligation:track-only:TN:tn_mistaken_identity",
      "title": "Petition - Clear an arrest that was not yours",
      "role": "petition",
      "description": "the composed petition, on this route's own statutory ground (Clear an arrest that was not yours)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The county criminal, circuit or general sessions court having jurisdiction in the previous action - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "EXPUNCTION WHERE THE PERSON WAS ARRESTED OR CHARGED DUE TO MISTAKEN IDENTITY, T.C.A. § 40-32-106(A)(1)(H)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under T.C.A. § 40-32-106(a)(1)(H); T.C.A. § 40-32-101; T.C.A. § 40-32-106(a)(1); T.C.A. § 40-32-102(d); T.C.A. § 40-32-110 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Mistaken identity is one of the enumerated non-conviction grounds in the reorganized § 40-32-106(a)(1), and Public Chapter 268 of 2025 rewrote § 40-32-101 as a chapter-wide definitions section that defines mistaken identity for the whole chapter. Relief runs on the same free petition vehicle as the other non-conviction grounds, with an added factual showing that the person was arrested or charged because of a case of mistaken identity. The pre-reorganization provision the controlling review cited, former § 40-32-101(a)(1)(C)(i), also allowed the petitioner to provide evidence of the circumstances and request that the court order the expunction be expedited, on which finding the court was to order the TBI and any other expunging entity to act in an expedited manner. Whether that expedited-order duty survived the reorganization in the same terms was not established from an official source on 2026-08-06, and it is not asserted here.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - originating court] Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - docket number] What is the docket or case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - offence and disposition] What was the charge, and exactly how did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - disposition date] On what date did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - state control number] What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - other convictions] List every other conviction you have anywhere, including federal and out-of-state.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - citizenship or clearance] Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - mistaken identity account] In your own words, how did this arrest or charge come to be attached to your name when it was not you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - identity evidence] What do you have that shows it was not you — where you were at the time, identification documents, fingerprints, or anything else?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - expedited needed] Is there a job, a licence or a housing application that makes speed matter here?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under T.C.A. § 40-32-106(a)(1)(H); T.C.A. § 40-32-101; T.C.A. § 40-32-106(a)(1); T.C.A. § 40-32-102(d); T.C.A. § 40-32-110.",
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
          "id": "fact_originatingCourt",
          "label": "Item C1 - originating court",
          "supply": "Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_docketNumber",
          "label": "Item C2 - docket number",
          "supply": "What is the docket or case number?",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenceAndDisposition",
          "label": "Item C3 - offence and disposition",
          "supply": "What was the charge, and exactly how did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDate",
          "label": "Item C4 - disposition date",
          "supply": "On what date did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_stateControlNumber",
          "label": "Item C5 - state control number",
          "supply": "What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_otherConvictions",
          "label": "Item C6 - other convictions",
          "supply": "List every other conviction you have anywhere, including federal and out-of-state.",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_citizenshipOrClearance",
          "label": "Item C7 - citizenship or clearance",
          "supply": "Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mistakenIdentityAccount",
          "label": "Item C8 - mistaken identity account",
          "supply": "In your own words, how did this arrest or charge come to be attached to your name when it was not you?",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_identityEvidence",
          "label": "Item C9 - identity evidence",
          "supply": "What do you have that shows it was not you — where you were at the time, identification documents, fingerprints, or anything else?",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_expeditedNeeded",
          "label": "Item C10 - expedited needed",
          "supply": "Is there a job, a licence or a housing application that makes speed matter here?",
          "why": "the committed track registry records this as a required generation input for tn_mistaken_identity, and the platform holds no value for it"
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
      "id": "tn_mistaken_identity-expedited-request-2",
      "routeKey": "obligation:track-only:TN:tn_mistaken_identity",
      "title": "Request for Expedited Consideration - Clear an arrest that was not yours",
      "role": "expedited_request",
      "description": "the written request asking for the matter to be taken up quickly (Clear an arrest that was not yours)",
      "condition": null,
      "body": [
        "TO: The county criminal, circuit or general sessions court having jurisdiction in the previous action",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST FOR EXPEDITED CONSIDERATION",
        "",
        "I am asking for this matter to be taken up quickly, for the reason I give below.",
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
      "id": "tn_mistaken_identity-filing-instructions-3",
      "routeKey": "obligation:track-only:TN:tn_mistaken_identity",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear an arrest that was not yours",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear an arrest that was not yours)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction where the person was arrested or charged due to mistaken identity, T.C.A. § 40-32-106(a)(1)(H).",
        "",
        "Mistaken identity is one of the enumerated non-conviction grounds in the reorganized § 40-32-106(a)(1), and Public Chapter 268 of 2025 rewrote § 40-32-101 as a chapter-wide definitions section that defines mistaken identity for the whole chapter. Relief runs on the same free petition vehicle as the other non-conviction grounds, with an added factual showing that the person was arrested or charged because of a case of mistaken identity. The pre-reorganization provision the controlling review cited, former § 40-32-101(a)(1)(C)(i), also allowed the petitioner to provide evidence of the circumstances and request that the court order the expunction be expedited, on which finding the court was to order the TBI and any other expunging entity to act in an expedited manner. Whether that expedited-order duty survived the reorganization in the same terms was not established from an official source on 2026-08-06, and it is not asserted here.",
        "",
        "WHERE IT GOES",
        "",
        "The county criminal, circuit or general sessions court having jurisdiction in the previous action",
        "Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search.",
        "Venue: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: None. Mistaken identity is one of the § 40-32-106(a)(1) grounds, and those records must be removed and destroyed without cost to the person. Fee waiver as recorded: Not applicable — no fee is charged.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general in the ordinary course.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any dispute with the district attorney general about eligibility, or any indication the office will oppose.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee.",
        "- Unpaid court costs, fines or restitution, which mean the sentence is not complete.",
        "- Any DUI, sexual offence or registration matter.",
        "- Any domestic violence or child-victim offence.",
        "- Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach.",
        "- Immigration consequences, and any security-clearance question.",
        "- Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering.",
        "- Any dispute about whether the participant is in fact the person arrested or charged. Proving mistaken identity is a factual showing, and a contested one is outside self-help.",
        "- The participant cannot document the circumstances at all.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_mistaken_identity-petition-1: the composed petition, on this route's own statutory ground (Clear an arrest that was not yours)",
        "- tn_mistaken_identity-expedited-request-2: the written request asking for the matter to be taken up quickly (Clear an arrest that was not yours)"
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
      "id": "tn_nonconviction_petition-petition-1",
      "routeKey": "obligation:track-only:TN:tn_nonconviction_petition",
      "title": "Petition - Clear a charge that did not end in a conviction",
      "role": "petition",
      "description": "the composed petition, on this route's own statutory ground (Clear a charge that did not end in a conviction)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The county criminal, circuit or general sessions court having jurisdiction in the previous action - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "FREE EXPUNCTION OF A NON-CONVICTION RECORD BY PETITION, T.C.A. § 40-32-106(A)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under T.C.A. § 40-32-106(a)(1); T.C.A. § 40-32-106(a)(2); T.C.A. § 40-32-102; T.C.A. § 40-32-102(d); T.C.A. § 40-32-102(e); T.C.A. § 40-32-110; T.C.A. § 40-6-204(b) and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Created by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608 effective 2026-03-25. All public records of a person charged with a misdemeanour or felony must, upon petition by that person to the court having jurisdiction in the previous action, be removed and destroyed without cost to the person where the charge was dismissed other than by diversion completion, a no true bill was returned, the person was arrested and released without being charged, a nolle prosequi was entered, a verdict of not guilty was returned, or on the section's further grounds including qualifying implied-consent dismissals, abatement by death, mistaken identity and racial-justice-protest convictions. Subsection (a)(2) extends the same no-cost treatment to a successfully defended order of protection and to expired bonds under § 38-3-109. There is no waiting period. The TBI certificate under § 40-32-102(c) is not required for a § 40-32-106 expunction unless the expunction resulted from successful completion of pretrial or judicial diversion. Under § 40-32-110 expunction restores the person, in contemplation of law, to the status occupied before arrest, indictment, information, trial and conviction, and under § 40-32-102(e) the expunged records are confidential and unlawful release is a Class A misdemeanour.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - originating court] Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - docket number] What is the docket or case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - offence and disposition] What was the charge, and exactly how did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - disposition date] On what date did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - state control number] What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - other convictions] List every other conviction you have anywhere, including federal and out-of-state.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - citizenship or clearance] Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - disposition ground] Which of these describes how the case ended — dismissed, no true bill returned by the grand jury, arrested and released without being charged, nolle prosequi, or found not guilty?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - came through diversion] Was the case dismissed because you completed a diversion programme? If so this is a different, non-free route.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - any count convicted] Did any count in the case end in a conviction?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - other counties] Do you have cases in any other Tennessee county? Each county needs its own filing.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - court file ever existed] Did a court case, a court file or any previous court action ever exist for this matter — were you arraigned, did you appear, were you given a court date or a case number? If nothing ever reached the court, a different route applies and it carries a fee.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under T.C.A. § 40-32-106(a)(1); T.C.A. § 40-32-106(a)(2); T.C.A. § 40-32-102; T.C.A. § 40-32-102(d); T.C.A. § 40-32-102(e); T.C.A. § 40-32-110; T.C.A. § 40-6-204(b).",
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
          "id": "fact_originatingCourt",
          "label": "Item C1 - originating court",
          "supply": "Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_docketNumber",
          "label": "Item C2 - docket number",
          "supply": "What is the docket or case number?",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenceAndDisposition",
          "label": "Item C3 - offence and disposition",
          "supply": "What was the charge, and exactly how did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDate",
          "label": "Item C4 - disposition date",
          "supply": "On what date did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_stateControlNumber",
          "label": "Item C5 - state control number",
          "supply": "What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_otherConvictions",
          "label": "Item C6 - other convictions",
          "supply": "List every other conviction you have anywhere, including federal and out-of-state.",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_citizenshipOrClearance",
          "label": "Item C7 - citizenship or clearance",
          "supply": "Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionGround",
          "label": "Item C8 - disposition ground",
          "supply": "Which of these describes how the case ended — dismissed, no true bill returned by the grand jury, arrested and released without being charged, nolle prosequi, or found not guilty?",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_cameThroughDiversion",
          "label": "Item C9 - came through diversion",
          "supply": "Was the case dismissed because you completed a diversion programme? If so this is a different, non-free route.",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_anyCountConvicted",
          "label": "Item C10 - any count convicted",
          "supply": "Did any count in the case end in a conviction?",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_otherCounties",
          "label": "Item C11 - other counties",
          "supply": "Do you have cases in any other Tennessee county? Each county needs its own filing.",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtFileEverExisted",
          "label": "Item C12 - court file ever existed",
          "supply": "Did a court case, a court file or any previous court action ever exist for this matter — were you arraigned, did you appear, were you given a court date or a case number? If nothing ever reached the court, a different route applies and it carries a fee.",
          "why": "the committed track registry records this as a required generation input for tn_nonconviction_petition, and the platform holds no value for it"
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
      "id": "tn_nonconviction_petition-filing-instructions-2",
      "routeKey": "obligation:track-only:TN:tn_nonconviction_petition",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a charge that did not end in a conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a charge that did not end in a conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Free expunction of a non-conviction record by petition, T.C.A. § 40-32-106(a).",
        "",
        "Created by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608 effective 2026-03-25. All public records of a person charged with a misdemeanour or felony must, upon petition by that person to the court having jurisdiction in the previous action, be removed and destroyed without cost to the person where the charge was dismissed other than by diversion completion, a no true bill was returned, the person was arrested and released without being charged, a nolle prosequi was entered, a verdict of not guilty was returned, or on the section's further grounds including qualifying implied-consent dismissals, abatement by death, mistaken identity and racial-justice-protest convictions. Subsection (a)(2) extends the same no-cost treatment to a successfully defended order of protection and to expired bonds under § 38-3-109. There is no waiting period. The TBI certificate under § 40-32-102(c) is not required for a § 40-32-106 expunction unless the expunction resulted from successful completion of pretrial or judicial diversion. Under § 40-32-110 expunction restores the person, in contemplation of law, to the status occupied before arrest, indictment, information, trial and conviction, and under § 40-32-102(e) the expunged records are confidential and unlawful release is a Class A misdemeanour.",
        "",
        "WHERE IT GOES",
        "",
        "The county criminal, circuit or general sessions court having jurisdiction in the previous action",
        "Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search.",
        "Venue: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: None. Section 40-32-106(a)(1) requires the records to be removed and destroyed without cost to the person, and the general assembly's stated intent is that no fee ever be charged where the charge was dismissed for a reason other than successful diversion completion. Fee waiver as recorded: Not applicable on this route — no fee is charged. Where a clerk nonetheless assesses court costs on the underlying case, the AOC indicates those may be waivable, but no mechanism or form is identified.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general in the ordinary course. The district attorney may respond.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing.",
        "- Add T.C.A. § 40-6-204(b) to participant education: a person being charged with a crime must be informed that if the charges are dismissed or nolle prossed, or no charges are filed, they are entitled on request to removal and destruction of all public records without cost. Participants often do not know this was said to them. The current text of § 40-6-204 could not be retrieved from an official Tennessee source on 2026-08-06, so the packet names the right and its statutory home without quoting the provision.",
        "- The court certifies to the TBI before entry where a certificate is required, and forwards the order within 30 days. On this route no certificate is required unless the case came through diversion.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any dispute with the district attorney general about eligibility, or any indication the office will oppose.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee.",
        "- Unpaid court costs, fines or restitution, which mean the sentence is not complete.",
        "- Any DUI, sexual offence or registration matter.",
        "- Any domestic violence or child-victim offence.",
        "- Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach.",
        "- Immigration consequences, and any security-clearance question.",
        "- Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering.",
        "- Any count in the case resulted in a conviction, which routes to the redaction analysis.",
        "- The dismissal followed completion of a diversion programme, which routes to the diversion tracks.",
        "- The participant is being asked to pay for this route, which the statute says is free.",
        "- Whether any court case, court file or previous court action ever existed is disputed or cannot be established. LegalEase does not adjudicate that question; the participant is handed off to an attorney, and where the answer is that nothing reached the court the route is tn_arrest_no_court_record rather than this one.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_nonconviction_petition-petition-1: the composed petition, on this route's own statutory ground (Clear a charge that did not end in a conviction)"
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
      "id": "tn_post_pardon-participant-request-to-district-attorney-1",
      "routeKey": "obligation:track-only:TN:tn_post_pardon",
      "title": "Request to the District Attorney General - Clear a conviction you have been pardoned for",
      "role": "participant_request_to_district_attorney",
      "description": "the written request to the prosecutor's office the record names as the preparer (Clear a conviction you have been pardoned for)",
      "condition": null,
      "body": [
        "TO: The office of the District Attorney General for the judicial district of the convicting court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST TO THE DISTRICT ATTORNEY GENERAL",
        "",
        "I am making the written request described below.",
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
      "id": "tn_post_pardon-participant-eligibility-record-2",
      "routeKey": "obligation:track-only:TN:tn_post_pardon",
      "title": "Eligibility Record - Clear a conviction you have been pardoned for",
      "role": "participant_eligibility_record",
      "description": "the participant's own record of the facts the prosecutor's office will need (Clear a conviction you have been pardoned for)",
      "condition": null,
      "body": [
        "TO: The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "ELIGIBILITY RECORD",
        "",
        "This page records, in one place, the facts the office named above will need in order to act. It is mine to complete from my own records.",
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
      "id": "tn_post_pardon-filing-instructions-3",
      "routeKey": "obligation:track-only:TN:tn_post_pardon",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a conviction you have been pardoned for",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a conviction you have been pardoned for)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction of a pardoned conviction, T.C.A. § 40-32-107(d) as amended by Public Chapter 719, with procedure at § 40-32-108.",
        "",
        "Expunction of the pardoned conviction record, with the § 40-32-110 effect. The pardon by itself does not clear the record; it opens this route. A person who received a pardon from the Governor following a positive vote of the Board of Parole recommending it, who petitions the convicting court, and whose conviction the judge finds was not for one of seven enumerated felonies, or an attempt, conspiracy, facilitation or solicitation to commit one of them: first degree murder under § 39-13-202; second degree murder under § 39-13-210; especially aggravated kidnapping under § 39-13-305; aggravated child abuse under § 39-15-402; especially aggravated robbery under § 39-13-403; commission of an act of terrorism under § 39-13-805; or a sexual offence for which the offender must register as a sexual offender or violent sexual offender under chapter 39, part 2 of title 40, or any sexual offence involving a minor. Codified through Public Chapter 608 and then amended by Public Chapter 719, effective 2026-04-14. Public Chapter 719 Section 1 deleted from § 40-32-107(d)(1) the language 'was convicted of a nonviolent crime if the person', and Section 2 deleted and substituted § 40-32-107(d)(1)(A), replacing an open-textured judicial finding that the offence was a nonviolent crime with a closed list of excluded felonies. Public Chapter 719 Section 3 rewrote § 40-32-108(d)(2). Confirmed from the enacted text and material to the design: subsection (d) contains no waiting period, no sentence-completion checklist, no no-prior-expunction bar and no requirement that the offence predate a conviction for an expunction-ineligible offence. Those conditions appear in subsections (b) and (c) but not in (d). Its three requirements at (d)(1)(A), (B) and (C) are cumulative and exhaustive: the judicial finding against the seven-item exclusion list, a positive vote from the board of parole to receive a pardon, and receipt of a pardon by the governor. The eligibility screen for this route must therefore not import the (a) or (c) conditions, which would wrongly refuse petitioners the statute admits. Public Chapter 719 Section 3 rewrote § 40-32-108(d)(2) so that the court weighs the interest of the petitioner against the best interests of justice and public safety; the rebuttable presumption that the petition should be granted is preserved only for petitioners eligible under § 40-32-107(a)(1)(A) to (E). A subsection (d) petitioner therefore gets no presumption, and the court instead considers whether the offence sought to be expunged was violent and any other relevant factors presented by the petitioner and the district attorney general. Violence moved from a jurisdictional bar to a merits consideration.",
        "",
        "WHERE IT GOES",
        "",
        "The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court",
        "Once the district attorney general's office prepares the petition and proposed order, the petitioner files them with the clerk of the convicting court under § 40-32-108(a) and pays the clerk's fee under T.C.A. § 8-21-401. The generated artifact on this route is the participant's own controlled written request to the office of the district attorney general, together with the participant's controlled eligibility record. It is not the statutory petition and it is not the proposed order: T.C.A. § 40-32-108(e) requires both of those to be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk. LegalEase does not draft, complete, sign or hold out either instrument as its own, and does not make the district attorney general's legal determination.",
        "Venue: The convicting court, under § 40-32-108(a). The request goes to the district attorney general for that judicial district. A person with convictions in more than one judicial district deals with each separately.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A clerk's fee applies. T.C.A. § 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed Tennessee Code and was not retrievable from an official Tennessee source, so no figure is quoted. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized T.C.A. §§ 40-32-106 through 40-32-110. None is asserted.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner and may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The TBI certificate under T.C.A. § 40-32-102(c) is required on this route and an order of expunction must not be entered unless it is attached. It is a court instrument completed by court staff and submitted to the TBI. LegalEase does not generate it, does not complete it and does not assert it has been obtained.",
        "- Not official_pdf_fill, because no participant form exists: the Tennessee AOC publishes no expunction form of any kind, and TBI form BI-0333 is a court order carrying an approved-for-entry block with signature lines for defence, the district attorney general and the judge. Not process_guidance, because a genuine participant-facing written submission exists and its destination, addressee and operative content are all determined. The generated artifact is the request and the eligibility record, never the petition, the proposed order, the TBI certificate or the clerk's instrument.",
        "- Public Chapter 719 Section 3 rewrote § 40-32-108(d)(2) so that the court weighs the interest of the petitioner against the best interests of justice and public safety; the rebuttable presumption that the petition should be granted is preserved only for petitioners eligible under § 40-32-107(a)(1)(A) to (E). A subsection (d) petitioner therefore gets no presumption, and the court instead considers whether the offence sought to be expunged was violent and any other relevant factors presented by the petitioner and the district attorney general. Violence moved from a jurisdictional bar to a merits consideration.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- The office of the district attorney general declines to prepare the petition, or indicates it will oppose. Self-help stops and the participant is handed off to an attorney; the participant keeps the generated request, the controlled factual record and the instructions.",
        "- Eligibility is disputed by the district attorney general's office. That is a contested determination for that office and, on filing, for the court; it is handed off to an attorney rather than argued in the packet.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. Handed off to an attorney before anything is sent.",
        "- Any unpaid court costs, fines, restitution or other assessments, which mean the sentence is not complete. The participant is directed to the convicting court's clerk to resolve the balance before the route reopens.",
        "- Any borderline offence whose exact section cannot be matched against the current eligible list. Handed off to an attorney.",
        "- Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them.",
        "- Any case where the conviction may fall within one of the seven excluded felony categories, or within an attempt, conspiracy, facilitation or solicitation form of one. Handed off to an attorney rather than tested in the packet.",
        "- Any case where the violence question is genuinely contested. After Public Chapter 719 it is a merits factor the court weighs, and arguing it is individualized advocacy; the participant is handed off to an attorney.",
        "- Any participant who does not yet hold a pardon. The clemency application is a separate proceeding before the board of parole and the Governor and is referred out.",
        "- Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. They are prosecutor instruments. LegalEase generates the participant's request and eligibility record and nothing else, and never characterises either generated document as the district attorney general's petition or proposed order.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_post_pardon-participant-request-to-district-attorney-1: the written request to the prosecutor's office the record names as the preparer (Clear a conviction you have been pardoned for)",
        "- tn_post_pardon-participant-eligibility-record-2: the participant's own record of the facts the prosecutor's office will need (Clear a conviction you have been pardoned for)"
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
      "id": "tn_pretrial_diversion-petition-1",
      "routeKey": "obligation:track-only:TN:tn_pretrial_diversion",
      "title": "Petition - Clear a case after completing pretrial diversion",
      "role": "petition",
      "description": "the composed petition, on this route's own statutory ground (Clear a case after completing pretrial diversion)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The county criminal, circuit or general sessions court having jurisdiction in the previous action - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "EXPUNCTION AFTER SUCCESSFUL COMPLETION OF PRETRIAL DIVERSION, T.C.A. § 40-32-106(D)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under T.C.A. § 40-32-106(d)(1); T.C.A. § 40-32-106(d)(2); T.C.A. § 40-32-106(d)(3); T.C.A. §§ 40-15-102 through 40-15-107; T.C.A. § 40-15-105; T.C.A. § 40-32-102(c); T.C.A. § 8-21-401; T.C.A. § 40-39-202 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Prosecution is suspended under a memorandum of understanding with the district attorney general; the person does not plead guilty and is not found guilty. On successful completion the charges are dismissed, and under T.C.A. § 40-32-106(d)(1) the person may then petition for expunction of the public records where the charges were dismissed as a result of successful completion of a pretrial diversion programme pursuant to §§ 40-15-102 through 40-15-107. The provision is permissive as to filing and mandatory as to nothing: a petition is required and expunction is not automatic. Section 40-32-106(d)(3) requires the appropriate clerk's fee under § 8-21-401, so unlike a straight dismissal this route is not free. Section 40-32-106(d)(2) bars expunction where the diverted offence was a sexual offence or a violent sexual offence as defined in § 40-39-202. The TBI certificate under § 40-32-102(c) is required here, because the exemption for § 40-32-106 expunctions is expressly carved back where the expunction resulted from successful completion of pretrial diversion.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - originating court] Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - docket number] What is the docket or case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - offence and disposition] What was the charge, and exactly how did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - disposition date] On what date did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - state control number] What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - other convictions] List every other conviction you have anywhere, including federal and out-of-state.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - citizenship or clearance] Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - diversion kind] Was it pretrial diversion, where you did not plead guilty and prosecution was suspended, or judicial diversion, where you entered a plea but no judgment of conviction was entered?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - successfully completed] Did you successfully complete everything the diversion required, and were the charges then dismissed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - sexual offence] Was the offence a sexual offence or a violent sexual offence as Tennessee defines those for the registry? Those can be diverted but cannot be expunged.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - petition filed before] Have you already filed a petition to expunge this case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - mou with da] Did you sign a memorandum of understanding with the district attorney general suspending prosecution, without pleading guilty?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under T.C.A. § 40-32-106(d)(1); T.C.A. § 40-32-106(d)(2); T.C.A. § 40-32-106(d)(3); T.C.A. §§ 40-15-102 through 40-15-107; T.C.A. § 40-15-105; T.C.A. § 40-32-102(c); T.C.A. § 8-21-401; T.C.A. § 40-39-202.",
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
          "id": "fact_originatingCourt",
          "label": "Item C1 - originating court",
          "supply": "Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_docketNumber",
          "label": "Item C2 - docket number",
          "supply": "What is the docket or case number?",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenceAndDisposition",
          "label": "Item C3 - offence and disposition",
          "supply": "What was the charge, and exactly how did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDate",
          "label": "Item C4 - disposition date",
          "supply": "On what date did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_stateControlNumber",
          "label": "Item C5 - state control number",
          "supply": "What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_otherConvictions",
          "label": "Item C6 - other convictions",
          "supply": "List every other conviction you have anywhere, including federal and out-of-state.",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_citizenshipOrClearance",
          "label": "Item C7 - citizenship or clearance",
          "supply": "Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_diversionKind",
          "label": "Item C8 - diversion kind",
          "supply": "Was it pretrial diversion, where you did not plead guilty and prosecution was suspended, or judicial diversion, where you entered a plea but no judgment of conviction was entered?",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_successfullyCompleted",
          "label": "Item C9 - successfully completed",
          "supply": "Did you successfully complete everything the diversion required, and were the charges then dismissed?",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sexualOffence",
          "label": "Item C10 - sexual offence",
          "supply": "Was the offence a sexual offence or a violent sexual offence as Tennessee defines those for the registry? Those can be diverted but cannot be expunged.",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_petitionFiledBefore",
          "label": "Item C11 - petition filed before",
          "supply": "Have you already filed a petition to expunge this case?",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_mouWithDa",
          "label": "Item C12 - mou with da",
          "supply": "Did you sign a memorandum of understanding with the district attorney general suspending prosecution, without pleading guilty?",
          "why": "the committed track registry records this as a required generation input for tn_pretrial_diversion, and the platform holds no value for it"
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
      "id": "tn_pretrial_diversion-filing-instructions-2",
      "routeKey": "obligation:track-only:TN:tn_pretrial_diversion",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a case after completing pretrial diversion",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a case after completing pretrial diversion)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction after successful completion of pretrial diversion, T.C.A. § 40-32-106(d).",
        "",
        "Prosecution is suspended under a memorandum of understanding with the district attorney general; the person does not plead guilty and is not found guilty. On successful completion the charges are dismissed, and under T.C.A. § 40-32-106(d)(1) the person may then petition for expunction of the public records where the charges were dismissed as a result of successful completion of a pretrial diversion programme pursuant to §§ 40-15-102 through 40-15-107. The provision is permissive as to filing and mandatory as to nothing: a petition is required and expunction is not automatic. Section 40-32-106(d)(3) requires the appropriate clerk's fee under § 8-21-401, so unlike a straight dismissal this route is not free. Section 40-32-106(d)(2) bars expunction where the diverted offence was a sexual offence or a violent sexual offence as defined in § 40-39-202. The TBI certificate under § 40-32-102(c) is required here, because the exemption for § 40-32-106 expunctions is expressly carved back where the expunction resulted from successful completion of pretrial diversion.",
        "",
        "WHERE IT GOES",
        "",
        "The county criminal, circuit or general sessions court having jurisdiction in the previous action",
        "Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search.",
        "Venue: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A clerk's fee applies. Section 40-32-106(d)(3) requires the appropriate clerk's fee pursuant to T.C.A. § 8-21-401 for destroying the records, which is the asymmetry a participant should be warned about: diversion is a non-conviction outcome but it is not free, whereas a straight dismissal is. The amount is set by § 8-21-401 and no figure is quoted here. Fee waiver as recorded: No indigency or fee-waiver provision appears in the reorganized §§ 40-32-106 to 40-32-110. The TBI operates an unpublished indigency procedure for its separate diversion certificate fee, requiring a form signed by the judge that it supplies on request and does not publish. No waiver mechanism for the clerk's expunction fee was identified.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general in the ordinary course.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing.",
        "- A petition is still required after diversion. Completing diversion dismisses the case but leaves it visible until a separate expunction petition is filed, and this is the second most common Tennessee misunderstanding after the not-automatic point.",
        "- The order of expungement is marked Suspension of Prosecution § 40-15-105 for a pretrial diversion case, which is how the TBI records it. The marking requirement is part of the court's instrument rather than the participant's.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any dispute with the district attorney general about eligibility, or any indication the office will oppose.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee.",
        "- Unpaid court costs, fines or restitution, which mean the sentence is not complete.",
        "- Any DUI, sexual offence or registration matter.",
        "- Any domestic violence or child-victim offence.",
        "- Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach.",
        "- Immigration consequences, and any security-clearance question.",
        "- Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering.",
        "- The offence was a sexual offence or a violent sexual offence as defined in T.C.A. § 40-39-202. It could be diverted but it cannot be expunged, and the participant needs to be told that plainly rather than sold a petition.",
        "- The diversion was not successfully completed, or completion is disputed.",
        "- The participant's goal involves federal employment or a security clearance, since a judicial diversion guilty plea may remain visible there.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_pretrial_diversion-petition-1: the composed petition, on this route's own statutory ground (Clear a case after completing pretrial diversion)"
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
      "id": "tn_recovery_court-participant-request-to-district-attorney-1",
      "routeKey": "obligation:track-only:TN:tn_recovery_court",
      "title": "Request to the District Attorney General - Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "role": "participant_request_to_district_attorney",
      "description": "the written request to the prosecutor's office the record names as the preparer (Clear an eligible offence after finishing recovery court, where an old DUI is in the way)",
      "condition": null,
      "body": [
        "TO: The office of the District Attorney General for the judicial district of the convicting court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST TO THE DISTRICT ATTORNEY GENERAL",
        "",
        "I am making the written request described below.",
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
      "id": "tn_recovery_court-participant-eligibility-record-2",
      "routeKey": "obligation:track-only:TN:tn_recovery_court",
      "title": "Eligibility Record - Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "role": "participant_eligibility_record",
      "description": "the participant's own record of the facts the prosecutor's office will need (Clear an eligible offence after finishing recovery court, where an old DUI is in the way)",
      "condition": null,
      "body": [
        "TO: The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "ELIGIBILITY RECORD",
        "",
        "This page records, in one place, the facts the office named above will need in order to act. It is mine to complete from my own records.",
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
      "id": "tn_recovery_court-filing-instructions-3",
      "routeKey": "obligation:track-only:TN:tn_recovery_court",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear an eligible offence after finishing recovery court, where an old DUI is in the way)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction after completion of a certified recovery court programme following a prior DUI conviction, T.C.A. § 40-32-107(e) added by Public Chapter 1061, with procedure at § 40-32-108.",
        "",
        "Expunction of one otherwise-eligible offence, with the § 40-32-110 effect. It does not expunge the DUI. A person seeking expunction of an offence that is eligible for expunction under § 40-32-107(a)(1) and that occurred at least ten years after the person's conviction for an offence under T.C.A. § 55-10-401; who has fulfilled all requirements of the sentence for the offence being expunged, including payment of all fines, restitution, court costs and other assessments, completion of any term of imprisonment or probation, and meeting all conditions of supervised or unsupervised release; who has successfully completed a certified recovery court programme established under title 16; who has not previously been granted expunction under subsection (a), (b), (c) or (e); and who has not been convicted under § 55-10-401 more than one time. This is a relief-from-the-DUI-bar route, not a DUI-expunction route, and reading it the other way would be the single most damaging error available on it. A DUI under § 55-10-401 is itself expunction-ineligible and appears in the § 40-32-107(a)(1)(D) misdemeanour exclusion list, and § 40-32-107(e)(3) provides that a court shall not grant an expunction under the subsection if the offence sought to be expunged involves a motor vehicle and the use of alcohol or a controlled substance, including but not limited to a violation of § 55-10-401. What subsection (e) does is let a person who carries one DUI conviction expunge a different, otherwise-eligible offence committed at least ten years after it — relief that § 40-32-107(a)(3)(A) would otherwise deny, because that provision requires the offence to have occurred prior to any conviction for an expunction-ineligible offence. Added in its entirety by Public Chapter 1061, the Recovery Court Renewal Act, SB1232 / HB1346, effective 2026-07-01. Public Chapter 1061 Section 3 provides that the act takes effect July 1, 2026, the public welfare requiring it, and — unlike Public Chapter 930 — imposes no offence-date limitation, so it applies on its effective date to qualifying petitioners regardless of when the offence was committed. Subsection (e) is not named in the § 40-32-108(d)(2) rebuttable presumption, which reaches only petitioners eligible under § 40-32-107(a)(1)(A) to (E), and it is not reached by the violence-weighing sentence Public Chapter 719 added for subsection (d) petitioners. An (e) petitioner therefore falls into the bare default: the court weighs the interest of the petitioner against the best interests of justice and public safety.",
        "",
        "WHERE IT GOES",
        "",
        "The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court",
        "Once the district attorney general's office prepares the petition and proposed order, the petitioner files them with the clerk of the convicting court under § 40-32-108(a) and pays the clerk's fee under T.C.A. § 8-21-401. The generated artifact on this route is the participant's own controlled written request to the office of the district attorney general, together with the participant's controlled eligibility record. It is not the statutory petition and it is not the proposed order: T.C.A. § 40-32-108(e) requires both of those to be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk. LegalEase does not draft, complete, sign or hold out either instrument as its own, and does not make the district attorney general's legal determination.",
        "Venue: The convicting court, under § 40-32-108(a). The request goes to the district attorney general for that judicial district. A person with convictions in more than one judicial district deals with each separately.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A clerk's fee applies. T.C.A. § 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed Tennessee Code and was not retrievable from an official Tennessee source, so no figure is quoted. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized T.C.A. §§ 40-32-106 through 40-32-110. None is asserted.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner and may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- The TBI certificate under T.C.A. § 40-32-102(c) is required on this route and an order of expunction must not be entered unless it is attached. It is a court instrument completed by court staff and submitted to the TBI. LegalEase does not generate it, does not complete it and does not assert it has been obtained.",
        "- Not official_pdf_fill, because no participant form exists: the Tennessee AOC publishes no expunction form of any kind, and TBI form BI-0333 is a court order carrying an approved-for-entry block with signature lines for defence, the district attorney general and the judge. Not process_guidance, because a genuine participant-facing written submission exists and its destination, addressee and operative content are all determined. The generated artifact is the request and the eligibility record, never the petition, the proposed order, the TBI certificate or the clerk's instrument.",
        "- Subsection (e) is not named in the § 40-32-108(d)(2) rebuttable presumption, which reaches only petitioners eligible under § 40-32-107(a)(1)(A) to (E), and it is not reached by the violence-weighing sentence Public Chapter 719 added for subsection (d) petitioners. An (e) petitioner therefore falls into the bare default: the court weighs the interest of the petitioner against the best interests of justice and public safety.",
        "- Public Chapter 930 applies to this route only as the integrated decision states: it relocates burglary within the § 40-32-107(a)(1) class lists for offences committed on or after 2026-07-01, and reaches subsection (e) only because (e)(1)(A)(i) requires the offence to be eligible under (a)(1). Public Chapter 1061 itself carries no offence-date limitation.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- The office of the district attorney general declines to prepare the petition, or indicates it will oppose. Self-help stops and the participant is handed off to an attorney; the participant keeps the generated request, the controlled factual record and the instructions.",
        "- Eligibility is disputed by the district attorney general's office. That is a contested determination for that office and, on filing, for the court; it is handed off to an attorney rather than argued in the packet.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. Handed off to an attorney before anything is sent.",
        "- Any unpaid court costs, fines, restitution or other assessments, which mean the sentence is not complete. The participant is directed to the convicting court's clerk to resolve the balance before the route reopens.",
        "- Any borderline offence whose exact section cannot be matched against the current eligible list. Handed off to an attorney.",
        "- Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them.",
        "- The participant wants the DUI itself expunged. Subsection (e)(3) forbids it. The packet says so plainly and the participant is referred to an attorney if they want that question examined further.",
        "- The offence being expunged involves a motor vehicle and the use of alcohol or a controlled substance, which is an absolute bar under (e)(3) even where every other condition is met. Handed off to an attorney.",
        "- More than one conviction under T.C.A. § 55-10-401, which closes the route under (e)(1)(E). Handed off to an attorney.",
        "- The ten-year interval between the DUI conviction and the offence being expunged cannot be established from the judgments. The participant is directed to the clerks of both courts before the route reopens.",
        "- Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. They are prosecutor instruments. LegalEase generates the participant's request and eligibility record and nothing else, and never characterises either generated document as the district attorney general's petition or proposed order.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_recovery_court-participant-request-to-district-attorney-1: the written request to the prosecutor's office the record names as the preparer (Clear an eligible offence after finishing recovery court, where an old DUI is in the way)",
        "- tn_recovery_court-participant-eligibility-record-2: the participant's own record of the facts the prosecutor's office will need (Clear an eligible offence after finishing recovery court, where an old DUI is in the way)"
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
      "id": "tn_redaction-motion-for-partial-removal-1",
      "routeKey": "obligation:track-only:TN:tn_redaction",
      "title": "Motion for Partial Removal - Clear the dismissed counts in a case where other counts stuck",
      "role": "motion_for_partial_removal",
      "description": "the composed motion asking for removal of part of the record only (Clear the dismissed counts in a case where other counts stuck)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The county criminal, circuit or general sessions court having jurisdiction in the previous action - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "PARTIAL REMOVAL OF RECORDS OF CHARGES NOT RESULTING IN CONVICTION IN A MIXED CASE, T.C.A. § 40-32-106(C)(2)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under T.C.A. § 40-32-106(c)(2); T.C.A. § 40-32-106(a); T.C.A. § 40-32-102(d); T.C.A. § 40-32-110 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "The controlling review identified this remedy from a secondary profile and left its citation unresolved as the highest-value Tennessee research item. It is resolved: Public Chapter 268 of 2025 created a partial database removal provision at T.C.A. § 40-32-106(c)(2), and the TBI's own form BI-0334, revision 04/2025, is captioned Removal of Criminal Offender Record pursuant to T.C.A. § 40-32-106(c)(2), which corroborates both the citation and the mechanism from an official source. The remedy answers the most common real-world Tennessee scenario after a clean dismissal: a multi-count case where some counts were dismissed as part of a plea and others produced a conviction. Whether the relief reaches paper records or only electronic databases was not established, and the review flags that limitation as materially changing what a participant gets.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - originating court] Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - docket number] What is the docket or case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - offence and disposition] What was the charge, and exactly how did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - disposition date] On what date did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - state control number] What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - other convictions] List every other conviction you have anywhere, including federal and out-of-state.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - citizenship or clearance] Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - count by count disposition] Take the case count by count: what was each charge, and how did each one end? This route only reaches the counts that did not end in conviction.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - convicted counts] Which counts ended in a conviction? Those stay on your record.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - understands partial] This clears the dismissed counts and leaves the conviction. Is that what you are looking for?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under T.C.A. § 40-32-106(c)(2); T.C.A. § 40-32-106(a); T.C.A. § 40-32-102(d); T.C.A. § 40-32-110.",
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
          "id": "fact_originatingCourt",
          "label": "Item C1 - originating court",
          "supply": "Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_docketNumber",
          "label": "Item C2 - docket number",
          "supply": "What is the docket or case number?",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenceAndDisposition",
          "label": "Item C3 - offence and disposition",
          "supply": "What was the charge, and exactly how did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDate",
          "label": "Item C4 - disposition date",
          "supply": "On what date did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_stateControlNumber",
          "label": "Item C5 - state control number",
          "supply": "What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_otherConvictions",
          "label": "Item C6 - other convictions",
          "supply": "List every other conviction you have anywhere, including federal and out-of-state.",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_citizenshipOrClearance",
          "label": "Item C7 - citizenship or clearance",
          "supply": "Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_countByCountDisposition",
          "label": "Item C8 - count by count disposition",
          "supply": "Take the case count by count: what was each charge, and how did each one end? This route only reaches the counts that did not end in conviction.",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_convictedCounts",
          "label": "Item C9 - convicted counts",
          "supply": "Which counts ended in a conviction? Those stay on your record.",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_understandsPartial",
          "label": "Item C10 - understands partial",
          "supply": "This clears the dismissed counts and leaves the conviction. Is that what you are looking for?",
          "why": "the committed track registry records this as a required generation input for tn_redaction, and the platform holds no value for it"
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
      "id": "tn_redaction-count-by-count-schedule-2",
      "routeKey": "obligation:track-only:TN:tn_redaction",
      "title": "Count-by-Count Schedule - Clear the dismissed counts in a case where other counts stuck",
      "role": "count_by_count_schedule",
      "description": "the charge-by-charge schedule the motion refers to (Clear the dismissed counts in a case where other counts stuck)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The county criminal, circuit or general sessions court having jurisdiction in the previous action)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if one was assigned:",
        "{{DOTS}}",
        "",
        "COUNT-BY-COUNT SCHEDULE",
        "",
        "One block for each charge in the case. Copy the wording from the court record itself, never from memory. Leave the blocks you do not need empty.",
        "",
        "FIRST CHARGE",
        "",
        "Offence as the record words it:",
        "{{DOTS}}",
        "",
        "Statute section:",
        "{{DOTS}}",
        "",
        "What happened to this charge, and on what date:",
        "{{DOTS}}",
        "",
        "Is this charge one you are asking to have removed? Write yes or no:",
        "{{DOTS}}",
        "",
        "SECOND CHARGE",
        "",
        "Offence as the record words it:",
        "{{DOTS}}",
        "",
        "Statute section:",
        "{{DOTS}}",
        "",
        "What happened to this charge, and on what date:",
        "{{DOTS}}",
        "",
        "Is this charge one you are asking to have removed? Write yes or no:",
        "{{DOTS}}",
        "",
        "THIRD CHARGE",
        "",
        "Offence as the record words it:",
        "{{DOTS}}",
        "",
        "Statute section:",
        "{{DOTS}}",
        "",
        "What happened to this charge, and on what date:",
        "{{DOTS}}",
        "",
        "Is this charge one you are asking to have removed? Write yes or no:",
        "{{DOTS}}",
        "",
        "FOURTH CHARGE",
        "",
        "Offence as the record words it:",
        "{{DOTS}}",
        "",
        "Statute section:",
        "{{DOTS}}",
        "",
        "What happened to this charge, and on what date:",
        "{{DOTS}}",
        "",
        "Is this charge one you are asking to have removed? Write yes or no:",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this schedule personally.)",
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
          "kind": "court",
          "id": "schedule_case_number",
          "label": "Case number in the caption of the schedule, if the court assigns one at filing",
          "why": "if a number is assigned, the court assigns it at filing"
        },
        {
          "kind": "rbf",
          "id": "first_offence",
          "label": "Offence as the record words it, in the first charge block",
          "supply": "the offence wording for the first charge, copied exactly from the court record",
          "why": "no offence fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "first_section",
          "label": "Statute section, in the first charge block",
          "supply": "the statute section for the first charge, copied from the court record",
          "why": "no statute-section fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "first_outcome",
          "label": "What happened to this charge, and on what date, in the first charge block",
          "supply": "the disposition and its date for the first charge, copied from the court record",
          "why": "no disposition fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "first_asked",
          "label": "Whether removal is asked for this charge, in the first charge block",
          "supply": "write yes or no for the first charge, according to what you are asking the court to remove",
          "why": "which charges a participant asks about is the participant's own decision about their own record"
        },
        {
          "kind": "rbf",
          "id": "second_offence",
          "label": "Offence as the record words it, in the second charge block",
          "supply": "the offence wording for the second charge, copied exactly from the court record",
          "why": "no offence fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "second_section",
          "label": "Statute section, in the second charge block",
          "supply": "the statute section for the second charge, copied from the court record",
          "why": "no statute-section fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "second_outcome",
          "label": "What happened to this charge, and on what date, in the second charge block",
          "supply": "the disposition and its date for the second charge, copied from the court record",
          "why": "no disposition fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "second_asked",
          "label": "Whether removal is asked for this charge, in the second charge block",
          "supply": "write yes or no for the second charge, according to what you are asking the court to remove",
          "why": "which charges a participant asks about is the participant's own decision about their own record"
        },
        {
          "kind": "rbf",
          "id": "third_offence",
          "label": "Offence as the record words it, in the third charge block",
          "supply": "the offence wording for the third charge, copied exactly from the court record",
          "why": "no offence fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "third_section",
          "label": "Statute section, in the third charge block",
          "supply": "the statute section for the third charge, copied from the court record",
          "why": "no statute-section fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "third_outcome",
          "label": "What happened to this charge, and on what date, in the third charge block",
          "supply": "the disposition and its date for the third charge, copied from the court record",
          "why": "no disposition fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "third_asked",
          "label": "Whether removal is asked for this charge, in the third charge block",
          "supply": "write yes or no for the third charge, according to what you are asking the court to remove",
          "why": "which charges a participant asks about is the participant's own decision about their own record"
        },
        {
          "kind": "rbf",
          "id": "fourth_offence",
          "label": "Offence as the record words it, in the fourth charge block",
          "supply": "the offence wording for the fourth charge, copied exactly from the court record",
          "why": "no offence fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "fourth_section",
          "label": "Statute section, in the fourth charge block",
          "supply": "the statute section for the fourth charge, copied from the court record",
          "why": "no statute-section fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "fourth_outcome",
          "label": "What happened to this charge, and on what date, in the fourth charge block",
          "supply": "the disposition and its date for the fourth charge, copied from the court record",
          "why": "no disposition fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "fourth_asked",
          "label": "Whether removal is asked for this charge, in the fourth charge block",
          "supply": "write yes or no for the fourth charge, according to what you are asking the court to remove",
          "why": "which charges a participant asks about is the participant's own decision about their own record"
        },
        {
          "kind": "protected",
          "id": "schedule_signature",
          "label": "Signature of the person named in the caption, on the schedule",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "schedule_signature_date",
          "label": "Date beside the signature on the schedule",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "tn_redaction-filing-instructions-3",
      "routeKey": "obligation:track-only:TN:tn_redaction",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear the dismissed counts in a case where other counts stuck",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear the dismissed counts in a case where other counts stuck)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Partial removal of records of charges not resulting in conviction in a mixed case, T.C.A. § 40-32-106(c)(2).",
        "",
        "The controlling review identified this remedy from a secondary profile and left its citation unresolved as the highest-value Tennessee research item. It is resolved: Public Chapter 268 of 2025 created a partial database removal provision at T.C.A. § 40-32-106(c)(2), and the TBI's own form BI-0334, revision 04/2025, is captioned Removal of Criminal Offender Record pursuant to T.C.A. § 40-32-106(c)(2), which corroborates both the citation and the mechanism from an official source. The remedy answers the most common real-world Tennessee scenario after a clean dismissal: a multi-count case where some counts were dismissed as part of a plea and others produced a conviction. Whether the relief reaches paper records or only electronic databases was not established, and the review flags that limitation as materially changing what a participant gets.",
        "",
        "WHERE IT GOES",
        "",
        "The county criminal, circuit or general sessions court having jurisdiction in the previous action",
        "Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search.",
        "Venue: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: Not established for the partial removal itself. The § 40-32-106(a) no-cost provision is framed around removal and destruction of the public records of a person who has been charged, and whether it reaches a (c)(2) partial removal in a mixed case was not confirmed. No figure is quoted. Fee waiver as recorded: Not established for this route.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the motion on the district attorney general in the ordinary course.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any dispute with the district attorney general about eligibility, or any indication the office will oppose.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee.",
        "- Unpaid court costs, fines or restitution, which mean the sentence is not complete.",
        "- Any DUI, sexual offence or registration matter.",
        "- Any domestic violence or child-victim offence.",
        "- Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach.",
        "- Immigration consequences, and any security-clearance question.",
        "- Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering.",
        "- The participant expects the whole case cleared. This remedy leaves the conviction in place.",
        "- The count-by-count dispositions cannot be established from the clerk's record.",
        "- The participant needs the paper file cleared and not only the electronic databases, which is the limitation that was not resolved.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_redaction-motion-for-partial-removal-1: the composed motion asking for removal of part of the record only (Clear the dismissed counts in a case where other counts stuck)",
        "- tn_redaction-count-by-count-schedule-2: the charge-by-charge schedule the motion refers to (Clear the dismissed counts in a case where other counts stuck)"
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
      "id": "tn_eligible_conviction-request-to-district-attorney-1",
      "routeKey": "obligation:track-pathway:TN:tn_eligible_conviction:pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107",
      "title": "Request to the District Attorney General - Expunge an eligible conviction",
      "role": "request_to_district_attorney",
      "description": "the written request to the prosecutor's office the record names as the preparer (Expunge an eligible conviction)",
      "condition": null,
      "body": [
        "TO: The office of the District Attorney General for the judicial district of the convicting court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST TO THE DISTRICT ATTORNEY GENERAL",
        "",
        "I am making the written request described below.",
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
      "id": "tn_eligible_conviction-eligibility-record-2",
      "routeKey": "obligation:track-pathway:TN:tn_eligible_conviction:pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107",
      "title": "Eligibility Record - Expunge an eligible conviction",
      "role": "eligibility_record",
      "description": "the participant's own record of the facts the prosecutor's office will need (Expunge an eligible conviction)",
      "condition": null,
      "body": [
        "TO: The office of the district attorney general for the judicial district of the convicting court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "ELIGIBILITY RECORD",
        "",
        "This page records, in one place, the facts the office named above will need in order to act. It is mine to complete from my own records.",
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
      "id": "tn_eligible_conviction-filing-instructions-3",
      "routeKey": "obligation:track-pathway:TN:tn_eligible_conviction:pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107",
      "role": "filing_instructions",
      "title": "Filing Instructions - Expunge an eligible conviction",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Expunge an eligible conviction)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction of an eligible conviction, T.C.A. § 40-32-107(a) with procedure at § 40-32-108.",
        "",
        "Public Chapter 268 of 2025 split the former § 40-32-101(g) conviction route along an eligibility and procedure seam: § 40-32-107 now defines who is an eligible petitioner and § 40-32-108 supplies the whole procedure. That mapping is officially corroborated rather than inferred — Public Chapter 268's own conforming amendments replaced the old citation to § 40-32-101(g)(3) with § 40-32-107 and the old § 40-32-101(g) with § 40-32-107(a)(1), and replaced procedural references to § 40-32-101 with § 40-32-108. Eligibility under § 40-32-107(a) turns on the offence being on one of the enumerated Class C, Class D or Class E felony lists or within the misdemeanour category subject to its exclusion list, the offence having occurred on or after 1 November 1989 and prior to any conviction for an expunction-ineligible offence including federal and out-of-state offences, no previous expunction under subsection (a), (b) or (c), and fulfilment of every sentence requirement including all fines, restitution, court costs and other assessments, completion of imprisonment or probation, all release conditions, and any required year free from dependency on or abuse of alcohol or a controlled substance. The waiting period at § 40-32-107(a)(3)(B) runs from completion of the sentence: five years for a misdemeanour or Class E felony and ten years for a Class C or Class D felony. Subsection (a)(4) directs the petitioner to § 40-32-108, whose subsection (e) requires the petition and proposed order to be prepared by the office of the district attorney general and given to the petitioner to file. Public Chapter 719, effective 2026-04-14, rewrote the § 40-32-108(d)(2) decision standard, preserving the rebuttable presumption for petitioners eligible under § 40-32-107(a)(1)(A) to (E) while directing the court to weigh the petitioner's interest against the best interests of justice and public safety. Public Chapter 930, effective 2026-07-01 and applying only to offences committed on or after that date, relocated burglary under § 39-13-1002 from the Class E list to the Class D list, which doubles the wait for that offence from five to ten years prospectively only.",
        "",
        "WHERE IT GOES",
        "",
        "The office of the district attorney general for the judicial district of the convicting court",
        "Section 40-32-108(e) requires the petition and proposed order to be prepared by the district attorney general's office and given to the petitioner to be filed with the clerk. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from that office. LegalEase generates the participant's request and eligibility record; it does not generate the petition or the order, because those are prosecutor and court instruments.",
        "Venue: Statewide statute with originating-court venue and prosecutor-office routing. The request goes to the office of the district attorney general for the judicial district of the convicting court, because § 40-32-108(e) makes that office the preparer of the petition. The petition, once prepared, is filed by the petitioner with the clerk of the convicting court under § 40-32-108(a). A person with convictions in several judicial districts deals with each separately.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A clerk's fee applies. Section 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to T.C.A. § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed code and could not be retrieved from an official Tennessee source on 2026-08-06, so no figure is quoted. The widely circulated $180 figure appears only on a superseded AOC-hosted page and appears nowhere in the enacted text of Public Chapter 268. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized §§ 40-32-106 through 40-32-110. None is asserted.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner, and who may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Where the eligibility requirements are satisfied there is a rebuttable presumption that the petition should be granted, which shifts the practical burden to the district attorney general to object. Public Chapter 719, effective 2026-04-14, rewrote T.C.A. § 40-32-108(d)(2) and preserved that presumption for petitioners eligible under § 40-32-107(a)(1)(A) to (E), while providing that the court weighs the interest of the petitioner against the best interests of justice and public safety. The packet may describe the presumption; it may not state that the petition will be granted.",
        "- Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing.",
        "- Routing added by the integrated Tennessee 2026 route inventory decision, without any change to this route's own eligibility rules. A participant refused here because the conviction is outside the § 40-32-107(a)(1) lists but who holds a gubernatorial pardon is evaluated under tn_post_pardon. A participant refused here only by the § 40-32-107(a)(3)(A) predating condition because of a DUI conviction, who completed a certified recovery court programme with a ten-year interval, is evaluated under tn_recovery_court. The exclusion list is unchanged in both cases.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any dispute with the district attorney general about eligibility, or any indication the office will oppose.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee.",
        "- Unpaid court costs, fines or restitution, which mean the sentence is not complete.",
        "- Any DUI, sexual offence or registration matter.",
        "- Any domestic violence or child-victim offence.",
        "- Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach.",
        "- Immigration consequences, and any security-clearance question.",
        "- Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering.",
        "- Any felony, or any borderline Class C, D or E offence whose exact section cannot be matched against the current eligible list.",
        "- Any other conviction anywhere on the record. The no-other-conviction requirement reaches federal and out-of-state offences that would be ineligible in Tennessee.",
        "- Any unpaid court costs, fines or restitution.",
        "- The district attorney general's office declines to prepare the petition, or indicates it will oppose.",
        "- A previous expunction was granted under § 40-32-107(a), (b) or (c), which closes the route for life.",
        "- The participant is refused here but holds a gubernatorial pardon, or is refused only by the DUI predating condition and has completed a certified recovery court programme. Rather than stopping, the participant is routed to tn_post_pardon or tn_recovery_court respectively before any no-relief answer is given.",
        "- Mapping the offence to its exact T.C.A. section and checking it against the current eligible list is not something an offence label or class can settle. The eligible lists at T.C.A. § 40-32-107(a)(1) are enumerated section by section — Class C, Class D and Class E felony lists and a misdemeanour category with a long exclusion list — and the legislature has expanded them repeatedly, most recently by Public Chapter 930. The packet checks the current list rather than assuming, and any borderline offence goes to review.",
        "- Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. The petition is therefore a prosecutor instrument, and LegalEase does not generate it. What LegalEase generates is the participant's own written request to the district attorney general's office for the conviction-expunction packet, with the supporting eligibility record. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from the district attorney's office, which is the practical face of that provision.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_eligible_conviction-request-to-district-attorney-1: the written request to the prosecutor's office the record names as the preparer (Expunge an eligible conviction)",
        "- tn_eligible_conviction-eligibility-record-2: the participant's own record of the facts the prosecutor's office will need (Expunge an eligible conviction)"
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
      "id": "tn_judicial_diversion-petition-1",
      "routeKey": "obligation:track-pathway:TN:tn_judicial_diversion:pathway-2-diversion-expunction-under-40-15-105-40-35-313",
      "title": "Petition - Clear a case after completing judicial diversion",
      "role": "petition",
      "description": "the composed petition, on this route's own statutory ground (Clear a case after completing judicial diversion)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(The county criminal, circuit or general sessions court having jurisdiction in the previous action - see the filing instructions in this packet)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "EXPUNCTION AFTER SUCCESSFUL COMPLETION OF JUDICIAL DIVERSION, T.C.A. § 40-32-106(D) AND § 40-35-313",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under T.C.A. § 40-32-106(d)(1); T.C.A. § 40-32-106(d)(2); T.C.A. § 40-32-106(d)(3); T.C.A. § 40-35-313; T.C.A. § 40-32-102(c); T.C.A. § 8-21-401; T.C.A. § 40-39-202 and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Judicial diversion under T.C.A. § 40-35-313 is a conditional guilty plea with no judgment of conviction entered: the court defers adjudication and places the person on probation, typically six to eighteen months, and on successful completion discharges and dismisses the case. A completed judicial diversion is not a conviction under Tennessee law. Under § 40-32-106(d)(1) the person may then petition for expunction where the charges were dismissed as a result of successful completion of a judicial diversion programme pursuant to § 40-35-313. Public Chapter 268 amended § 40-35-313(b) and (c) to replace the old § 40-32-101 subdivision citations with references to § 40-32-101 and to title 40, chapter 32, which is the official cross-reference confirming the route survived the reorganization. The clerk's fee under § 8-21-401 applies, the TBI certificate is required, and the § 40-32-106(d)(2) sexual-offence bar applies here too. Federal systems and security-clearance background checks may still see the underlying guilty plea, which should be stated to every judicial diversion participant.",
        "",
        "B. THE PETITIONER",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - originating court] Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - docket number] What is the docket or case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - offence and disposition] What was the charge, and exactly how did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - disposition date] On what date did the case end?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - state control number] What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - other convictions] List every other conviction you have anywhere, including federal and out-of-state.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - citizenship or clearance] Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - diversion kind] Was it pretrial diversion, where you did not plead guilty and prosecution was suspended, or judicial diversion, where you entered a plea but no judgment of conviction was entered?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - successfully completed] Did you successfully complete everything the diversion required, and were the charges then dismissed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - sexual offence] Was the offence a sexual offence or a violent sexual offence as Tennessee defines those for the registry? Those can be diverted but cannot be expunged.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - petition filed before] Have you already filed a petition to expunge this case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - conditional plea] Did you enter a guilty plea that the court held without entering a judgment of conviction, and then complete probation?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under T.C.A. § 40-32-106(d)(1); T.C.A. § 40-32-106(d)(2); T.C.A. § 40-32-106(d)(3); T.C.A. § 40-35-313; T.C.A. § 40-32-102(c); T.C.A. § 8-21-401; T.C.A. § 40-39-202.",
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
          "id": "fact_originatingCourt",
          "label": "Item C1 - originating court",
          "supply": "Which court handled the case, and in which county? A separate filing is needed in each county where you have a case.",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_docketNumber",
          "label": "Item C2 - docket number",
          "supply": "What is the docket or case number?",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenceAndDisposition",
          "label": "Item C3 - offence and disposition",
          "supply": "What was the charge, and exactly how did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dispositionDate",
          "label": "Item C4 - disposition date",
          "supply": "On what date did the case end?",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_stateControlNumber",
          "label": "Item C5 - state control number",
          "supply": "What is the state control number on your TBI criminal history? The expunction order cannot be completed without it.",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_otherConvictions",
          "label": "Item C6 - other convictions",
          "supply": "List every other conviction you have anywhere, including federal and out-of-state.",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_citizenshipOrClearance",
          "label": "Item C7 - citizenship or clearance",
          "supply": "Are you asking about this because of immigration, federal employment or a security clearance? Tennessee expunction does not reach federal records.",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_diversionKind",
          "label": "Item C8 - diversion kind",
          "supply": "Was it pretrial diversion, where you did not plead guilty and prosecution was suspended, or judicial diversion, where you entered a plea but no judgment of conviction was entered?",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_successfullyCompleted",
          "label": "Item C9 - successfully completed",
          "supply": "Did you successfully complete everything the diversion required, and were the charges then dismissed?",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sexualOffence",
          "label": "Item C10 - sexual offence",
          "supply": "Was the offence a sexual offence or a violent sexual offence as Tennessee defines those for the registry? Those can be diverted but cannot be expunged.",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_petitionFiledBefore",
          "label": "Item C11 - petition filed before",
          "supply": "Have you already filed a petition to expunge this case?",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_conditionalPlea",
          "label": "Item C12 - conditional plea",
          "supply": "Did you enter a guilty plea that the court held without entering a judgment of conviction, and then complete probation?",
          "why": "the committed track registry records this as a required generation input for tn_judicial_diversion, and the platform holds no value for it"
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
      "id": "tn_judicial_diversion-filing-instructions-2",
      "routeKey": "obligation:track-pathway:TN:tn_judicial_diversion:pathway-2-diversion-expunction-under-40-15-105-40-35-313",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a case after completing judicial diversion",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a case after completing judicial diversion)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction after successful completion of judicial diversion, T.C.A. § 40-32-106(d) and § 40-35-313.",
        "",
        "Judicial diversion under T.C.A. § 40-35-313 is a conditional guilty plea with no judgment of conviction entered: the court defers adjudication and places the person on probation, typically six to eighteen months, and on successful completion discharges and dismisses the case. A completed judicial diversion is not a conviction under Tennessee law. Under § 40-32-106(d)(1) the person may then petition for expunction where the charges were dismissed as a result of successful completion of a judicial diversion programme pursuant to § 40-35-313. Public Chapter 268 amended § 40-35-313(b) and (c) to replace the old § 40-32-101 subdivision citations with references to § 40-32-101 and to title 40, chapter 32, which is the official cross-reference confirming the route survived the reorganization. The clerk's fee under § 8-21-401 applies, the TBI certificate is required, and the § 40-32-106(d)(2) sexual-offence bar applies here too. Federal systems and security-clearance background checks may still see the underlying guilty plea, which should be stated to every judicial diversion participant.",
        "",
        "WHERE IT GOES",
        "",
        "The county criminal, circuit or general sessions court having jurisdiction in the previous action",
        "Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search.",
        "Venue: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A clerk's fee applies. Section 40-32-106(d)(3) requires the appropriate clerk's fee pursuant to T.C.A. § 8-21-401 for destroying the records, which is the asymmetry a participant should be warned about: diversion is a non-conviction outcome but it is not free, whereas a straight dismissal is. The amount is set by § 8-21-401 and no figure is quoted here. Fee waiver as recorded: No indigency or fee-waiver provision appears in the reorganized §§ 40-32-106 to 40-32-110. The TBI operates an unpublished indigency procedure for its separate diversion certificate fee, requiring a form signed by the judge that it supplies on request and does not publish. No waiver mechanism for the clerk's expunction fee was identified.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general in the ordinary course.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing.",
        "- A petition is still required after diversion. Completing diversion dismisses the case but leaves it visible until a separate expunction petition is filed, and this is the second most common Tennessee misunderstanding after the not-automatic point.",
        "- Federal systems and security-clearance background checks may still see the underlying guilty plea from a judicial diversion. That should be stated to every judicial diversion participant.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any dispute with the district attorney general about eligibility, or any indication the office will oppose.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee.",
        "- Unpaid court costs, fines or restitution, which mean the sentence is not complete.",
        "- Any DUI, sexual offence or registration matter.",
        "- Any domestic violence or child-victim offence.",
        "- Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach.",
        "- Immigration consequences, and any security-clearance question.",
        "- Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering.",
        "- The offence was a sexual offence or a violent sexual offence as defined in T.C.A. § 40-39-202. It could be diverted but it cannot be expunged, and the participant needs to be told that plainly rather than sold a petition.",
        "- The diversion was not successfully completed, or completion is disputed.",
        "- The participant's goal involves federal employment or a security clearance, since a judicial diversion guilty plea may remain visible there.",
        "- The participant's goal involves federal employment or a security clearance. Federal systems may still see the underlying guilty plea from a judicial diversion even after expunction.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_judicial_diversion-petition-1: the composed petition, on this route's own statutory ground (Clear a case after completing judicial diversion)"
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
      "id": "tn_two_offense-request-to-district-attorney-1",
      "routeKey": "obligation:track-pathway:TN:tn_two_offense:pathway-4-two-offense-expunction-under-40-32-101-k",
      "title": "Request to the District Attorney General - Expunge up to two offences, once in your life",
      "role": "request_to_district_attorney",
      "description": "the written request to the prosecutor's office the record names as the preparer (Expunge up to two offences, once in your life)",
      "condition": null,
      "body": [
        "TO: The office of the District Attorney General for the judicial district of the convicting court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST TO THE DISTRICT ATTORNEY GENERAL",
        "",
        "I am making the written request described below.",
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
      "id": "tn_two_offense-eligibility-record-2",
      "routeKey": "obligation:track-pathway:TN:tn_two_offense:pathway-4-two-offense-expunction-under-40-32-101-k",
      "title": "Eligibility Record - Expunge up to two offences, once in your life",
      "role": "eligibility_record",
      "description": "the participant's own record of the facts the prosecutor's office will need (Expunge up to two offences, once in your life)",
      "condition": null,
      "body": [
        "TO: The office of the district attorney general for the judicial district of the convicting court",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "ELIGIBILITY RECORD",
        "",
        "This page records, in one place, the facts the office named above will need in order to act. It is mine to complete from my own records.",
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
      "id": "tn_two_offense-filing-instructions-3",
      "routeKey": "obligation:track-pathway:TN:tn_two_offense:pathway-4-two-offense-expunction-under-40-32-101-k",
      "role": "filing_instructions",
      "title": "Filing Instructions - Expunge up to two offences, once in your life",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Expunge up to two offences, once in your life)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Expunction of up to two offences, T.C.A. § 40-32-107(b) with procedure at § 40-32-108.",
        "",
        "Read at source on 2026-08-06. Section 40-32-107(b) defines an eligible petitioner as a person seeking expunction of no more than two offences. Each offence must be eligible under § 40-32-107(a)(1) and must have occurred prior to any conviction for an expunction-ineligible offence, including ineligible federal and other-state convictions. The permitted combinations are exhaustive: two misdemeanours, or one felony and one misdemeanour. Two felonies are not available on this route. At filing there must be five years since completion of sentence for any misdemeanour or Class E felony being expunged and ten years for any Class C or Class D felony being expunged, every sentence requirement must be fulfilled for each offence, and the person must not previously have been granted expunction under subsection (a), this subsection (b) or subsection (c). Subsection (b)(2) provides a single-episode merger mirroring (a)(1)(F): contemporaneous same-location single-intent convictions count as a single offence for the purposes of the two-offence limit, so one episode does not consume both slots. Subsection (b)(3) directs the petitioner to § 40-32-108, so the same DA-prepared petition procedure applies. The reciprocal bars across (a), (b) and (c) are lifetime, which is why using this pathway forecloses a later second use and makes the timing decision consequential.",
        "",
        "WHERE IT GOES",
        "",
        "The office of the district attorney general for the judicial district of the convicting court",
        "Section 40-32-108(e) requires the petition and proposed order to be prepared by the district attorney general's office and given to the petitioner to be filed with the clerk. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from that office. LegalEase generates the participant's request and eligibility record; it does not generate the petition or the order, because those are prosecutor and court instruments.",
        "Venue: Statewide statute with originating-court venue and prosecutor-office routing. The request goes to the office of the district attorney general for the judicial district of the convicting court, because § 40-32-108(e) makes that office the preparer of the petition. The petition, once prepared, is filed by the petitioner with the clerk of the convicting court under § 40-32-108(a). A person with convictions in several judicial districts deals with each separately.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: A clerk's fee applies. Section 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to T.C.A. § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed code and could not be retrieved from an official Tennessee source on 2026-08-06, so no figure is quoted. The widely circulated $180 figure appears only on a superseded AOC-hosted page and appears nowhere in the enacted text of Public Chapter 268. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized §§ 40-32-106 through 40-32-110. None is asserted.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner, and who may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Where the eligibility requirements are satisfied there is a rebuttable presumption that the petition should be granted, which shifts the practical burden to the district attorney general to object. Public Chapter 719, effective 2026-04-14, rewrote T.C.A. § 40-32-108(d)(2) and preserved that presumption for petitioners eligible under § 40-32-107(a)(1)(A) to (E), while providing that the court weighs the interest of the petitioner against the best interests of justice and public safety. The packet may describe the presumption; it may not state that the petition will be granted.",
        "- Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing.",
        "- Routing added by the integrated Tennessee 2026 route inventory decision, without any change to this route's own eligibility rules. A participant refused here because the conviction is outside the § 40-32-107(a)(1) lists but who holds a gubernatorial pardon is evaluated under tn_post_pardon. A participant refused here only by the § 40-32-107(a)(3)(A) predating condition because of a DUI conviction, who completed a certified recovery court programme with a ten-year interval, is evaluated under tn_recovery_court. The exclusion list is unchanged in both cases.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Any dispute with the district attorney general about eligibility, or any indication the office will oppose.",
        "- Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee.",
        "- Unpaid court costs, fines or restitution, which mean the sentence is not complete.",
        "- Any DUI, sexual offence or registration matter.",
        "- Any domestic violence or child-victim offence.",
        "- Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach.",
        "- Immigration consequences, and any security-clearance question.",
        "- Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering.",
        "- Any felony, or any borderline Class C, D or E offence whose exact section cannot be matched against the current eligible list.",
        "- Any other conviction anywhere on the record. The no-other-conviction requirement reaches federal and out-of-state offences that would be ineligible in Tennessee.",
        "- Any unpaid court costs, fines or restitution.",
        "- The district attorney general's office declines to prepare the petition, or indicates it will oppose.",
        "- A previous expunction was granted under § 40-32-107(a), (b) or (c), which closes the route for life.",
        "- The strategic question of whether to use the one lifetime opportunity now or wait for a third conviction to become eligible. That is advice rather than form-filling and it belongs with a lawyer.",
        "- Whether two convictions arose from a single criminal episode, which decides whether the participant is spending one slot or two.",
        "- The participant is refused here but holds a gubernatorial pardon, or is refused only by the DUI predating condition and has completed a certified recovery court programme. Rather than stopping, the participant is routed to tn_post_pardon or tn_recovery_court respectively before any no-relief answer is given.",
        "- Mapping the offence to its exact T.C.A. section and checking it against the current eligible list is not something an offence label or class can settle. The eligible lists at T.C.A. § 40-32-107(a)(1) are enumerated section by section — Class C, Class D and Class E felony lists and a misdemeanour category with a long exclusion list — and the legislature has expanded them repeatedly, most recently by Public Chapter 930. The packet checks the current list rather than assuming, and any borderline offence goes to review.",
        "- The two-offence pathway is once per lifetime, and the reciprocal bars across § 40-32-107(a), (b) and (c) mean a single earlier grant closes it. A participant with two eligible offences now and a third that becomes eligible later should be told that using it now closes the door.",
        "- Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. The petition is therefore a prosecutor instrument, and LegalEase does not generate it. What LegalEase generates is the participant's own written request to the district attorney general's office for the conviction-expunction packet, with the supporting eligibility record. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from the district attorney's office, which is the practical face of that provision.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- tn_two_offense-request-to-district-attorney-1: the written request to the prosecutor's office the record names as the preparer (Expunge up to two offences, once in your life)",
        "- tn_two_offense-eligibility-record-2: the participant's own record of the facts the prosecutor's office will need (Expunge up to two offences, once in your life)"
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
      "routeKey": "obligation:track-only:TN:tn_arrest_no_court_record",
      "statute": "T.C.A. § 40-32-109; T.C.A. § 40-32-109(a); T.C.A. § 40-32-109(b); T.C.A. § 40-32-109(c); T.C.A. § 40-32-109(d); T.C.A. § 40-32-109(e); T.C.A. § 40-32-109(f); T.C.A. § 40-32-102(c)(1); T.C.A. § 40-32-110; T.C.A. § 8-21-401",
      "instrument": "petition: tn_arrest_no_court_record-petition-1; clerk_search_and_certification_instructions: tn_arrest_no_court_record-clerk-search-and-certification-instructi-2; fee_disclosure: tn_arrest_no_court_record-fee-disclosure-3; filing_and_after_order_instructions: tn_arrest_no_court_record-filing-and-after-order-instructions-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_illegal_voting",
      "statute": "T.C.A. § 40-32-107(c); T.C.A. § 40-32-107(c)(1); T.C.A. § 40-32-107(c)(2); T.C.A. § 2-19-107; T.C.A. § 40-32-108; T.C.A. § 40-32-108(a); T.C.A. § 40-32-108(d)(2); T.C.A. § 40-32-108(e); T.C.A. § 40-32-102(c); T.C.A. § 40-32-110; T.C.A. § 8-21-401",
      "instrument": "participant_request_to_district_attorney: tn_illegal_voting-participant-request-to-district-attorney-1; participant_eligibility_record: tn_illegal_voting-participant-eligibility-record-2; filing_and_handoff_instructions: tn_illegal_voting-filing-and-handoff-instructions-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_mistaken_identity",
      "statute": "T.C.A. § 40-32-106(a)(1)(H); T.C.A. § 40-32-101; T.C.A. § 40-32-106(a)(1); T.C.A. § 40-32-102(d); T.C.A. § 40-32-110",
      "instrument": "petition: tn_mistaken_identity-petition-1; expedited_request: tn_mistaken_identity-expedited-request-2; filing_and_after_order_instructions: tn_mistaken_identity-filing-and-after-order-instructions-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_nonconviction_petition",
      "statute": "T.C.A. § 40-32-106(a)(1); T.C.A. § 40-32-106(a)(2); T.C.A. § 40-32-102; T.C.A. § 40-32-102(d); T.C.A. § 40-32-102(e); T.C.A. § 40-32-110; T.C.A. § 40-6-204(b)",
      "instrument": "petition: tn_nonconviction_petition-petition-1; no_cost_statement: tn_nonconviction_petition-no-cost-statement-2; filing_and_after_order_instructions: tn_nonconviction_petition-filing-and-after-order-instructions-3; no_court_history_routing: tn_nonconviction_petition-no-court-history-routing-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_post_pardon",
      "statute": "T.C.A. § 40-32-107(d); T.C.A. § 40-32-107(d)(1)(A); T.C.A. § 40-32-107(d)(1)(B); T.C.A. § 40-32-107(d)(1)(C); T.C.A. § 40-32-107(d)(2); T.C.A. § 40-32-107(d)(3); T.C.A. § 40-32-108; T.C.A. § 40-32-108(d)(2); T.C.A. § 40-32-108(e); T.C.A. § 40-32-102(c); T.C.A. § 40-32-110; Public Chapter 719 (2026)",
      "instrument": "participant_request_to_district_attorney: tn_post_pardon-participant-request-to-district-attorney-1; participant_eligibility_record: tn_post_pardon-participant-eligibility-record-2; filing_and_handoff_instructions: tn_post_pardon-filing-and-handoff-instructions-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_pretrial_diversion",
      "statute": "T.C.A. § 40-32-106(d)(1); T.C.A. § 40-32-106(d)(2); T.C.A. § 40-32-106(d)(3); T.C.A. §§ 40-15-102 through 40-15-107; T.C.A. § 40-15-105; T.C.A. § 40-32-102(c); T.C.A. § 8-21-401; T.C.A. § 40-39-202",
      "instrument": "petition: tn_pretrial_diversion-petition-1; certification_and_fee_instructions: tn_pretrial_diversion-certification-and-fee-instructions-2; filing_and_after_order_instructions: tn_pretrial_diversion-filing-and-after-order-instructions-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_recovery_court",
      "statute": "T.C.A. § 40-32-107(e); T.C.A. § 40-32-107(e)(1); T.C.A. § 40-32-107(e)(2); T.C.A. § 40-32-107(e)(3); T.C.A. § 40-32-107(a)(1); T.C.A. § 40-32-107(a)(3)(A); T.C.A. § 55-10-401; T.C.A. § 40-32-108; T.C.A. § 40-32-108(d)(2); T.C.A. § 40-32-108(e); T.C.A. § 40-32-102(c); T.C.A. § 40-32-110; Public Chapter 1061 (2026)",
      "instrument": "participant_request_to_district_attorney: tn_recovery_court-participant-request-to-district-attorney-1; participant_eligibility_record: tn_recovery_court-participant-eligibility-record-2; filing_and_handoff_instructions: tn_recovery_court-filing-and-handoff-instructions-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-only:TN:tn_redaction",
      "statute": "T.C.A. § 40-32-106(c)(2); T.C.A. § 40-32-106(a); T.C.A. § 40-32-102(d); T.C.A. § 40-32-110",
      "instrument": "motion_for_partial_removal: tn_redaction-motion-for-partial-removal-1; count_by_count_schedule: tn_redaction-count-by-count-schedule-2; scope_disclosure: tn_redaction-scope-disclosure-3; filing_and_after_order_instructions: tn_redaction-filing-and-after-order-instructions-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:TN:tn_eligible_conviction:pathway-3-eligible-conviction-expunction-under-40-32-101-g-40-32-107",
      "statute": "T.C.A. § 40-32-107(a); T.C.A. § 40-32-107(a)(1); T.C.A. § 40-32-107(a)(2); T.C.A. § 40-32-107(a)(3); T.C.A. § 40-32-107(a)(4); T.C.A. § 40-32-108; T.C.A. § 40-32-108(a); T.C.A. § 40-32-108(d)(2); T.C.A. § 40-32-108(e); T.C.A. § 40-32-102(c); T.C.A. § 40-32-110; T.C.A. § 8-21-401",
      "instrument": "request_to_district_attorney: tn_eligible_conviction-request-to-district-attorney-1; eligibility_record: tn_eligible_conviction-eligibility-record-2; process_and_expectation_instructions: tn_eligible_conviction-process-and-expectation-instructions-3; alternative_route_screening: tn_eligible_conviction-alternative-route-screening-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:TN:tn_judicial_diversion:pathway-2-diversion-expunction-under-40-15-105-40-35-313",
      "statute": "T.C.A. § 40-32-106(d)(1); T.C.A. § 40-32-106(d)(2); T.C.A. § 40-32-106(d)(3); T.C.A. § 40-35-313; T.C.A. § 40-32-102(c); T.C.A. § 8-21-401; T.C.A. § 40-39-202",
      "instrument": "petition: tn_judicial_diversion-petition-1; certification_and_fee_instructions: tn_judicial_diversion-certification-and-fee-instructions-2; filing_and_after_order_instructions: tn_judicial_diversion-filing-and-after-order-instructions-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    },
    {
      "routeKey": "obligation:track-pathway:TN:tn_two_offense:pathway-4-two-offense-expunction-under-40-32-101-k",
      "statute": "T.C.A. § 40-32-107(b); T.C.A. § 40-32-107(b)(1); T.C.A. § 40-32-107(b)(2); T.C.A. § 40-32-107(b)(3); T.C.A. § 40-32-107(a)(1); T.C.A. § 40-32-108; T.C.A. § 40-32-108(e); T.C.A. § 40-32-102(c)",
      "instrument": "request_to_district_attorney: tn_two_offense-request-to-district-attorney-1; eligibility_record: tn_two_offense-eligibility-record-2; process_and_expectation_instructions: tn_two_offense-process-and-expectation-instructions-3; alternative_route_screening: tn_two_offense-alternative-route-screening-4",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION — Clear an arrest that never reached a courtroom",
      "The committed track registry records the destination as **The court with jurisdiction over the offence for which the person was arrested, filed through its clerk**. Upon filing, the clerk serves the petition on the district attorney general for that judicial district. Both the petitioner and the district attorney general may file evidence. The clerk's office searches the court's records and certifies to the court whether there is any history of the arrest. The court reviews the clerk's certification and all evidence, and may enter the order if it finds there is no history of the arrest within the court's record. The petition on this route is the participant's own operative statutory petition, not a request to another office: § 40-32-109 contains no cross-reference to § 40-32-108, so the district-attorney preparation duty at § 40-32-108(e) does not govern here. The clerk's certification under (c) and the court's order under (d) remain instruments of their own actors and neither is generated or pre-completed. Venue as recorded: The court with jurisdiction over the offence for which the person was arrested, per § 40-32-109(a). The section states that forum inside the eligibility clause rather than as a standalone filing directive, and supplies it by implication: it is the court whose records the clerk searches under (c) and whose clerk serves the district attorney general under (a). Service is on the district attorney general for that judicial district, which is the only express geographic anchor. There is no residence-based venue and no alternative forum. Filing as recorded: A petition filed by the participant with the court with jurisdiction over the offence for which the person was arrested, through that court's clerk. Section 40-32-109(a) uses the permissive may petition, where § 40-32-108(a) uses shall petition. There is no residence-based venue and no alternative forum."
    ],
    [
      "FEE_AND_WAIVER — Clear an arrest that never reached a courtroom",
      "Fee as recorded: A clerk's fee applies and is mandatory. Section 40-32-109(e) provides that a person petitioning the court for expunction pursuant to the section must be charged the appropriate clerk's fee pursuant to T.C.A. § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed Tennessee Code and was not retrievable from an official Tennessee source, so no figure is quoted. This is the material difference from the § 40-32-106 route, which is free. Fee waiver as recorded: None established. Section 40-32-109 contains no indigency, waiver or without-cost provision, in express contrast to § 40-32-106(a)(1). Whether any general court-cost waiver reaches it was not established and none is asserted."
    ],
    [
      "SERVICE — Clear an arrest that never reached a courtroom",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general for that judicial district on filing. Both the petitioner and the district attorney general may file evidence with the court under § 40-32-109(b)."
    ],
    [
      "SELF_HELP_STOP — Clear an arrest that never reached a courtroom",
      "**Stop and get help if:** The court does in fact have a record of the arrest. That takes the participant out of this route entirely and into the § 40-32-106 analysis, which is the free route; the participant is redirected there rather than handed off. **Stop and get help if:** The district attorney general files evidence that the court does have a history of the arrest. That converts the matter into a contested question of fact and the participant is handed off to an attorney. **Stop and get help if:** Whether a prior court action or court file ever existed is disputed. LegalEase does not adjudicate that question: the clerk searches and certifies and the court finds, so a disputed history is handed off to an attorney. **Stop and get help if:** The participant cannot establish from the TBI criminal history that an arrest record exists at all. The participant is directed back to the TBI before the route reopens. **Stop and get help if:** The participant is seeking relief for a case that reached the court and was dismissed, no-true-billed, nolle prossed or acquitted. That is the free § 40-32-106 route and the participant is redirected to it rather than paying here. **Stop and get help if:** Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them. **Stop and get help if:** The clerk's office searches the court's records and certifies to the court whether there is any history of the arrest. That certification is a clerk instrument, it is filed either way because it certifies whether there is any history, and it is never generated, pre-completed or predicted. The district attorney general is served by the clerk and may file evidence under (b). The court reviews and decides, and the grant is discretionary."
    ],
    [
      "FILING_DESTINATION — Clear a conviction for illegal registration or voting",
      "The committed track registry records the destination as **The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court**. Once the district attorney general's office prepares the petition and proposed order, the petitioner files them with the clerk of the convicting court under § 40-32-108(a) and pays the clerk's fee under T.C.A. § 8-21-401. The generated artifact on this route is the participant's own controlled written request to the office of the district attorney general, together with the participant's controlled eligibility record. It is not the statutory petition and it is not the proposed order: T.C.A. § 40-32-108(e) requires both of those to be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk. LegalEase does not draft, complete, sign or hold out either instrument as its own, and does not make the district attorney general's legal determination. Venue as recorded: The convicting court, under § 40-32-108(a). The request goes to the district attorney general for that judicial district. A person with convictions in more than one judicial district deals with each separately. Filing as recorded: Two steps with different actors. The participant sends the request to the office of the district attorney general for the judicial district of the convicting court. That office prepares the petition and the proposed order under T.C.A. § 40-32-108(e) and gives them to the petitioner, who files them with the clerk of the convicting court under § 40-32-108(a). A person with convictions in more than one judicial district deals with each separately."
    ],
    [
      "FEE_AND_WAIVER — Clear a conviction for illegal registration or voting",
      "Fee as recorded: A clerk's fee applies. T.C.A. § 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed Tennessee Code and was not retrievable from an official Tennessee source, so no figure is quoted. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized T.C.A. §§ 40-32-106 through 40-32-110. None is asserted."
    ],
    [
      "SERVICE — Clear a conviction for illegal registration or voting",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner and may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service."
    ],
    [
      "SELF_HELP_STOP — Clear a conviction for illegal registration or voting",
      "**Stop and get help if:** The office of the district attorney general declines to prepare the petition, or indicates it will oppose. Self-help stops and the participant is handed off to an attorney; the participant keeps the generated request, the controlled factual record and the instructions. **Stop and get help if:** Eligibility is disputed by the district attorney general's office. That is a contested determination for that office and, on filing, for the court; it is handed off to an attorney rather than argued in the packet. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. Handed off to an attorney before anything is sent. **Stop and get help if:** Any unpaid court costs, fines, restitution or other assessments, which mean the sentence is not complete. The participant is directed to the convicting court's clerk to resolve the balance before the route reopens. **Stop and get help if:** Any borderline offence whose exact section cannot be matched against the current eligible list. Handed off to an attorney. **Stop and get help if:** Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them. **Stop and get help if:** Any question whether the conviction was under T.C.A. § 2-19-107 rather than another elections or fraud provision. The route reaches only that section, so an unresolved identification is handed off to an attorney rather than guessed. **Stop and get help if:** Any collateral question about restoration of voting rights, which is a separate remedy under separate machinery and is referred out. **Stop and get help if:** Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. They are prosecutor instruments. LegalEase generates the participant's request and eligibility record and nothing else, and never characterises either generated document as the district attorney general's petition or proposed order."
    ],
    [
      "FILING_DESTINATION — Clear an arrest that was not yours",
      "The committed track registry records the destination as **The county criminal, circuit or general sessions court having jurisdiction in the previous action**. Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search. Venue as recorded: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges. Filing as recorded: A petition to the court having jurisdiction in the previous action, filed with that court's clerk."
    ],
    [
      "FEE_AND_WAIVER — Clear an arrest that was not yours",
      "Fee as recorded: None. Mistaken identity is one of the § 40-32-106(a)(1) grounds, and those records must be removed and destroyed without cost to the person. Fee waiver as recorded: Not applicable — no fee is charged."
    ],
    [
      "SERVICE — Clear an arrest that was not yours",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general in the ordinary course."
    ],
    [
      "SELF_HELP_STOP — Clear an arrest that was not yours",
      "**Stop and get help if:** Any dispute with the district attorney general about eligibility, or any indication the office will oppose. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. **Stop and get help if:** Unpaid court costs, fines or restitution, which mean the sentence is not complete. **Stop and get help if:** Any DUI, sexual offence or registration matter. **Stop and get help if:** Any domestic violence or child-victim offence. **Stop and get help if:** Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach. **Stop and get help if:** Immigration consequences, and any security-clearance question. **Stop and get help if:** Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering. **Stop and get help if:** Any dispute about whether the participant is in fact the person arrested or charged. Proving mistaken identity is a factual showing, and a contested one is outside self-help. **Stop and get help if:** The participant cannot document the circumstances at all."
    ],
    [
      "FILING_DESTINATION — Clear a charge that did not end in a conviction",
      "The committed track registry records the destination as **The county criminal, circuit or general sessions court having jurisdiction in the previous action**. Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search. Venue as recorded: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges. Filing as recorded: A petition to the court having jurisdiction in the previous action, filed with that court's clerk. A separate petition is required in each county where the person has a case, and the AOC directs filers to check with the clerk because separate forms may be required for multiple charges."
    ],
    [
      "FEE_AND_WAIVER — Clear a charge that did not end in a conviction",
      "Fee as recorded: None. Section 40-32-106(a)(1) requires the records to be removed and destroyed without cost to the person, and the general assembly's stated intent is that no fee ever be charged where the charge was dismissed for a reason other than successful diversion completion. Fee waiver as recorded: Not applicable on this route — no fee is charged. Where a clerk nonetheless assesses court costs on the underlying case, the AOC indicates those may be waivable, but no mechanism or form is identified."
    ],
    [
      "SERVICE — Clear a charge that did not end in a conviction",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general in the ordinary course. The district attorney may respond."
    ],
    [
      "SELF_HELP_STOP — Clear a charge that did not end in a conviction",
      "**Stop and get help if:** Any dispute with the district attorney general about eligibility, or any indication the office will oppose. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. **Stop and get help if:** Unpaid court costs, fines or restitution, which mean the sentence is not complete. **Stop and get help if:** Any DUI, sexual offence or registration matter. **Stop and get help if:** Any domestic violence or child-victim offence. **Stop and get help if:** Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach. **Stop and get help if:** Immigration consequences, and any security-clearance question. **Stop and get help if:** Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering. **Stop and get help if:** Any count in the case resulted in a conviction, which routes to the redaction analysis. **Stop and get help if:** The dismissal followed completion of a diversion programme, which routes to the diversion tracks. **Stop and get help if:** The participant is being asked to pay for this route, which the statute says is free. **Stop and get help if:** Whether any court case, court file or previous court action ever existed is disputed or cannot be established. LegalEase does not adjudicate that question; the participant is handed off to an attorney, and where the answer is that nothing reached the court the route is tn_arrest_no_court_record rather than this one."
    ],
    [
      "FILING_DESTINATION — Clear a conviction you have been pardoned for",
      "The committed track registry records the destination as **The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court**. Once the district attorney general's office prepares the petition and proposed order, the petitioner files them with the clerk of the convicting court under § 40-32-108(a) and pays the clerk's fee under T.C.A. § 8-21-401. The generated artifact on this route is the participant's own controlled written request to the office of the district attorney general, together with the participant's controlled eligibility record. It is not the statutory petition and it is not the proposed order: T.C.A. § 40-32-108(e) requires both of those to be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk. LegalEase does not draft, complete, sign or hold out either instrument as its own, and does not make the district attorney general's legal determination. Venue as recorded: The convicting court, under § 40-32-108(a). The request goes to the district attorney general for that judicial district. A person with convictions in more than one judicial district deals with each separately. Filing as recorded: Two steps with different actors. The participant sends the request to the office of the district attorney general for the judicial district of the convicting court. That office prepares the petition and the proposed order under T.C.A. § 40-32-108(e) and gives them to the petitioner, who files them with the clerk of the convicting court under § 40-32-108(a). A person with convictions in more than one judicial district deals with each separately."
    ],
    [
      "FEE_AND_WAIVER — Clear a conviction you have been pardoned for",
      "Fee as recorded: A clerk's fee applies. T.C.A. § 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed Tennessee Code and was not retrievable from an official Tennessee source, so no figure is quoted. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized T.C.A. §§ 40-32-106 through 40-32-110. None is asserted."
    ],
    [
      "SERVICE — Clear a conviction you have been pardoned for",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner and may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service."
    ],
    [
      "SELF_HELP_STOP — Clear a conviction you have been pardoned for",
      "**Stop and get help if:** The office of the district attorney general declines to prepare the petition, or indicates it will oppose. Self-help stops and the participant is handed off to an attorney; the participant keeps the generated request, the controlled factual record and the instructions. **Stop and get help if:** Eligibility is disputed by the district attorney general's office. That is a contested determination for that office and, on filing, for the court; it is handed off to an attorney rather than argued in the packet. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. Handed off to an attorney before anything is sent. **Stop and get help if:** Any unpaid court costs, fines, restitution or other assessments, which mean the sentence is not complete. The participant is directed to the convicting court's clerk to resolve the balance before the route reopens. **Stop and get help if:** Any borderline offence whose exact section cannot be matched against the current eligible list. Handed off to an attorney. **Stop and get help if:** Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them. **Stop and get help if:** Any case where the conviction may fall within one of the seven excluded felony categories, or within an attempt, conspiracy, facilitation or solicitation form of one. Handed off to an attorney rather than tested in the packet. **Stop and get help if:** Any case where the violence question is genuinely contested. After Public Chapter 719 it is a merits factor the court weighs, and arguing it is individualized advocacy; the participant is handed off to an attorney. **Stop and get help if:** Any participant who does not yet hold a pardon. The clemency application is a separate proceeding before the board of parole and the Governor and is referred out. **Stop and get help if:** Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. They are prosecutor instruments. LegalEase generates the participant's request and eligibility record and nothing else, and never characterises either generated document as the district attorney general's petition or proposed order."
    ],
    [
      "FILING_DESTINATION — Clear a case after completing pretrial diversion",
      "The committed track registry records the destination as **The county criminal, circuit or general sessions court having jurisdiction in the previous action**. Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search. Venue as recorded: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges. Filing as recorded: A petition to the court having jurisdiction in the previous action, filed with that court's clerk. A separate petition is required in each county."
    ],
    [
      "FEE_AND_WAIVER — Clear a case after completing pretrial diversion",
      "Fee as recorded: A clerk's fee applies. Section 40-32-106(d)(3) requires the appropriate clerk's fee pursuant to T.C.A. § 8-21-401 for destroying the records, which is the asymmetry a participant should be warned about: diversion is a non-conviction outcome but it is not free, whereas a straight dismissal is. The amount is set by § 8-21-401 and no figure is quoted here. Fee waiver as recorded: No indigency or fee-waiver provision appears in the reorganized §§ 40-32-106 to 40-32-110. The TBI operates an unpublished indigency procedure for its separate diversion certificate fee, requiring a form signed by the judge that it supplies on request and does not publish. No waiver mechanism for the clerk's expunction fee was identified."
    ],
    [
      "SERVICE — Clear a case after completing pretrial diversion",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general in the ordinary course."
    ],
    [
      "SELF_HELP_STOP — Clear a case after completing pretrial diversion",
      "**Stop and get help if:** Any dispute with the district attorney general about eligibility, or any indication the office will oppose. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. **Stop and get help if:** Unpaid court costs, fines or restitution, which mean the sentence is not complete. **Stop and get help if:** Any DUI, sexual offence or registration matter. **Stop and get help if:** Any domestic violence or child-victim offence. **Stop and get help if:** Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach. **Stop and get help if:** Immigration consequences, and any security-clearance question. **Stop and get help if:** Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering. **Stop and get help if:** The offence was a sexual offence or a violent sexual offence as defined in T.C.A. § 40-39-202. It could be diverted but it cannot be expunged, and the participant needs to be told that plainly rather than sold a petition. **Stop and get help if:** The diversion was not successfully completed, or completion is disputed. **Stop and get help if:** The participant's goal involves federal employment or a security clearance, since a judicial diversion guilty plea may remain visible there."
    ],
    [
      "FILING_DESTINATION — Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "The committed track registry records the destination as **The office of the district attorney general for the judicial district of the convicting court, then the clerk of that court**. Once the district attorney general's office prepares the petition and proposed order, the petitioner files them with the clerk of the convicting court under § 40-32-108(a) and pays the clerk's fee under T.C.A. § 8-21-401. The generated artifact on this route is the participant's own controlled written request to the office of the district attorney general, together with the participant's controlled eligibility record. It is not the statutory petition and it is not the proposed order: T.C.A. § 40-32-108(e) requires both of those to be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk. LegalEase does not draft, complete, sign or hold out either instrument as its own, and does not make the district attorney general's legal determination. Venue as recorded: The convicting court, under § 40-32-108(a). The request goes to the district attorney general for that judicial district. A person with convictions in more than one judicial district deals with each separately. Filing as recorded: Two steps with different actors. The participant sends the request to the office of the district attorney general for the judicial district of the convicting court. That office prepares the petition and the proposed order under T.C.A. § 40-32-108(e) and gives them to the petitioner, who files them with the clerk of the convicting court under § 40-32-108(a). A person with convictions in more than one judicial district deals with each separately."
    ],
    [
      "FEE_AND_WAIVER — Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "Fee as recorded: A clerk's fee applies. T.C.A. § 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed Tennessee Code and was not retrievable from an official Tennessee source, so no figure is quoted. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized T.C.A. §§ 40-32-106 through 40-32-110. None is asserted."
    ],
    [
      "SERVICE — Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner and may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service."
    ],
    [
      "SELF_HELP_STOP — Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "**Stop and get help if:** The office of the district attorney general declines to prepare the petition, or indicates it will oppose. Self-help stops and the participant is handed off to an attorney; the participant keeps the generated request, the controlled factual record and the instructions. **Stop and get help if:** Eligibility is disputed by the district attorney general's office. That is a contested determination for that office and, on filing, for the court; it is handed off to an attorney rather than argued in the packet. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. Handed off to an attorney before anything is sent. **Stop and get help if:** Any unpaid court costs, fines, restitution or other assessments, which mean the sentence is not complete. The participant is directed to the convicting court's clerk to resolve the balance before the route reopens. **Stop and get help if:** Any borderline offence whose exact section cannot be matched against the current eligible list. Handed off to an attorney. **Stop and get help if:** Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them. **Stop and get help if:** The participant wants the DUI itself expunged. Subsection (e)(3) forbids it. The packet says so plainly and the participant is referred to an attorney if they want that question examined further. **Stop and get help if:** The offence being expunged involves a motor vehicle and the use of alcohol or a controlled substance, which is an absolute bar under (e)(3) even where every other condition is met. Handed off to an attorney. **Stop and get help if:** More than one conviction under T.C.A. § 55-10-401, which closes the route under (e)(1)(E). Handed off to an attorney. **Stop and get help if:** The ten-year interval between the DUI conviction and the offence being expunged cannot be established from the judgments. The participant is directed to the clerks of both courts before the route reopens. **Stop and get help if:** Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. They are prosecutor instruments. LegalEase generates the participant's request and eligibility record and nothing else, and never characterises either generated document as the district attorney general's petition or proposed order."
    ],
    [
      "FILING_DESTINATION — Clear the dismissed counts in a case where other counts stuck",
      "The committed track registry records the destination as **The county criminal, circuit or general sessions court having jurisdiction in the previous action**. Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search. Venue as recorded: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges. Filing as recorded: A motion to the court having jurisdiction in the previous action, filed with that court's clerk, under the existing docket rather than as a new case."
    ],
    [
      "FEE_AND_WAIVER — Clear the dismissed counts in a case where other counts stuck",
      "Fee as recorded: Not established for the partial removal itself. The § 40-32-106(a) no-cost provision is framed around removal and destruction of the public records of a person who has been charged, and whether it reaches a (c)(2) partial removal in a mixed case was not confirmed. No figure is quoted. Fee waiver as recorded: Not established for this route."
    ],
    [
      "SERVICE — Clear the dismissed counts in a case where other counts stuck",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the motion on the district attorney general in the ordinary course."
    ],
    [
      "SELF_HELP_STOP — Clear the dismissed counts in a case where other counts stuck",
      "**Stop and get help if:** Any dispute with the district attorney general about eligibility, or any indication the office will oppose. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. **Stop and get help if:** Unpaid court costs, fines or restitution, which mean the sentence is not complete. **Stop and get help if:** Any DUI, sexual offence or registration matter. **Stop and get help if:** Any domestic violence or child-victim offence. **Stop and get help if:** Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach. **Stop and get help if:** Immigration consequences, and any security-clearance question. **Stop and get help if:** Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering. **Stop and get help if:** The participant expects the whole case cleared. This remedy leaves the conviction in place. **Stop and get help if:** The count-by-count dispositions cannot be established from the clerk's record. **Stop and get help if:** The participant needs the paper file cleared and not only the electronic databases, which is the limitation that was not resolved."
    ],
    [
      "FILING_DESTINATION — Expunge an eligible conviction",
      "The committed track registry records the destination as **The office of the district attorney general for the judicial district of the convicting court**. Section 40-32-108(e) requires the petition and proposed order to be prepared by the district attorney general's office and given to the petitioner to be filed with the clerk. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from that office. LegalEase generates the participant's request and eligibility record; it does not generate the petition or the order, because those are prosecutor and court instruments. Venue as recorded: Statewide statute with originating-court venue and prosecutor-office routing. The request goes to the office of the district attorney general for the judicial district of the convicting court, because § 40-32-108(e) makes that office the preparer of the petition. The petition, once prepared, is filed by the petitioner with the clerk of the convicting court under § 40-32-108(a). A person with convictions in several judicial districts deals with each separately. Filing as recorded: Two steps with different actors. The participant requests the packet from the office of the district attorney general for the judicial district of the convicting court. That office prepares the petition and the proposed order under § 40-32-108(e) and gives them to the petitioner, who files them with the clerk of the convicting court under § 40-32-108(a). A person with convictions in more than one judicial district deals with each separately."
    ],
    [
      "FEE_AND_WAIVER — Expunge an eligible conviction",
      "Fee as recorded: A clerk's fee applies. Section 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to T.C.A. § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed code and could not be retrieved from an official Tennessee source on 2026-08-06, so no figure is quoted. The widely circulated $180 figure appears only on a superseded AOC-hosted page and appears nowhere in the enacted text of Public Chapter 268. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized §§ 40-32-106 through 40-32-110. None is asserted."
    ],
    [
      "SERVICE — Expunge an eligible conviction",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner, and who may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service."
    ],
    [
      "SELF_HELP_STOP — Expunge an eligible conviction",
      "**Stop and get help if:** Any dispute with the district attorney general about eligibility, or any indication the office will oppose. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. **Stop and get help if:** Unpaid court costs, fines or restitution, which mean the sentence is not complete. **Stop and get help if:** Any DUI, sexual offence or registration matter. **Stop and get help if:** Any domestic violence or child-victim offence. **Stop and get help if:** Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach. **Stop and get help if:** Immigration consequences, and any security-clearance question. **Stop and get help if:** Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering. **Stop and get help if:** Any felony, or any borderline Class C, D or E offence whose exact section cannot be matched against the current eligible list. **Stop and get help if:** Any other conviction anywhere on the record. The no-other-conviction requirement reaches federal and out-of-state offences that would be ineligible in Tennessee. **Stop and get help if:** Any unpaid court costs, fines or restitution. **Stop and get help if:** The district attorney general's office declines to prepare the petition, or indicates it will oppose. **Stop and get help if:** A previous expunction was granted under § 40-32-107(a), (b) or (c), which closes the route for life. **Stop and get help if:** The participant is refused here but holds a gubernatorial pardon, or is refused only by the DUI predating condition and has completed a certified recovery court programme. Rather than stopping, the participant is routed to tn_post_pardon or tn_recovery_court respectively before any no-relief answer is given. **Stop and get help if:** Mapping the offence to its exact T.C.A. section and checking it against the current eligible list is not something an offence label or class can settle. The eligible lists at T.C.A. § 40-32-107(a)(1) are enumerated section by section — Class C, Class D and Class E felony lists and a misdemeanour category with a long exclusion list — and the legislature has expanded them repeatedly, most recently by Public Chapter 930. The packet checks the current list rather than assuming, and any borderline offence goes to review. **Stop and get help if:** Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. The petition is therefore a prosecutor instrument, and LegalEase does not generate it. What LegalEase generates is the participant's own written request to the district attorney general's office for the conviction-expunction packet, with the supporting eligibility record. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from the district attorney's office, which is the practical face of that provision."
    ],
    [
      "FILING_DESTINATION — Clear a case after completing judicial diversion",
      "The committed track registry records the destination as **The county criminal, circuit or general sessions court having jurisdiction in the previous action**. Confirmed on 2026-08-06 by direct inspection of both Tennessee AOC form indices: the self-help forms page publishes only divorce and order-of-protection forms, and the full forms-and-publications inventory covers appellate, divorce, general sessions civil, mediation, non-IV-D child support, order of protection, parenting plan and trial court forms, plus licensing forms. No expunction form appears in either. This is a negative finding established by inspection of the authoritative index, not by failure to search. Venue as recorded: Statewide statute with originating-court venue. The petition goes to the court having jurisdiction in the previous action — the county criminal, circuit or general sessions court where the case originated. A person with cases in several counties files separately in each. There is no statewide participant form, so what varies locally is the clerk's own paperwork: the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges. Filing as recorded: A petition to the court having jurisdiction in the previous action, filed with that court's clerk. A separate petition is required in each county."
    ],
    [
      "FEE_AND_WAIVER — Clear a case after completing judicial diversion",
      "Fee as recorded: A clerk's fee applies. Section 40-32-106(d)(3) requires the appropriate clerk's fee pursuant to T.C.A. § 8-21-401 for destroying the records, which is the asymmetry a participant should be warned about: diversion is a non-conviction outcome but it is not free, whereas a straight dismissal is. The amount is set by § 8-21-401 and no figure is quoted here. Fee waiver as recorded: No indigency or fee-waiver provision appears in the reorganized §§ 40-32-106 to 40-32-110. The TBI operates an unpublished indigency procedure for its separate diversion certificate fee, requiring a form signed by the judge that it supplies on request and does not publish. No waiver mechanism for the clerk's expunction fee was identified."
    ],
    [
      "SERVICE — Clear a case after completing judicial diversion",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general in the ordinary course."
    ],
    [
      "SELF_HELP_STOP — Clear a case after completing judicial diversion",
      "**Stop and get help if:** Any dispute with the district attorney general about eligibility, or any indication the office will oppose. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. **Stop and get help if:** Unpaid court costs, fines or restitution, which mean the sentence is not complete. **Stop and get help if:** Any DUI, sexual offence or registration matter. **Stop and get help if:** Any domestic violence or child-victim offence. **Stop and get help if:** Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach. **Stop and get help if:** Immigration consequences, and any security-clearance question. **Stop and get help if:** Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering. **Stop and get help if:** The offence was a sexual offence or a violent sexual offence as defined in T.C.A. § 40-39-202. It could be diverted but it cannot be expunged, and the participant needs to be told that plainly rather than sold a petition. **Stop and get help if:** The diversion was not successfully completed, or completion is disputed. **Stop and get help if:** The participant's goal involves federal employment or a security clearance, since a judicial diversion guilty plea may remain visible there. **Stop and get help if:** The participant's goal involves federal employment or a security clearance. Federal systems may still see the underlying guilty plea from a judicial diversion even after expunction."
    ],
    [
      "FILING_DESTINATION — Expunge up to two offences, once in your life",
      "The committed track registry records the destination as **The office of the district attorney general for the judicial district of the convicting court**. Section 40-32-108(e) requires the petition and proposed order to be prepared by the district attorney general's office and given to the petitioner to be filed with the clerk. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from that office. LegalEase generates the participant's request and eligibility record; it does not generate the petition or the order, because those are prosecutor and court instruments. Venue as recorded: Statewide statute with originating-court venue and prosecutor-office routing. The request goes to the office of the district attorney general for the judicial district of the convicting court, because § 40-32-108(e) makes that office the preparer of the petition. The petition, once prepared, is filed by the petitioner with the clerk of the convicting court under § 40-32-108(a). A person with convictions in several judicial districts deals with each separately. Filing as recorded: Two steps with different actors. The participant requests the packet from the office of the district attorney general for the judicial district of the convicting court. That office prepares the petition and the proposed order under § 40-32-108(e) and gives them to the petitioner, who files them with the clerk of the convicting court under § 40-32-108(a). A person with convictions in more than one judicial district deals with each separately."
    ],
    [
      "FEE_AND_WAIVER — Expunge up to two offences, once in your life",
      "Fee as recorded: A clerk's fee applies. Section 40-32-108(a) provides that a person applying for expunction of records under the section must be charged the appropriate court clerk's fee pursuant to T.C.A. § 8-21-401. The amount is set by § 8-21-401, whose current text sits in the licensed code and could not be retrieved from an official Tennessee source on 2026-08-06, so no figure is quoted. The widely circulated $180 figure appears only on a superseded AOC-hosted page and appears nowhere in the enacted text of Public Chapter 268. Public Chapter 719 did not change any fee provision. Fee waiver as recorded: No indigency or fee-waiver provision appears anywhere in the reorganized §§ 40-32-106 through 40-32-110. None is asserted."
    ],
    [
      "SERVICE — Expunge up to two offences, once in your life",
      "Service as recorded: Through the clerk. The participant does not effect service. Notice as recorded: The clerk serves the petition on the district attorney general, who may submit recommendations within 60 days with a copy to the petitioner, and who may file evidence under seal which is confidential and not a public record. The court may not order sooner than 61 days after service."
    ],
    [
      "SELF_HELP_STOP — Expunge up to two offences, once in your life",
      "**Stop and get help if:** Any dispute with the district attorney general about eligibility, or any indication the office will oppose. **Stop and get help if:** Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. **Stop and get help if:** Unpaid court costs, fines or restitution, which mean the sentence is not complete. **Stop and get help if:** Any DUI, sexual offence or registration matter. **Stop and get help if:** Any domestic violence or child-victim offence. **Stop and get help if:** Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach. **Stop and get help if:** Immigration consequences, and any security-clearance question. **Stop and get help if:** Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering. **Stop and get help if:** Any felony, or any borderline Class C, D or E offence whose exact section cannot be matched against the current eligible list. **Stop and get help if:** Any other conviction anywhere on the record. The no-other-conviction requirement reaches federal and out-of-state offences that would be ineligible in Tennessee. **Stop and get help if:** Any unpaid court costs, fines or restitution. **Stop and get help if:** The district attorney general's office declines to prepare the petition, or indicates it will oppose. **Stop and get help if:** A previous expunction was granted under § 40-32-107(a), (b) or (c), which closes the route for life. **Stop and get help if:** The strategic question of whether to use the one lifetime opportunity now or wait for a third conviction to become eligible. That is advice rather than form-filling and it belongs with a lawyer. **Stop and get help if:** Whether two convictions arose from a single criminal episode, which decides whether the participant is spending one slot or two. **Stop and get help if:** The participant is refused here but holds a gubernatorial pardon, or is refused only by the DUI predating condition and has completed a certified recovery court programme. Rather than stopping, the participant is routed to tn_post_pardon or tn_recovery_court respectively before any no-relief answer is given. **Stop and get help if:** Mapping the offence to its exact T.C.A. section and checking it against the current eligible list is not something an offence label or class can settle. The eligible lists at T.C.A. § 40-32-107(a)(1) are enumerated section by section — Class C, Class D and Class E felony lists and a misdemeanour category with a long exclusion list — and the legislature has expanded them repeatedly, most recently by Public Chapter 930. The packet checks the current list rather than assuming, and any borderline offence goes to review. **Stop and get help if:** The two-offence pathway is once per lifetime, and the reciprocal bars across § 40-32-107(a), (b) and (c) mean a single earlier grant closes it. A participant with two eligible offences now and a third that becomes eligible later should be told that using it now closes the door. **Stop and get help if:** Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. The petition is therefore a prosecutor instrument, and LegalEase does not generate it. What LegalEase generates is the participant's own written request to the district attorney general's office for the conviction-expunction packet, with the supporting eligibility record. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from the district attorney's office, which is the practical face of that provision."
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
        "Clear an arrest that never reached a courtroom",
        "Expunction of the arrest record, with the § 40-32-110 effect expressly applied by § 40-32-109(f): the petitioner is entitled to have all public records destroyed, is restored in contemplation of law to the status occupied before the arrest, must not suffer adverse effects or collateral disabilities by virtue of the offence, and is not guilty of perjury for failing to acknowledge the arrest in response to any inquiry."
      ],
      [
        "Clear a conviction for illegal registration or voting",
        "Expunction of the conviction record."
      ],
      [
        "Clear an arrest that was not yours",
        "Mistaken identity is one of the enumerated non-conviction grounds in the reorganized § 40-32-106(a)(1), and Public Chapter 268 of 2025 rewrote § 40-32-101 as a chapter-wide definitions section that defines mistaken identity for the whole chapter."
      ],
      [
        "Clear a charge that did not end in a conviction",
        "Created by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608 effective 2026-03-25."
      ],
      [
        "Clear a conviction you have been pardoned for",
        "Expunction of the pardoned conviction record, with the § 40-32-110 effect."
      ],
      [
        "Clear a case after completing pretrial diversion",
        "Prosecution is suspended under a memorandum of understanding with the district attorney general; the person does not plead guilty and is not found guilty."
      ],
      [
        "Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
        "Expunction of one otherwise-eligible offence, with the § 40-32-110 effect."
      ],
      [
        "Clear the dismissed counts in a case where other counts stuck",
        "The controlling review identified this remedy from a secondary profile and left its citation unresolved as the highest-value Tennessee research item."
      ],
      [
        "Expunge an eligible conviction",
        "Public Chapter 268 of 2025 split the former § 40-32-101(g) conviction route along an eligibility and procedure seam: § 40-32-107 now defines who is an eligible petitioner and § 40-32-108 supplies the whole procedure."
      ],
      [
        "Clear a case after completing judicial diversion",
        "Judicial diversion under T.C.A."
      ],
      [
        "Expunge up to two offences, once in your life",
        "Read at source on 2026-08-06."
      ]
    ],
    "footnotes": [
      "Every page states its own route in its footer. If two routes could fit your record, that is a question for a lawyer or a legal-aid office, not a choice to guess at."
    ]
  },
  "documentsToObtain": [
    [
      "Obtain TBI criminal history. Order the TBI criminal history first. It is what shows the arrest record exists at all, and it supplies the state control number referenced in T.C.A. § 8-4-115. Without it the participant cannot show there is an arrest record to expunge. LegalEase never receives, inspects or authenticates it.",
      "Tennessee Bureau of Investigation"
    ],
    [
      "Obtain Whatever the arresting agency holds about the arrest. Ask the arresting agency for what it holds. LegalEase names the kinds of material that bear on the point and does nothing more: it never assembles, reviews or vouches for any of it.",
      "The agency that made the arrest"
    ],
    [
      "Obtain Anything the participant chooses to file under § 40-32-109(b) bearing on the absence of a court record. The participant gathers whatever they have. LegalEase does not judge whether it is sufficient and does not assert what the clerk's search will find.",
      "The participant's own records, or a clerk asked informally whether a file exists"
    ],
    [
      "Obtain TBI criminal history. Order the TBI criminal history first. It supplies the state control number referenced in T.C.A. § 8-4-115, without which the order cannot be completed, and it establishes the no-other-conviction position. LegalEase never receives, inspects or authenticates it.",
      "Tennessee Bureau of Investigation"
    ],
    [
      "Obtain Court disposition and judgment from the convicting court's clerk. Ask the clerk for the judgment and disposition. It supplies the exact statutory section the eligibility screen turns on and the sentence-completion facts, and clerks will also say whether the county uses the pre-2025 or the reorganized section numbering.",
      "The clerk of the convicting court"
    ],
    [
      "Obtain Proof that every fine, restitution amount, court cost and other assessment is paid in full. Ask the clerk for a current balance on the case and for confirmation that probation or supervision was completed. Outstanding amounts mean the sentence is not complete and the fifteen-year clock has not started.",
      "The clerk of the convicting court, and any agency holding restitution or costs"
    ],
    [
      "Obtain FBI Identity History Summary where records may extend beyond Tennessee. Request the Identity History Summary. The condition that the offence predate any conviction for an expunction-ineligible offence reaches federal offences and out-of-state offences that would be ineligible in Tennessee, so a Tennessee-only history may not answer it.",
      "The Federal Bureau of Investigation"
    ],
    [
      "Obtain TBI criminal history. Order the TBI criminal history first. It confirms the disposition, supplies the state control number the order cannot be completed without, and establishes the no-other-conviction requirement that the conviction routes turn on. LegalEase never receives, inspects or authenticates it.",
      "Tennessee Bureau of Investigation"
    ],
    [
      "Obtain Court disposition from the originating clerk. Ask the clerk for the disposition. It establishes exactly how the case ended, which is what decides the route, and clerks will also tell you whether the county uses the pre-2025 or the reorganized section numbering.",
      "The clerk of the county criminal, circuit or general sessions court where the case originated"
    ],
    [
      "Obtain Whatever the participant has establishing that the arrest or charge was not theirs. The participant gathers what they can. LegalEase names the kinds of material that bear on identity and does nothing more: it never receives, inspects or authenticates any of it, and never asserts that identity has been disproved.",
      "The participant's own records, employers, or the arresting agency"
    ],
    [
      "Obtain The pardon document from the Governor. Obtain a copy of the pardon. It is the trigger for the whole route and the district attorney general's office will need it to prepare the petition. LegalEase never receives, inspects or authenticates it.",
      "The Office of the Governor of Tennessee"
    ],
    [
      "Obtain The board of parole record showing the positive vote to receive a pardon. Ask the board of parole for the record of its vote. Subsection (d)(1)(B) makes the positive vote a cumulative requirement alongside the pardon itself.",
      "The Tennessee Board of Parole"
    ],
    [
      "Obtain Order or record showing successful completion of diversion and dismissal of the charges. Ask the clerk or the district attorney general's office for the record of successful completion and the dismissal. It establishes the ground and it is what distinguishes this route from the free dismissal route.",
      "The clerk of the court that ordered the diversion, or the district attorney general's office that signed the diversion agreement"
    ],
    [
      "Obtain The certified recovery court programme completion record. Ask the recovery court for the record of successful completion. It is a cumulative requirement of the subsection. What document evidences it and which body issues it was not established from the adopted authority chain, so the participant should ask the recovery court what it issues.",
      "The recovery court that certified the programme"
    ],
    [
      "Obtain The judgment for the T.C.A. § 55-10-401 conviction. Ask that clerk for the judgment. It fixes the date the ten-year interval runs from and shows whether there is more than one such conviction.",
      "The clerk of the court that entered the DUI conviction"
    ],
    [
      "Obtain Proof that every sentence requirement for the offence being expunged is fulfilled. Ask the clerk for a current balance and for confirmation that probation or supervision was completed.",
      "The clerk of the convicting court, and any agency holding restitution or costs"
    ],
    [
      "Obtain Proof that the entire sentence is complete, including all fines, restitution, court costs and other assessments. Ask the clerk for a current balance on the case and for confirmation that probation or supervision was completed. Outstanding amounts mean the sentence is not complete and the waiting-period clock has not started, which is the single most common reason a Tennessee conviction petition fails.",
      "The clerk of the convicting court, and any agency holding restitution or costs"
    ],
    [
      "Obtain FBI Identity History Summary where records may extend beyond Tennessee. Request the Identity History Summary. The no-other-conviction requirement reaches federal offences and out-of-state offences that would be ineligible in Tennessee, so a Tennessee-only history may not answer it.",
      "The Federal Bureau of Investigation"
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
      "Clear an arrest that never reached a courtroom",
      "No TBI certificate step arises on this route. Section 40-32-102(c)(1) expressly exempts the court from submitting a certificate where the expungement is pursuant to § 40-32-109, and § 40-32-109(d) directs the court to review only the clerk's certification and the evidence submitted."
    ],
    [
      "Clear an arrest that never reached a courtroom",
      "Payment of the clerk's fee under T.C.A. § 8-21-401, which § 40-32-109(e) makes mandatory. There is no indigency, waiver or without-cost provision in § 40-32-109, in express contrast to § 40-32-106(a)(1). The participant must be told this route is not free before anything is prepared."
    ],
    [
      "Clear a conviction for illegal registration or voting",
      "The TBI certificate under T.C.A. § 40-32-102(c) is required on this route and an order of expunction must not be entered unless it is attached. It is a court instrument completed by court staff and submitted to the TBI. LegalEase does not generate it, does not complete it and does not assert it has been obtained."
    ],
    [
      "Clear a conviction for illegal registration or voting",
      "Not official_pdf_fill, because no participant form exists: the Tennessee AOC publishes no expunction form of any kind, and TBI form BI-0333 is a court order carrying an approved-for-entry block with signature lines for defence, the district attorney general and the judge. Not process_guidance, because a genuine participant-facing written submission exists and its destination, addressee and operative content are all determined. The generated artifact is the request and the eligibility record, never the petition, the proposed order, the TBI certificate or the clerk's instrument."
    ],
    [
      "Clear an arrest that was not yours",
      "Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing."
    ],
    [
      "Clear a charge that did not end in a conviction",
      "Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing."
    ],
    [
      "Clear a charge that did not end in a conviction",
      "Add T.C.A. § 40-6-204(b) to participant education: a person being charged with a crime must be informed that if the charges are dismissed or nolle prossed, or no charges are filed, they are entitled on request to removal and destruction of all public records without cost. Participants often do not know this was said to them. The current text of § 40-6-204 could not be retrieved from an official Tennessee source on 2026-08-06, so the packet names the right and its statutory home without quoting the provision."
    ],
    [
      "Clear a charge that did not end in a conviction",
      "The court certifies to the TBI before entry where a certificate is required, and forwards the order within 30 days. On this route no certificate is required unless the case came through diversion."
    ],
    [
      "Clear a conviction you have been pardoned for",
      "The TBI certificate under T.C.A. § 40-32-102(c) is required on this route and an order of expunction must not be entered unless it is attached. It is a court instrument completed by court staff and submitted to the TBI. LegalEase does not generate it, does not complete it and does not assert it has been obtained."
    ],
    [
      "Clear a conviction you have been pardoned for",
      "Not official_pdf_fill, because no participant form exists: the Tennessee AOC publishes no expunction form of any kind, and TBI form BI-0333 is a court order carrying an approved-for-entry block with signature lines for defence, the district attorney general and the judge. Not process_guidance, because a genuine participant-facing written submission exists and its destination, addressee and operative content are all determined. The generated artifact is the request and the eligibility record, never the petition, the proposed order, the TBI certificate or the clerk's instrument."
    ],
    [
      "Clear a conviction you have been pardoned for",
      "Public Chapter 719 Section 3 rewrote § 40-32-108(d)(2) so that the court weighs the interest of the petitioner against the best interests of justice and public safety; the rebuttable presumption that the petition should be granted is preserved only for petitioners eligible under § 40-32-107(a)(1)(A) to (E). A subsection (d) petitioner therefore gets no presumption, and the court instead considers whether the offence sought to be expunged was violent and any other relevant factors presented by the petitioner and the district attorney general. Violence moved from a jurisdictional bar to a merits consideration."
    ],
    [
      "Clear a case after completing pretrial diversion",
      "Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing."
    ],
    [
      "Clear a case after completing pretrial diversion",
      "A petition is still required after diversion. Completing diversion dismisses the case but leaves it visible until a separate expunction petition is filed, and this is the second most common Tennessee misunderstanding after the not-automatic point."
    ],
    [
      "Clear a case after completing pretrial diversion",
      "The order of expungement is marked Suspension of Prosecution § 40-15-105 for a pretrial diversion case, which is how the TBI records it. The marking requirement is part of the court's instrument rather than the participant's."
    ],
    [
      "Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "The TBI certificate under T.C.A. § 40-32-102(c) is required on this route and an order of expunction must not be entered unless it is attached. It is a court instrument completed by court staff and submitted to the TBI. LegalEase does not generate it, does not complete it and does not assert it has been obtained."
    ],
    [
      "Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "Not official_pdf_fill, because no participant form exists: the Tennessee AOC publishes no expunction form of any kind, and TBI form BI-0333 is a court order carrying an approved-for-entry block with signature lines for defence, the district attorney general and the judge. Not process_guidance, because a genuine participant-facing written submission exists and its destination, addressee and operative content are all determined. The generated artifact is the request and the eligibility record, never the petition, the proposed order, the TBI certificate or the clerk's instrument."
    ],
    [
      "Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "Subsection (e) is not named in the § 40-32-108(d)(2) rebuttable presumption, which reaches only petitioners eligible under § 40-32-107(a)(1)(A) to (E), and it is not reached by the violence-weighing sentence Public Chapter 719 added for subsection (d) petitioners. An (e) petitioner therefore falls into the bare default: the court weighs the interest of the petitioner against the best interests of justice and public safety."
    ],
    [
      "Clear an eligible offence after finishing recovery court, where an old DUI is in the way",
      "Public Chapter 930 applies to this route only as the integrated decision states: it relocates burglary within the § 40-32-107(a)(1) class lists for offences committed on or after 2026-07-01, and reaches subsection (e) only because (e)(1)(A)(i) requires the offence to be eligible under (a)(1). Public Chapter 1061 itself carries no offence-date limitation."
    ],
    [
      "Clear the dismissed counts in a case where other counts stuck",
      "Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing."
    ],
    [
      "Expunge an eligible conviction",
      "Where the eligibility requirements are satisfied there is a rebuttable presumption that the petition should be granted, which shifts the practical burden to the district attorney general to object. Public Chapter 719, effective 2026-04-14, rewrote T.C.A. § 40-32-108(d)(2) and preserved that presumption for petitioners eligible under § 40-32-107(a)(1)(A) to (E), while providing that the court weighs the interest of the petitioner against the best interests of justice and public safety. The packet may describe the presumption; it may not state that the petition will be granted."
    ],
    [
      "Expunge an eligible conviction",
      "Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing."
    ],
    [
      "Expunge an eligible conviction",
      "Routing added by the integrated Tennessee 2026 route inventory decision, without any change to this route's own eligibility rules. A participant refused here because the conviction is outside the § 40-32-107(a)(1) lists but who holds a gubernatorial pardon is evaluated under tn_post_pardon. A participant refused here only by the § 40-32-107(a)(3)(A) predating condition because of a DUI conviction, who completed a certified recovery court programme with a ten-year interval, is evaluated under tn_recovery_court. The exclusion list is unchanged in both cases."
    ],
    [
      "Clear a case after completing judicial diversion",
      "Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing."
    ],
    [
      "Clear a case after completing judicial diversion",
      "A petition is still required after diversion. Completing diversion dismisses the case but leaves it visible until a separate expunction petition is filed, and this is the second most common Tennessee misunderstanding after the not-automatic point."
    ],
    [
      "Clear a case after completing judicial diversion",
      "Federal systems and security-clearance background checks may still see the underlying guilty plea from a judicial diversion. That should be stated to every judicial diversion participant."
    ],
    [
      "Expunge up to two offences, once in your life",
      "Where the eligibility requirements are satisfied there is a rebuttable presumption that the petition should be granted, which shifts the practical burden to the district attorney general to object. Public Chapter 719, effective 2026-04-14, rewrote T.C.A. § 40-32-108(d)(2) and preserved that presumption for petitioners eligible under § 40-32-107(a)(1)(A) to (E), while providing that the court weighs the interest of the petitioner against the best interests of justice and public safety. The packet may describe the presumption; it may not state that the petition will be granted."
    ],
    [
      "Expunge up to two offences, once in your life",
      "Confirm the statutory citation with the county clerk or district attorney general before every filing. Chapter 32 was reorganized by Public Chapter 268 of 2025, effective 2025-04-24, and codified by Public Chapter 608, the 2026 Code Bill, effective 2026-03-25. Clerks and published guidance may still use the pre-reorganization numbering: the Tennessee AOC's own expunction page is titled to say updated information is coming to reflect changes to T.C.A. § 40-32-101 and still reasons from that section, which since 2025-04-24 has been nothing but a definitions section. A generated petition citing the wrong section is a rejection risk either way, so the packet is built to carry the current citation with the superseded one noted, and instructs the participant to confirm before filing."
    ],
    [
      "Expunge up to two offences, once in your life",
      "Routing added by the integrated Tennessee 2026 route inventory decision, without any change to this route's own eligibility rules. A participant refused here because the conviction is outside the § 40-32-107(a)(1) lists but who holds a gubernatorial pardon is evaluated under tn_post_pardon. A participant refused here only by the § 40-32-107(a)(3)(A) predating condition because of a DUI conviction, who completed a certified recovery court programme with a ten-year interval, is evaluated under tn_recovery_court. The exclusion list is unchanged in both cases."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "The court does in fact have a record of the arrest. That takes the participant out of this route entirely and into the § 40-32-106 analysis, which is the free route; the participant is redirected there rather than handed off.",
    "The district attorney general files evidence that the court does have a history of the arrest. That converts the matter into a contested question of fact and the participant is handed off to an attorney.",
    "Whether a prior court action or court file ever existed is disputed. LegalEase does not adjudicate that question: the clerk searches and certifies and the court finds, so a disputed history is handed off to an attorney.",
    "The participant cannot establish from the TBI criminal history that an arrest record exists at all. The participant is directed back to the TBI before the route reopens.",
    "The participant is seeking relief for a case that reached the court and was dismissed, no-true-billed, nolle prossed or acquitted. That is the free § 40-32-106 route and the participant is redirected to it rather than paying here.",
    "Federal, military, tribal or out-of-state records, immigration consequences and any security-clearance question, each of which is referred out because Tennessee expunction does not reach them.",
    "The clerk's office searches the court's records and certifies to the court whether there is any history of the arrest. That certification is a clerk instrument, it is filed either way because it certifies whether there is any history, and it is never generated, pre-completed or predicted. The district attorney general is served by the clerk and may file evidence under (b). The court reviews and decides, and the grant is discretionary.",
    "The office of the district attorney general declines to prepare the petition, or indicates it will oppose. Self-help stops and the participant is handed off to an attorney; the participant keeps the generated request, the controlled factual record and the instructions.",
    "Eligibility is disputed by the district attorney general's office. That is a contested determination for that office and, on filing, for the court; it is handed off to an attorney rather than argued in the packet.",
    "Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee. Handed off to an attorney before anything is sent.",
    "Any unpaid court costs, fines, restitution or other assessments, which mean the sentence is not complete. The participant is directed to the convicting court's clerk to resolve the balance before the route reopens.",
    "Any borderline offence whose exact section cannot be matched against the current eligible list. Handed off to an attorney.",
    "Any question whether the conviction was under T.C.A. § 2-19-107 rather than another elections or fraud provision. The route reaches only that section, so an unresolved identification is handed off to an attorney rather than guessed.",
    "Any collateral question about restoration of voting rights, which is a separate remedy under separate machinery and is referred out.",
    "Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. They are prosecutor instruments. LegalEase generates the participant's request and eligibility record and nothing else, and never characterises either generated document as the district attorney general's petition or proposed order.",
    "Any dispute with the district attorney general about eligibility, or any indication the office will oppose.",
    "Any other conviction anywhere on the record, including federal and out-of-state convictions that would be ineligible in Tennessee.",
    "Unpaid court costs, fines or restitution, which mean the sentence is not complete.",
    "Any DUI, sexual offence or registration matter.",
    "Any domestic violence or child-victim offence.",
    "Federal, military, tribal or out-of-state records, which Tennessee expunction does not reach.",
    "Immigration consequences, and any security-clearance question.",
    "Any question that turns on whether the county clerk uses the pre-2025 or the reorganized section numbering.",
    "Any dispute about whether the participant is in fact the person arrested or charged. Proving mistaken identity is a factual showing, and a contested one is outside self-help.",
    "The participant cannot document the circumstances at all.",
    "Any count in the case resulted in a conviction, which routes to the redaction analysis.",
    "The dismissal followed completion of a diversion programme, which routes to the diversion tracks.",
    "The participant is being asked to pay for this route, which the statute says is free.",
    "Whether any court case, court file or previous court action ever existed is disputed or cannot be established. LegalEase does not adjudicate that question; the participant is handed off to an attorney, and where the answer is that nothing reached the court the route is tn_arrest_no_court_record rather than this one.",
    "Any case where the conviction may fall within one of the seven excluded felony categories, or within an attempt, conspiracy, facilitation or solicitation form of one. Handed off to an attorney rather than tested in the packet.",
    "Any case where the violence question is genuinely contested. After Public Chapter 719 it is a merits factor the court weighs, and arguing it is individualized advocacy; the participant is handed off to an attorney.",
    "Any participant who does not yet hold a pardon. The clemency application is a separate proceeding before the board of parole and the Governor and is referred out.",
    "The offence was a sexual offence or a violent sexual offence as defined in T.C.A. § 40-39-202. It could be diverted but it cannot be expunged, and the participant needs to be told that plainly rather than sold a petition.",
    "The diversion was not successfully completed, or completion is disputed.",
    "The participant's goal involves federal employment or a security clearance, since a judicial diversion guilty plea may remain visible there.",
    "The participant wants the DUI itself expunged. Subsection (e)(3) forbids it. The packet says so plainly and the participant is referred to an attorney if they want that question examined further.",
    "The offence being expunged involves a motor vehicle and the use of alcohol or a controlled substance, which is an absolute bar under (e)(3) even where every other condition is met. Handed off to an attorney.",
    "More than one conviction under T.C.A. § 55-10-401, which closes the route under (e)(1)(E). Handed off to an attorney.",
    "The ten-year interval between the DUI conviction and the offence being expunged cannot be established from the judgments. The participant is directed to the clerks of both courts before the route reopens.",
    "The participant expects the whole case cleared. This remedy leaves the conviction in place.",
    "The count-by-count dispositions cannot be established from the clerk's record.",
    "The participant needs the paper file cleared and not only the electronic databases, which is the limitation that was not resolved.",
    "Any felony, or any borderline Class C, D or E offence whose exact section cannot be matched against the current eligible list.",
    "Any other conviction anywhere on the record. The no-other-conviction requirement reaches federal and out-of-state offences that would be ineligible in Tennessee.",
    "Any unpaid court costs, fines or restitution.",
    "The district attorney general's office declines to prepare the petition, or indicates it will oppose.",
    "A previous expunction was granted under § 40-32-107(a), (b) or (c), which closes the route for life.",
    "The participant is refused here but holds a gubernatorial pardon, or is refused only by the DUI predating condition and has completed a certified recovery court programme. Rather than stopping, the participant is routed to tn_post_pardon or tn_recovery_court respectively before any no-relief answer is given.",
    "Mapping the offence to its exact T.C.A. section and checking it against the current eligible list is not something an offence label or class can settle. The eligible lists at T.C.A. § 40-32-107(a)(1) are enumerated section by section — Class C, Class D and Class E felony lists and a misdemeanour category with a long exclusion list — and the legislature has expanded them repeatedly, most recently by Public Chapter 930. The packet checks the current list rather than assuming, and any borderline offence goes to review.",
    "Under T.C.A. § 40-32-108(e) the petition and proposed order must be prepared by the office of the district attorney general and given to the petitioner to be filed with the clerk of the court. The petition is therefore a prosecutor instrument, and LegalEase does not generate it. What LegalEase generates is the participant's own written request to the district attorney general's office for the conviction-expunction packet, with the supporting eligibility record. Both the Tennessee AOC and the TBI direct participants to request a conviction expungement packet from the district attorney's office, which is the practical face of that provision.",
    "The participant's goal involves federal employment or a security clearance. Federal systems may still see the underlying guilty plea from a judicial diversion even after expunction.",
    "The strategic question of whether to use the one lifetime opportunity now or wait for a third conviction to become eligible. That is advice rather than form-filling and it belongs with a lawyer.",
    "Whether two convictions arose from a single criminal episode, which decides whether the participant is spending one slot or two.",
    "The two-offence pathway is once per lifetime, and the reciprocal bars across § 40-32-107(a), (b) and (c) mean a single earlier grant closes it. A participant with two eligible offences now and a third that becomes eligible later should be told that using it now closes the door."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official TN form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that any district attorney general's office will prepare a petition on request, which the committed record makes that office's decision"
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
      "finding": "Five of this family's eleven committed tracks record their component set as a request to the district attorney general plus an eligibility record, not as a petition, because § 40-32-108(e) makes that office the preparer of the petition.",
      "consequence": "Those five ship the request and the eligibility record the committed record describes, and state that the district attorney general's office prepares the petition and that the participant then files it with the clerk of the convicting court under § 40-32-108(a). No petition is composed for a route where the statute assigns its preparation elsewhere."
    },
    {
      "finding": "The committed venue statement for the redaction route records that there is no statewide participant form and that the AOC directs filers to check with the court clerk because separate forms may be required for multiple charges.",
      "consequence": "That is stated on the redaction filing instructions page, and the count-by-count schedule is shipped as its own component so a multi-charge case is not squeezed onto one line."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for these routes.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers.",
    "This family carries 11 statutory routes in one packet; each page states its own route and the instructions carry a which-pages-are-yours table."
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

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");

/*
 * FIX08: align the family with the exact route contracts it already binds.
 *
 * The original family declared one generic filing-instructions component per
 * route.  The registry instead declares an ordered, role-specific component
 * set.  It also declares the generation questions for the five prosecutor-
 * preparation routes, while the old eligibility records repeated five generic
 * blanks.  Read those two contracts from the already-bound registry so a later
 * registry change cannot leave a second hand-maintained component/question list
 * silently stale in this builder.
 */
function registryText(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  for (const key of ["description", "instruction", "question", "statement", "name"]) {
    if (typeof value[key] === "string") return value[key];
  }
  return JSON.stringify(value);
}

function specializedGuidanceBody(track, component, participantLine) {
  const role = String(component.role ?? "process guidance").replaceAll("_", " ");
  const lines = [participantLine, "", "WHAT THIS COMPONENT COVERS", "", `This is the ${role} component prescribed by the committed route contract.`, ""];
  const add = (heading, values) => {
    const clean = values.map(registryText).filter(Boolean);
    if (!clean.length) return;
    lines.push(heading, "", ...clean.map((text) => `- ${text}`), "");
  };
  if (/fee|cost|certification/.test(component.role)) {
    add("FEE, SIGNING, AND CERTIFICATION DIRECTIONS", (track.participantFilingRequirements ?? [])
      .filter((item) => /fee|waiver|cost|sign|notar|certif/i.test(`${item.kind ?? ""} ${registryText(item) ?? ""}`)));
  }
  if (/scope|alternative|routing/.test(component.role)) {
    add("ROUTE AND SCOPE DIRECTIONS", [...(track.scopeRestrictions ?? []), ...(track.selfHelpStopConditions ?? [])]);
  }
  if (/clerk_search/.test(component.role)) {
    add("CLERK SEARCH AND CERTIFICATION DIRECTIONS", [track.destination, track.venue, ...(track.packetInstructions ?? [])]);
  }
  if (lines.length === 6) add("ROUTE DIRECTIONS", track.packetInstructions ?? []);
  return lines;
}

function applyExactTennesseeRouteContracts() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "data/record-clearing/legal-design-track-registry.json"), "utf8"));
  const trackById = new Map((registry.tracks ?? []).map((track) => [track.trackId, track]));
  const routeTrackId = (routeKey) => String(routeKey).split(":")[3];
  const oldById = new Map(SPEC.components.map((component) => [component.id, component]));
  const oldByRoute = new Map();
  for (const component of SPEC.components) {
    oldByRoute.set(component.routeKey, [...(oldByRoute.get(component.routeKey) ?? []), component]);
  }

  const repaired = [];
  for (const route of SPEC.routes) {
    const trackId = routeTrackId(route.routeKey);
    const track = trackById.get(trackId);
    assert.ok(track?.packetSet?.components?.length, `${trackId}: registry packetSet is absent`);
    const former = oldByRoute.get(route.routeKey) ?? [];
    const genericGuidance = former.find((component) => component.role === "filing_instructions");
    assert.ok(genericGuidance, `${trackId}: existing bound guidance component is absent`);
    const participantLine = genericGuidance.body.find((line) => String(line).includes("{{participant.full_legal_name}}"))
      ?? "This page is for {{participant.full_legal_name}}.";

    for (const prescribed of [...track.packetSet.components].sort((a, b) => a.order - b.order)) {
      const existing = oldById.get(prescribed.componentId);
      if (existing) {
        repaired.push({ ...existing, role: prescribed.role });
        continue;
      }
      assert.equal(prescribed.outputStrategy, "process_guidance",
        `${prescribed.componentId}: a missing non-guidance component cannot be synthesized by this repair`);
      const carriesFullGuidance = /filing_and|process_and_expectation/.test(prescribed.role);
      repaired.push({
        ...genericGuidance,
        id: prescribed.componentId,
        role: prescribed.role,
        title: `${String(prescribed.role).replaceAll("_", " ")} - ${track.publicName ?? track.legalName}`,
        description: `${String(prescribed.role).replaceAll("_", " ")} prescribed by the committed ${trackId} packet contract`,
        body: carriesFullGuidance
          ? genericGuidance.body
          : specializedGuidanceBody(track, prescribed, participantLine),
      });
    }
  }
  SPEC.components = repaired;

  const questionTracks = new Set([
    "tn_illegal_voting", "tn_post_pardon", "tn_recovery_court",
    "tn_eligible_conviction", "tn_two_offense",
  ]);
  for (const component of SPEC.components) {
    const trackId = routeTrackId(component.routeKey);
    if (!questionTracks.has(trackId) || !/eligibility_record/.test(component.role)) continue;
    const track = trackById.get(trackId);
    const questions = track.generationRequirements ?? [];
    assert.ok(questions.length > 0, `${trackId}: registry generationRequirements are absent`);
    const protectedBlanks = (component.blanks ?? []).filter((blank) => blank.kind === "protected");
    component.body = [
      `FOR: {{participant.full_legal_name}}`,
      "MAILING ADDRESS: {{participant.street_address}}",
      "TELEPHONE: {{participant.phone}}",
      "EMAIL: {{participant.email}}",
      "DATE OF BIRTH: {{participant.date_of_birth}}",
      "",
      "ELIGIBILITY RECORD",
      "",
      "Complete every applicable item from your own records. These are the exact generation questions in the committed route contract.",
      "",
      ...questions.flatMap((requirement, index) => [
        `Item ${index + 1}. ${requirement.question}`,
        "{{DOTS}}",
        "{{DOTS}}",
        "",
      ]),
      "DATE {{DOTS:30}}   SIGNATURE {{DOTS:44}}",
      "",
      "(The person named above signs and dates this record personally.)",
    ];
    component.blanks = [
      ...questions.map((requirement, index) => ({
        kind: "rbf",
        id: `generation_${requirement.key}`,
        label: `Item ${index + 1} - ${requirement.question}`,
        supply: requirement.question,
        why: `the committed track registry declares this ${requirement.requirement} generation input for ${trackId}`,
      })),
      ...protectedBlanks,
    ];
  }

  const expectedCount = [...questionTracks].reduce((count, trackId) =>
    count + (trackById.get(trackId)?.generationRequirements?.length ?? 0), 0);
  const suppliedCount = SPEC.components.reduce((count, component) => count
    + (component.blanks ?? []).filter((blank) => blank.id.startsWith("generation_")).length, 0);
  assert.equal(SPEC.components.length, 38, "Tennessee packet contract must declare all 38 components");
  assert.equal(expectedCount, 77, "the five route contracts must still declare exactly 77 generation inputs");
  assert.equal(suppliedCount, expectedCount, "every route generation input must become a participant-supplied field");
}

applyExactTennesseeRouteContracts();
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
const COMPACT_GUIDANCE_COMPONENTS = new Set([
  "tn_nonconviction_petition-filing-and-after-order-instructions-3",
  "tn_pretrial_diversion-filing-and-after-order-instructions-3",
  "tn_judicial_diversion-filing-and-after-order-instructions-3",
]);

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

async function renderComposedPdf(fullText, title, componentId) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11;
  // These three long guidance sheets previously stranded the final route-list
  // item and route line on a near-empty third page. A small leading reduction
  // keeps that closing block with the preceding guidance without
  // changing any word, component, field, margin, or type size.
  const lineHeight = COMPACT_GUIDANCE_COMPONENTS.has(componentId) ? 13 : 14.5;
  const width = 612, height = 792, margin = 72;
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
  const rows = sanitizePdfText(fullText).split("\n").flatMap((raw) => wrap(raw));
  const footerKeepStart = Math.max(0, rows.length - 4);
  for (const [index, row] of rows.entries()) {
    if (index === footerKeepStart && y - (rows.length - index) * lineHeight < margin) {
      page = pdf.addPage([width, height]);
      y = height - margin;
    }
    draw(row);
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
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
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
      const composedBytes = await renderComposedPdf(body, COMPONENT[componentId].title, componentId);
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
      documents, components: COMPONENT_IDS,
      role: "family_assembly_of_every_route",
      deliveryRole: SPEC.routes.length === 1
        ? "participant_deliverable"
        : "build_and_review_evidence_only_not_a_participant_deliverable"
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

  /* ---- the per-route artifacts, which are what a participant actually receives ----
   *
   * The unit of delivery is a ROUTE, not a family. The assembly above concatenates
   * every route's components into one packet; on a family carrying more than one
   * statutory route that packet is nobody's deliverable, because it would hand a
   * participant the pages of remedies they did not ask for and cannot use. It is
   * retained as build and review evidence — see deliveryRole on each entry — and
   * it is not a participant deliverable.
   *
   * What a participant receives is the artifact for their own route: only that
   * route's components, in the order this family's own component declarations
   * carry them. The pages are the same pages. Each component is rendered by
   * renderComposedPdf from its own declared body alone, and no composed page
   * carries a packet page number, a running header or any other value that
   * depends on what else sits in the packet — so this is an assembly change and
   * not new packet content.
   */
  const routeSlug = (routeKey) => String(routeKey).split(":")[3];
  for (const c of SPEC.components) {
    assert.ok(SPEC.routes.some((r) => r.routeKey === c.routeKey),
      `${c.id}: carries route ${c.routeKey}, which this family does not declare`);
  }
  const routeArtifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    for (const route of SPEC.routes) {
      const routeComponentIds = SPEC.components.filter((c) => c.routeKey === route.routeKey).map((c) => c.id);
      assert.ok(routeComponentIds.length > 0, `${route.routeKey}: a declared route carries no component`);
      const slug = routeSlug(route.routeKey);
      const packet = await PDFDocument.create();
      stampDeterministic(packet);
      packet.setTitle(`${SPEC.legalName} — ${slug} — ${fixtureName} fixture`);
      const pageManifest = [];

      for (const componentId of routeComponentIds) {
        const body = composedBody(componentId, facts);
        assert.ok(body.includes(facts["participant.full_legal_name"]),
          `${componentId}: the composed page must carry the participant's name`);
        const composedBytes = await renderComposedPdf(body, COMPONENT[componentId].title, componentId);
        const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
        for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
          packet.addPage(p);
          pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
        }
      }

      const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
      const dir = `${OUT}/fixtures/routes/${slug}`;
      fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
      const file = `${dir}/${fixtureName}.pdf`;
      fs.writeFileSync(path.join(ROOT, file), packetBytes);

      /* The same byte proof the family assembly gets, over this route's maps only:
       * every fact this route's components write must be readable back out of the
       * route artifact's own saved bytes. */
      const routeMaps = maps.filter((m) => routeComponentIds.includes(m.formNumber));
      const routeProof = await byteProof(packetBytes, pageManifest, routeMaps, facts, `${fixtureName}/${slug}`);

      routeArtifacts.push({
        routeKey: route.routeKey, route: slug, fixture: fixtureName, file,
        sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
        byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
        documents: routeComponentIds, components: routeComponentIds,
        role: "route_packet_of_composed_pleadings",
        deliveryRole: "participant_deliverable_for_this_route_only",
        valuesReadBackFromTheseBytes: routeProof.actualWrites.length,
        rasterPending: true,
        independentVerificationPending: true
      });
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
    /* The family assembly. On a family carrying more than one route this is build
     * and review evidence, not something a participant receives; routeArtifacts
     * below carries the deliverables. */
    familyAssemblyIsAParticipantDeliverable: SPEC.routes.length === 1,
    familyAssemblyRole: SPEC.routes.length === 1
      ? "single-route family: the assembly and the route artifact carry the same components"
      : "build and review evidence only — it concatenates every route's components and is not a participant deliverable",
    routeArtifacts,
    routeArtifactRoutes: SPEC.routes.map((r) => r.routeKey),
    routeArtifactRasterPending: true,
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
    routeArtifactHashes: routeArtifacts.map((a) => ({ fixture: a.fixture, route: a.route, routeKey: a.routeKey, packetSha256: a.sha256, pages: a.pageCount })),
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
