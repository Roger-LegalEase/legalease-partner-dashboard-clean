# Participant and reviewer instructions

These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.

- Route scope: `obligation:track-pathway:PA:pa_6308_underage:path-g-underage-drinking-conviction-expungement`

## Required participant/local completion

- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.
- Complete service certificates only after service actually occurs.
- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.
- Confirm current revision, filing destination, local procedures, fees, attachments, service, and proposed-order requirements before filing.

## Values this platform holds but did not print

The blanks below are not blanks the platform has no fact for. It holds each of these values and could not put it on the paper, so it left the box **empty** rather than print something a court could not read, or leave a row half filled. **Write each one in by hand before you file.** Which of them bites on a real packet depends on how long that participant's own name, charge or docket number is; the fixtures a row was measured on are named in the last column.

| Source field | The fact | Why it is not printed | Measured on |
| --- | --- | --- | --- |
| `Addr1` | `participant.street_address` | the value does not fit this box at a size a court could read | boundary |
| `AddrCity` | `participant.city` | the value does not fit this box at a size a court could read | boundary |
| `AddrZip` | `participant.zip` | the value does not fit this box at a size a court could read | boundary |
| `County` | `matter.county` | the value does not fit this box at a size a court could read | boundary |
| `CountyOf` | `matter.county` | the value does not fit this box at a size a court could read | boundary |
| `Defendant` | `participant.full_legal_name` | the value does not fit this box at a size a court could read | boundary |
| `Defendant` | `participant.full_legal_name` | the value does not fit this box at a size a court could read | boundary |
| `Full Name` | `participant.full_legal_name` | the value does not fit this box at a size a court could read | boundary |

## Exact facts still required before filing

The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.

- (Title) (source field: `PA Statute TitleRow1`)
- (Title) (source field: `SectionRow1`)
- (Title) (source field: `SubsectionRow1`)
- Section Subsection Statute Description Counts Grade Disposit (source field: `Statute DescriptionRow1`)
- Section Subsection Statute Description Counts Grade Disposit (source field: `CountsRow1`)
- Section Subsection Statute Description Counts Grade Disposit (source field: `GradeRow1`)
- Section Subsection Statute Description Counts Grade Disposit (source field: `DispositionRow1`)
- PA Statute TitleRow2 (source field: `PA Statute TitleRow2`)
- SectionRow2 (source field: `SectionRow2`)
- SubsectionRow2 (source field: `SubsectionRow2`)
- Statute DescriptionRow2 (source field: `Statute DescriptionRow2`)
- CountsRow2 (source field: `CountsRow2`)
- GradeRow2 (source field: `GradeRow2`)
- DispositionRow2 (source field: `DispositionRow2`)
- PA Statute TitleRow3 (source field: `PA Statute TitleRow3`)
- SectionRow3 (source field: `SectionRow3`)
- SubsectionRow3 (source field: `SubsectionRow3`)
- Statute DescriptionRow3 (source field: `Statute DescriptionRow3`)
- CountsRow3 (source field: `CountsRow3`)
- GradeRow3 (source field: `GradeRow3`)
- DispositionRow3 (source field: `DispositionRow3`)
- PA Statute TitleRow4 (source field: `PA Statute TitleRow4`)
- SectionRow4 (source field: `SectionRow4`)
- SubsectionRow4 (source field: `SubsectionRow4`)
- Statute DescriptionRow4 (source field: `Statute DescriptionRow4`)
- CountsRow4 (source field: `CountsRow4`)
- GradeRow4 (source field: `GradeRow4`)
- DispositionRow4 (source field: `DispositionRow4`)
- PA Statute TitleRow5 (source field: `PA Statute TitleRow5`)
- SectionRow5 (source field: `SectionRow5`)
- If the sentence impose (source field: `SubsectionRow5`)
- If the sentence imposed inclu (source field: `Statute DescriptionRow5`)
- If the sentence imposed included a fine, costs or restitutio (source field: `CountsRow5`)
- If the sentence imposed included a fine, costs or restitutio (source field: `GradeRow5`)
- If the sentence imposed included a fine, costs or restitutio (source field: `DispositionRow5`)
- Docket No (source field: `DocketSeg1`)
- Docket No: CP- (source field: `DocketSeg2`)
- Docket No: CP-  - (source field: `DocketSeg3`)
- -20 (source field: `DocketSeg4`)
- Social Security (source field: `Social Security Number`)
- DOB (source field: `Aliases1`)
- Aliases3 (source field: `Aliases3`)
- Aliases5 (source field: `Aliases5`)
- Aliases4 (source field: `Aliases4`)
- Address: Alias(es) (source field: `Aliases2`)
- List name and mailing address of the affiant as shown on the (source field: `AffiantAddr1`)
- Philadelphia Municipal Court (source field: `MDJ Number`)
- County of ______________________ (source field: `District#`)
- _______________________________________ presented by (source field: `PresentedBy`)
- it is ORDERED that the Petition/Motion is (source field: `Disposition`)
- 2.Alias(es) (source field: `Alias1`)
- Alias2 (source field: `Alias2`)
- 2.Alias(es): ________________________________________ (source field: `Alias3`)
- 5.PetitionerÕs Social Security Number (source field: `PetitionersSSN`)
- agency that made the arrest (source field: `DateAndArrestingAgency`)
- AOPC Rev (source field: `AgenciesServed`)
- MDJ# (source field: `MDJ#`)
- Philadelphia Municipal Court or Court of Common Pleas Offens (source field: `Offense Tracking Number OTN`)
- 7.Name and mailing address of the affiant as shown on the co (source field: `AddressOfAffiant`)
- 9.Offense Tracking Number (OTN) (source field: `OTN`)
- applicable dispositions (attach additional sheets if needed) (source field: `Text15`)
- Rule 490 is selected only when the court record establishes a magisterial-district-judge case; Rule 790 is selected only when it establishes a court-of-common-pleas case.
- If the court level is absent or outside those two recorded values, generation stops before any participant artifact is selected.
- The required custom certificate-of-service component remains a separately disclosed build remainder; this mapping does not invent one.
