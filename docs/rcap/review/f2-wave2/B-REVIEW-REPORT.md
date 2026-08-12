# F2 wave-2 — lane B independent technical review

- **Lane under review:** B (guidance, exclusions and exact deferrals) — complete branch, all states
- **Review base:** `a20987d1e55fc759960b05d4991b8263a63656c1` (verified ancestor of the branch tip; the tip adds only the wave-2 dispatch record, so working-tree packet bytes equal review-base bytes — additionally confirmed by recomputing every packet's sha256 against the manifest's `packetSha256`, 33/33 match)
- **Scope:** every F2 job with lane "B" in `data/rcap-all50/review-artifacts/f2-independent-technical-review.json` — 33 jobs, 72 pending tracks. `AK:ak-sej` is promoted and out of scope. Nothing from the superseded first pass carries over.
- **Reviewer independence:** this branch contains review evidence only; no lane-owned artifact was edited.
- **Review date:** 2026-08-12 (window `2026-08-12-w3`)

## Method

1. **Evidence pinning.** Recomputed sha256 for all 33 packet files from `git show a20987d1:<path>`; all match the manifest's `packetSha256`. Every closure's `evidenceSha` is that verified hash.
2. **Committed-authority universe.** Claims were verified against committed bytes only: the compiled profiles under `src/lib/rcap-engine/compiled/profiles/`, and the per-track legal-design memos at `data/record-clearing/legal-design-intake/<ST>.memo.json` on the pinned tip `3b6f4c10` of `feat/record-clearing-production-integration` — the tip every lane-B packet names in `sourceDependency` (fetched and read at exactly that commit). Deferral statements under `docs/record-clearing/deferrals/` were read at the review base. Outside legal knowledge was not used to generate findings; freshness review is out of scope per the build-first model.
3. **Mechanical pass (all 72 tracks).** A scripted checker asserted `paymentAllowed=false`/`sellable=false`, presence and bilingual pair-shape of the eleven elements plus `nextSteps`, EN/ES array-length parity, EN≠ES (translation-not-copy), a purchase-copy term scan in both languages, a bare-referral scan, and mechanical resolution of every `authority[].sourceRef` (profile pathway/rule/section ids; memo tracks and dotted field paths). All sourceRefs in all 72 tracks resolve. All purchase-term hits triaged to anti-sale copy ("no packet to buy", "do not pay anyone"), official government fees (e.g. NJ SBI, NY DCJS, OK OSBI $150, MT CHOPRS, WV $200/$100), or statutory fine descriptions (KY KRS 534.020) — none suggests purchasing from us.
4. **Substantive pass (all 72 tracks).** Nine independent adversarial sub-reviews, one per state cluster, each reading the packet, profile, memo and (where applicable) deferral doc: every legal claim in participant copy traced to committed bytes; EN/ES compared key-for-key for meaning; eleven-element usefulness and bare-referral checks; deferral statements checked for exact supported conditions. Every blocking finding, and every judgment call between blocking and minor, was then re-verified against the raw bytes by the closing reviewer before disposition (all quoted-byte evidence below was independently reproduced).
5. **Prior-correction verification (mustVerify item 5).** The superseded first-pass corrections were re-verified in the committed bytes directly (section below).
6. **Gates.** `node scripts/verify-rcap-guidance-terminalization.mjs` at the review base: exit 0 — 33 packet files, 73 tracks terminalized, 7 deferral statements, 115,720 assertions.

## Severity rule used for closing

`correction_required` was reserved for defects grounded in committed bytes that could change what a participant does or expects about eligibility, cost, timing, legal effect, or who acts: an uncarried or contradicted claim, a dropped limiting condition or exclusion, a violated binding memo `packet_instruction`, or an undelivered required element with no committed "not applicable" backing. Imprecisions that leave the participant's action and expectations unchanged (wrong-but-curable provenance pointers whose claims are carried elsewhere in the same committed source, typos, redundant steps, scope-ambiguous phrasings) are recorded inside `technical_approved` notes as non-blocking minors. An approval that could not be grounded in committed bytes was treated as a defect in the review itself; none was issued.

## Prior-correction verification (the wave-2 mustVerify item 5)

| State | First-pass finding | Verified state at the review base |
|---|---|---|
| MI | F2-01 — misd92 screened only MCL 780.621c | **Applied.** Both automatic tracks now run both screens: the never-eligible list AND the five-category automatic-track exclusion list, plus the more-than-one-assaultive bar and the two-felony cap, in `gather` and `nextSteps`, EN and ES, byte-consistent between the tracks. |
| MI | F2-02 — misd93 handoff stated MCL 780.621b without limits | **Applied.** Handoff carries the 24-hour same-transaction requirement and all three grouping-breakers (assaultive, weapon-involved, >10 years), both languages. |
| MI | F2-02b — misd93 missing the 621c screen and assaultive bar | **Applied** (see F2-01 row). |
| MI | F2-09 — compiled rule-11 routed a no-filing track to checkout | **Fixed in the committed profile** at the review base: `rule-11-…` now carries `guidance_only` / `save_state_guidance_no_checkout`, matching rule-10/27/41/56. (Fix landed via the captain's integration window; outside lane B's paths, recorded here as observed.) |
| CA | F2-03 — three of four exclusion categories | **Applied.** All four categories (PC 1192.7(c), 667.5(c), 290, punishable by life or death) in `gather` and `nextSteps`, EN and ES, carried by CA-california.json sourceSections[3]. |
| CA | F2-16 — handoff tripped the lane's own promise guard | **Applied.** Zero occurrences of "you qualify" / "usted califica"; shared verifier exits 0. |
| IL | F2-04 — objection window anchored to filing; two objectors | **Applied.** Window runs from service of the Notice of Filing, all four objecting entities named, in `timing`, `nextSteps[4]` and `afterNextStep`, EN and ES, carried by IL-illinois.json serviceAndNoticeRules. |
| AK | F2-08 — treatment vs compiled pathway classification | **Wave-2 required correction applied:** the packet describes the mechanism honestly as automatic non-publication at 60 days with Form TF-810 as the fallback court request, carried by AK-alaska.json wait-08 and the pathway's ruleClauses[5]. The compiled pathway's contradictory metadata (`automatic=false`, `filingRequired=true`, `routeType=court_filing`, `packet_ready_with_caution`) is UNCHANGED at the review base; lane B recorded it with its owner (profile owner + Terminal A) in `docs/record-clearing/deferrals/lane-b-f2-corrections.md` as a state-pack fidelity item, which is the remedy available inside the lane's writable paths. Approval semantics ("subject to runtime wiring") carry the residual; it is restated in the AK closure note so it cannot silently drop. |
| AK | F2-08b — bad exclusionRules[8] pointer | **Applied.** The pointer is gone; AS 12.55.078(f) cites sourceSections[3] 'Disqualifying offenses'. |

## Cross-cutting observations (not charged to any single track)

- **The memo layer is the load-bearing authority for most states.** Most packets cite `<ST>.memo.json` (pinned tip `3b6f4c10`) rather than the compiled profiles; the pin is committed and reachable, and every mechanically-resolved reference exists. Any future re-pin invalidates these closures' authority basis.
- **AK track-identity observation:** `ak-nonconviction-confidential` is bound in AK.memo.json to the agency-confidentiality mechanism (AS 12.62.160(b)(8); 13 AAC 68.310), while the packet's content is the CourtView non-publication mechanism the memo carries under `ak-courtview`. The packet's claims are fully carried by the compiled profile, and the assignment endorses this content, so it is not charged as a track defect — but if track-to-memo binding matters downstream, the mapping should be reconciled.
- **`timing: null` convention:** the lane's shared verifier permits an explicit null as a considered "no timing rule applies". This review accepted the null only where a committed source itself says timing is not applicable (MI `mi_deferral_status`) and treated it as an undelivered element where committed timing facts were writable (three ND routing tracks — see closures).
- **An "uncarried immigration rationale" pattern** appears in three states (NJ, OK, TX handoffs: variants of "clearing a record can take away the proof an immigration case needs"). The carried record in each state limits immigration copy to referral-out and no-effect statements. Closed as correction_required per state; a single lane-wide sweep for the sentence would cure all three.


## Closures by atomic group

### Group 1: AK/CA/IL/IN/MI (prior-correction states)

| # | Track | Outcome | Summary |
|---|---|---|---|
| 1 | `AK:ak-nonconviction-confidential` | correction_required | Defect: the 'all charges dismissed' eligibility ground is stated without the Criminal Rule 11 carve-out that both committed sources attach to it (AK-alaska.json pathway ruleClauses / wait-01: 'all charges were dismiss.... |
| 4 | `CA:ca-auto-conviction` | technical_approved | First-pass corrections verified in committed bytes: gather.en/es[4] and nextSteps.en/es[0] name all four exclusion categories (PC 1192.7(c) serious felonies, PC 667.5(c) violent felonies, PC 290 registration, offenses.... |
| 14 | `IL:il-auto-seal-2028` | technical_approved | First-pass correction F2-04 verified in committed bytes: timing, nextSteps[4] and afterNextStep run the 60-day objection window from service of the Notice of Filing ('not 60 days after the petition itself is filed') a.... |
| 15 | `IN:in_auto_expungement` | technical_approved | Authority fully memo-grounded (IN.memo.json in_auto_expungement: 1(b) own-motion/no petition, 1(a) pretrial-diversion bar, post-30-June-2022 cutoff, immediate vs 60-day effectiveness, prosecutor delay up to one year, .... |
| 25 | `MI:mi_auto_misd92` | correction_required | Defect: the packet gives the blanket lead-with-ICHAT instruction that the committed memo's binding packet_instruction for this exact track forbids. |
| 26 | `MI:mi_auto_misd93` | technical_approved | First-pass corrections F2-02 and F2-02b verified in committed bytes: gather and nextSteps carry the MCL 780.621c screen, the five-category automatic-track exclusion list, the more-than-one-assaultive bar and the two-f.... |
| 27 | `MI:mi_arrest_no_charge` | technical_approved | Authority (MCL 28.243(7)-(8) destruction on no-charge arrests), parity, payment suppression and all eleven elements verified against MI.memo.json with no defect.. |
| 28 | `MI:mi_arrest_acquittal_dismissal` | correction_required | Defect: afterNextStep.en/es presents an exhaustive stopper list — 'Three things can stop it' (prior conviction under MCL 28.243(14); objection on a dismissal; records lag) — that omits the other committed exclusion pr.... |
| 29 | `MI:mi_deferral_status` | technical_approved | Non-relief disposition-routing node verified: ten-citation authority set carried by MI.memo.json (MCL 333.7411, 762.11-762.15, 769.4a, 436.1703, 600.1070, 600.1209, 750.350a, 750.430, 780.621(2), 780.621d(7)(d)); pari.... |
| 30 | `MI:mi_setaside_csc4_pre2015` | correction_required | Defect: nextSteps.en[2] misstates the age element of the minor-offence definition as 'committed under age 21' (es[2] 'cometidos antes de los 21 años'). |

Full defect statements, byte evidence and acceptance conditions are in `B-DISPOSITIONS.json` (the notes are the normative text; this table is a summary).

## Totals

| Outcome | Tracks |
|---|---:|
| technical_approved | 6 |
| correction_required | 4 |
| held_on_source_or_design | 0 |
| **Total reviewed** | **10** |
