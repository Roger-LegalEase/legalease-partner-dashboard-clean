# Participant and reviewer instructions

These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.

- Route scope: `obligation:track-pathway:NJ:nj_clean_slate:clean-slate-petition-under-n-j-s-a-2c-52-5-3`

## Required participant/local completion

- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.
- Complete service certificates only after service actually occurs.
- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.
- Confirm current revision, filing destination, local procedures, fees, attachments, service, and proposed-order requirements before filing.

## Values this platform holds but did not print

The blanks below are not blanks the platform has no fact for. It holds each of these values and could not put it on the paper, so it left the box **empty** rather than print something a court could not read, or leave a row half filled. **Write each one in by hand before you file.** Which of them bites on a real packet depends on how long that participant's own name, charge or docket number is; the fixtures a row was measured on are named in the last column.

| Source field | The fact | Why it is not printed | Measured on |
| --- | --- | --- | --- |
| `arrest1CaseNum` | `matter.case_number` | another cell of the same row (arrest1Statute) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `arrest1Dt` | `matter.arrest_date` | another cell of the same row (arrest1Statute) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `arrestOff1` | `matter.charge` | another cell of the same row (arrestStatute, arrestMuni) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `ExpungeCntyName` | `matter.county` | this blank is a chooser the form fills from its own list of options, not a free-text line, and the held value is not one of those options | canonical, boundary |
| `guilty` | the election this row states on the printed form | this box is the election for that row, and another cell of the same row (guiltyStatute, guiltyFinal1, guiltyTimeType, guiltyDocCmpltDt, guiltyProbDt, guiltyFineDt) could not be printed, so the election is withdrawn with the row: a row is completed or left untouched, and a marked election over an empty row is a half-written row | canonical, boundary |
| `guiltyCrt` | `matter.court` | another cell of the same row (guiltyStatute, guiltyFinal1, guiltyTimeType, guiltyDocCmpltDt, guiltyProbDt, guiltyFineDt) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `guiltyDt` | `matter.conviction_date` | another cell of the same row (guiltyStatute, guiltyFinal1, guiltyTimeType, guiltyDocCmpltDt, guiltyProbDt, guiltyFineDt) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `guiltyOff1` | `matter.charge` | another cell of the same row (guiltyStatute, guiltyFinal1, guiltyTimeType, guiltyDocCmpltDt, guiltyProbDt, guiltyFineDt) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `origCaseNums` | `matter.case_number` | another cell of the same row (arrestStatute, arrestMuni) could not be printed, and a row is completed or left untouched | canonical, boundary |

## Exact facts still required before filing

The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.

- “and was charged with (name of offense(s))”, the second line — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestOff2`)
- “in violation of N.J.S.A. (statute(s))” — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestStatute`)
- “arising out of (municipalities)” — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestMuni`)
- the election box beside “d.” — Petition for Expungement (Form A), item (d), delivered page 19 (source field: `guilty`)
- name of offense(s), continuation line if needed — Form A, item (d), delivered page 19 (source field: `guiltyOff2`)
- in violation of N.J.S.A. (statute(s)) — Form A, item (d), delivered page 19 (source field: `guiltyStatute`)
- final sentence, first line — Form A, item (d), delivered page 19 (source field: `guiltyFinal1`)
- final sentence, continuation line if needed — Form A, item (d), delivered page 19 (source field: `guiltyFinal2`)
- jail/prison/incarceration time — Form A, item (d), delivered page 19 (source field: `guiltyTimeType`)
- date jail/prison/incarceration was completed — Form A, item (d), delivered page 19 (source field: `guiltyDocCmpltDt`)
- date probation was completed — Form A, item (d), delivered page 19 (source field: `guiltyProbDt`)
- date fines were paid — Form A, item (d), delivered page 19 (source field: `guiltyFineDt`)
- I currently owe restitution, a fine(s) or other court-ordered financial assessment(s) — Petition for Expungement (Form A), paragraph e, delivered pages 19 and 21 (source field: `contOwe`)
- “Original indictment/accusation/summons/warrant/complaint/FO or FJ docket number” — Petition for Expungement (Form A), paragraph e, pages 19 and 21 (source field: `oweDocket`)
- “in the amount of $” — Petition for Expungement (Form A), paragraph e, pages 19 and 21 (source field: `oweAmt`)
- the paragraph number for this additional arrest — Petition for Expungement, Form A – Addendum Page, page 20, which says to number each paragraph starting with 2 (source field: `cnt`)
- “I was arrested/taken into custody on (date)” — Form A – Addendum Page, page 20 (source field: `contArrestDt`)
- “and was charged with (name of offense(s))” — Form A – Addendum Page, page 20 (source field: `contOffense1`)
- “and was charged with (name of offense(s))”, the second line — Form A – Addendum Page, page 20 (source field: `contOffense2`)
- “in violation of N.J.S.A. (statute(s))” — Form A – Addendum Page, page 20 (source field: `contStatute`)
- “arising out of (municipalities)” — Form A – Addendum Page, page 20 (source field: `contArrestMuni`)
- “as set forth in the (original indictment/accusation/summons/warrant/complaint/docket number (include FJ and FO docket number(s) in Family Part matters))” — Form A – Addendum Page, page 20 (source field: `contOrigNums`)
- “the charge(s) of (name of offense(s))”, the second line of item a — Form A – Addendum Page, page 20 (source field: `contDsmissOff2`)
- I am seeking an expungement pursuant to N.J.S.A. 2C:52-2(a)(2) (after four years), or pursuant to N.J.S.A. 2C:52-3(b)(2) (after three years), but less than five years have passed since my most recent conviction, payment of court-ordered financial assessment, satisfactory completion of probation or parole, or release from incarceration, whichever is later, and I have not otherwise been convicted of a crime, disorderly persons offense, or petty disorderly persons offense since the most recent conviction — Petition for Expungement (Form A), page 22 (source field: `seek5yrs`)
- I am seeking an expungement pursuant to N.J.S.A. 2C:52-2(c)(3) of a third or fourth degree controlled dangerous substance crime — Petition for Expungement (Form A), page 22 (source field: `seek34degree`)
- “The compelling circumstances for the Court to grant me an expungement are as follows”, both boxes on Form A page 22, and the name-change explanation on the Verification, page 24. One form field serves all three, so one answer appears in all three places (source field: `seek5yrsDetails`)
- I am seeking expungement of a conviction on a criminal case or an adjudication of delinquency on a juvenile case pursuant to N.J.S.A. 2C:52-2, and I have never been granted an expungement, sealing or similar relief regarding a criminal conviction, by any state or federal court — Verification (Form A), page 24 (source field: `seekJuvNever`)
- I have legally changed my name. I have explained the details of my name change(s) below, included my previous legal name(s), and the date of the court order for the name change(s) — Verification (Form A), page 24 (source field: `changeName`)
- “The administrator(s) of the ___ Municipal Court(s)” — Order for Hearing (Form B) page 27, Expungement Order (Form C) page 30, Proof of Notice (Form F) page 40, and the Form E and Form G cover letters, pages 37 and 42 (source field: `MuniCrts`)
- “The ___ County(ies) Probation Division” — Order for Hearing (Form B) page 27, Expungement Order (Form C - Continued) page 31, and Proof of Notice (Form F) page 40 (source field: `probDivCntys`)
- “(statute)”, arrest row (1) — Expungement Order (Form C - Continued), page 31 (source field: `arrest1Statute`)
- “(date)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2Dt`)
- “(statute)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2Statute`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2CaseNum`)
- “(date)”, arrest row (3) — Expungement Order (Form C - Continued), page 31 (source field: `arrest3Dt`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (3) — Expungement Order (Form C - Continued), page 31 (source field: `arrest3CaseNum`)
- “(date)”, arrest row (4) — Expungement Order (Form C - Continued), page 31 (source field: `arrest4Dt`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (4) — Expungement Order (Form C - Continued), page 31 (source field: `arrest4CaseNum`)
- “(date)”, arrest row (5) — Expungement Order (Form C - Continued), page 31 (source field: `arrest5Dt`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (5) — Expungement Order (Form C - Continued), page 31 (source field: `arrest5CaseNum`)
- “(6) If applicable, including the following Family Part docket numbers in which I am a co-delinquent (FJ docket numbers)” — Expungement Order (Form C - Continued), page 31 (source field: `fjDocketNums`)
- “(date)” — Cover Letter to Court – For Filing (Form D), page 35 (source field: `CoverLtrDDt`)
- “(county)”, the court address block — Cover Letter to Court – For Filing (Form D), page 35 (source field: `SccCntyName`)
- “(address)”, the court address block — Cover Letter to Court – For Filing (Form D), page 35 (source field: `SccAddrStr`)
- “(city, state, zip code)”, the court address block — Cover Letter to Court – For Filing (Form D), page 35 (source field: `SccAddr2`)
- “Enc:”, what you are enclosing — Cover Letter to Court – For Filing (Form D), page 35 (source field: `enc`)
- “(date)” — Cover Letter – Notice of Hearing (Form E), page 37; written when Form E is mailed, which is after the signed Order for Hearing comes back (source field: `CoverLtrEDt`)
- “(date)” — Cover Letter – Notice Expungement Granted (Form G), page 42; written when Form G is mailed, which is after the Expungement Order is signed (source field: `CoverLtrGDt`)
- “(city, state, zip code)” under “Prosecutor,” — the Form E and Form G cover letters, pages 37 and 42 (source field: `ProsAddr2`)
- “___ County Probation”, Original County — the Form E and Form G cover letters, pages 37 and 42 (source field: `ProbCntyName`)
- “(address)” under “County Probation, Original County” — the Form E and Form G cover letters, pages 37 and 42 (source field: `ProbAddrStr`)
- “(city, state, zip code)” under “County Probation, Original County” — the Form E and Form G cover letters, pages 37 and 42 (source field: `ProbAddr2`)
- “(address)” under “Municipal Court Administrator” — the Form E and Form G cover letters, pages 37 and 42 (source field: `MuniCrtsAddrStr`)
- “(city, state, zip code)” under “Municipal Court Administrator” — the Form E and Form G cover letters, pages 37 and 42 (source field: `MuniCrtsAddr2`)
- “___ County Probation”, Transfer County, used in transfer cases only — the Form E and Form G cover letters, pages 37 and 42 (source field: `Prob2CntyName`)
- “(address)” under “County Probation, Transfer County”, used in transfer cases only — the Form E and Form G cover letters, pages 37 and 42 (source field: `Prob2AddrStr`)
- “(city, state, zip code)” under “County Probation, Transfer County”, used in transfer cases only — the Form E and Form G cover letters, pages 37 and 42 (source field: `Prob2Addr2`)
- “___ County Identification Bureau,” — Cover Letter – Notice Expungement Granted (Form G), page 42 (source field: `IdbCnty`)
- “(address)” under “County Identification Bureau” — Cover Letter – Notice Expungement Granted (Form G), page 42 (source field: `IdbAddrStr`)
- “___ County Family Division” — Cover Letter – Notice Expungement Granted (Form G), page 42 (source field: `FamDivName`)
- “(address)” under “County Family Division” — Cover Letter – Notice Expungement Granted (Form G), page 42 (source field: `FamDivAddrStr`)
- “(city, state, zip code)” under “County Identification Bureau” and under “County Family Division” — Cover Letter – Notice Expungement Granted (Form G), page 42; one form field serves both blocks, so one value appears in both (source field: `FamDivAddr2`)
- “The administrator(s) of the ___ Municipal Court(s)” — Expungement Order (Form C - Continued), page 31 (source field: `AdminMuniCts`)
- The item (d) conviction election on page 19 is withdrawn with the row it states: six of that paragraph's nine cells have no held fact, so the whole row is left untouched and its box is left unmarked rather than swearing to a conviction the paragraph does not identify. The withdrawal is named in the held-but-not-printed table above. The clean-slate checkbox on the proposed court order and all eligibility statements remain blank.
- The shared 43-page kit's signature, date, notary, service, court, prosecutor, clerk, agency, and post-order fields are expressly refused.
