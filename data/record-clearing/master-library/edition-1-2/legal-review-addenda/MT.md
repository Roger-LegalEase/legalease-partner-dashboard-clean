# Montana — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** MT
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/MT/01_LEGAL_REVIEW/MT__LEGAL-REVIEW__STATEWIDE__montana-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `8fec9fc`
**Runtime effect:** none. Every Montana track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/MT/01_LEGAL_REVIEW/MT__LEGAL-REVIEW__STATEWIDE__montana-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Montana and is not counted as one.

## Amended statements

### 1. The composed structure is statutory, not workflow convenience

- **Retained review statement amended:** the Montana routes are presented as single-stage court filings.
- **Accepted normalized treatment:** four of six Montana tracks are `composed` / `sequential`, eight units in total. §§ 46-18-1110(2)(b) and 46-18-204(2) and the Office of the Court Administrator's MMRTA instructions all put the Department of Justice CRISS submission on the **participant**, after the court order. A different destination, a different actor's form and a participant submission the statute assigns to the participant make that a distinct legal unit.
- **Controlling source:** Mont. Code Ann. §§ 46-18-1110(2)(b) and 46-18-204(2); Montana Office of the Court Administrator MMRTA instructions.
- **Normalization commit:** `8fec9fc`
- **Authority effect:** each unit is audited independently; a composed track does not receive one blanket authority result.
- **Runtime effect:** none.

### 2. The MLSA and A2J forms are never generated

- **Retained review statement amended:** the review treats ER-100, ER-200, DS-100 and DS-200 as available Montana forms.
- **Accepted normalized treatment:** these are a Montana Legal Services Association and Access to Justice Commission work product licensed for non-commercial use only. They are neither mandatory nor usable in a paid packet, and **they are never generated**. The non-commercial-use stamp is real and travels in the page footer even on `courts.mt.gov`. Where the court stage needs a petition, LegalEase drafts its own, which is both lawful and cleaner: Title 46, chapter 18, part 11 prescribes no form, and § 46-18-1111 grants rulemaking authority under which no statewide expungement form has been adopted.
- **Controlling source:** Montana Legal Services Association published packets; Mont. Code Ann. §§ 46-18-1111 and 46-18-1104(3). The licence text could not be quoted from the primary source in this pass — `montanalawhelp.org` is behind a bot challenge — so the restriction is held closed rather than treated as absent.
- **Normalization commit:** `8fec9fc`
- **Authority effect:** the MLSA and A2J materials carry a `commercial_use` hold in Edition 1.2 and are not promoted to packet candidates.
- **Runtime effect:** none, and none is available while the restriction stands.

### 3. Two Edition 1.1 source-identity defects, carried as Edition 1.2 corrections

- **Retained review statement amended:** the review does not address the retained source identity of the Montana assets.
- **Accepted normalized treatment:** two defects were found and are recorded rather than papered over. **The CRISS form is classed `supporting_process`**, which the authority gate treats as unable to back an `official_pdf_fill` component, producing five role mismatches. **The Office of the Court Administrator Proposed Order and Certificate of Service share one document ID**, `MT-OCA-MMRTA`, at different hashes, producing four hash conflicts.
- **Controlling source:** Edition 1.1 `MASTER_ASSET_MANIFEST.csv`; Montana Department of Justice, Division of Criminal Investigation, Criminal Records and Identification Services Section, as the CRISS issuer; Montana Office of the Court Administrator as the MMRTA form issuer, under Montana Supreme Court order AF 22-0129.
- **Normalization commit:** `8fec9fc`
- **Authority effect:** both remain open in Edition 1.2 and appear in the source-acquisition queue with their required corrections. They are source-identity defects in the authority archive, so correcting them means republishing the affected assets under distinct document IDs and the correct class in a future edition — not editing Edition 1.1, and not remapping ad hoc in the repository.
- **Runtime effect:** the affected components stay authority-blocked.

### 4. The 2023 CRISS request form is superseded

- **Retained review statement amended:** the review does not distinguish the 2023 and 2024 CRISS revisions.
- **Accepted normalized treatment:** the 2024-04-29 CRISS expungement/removal request form is current; the 2023 PDF is superseded.
- **Controlling source:** Montana Department of Justice CRISS conviction-expungement process publication.
- **Normalization commit:** `8fec9fc`
- **Authority effect:** Edition 1.2 records the 2023 revision in the exclusion log as superseded, with its hash. The evidence is preserved; its treatment is recorded.
- **Runtime effect:** none.
