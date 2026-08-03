# Louisiana — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** LA
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/LA/01_LEGAL_REVIEW/LA__LEGAL-REVIEW__STATEWIDE__louisiana-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `d4b5913`
**Runtime effect:** none. Every Louisiana track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/LA/01_LEGAL_REVIEW/LA__LEGAL-REVIEW__STATEWIDE__louisiana-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Louisiana and is not counted as one.

## Amended statements

### 1. The missing-form finding is inverted, and Edition 1.2 closes the real gap

- **Retained review statement amended:** the headline build blocker is that six statutory forms are missing from the archive.
- **Accepted normalized treatment:** all six the review names — Arts. 990, 993, 995, 998 and 999.1, and the Art. 984 instruction asset — were already retained by Edition 1.1. What was actually unmanifested is the opposite set: **Arts. 987, 988, 989, 991, 992 and 994**, the Art. 986 mandatory forms on which every Louisiana motion track depends.
- **Controlling source:** Louisiana State Legislature current-text publication of La. C.Cr.P. arts. 987, 988, 989, 991, 992 and 994, retrieved article by article on 2026-08-03.
- **Normalization commit:** `d4b5913`
- **Authority effect:** Edition 1.2 retains all six as individually identified **packet-form candidates**, each with its own document ID, role, last-amending Act and SHA-256. Louisiana's 22 unmanifested official-form components are now mapped. The seven pre-existing generic `Louisiana Laws` browser-print captures are unchanged and remain non-workflow captures: a generic multi-article capture can carry no document ID, role or revision and can never be manifested.
- **Runtime effect:** none. `generation_allowed` is `no` on all six.

### 2. Art. 988 carries two correct names

- **Retained review statement amended:** the review titles Art. 988 "Certification of Fee Waiver".
- **Accepted normalized treatment:** the article's official heading is **"Motion for fee exemption form to be used"**; the form it prescribes is captioned **"CERTIFICATION OF FEE WAIVER"** and directs that it be completed by the defendant, submitted to the District Attorney's Office before filing, and appended to the Motion for Expungement. Both names are correct and neither supersedes the other.
- **Controlling source:** La. C.Cr.P. art. 988 current text (Acts 2014, No. 145, §1; Acts 2015, No. 200, §1), retrieved 2026-08-03.
- **Normalization commit:** `d4b5913`
- **Authority effect:** the manifest records the article heading as the official title and the form caption in the notes, so neither name is lost.
- **Runtime effect:** none.

### 3. Art. 990 cites Art. 980, and Art. 980(C) allows one extension

- **Retained review statement amended:** the review reports Art. 990 as citing itself, and does not carry the extension.
- **Accepted normalized treatment:** Art. 990 cites **Art. 980**, the contradictory-hearing article. Art. 980(C) allows the court one extension of up to thirty days beyond the sixty-day objection window.
- **Controlling source:** La. C.Cr.P. arts. 980 and 990, current text.
- **Normalization commit:** `d4b5913`
- **Authority effect:** the objection and hearing timeline stated to participants changes; packet identity does not.
- **Runtime effect:** none.

### 4. Art. 977(D) survives; only the fee provision sunset

- **Retained review statement amended:** the 90-day marijuana route is presented as expiring, with a "file by July 31" warning.
- **Accepted normalized treatment:** the sunset in Art. 983(M)(5) nullified **Paragraph M**, the fee provision, which terminated 1 August 2026. Art. 977(D) contains no sunset, is present in the current Code with source notes through Acts 2023, No. 342, and Art. 986 still lists Art. 998 among the mandatory forms. The route keeps `official_pdf_fill` on Art. 998; the current fee is the ordinary Art. 983(A) $550 cap, and the $300 rule is historical.
- **Controlling source:** La. C.Cr.P. arts. 977(D), 983(A) and 983(M), current text.
- **Normalization commit:** `d4b5913`
- **Authority effect:** **the "file by July 31" warning is dead and must not be repeated in any participant-facing copy.**
- **Runtime effect:** none.

### 5. Tracks G, H and I are resolved, and Title XXXIV currentness runs to 2024

- **Retained review statement amended:** Tracks G, H and I are returned as "additional research required", and the source notes run through 2023.
- **Accepted normalized treatment:** Title XXXIV was amended three times in the 2024 Regular Session — Acts 270 (arts. 972 and 983(G); adding 999 and 999.1), Acts 560 (adding 985.3) and Acts 580 (art. 978). No 2025 or 2026 session amendment was located. **Track G** (`la-999-expedited-expungement`) is `process_guidance` because art. 972(1) defines expedited expungement as an order a judge may sign *without the individual filing a motion to expunge with the clerk of court*, and art. 986's mandatory-form list does not include art. 999.1 — there is no participant filing to generate. **Track H** (`la-985-2-automated-expungement`) is not established as effective or operational: the Legislature's own publication still carries the note that art. 985.2 is effective upon appropriation, and Louisiana State Police BCII publishes nothing about it. **Track I** (`la-985-3-immediate-expungement`) is `process_guidance`: art. 985.3 prescribes no motion, art. 986 assigns it none, and art. 985.3(B) provides that only the art. 992 form shall be used.
- **Controlling source:** La. C.Cr.P. arts. 972, 978, 983(G), 985.2, 985.3, 999 and 999.1; Acts 2023, No. 454, § 4; Acts 2024, Nos. 270, 560 and 580.
- **Normalization commit:** `d4b5913`
- **Authority effect:** all three of the review's build blockers are closed. **Art. 999(A)'s drafting defect is real and survives in current law** — it says "all of the following" and then lists a declination to prosecute *and* an instituted prosecution finally disposed of, which are mutually exclusive on their face. It is applied as written, the narrower and fail-closed reading, and the contradiction is preserved as a release blocker rather than cured by construction.
- **Runtime effect:** none.

### 6. No Louisiana track is composed, and none is a custom pleading

- **Retained review statement amended:** the review contemplates staged and drafted routes.
- **Accepted normalized treatment:** Art. 986 makes the form set statutory, so a custom pleading would be contrary to the Code. Within a slot the statutory pathways are branches, not mechanisms — Track B's art. 894(B) and five-year routes, and Track D's art. 893(E), ten-year, first-offender-pardon and art. 978(E) lanes each run one form, one court, one filing, one legal effect. Art. 988 is a conditional supporting unit, not a separate relief mechanism, so no track is composed.
- **Controlling source:** La. C.Cr.P. arts. 893(E), 894(B), 978(E) and 986.
- **Normalization commit:** `d4b5913`
- **Authority effect:** the felony and misdemeanour clean periods stay distinct — five years and felony convictions only for misdemeanours, ten years and any criminal offence for felonies.
- **Runtime effect:** none.
