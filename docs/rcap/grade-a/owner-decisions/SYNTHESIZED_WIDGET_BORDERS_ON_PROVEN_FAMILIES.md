# Owner decision: 58 of the 199 proven families carry ink the official form does not print

**Raised by:** Captain, 2026-09-09, at Captain commit `deead9f250e606887d80837a2f4cb7423d7afa49`.
**This is a decision, not a request for permission to do ordinary engineering.** The
repair itself is authorized work. What is yours to decide is whether it may be
applied to families already counted terminal, because doing so moves their bytes.

## What is true

Four independent readers found the same defect today on four different states,
none of them looking for it, and an existing measurement says how far it reaches.

pdf-lib's default appearance provider synthesizes a bordered rectangle the size of
a widget's `/Rect`, and the shared flattening step stamps it, whenever the family
does not write that widget, the widget carries `/MK /BC`, and it has no usable
appearance at the moment pdf-lib regenerates. The ink lands *around* the box the
form already prints. At 400 dpi it reads as a doubled, thickened outline; the ink
extent grows about 0.6pt down and left.

It draws no glyph. That is why it has never been caught: `nonWhitespaceGlyphs`
`OutsideMeasuredWriteBoxes` reads `0` on every affected family and is telling the
literal truth, a bounding-box test cannot see a 0.6pt growth, and the mark sits at
a census widget's own rect, so the geometry counter has nothing to report.

`data/rcap-grade-a/packet-factory-24h/fix80/MK_BORDER_COHORT.json` is a read-only
scan by lane FIX80 across 257 delivering families, proved against ink before it was
trusted: VF02 measured Colorado's `co_multiple_conviction_seal-set` at exactly three
exposed widgets — JDF-641 9B.0, 9B.2 and 9C.0, 8,344 dark pixels at 300 dpi — and
the scan returns those three and no fourth. It finds **87 families, 6,103 widgets,
86 of them still on the old default**.

**58 of those 87 are `COMPLETE_PACKET_PROVEN` right now, carrying 4,180 exposed
widgets between them.**

## Why this reaches you

The fix exists and is proven. `suppressSynthesizedWidgetBorders` is an opt-in on
the shared flatten path; FIX80 repaired one family with it, and `ma-seal-court-set`
passes it and delivers 135 appearances with zero painting operators.

But applying it to a proven family **moves that family's bytes**. Its RASTER_PASS
receipt is bound to the old canonical and boundary hashes, so it stops binding, and
the family leaves `COMPLETE_PACKET_PROVEN` until it is rebuilt, re-rastered and
re-admitted. Terminal would fall from 216 by up to 58 before it climbs back.

That is a visible, temporary loss of published ground on families nobody has
complained about, and it is your call rather than mine.

## The three options

**A — Repair all 58 in staged batches.** Honest, and the packets stop shipping ink
the form does not print. Terminal drops toward 158 and returns over the following
raster batches. Longest path to 346 in the short run and the only one that is true
at the end of it.

**B — Repair nothing terminal; fix only the 14 failing families that carry it.**
Already in flight, costs no terminal, and leaves 58 proven families shipping a
defect four readers independently called wrong on the page. One of them, on Maine,
put synthesized boxes on the three GRANTED / GRANTED / DENIED ordering boxes of the
order a judge signs.

**C — Repair the subset where the ink lands on a judicial or sworn control, defer
the rest.** Narrower than A, defensible, and needs one more measurement per family
to say which widgets those are. It is the only option that needs work before it can
start.

## What I have done without waiting

Option B is running now, because it risks nothing you would have to approve: the
New Jersey trio (`nj_disorderly_persons-set`, `nj_indictable_conviction-set`,
`nj_ordinance-set`, 199 exposed widgets each — the largest concentration in the
fleet) is with lane FIX121, and the Colorado, Maine, Maryland and Rhode Island
failing members are with FIX01, FIX03, FIX04 and FIX08. Every one of those is
already `FAIL_REPAIR_REQUIRED`, so no terminal is at risk from any of them.

FIX121 will also report whether `suppressSynthesizedWidgetBorders` is a clean
per-builder opt-in or whether passing it required changing shared code. **That
answer should arrive before you decide**, because it determines whether A is 58
small edits or one shared change with 58 rebuilds behind it.

## What this decision does not do

It opens no route, promotes nothing, and approves no packet. A cohort is a
measurement: no family is repaired by being listed here, and none is condemned by
it either.

## The 58

| familyId | jurisdiction | exposed widgets |
| --- | --- | --- |
| nc_146_dismissal_petition-set | NC | 197 |
| nj_arrest_no_conviction-set | NJ | 195 |
| nc_145_5_felony-set | NC | 188 |
| nc_145_5_misdemeanor-set | NC | 185 |
| in_conviction_d6-set | IN | 170 |
| in_conviction_felony-set | IN | 153 |
| nh_conviction_standard-set | NH | 153 |
| in_conviction_misd-set | IN | 152 |
| vt_seal_nonconviction-set | VT | 139 |
| vt_exp_decriminalized-set | VT | 133 |
| vt_seal_18_to_21-set | VT | 131 |
| vt_seal_dui-set | VT | 131 |
| vt_seal_felony-set | VT | 131 |
| vt_seal_misdemeanor-set | VT | 131 |
| vt_seal_pardon-set | VT | 131 |
| nh_petition_nonconviction_pre2019-set | NH | 129 |
| nc_146_acquittal_petition-set | NC | 128 |
| va_seal_ancillary_matter_only-set | VA | 120 |
| va_seal_enumerated_seven_year-set | VA | 120 |
| in_arrest_no_charges-set | IN | 92 |
| in_section1_petition-set | IN | 92 |
| va_seal_petition_felony-set | VA | 92 |
| va_seal_petition_misdemeanor-set | VA | 92 |
| mi_setaside_trafficking-set | MI | 72 |
| co_multiple_conviction_seal-set | CO | 63 |
| mi_setaside_first_owi-set | MI | 62 |
| tx_nd_deferred_other-set | TX | 50 |
| tx_nd_conviction_no_supervision-set | TX | 49 |
| tx_nd_dwi_probation-set | TX | 49 |
| tx_nd_probation_misdemeanor-set | TX | 49 |
| tx_nd_dwi_deferred-set | TX | 48 |
| tx_nd_veterans_court-set | TX | 47 |
| tx_nd_veterans_reemployment-set | TX | 47 |
| pa_490_nonconviction-set | PA | 43 |
| rcap-tx-custom-pleading | TX | 43 |
| tx_exp_acquittal-set | TX | 43 |
| va_exp_identity_used_by_another-set | VA | 41 |
| ri_decriminalized-set | RI | 38 |
| ri_first_offender_misdemeanor-set | RI | 38 |
| ri_deferred_sentence-set | RI | 35 |
| mi_setaside_marihuana-set | MI | 31 |
| ne-setaside-custodial-set | NE | 27 |
| ak-tf800-set | AK | 24 |
| mi_setaside_application-set | MI | 18 |
| nd-nonconviction-close-petition-set | ND | 15 |
| ak-tf805-set | AK | 13 |
| ct-cleanslate-petition-set | CT | 12 |
| id_clean_slate_shield-set | ID | 9 |
| co_pardoned_conviction_seal-set | CO | 7 |
| ak-courtview-set | AK | 4 |
| official-form-treatment:obligation:research-decision-route:AL:al-olr | AL | 4 |
| ar-cs-possession-seal-set | AR | 3 |
| me-seal-prost-set | ME | 3 |
| ne-seal-pardoned-set | NE | 3 |
| id_isp_expungement-set | ID | 2 |
| ar-nonconviction-seal-set | AR | 1 |
| ky_void_seal_controlled_substance-set | KY | 1 |
| ky_void_seal_marijuana_synthetic_salvia-set | KY | 1 |
