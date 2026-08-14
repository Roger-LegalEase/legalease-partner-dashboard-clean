# F2 — Independent review: guidance treatments and hard-form / pleading treatments

Lane: **Terminal F2**, independent read-only review.
Review branch: `claude/rcap-review-f2-guidance-hard-forms` (base `b090f7a8`, `origin/main`).
Review date: 2026-08-12.

This lane authored no fix, edited no product code, and changed nothing outside
`docs/rcap/review/f2/`. Every statement below is grounded in a command that was
run or a file that was read; where a thing could not be verified it is recorded
as **unverified**, not approved.

## 1. Targets

Both target SHAs were confirmed reachable after `git fetch origin`.

| Lane | Branch | SHA | Subject |
|---|---|---|---|
| B | `claude/rcap-terminalize-b-guidance` | `a26eda058a64c50458939e16e382412b39959756` | feat(rcap): add Michigan's two automatic Clean Slate guidance tracks |
| E | `claude/rcap-terminalize-e-hard-forms` | `fab2861205be8e6c61f23c24bd700b6b1bb751e6` | E: commit the CR-410 and CR-106 derivatives their records already pin |

```
$ git cat-file -t a26eda058a64c50458939e16e382412b39959756   -> commit
$ git cat-file -t fab28612                                    -> commit
```

Both branches share the merge base `df3d8607` (`Record Terminal D's immutable
worker digest and complete the staging action`). Lane B's own work is the six
commits `1a8f106b..a26eda05`; lane E's own work is the five commits
`3118cc83..fab28612`. The treatment inventory below was built from
`git diff --stat df3d8607 <sha>` for each lane and from reading every changed
treatment/content file — nothing was assumed.

Neither lane changed anything under `src/`:

```
$ git diff --name-only df3d8607 a26eda05 -- src/    (empty)
$ git diff --name-only df3d8607 fab28612 -- src/    (empty)
```

That matters for attribution: where a defect below lives in a compiled profile
under `src/lib/rcap-engine/compiled/profiles/`, it is **pre-existing**, and the
finding is that the treatment does not reconcile it — not that the lane
authored it.

## 2. Treatment inventory (13)

**Lane B — guidance packets** (`data/rcap-all50/guidance-packets/`), 4 files,
6 tracks, all `complete_guidance`:

| # | Track | Job | File |
|---|---|---|---|
| 1 | `ak-nonconviction-confidential` | `T-B-AK-complete-guidance` | `ak.json` |
| 2 | `ak-sej` | `T-B-AK-complete-guidance` | `ak.json` |
| 3 | `ca-auto-conviction` | `T-B-CA-complete-guidance` | `ca.json` |
| 4 | `il-auto-seal-2028` | `T-B-IL-complete-guidance` | `il.json` |
| 5 | `mi_auto_misd92` | `T-B-MI-complete-guidance` | `mi.json` |
| 6 | `mi_auto_misd93` | `T-B-MI-complete-guidance` | `mi.json` |

**Lane E — hard-form / pleading families** (`data/rcap-all50/hard-forms/`):

| # | Family | Tier | Job | Tracks |
|---|---|---|---|---|
| 7 | `california/cr-180-petition-for-dismissal` | `tier_1_hybrid_widget_shadow` | `T-E-CA-production-packet` | ca-1203-41/42/43/4a, ca-17b-reduction |
| 8 | `california/cr-181-order-for-dismissal` | `tier_1_hybrid_widget_shadow` | `T-E-CA-production-packet` | same five |
| 9 | `california/cr-409-petition-to-seal-arrest-records` | `tier_1_hybrid_widget_shadow` | `T-E-CA-production-packet` | ca-851-91 |
| 10 | `california/cr-410-order-to-seal-arrest-records` | `tier_1_hybrid_widget_shadow` | `T-E-CA-production-packet` | ca-851-91 |
| 11 | CR-106 Proof of Service (in `california/tier-0-reclassification-and-components.json`) | `tier_1_capable_binding_policy_open` | `T-E-CA-production-packet` | serves the six CA tracks |
| 12 | `delaware/family-court-form-281` | `exact_supported_deferral` | `T-E-DE-production-packet` | `de_discretionary_family_court` |
| 13 | `maine/cr-289-motion-to-seal-prostitution-conviction` | `exact_supported_deferral` | `T-E-ME-production-packet` | `me-seal-prost` |

MC-025 and MC-031 are recorded in the same reclassification file as Tier-0
handoffs to Terminal D. They are not lane-E treatments and are not dispositioned
here.

## 3. Dispositions

| # | Treatment | Disposition |
|---|---|---|
| 1 | AK `ak-nonconviction-confidential` | correction_required |
| 2 | AK `ak-sej` | **technical_approved** |
| 3 | CA `ca-auto-conviction` | correction_required |
| 4 | IL `il-auto-seal-2028` | correction_required |
| 5 | MI `mi_auto_misd92` | correction_required |
| 6 | MI `mi_auto_misd93` | correction_required |
| 7 | CA CR-180 | correction_required |
| 8 | CA CR-181 | correction_required |
| 9 | CA CR-409 | correction_required |
| 10 | CA CR-410 | correction_required |
| 11 | CA CR-106 | **held_on_source_or_design** |
| 12 | DE Form 281 | correction_required |
| 13 | ME CR-289 | correction_required |

**technical_approved 1 · correction_required 11 · held_on_source_or_design 1**

## 4. Acceptance gates as run by this lane

### Lane B acceptance contract — FAILS at the target SHA

```
$ cd <worktree @ a26eda05>
$ node scripts/verify-rcap-guidance-terminalization.mjs --partition=B1
guidance terminalization (partition B1): 4 packet file(s), 6 track(s) terminalized,
1 deferral statement(s), 7611 assertions.

verify-rcap-guidance-terminalization FAILED — 20 problem(s):
 - data/rcap-all50/guidance-packets/ca.json#ca-auto-conviction.handoff.en:
     participant text makes a prohibited outcome promise "you qualify"
 - data/rcap-all50/guidance-packets/ca.json#ca-auto-conviction.handoff.es:
     participant text makes a prohibited outcome promise "usted califica"
 - GA:ga-fo-sentencing-post2026 … (18 further "assigned to lane B but is not
     terminalized in any guidance packet" coverage failures)
exit=1
```

Unscoped, the same verifier reports **67** unterminalized lane-B tracks
(`… | grep -c "assigned to lane B but is not terminalized"` → `67`), exit 1.

### Lane E acceptance contracts — both PASS

```
$ node scripts/verify-rcap-hard-form-dispositions.mjs
  ok  …/delaware/family-court-form-281 — exact_supported_deferral, de_discretionary_family_court
  ok  …/maine/cr-289-…                 — exact_supported_deferral, me-seal-prost
verify-rcap-hard-form-dispositions passed: 2 non-packet treatment(s) …    exit=0

$ npm install pdf-lib@1.17.1 --no-save   # not vendored in the clone
$ node scripts/verify-rcap-hard-form-outputs.mjs
  ok  …/cr-180…/{boundary,canonical,negative}   24/24/8 populated
  ok  …/cr-181…/{boundary,canonical,negative}   12/12/1 populated
  ok  …/cr-409…/{boundary,canonical,negative}   10/10/2 populated
  ok  …/cr-410…/{boundary,canonical,negative}    3/3/1  populated
verify-rcap-hard-form-outputs passed: 12 rendered fixtures across 6 profile(s). exit=0
```

All four pinned derivatives are staged and hash-clean
(`sha256sum` matches `derivedSource.sha256` for cr-180/181/409/410; cr-106 is
staged at `b20f56ea…` as its record pins). The `presentInClone: false`
official-source bytes are **not** in the repository, so official-source
faithfulness is **unverified** by this lane — only derivative integrity is
proven.

Both lanes' outputs are inert at these SHAs: `grep -rn "guidance-packets" src/`
and `grep -rn "rcap-all50/hard-forms" src/` both return nothing. The
guidance-only branch that suppresses the stepper and the pay control does exist
(`src/app/briefcase/[packetId]/page.tsx:31,52,105,124`), but no code selects
lane-B or lane-E data. Nothing found below is live today.

## 5. Findings by verification criterion

### Criterion 1 — committed authority supports every participant-facing statement

Verified by resolving each `authority[].sourceRef` against the committed
compiled profiles and grepping the operative language.

Supported and confirmed:

* AK 60-day CourtView non-publication, TF-810 / TF-805 / TF-800, "typically no
  fee", "does not destroy the underlying record" — all carried by
  `AK-alaska.json` (`waitingPeriodRules` wait-01/05/08, `exclusionRules[23]`,
  `sourceSections[8]`).
* AK `ak-sej`: AS 12.55.078 effect, once-per-lifetime, AS 12.55.078(f)
  exclusions, distinction from AS 12.55.085 — all carried, including the honest
  statement that no post-sentencing request procedure exists.
* CA: PC 1203.425 / AB 1076 / SB 731, monthly DOJ pass, the 1-year and 4-year
  clocks, "notation limiting dissemination", the backlog caveat, PC 1203.49
  residual route, county-of-conviction venue, DOJ record-review + Live Scan
  cost — all carried by `CA-california.json`.
* IL: P.A. 104-0459 signed 16 Jan 2026, automatic sealing from 1 Jan 2029
  phasing through 2034, 30 June 2026 shortened wait and drug-test removal,
  20 ILCS 2630/5.2(c) — all carried by `IL-illinois.json`.
* MI: MCL 780.621g eff. 11 Apr 2023, 92-day and 93-day clocks, the four/two
  automatic caps, MCL 780.621c, MCL 780.623 nonpublic record, ICHAT
  verification — all carried by `MI-michigan.json`.

Defects:

* **F2-01 (MI `mi_auto_misd92`)** — the participant's eligibility screen names
  only the MCL 780.621c never-eligible list. `MI-michigan.json`
  `sourceSections['Disqualifying / ineligible offenses']` states a *second*,
  track-wide screen for automatic relief (assaultive crimes, serious
  misdemeanors, crimes of dishonesty, offences punishable by ten or more years,
  and offences involving a minor, a vulnerable adult, injury or serious
  impairment, or death) and adds that "a person with more than one assaultive
  conviction is barred from automatic relief entirely". Its AGENT GUIDANCE says
  in terms: "Run two screens". The 92-day treatment carries one. It also omits
  the two-felony automatic cap that the 93-day treatment does carry.
* **F2-02 (MI `mi_auto_misd93`)** — `handoff.en` says "Michigan also collapses
  convictions arising from the same incident under MCL 780.621b, which can
  change the count". The source rule is narrower in two ways the copy drops:
  the offences must have "occurred **within 24 hours** and arose from the same
  transaction", and the grouping is broken "**unless** one is assaultive,
  weapon-involved, or punishable by >10 years". As written the copy is
  over-broad in the participant's favour on a rule the lane itself calls
  decisive.
* **F2-03 (CA `ca-auto-conviction`)** — `gather.en[4]` and `nextSteps.en[0]`
  present the eligibility screen as three exclusion categories (1192.7(c),
  667.5(c), 290). `CA-california.json` states four: "…• Felonies punishable by
  life or death, and other top-tier offenses by statute." The fourth is cited
  in `authority[3]` but never reaches the participant.
* **F2-04 (IL `il-auto-seal-2028`)** — `timing.en` and `nextSteps.en[4]` say
  "the prosecutor and the State Police have a 60-day window to object after the
  petition **is filed**". `IL-illinois.json` says "Objections must be filed
  within 60 days **after service**", and names four objectors, not two: "the
  State's Attorney/prosecutor, Illinois State Police, arresting agency, and
  chief legal officer of the local government that made the arrest."
* **F2-05 (DE Form 281)** — `participantTreatment.whatTheParticipantIsTold`
  asserts "Delaware Family Court adult expungement under 11 Del. C. § 4374(c)
  is available where every charge was disposed of in Family Court", and
  `receivingAuthority` routes the participant to Family Court. Nothing in the
  repository carries § 4374(c) (`"4374(c)"` → 0 hits in `DE-delaware.json`) or
  an adult Family Court venue rule. What the committed profile *does* say is
  "Mandatory is handled by the SBI; **discretionary is filed with the Superior
  Court** (Family Court for **juvenile**)", and its only worked § 4374 example
  is captioned "SUPERIOR COURT OF THE STATE OF DELAWARE, NEW CASTLE COUNTY".
  The same uncorroborated premise is what the lane used to reject the Superior
  Court form as a candidate ("Filling a Superior Court petition for a Family
  Court filing would misroute the participant"). This may well be right as a
  matter of Delaware law; it is not traceable to committed authority, and it
  conflicts with the only committed venue statement.
* **F2-06 (ME CR-289)** — the deferral turns on "PL 2025, c. 513, which
  repealed § 2262-A(1) effective January 11, 2026". `ME-maine.json` carries PL
  2025 c. 513 and the 11 Jan 2026 date, but describes it as **creating** the
  2262-B survivor route; it says nothing about repealing § 2262-A(1) (`"2262-A"`
  → 0 hits). The supporting document
  (`STATES/ME/01_LEGAL_REVIEW/…maine-record-clearing-legal-review…md`) is not in
  the repository (`STATES/` is absent; 0 tracked files). Separately, the
  participant string asserts "with no continuing self-reporting duty"
  (`"self-report"` → 0 hits) and the next step asserts CR-307 "has no waiting
  period" — neither is carried by committed authority.

### Criterion 2 — English and Spanish convey the same substance

**Lane B: satisfied.** A token-parity scan across every `{en, es}` pair in all
four packet files found **zero** divergence in numbers, dates, statutory
subsections or list lengths, and B's own verifier asserts non-empty, non-copied
Spanish on every pair (part of its 7,611 assertions). Reading the six packets
in full, no condition, deadline or caveat is present on one side and absent on
the other; where a limitation is omitted (F2-01…F2-04) it is omitted equally in
both languages. One terminology note, not a disposition driver: CA
`gather.es[2]` renders "probation" as *libertad condicional* and "parole" as
*libertad supervisada*, which inverts the usual Spanish usage; the full set of
sentence components is still conveyed.

**Lane E: not satisfied — F2-07.** The `rcap-hard-form-profile/v1` schema has no
language keys at all. Every participant-facing string lane E commits
(`participantTreatment.whatTheParticipantIsTold`, `receivingAuthority`,
`nextStep` for DE and ME) exists only in English. Whether a Spanish surface is
supplied elsewhere is **unverified** — nothing under `src/` reads these files.

### Criterion 3 — no filing route is incorrectly represented as guidance

* **F2-08 (AK `ak-nonconviction-confidential`) — the one hard route-class
  conflict.** B ships this as `complete_guidance`, `paymentAllowed: false`. The
  committed pathway says the opposite:

  | profile | pathway | automatic | filingRequired | routeType | suggestedResultCode |
  |---|---|---|---|---|---|
  | CA-california | `tool-2-automatic-relief` | true | false | automatic | guidance_only |
  | IL-illinois | `clean-slate-automatic-sealing` | true | false | automatic | guidance_only |
  | MI-michigan | `automatic-clean-slate-set-aside-under-mcl-780-621g` | true | false | automatic | guidance_only |
  | **AK-alaska** | `confidentiality-of-acquittals-and-dismissals-…` | **false** | **true** | **court_filing** | **packet_ready_with_caution** |

  AK is the lone outlier: three of the four guidance treatments sit on pathways
  whose metadata already agrees with a guidance treatment, and one does not.
  The participant *copy* does disclose the TF-810 filing, its destination and
  its fee, so the copy itself is not "informational-only" — the defect is that
  the classification and the committed routing metadata contradict each other
  and nothing in the lane reconciles them. B's verifier reads only the ledger,
  the packets and the deferral docs, so it cannot see this.
* DE and ME are court-filing routes carried as `complete_guidance_no_packet`.
  Both name a receiving authority and a concrete next step, so neither is
  presented as informational-only. Satisfied (subject to F2-05 on *which* court
  Delaware names).
* IL correctly and repeatedly tells the participant the pre-2029 route is a
  petition, i.e. a filing. Satisfied.

### Criterion 4 — no automatic / no-filing route permits checkout

* **Lane B, at the treatment layer: satisfied.** Every one of the six entries
  carries `paymentAllowed: false` and `sellable: false`, asserted per entry by
  the verifier. The Briefcase guidance-only branch suppresses `MatterStepper`
  and the completion/pay control (`page.tsx:52,105,124`).
* **F2-09 — unclosed exposure below the treatment layer.** The committed
  ordered decision rules still route automatic tracks to checkout. The
  authority MI `mi_auto_misd92` itself cites, `rule-11-92-day-or-less-
  misdemeanors-are-set-aside-7-years-after`, carries
  `then: {suggestedResultCode: "packet_ready_with_caution", frontendAction:
  "show_cautions_then_allow_packet_checkout"}`, while its sibling rules
  (rule-10, rule-27, rule-41, rule-56) all carry
  `save_state_guidance_no_checkout`. In `AK-alaska.json`, 11 rules keyed to
  CourtView non-publication permit checkout. These rules are **pre-existing**
  (neither lane touched `src/`), and are inert today, but no artifact in either
  lane records or reconciles them.
* **Lane E: satisfied.** DE and ME both set `checkoutProhibited: true`,
  enforced by `verify-rcap-hard-form-dispositions.mjs`. The four Tier-1 CA
  families are genuine filing routes; their handoffs state checkout stays
  prohibited pending Terminal A's wiring and F's visual approval — see F2-13
  for the fact that this is prose only.

### Criterion 5 — Delaware and Maine deferrals: exact reason, destination, next step

**Both satisfied.**

| | Exact reason | Exact destination | Exact next step |
|---|---|---|---|
| DE Form 281 | "The official Family Court Form 281 principal petition binary, at any revision. The canonical Master Library Edition 1 bundle contains FORM-281E (charge sheet) only…" | "Family Court of the State of Delaware for the county where the charges were disposed of (New Castle, Kent or Sussex)" | "Obtain Family Court Form 281 … from the Family Court clerk or courts.delaware.gov, together with Form 281E charge sheet … and the required SBI criminal history report." |
| ME CR-289 | "Confirmation of whether the Maine Judicial Branch has issued a CR-289 revision after PL 2025, c. 513 (effective 2026-01-11), and the revised binary with its sha256 if one exists." | "Clerk of the court of conviction (Superior Court, District Court or Unified Criminal Docket, as the conviction record shows)" | "Request the current CR-289 from the clerk or courts.maine.gov and confirm whether a post-PL 2025 c. 513 revision has issued; screen for the broader survivor route under CR-307…" |

Both also name a blocker owner and a next action, and both list the tier the
family reaches once unblocked. Delaware additionally records all three rejected
candidates with full sha256, what each artifact actually is, and why it cannot
serve the track — the strongest evidence discipline seen anywhere in this
review. The dispositions for DE and ME are nevertheless `correction_required`,
on criterion 1 (F2-05, F2-06), not on criterion 5.

### Criterion 6 — each California route has every required component

* Lane B `ca-auto-conviction` carries all eleven participant elements plus
  `nextSteps`, `authority`, `paymentAllowed`, `sellable`. Satisfied.
* **F2-10 — the CA petition routes are missing their service component.**
  `CA-california.json` requires service: "5 Serve the prosecuting attorney
  (District Attorney or city attorney). For 1203.4, the prosecutor must receive
  at least 15 days' notice before relief is granted." Lane E identifies the
  component (CR-106, "Proof of Service (Criminal Record Clearing)") and
  deliberately does not author its field map. So all six CA tracks ship
  petition + proposed order and no proof of service, and no lane-E artifact
  gives the participant instructions for effecting service instead. The
  decision not to guess a service recipient is correct and well reasoned; the
  gap it leaves is not closed anywhere.
* **F2-11 — CR-106's held disposition is outside every verifier.**
  `verify-rcap-hard-form-dispositions.mjs` walks only `profile.json` files
  (`else if (entry.name === "profile.json")`). CR-106 lives in
  `california/tier-0-reclassification-and-components.json`, so it is checked by
  nothing. It has an exact `blocker` (missing evidence, owner
  "counsel / state-pack legal design (CA)", next action) but **no
  `participantTreatment`, no `routeStatus`, and no `checkoutProhibited`** — the
  three things the verifier would have demanded of it.

### Criterion 7 — protected fields remain blank

The lane-E verifier's protected-field check is `profile.protectedFields ∩
profile.bindings = ∅`. That is circular — a field that *ought* to be protected
but is absent from `protectedFields` passes. This lane therefore re-derived the
answer from the rendered bytes: each fixture was rendered with
`renderHardFormPacket`, and the flattened output read back with
`pdftotext -layout` and against the field census geometry.

Correct behaviour confirmed:

* Signature blocks are blank everywhere. CR-180 page 3 renders
  `Date:` … `(TYPE OR PRINT NAME)` … `(SIGNATURE OF PETITIONER OR ATTORNEY)`
  with nothing in them; `SigDate[0]` / `SigName[0]` are protected.
* CR-409's clerk-assigned hearing block renders blank
  (`2 Notice of Court Hearing (clerk fills out section below)` → `Date:` `Time:`
  `Dept.:` `Room:` all empty).
* CR-181 and CR-410: every grant/deny box and both judicial signature blocks
  render blank. A proposed order can never pre-decide relief. This is the
  strongest part of lane E's design.
* Negative fixtures invent nothing: `populated: []` and every binding reported
  under `skippedNoFact` for all four families.

Defects:

* **F2-12 (CR-180) — a false factual assertion, and a wrong-column fill.**
  1. `bindings[…]` maps `CR-180[0].Page3[0].LI7[0].DateField1[0]` ← `petitionDate`.
     Item 7 of CR-180 is *Deferred entry of judgment (Pen. Code, § 1203.43)*.
     The rendered canonical fixture — whose own note reads "Ordinary participant
     on the PC 1203.4a misdemeanor route" — prints:
     `7. Deferred entry of judgment (Pen. Code, § 1203.43) Petitioner performed
     satisfactorily during the period in which deferred entry of judgment was
     granted. The criminal charge(s) were dismissed under former Penal Code
     section 1000.3 on (date): 08/12/2026`.
     The packet asserts a § 1000.3 dismissal that did not happen, on a route
     where item 7 does not apply, on a petition signed under penalty of
     perjury. The boundary fixture does the same.
  2. `bindings[…]` maps `…ConvTable[0].Row1[0].Offense1[0]` ←
     `offense1Description`. The census geometry shows the conviction table has
     exactly five columns at x = 54 / 120 / 183 / 332 / 454, and `Offense1[0]`
     is the fifth (x = 453.6), i.e. *"Eligible for reduction to infraction
     under Penal Code, § 17(d)(2) (yes or no)"*. The rendered row reads
     `PC | 484(a) | Misdemeanor | (blank) | Petty theft`, and the boundary
     fixture prints `Shoplift — see Attachment A` into the same yes/no column —
     referencing an "Attachment A" the family does not produce. The LiveCycle
     field *name* is misleading; the *position* is not.
* **F2-13 (CR-181) — the proposed order renders with no caption.**
  `CR-181[0].Page1[0].Caption[0].TitlePartyName[0].Party1[0]` (defendant name)
  and both page-2 header fields are classified `protected`, and the page-1
  `…HeaderSub[0].CaseNumber[0].CaseNumber2[0]` is `unbound_available`. The
  canonical fixture supplies `caseNumber: "CR-2019-0114872"` and it is silently
  unused. The rendered order therefore reads
  `PEOPLE OF THE STATE OF CALIFORNIA v. DEFENDANT:` (blank) and
  `CASE NUMBER:` (blank), on both pages. The family's own handoff says "The
  participant completes the caption and nothing else" — the rendered bytes
  contradict it.
* **F2-14 (CR-409) — duplicated official captions.** `courtName` and `caseName`
  are bound with full strings into fields that sit *underneath* pre-printed
  official text. The source PDF prints `Superior Court of California, County of`
  at line 15 and `People of the State of California v.` at line 33; the render
  produces `Superior Court of California, County of / Superior Court of
  California, County of Los Angeles` and `People of the State of California v. /
  People v. Rivera`. The fields want the county and the defendant only.
* **F2-15 (CR-410) — the fill is inverted.** The three fields lane E binds are
  the only three the official form labels for the clerk: the render shows
  `Clerk fills in the name and street address of the court.` above the bound
  `CourtInfo_ft`, and `Clerk fills in the number and name of the case.` above
  the bound `CaseNumber` and `TCCaseName_ft`. Meanwhile the petitioner's own
  item-1 identity block — `T186[0..2]` (Last / First / Middle, y = 686) and
  `FillText38/37` (mailing address, y = 633–656) — is classified `protected` and
  renders blank. CR-410 also inherits F2-14's caption duplication. So the order
  ships with the participant unidentified and the clerk's blocks pre-filled.

### Criterion 8 — no internal blocker language reaches participants

**Satisfied for both lanes.** B's verifier walks every participant string in
every entry against fifteen prohibited internal phrases (`registry gap`,
`crosswalk`, `lane b`, `missing_from_compiled_runtime`, `nonterminal`,
`track id`, `coming soon`, …) and reported **no** hits among its 20 failures;
the only participant-language failures were the two outcome-promise hits noted
below. `docs/record-clearing/deferrals/lane-b-source-evidence-gaps.md` is
explicitly internal ("This is an internal record, not participant copy" …
"Nothing in this record reaches a participant") and correctly contains no
participant-visible copy.

A scan of every lane-E participant string against lane names, tier vocabulary,
TODO markers, "pending review", sha256s, fixture and XFA/AcroForm jargon
returned **clean** for all eight strings across DE and ME. Advisory only, not a
defect: ME's `whatTheParticipantIsTold` says "LegalEase **is holding** packet
preparation until the Judicial Branch form is confirmed current" and its next
step asks the participant to "confirm whether a post-PL 2025 c. 513 revision has
issued" — that is lane E's own source-acquisition task phrased as a
participant instruction. It reads as ordinary English rather than build
vocabulary, so it does not fail this criterion.

* **F2-16 (CA `ca-auto-conviction`) — lane B's own guardrail fires.** The
  copy-guardrail scan is the check that fails, from the opposite direction:
  `handoff.en` contains "…rather than a question about whether **you qualify**"
  and `handoff.es` "…y no una cuestión sobre si **usted califica**". Both are
  literal members of `PROHIBITED_PROMISES`. In substance the sentence promises
  the opposite of eligibility, so this reads as an over-broad guard — but as
  committed, the lane's acceptance contract does not pass, and a review cannot
  approve a treatment whose own gate rejects it.

## 6. Coverage and scope gaps (not per-treatment defects)

* **F2-17** — 18 of the 24 B1-partition tracks are assigned to lane B and
  terminalized nowhere (67 across all lane-B partitions). The lane's own gap
  register classifies `ND:nd-dna-profile-removal-routing` in **Group 1 —
  direct authority, buildable** ("Mechanism fully stated; only the container id
  differs") and nine more in **Group 2 — buildable with a stated limitation**,
  yet only `AK:ak-sej` of Group 2 shipped. Those buildable-now tracks are
  neither built nor blocked; they are simply absent, and there is no treatment
  for F2 to review.
* **F2-18** — the ledger requires `production_packet` for
  `T-E-DE-production-packet` and `T-E-ME-production-packet`; lane E delivers
  `exact_supported_deferral`. Unlike B's verifier, which compares
  `entry.treatment` to `assigned.tracks.get(trackId)`, neither lane-E verifier
  reads `data/rcap-ledger/track-terminalization.json`, so the downgrade is
  unreconciled against the ledger. The downgrades are themselves well
  justified; the reconciliation is what is missing.
* **F2-19** — "Checkout stays prohibited" for the four CA Tier-1 families
  exists only as prose in `handoff.md`. The DE/ME deferrals carry a
  machine-checked `checkoutProhibited: true`; the packet families carry no
  equivalent field and no verifier asserts one.

## 7. Recorded as unverified

* Official source bytes for CR-180 / CR-181 / CR-409 / CR-410 / CR-289 / CR-106
  (`presentInClone: false`; `STATES/` bundle absent, 0 tracked files). Only
  derivative hashes could be checked. Lane E's claim that each derivative's
  terminal field set is identical to its official source **cannot** be
  confirmed here.
* `private/Nationwide Record Clearing/`, named as `sourceDependency` by every
  lane-B packet, is gitignored and absent. All lane-B authority was checked
  against the compiled profiles instead — which is what B's own gap register
  says it did.
* The Maine adopted legal design markdown and Delaware Master Library Edition 1
  manifest, both cited by sha256, are not in the repository.
* Whether a Spanish surface exists for lane-E participant strings (F2-07).
* Visual fidelity of glyph placement inside widget rectangles — this lane read
  extracted text and field geometry, not rendered pixels. That remains F's gate.

## 8. Blockers

None for this review: both target SHAs resolved, both lanes' verifiers were
runnable (lane E needed `pdf-lib@1.17.1` installed, as `node_modules` is not
vendored), and every treatment in scope was reachable and readable.

The reviewable blockers *found* are F2-05 (Delaware's venue and statute lack any
committed carrier), F2-06 (Maine's repeal premise lacks any committed carrier),
and F2-10/F2-11 (the CA service component is unauthored and unpoliced).

Machine-readable findings, one object per treatment, with owner and acceptance
condition for every `correction_required`: `F2-DISPOSITIONS.json`.
