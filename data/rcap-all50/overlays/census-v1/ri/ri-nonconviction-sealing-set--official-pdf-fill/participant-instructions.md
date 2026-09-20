# Participant and reviewer instructions

These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.

- Route scope: `obligation:unit:RI:ri_nonconviction_sealing:ri-nonconviction-motion-to-seal`
- Route scope: `obligation:unit:RI:ri_nonconviction_sealing:ri-nonconviction-verify-automatic-sealing`

## Required participant/local completion

- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.
- Complete service certificates only after service actually occurs.
- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.
- Confirm current revision, filing destination, local procedures, attachments, service, and proposed-order requirements before filing. Cost is answered in its own section below.

## Before anything is filed: has this record already sealed?

**This step runs first, and it may end the matter.** This route's own committed record calls it "Verify whether the record has already sealed" and makes it the default branch; the motion in this packet is the fallback, prepared only where this step shows that no automatic or administrative route reaches the record. The step below is carried word for word from `data/record-clearing/legal-design-track-registry.json`, track `ri_nonconviction_sealing`, `units`, and the RI intake memo that record was built from describes the same step in the same words; this build reads both and prints it only while they agree.

> The default branch, and the one that must run first. Establish which sealing route applies: a Rule 48(a) dismissal on or after 1 January 2023 seals automatically; one before that date seals administratively on the defendant's request; and the Judiciary reportedly began a broader automatic programme in 2024 covering acquittals, dismissals and no-file decisions. Pull a BCI record to see whether the record has in fact cleared, and check that identification records were destroyed. Where relief has already happened there is nothing to file and no motion should be generated or sold.

The track registry — and, for these two lines, the track registry alone; the RI intake memo carries no packet instructions for this track — also states:

> Check automatic relief before generating any motion. Never say that all dismissed cases need a motion — many seal automatically.

> Identification records — fingerprints, photographs, physical measurements and other arrest identification records — must generally be destroyed within 60 days after an acquittal, dismissal, no true bill, no information or other exoneration.

**If the record has already sealed, do not file the enclosed motion.** There is nothing to file, nothing to serve, and no fee to pay. If it should have sealed and has not, that is an escalation and not a motion — it is named in the self-help section below.

## What it costs to file

**No held source establishes what it costs to file this motion.** Form DC-33 — the District Court Motion, Affidavit and Instructions to Expunge or Seal Record — carries the court's own numbered filing instructions on its first page and says nothing about a filing fee, nothing about filing being free, and nothing about a waiver. The Rhode Island record-clearing legal review held in this repository records the same gap in as many words: "Filing fee: unresolved. Not stated in the reference," and lists the filing fee for a Chapter 12-1.3 motion among its open questions and release blockers. This packet does not supply a figure it does not hold.

**Ask the clerk's office of the District Court division where your case was heard** — the division you check at the top of the motion, whose address the form itself prints: Murray Judicial Complex, 2nd Division, 45 Washington Square, Newport, Rhode Island 02840-2913; Noel Judicial Complex, 3rd Division, 222 Quaker Lane, Warwick, Rhode Island 02886-0107; McGrath Judicial Complex, 4th Division, 4800 Tower Hill Road, Wakefield, Rhode Island 02879-2239; Garrahy Judicial Complex, 6th Division, One Dorrance Plaza, Providence, Rhode Island 02903-2719. That clerk's office is where the motion is filed, and instruction 2 on the form says it is the office that fills in your hearing date. Put two questions to it before you file: what, if anything, the court charges to file a motion to expunge or seal, and whether any fee waiver or reduction is available to you.

**A cost the form does state, about a different thing.** DC-33's instruction 8 says that if your motion is granted, "all financial obligations owed (fines, fees, costs, restitution, and assessments) must be paid in full to complete the expungement process," after which the clerk's office prepares three certified copies of the order for you to deliver. That is money already owed on your case, and the form states it about the expungement process; whether it bears on a sealing under G.L. 1956 § 12-1-12 is another question for the same clerk. It is not a charge for filing this motion.

## Who must be served, and by when

This applies only if you file the motion. If the verification step above shows the record has already sealed, there is nothing to file and nothing to serve.

Both lines below are carried word for word from this route's own committed record — `data/record-clearing/legal-design-track-registry.json`, track `ri_nonconviction_sealing`, `rules.service` and `rules.notice` — and the intake memo that record was built from, `data/record-clearing/legal-design-intake/RI.memo.json`, track `ri_nonconviction_sealing`, carries them in the same words; this build reads both and prints them only while they agree.

> Serve the Attorney General and the charging police department at least ten days before the hearing, where a motion is filed.

> Where a motion to seal is filed, notice must be given to the Attorney General and the police department at least ten days before the hearing.

The form says the same thing in its own words: DC-33 carries a certification block reciting G.L. 1956 § 12-1-12.1(b)(1), which is the provision the notice requirement comes from. Complete that block only after service has actually happened.

**The method is not stated by either record.** Neither the track registry nor the intake memo says whether service is by hand, by mail, or by another route, and this packet does not supply a method it does not hold. Ask the clerk's office of the division where you are filing — the same office named in the cost section above — how that court requires the Attorney General and the police department to be served, and what proof of service it wants on file before the hearing.

## Values this platform holds but did not print

The blanks below are not blanks the platform has no fact for. It holds each of these values and could not put it on the paper, so it left the box **empty** rather than print something a court could not read, or leave a row half filled. **Write each one in by hand before you file.** Which of them bites on a real packet depends on how long that participant's own name, charge or docket number is; the fixtures a row was measured on are named in the last column.

| Source field | The fact | Why it is not printed | Measured on |
| --- | --- | --- | --- |
| `2 Charges 1` | `matter.charge` | another cell of the same row (1 Counts 1, 3 Dispositions 1) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `Case Number` | `matter.case_number` | the value does not fit this box at a size a court could read | boundary |
| `Case Number_2` | `matter.case_number` | the value does not fit this box at a size a court could read | boundary |

## Exact facts still required before filing

The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.

- v (source field: `Bureau of Criminal Identification Number`)
- Murray Judicial Complex (source field: `Murray Judicial Complex`)
- Noel Judicial Complex (source field: `Noel Judicial Complex`)
- Newport, Rhode Island 02840-2913 Warwick, Rhode Island 02886 (source field: `McGrath Judicial Complex`)
- Newport, Rhode Island 02840-2913 Warwick, Rhode Island 02886 (source field: `Garrahy Judicial Complex`)
- 1. Count(s) — charge table row 1, delivered page 2 (source field: `1 Counts 1`)
- _____________ ___________________________________ __________ (source field: `1 Counts 2`)
- _____________ ___________________________________ __________ (source field: `1 Counts 3`)
- _____________ ___________________________________ __________ (source field: `1 Counts 4`)
- _____________ (source field: `2 Charges 2`)
- _____________ (source field: `2 Charges 3`)
- _____________ (source field: `2 Charges 4`)
- 3. Disposition(s) — charge table row 1, delivered page 2 (source field: `3 Dispositions 1`)
- _____________ ___________________________________ (source field: `3 Dispositions 2`)
- _____________ ___________________________________ (source field: `3 Dispositions 3`)
- _____________ ___________________________________ (source field: `3 Dispositions 4`)
- All records and records of conviction relating to the conviction of the abovereferenced (source field: `All records and records of conviction relating to the conviction of the abovereferenced`)
- the motion is filed by an (source field: `the motion is filed by an attorney and the offense is not under GL 1956  311118 This motion`)
- is called for a hearing on ________________ at 9:00 a.m. in  (source field: `at 900 am in courtroom`)
- I hereby certify that pursuant to G.L. 1956 § 12-1-12.1(b)(1 (source field: `I hereby certify that pursuant to GL 1956  121121b1 or  12133a on`)
- /s/ (source field: `s`)
- /s/ _________________________________________________ (source field: `Rhode Island Bar Number`)
- v (source field: `Bureau of Criminal Identification Number_2`)
- That I was charged with the crimes listed in Box 2 of the motion (source field: `That I was charged with the crimes listed in Box 2 of the motion`)
- No True Bill, (source field: `That no information was filed`)
- That I was charged with the crime listed in Box 2 of the motion (source field: `That I was charged with the crime listed in Box 2 of the motion`)
- That I received the disposition listed in Box 3 of the motion (source field: `That I received the disposition listed in Box 3 of the motion`)
- That I have satisfied in full any and all outstanding courtimposed andor (source field: `That I have satisfied in full any and all outstanding courtimposed andor`)
- Part (source field: `That I was charged with the crime listed in Box 2 of the motion_2`)
- Three A (source field: `That I received the disposition listed in Box 3 of the motion_2`)
- Single (source field: `That the disposition listed in Box 3 of this motion is not a conviction for a`)
- That the charge was reclassified from a felony to a misdemeanor if applicable (source field: `That the charge was reclassified from a felony to a misdemeanor if applicable`)
- That I was convicted of a single misdemeanor offense and I have not been (source field: `That I was convicted of a single misdemeanor offense and I have not been`)
- That in the five 5 years preceding the filing of this motion I have not been (source field: `That in the five 5 years preceding the filing of this motion I have not been`)
- That there are no criminal proceedings pending against me and I have exhibited (source field: `That there are no criminal proceedings pending against me and I have exhibited`)
- That I have satisfied in full any and all outstanding courtimposed andor court (source field: `That I have satisfied in full any and all outstanding courtimposed andor court`)
- Part (source field: `That I was charged with the crimes listed in Box 2 of the motion_2`)
- Three B (source field: `That I received the dispositions listed in Box 3 of the motion`)
- Multiple (source field: `That none of the dispositions listed in Box 3 of this motion are convictions for`)
- That the charge was reclassified from a felony to a misdemeanor if applicable_2 (source field: `That the charge was reclassified from a felony to a misdemeanor if applicable_2`)
-  That the charge was reclassified from a felony to a misdem (source field: `That none of the dispositions listed in Box 3 of this motion are convictions under`)
- That I have not been convicted of more than six 6 misdemeanors preceding the (source field: `That I have not been convicted of more than six 6 misdemeanors preceding the`)
- That in the ten 10 years preceding the filing of this motion I have not been (source field: `That in the ten 10 years preceding the filing of this motion I have not been`)
- That there are no criminal proceedings pending against me and I have exhibited_2 (source field: `That there are no criminal proceedings pending against me and I have exhibited_2`)
- That I have satisfied in full any and all outstanding courtimposed andor court_2 (source field: `That I have satisfied in full any and all outstanding courtimposed andor court_2`)
- State of (source field: `State of`)
- County of (source field: `County of`)
- public, pers (source field: `On this`)
-  personal (source field: `which was`)
- My commission expires (source field: `My commission expires`)
- public, personally appeared ________________________________ (source field: `Group2`)

## Where self-help ends

**This packet is not legal advice, and no lawyer has reviewed your case in preparing it.** Stop and get help from a lawyer or a legal-services office before you sign, file or serve anything if any of the 6 conditions below reaches your case. Each one is carried word for word from this route's own committed record — `data/record-clearing/legal-design-track-registry.json`, track `ri_nonconviction_sealing`, `selfHelpStopConditions` — and the same 6 conditions are carried in the same words by the intake memo the record was built from, `data/record-clearing/legal-design-intake/RI.memo.json`, track `ri_nonconviction_sealing`, `selfHelpStopConditions`; this build reads both and prints them only while they agree.

- Determining which sealing route applies, where the disposition is not clearly a Rule 48(a) dismissal.
- Pre-2023 Rule 48(a) dismissals, which need a request to the clerk rather than a motion.
- Any record that should have sealed automatically and has not; the remedy is unresolved and this is an escalation.
- Any conviction in the same case, which this route does not reach.
- Immigration exposure.
- Federal, out-of-state, military and tribal records.

**If you are not a United States citizen, the immigration condition above is a hard stop, not a caveat.** Ask a Rhode Island immigration attorney before you sign or file.
- Only the measured existing SEAL control is marked. Courthouse, eligibility, notice/service, hearing, signature/date, and notary blocks remain blank.
- The notary "personally appeared" control on page 4 is left in its source-owned blank state; its unselected /Off appearance is proven against a zero-write source-normalized flattened baseline and is never a mark this build makes.
- The filing fee is no longer among this family's release blockers: the fee-and-waiver section states that no held source establishes it and names the division clerk's office that answers it.
