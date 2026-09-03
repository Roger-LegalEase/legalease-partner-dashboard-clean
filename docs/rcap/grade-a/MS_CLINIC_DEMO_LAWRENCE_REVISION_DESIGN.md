# Mississippi Clinic Demo Filing-Document Revision Design

**Date:** September 3, 2026
**Route:** `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
**Packet family:** `ms-nonconv-set`
**Status:** Approved for implementation; filing and delivery remain held

## Decision

LegalEase will retain plain-language participant instructions and rebuild the court-facing pages as conventional Mississippi pleadings. Lawrence Blackmon's submitted petition supplies the practical formatting model. The implementation will adapt its caption, numbered allegations, prayer, signature, certificate of service, and separately captioned order. It will not copy the sample's attorney language, factual assertions, names, pronouns, typographical errors, or legal conclusions.

The packet will use a confidential MCIC identifier addendum for the synthetic clinic-demo artifacts. A real participant packet cannot receive filing-ready status until the court of origin confirms that identifiers may travel through that channel. The court may instead require identifiers in the signed order, an MCIC submission sheet, or a nonpublic certified agency copy.

## Controlling Inputs

The following inputs control this bounded revision in descending order:

1. Roger's September 3, 2026 direction requiring the Lawrence format and mandatory LegalEase notarized verification, SHA-256 `88497978c1411950ea3977a7ae32087e29fc375017cadc87b20d700c60623866`.
2. The filing-readiness review that rejected the first artifact set, SHA-256 `c267b8454beca090a828bfc31037aab959bac91130aec149150d5307fe18b8ee`.
3. Mississippi Administrative Code Title 31, Part 2, Chapter 6 for MCIC order content, certification, forwarding, and processing.
4. Mississippi's Revised Notary Act and current Secretary of State notary rules for a verification on oath or affirmation.
5. `Expungement - Sample Person.pdf`, six pages, SHA-256 `56f5d9bdc8e108fce0d47f818040ed09f9e08e22f7442d93de6d49c1f0a1117e`, as a layout and pleading-structure reference only.

The older `ms-nonconv-set` legal-design statements that exclude fingerprint records conflict with the later filing-readiness review and MCIC rules. This route-specific revision supersedes those statements and records the conflict instead of silently inheriting them.

## Packet Structure

The five-component contract remains intact:

1. Participant cover and contents
2. Petition for Expunction of Record
3. Proposed Order Granting Expunction of Record, including the confidential MCIC identifier addendum
4. Certificate of Service and attachment assembly checklist
5. Filing instructions, next steps, and legal-help stops

Components 2 through 4 will use pleading typography and captions. Components 1 and 5 will retain the current participant-guidance presentation.

## Required Facts and Generation Gates

The revised specification will replace combined arrest-or-citation fields with separate arrest facts. It will collect:

- exact plaintiff name and defendant name from the original docket;
- current legal name, name used at arrest, and aliases;
- actual-arrest confirmation, arrest date, arrest location, arresting agency, and agency number;
- release confirmation and release date or supporting record source;
- exact charge, statute or ordinance, misdemeanor classification, and exact disposition wording;
- disposition date and statutory case-ending category;
- date of birth, full Social Security number, race, and sex for MCIC processing;
- court-confirmed MCIC identifier method and confirmation source;
- optional participant-confirmed personal-impact statement;
- prosecuting authority, service-address confirmation status, and confirmed address when available;
- Exhibit A certified-disposition status and Exhibit B docket-sheet status.

The composer will refuse participant-delivery composition when any of these conditions occurs:

- `actual_arrest` is not `Yes`;
- `release_confirmed` is not `Yes`;
- the record shows a citation without a confirmed arrest;
- the exact docket caption, case number, charge, legal citation, classification, or disposition wording is missing;
- the MCIC identifier method lacks court confirmation;
- the Social Security number does not match its separately supplied last four digits;
- Exhibit A or Exhibit B is not confirmed as available for packet assembly;
- existing route-changing answers remain unsafe.

Offline fixtures may use an explicit internal-review purpose. That purpose must print a conspicuous non-filing warning and cannot grant participant-delivery authority.

## Petition

The petition will use U.S. Letter pages, Times Roman typography, one-inch margins, a conventional centered court heading, a two-column party caption, and the docket's exact plaintiff and defendant names. Each continuation page will repeat the court name, case number, document title, and page number.

The filed pleading will omit product labels such as `COURT DOCUMENT`, `Court caption`, `Participant information`, `Verified record facts`, and `Relief requested`.

The body will contain:

1. A `COMES NOW` introduction identifying the petitioner as appearing pro se.
2. The subsection (4) statutory rule.
3. Allegations applying arrest, release, exact charge, exact legal citation, classification, disposition, and Exhibit A to the participant's record.
4. An optional participant-authored impact paragraph that appears only after an affirmative confirmation.
5. An identifying-information paragraph. The public petition will show the last four Social Security digits or refer to the confidential addendum according to the approved method.
6. A `WHEREFORE, PREMISES CONSIDERED` prayer requesting expunction and certified transmission to MCIC and record-specific custodians.
7. A pro-se signature block with mailing address, telephone number, and email address.
8. A mandatory verification on oath or affirmation with venue, participant signature, notary signature, printed name, commission expiration, commission identification number, and official-seal space.

The instructions will say `DO NOT SIGN THE PETITION IN ADVANCE` and explain personal appearance, identification, oath or affirmation, signature in the notary's presence, and the official stamp. The packet will not describe the petition as filing-ready before the participant and notary complete their respective fields.

## Proposed Order and Confidential Addendum

The proposed order will repeat the exact caption and make express findings for jurisdiction, arrest, release, exact charge and authority, case disposition, and eligibility. It will direct custodians to purge, expunge, or destroy covered records as Mississippi law requires, subject only to a nonpublic expunction-order record that a statute permits.

The order will direct the clerk to forward a certified, sealed copy to the Mississippi Department of Public Safety, Criminal Information Center, and each identified local custodian. It will include:

- `SO ORDERED AND ADJUDGED` date and municipal-court judge blocks;
- an optional `APPROVED AS TO FORM` prosecutor block that remains blank;
- a `CERTIFIED TRUE COPY` clerk block with date and court-seal space.

The confidential MCIC addendum will carry the name used at arrest, aliases, arrest date, exact arrest charge, date of birth, full Social Security number, race, sex, statutory authority, agency, agency number, case number, and disposition. Its header will state that it is for court and MCIC processing and must not be included in public or service copies. The order will incorporate the addendum by reference for the synthetic review layout.

## Service and Exhibits

The certificate of service will identify the participant as pro se and leave method, service date, and signature blank until service occurs. The canonical Jackson fixture will print `To be confirmed with the Jackson Municipal Court before filing or service` instead of calling 219 South President Street a confirmed prosecutor address.

The petition will refer to a certified disposition as Exhibit A and a docket sheet as Exhibit B. The assembly checklist will distinguish a generated divider or checklist from the participant-supplied court records. Synthetic review artifacts will state that they do not contain certified court records. A participant packet cannot receive filing-ready status until the two records are inserted behind the petition.

## Consistency and Privacy

The same fact identifiers will populate the petition, verification, certificate, order, addendum, and instructions. The verifier will reject Lawrence-sample names, attorney language, bar numbers, gendered pronouns, the current fingerprint exclusion, categorical no-notarization text, and a service address represented as confirmed without a confirmation record.

The participant and ordinary service copy must not expose the full Social Security number. Only the court-approved MCIC channel may contain it. This revision changes no production route, authentication, RLS, payment, or deployment behavior.

## Acceptance Evidence

Implementation is complete only after the repository records all of the following evidence:

- red-green tests for every new composition gate and pleading block;
- deterministic canonical and boundary PDFs with updated SHA-256 hashes;
- text extraction proving the required allegations and prohibited-text exclusions;
- page-by-page raster review showing no clipping, overlap, orphaned caption page, or broken continuation header;
- authority and wiring projections bound to the new specification and artifact hashes;
- the existing Clinic Mode browser, ownership, mobile-accessibility, and commercial-flow checks;
- an independent second-worker review against the revised legal and visual obligations.

The branch will remain unmerged, undeployed, and in held status. Named Mississippi counsel and the court-specific MCIC workflow must approve the revised artifacts before filing or release.
