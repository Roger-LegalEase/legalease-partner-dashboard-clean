# Lane C — Oregon official-PDF Grade-A candidate

Branch `claude/grade-a-68h-lane-c`, from Wave 2 worker base
`a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef`.

Oregon is **`CANDIDATE_ONLY`**. Nothing in this lane authorizes checkout,
sponsorship, credit consumption, generation, dispatch, artifact attachment,
Briefcase Ready, private download, or commercial launch status. All three Oregon
routes are `INCOMPLETE` at the Grade-A authority and all nine commercial
admission points refuse them.

## Identity gate

| Required | Observed | |
|---|---|---|
| `origin` → `Roger-LegalEase/legalease-partner-dashboard-clean` | `https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean` | pass |
| `a25eec4c…` exists | exists | pass |
| `a25eec4c…` is an ancestor of `origin/claude/legalease-sprint-captain-utucnw` | it *is* that branch's tip | pass |
| Starting checkout clean | clean | pass |
| Lane branch created from `a25eec4c…` | `claude/grade-a-68h-lane-c` created from it exactly | pass |

Not `ENVIRONMENT MISROUTED`. Production untouched.

**Source identity could not be verified from installed bytes.** The gate requires
archive `a26e3ca7…` across 51 jurisdictions / 499 files / 329 PDFs. No `private/`
tree exists in this container; a filesystem-wide search found no corpus, no
`source-corpus-environment.txt` and no archive with that digest, and the corpus
was not reacquired. Two things follow, both recorded rather than worked around:

- The Oregon digests below were **not re-hashed from bytes on this run**. They
  rest on two independent committed records that agree exactly, which is this
  repository's settled rule for judging a source. Every lane record says so.
- The committed `local-source-corpus-index.json` describes archive `c0937fa7…`
  across **45** states — a different edition from the one the gate names, though
  the 499-file and 329-PDF counts agree. Lane C did not choose between them. The
  Oregon digest is identical either way, which is why this work stands.

## What the authority says about Oregon

`evaluateFulfillmentAuthority` returns `INCOMPLETE` for all three routes, naming
seven missing proofs each. Four kinds:

| Proof | Whose | Status |
|---|---|---|
| `official_sources` — content hash | **Lane C** | **produced** |
| `official_sources` — `heldInRepository` | nobody's, today | **blocked — see finding 1** |
| `visual_review` — page-by-page | **Lane C** | **produced** |
| `output_legal_approval` | a named legal reviewer | outstanding |
| `final_verification` | a verifier | outstanding |

## The two proofs Lane C produced

### Official source identity

Both forms every Oregon route binds:

| Form | SHA-256 | Bytes | Pages | Structure | Role |
|---|---|---:|---:|---|---|
| `OR-OJD-ADULT-SET-ASIDE-PACKET` | `b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071` | 256,978 | 5 | flat | primary filing |
| `OR-OSP-SET-ASIDE-CCH` | `a523a9ffc3eb0cc35d89e1c81df8eafcd703cf1ffdb4237a0106b72e1e793ac6` | 229,147 | 2 | AcroForm (22 fields) | record gathering |

The packet is the Oregon Judicial Department's *Criminal Set-Aside (Adult Cases)*
packet, revision January 2026. Pages 1–3 are the court's instructions and the
waiting-period table; pages 4–5 are the Motion to Set Aside and Seal and the
Declaration of Eligibility the participant signs and files.

Each digest is corroborated by two committed records — the corpus index and the
family's own source record — written by different generators from different
inputs. Neither derives from the other, so their agreement is evidence rather
than an echo.

### Page-by-page visual review

7 of 7 pages across both bound forms, read from each finalized artifact's own
bytes rather than from a report:

| Form | Pages | Strategy | Written | Refused | Values confirmed drawn | Shrunk | Refused unfittable | Clipped |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| `OR-OJD-ADULT-SET-ASIDE-PACKET` | 5 | flat overlay | 7 | 69 | 7 | 2 | 3 | 0 |
| `OR-OSP-SET-ASIDE-CCH` | 2 | AcroForm fill | 3 | 19 | 3 | 1 | 0 | 0 |

Every page retained, every finalized artifact flattened to zero form fields,
active-content scan clean on both, and each artifact's hash recomputed and
matched against its family's report. On the packet, zero values are written on
the court's instruction pages; the citing agency, the SID number, both signature
lines and the prosecutor's address are refused by protected category, as are all
28 charge-table cells and every checkbox.

The review is deterministic: `--check` re-derives it and finds no drift, which is
what makes its evidence hash `faa790d2b3b2…` a binding rather than a timestamp.

It does **not** stand in for the independent human visual review the candidate
families' production holds still require, and it says so in its own record.

## Two defects in the shared authority — captain patch requests

Both block Oregon. Neither is Oregon's to fix, and neither is in a path this lane
may edit. Both are **measured** by `verify-rcap-oregon-grade-a-lane-c.mjs` rather
than asserted, and each check is written to go red when the defect is fixed, so
the finding retires itself instead of outliving its subject.

### Finding 1 — `heldInRepository` is unsatisfiable, so no route can ever be Grade A

`collectMissingProof` requires `source.heldInRepository === true` for every bound
official source. Measured on this base:

- **0** of the **424** official forms named across the launch graph's **260**
  rows is marked held.
- **0** of the **7** official sources in the Grade-A registry is marked held.
- `provenCommercialRoutes()` returns **`[]`** for the entire product.

The one thing that would set it true — committing the court's PDF — is forbidden
by `.gitignore` (`private/`) and by the standing rule against committing source
bytes, which this repository already settled: *judge a source by its identity,
not by whether Git holds the bytes.* So the requirement can only be satisfied by
breaking another rule, and until it changes **no route in this product can reach
`COMPLETE_PACKET_PROVEN`**, however much proof it accumulates.

This is not an Oregon problem. It is the reason the entire Grade-A programme
currently has zero commercially eligible routes.

**Requested:** replace the "held" test with a content-identity test — a source is
proven when its digest is corroborated by the authorized corpus record, whether
or not Git holds the bytes. Lane C's `source-identity.json` is the shape that
satisfies such a test today.

### Finding 2 — the "content hash" is the hash of the identifier, not the document

When `held` is true the generator writes:

```js
sha256: held ? sha256(`${sourceId}`) : ""
```

That is the digest of the identifier **string**. For the Oregon packet it would
write `8507452ded2a2becfa7e85a04f3712652a69c6597147eace8fe2580acdc5d596`; the
document is `b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071`.
A content proof that hashes the name proves nothing about the content, and
`collectStaleness` compares that value — so a court could reissue a form under
the same identifier and nothing would read as stale.

The empty string in the unheld branch is honest, as its comment says. The held
branch is not.

**Requested:** derive the digest from the corpus record for that source id.

## Captain admission checklist

Ordered. Steps 1 and 2 are the findings above; nothing after them can complete
until they are resolved.

1. **Resolve finding 1** in `src/lib/rcap/fulfillment/grade-a-authority.ts`.
   Until then every step below leaves Oregon `INCOMPLETE` regardless.
2. **Resolve finding 2** in `scripts/generate-rcap-grade-a-fulfillment-authority.mjs`.
3. **Patch the three Oregon records** in
   `data/rcap-grade-a/fulfillment-authority-registry.json` with the exact values in
   `data/rcap-lane-c/oregon/authority-patch-request.json`:
   - `officialSources[OR-OJD-ADULT-SET-ASIDE-PACKET].sha256 = b22cc346…`
   - `officialSources[OR-OSP-SET-ASIDE-CCH].sha256 = a523a9ff…`
   - `visualReview = { state: "passed", pagesReviewed: 7, pageCount: 7, evidenceSha256: "faa790d2b3b2…", reviewedBy: "lane-c/claude-opus-5/oregon-official-pdf-grade-a", reviewedAt: "2026-08-29" }`
4. **Move the observation snapshot with it.**
   `data/rcap-grade-a/fulfillment-observation-snapshot.json` must gain the same
   `officialSourceSha256ById` entries and the same `visualReviewEvidenceSha256`.
   Patching the record alone converts a missing proof into a **staleness**
   failure — `collectStaleness` compares the two — so both sides move together or
   neither does.
5. **Obtain output-level legal approval.** A named reviewer decides the completed
   Oregon output and records an approved-output scope hash. Not a lane's to grant.
6. **Bind a final verification.** A verifier binds the current inputs and records
   a bound-inputs hash. Not a lane's to grant.
7. **Re-run** `node scripts/verify-rcap-oregon-grade-a-lane-c.mjs`. Its two
   `*-RESOLVED` checks will go red once findings 1 and 2 are fixed — that is the
   signal to retire those measurements, not a regression.
8. **Wire the three Oregon commands into the `test` chain** in `package.json`,
   which this lane may not edit. Append, do not replace — the chain has grown
   since this branch was cut:
   ```
   && node scripts/generate-rcap-oregon-grade-a-authority-proofs.mjs --check
   && node scripts/verify-rcap-oregon-grade-a-lane-c.mjs
   && node scripts/verify-rcap-oregon-grade-a-lane-c.mjs --mutations
   ```
   The family gate `verify-rcap-oregon-official-pdf-grade-a.mjs` (and its
   `--mutations`) is worth the same treatment. Until this is done the Oregon
   gates are green but unenforced: nothing runs them on anyone else's change.

Also outstanding, and separate from commercial authority: the independent human
visual review and the candidate families' own production holds. Admitting the
Oregon families into `data/rcap-all50/overlays/production/` additionally requires
a new PDF implementation freeze naming them and per-family
`artifact-provenance.json` hashed from installed bytes — which needs the corpus.

## Owned paths

- `data/rcap-all50/overlays/lane-c-candidates/oregon/**` — four Oregon families
- `data/rcap-lane-c/oregon/**` — source identity, visual review, patch request
- `docs/rcap/grade-a/oregon/**` — this document
- `scripts/verify-rcap-oregon-grade-a-lane-c.mjs`, `scripts/verify-rcap-oregon-official-pdf-grade-a.mjs`, `scripts/generate-rcap-oregon-grade-a-authority-proofs.mjs`

Untouched: `data/rcap-all50/overlays/production/**`, the implementation freeze,
the Grade-A registry and observation snapshot, the launch graph, global
registries and projections, migrations, and package files.

## Tests

| Command | Result |
|---|---|
| `node scripts/verify-rcap-oregon-grade-a-lane-c.mjs` | green |
| `node scripts/verify-rcap-oregon-grade-a-lane-c.mjs --mutations` | 32/32 caught |
| `node scripts/verify-rcap-oregon-official-pdf-grade-a.mjs` | green |
| `node scripts/verify-rcap-oregon-official-pdf-grade-a.mjs --mutations` | 63/63 caught |
| `node scripts/generate-rcap-oregon-grade-a-authority-proofs.mjs --check` | no drift |
| `npm run typecheck`, `eslint` | clean |

## Companion Oregon families

Carried with the two bound forms, because the jurisdiction summary describes four
and splitting them would leave it describing families that are not present. Both
are implemented and pending independent review, and neither is bound to a route's
official-source set:

- `or-ojd-cla-request-for-set-aside-criminal-record-check` — `OR-OJD-CLA-SET-ASIDE-CHECK`, `REV-2022-01`, 2 pages, AcroForm
- `or-ojd-motion-and-declaration-to-set-aside-marijuana-conviction` — `OR-OJD-MJ-PCR`, `REV-2023-07`, 2 pages, flat

---

# Captain resolution (integration)

Integrated from `claude/grade-a-68h-lane-c`, commits `2bb0b35f`, `3e0d5817`,
`b3a58e6e`, onto the captain branch. The branch was not merged whole.

## What was and was not transplanted

The lane's Oregon overlay artifacts and `verify-rcap-oregon-official-pdf-grade-a.mjs`
were compared byte for byte against what the captain branch already carried and
are identical, so nothing was re-applied for them. What integrated is the lane's
new evidence and tooling: the source identity record, the page-by-page visual
review, the authority patch request, this document, the proof generator and
`verify-rcap-oregon-grade-a-lane-c.mjs`.

## Both findings are fixed, and the detectors are now regression tests

The lane wrote its two findings as measurements that go red once the defect is
fixed, so that a finding retires itself rather than outliving its subject. Both
are fixed, so preserving them as written would have asserted that the product is
still broken.

They are restated as the rules the corrected behaviour must keep obeying:

- **E1** now asserts the authority does *not* mention `heldInRepository`, that it
  compares an expected digest against an installed one, that `private/` is still
  git-ignored, and that no registry record carries `heldInRepository`.
- **E2** now asserts the generator does *not* derive a digest from the identifier
  string, that no bound digest equals `sha256(sourceId)`, and that every bound
  source's expected and installed digests agree.
- **D-proven** was a runtime restatement of E1. It now asserts the rule that
  actually matters: no route may be commercially proven while its output legal
  approval or final verification is outstanding.

## The patch request was satisfied by derivation, not by hand

The lane asked the captain to patch three Oregon records and move the observation
snapshot with them. Hand-patching a generated artifact would have made it stale
against its own generator on the next run. Instead the generator was taught to
read the lane's committed visual-review evidence, and the source digests now come
from the governed source registry. Both sides of the comparison move together
because one derivation writes both, which is the property the lane's warning was
protecting.

The lane's evidence is accepted only where it is complete: the visual review is
taken when `pagesReviewed` equals `pageCount` and the count is non-zero, and its
`evidenceSha256` is recomputed from the committed file rather than copied from
the patch request.

## Oregon remains candidate-only

Closing the source dimension and the visual-review dimension moved Oregon from
three missing proofs to two. The two that remain are output-level legal approval
and a bound final verification, and neither is a lane's or a captain's to grant.

- `COMPLETE_PACKET_PROVEN`: 0
- commercially eligible: 0
- `admitCommercial` denies Oregon at all nine admission points
- artifacts stay under `overlays/lane-c-candidates/`, not `overlays/production/`
- no commercial status and no production-overlay membership follow from this
  integration

The lane's own honesty about what it did not establish is preserved: no
rasteriser was available, so the page-by-page review was performed against each
artifact's own bytes and the blank-vs-filled contact sheets are committed for a
human reviewer.
