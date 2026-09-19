# Sweep closeout — 2026-09-19

The full `npm test` surface, run step by step from a clean tree, as the new
denominator. **The old "154-script" inventory is superseded and must not be
reused.**

## 1. Final result

| | |
|---|---|
| Steps | **276**, all 276 accounted for |
| Distinct scripts | **259**, all accounted for |
| **Pass** | **258** |
| **Fail** | **18** |

Every step was run in its own process with a 900 s ceiling; none timed out.

**259, not 253.** The runner truncates each command at 110 characters for the
log, so the single `node --test …` step displays only the first of its seven
files. That step **passed**; its six otherwise-invisible files —
`verify-finding-extraction`, `verify-raster-declared-enrolment`,
`verify-absent-is-not-zero`, `verify-source-acquisition-provenance`,
`verify-url-promotion-host-policy`, `verify-corpus-index-custody-attribution` —
are accounted for here rather than left as a silent gap.

**19 reds became 18.** Step 76, `security/test-clinic-mobile-accessibility`, was
**environmental, not a repository defect** — proven, not asserted. It died on
`⨯ Another next dev server is already running … PID 22171`. That process had
been up since **11:43**, hours before this sweep, and Next 16 refuses a second
dev server for the same project directory regardless of port — the test asks for
3217, not the 3191 the stale server had claimed and then stopped serving. After
clearing the zombie and its `.next/dev/lock` (`.next/` is git-ignored, so no
repository state was touched), the test **passes**: four viewports, axe-core
4.11.4 against wcag2a/2aa/21a/21aa/22a/22aa, keyboard-only operation, visible
focus, accessible names, target size, reflow, error association and status
announcement all verified.

## 2. Repository restoration

`git status --short` is **empty**. Three files were dirty at some point during
the run, each proved restored on its own evidence:

| File | Owner | Restored |
|---|---|---|
| `data/rcap-all50/terminalization-treatments/ak.json` | step 140, `verify-rcap-terminalization-treatments --mutations` | yes, independently |
| `src/lib/expungement-ai/checkout-reconciliation.ts` | step 172, `test-rcap-consumer-payment-http-mutations` | yes, independently |
| `src/lib/expungement-ai/consumer-render-request.ts` | step 172, next mutation in the same set | yes, independently |

None was committed. `ak.json`'s mutation was `checkoutSuppressed: true → false`
on a live commercial suppression control; `checkout-reconciliation.ts`'s was the
final-verification guard neutered to `if (false)`. Committing either would have
converted an adversarial probe into a production regression on a worker-image
input.

**A side proof worth keeping.** The `checkout-reconciliation.ts` mutation —
replacing `!session.metadata.verification_hash || session.metadata.verification_hash !== verification.hash`
with `if (false)` — was **detected**. Post-Checkout final-verification drift is
therefore enforced on the live consumer payment path by test, not merely visible
in source.

**One residue was not a mutation.** A **tracked** Python bytecode cache,
`scripts/rcap-packet-recovery/__pycache__/admit-completed-fixture-raster.cpython-311.pyc`,
was rewritten by step 261 (37997 → 37996 bytes). Restored from HEAD. It is
derived output that should not be tracked at all: every Python test run dirties
the tree through it. Noted, not fixed here.

## 3. Release gate, recomputed from the clean tree

```
comparedInputs : 30
changedPaths   : []
rebuildRequired: false
```

Computed only after the last mutation process exited and the tree was verified
clean.

## 4. Every red mapped

No failure is unexplained, and **none is a new defect**.

| # | Script | Hold |
|---|---|---|
| 20 | `verify-2026-09-18-route-kind-correction` | **61** |
| 121 | `verify-rcap-terminalize-c1` | **1/122** |
| 122 | `verify-rcap-terminalize-c2` | **1/122** |
| 123 | `verify-rcap-terminalize-c3` | **1/122** |
| 127 | `terminalize-c/verify-c-dependency-deferrals` | **5** |
| 134 | `generate-rcap-d-track-queue --check` | **12** |
| 144 | `verify-rcap-verifier-dispositions` | **22** residual |
| 151 | `generate-all51-coverage-reconciliation --check` | **61** downstream |
| 154 | `verify-legal-design-memo-import` | **32** |
| 155 | `generate-all51-legal-authority-finalization --check` | **33** |
| 158 | `generate-all51-current-legal-questions --check` | **36B** |
| 163 | `generate-closure-authority-contradictions --check` | **41**'s six |
| 164 | `generate-national-legal-decision-overlay --check` | **36B** |
| 165 | `verify-national-legal-decision-overlay` | **36B** |
| 192 | `generate-rcap-factory-v2-registry --check` | **61** downstream |
| 195 | `generate-rcap-launch-graph --check` | **61** downstream |
| 244 | `verify-rcap-answer-dependent-patches` | **1/122** |
| 254 | `verify-rcap-grade-a-fulfillment-hardening` | **132** |

Each mapping was verified against the hold's own record, not inferred:

- **20 → 61.** The route is `CA:dismissal-and-set-aside-without-probation-under-penal-code-1203-4a`
  — the only route of that name in the data; the log truncates it. The
  unauthorized blocker is `guidance_substitution`, which is verbatim line 5 of
  `ROUTE_TREATMENT_AUDIT_61_CA_1203_4A_2026-09-19.md`.
- **127 → 5.** Seven patches — 5, 7, 9, 10, 11, 12, 13 — report *"file bytes
  match no recorded state (baseSha256, appliedSha256 or priorAppliedSha256)"*.
  The 5A/5B record indexes the same patch numbering and covers ten, instructing
  that `appliedSha256` not be rolled forward on any of them.
- **144 → 22 residual.** The same two scripts the step-22 row names,
  `verify-rcap-census-v1-money-credit-gate` and
  `verify-rcap-problematic-pdf-remediation`, both red at the accepted baseline
  and both wired into `rcap-all50-handoff.yml`. The register is accurate; the
  two scripts need repair or an owner decision to unwire.
- **164/165 → 36B.** *"Q-058 is neither in the crosswalk nor recorded as out of
  the report's scope"* — the single-source out-of-scope mechanism.
- **254 → 132.** `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
  *"was unexpectedly admitted at consumer_checkout"*, which is the opening line
  of `COMMERCIAL_ADMISSION_AUDIT_132_2026-09-19.md`.

### 151, 192 and 195 share one root, measured

All three were regenerated, diffed and restored. Every diff is the **same** CA
1203.4a blocker propagating:

- **151** would add the `guidance_substitution` blocker row, `count: 1`, with the
  statement *"ca-1203-4a is served to the participant as a
  exact_supported_deferral whose own stated reason is our unfinished work"*.
- **192** would add `guidance_substitution` and re-pin
  `sellable-pathway-closure.json` `402b5a79…` → `cf55c9a3…`.
- **195** would re-pin the same file to the same new hash.

`sellable-pathway-closure.json` is **current** — its own generator passes — it
carries `guidance_substitution`, and it hashes to `cf55c9a3…`. So the closure is
right and three downstream records hold a pre-blocker pin of it.

**Not regenerated, deliberately.** `data/record-clearing/factory-v2-route-registry.json`
is one of the 30 worker-image inputs, so carrying the blocker forward would flip
`rebuildRequired` to true. That is a release-affecting change and it belongs with
the 61 decision, not inside a closeout. The three registries currently
under-report a blocking condition; correcting them is owed, and is step 61's to
release.

## 5. Where this leaves the repository

Repository verification is complete. Nothing red is unexplained, nothing red is
new, the tree is clean and the gate is recomputed. What remains is nine named
holds, none of them a debugging question:

| Hold | Needs |
|---|---|
| 5 | owner adjudication of the consolidated guard architecture (patch 11) |
| 12 | move the universal track→family bridge out of the lane-D analysis without losing VA connectivity |
| 1 / 122 | owner re-review of answers against successor compiled-profile bytes |
| 22 residual | repair two CI-wired red verifiers, or an owner decision to unwire |
| 32 | memo import/supersession governance decision |
| 33 | per-question resolution ownership/schema decision |
| 36B | per-question out-of-report-scope reason/source model |
| 41's six | owner adjudications; the generator itself is fixed |
| 61 | CA § 1203.4a human legal/output approval — and, downstream, 151/192/195 |
| 132B/C/D | CI raster acceptance for `c2938658…`, then binding repair, then regression proof |

Completion of this sweep is **not** a release declaration. The release remains
intentionally undeclared while these holds stand, which is the sanctioned
fail-closed state rather than an outstanding defect.
