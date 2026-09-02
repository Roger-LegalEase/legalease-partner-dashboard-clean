# Lane J — release-blocker dependency order

What blocks what, what can run in parallel, and exactly what engineering may do
the moment each approval exists.

---

## The short version

**BLOCKER-4 and BLOCKER-5 are independent of each other and both are independent
of BLOCKER-1's preparation. BLOCKER-1's *execution* depends on both, because the
candidate source SHA cannot exist until their code changes have landed.**

```
  BLOCKER-4                       BLOCKER-5
  ─────────                       ─────────
  4a  mechanical re-pin ×10       5a  Roger authorizes the new proof hash
      no approval needed              (the only gate)
      captain applies                       │
             │                              ▼
             │                          5b  apply the 3-file edit
  4b  Lawrence answers                      │
      Q-J-01 … Q-J-04                       │
             │                              │
             ▼                              │
  4c  re-pin or retire the 8                │
             │                              │
             └──────────────┬───────────────┘
                            ▼
                  release integration head
                            │
                            ▼
              BLOCKER-1  candidate source SHA exists
                            │
                    1a  regenerate the fingerprint at that SHA
                            │
                    1b  Roger authorizes publication
                            │
                    1c  publish → accept
                            │
                    1d  Roger authorizes the Preview binding (separate)
```

Nothing in either direction between 4 and 5. They can be worked in parallel by
different people, and 4a needs no approval at all.

---

## BLOCKER-4 — terminalization provenance

### 4a — the ten DECISION_UNCHANGED re-pins

**Blocked by:** nothing. This is captain integration work under standing
permission.

**Immediately after the captain accepts the lane:**

- `git apply docs/rcap/grade-a/lane-j/patches/blocker-4-decision-unchanged-repin.patch`
- Run `node scripts/verify-rcap-terminalize-c1.mjs` and expect **8** drift
  failures, not 0.
- Commit, citing `BLOCKER-4-TERMINALIZATION-DECISION-MATRIX.md` §5 as the
  recorded decision for each hash moved.

**Explicitly not unlocked:** no route becomes commercially eligible. Every one
of the ten tracks stays denied by `assertPacketFulfillmentProven`, which fails
closed on a missing fulfillment record. `commerciallyEligible` is 0 before and
0 after.

### 4b — the four legal-owner questions

**Blocked by:** Lawrence. `BLOCKER-4-LEGAL-OWNER-QUESTIONS.md` — Q-J-01 (IL
§ 5.2(g)), Q-J-02 (KY 218A.275), Q-J-03 (KY 218A.276), Q-J-04 (WV § 17C-5-2b
vs § 61-11-25).

Independent of 4a. The four are independent of each other, except that Q-J-02
and Q-J-03 will likely be answered together and should still be answered
separately.

**Immediately after each answer:**

| Answer | Engineering may |
|---|---|
| Q-J-01 "no, § 5.2(g) is in scope" | re-pin `il-immediate-seal`: `e491c80d…391595` → `7999f618…4da914` |
| Q-J-01 "yes, out of scope" | move `il-immediate-seal` to the retirement handoff; do **not** re-pin |
| Q-J-02 "no" | re-pin `ky_void_seal_controlled_substance`: `441a89c6…94b438` → `4f27411f…fcf672` |
| Q-J-02 "yes" | retire it |
| Q-J-03 "no" | re-pin `ky_void_seal_marijuana_synthetic_salvia`: same pair |
| Q-J-03 "yes" | retire it |
| Q-J-04 "A, § 17C-5-2b(g) stands alone" | re-pin all five WV components: `ee9a8d38…7b13de` → `0d5885d3…b08b78` |
| Q-J-04 "B, routes through § 61-11-25" | retire all five; the participant belongs on the § 61-11-25 route with its own artifact-review gate |

**No answer unlocks commercial admission for anything.** A "no" or an "A"
restores a provenance hash. That is the whole effect.

### 4c — when `verify-rcap-terminalize-c1.mjs` goes green

Only after 4a **and** all four of 4b are dispositioned. Until then it is red and
must not be reported as a passing release gate.

---

## BLOCKER-5 — the pinned Mississippi proof

**Blocked by:** Roger Roman, and nothing else. One approval, one gate. Full text
in `BLOCKER-5-MISSISSIPPI-PROOF-AUTHORIZATION-PACKET.md` §11.

Independent of BLOCKER-4 in both directions: different files, different
subsystem, different owner.

**Immediately after that statement exists**, as one indivisible change:

1. Apply `patches/blocker-5-mississippi-proof-proposed.diff`.
2. Confirm the file hashes to `903b1b6e61605b7e732e1754086c4496968cd95e96648ca8dbbb48bb93954642`. If not, stop.
3. Update `runtimeReauthorizations[0].proofSha256` and `proofRevisions` in
   `data/expungement-ai/screening-parity-approved-deltas.json`.
4. Update `RUNTIME_REAUTHORIZATION_PROOF_SHA256` in
   `scripts/lib/screening-parity-deltas.mjs`.
5. Green on all three: `verify-screening-verification-finetune.mjs`,
   `test-expungement-parity-delta-mutations.mjs`,
   `verify-expungement-plain-language-values.mjs`.

**Explicitly not unlocked:** no Mississippi fulfillment record is added; no
legacy route gains checkout, sponsored entitlement, packet-credit consumption,
a render job or participant delivery; the ledger keeps its one ND record.

**Follow-up, not gated on this:** the route-separated ND happy path (packet §7b),
which belongs in `scripts/verify-rcap-grade-a-fulfillment-authority.mjs` rather
than in a projection-lifecycle proof.

---

## BLOCKER-1 — worker republication

**Preparation is unblocked and complete** — the runbook is written. **Execution
is blocked twice over.**

### Gate 1 — the candidate SHA must exist

The candidate is the release-integration head after BLOCKER-4 and BLOCKER-5 land.
Publishing earlier means republishing again; the evidence record already holds
five publications superseded for exactly that reason, and a sixth would be a
choice, not an accident.

Once it exists, before any authorization is requested:

- regenerate `data/rcap-staging-action.json` at that SHA, so
  `imageInputFingerprintBaseSha` equals it;
- `node scripts/generate-rcap-staging-action.mjs --check` green;
- `node scripts/verify-rcap-image-input-fingerprint.mjs` green;
- the rest of the runbook §3 list green;
- `--resolve` shows the source-SHA tag free.

**Flag for the captain, now rather than at dispatch time:**
`RELEASE_INTEGRATION_BRANCH` is pinned by literal name to
`sprint/20260825-full-product-captain` in
`.github/workflows/publish-rcap-render-worker.yml`. If this sprint's release
integrates elsewhere, that constant must be updated first, in the
captain-owned workflow, and not worked around.

### Gate 2 — Roger authorizes publication

Request text: runbook §11.

**Immediately after:** dispatch once; import the publication artifact; move
`441ee318…` / `sha256:67132df2…` into `supersededChain`; commit; run
`RCAP worker image acceptance` against the committed evidence; update
`releaseTruth`.

### Gate 3 — Roger authorizes the Preview binding

A **separate** authorization. Only then does `WORKER_IMAGE_DIGEST` move to the
new `sha256:…`.

**Never unlocked by any of the above:** deployment, worker claiming, migrations,
environment or secret changes, Stripe live-mode calls, feature flags, or any
change to Production.

---

## Critical path

```
Lawrence answers Q-J-01…Q-J-04   ─┐
                                  ├─► release integration head ─► publish ─► accept ─► Preview
Roger authorizes the MS proof    ─┘
```

The captain can start 4a today. The two approval asks are to different people
and should go out in parallel, not in sequence.

## The one thing that must not happen

None of the three blockers is resolved by making its verifier green.

- `verify-rcap-terminalize-c1.mjs` goes green when eighteen decisions have been
  recorded — not when eighteen hashes have been moved.
- `verify-screening-verification-finetune.mjs` goes green when the proof asserts
  the truth — not when a Mississippi fulfillment record is invented to satisfy
  the old assertion.
- `verify-rcap-image-input-fingerprint.mjs` goes green when an image has been
  rebuilt from the current source — not when the fingerprint is re-taken to
  match a stale image.

Each of those three shortcuts is available, cheap, and would leave the release
worse than red.
