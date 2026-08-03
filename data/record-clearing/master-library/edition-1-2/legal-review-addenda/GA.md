# Georgia — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** GA
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/GA/01_LEGAL_REVIEW/GA__LEGAL-REVIEW__STATEWIDE__georgia-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `3dfa302`
**Runtime effect:** none. Every Georgia track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/GA/01_LEGAL_REVIEW/GA__LEGAL-REVIEW__STATEWIDE__georgia-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Georgia and is not counted as one.

## Amended statements

### 1. HB 162 changed the first-offender petition routes, read from the signed Act

- **Retained review statement amended:** the review leaves two Track L gates open and states the first-offender petition standards as discretionary with written findings.
- **Accepted normalized treatment:** three findings the review could not have made. **§ 42-8-62.1(b)(1) is now mandatory** — the defendant's "may seek to" and the court's discretion were struck, and the written-findings paragraph (b)(2) is struck and reads *Reserved*. **The preponderance findings in § 42-8-62.1(d) were struck**, and new § 42-8-62.2(d) requires no findings at all; both petition routes are mandatory within 90 days of filing, so neither needs a privacy-harm or interests-of-justice narrative. **§ 42-8-62.1(f) changed "may" to *shall***, so the companion order to law enforcement, jails and detention centres is mandatory.
- **Controlling source:** 2026 Ga. Laws Act 403 (HB 162), effective 1 July 2026, read from the Governor's official signed-legislation library and confirmed by the Office of Legislative Counsel's 2026 summary.
- **Normalization commit:** `3dfa302`
- **Authority effect:** both Track L gates are closed on primary authority.
- **Runtime effect:** none.

### 2. The discharged-person petition moved sections, and Track L splits three ways

- **Retained review statement amended:** Track L is presented as one route under § 42-8-62.1(c).
- **Accepted normalized treatment:** the discharged-person petition moved out of § 42-8-62.1(c) into new § 42-8-62.2(c). Track L splits into `ga-fo-sentencing-post2026`, `ga-fo-active-pre2026` and `ga-fo-discharged-pre2026`; `ga-rfo` stays separate and is not part of the split.
- **Controlling source:** O.C.G.A. §§ 42-8-62.1 and 42-8-62.2 as amended by Act 403.
- **Normalization commit:** `3dfa302`
- **Authority effect:** § 42-8-62.1(c) as rewritten reaches anyone *sentenced* before 1 July 2026 whose sentence was not revoked, which textually overlaps the discharged population. The adopted allocation is preserved and the overlap is recorded as a nonblocking note on both tracks, **not** as a departure.
- **Runtime effect:** none.

### 3. Three guidance routes are reclassified as custom pleadings

- **Retained review statement amended:** `ga-jail-k2`, `ga-fugitive-j5` and `ga-vacated-j2` are classified `process_guidance`.
- **Accepted normalized treatment:** each is `custom_pleading`. § 35-3-37(k)(2) authorises a participant-signed written request to a named recipient, and correspondence is not a reason to withhold a packet. § 35-3-37(j)(5) supplies venue, notice recipients, contents, standard and relief; low volume and interstate facts are scope restrictions. For `ga-vacated-j2` the conviction is already vacated, so the petition is not post-conviction litigation and its elements are objective.
- **Controlling source:** O.C.G.A. § 35-3-37(j)(5) and (k)(2).
- **Normalization commit:** `3dfa302`
- **Authority effect:** none of the three is failed for lacking an official binary.
- **Runtime effect:** none.

### 4. Track B is a single official-form route, not a staged hybrid

- **Retained review statement amended:** Track B is described as having three stages.
- **Accepted normalized treatment:** stages two and three are the arresting agency's Section Two and the prosecutor's Section Three on the same GBI form — third-party blocks, left blank. It is a single `official_pdf_fill` route. Track A is the one composed Georgia route: the automatic § 35-3-37(h) unit has nothing to file, and the request letter to the prosecuting attorney is a second, distinct submission with `localFormOverride`.
- **Controlling source:** GBI/GCIC *Request to Restrict Arrest Record*; O.C.G.A. § 35-3-37(h).
- **Normalization commit:** `3dfa302`
- **Authority effect:** the third-party-field rule applies to Sections Two and Three; they are never participant-completed.
- **Runtime effect:** none.

### 5. Source currency: the GBI form is byte-identical to the published copy

- **Retained review statement amended:** the review does not establish the currency of the one mandatory Georgia official form.
- **Accepted normalized treatment:** the corpus copy of the GBI *Request to Restrict Arrest Record* is **byte-identical** to the copy GBI publishes today, and § 35-3-37 was not amended in 2026. No statewide judiciary form exists for any Georgia court petition, so every petition route carries `localFormOverride`.
- **Controlling source:** Georgia Bureau of Investigation / GCIC published form; O.C.G.A. § 35-3-37 current text.
- **Normalization commit:** `3dfa302`
- **Authority effect:** Edition 1.2 additionally logs the GBI/GCIC *Georgia Law Regarding Time Expired Restrictions* as a reference source with its hash. It supplies the Track C consumer warning from the issuing agency's own document and is never a generation target.
- **Runtime effect:** none.
