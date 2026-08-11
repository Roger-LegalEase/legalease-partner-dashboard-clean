# Defect Report SF-DEFECT-001 — flaky substitution assert in the worker-delivery verifier

- Reporting lane: session-f-staging-rehearsal (evidence lane; no patch made)
- Owner: Terminal A (both implicated paths are captain-owned)
- Date: 2026-08-10
- Base observed: `origin/claude/rcap-final-sprint-integration` @ `abbc48a19f79a817a4e14d4350297a9a753dbc05`
- Severity: blocks a trustworthy REQUIRED_GITHUB_CHECKS_GREEN for the execution gate (nondeterministic red in the launch test chain); no security guarantee is actually violated.

## Exact failure

`scripts/verify-rcap-render-worker-delivery.mjs` line 400:

```
assert(replaced.ok === false && replaced.code === "artifact_corrupt",
  "storage: another job's valid PDF at this path fails closed");
```

Output on failure: `verify-rcap-render-worker-delivery FAILED` / ` - storage: another job's valid PDF at this path fails closed`.

Three consecutive runs on the identical tree in this session: **pass, FAIL, FAIL.**

## Mechanism (empirically confirmed)

The verifier's `packetFor(packetId)` fixture gives every packet identical
visible content ("Test Participant", Hinds, same body text); `packet.id` is
never printed into the document. The only byte variance between two rendered
artifacts is pdf-lib's embedded creation/modification timestamp, which has
one-second granularity. Probe run in this session with the real renderer
(`src/lib/rcap/documents/packet-document-renderer.ts` via the repo TS loader):

- two renders in the same second, different packetIds → **identical bytes**
  (sha256 prefix `0d985b99c6c3c71e` for both);
- same packet re-rendered 1.5 s later → distinct bytes (`5304c1a9cb8a0692`).

When jobA and jobD happen to render within the same wall-clock second, jobD's
"perfectly valid PDF" is bit-for-bit jobA's artifact. The substituted bytes
therefore hash-match `jobA.output_sha256`, pass the `%PDF-` check, and
`authorizePacketDownload` serves them — correctly, because the participant
receives exactly the bytes jobA validated. The "fails closed" expectation is
unsatisfiable in that timing window; the assert is a latent flake.

Why it surfaced now: the only change to this verifier since the green base
`e078a87f` is `+db.applyFile(...phase-51-rcap-consumer-payment-gate.sql)`,
which shifts setup timing. Phase 51's SQL content is not implicated.
`src/lib/rcap/render/packet-delivery.ts` is unchanged and its raw-hash re-read
verification is intact (missing-object and corrupted-object cases still fail
closed in every run).

## Implicated owned paths (not patched by this lane)

1. `scripts/verify-rcap-render-worker-delivery.mjs` — fixture renders
   content-identical packets, so the substitution case depends on incidental
   timestamp divergence. Giving each packet distinct content (e.g., folding
   the packetId into `generatedPlainText`) makes the case deterministic.
2. `src/lib/rcap/documents/packet-document-renderer.ts` — embedded wall-clock
   timestamps make renders non-reproducible; pinning pdf-lib's
   creation/modification dates (e.g., to a value derived from job identity)
   is a product-level decision about reproducible artifacts that belongs to
   the captain, and would also force the fixture fix above, since byte-equal
   artifacts then become the norm for equal content.

## Rerun condition

This lane reruns the failed case only after Terminal A supplies a corrected
green SHA. All other cases in the chain are unaffected and were verified on
`abbc48a1`: packet-delivery-db PASS, render-worker-runtime PASS,
packet-delivery-e2e PASS, mutation-authority PASS, runtime-credential-boundary
PASS (50 assertions), render-job-contract PASS, packet-render-jobs PASS.

## Staging-matrix consequence

Matrix case SF-DEN-13 (wrong-job valid PDF) now records the byte-identity
caveat: with real, distinct participant content the case is meaningful; for
byte-identical artifacts the raw-hash guarantee is vacuously satisfied and the
serve is byte-equivalent, not a cross-artifact exposure.

## Status update — 2026-08-11, tip 5f0ec4df

Reproduced twice more in this session on `5f0ec4df843ad2fc7e6753169c94b91cacf5b2cf`
(same assert, "storage: another job's valid PDF at this path fails closed"):
once inside `npm run rcap:verify-packet-delivery` and once standalone. The
captain's readiness record notes it "did not reproduce in 3 consecutive runs
here, which is not the same as proven determinate" — this session's
reproductions confirm the flake is still live and timing-dependent, not fixed.
All other verifiers at this tip pass (payment audit Gate 21/21 | Reach 5/5 |
Mutations 3/3; phase-52 32/32 + 12/12; phase-53 24/24 + 8/8;
migration-apply-evidence 32/32; delivery-db, worker-runtime, e2e,
mutation-authority, credential-boundary all green).
