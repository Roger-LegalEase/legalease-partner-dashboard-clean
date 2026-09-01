# BLOCKER-4 — Terminalization provenance: the 18-record decision matrix

Lane J. Prepared, not applied. No hash in this document has been moved in the
repository; the patch that would move ten of them is
`patches/blocker-4-decision-unchanged-repin.patch`, and applying it is the
captain's call, not this lane's.

Base: `148382ab2a2acbe673b6d35c8967f5a908342e60`.

---

## 1. What is actually red, exactly

`node scripts/verify-rcap-terminalize-c1.mjs` fails with 18 lines, every one of
them the same assertion at `scripts/verify-rcap-terminalize-c1.mjs:263`:

```js
assert(sha256(fs.readFileSync(profAbs)) === prov.profileSha256,
  `${label}: provenance.profileSha256 drifted from ${prov.profilePath}`);
```

The verifier prints a job label, not a file. Five of the eighteen lines are the
identical string `T-C-WV-complete-composed-route/wv_dui_deferral_expungement`,
because that composed route has five pleading components and each carries its
own provenance block. The eighteen lines are eighteen distinct files. They were
resolved by instrumenting a scratch copy of the verifier to print
`path.relative(rootDir, configPath)` alongside each failure.

Seven compiled profiles are involved. For each, the last commit at which the
pinned hash was the file's real hash was recovered by walking the blob history:

| Profile | Pinned hash | Current hash | Last commit where the pin held |
|---|---|---|---|
| `CT-connecticut.json` | `451fc675…ac9a09` | `8f857308…08df7` | `8840721b` *legal: gate route rules only on facts the flow actually guarantees* (2026-08-25) |
| `IL-illinois.json` | `e491c80d…391595` | `7999f618…4da914` | `053e8db1` *legal: consume authority contracts at runtime* (2026-08-25) |
| `IN-indiana.json` | `0202d536…e22982` | `69e8fcc8…273dd` | `3f62146e` (2026-07-08) |
| `KY-kentucky.json` | `441a89c6…94b438` | `4f27411f…fcf672` | `8840721b` (2026-08-25) |
| `TX-texas.json` | `5d86879a…309dc4` | `8f99b365…097aa` | `053e8db1` (2026-08-25) |
| `VT-vermont.json` | `1a4267ce…ecf9af` | `36244c88…ffb283` | `3f62146e` (2026-07-08) |
| `WV-west-virginia.json` | `ee9a8d38…7b13de` | `0d5885d3…b08b78` | `053e8db1` (2026-08-25) |

Every prior compiled profile is recoverable from history. Nothing here rests on
a hash read back out of a committed record.

---

## 2. What moved in the compiled profiles, and what did not

Diffing each profile between its pin commit and HEAD gives a clean partition.

### 2.1 Domains that did not move at all

For **all seven** profiles, these top-level domains are byte-identical between
the pinned commit and HEAD:

`source`, `terminology`, `jurisdiction`, `questions`, `caseOutcomeOptions`,
`flowStages`, `copyGuardrails`, `resultPresentationContract`,
`frontendContract`, `qa`, `sourceSections`, `exclusionRules`, `schemaVersion`,
`profileVersion`.

This matters because it is precisely the set the eighteen records declare
reliance on. Every record carries a `statePackNote` or a `profileSilenceNote`
scoping what it takes from the profile, and in every case the scope is court
level, form catalogue, caption pattern, intake fields and terminology — the
domains above. Two examples, quoted verbatim from the records:

> *(WV, all five components)* "The compiled WV profile contains no occurrence of
> '17C-5-2b', 'Test and Lock', '17C-5A-3a' or any DUI-deferral pathway… This
> route therefore rests on the pinned registry entry; the profile and the
> committed state pack are used only for the West Virginia court-level,
> form-catalogue, intake-field and terminology facts they do record."

> *(IN, `in_supplemental_order`)* "…the compiled profile supplies only the
> Indiana caption pattern, the Petitioner label and the Trial Rules service
> convention."

### 2.2 What did move

1. **`questionLifecycle`** — a new top-level block on all seven profiles. A
   projection of the Lane D/E/I question-lifecycle mapping. It carries no legal
   conclusion.
2. **`pathways[*].lawrenceRatification`** — reprojected. The controlling record
   is now `data/record-clearing/legal-decisions/route-ratification-registry.json`
   (2026-08-28), which states its own status in terms:

   > "Both runtime structures are generated projections of this file: the
   > evaluator's ratification Sets, and the compiled profiles'
   > `lawrenceRatification` blocks. Neither is independently editable."

   Most of the reprojection is cosmetic: `lawrence_review` was relabelled to
   equal `status` (`first_pass_ratified` → `ratified_deployable`,
   `gate_required` → `hard_gate_pending`) and a `projectedFrom` stamp was added,
   with `status`, `packet_capable` and
   `payment_allowed_when_engine_confirms` untouched. Fifteen pathway changes
   across the seven profiles are of exactly this kind.
3. **Substantive pathway moves** — 15 pathways where `status`,
   `packet_capable`, `payment_allowed_when_engine_confirms`, or a
   non-ratification field actually changed. Enumerated in §3.
4. **WV only** — `orderedDecisionRules`, `waitingPeriodRules`, and
   `packetGenerator.pathways[pardon-based-expungement].mode`, all downstream of
   the four 2026-08-28 national decisions `NATIONAL-2026-08-28-C-WV-01..04`.
5. **IN only** — `packetGenerator.pathways[conviction-expungement-with-sealed-confidential-access].requiredInputIds`
   added.

### 2.3 The substantive moves, in full

| Profile | Pathway | What moved |
|---|---|---|
| CT | *(none)* | — |
| IL | `adult-non-conviction-expungement` | `ratified_deployable` → **`intentional_unsupported`**; packet_capable T→F; payment T→F |
| IL | `human-trafficking-survivor-vacatur-and-expungement` | `hard_gate_pending` → **`intentional_unsupported`** |
| IL | `felony-prostitution-relief` | `hold_guidance` → **`ratified_deployable`**; packet_capable F→T; payment F→T |
| IL | `juvenile-automatic-or-petition-expungement` | `ratified_deployable` → **`intentional_unsupported`**; packet_capable T→F; payment T→F |
| IN | `non-conviction-arrest-or-criminal-charge-expungement` | packet_capable F→T (status and payment unchanged) |
| IN | `juvenile-allegation-expungement` | packet_capable F→T |
| IN | `conviction-expungement-with-sealed-confidential-access` | `corrected_awaiting_reconfirmation` → **`ratified_deployable`**; packet_capable F→T; payment F→T; `requiredInputIds` added |
| KY | `misdemeanor-violation-traffic-conviction` (KRS 431.078) | `ratified_deployable` → **`intentional_unsupported`**; packet_capable T→F; payment T→F |
| KY | `felony-conviction-431073` | `hard_gate_pending` → **`intentional_unsupported`** |
| TX | `expunction-after-acquittal-not-guilty-disposition-chapter-55a` | ratification **newly asserted** where none existed: `ratified_deployable`, packet_capable T, payment T |
| VT | `dui-sealing` (13 V.S.A. § 7602(e)) | ratification **newly asserted**: `ratified_deployable`, packet_capable T, payment T |
| WV | `no-conviction-…-diversion-or-deferred-adjudication` (§ 61-11-25) | `waitingRules` replaced; `legalAuthority` added (`NATIONAL-2026-08-28-C-WV-03`) |
| WV | `eligible-conviction-expungement-…-61-11-26` | `waitingRules` replaced; `legalAuthority` added (`…-C-WV-02`) |
| WV | `accelerated-…-61-11-26a` | `waitingRules` replaced; `legalAuthority` added (`…-C-WV-01`); ratification newly asserted |
| WV | `pardon-based-expungement` (§ 5-1-16a) | `filingRequired` T→F; `routeType` `pardon_then_court` → `automatic_guidance`; `waitingRules` replaced; `legalAuthority` added (`…-C-WV-04`); packetGenerator `mode` changed |

---

## 3. The classification test

A record is **DECISION_UNCHANGED** only when all four limbs hold:

- **L1 — the substantive source is unmoved.** Every one of the eighteen records
  names `registry@3b6f4c1`
  (`data/record-clearing/legal-design-track-registry.json` at pin
  `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`) as the source of its track prose,
  authority, rules and packet composition. The verifier asserts that pin
  separately at line 257 and raises no failure on it, so the pin has not moved.
- **L2 — every profile domain the record declares reliance on is
  byte-identical.** True for all eighteen (§2.1).
- **L3 — the record's own route carries no ratification decision that moved.**
  All fourteen tracks behind the eighteen records are **absent** from
  `route-ratification-registry.json` (196 routes). They hold no counsel
  ratification status, so none can have moved.
- **L4 — no substantively-changed pathway shares operative statutory authority
  with the record's track.** Tested mechanically: each track's
  `mechanismAuthority` from
  `data/rcap-ledger/track-pathway-crosswalk.json` was normalised to statute
  cores and intersected against the label, summary, `ruleClauses` and
  `legalAuthority.statute` of every substantively-changed pathway in the same
  profile.

L4 is the limb that separates the buckets. L1–L3 hold for all eighteen.

A record is **RECORD_RETIREMENT_REQUIRED** when it no longer represents a live
route or a live proof. Tested against the terminalization ledger and against
`manifest-only-retirement-handoff.json`,
`manifest-only-retention-list.json`, `pdf-retirement-determination.json` and
`artifact-dispositions.json`. **No track appears in any retirement list**, all
fourteen are `promoted_by_f2` or `promoted_by_terminalization_review` in
`data/rcap-ledger/track-terminalization.json`, and every artifact is still on
disk and still fully checked by the verifier. The bucket is therefore empty, and
that is a finding, not an omission.

**DECISION_CHANGED** would require a route whose old and current decisions are
both recorded and different. No such record exists here: to have a decision that
changed, a track would have to carry one, and none of the fourteen does (L3).
The bucket is empty for the same reason.

---

## 4. The matrix

| # | Record (file) | Track | Profile | Classification |
|---|---|---|---|---|
| 1 | `data/rcap-all50/pleadings/connecticut/ct-cannabis-petition/pleading-config.json` | `ct-cannabis-petition` | CT | **DECISION_UNCHANGED** |
| 2 | `data/rcap-all50/pleadings/connecticut/ct-decriminalized/pleading-config.json` | `ct-decriminalized` | CT | **DECISION_UNCHANGED** |
| 3 | `data/rcap-all50/pleadings/illinois/il-immediate-seal/pleading-config.json` | `il-immediate-seal` | IL | **INSUFFICIENT_AUTHORITY** → Q-J-01 |
| 4 | `data/rcap-all50/pleadings/indiana/in_collateral_action/pleading-config.json` | `in_collateral_action` | IN | **DECISION_UNCHANGED** |
| 5 | `data/rcap-all50/pleadings/indiana/in_supplemental_order/pleading-config.json` | `in_supplemental_order` | IN | **DECISION_UNCHANGED** |
| 6 | `data/rcap-all50/composed-routes/kentucky/ky_criminal_record_segregation/components/ky_criminal_record_segregation-primary-filing-1/pleading-config.json` | `ky_criminal_record_segregation` | KY | **DECISION_UNCHANGED** |
| 7 | `data/rcap-all50/pleadings/kentucky/ky_void_seal_controlled_substance/pleading-config.json` | `ky_void_seal_controlled_substance` | KY | **INSUFFICIENT_AUTHORITY** → Q-J-02 |
| 8 | `data/rcap-all50/pleadings/kentucky/ky_void_seal_marijuana_synthetic_salvia/pleading-config.json` | `ky_void_seal_marijuana_synthetic_salvia` | KY | **INSUFFICIENT_AUTHORITY** → Q-J-03 |
| 9 | `data/rcap-all50/pleadings/texas/tx_exp_mistaken_identity/pleading-config.json` | `tx_exp_mistaken_identity` | TX | **DECISION_UNCHANGED** |
| 10 | `data/rcap-all50/pleadings/texas/tx_exp_pardon_other/pleading-config.json` | `tx_exp_pardon_other` | TX | **DECISION_UNCHANGED** |
| 11 | `data/rcap-all50/pleadings/texas/tx_exp_specialty_court/pleading-config.json` | `tx_exp_specialty_court` | TX | **DECISION_UNCHANGED** |
| 12 | `data/rcap-all50/pleadings/texas/tx_exp_unlawful_carry/pleading-config.json` | `tx_exp_unlawful_carry` | TX | **DECISION_UNCHANGED** |
| 13 | `data/rcap-all50/composed-routes/vermont/vt_exp_deferred_sentence/components/vt_exp_deferred_sentence-written-request-to-court-2/pleading-config.json` | `vt_exp_deferred_sentence` | VT | **DECISION_UNCHANGED** |
| 14 | `…/west-virginia/wv_dui_deferral_expungement/components/wv_dui_deferral_expungement-primary-filing-1/pleading-config.json` | `wv_dui_deferral_expungement` | WV | **INSUFFICIENT_AUTHORITY** → Q-J-04 |
| 15 | `…/wv_dui_deferral_expungement-supporting-affidavit-2/pleading-config.json` | `wv_dui_deferral_expungement` | WV | **INSUFFICIENT_AUTHORITY** → Q-J-04 |
| 16 | `…/wv_dui_deferral_expungement-secondary-filing-3/pleading-config.json` | `wv_dui_deferral_expungement` | WV | **INSUFFICIENT_AUTHORITY** → Q-J-04 |
| 17 | `…/wv_dui_deferral_expungement-supporting-timeline-4/pleading-config.json` | `wv_dui_deferral_expungement` | WV | **INSUFFICIENT_AUTHORITY** → Q-J-04 |
| 18 | `…/wv_dui_deferral_expungement-certificate-of-service-5/pleading-config.json` | `wv_dui_deferral_expungement` | WV | **INSUFFICIENT_AUTHORITY** → Q-J-04 |

**Counts — DECISION_UNCHANGED 10 · DECISION_CHANGED 0 · INSUFFICIENT_AUTHORITY 8 · RECORD_RETIREMENT_REQUIRED 0.**

The five WV records share one question rather than five copies of it, because
they are five components of one composed route, carry one identical provenance
block, and turn on one statutory boundary. Five identical questions would be
five ways of asking the same thing.

---

## 5. Per-record reasoning — DECISION_UNCHANGED

Each entry states why the legal and the product decision are both unchanged.
The mechanical patch line is in
`patches/blocker-4-decision-unchanged-repin.patch`; it is **not applied**.

### 1. `ct-cannabis-petition` — C.G.S. § 54-142v, § 54-142a

- **Legal.** Zero substantive pathway changes in the CT profile. The single CT
  pathway that moved,
  `petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202`,
  moved only its `lawrence_review` label from `first_pass_ratified` to
  `ratified_deployable` and gained `projectedFrom`; `status`, `packet_capable`
  and `payment_allowed_when_engine_confirms` are identical. The crosswalk's own
  candidate pathway for this track,
  `automatic-non-conviction-erasure-under-conn-gen-stat-54-142a`, is
  byte-identical. This is the one record whose note names the compiled profile
  as a co-source of track prose, so the whole-profile comparison, not just the
  pathway comparison, is what carries it: every witness domain is byte-identical
  and the only pathway edit inside its declared source changed no decision field.
- **Product.** The track holds no ratification record, no fulfillment record and
  no commercial authority; `commerciallyEligible` is 0 repository-wide.
- **Patch.** `451fc675…ac9a09` → `8f857308…08df7`.

### 2. `ct-decriminalized` — C.G.S. § 54-142d

- **Legal.** As above, and the record states the profile is silent on its
  statute outright: "The compiled CT profile does not describe § 54-142d at all."
  Zero substantive CT pathway changes.
- **Product.** Unchanged; no ratification record, no fulfillment record.
- **Patch.** `451fc675…ac9a09` → `8f857308…08df7`.

### 4. `in_collateral_action` — I.C. 35-38-9-9.5, 35-38-9-0.5

- **Legal.** Three IN pathways moved substantively; none shares a statute core
  with this track. The track's authorities are the collateral-action provision
  at § 35-38-9-9.5 and the definition at § 35-38-9-0.5; the moved pathways are
  the substantive relief branches. The record's declared profile reliance is
  narrow and untouched: the Indiana caption pattern, the Petitioner label, the
  service convention (recorded as a conflict) and the phrase "records of
  collateral actions" inside the § 35-38-9-6 and -7 order forms — all in
  `sourceSections`, which is byte-identical.
- **Product.** Unchanged. The one IN promotion
  (`conviction-expungement-with-sealed-confidential-access` to
  `ratified_deployable` with payment open) is a decision about a different
  pathway that this track does not represent; the crosswalk classes the track
  `missing_from_compiled_runtime` with no candidate pathway at all.
- **Patch.** `0202d536…e22982` → `69e8fcc8…273dd`.

### 5. `in_supplemental_order` — I.C. 35-38-9-9(l), 35-38-9-0.6

- **Legal.** Same reasoning; no statute-core overlap with any moved IN pathway.
  Declared profile reliance is the caption pattern, the Petitioner label and the
  Trial Rules service convention — all byte-identical.
- **Product.** Unchanged.
- **Patch.** `0202d536…e22982` → `69e8fcc8…273dd`.

### 6. `ky_criminal_record_segregation` (component `-primary-filing-1`) — KRS 17.142

- **Legal.** Both moved KY pathways are KRS 431.078 and KRS 431.073. This track
  is KRS 17.142 segregation, and the record states "The compiled KY profile does
  not mention KRS 17.142 anywhere." No statute-core overlap. The nearest live
  pathway, `nonconviction-431076`, is byte-identical.
- **Product.** Unchanged. The track carries `counselConfirmationRequired: true`
  and two release blockers, but those are standing pre-existing blockers
  recorded in the pinned registry, not drift introduced by the profile move, and
  they are not resolved by this patch.
- **Patch.** `441a89c6…94b438` → `4f27411f…fcf672`.

### 9–12. `tx_exp_mistaken_identity`, `tx_exp_pardon_other`, `tx_exp_specialty_court`, `tx_exp_unlawful_carry`

Tex. Code Crim. Proc. arts. 55A.006/.256, 55A.004, 55A.203, 55A.005 respectively.

- **Legal.** Exactly one TX pathway moved substantively:
  `expunction-after-acquittal-not-guilty-disposition-chapter-55a`, which gained a
  ratification block it did not have. It is the acquittal / not-guilty branch of
  Chapter 55A and shares no article with any of these four. The pathways nearest
  each track — `expunction-after-pardon-or-actual-innocence-relief`,
  `expunction-after-qualifying-dismissal-or-quash`,
  `expunction-for-arrest-with-no-charge-filed-after-the-limitations-period` — are
  byte-identical. The records themselves already record the profile as
  "corroborating rather than controlling", supplying the caption form, the ex
  parte petition style, the venue rule, the required-contents summary, the
  proposed-order rule and the seven-step filing sequence, and naming none of the
  four articles. All of that lives in the byte-identical domains.
- **Product.** Unchanged; no ratification record, no fulfillment record. The two
  standing TX release blockers (county filing cost after the art. 102.006
  repeal; sensitive-data handling in a public civil filing) are untouched by
  this patch and remain open.
- **Patch (all four).** `5d86879a…309dc4` → `8f99b365…097aa`.

### 13. `vt_exp_deferred_sentence` (component `-written-request-to-court-2`) — 13 V.S.A. § 7041(a),(e),(h); 28 V.S.A. §§ 204, 204a

- **Legal.** One VT pathway moved substantively, `dui-sealing`, which is
  13 V.S.A. § 7602(e) and gained a ratification block. The three
  `hard_gate_pending` VT pathways moved only their `lawrence_review` label. This
  track is § 7041(e) deferred-sentence expungement, and the record states "The
  compiled VT profile contains no occurrence of '7041', 'deferred sentence' or
  any deferred-sentence pathway." No overlap.
- **Product.** Unchanged. Treatment is `exact_supported_deferral`; the route is
  held, not sold.
- **Patch.** `1a4267ce…ecf9af` → `36244c88…ffb283`.

---

## 6. Per-record reasoning — INSUFFICIENT_AUTHORITY

For each, the hash is **not** moved and no patch is prepared. What is prepared
is one narrow question in `BLOCKER-4-LEGAL-OWNER-QUESTIONS.md`. Each of these
records could be re-pinned with the same one-line edit as the ten above; the
reason not to is that the re-pin would assert "the decision behind this record
still holds", and for these four routes that assertion is the thing nobody has
made.

### 3. `il-immediate-seal` — 20 ILCS 2630/5.2(g) → **Q-J-01**

The whole Illinois adult suite sits under 20 ILCS 2630/5.2, so this track shares
its statute core with all four substantively-moved IL pathways. Two of them
moved to `intentional_unsupported` — counsel's "deliberately out of scope" —
including `adult-non-conviction-expungement`, which is the § 5.2 non-conviction
family. Section 5.2(g) immediate sealing operates at the non-conviction moment
(acquittal or dismissal at disposition) and is attorney-mediated. Whether
counsel's out-of-scope decision on the § 5.2 non-conviction petition route
reaches the § 5.2(g) immediate-sealing pleading, or is confined to the § 5.2(b)
/ (c) petition route, decides whether this record should be re-pinned or
retired. That is a legal and product call, not a mechanical one.

### 7. `ky_void_seal_controlled_substance` — KRS 218A.275 → **Q-J-02**
### 8. `ky_void_seal_marijuana_synthetic_salvia` — KRS 218A.276 → **Q-J-03**

Both tracks list **KRS 431.078(2)** in their `mechanismAuthority`, and
`misdemeanor-violation-traffic-conviction` — the KRS 431.078 pathway, and the
only compiled pathway the crosswalk ever proposed as these tracks' runtime
representation — moved from `ratified_deployable` to `intentional_unsupported`,
with packet capability and payment both closed. The crosswalk resolved the
candidate away ("every candidate compiled pathway resolved to another track or a
terminal class"), so the move is not automatically these tracks' move; but
KRS 431.078(2) is procedurally cited by both void-and-seal motions, and both
already carry `counselConfirmationRequired: true` with unratified legal-effect
propositions. Whether putting the 431.078 route out of scope also puts these two
custom pleadings out of scope is exactly the question a re-pin would silently
answer.

### 14–18. `wv_dui_deferral_expungement`, five components — W. Va. Code § 17C-5-2b(c),(g) → **Q-J-04**

Decision `NATIONAL-2026-08-28-C-WV-03` rewrote the § 61-11-25 pathway's timing
anchor to read "acquittal, dismissal, or **the dismissal that follows a
completed diversion or deferred adjudication**", and attached a delivery gate
whose own items include "counsel's reading of whether SCA-C903 may be used at
all for a deferred-adjudication dismissal."

This route is a deferred adjudication: § 17C-5-2b(a) defers proceedings without
entering a judgment of guilt, (c) dismisses on programme completion, and (g)
expunges a year later. Its five components are custom pleadings drafted on the
premise, recorded in the route's own `counselFlags`, that the five published
West Virginia expungement forms all belong to § 61-11-25 or § 61-11-26 and none
is a § 17C-5-2b filing.

There is real evidence pointing the other way — § 61-11-25(a) expressly carves
DMV records out of "any order entered pursuant to § 17C-5-2b", which reads as
the Code treating the two as distinct vehicles, and the WV profile is silent on
§ 17C-5-2b. That is why this is INSUFFICIENT_AUTHORITY and not
DECISION_CHANGED. But the boundary is now genuinely live, it was not live when
the hash was pinned, and re-pinning would record that someone had checked.

---

## 7. Cross-cutting facts relied on

- `route-ratification-registry.json` holds 196 routes. All fourteen tracks
  behind the eighteen records are **absent** from it.
- `data/rcap-ledger/packet-fulfillment-records.json` holds exactly one record,
  `ND:first-offense-possession-sealing`. No track here has one, and
  `assertPacketFulfillmentProven` fails closed on absence, so every one of these
  routes is commercially denied today and would remain denied after the patch.
- `data/rcap-grade-a/fulfillment-authority-projection.json` covers 8 routes, all
  ND and OR, all `not_commercially_eligible`; `commerciallyEligible` is 0.
- The patch therefore moves **no** route's commercial posture. It closes a
  provenance-integrity gap and nothing else.

## 8. One operational note for the captain

`verify-rcap-terminalize-c1.mjs` ends with a working-tree check that fails on
*any* uncommitted change outside C1-owned paths. While this lane's documents are
uncommitted it reports:

```
 - working-tree change outside C1-owned paths: docs/rcap/grade-a/lane-j/
```

That line disappears once the lane commit lands. It is not a defect in the lane
or in the verifier, and it is not one of the eighteen.
