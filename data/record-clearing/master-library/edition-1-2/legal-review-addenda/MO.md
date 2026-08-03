# Missouri — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** MO
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/MO/01_LEGAL_REVIEW/MO__LEGAL-REVIEW__STATEWIDE__missouri-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `dfbae78`
**Runtime effect:** none. Every Missouri track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/MO/01_LEGAL_REVIEW/MO__LEGAL-REVIEW__STATEWIDE__missouri-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Missouri and is not counted as one.

## Amended statements

### 1. SB 1421 became law and creates §§ 610.141, 610.143 and 610.144

- **Retained review statement amended:** the review leaves Missouri automatic expungement unresolved.
- **Accepted normalized treatment:** Conference Committee Substitute for Senate Substitute for SB 1421, 103rd General Assembly, Second Regular Session, file `5940S.07T`, was truly agreed to and finally passed 15 May 2026 and approved by the Governor 9 July 2026. It repeals 54 sections and enacts 68, three of them new: **§§ 610.141, 610.143 and 610.144**. **§ 610.140 is not in the repeal list and was not amended.** The act carries no general effective-date clause — Section B's emergency clause reaches only §§ 589.900, 589.902 and 577.800 — so enactment takes effect on the ordinary constitutional date, **28 August 2026**, while **§ 610.141.10** separately makes the section's provisions effective when technically feasible for both the Office of State Courts Administrator and the central repository, but no later than **1 January 2027**. Enactment, effectiveness and operation are three different dates and participant copy must use the right one.
- **Controlling source:** enrolled CCS SS SB 1421 (`5940S.07T`); Mo. Rev. Stat. § 610.140, current text effective 1 January 2025, read from the Revisor. §§ 610.141, 610.143 and 610.144 are enacted but not yet codified on `revisor.mo.gov`, which is consistent with the conditional effectiveness above and is not an access failure.
- **Normalization commit:** `dfbae78`
- **Authority effect:** the scope is far narrower than coverage suggests — **four qualifying offences only**: possession under § 195.202 as it existed before 1 January 2017, drug paraphernalia under § 195.233 as it existed before that date, possession or control under § 579.015, and unlawful possession of drug paraphernalia under § 579.074. Not a nonviolent-felony category. **The participant submits nothing** and there is no application, opt-out or acceleration; § 610.141.8 makes a § 610.140 petition the sole remedy for a failure to expunge. **The review's cap-coordination build blocker is closed and the answer is yes:** § 610.141.6 limits an offender to three misdemeanour and two felony expungements under §§ 610.140 and 610.141 **combined**, so an automatic expungement spends the same lifetime slot a petition would.
- **Runtime effect:** none. Neither the Missouri State Highway Patrol's Criminal Records and Identification Division nor the Office of State Courts Administrator publishes an implementation notice, eligibility instructions, a form, a portal or a schedule, so the track stays runtime-disabled on a stated operational gate — not on any doubt that the law exists. **SB 1494 did not become law**; only the enrolled CCS SS SB 1421 text governs, and secondary summaries of Missouri clean slate must not be used.

### 2. CR300's statutory basis is § 575.120.4, not § 610.145

- **Retained review statement amended:** the review makes the statutory basis and scope of CR300 its Track 8 build blocker; the adopted memorandum's primary-authority line cites § 610.145 for both CR300 and CR301.
- **Accepted normalized treatment:** the form answers it on its own face — *Pursuant to sections 575.120.4 and 610.123, RSMo* — and § 575.120.4 gives the victim of a false impersonation the right to move for expungement and correction under the § 610.123 procedures. **The memorandum's citation is wrong for CR300**, and following it would have sent the packet to the wrong court and omitted the fingerprint card. The memorandum's *resolution* — `official_pdf_fill`, CR300, separate from CR301, use the form matching the factual mechanism — is unaffected and is followed.
- **Controlling source:** Mo. Rev. Stat. §§ 575.120.4 and 610.123; OSCA form CR300 (04-10).
- **Normalization commit:** `dfbae78`
- **Authority effect:** correction plus targeted expungement rather than expungement of the case; mandatory relief; the **civil division of the circuit court in the county of arrest**; the fingerprint card and the eleven mandatory contents; the thirty-day hearing; and the companion order CR310. Only the § 575.120.4 route is available where a conviction was entered, because the conviction was somebody else's.
- **Runtime effect:** none.

### 3. A companion order exists for every petition form, and the review recorded them as missing

- **Retained review statement amended:** the review lists the § 610.140 *Judgment and Order of Expungement* as "not obtained" and identifies no companion order for any other Missouri route.
- **Accepted normalized treatment:** the Office of the State Courts Administrator publishes a matched order form for every petition form, and Missouri circuit clerks list them by number and title — **CR370** for CR360, **CR143** for CR145, **CR310** for CR300, **CR311** for CR301.
- **Controlling source:** Missouri Courts expungement forms index; Missouri circuit clerk form indexes.
- **Normalization commit:** `dfbae78`
- **Authority effect:** none of the four is held by the repository or retained by Edition 1.2, so all four remain `authority_unmanifested_source` proposed-order components and appear in the source-acquisition queue. `courts.mo.gov` returns HTTP 403 to automated retrieval and `www2.courts.mo.gov` was decommissioned on 1 November 2025, so no Missouri Courts binary could be acquired — the same publisher-blocking pattern already recorded for `mncourts.gov` and `kjc.ks.gov`. **A blocked retrieval is not a finding that a form does not exist.**
- **Runtime effect:** none.

### 4. §§ 610.130 and 311.326 have no form, confirmed twice

- **Retained review statement amended:** both output strategies are left unresolved pending a form hunt.
- **Accepted normalized treatment:** both are `custom_pleading` with `localFormOverride: true`. The 16th Judicial Circuit's own informational sheet says of the § 610.130 route that *there are no forms provided, you or your attorney must draft and file all pleadings*, and the ArchCity Defenders June 2024 pro se guide lists §§ 610.130, 311.326 and 568.040 together under *Unfortunately, there are no Missouri Court Forms prepared to help you expunge these matters*.
- **Controlling source:** 16th Judicial Circuit informational sheet; ArchCity Defenders pro se guide, June 2024.
- **Normalization commit:** `dfbae78`
- **Authority effect:** the review's caution against drafting before confirming is honoured — the confirmation is now on the record, from two independent Missouri sources.
- **Runtime effect:** none.

### 5. Five points resolved from primary text

- **Retained review statement amended:** the review states a three-year period for § 610.140.7, leaves § 610.122 mandatoriness open, does not define alcohol-related enforcement contact, does not mention Rule 155, and leaves § 610.105 unenumerated.
- **Accepted normalized treatment:** **§ 610.140.7 is eighteen months**, not three years, in the **county of arrest**. **§ 610.123.4 makes § 610.122 relief mandatory** — *it shall enter an order directing expungement*. **Alcohol-related enforcement contact is defined at § 302.525.3** and governs both § 610.130 and § 311.326; it disqualifies on an administrative licence action that never became a conviction, which no participant would guess from the words *alcohol-related offense*. **§ 311.326 relief is mandatory** and the section says *upon review* rather than *after hearing*; the waiting period runs from the participant's twenty-first birthday, so the earliest application is at twenty-two however old the case. **Missouri Supreme Court Rule 155** governs expungement actions — 155.01 commencement, 155.02 filing fees and costs, 155.03 service, 155.04 notice and hearing, 155.05 judgment — adopted 24 December 2019, effective 1 July 2020, and the review does not mention it anywhere. **§ 610.105 has exactly one exception**, § 610.105.2's victim-access provision. **§ 610.145 contains two mechanisms**, and § 610.145.3 calls the second one *automatic expungement* in terms.
- **Controlling source:** Mo. Rev. Stat. §§ 302.525.3, 311.326, 610.105, 610.122, 610.123.4, 610.140.7 and 610.145; Mo. Sup. Ct. R. 155.01–155.05.
- **Normalization commit:** `dfbae78`
- **Authority effect:** Track 2's only build blocker is closed. Section 610.145 also carries ancillary relief the review did not: Department of Revenue expungement, reversal of licence points, suspensions and revocations, a certified corrected driver history at no cost, free reinstatement, and a three-year insurance-premium refund.
- **Runtime effect:** none.

### 6. FI-05 case-type codes, and two corrections to the review

- **Retained review statement amended:** the review places code XG in the Associate column and assigns XG to Tracks 7 and 8.
- **Accepted normalized treatment:** the official Case Types List, SJRC (07-23), publishes three expungement codes and **all three sit in the circuit column** — **XG** Expungement of Crim/Arrest Record, **X5** Expungement of Records (610.140 RSMo), **X#** Expunge Marijuana Criminal/Arrest Records. XG is a circuit code, and its published caption is the § 610.122 description, so it does not belong to Tracks 7 and 8. § 610.140 and § 610.140.7 take X5; § 610.122 takes XG; Article XIV takes X#. **The four remaining routes have no published code** and the field is left blank as a manual-completion item, with X1 offered as observed practice and the participant directed to the clerk. No code is inferred from a track name.
- **Controlling source:** OSCA Case Types List, SJRC (07-23); form FI-05, SJRC (04-23).
- **Normalization commit:** `dfbae78`
- **Authority effect:** Edition 1.2 retains FI-05 and CR301 as `source_gated` assets, establishing packet identity for two components that were corpus-only under Edition 1.1. **Source currentness stays open on CR300, CR301 and CR375**: the Missouri Courts index reports that set as *Updated 01/01/25*, which is consistent with CR375 at 10-24 but points to a reissue for CR300 at 04-10 and CR301 at 07-17, and the HTTP 403 means it could not be confirmed either way. Neither is runtime-cleared, and Edition 1.1's source-gated treatment of CR300 stands untouched.
- **Runtime effect:** none. On privacy: the full social security number belongs on FI-05 under Operating Rule 4.07 and is not repeated on CR360 or CR375, but § 610.123.1(1)(f) makes it a mandatory content of the petition itself on CR145 and CR300 and directs dismissal where it is not given.

### 7. Two composed tracks, and why only these two

- **Retained review statement amended:** the review does not distinguish participant-filing from automatic branches on the Article XIV and § 610.145 routes.
- **Accepted normalized treatment:** `MO-ART-XIV` and `MO-610-145-MI` are `composed` / `alternative`, two units each — the participant-filing-versus-automatic-relief pair the composition rule exists for. Article XIV § 2 creates three legally different situations: courts were *directed* to order expungement for completed sentences on 90/180/270-day constitutional deadlines; a person on probation or parole has the sentence **automatically vacated with no petition**; and a person currently incarcerated **may petition**. CR375's two selectable postures corroborate it, so a participant presently on supervision fits neither box, because the constitution does not ask them to petition. **Track 8 is deliberately not composed** — § 610.145's automatic branch is one statutory mechanism, represented once on Track 7 and cross-referenced rather than duplicated.
- **Controlling source:** Mo. Const. art. XIV, § 2; Mo. Rev. Stat. § 610.145.1(1) and (2); OSCA form CR375 (10-24).
- **Normalization commit:** `dfbae78`
- **Authority effect:** the population with a constitutional right and no form to enforce it is recorded as a release blocker rather than papered over. Generating CR301 for someone whose charge was dismissed on identity grounds would ask a court for relief the law already told it to enter.
- **Runtime effect:** none.

### 8. Obsolete and unofficial Missouri sources are never generated

- **Retained review statement amended:** the review does not classify the superseded Missouri copies.
- **Accepted normalized treatment:** never generated — the obsolete OSCA (11-17) CR360 with its superseded seven-year and three-year periods; the superseded OSCA (10-16) CR145; the unofficial modified public-defender marijuana petition; and the Jackson-County-captioned GN10 variant.
- **Controlling source:** the documents themselves, as held in the repository source corpus.
- **Normalization commit:** `dfbae78`
- **Authority effect:** each is retained as retired or reference-only with its hash. The evidence is preserved; none is a current source and none is resolver-selectable.
- **Runtime effect:** none.
