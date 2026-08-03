# Maine — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** ME
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/ME/01_LEGAL_REVIEW/ME__LEGAL-REVIEW__STATEWIDE__maine-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `5da9634`
**Runtime effect:** none. Every Maine track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/ME/01_LEGAL_REVIEW/ME__LEGAL-REVIEW__STATEWIDE__maine-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Maine and is not counted as one.

## Amended statements

### 1. PL 2025 c. 513 took effect 29 July 2026, not 11 January 2026

- **Retained review statement amended:** the review dates the sealing amendments to 11 January 2026.
- **Accepted normalized treatment:** 11 January 2026 is the date of enactment without the Governor's signature. The Act took effect **29 July 2026**.
- **Controlling source:** Maine PL 2025, c. 513, and the Maine Legislature's own enactment record.
- **Normalization commit:** `5da9634`
- **Authority effect:** every participant-facing effective-date statement on the ch. 310-A routes runs from 29 July 2026.
- **Runtime effect:** none.

### 2. CR-307 and CR-308 exist; the review recorded neither

- **Retained review statement amended:** the review records the largest Maine build blocker as the absence of a motion form, and identifies no proposed order for any ch. 310-A route.
- **Accepted normalized treatment:** **CR-307 exists** and is retained by Edition 1.1 at Rev. 06/26. **CR-308 exists** at Rev. 06/26, effective 29 July 2026.
- **Controlling source:** Maine Judicial Branch criminal forms list, forms CR-307, CR-308 and CR-218; the official CR-218 and CR-308 binaries were retrieved from the Judicial Branch forms portal on 2026-08-03.
- **Normalization commit:** `5da9634`
- **Authority effect:** the review's largest build blocker is closed. **CR-218 is confirmed current at Rev. 7/24**: the repository copy is byte-identical to the copy the Judicial Branch publishes today, so Edition 1.2 retains it as a **packet-form candidate** rather than source-gated. It is an encrypted PDF as published, so an unencrypted copy remains a prerequisite for field mapping. **CR-308 is narrower than the normalization assumes.** Its full title is *Order on Motion to Seal Criminal History for Victims of Sex Trafficking or Sexual Exploitation*; it was created under 15 M.R.S. § 2262-B by LD 1871 and is not a generic proposed order paired with CR-218. Edition 1.2 publishes it with its true scope recorded; the general ch. 310-A proposed-order components stay unmanifested, the affected track stays failed closed, and the conflict is recorded in the Edition 1.2 legal-design reconciliation queue as `e12-me-cr-308-scope` rather than resolved here.
- **Runtime effect:** none.

### 3. Node types: one routing node and one supporting action

- **Retained review statement amended:** all six Maine slots are presented as relief routes.
- **Accepted normalized treatment:** `ME-DEFERRED` is a `routing_node` per the adopted memorandum. `ME-SCREENING` moved from guidance to `custom_pleading` as a `supporting_action`. `ME-NONCONV` is composed — confidentiality by operation of law, plus the 16 M.R.S. § 709 correction request.
- **Controlling source:** adopted Batch 2 memorandum; 16 M.R.S. § 709.
- **Normalization commit:** `5da9634`
- **Authority effect:** a supporting action and a routing node are not paid relief mechanisms and are not counted as such.
- **Runtime effect:** none.

### 4. Deferred-disposition confidentiality under 16 M.R.S. § 703(2) is not established

- **Retained review statement amended:** the review treats deferred-disposition confidentiality as settled.
- **Accepted normalized treatment:** **NOT ESTABLISHED.** The route fails closed rather than being stated to a participant on an unverified basis.
- **Controlling source:** 16 M.R.S. § 703(2), current text.
- **Normalization commit:** `5da9634`
- **Authority effect:** recorded as an open legal-design question, not resolved by construction.
- **Runtime effect:** the affected unit is unavailable.
