# Lane C independent review — shard 0

Independent technical review of one deterministic third of the imported lane-C
candidates: controlled pleadings and composed routes.

| | |
|---|---|
| Review base | `origin/claude/rcap-final-sprint-integration` @ `e314fb4a24966dc132dc3a7d3f6b61577e7c4309` |
| Ancestry | `9fcad842` confirmed in ancestry (`git merge-base --is-ancestor`) |
| Review branch | `claude/rcap-review-c-shard-0` |
| Machine-readable artifact | `data/rcap-all50/review-artifacts/c-review-shard-0.json` |
| Window | `2026-08-12-w2` |

**Independence.** The lane-C author is a different session and has no authority
over these findings. No prior verifier pass, handoff note or self-report was
adopted as a conclusion. Every check below was reproduced directly against the
working tree, including the checks the lane's own tooling already claims to run.

---

## Outcome

| Disposition | Count |
|---|---:|
| `technical_approved` | 10 |
| `correction_required` | 4 |
| `held_on_source_or_design` | 2 |
| **Total** | **16** |

Nine findings raised. Six mutations injected across the four required
categories; **three were caught and three were not**. Two of the three
uncaught mutations are anti-invention gaps and the third is the composed-route
promotion gate.

---

## Candidate selection (auditable)

Source: `data/rcap-all50/review-artifacts/f2-independent-technical-review.json`,
filtered to `lane == "C"` and `status == "pending_independent_review"`.

- Lane-C pending candidates: **46** (30 controlled pleadings + 16 composed
  routes, matching the import record in `f20971d`).
- Rule: sort by `jobId` ascending, select where `sha256(jobId) mod 3 == 0`.
- Shard distribution: remainder 0 → **16**, remainder 1 → 10, remainder 2 → 20.
  16 + 10 + 20 = 46, so the three shards partition the candidate set with no
  overlap and no omission.
- All 46 `jobId`s are unique; **every candidate below appears exactly once in
  this shard**.

### The 16 selected candidates

| # | jobId | Track | Family | Partition | Disposition |
|--:|---|---|---|---|---|
| 1 | `F2-C-arizona-az_wrongful_arrest_clearance` | `az_wrongful_arrest_clearance` | pleading | C2 | technical_approved |
| 2 | `F2-C-california-ca-diversion-seal` | `ca-diversion-seal` | composed | C1 | **held_on_source_or_design** |
| 3 | `F2-C-connecticut-ct-nolle-auto` | `ct-nolle-auto` | composed | C1 | **held_on_source_or_design** |
| 4 | `F2-C-georgia-ga-fo-active-pre2026` | `ga-fo-active-pre2026` | pleading | C2 | technical_approved |
| 5 | `F2-C-georgia-ga-fo-discharged-pre2026` | `ga-fo-discharged-pre2026` | pleading | C2 | technical_approved |
| 6 | `F2-C-georgia-ga-fugitive-j5` | `ga-fugitive-j5` | pleading | C2 | technical_approved |
| 7 | `F2-C-georgia-ga-vacated-j2` | `ga-vacated-j2` | pleading | C2 | technical_approved |
| 8 | `F2-C-indiana-in_supplemental_order` | `in_supplemental_order` | pleading | C1 | **correction_required** |
| 9 | `F2-C-kentucky-ky_criminal_record_segregation` | `ky_criminal_record_segregation` | composed | C1 | **correction_required** |
| 10 | `F2-C-kentucky-ky_void_seal_marijuana_synthetic_salvia` | `ky_void_seal_marijuana_synthetic_salvia` | pleading | C1 | **correction_required** |
| 11 | `F2-C-nevada-nv_seal_multi` | `nv_seal_multi` | pleading | C3 strict | technical_approved |
| 12 | `F2-C-north-carolina-nc_auto_146_a4_agency_followup` | `nc_auto_146_a4_agency_followup` | correspondence | C2 | technical_approved |
| 13 | `F2-C-north-dakota-nd-seal-misdemeanor-conviction` | `nd-seal-misdemeanor-conviction` | pleading | C3 non-strict | technical_approved |
| 14 | `F2-C-ohio-oh_2953_32_sealing` | `oh_2953_32_sealing` | pleading | C3 non-strict | technical_approved |
| 15 | `F2-C-oklahoma-ok_identity_theft` | `ok_identity_theft` | pleading | C3 non-strict | technical_approved |
| 16 | `F2-C-texas-tx_exp_specialty_court` | `tx_exp_specialty_court` | pleading | C1 | **correction_required** |

---

## The verifier-coverage map nobody had drawn

The single most important structural fact found in this review: **the three
lane-C partition verifiers do not enforce the same anti-invention contract.**
This map was derived by reading the three scripts, not from any lane claim.

| | C1 | C2 | C3 |
|---|---|---|---|
| Jurisdictions | AR CA CT IA IL IN KY MT TX VT WV | GA TN DC HI AZ MA ME NC | NV ND SC ID KS WA NE OH OK VA WI |
| Wired into `npm test` | **yes** | no | no |
| Invention scanner | **ABSENT** | present, complete | present, but gated |
| Gate | — | — | `STRICT_NEGATIVE_SLUGS` **excludes ND, OH, OK** (`:870`) |
| Shard-0 candidates | 6 | 6 | 4 |

The partition with the widest reach — C1, the only one in the test chain — has
the weakest content gate. Ten of this shard's sixteen candidates sit in
partitions where invented content is not scanned at all.

---

## The two leads

### (a) `runPleadingQa` is blind to invented content — **CONFIRMED**

`src/lib/record-clearing/pleading-qa.ts` checks exactly seven things: the
rendered flag, the Grade E block, the `verified_replacement` lifecycle block,
caller-supplied prohibited relief terms, the required footer, `[seal]`/`[logo]`
markers, and a soft warning if the relief term is missing. It is structurally
blind to invented court findings, fabricated fees, asserted prosecutor
positions, completed service, and populated protected fields.

The qualification that matters: **that blindness is not by itself a shipped
defect**, because C2 and the C3 strict path layer real detectors on top. The
defect is where no layer exists. Proven by mutation rather than inferred:

> Injecting an invented court finding, a fabricated `$157.00` filing fee and a
> fabricated prosecutor consent into the Indiana canonical fixture, then
> regenerating through the lane's own `--render` mode, produces
> `verify-rcap-terminalize-c1 passed` — while the shipped `canonical.txt`
> asserts all three at lines 45–47.

The same injection on Ohio, regenerated through `--write`, leaves C3 at its 12
baseline failures with **nothing** raised for Ohio.

Protected-field enforcement, by contrast, is present in all three verifiers and
caught its mutation everywhere it was tried — including on non-strict Ohio.

### (b) field-level `null` reaches rendered output — **CONFIRMED, already shipped, and wider than described**

`resolvePresentation` returns `config.presentation ?? PA_DEFAULT_PRESENTATION`,
so a `presentation` object that is *present* but carries deliberately-null
fields is used as-is and its nulls are interpolated as the literal string
`null`. Lane C's own finding-2 discipline **requires** those nulls (source
silent ⇒ `null` beside a `<field>NullReason`), so the discipline and the
renderer are in direct conflict.

Four shard-0 candidates ship literal `null` in committed rendered output:

| Artifact | `null` lines | Unresolved tokens |
|---|--:|---|
| `pleadings/indiana/in_supplemental_order/rendered/canonical.txt` | 4 | `{courtName}` `{originalExpungementCounty}` `{originalExpungementCauseNumber}` |
| `pleadings/kentucky/ky_void_seal_marijuana_synthetic_salvia/rendered/canonical.txt` | 4 | `{county}` `{courtLevel}` `{caseNumber}` |
| `pleadings/texas/tx_exp_specialty_court/rendered/canonical.txt` | 5 | `{county}` `{petitionerName}` |
| `composed-routes/kentucky/.../ky_criminal_record_segregation-primary-filing-1/rendered/canonical.txt` | 5 | `{county}` `{court}` `{caseNumberLine}` |

The lead understates the radius twice. The leak is **not confined to the
caption** — it reaches the party-identity paragraph, the eligibility-basis
sentence, the verification clause and the proposed-order header. And it is
**not confined to `presentation`** — `eligibilityData.eligibilityBasisLabel` is
nullable on the same path.

Worked examples, all committed:

```
STATE OF INDIANA,
    null,                                    <- sovereignRole

4. null is the State of Indiana.             <- sovereignRole again

I, JAMIE Q. SAMPLE, null that the statements made in this petition
are true and correct ...                     <- verificationVerb
```

The Indiana config's own `verificationVerbNullReason` says *"No oath,
affirmation or verification is stated for this petition"* — the clause was
never supposed to render. It renders, with `null` as the verb.

Texas is the worst instance. Its committed caption is:

```
IN THE DISTRICT COURT OF {county} COUNTY, TEXAS
EX PARTE {petitionerName}
COUNTY OF EXAMPLE

null,
    null,
```

and the body renders `4. null is null.`, the proposed-order header renders
`null v. JAMIE Q. SAMPLE`. As committed, the caption of this filing document is
not a valid caption.

No occurrence of `undefined` or `NaN` was found anywhere in shard-0 rendered
output. The other nine pleadings are clean.

**Verified benign, checked and cleared:** the `{{double-brace}}` fields in
`ca-diversion-seal-process-guidance-1/process-guidance.md` are *not* this
defect. That component carries a `fixtures/` directory and C1 deliberately
exempts fixture-backed templates from the merge-field assertion.

---

## Mutation results

| # | Mutation | Verifier | Caught? |
|--:|---|---|---|
| 1 | Missing composed component | C1 | ✅ yes |
| 2 | Fabricated pleading statement (C1) | C1 | ❌ **no** |
| 3 | Populated protected field (C1) | C1 | ✅ yes |
| 4 | Populated protected field (C3 non-strict) | C3 | ✅ yes |
| 5 | Fabricated pleading statement (C3 non-strict) | C3 | ❌ **no** |
| 6 | False approval of a nonterminal route | terminalization generator | ❌ **no** |

Mutation 2 deserves care: before regeneration C1 *does* fail — but only with
`rendered/canonical.txt drifted from a fresh render`. That is a staleness
signal, not a content judgement. Run the lane's own regeneration step, which is
the normal authoring workflow, and the fabrication is baked in and green.

Mutation 6 is the one with the sharpest consequence. Appending a
`technical_approved` closure for `CT:ct-nolle-auto` — a route two of whose three
units are undrafted and source-blocked — promoted it to `terminal: true` and
moved `tracksTerminal` from 278 to 279, with no structural objection. The
import record for `f20971d` states that composed routes record their
`official_form_dependency` units *"so the blocked-component rule is enforceable
at F2 closure: a blocked component cannot disappear inside a composed route."*
**That rule is not enforced at promotion time.** It is enforced only by
reviewer judgement.

Every mutation was reverted immediately, verified with `git status --porcelain`
returning empty, and the ledger confirmed current before this document was
written.

---

## Composed routes

A composed route with one nonterminal unit cannot be approved. All three routes
enumerate their units against the pinned registry, map each to a component, and
keep blocked components visible rather than dropping them — the omission
discipline is genuinely good throughout. The difference is terminality.

**`ky_criminal_record_segregation` — terminal, but correction_required.**
The strongest route of the three. All three units resolve to real delivered
components (a rendered pleading, an agency request letter, routing guidance);
filing/participant separation is explicit and correct — exactly one court
document, on the court-application branch only, no certificate of service
because KRS 17.142 provides for no notice; provenance resolves and fingerprints
match. It fails only on the renderer defect in its primary filing's rendered
output. The route design needs no change.

**`ca-diversion-seal` — nonterminal, held.** Unit 2 is the operative filing that
actually obtains the relief, and it is `drafted: false` with the condition
*"Only in counties where LegalEase has collected and approved the current local
petition and order set. **No county qualifies yet.**"* Both named forms are
`named_but_not_collected_or_approved`; neither is in the CA state-pack
inventory; one has no form number, no URL and no sha256. Unit 3 (FW-001 fee
waiver) is likewise blocked on lane-D acquisition. The route is honest about all
of it and the participant journey correctly says these forms are obtained by the
participant and not drafted by LegalEase — but a route with a blocked primary
filing is not terminal. Held rather than correction_required because the blocker
is genuine external source acquisition, not lane error.

**`ct-nolle-auto` — nonterminal, held.** Two of three units are undrafted. Unit 2
(the C.G.S. § 54-142a(c)(2) motion): *"no settled filing vehicle … This is a
hold, not a classification."* Unit 3 (the pre-1 April 1972 petition): *"Drafting
a petition would be invention from end to end"* and *"Everything about this
petition beyond its existence is unstated, including which older courts the
statute lists."* Only unit 1, the automatic-erasure guidance branch, is
complete — and it requires no filing.

The lane's handling here is commendable and should be said plainly: the pre-1972
possibility appears in **no** registry `units[]` entry and **no** `packetSet`
component. The lane synthesized a unit for it specifically so the possibility
would be recorded rather than dropped. That is the blocked-component rule
working exactly as intended. It still does not make the route terminal.

---

## Findings

| ID | Sev | Class | Owner |
|---|---|---|---|
| C-S0-F1 | high | C1 has no invention scanner | Terminal C (C1) + Terminal A |
| C-S0-F2 | high | C3 invention scan excludes ND/OH/OK | Terminal C (C3) |
| C-S0-F3 | high | Promotion gate accepts a false approval of a nonterminal route | Terminal A |
| C-S0-F4 | high | Literal `null` in four committed renders | Terminal A (renderer) + Terminal C |
| C-S0-F5 | medium | Unresolved single-brace caption tokens | Terminal A (renderer) + Terminal C |
| C-S0-F6 | medium | CT component provenance fingerprint stale | Terminal C (C1) |
| C-S0-F7 | medium | CA route provenance paths point into a foreign worktree | Terminal C (C1) |
| C-S0-F8 | low | AZ/NC negative fixtures prove only a Grade E flip | Terminal C (C2) |
| C-S0-F9 | low | Pinned registry commit absent ⇒ authority check silently skipped | Terminal A |

Full defect text, exact acceptance conditions, source branch/commit, job,
track, family, file, fixture and component for each finding are in
`data/rcap-all50/review-artifacts/c-review-shard-0.json`.

Three deserve a note here.

**C-S0-F6.** Both CT component `dependency.json` files record
`profileSha256 = 47a86bd5…` for `CT-connecticut.json`, whose actual hash is
`f6fd7cc7…` — which is what the *same route's* `route.json` records. One route,
two fingerprints for one file. C1 misses it because `verifyComposedTrack` never
fingerprint-checks component provenance at all; C2 catches exactly this class
elsewhere (`ma-bmc-multi`).

**C-S0-F7.** The CA route's `profilePath` and both `statePackFiles` are absolute
paths into `/home/user/wt-c1-pleadings/…` and resolve to nothing here. The
recorded sha256 does match the repo file, so content is verifiable, but the
paths are not portable and leak a foreign worktree location into a committed
artifact — which also cuts against the worktree-separation rule in `AGENTS.md`.
The identical value in a *pleading* track would have failed C1's
`provenance.profilePath does not resolve` assertion; composed routes get no
provenance check whatsoever.

**C-S0-F9.** The pinned registry commit `3b6f4c10…` is not in a fresh clone. The
failure modes are asymmetric and the silent one is the dangerous one: the
terminalization generator dies with a raw Node stack, but **C2 and C3 degrade
silently** — `pinned registry commit not available locally; authority
cross-check skipped` is a warning, and every track still reports `ok`. The
skipped check is the *first* `mustVerify` item for every controlled pleading in
this shard: that the pleading cites the operative authority the registry
records. A reviewer on a fresh clone sees green on a check that never ran.

Confirmed reproducible in both directions during this review. The commit is
reachable on `origin/feat/record-clearing-production-integration`; after
fetching it, the generator reports the ledger current at 278/497 and C2 reports
every shard-0 track `ok` with the skip warnings gone. **The authority
cross-check for this shard therefore did run, and passed** — but only because
this reviewer noticed and fetched the pin.

---

## Test results as run

| Command | Result |
|---|---|
| `verify-rcap-terminalize-c1.mjs` | **PASS** — 11 pleading tracks, 16 composed, 64 components (5 blocked), 18 canonical renders |
| `verify-rcap-terminalize-c2.mjs` | FAIL, 14 failures — 13 are un-imported DC/TN dirs; 1 real (`ma-bmc-multi` fingerprint, **not this shard**) |
| `verify-rcap-terminalize-c3.mjs` | FAIL, 12 failures — all un-imported KS/WA/NE/VA/WI dirs |
| `generate-rcap-track-terminalization.mjs --check` | Hard-fails on an unfetched pin; **PASS** after fetch — 278/497 |
| `generate-rcap-review-manifests.mjs --check` | **PASS** — F2 179 jobs, F3 106 jobs |
| Independent re-render harness | All 12 court-pleading tracks reproduce their committed `canonical.txt` **byte-identically** |

**No shard-0 candidate failed any lane verifier.** The C2 and C3 red status is
the recorded, expected "red by design until the partition completes" state, and
every one of their failures is a directory for a track not imported in this
window. That is precisely why the defects in this report matter: they are the
ones the lane's own tooling reports green on.

One correction to this reviewer's own work, recorded for audit: the first
harness pass forced `nc_auto_146_a4_agency_followup` through the pleading
renderer and produced a spurious `WHEREFORE` QA failure. That track is
`documentForm: correspondence` and is built by C2's letter composer. The result
was traced to the harness and discarded; the disposition rests on the committed
artifact, read in full, and on the correct composer path.

---

## Scope

Wrote only `data/rcap-all50/review-artifacts/c-review-shard-0.json` and this
file. No implementation file was modified. No `git add -A`, `-A` or `.`.

The 30 lane-C candidates in shards 1 and 2 were not reviewed. One real defect
visible in the shared C2 run belongs to another shard and is referred rather
than adjudicated here: `ma-bmc-multi` `provenance.fingerprint` does not match
`sha256` of `src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json`.
