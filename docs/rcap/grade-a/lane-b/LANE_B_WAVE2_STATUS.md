# Lane B wave 2 — Grade-A fulfillment hardening · status and evidence

**Branch:** `claude/grade-a-68h-lane-b` · **Base:** `a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef`
**Production touched:** no

## Identity gate

| Requirement | Result |
|---|---|
| `origin` resolves to `Roger-LegalEase/legalease-partner-dashboard-clean` | pass |
| `a25eec4c…` exists | pass |
| `a25eec4c…` is an ancestor of `origin/claude/legalease-sprint-captain-utucnw` | pass |
| starting checkout clean | pass |
| lane branch created from `a25eec4c…` | pass — `git checkout -b claude/grade-a-68h-lane-b a25eec4c…` |

`private/` is absent from this checkout. That blocks nothing architectural here
and is the reason two source identities in the worked v2 record stay unheld; it
is recorded rather than worked around.

## What the wave changed

The core was already integrated at the base and was not recreated. Two things
were missing from it, and they are different in kind.

**Fileability is about the route.** The v1 authority proved provenance and never
asked whether the packet could be filed. `grade-a-packet-proof.ts` binds the nine
specification dimensions the packet specifications already carry, plus
custom-pleading drafting authority and a filing-format artifact with its own
hash.

**Ownership and verification are about the participant.** A route-level record
cannot express `PRODUCT_CONTRACT` correction 5 — a payment survives a material
answer change and generation authority does not — because the route did not
change, the matter did. `grade-a-request-context.ts` carries the stage-8
snapshot, matter ownership, entitlement idempotency and private storage.

### Versioned rather than quietly tightened

v1 records keep v1 evaluation semantics, so the generated projection does not
change under a report someone is reading and `generate --check` stays green. But
admission refuses every v1 record outright, whatever its state: being evaluable
is not being sellable. **Every record in the shipped registry is v1, so the
authority currently admits nothing at any point.** Re-opening a door is the
record migration in the captain patch request, which is a decision with an owner
rather than a side effect of deploying a file.

## Deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | One fail-closed public admission API, all points | `admitCommercial()` in `grade-a-admission.ts`; ten points, `repeat_download` added |
| 2 | Denial for all seven record conditions | seven distinct denial codes, each separately asserted |
| 3 | No untrusted input may assert anything | derived vocabulary + three-key identity allowlist |
| 4 | Mutation coverage, every dimension × every point | `verify-rcap-grade-a-fulfillment-hardening.mjs` |
| 5 | Consumer/sponsored parity proof | every proof break and participant condition run twice |
| 6 | Lane F call-site contract | `LANE_F_CALL_SITE_CONTRACT.md` |
| 7 | DB proposal reviewed and corrected | `../migration-proposals/lane-b/`, applied to real Postgres |
| 8 | Captain patch request | `CAPTAIN_PATCH_REQUEST.md` |
| 9 | Focused tests, typecheck, lint | below |

## Evidence

```
$ node scripts/verify-rcap-grade-a-fulfillment-hardening.mjs
Grade-A fulfillment hardening: 36 checks passed.
  proof x admission-point matrix: 600 admissions exercised, none granted
  participant conditions: 19   admission points: 10

$ node scripts/verify-rcap-grade-a-fulfillment-hardening.mjs --mutations
Mutations: 16 deliberate breakages, all caught.

$ node scripts/verify-rcap-grade-a-fulfillment-authority.mjs          # 65 checks
$ node scripts/verify-rcap-grade-a-fulfillment-authority.mjs --mutations  # 20 caught
$ node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check    # green, no drift
$ node scripts/generate-rcap-grade-a-lane-b-v2-candidate.mjs --check      # green
$ PGHOST=… node scripts/verify-rcap-grade-a-fulfillment-db-proposal.mjs   # applies + 13 assertion groups
$ npx tsc --noEmit                                                        # clean
$ npx eslint src/lib/rcap/fulfillment scripts/*grade-a*                   # clean
```

### The gates found real defects in the code they were written against

The proof × admission-point matrix found three:

1. A v1 record with every v1 proof reported disposition `COMPLETE_PACKET_PROVEN`
   while admission refused it. The state was right; the disposition was a lie,
   and "proven" is what an operator reads on a status page.
2. The schema floor ran before the authority's own verdict, so an unreadable
   schema was reported as an old schema rather than as unsupported.
3. The derived request vocabulary missed `contextDenials`, added to the decision
   shape without being added to the exemplar it derives from.

Running the SQL rather than reading it found a fourth:
`rcap_grade_a_authority_state` referenced the completeness function before it was
defined, which Postgres rejects at creation time.

### The gates were themselves tampered with

| Tamper | Caught |
|---|---|
| delete the participant-context check from admission | yes — 3 failures |
| let sponsored skip the entitlement check | yes — parity failure |
| delete a packet dimension from the module's list | **no, at first** |
| drop the v1 admission floor in SQL | yes |
| make the SQL gap count return zero | yes |

The third is the one worth recording. The gate built its matrix from the module's
own dimension list, so deleting a dimension deleted its own tests and the matrix
shrank from 600 to 580 while still reporting green. The nine dimensions are now
named in the gate itself and each is proven independently load-bearing. Re-run
after the fix: caught.

## The worked v2 record

`data/rcap-lane-b/v2-candidate-record.json` — not a registry entry, and its own
document says so. `ND:first-offense-possession-sealing` is the only registry
route with a formal packet specification, and that specification covers all nine
dimensions.

Bound from real evidence: all nine dimensions cited section by section; the
filing artifact as `pdf / 97d288c0… / 7 pages` (committed, deterministic across
processes); the owner-approved packet-set manifest as both a held source and the
custom-pleading drafting authority.

Still `INCOMPLETE`, on four gaps that no record-writing closes:

1. `ND-profile:section:90-95` and `ND-profile:corpus-unit:38` are
   `asserted_by_ingestion`, not held — `private/` is absent. Lane C/D reverify.
2. Output legal approval `not_performed` — counsel's.
3. Visual review `not_performed_no_rasteriser_in_this_runtime` — page images.
4. Final verification unbound.

One judgement call is flagged for captain review rather than buried: treating the
owner-approved packet-set manifest as authority to *draft* a composed pleading.
That is not counsel approving the *output*, which stays pending separately. If
the captain disagrees, the route stays closed on one more gap.

## Shared files

None changed. `package.json`, `package-lock.json`,
`data/rcap-verifier-dispositions.json`, `data/rcap-grade-a/**`,
`data/rcap-ledger/**`, `supabase/migrations/**`, `docs/rcap/grade-a/captain/**`,
consumer payment routes, sponsorship lifecycle, packet generation and downloads
are all untouched. Everything needing one is in `CAPTAIN_PATCH_REQUEST.md`.

**Consequence to be explicit about:** the two new verifiers are not reachable by
`npm test` on this branch, because wiring them requires `package.json`. They pass
standalone and are reproducible by the commands above.
