# BLOCKER-4 — Legal-owner questions

Four questions, covering the eight INSUFFICIENT_AUTHORITY records. Each is a
yes/no or A-or-B question about a boundary that already exists in committed
evidence. None commissions research: the statutes have been read at source and
the readings are in the pinned registry; what is missing is a decision about
scope.

Owner: **Lawrence (counsel)** for the legal limb, **Roger Roman** for the
product limb where a question has one. Recorded as controlling authority by
`data/record-clearing/legal-decisions/route-ratification-registry.json`.

Until a question is answered, the corresponding record's `profileSha256` stays
where it is and `verify-rcap-terminalize-c1.mjs` stays red for it. That is the
correct state, not a defect.

---

## Q-J-01 — Illinois § 5.2(g) immediate sealing

**Record:** `data/rcap-all50/pleadings/illinois/il-immediate-seal/pleading-config.json`
**Track:** `il-immediate-seal` — *Immediate Sealing at Disposition*, 20 ILCS 2630/5.2(g)

**What changed.** In the compiled Illinois profile,
`adult-non-conviction-expungement` moved from `ratified_deployable` to
`intentional_unsupported` ("deliberately out of scope"), with packet capability
and payment both closed. `juvenile-automatic-or-petition-expungement` and
`human-trafficking-survivor-vacatur-and-expungement` moved to
`intentional_unsupported` too. All of Illinois adult relief, this track
included, sits under 20 ILCS 2630/5.2.

**The question.**

> Does the `intentional_unsupported` decision on the Illinois § 5.2
> adult non-conviction expungement route also place the § 5.2(g)
> immediate-sealing-at-disposition pleading out of scope — yes or no?

**If yes:** `il-immediate-seal` is RECORD_RETIREMENT_REQUIRED, not a re-pin. The
record and its artifacts move to the retirement handoff rather than having their
hash moved.
**If no:** the record is DECISION_UNCHANGED and takes the same one-line re-pin
as the other ten, `e491c80d…391595` → `7999f618…4da914`.

**Standing context that does not change with the answer.** The track already
carries two release blockers from the pinned registry — whether any Illinois
court publishes a local form for the § 5.2(g) petition, and whether an
attorney-handoff packet is the accepted delivery model given that § 5.2(g)(5)(A)
frames the petition as filed by the defendant's attorney. Neither is resolved by
this question and neither is affected by the re-pin.

---

## Q-J-02 — Kentucky KRS 218A.275 void-and-seal

**Record:** `data/rcap-all50/pleadings/kentucky/ky_void_seal_controlled_substance/pleading-config.json`
**Track:** `ky_void_seal_controlled_substance` — *Motion to Void a First Controlled-Substance Possession Conviction and Seal the Records*, KRS 218A.275

**What changed.** `misdemeanor-violation-traffic-conviction`, the compiled
KRS 431.078 pathway, moved from `ratified_deployable` to
`intentional_unsupported`, closing packet capability and payment. This track
lists **KRS 431.078(2)** among its own mechanism authorities, and KRS 431.078 is
the only compiled pathway ever proposed as its runtime representation
(`candidateCompiledPathwayIds`, since resolved away by exhaustion).

**The question.**

> The KRS 431.078 misdemeanour expungement route is now
> `intentional_unsupported`. Does that scope decision extend to the
> KRS 218A.275 void-and-seal motion, which cites KRS 431.078(2)
> procedurally but is a different statutory relief — yes or no?

**If yes:** the record is RECORD_RETIREMENT_REQUIRED.
**If no:** DECISION_UNCHANGED, re-pin `441a89c6…94b438` → `4f27411f…fcf672`.

**Not asked here.** The track's standing counsel item — ratifying the fixed
statements of legal effect the motion may make about KRS 218A.275(9) and (10) —
is a separate, pre-existing release blocker. It is not resolved by this question
and the re-pin does not touch it.

---

## Q-J-03 — Kentucky KRS 218A.276 void-and-seal

**Record:** `data/rcap-all50/pleadings/kentucky/ky_void_seal_marijuana_synthetic_salvia/pleading-config.json`
**Track:** `ky_void_seal_marijuana_synthetic_salvia` — *Motion to Void a First Marijuana, Synthetic Drug or Salvia Possession Conviction and Seal the Records*, KRS 218A.276

**What changed.** Identical to Q-J-02: the same KRS 431.078 pathway moved to
`intentional_unsupported`, and this track likewise lists KRS 431.078(2) in its
mechanism authorities with the same candidate mapping.

**The question.**

> Same question as Q-J-02, for KRS 218A.276. Does
> `intentional_unsupported` on KRS 431.078 extend to the KRS 218A.276
> void-and-seal motion — yes or no?

Asked separately from Q-J-02 because .275 and .276 are different statutes with
different eligible offences, and one may be in scope while the other is not.

**If yes:** RECORD_RETIREMENT_REQUIRED.
**If no:** DECISION_UNCHANGED, re-pin `441a89c6…94b438` → `4f27411f…fcf672`.

---

## Q-J-04 — West Virginia § 17C-5-2b(g) versus § 61-11-25

**Records (five, one composed route):**

```
data/rcap-all50/composed-routes/west-virginia/wv_dui_deferral_expungement/components/
  wv_dui_deferral_expungement-primary-filing-1/pleading-config.json
  wv_dui_deferral_expungement-supporting-affidavit-2/pleading-config.json
  wv_dui_deferral_expungement-secondary-filing-3/pleading-config.json
  wv_dui_deferral_expungement-supporting-timeline-4/pleading-config.json
  wv_dui_deferral_expungement-certificate-of-service-5/pleading-config.json
```

**Track:** `wv_dui_deferral_expungement` — *Motion to Dismiss the Charges and
Application to Expunge After a First-Offence DUI Deferral*, W. Va. Code
§ 17C-5-2b(c) and (g)

**What changed.** Decision `NATIONAL-2026-08-28-C-WV-03`
(`src/lib/legal-authority/routes/national-report-batch-c.json`, rule
`WV-61-11-25-SCA-C903-STALE-FORM`) rewrote the § 61-11-25 pathway's timing
anchor to:

> "acquittal, dismissal, or **the dismissal that follows a completed diversion
> or deferred adjudication**"

and attached a delivery gate listing, among its items, "counsel's reading of
whether SCA-C903 may be used at all for a deferred-adjudication dismissal."

Section 17C-5-2b is a deferred adjudication: (a) defers proceedings without
entering a judgment of guilt, (c) dismisses on programme completion, (g)
expunges after a further year. So the § 61-11-25 pathway's newly-stated reach
and this route's subject matter now describe the same event from two directions.

**Evidence pointing to them being distinct**, recorded in the route itself:
§ 61-11-25(a) provides that no Division of Motor Vehicles record may be expunged
by virtue of any order entered pursuant to § 17C-5-2b — the Code cross-references
the two as separate vehicles. The compiled WV profile contains no § 17C-5-2b
pathway, and its only mentions of § 17C-5-2 are that DUI is excluded from
pretrial diversion under § 61-11-22. The route's `counselFlags` record that the
five published WV expungement forms all belong to § 61-11-25 or § 61-11-26 and
none is a § 17C-5-2b filing, which is why every court document in the route is a
custom pleading.

**The question.**

> After `NATIONAL-2026-08-28-C-WV-03`, is the dismissal entered under
> W. Va. Code § 17C-5-2b(c) expunged by the § 17C-5-2b(g) application
> as its own vehicle (A), or does it now route through § 61-11-25 and
> its SCA-C903 packet family (B)?

**If A:** all five records are DECISION_UNCHANGED and take the re-pin
`ee9a8d38…7b13de` → `0d5885d3…b08b78`. The route stands as drafted.
**If B:** all five records are RECORD_RETIREMENT_REQUIRED — the five custom
pleadings assert the wrong vehicle and the participant belongs on the
§ 61-11-25 route, which carries its own artifact-review gate.

**One question, five records.** They are five components of a single composed
route, carry one identical provenance block, and turn on one statutory boundary.
The answer applies to all five together.

**Standing context that does not change with the answer.** The route's own
release blocker — whether any West Virginia court uses an unpublished local form
for a § 17C-5-2b filing — is pre-existing and untouched by this question.

---

## What is deliberately not asked

- No question re-opens a statutory reading. Every statute above was read at
  source (dates recorded in the pinned registry: WV 2026-08-06, KY 2026-08-02,
  IL 2026-07-30, TX 2026-08-01) and those readings are not in dispute.
- No question asks for a route to be enabled commercially. Commercially eligible
  is 0 across the repository and every route here is denied. A "no" answer
  restores a provenance hash, nothing more.
- No question is asked about the ten DECISION_UNCHANGED records. Their patch is
  mechanical and needs no legal input.
