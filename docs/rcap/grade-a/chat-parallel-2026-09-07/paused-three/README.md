# Three-family implementation while Captain is paused

Baseline: `c065d2485b97be9a9c53313551226b0b6c3c9cfb`.
Families: `la-987-set-aside-and-dismiss-set`, `ky_felony_expungement_after_pardon-set`, `nh_petition_vacated-set`.

This is author implementation and executed QA by ChatGPT, not an independent review, legal adoption or terminal promotion. No Captain/recovery/main ref, production or Codespace files were changed.

## Actual deliverables

The executable correction and its 19 passing tests are committed in `scripts/rcap-packet-recovery/paused-three/`. The original Chat6 Article986/987 transcription is reused unchanged at its reference path.

The full tested payload is in Drive file `1tM7feI77TdMvwrtDDw3O3EqZ_iu9drTE`:
`LegalEase_LA_KY_NH_Repairs_2026-09-08.zip`, 11,306,540 bytes,
SHA256 `aa6a6ac10e4d63cf30c13ce7694565f93f02f535374b982558938c91437e9d70`.
Upload/download readback and all 94 payload manifest entries were verified. The ZIP has 95 members including its manifest. No fonts or dependency tree are included.

The archive contains the six corrected active-path files, their exact preimages, an 80,067-byte six-file patch, full Louisiana candidate output, New Hampshire instruction-delta review copies, executed test scripts/results and page evidence. **These six active-path changes and bulk output bytes are not yet installed on this branch or Captain.** The committed repair script applies the four JSON changes; the builder changes are supplied as exact patches.

## Corrections

- Louisiana: binds the already-supplied statutory transcription, restores the full prescribed motion/rule/order, neutral identity and PLEASE SERVE rows, protects court/DA acts, removes internal metadata from filed pages and replaces nonexistent fee-waiver instructions with the narrow local inquiry. Two actual full CLI builds matched all 15 generated files; canonical and boundary are five pages each. A real footer-only blank page was found and removed during QA. These are unsigned synthetic drafts with remaining factual/local requirements, not filing-positive claims.
- Kentucky: removes only the false additional ordinary-offense-ground stop from the full-pardon track, its mirrored boundary list and the memo. Common timing, verification, document, fee-relief, opposition and ambiguity safeguards remain. This is a declarative-gate repair, not a newly built pardon packet or installed runtime proof.
- New Hampshire: removes court-use and invented notarization prerequisites and separates filing costs from later agency stages. The actual Markdown and embedded-PDF generators preserve the financial-statement service caveat and all ten self-help stops. Two 15-page review copies reuse all 18 official pages exactly; four other guide pages also remain pixel-identical. Only eight guide-page instances changed. No full-form NH CLI/source refill or complete family metadata replacement is claimed.

## Installation without reconstructing work

Read archive `RESULTS.json`, `README.md`, `MANIFEST.json` and `evidence/patch-replay.json`.
On all six matching preimages, the complete patch is:

```sh
git apply --check /path/to/patches/three-family-implementation.patch
git apply /path/to/patches/three-family-implementation.patch
```

Actual isolated check and application passed; all six result files matched tested bytes. Duplicate application refused. Do not apply it over already-applied JSON edits or unexpected newer files.

Alternatively, for the JSON changes while preserving unrelated current edits, inspect the exact target fields and run:

```sh
node scripts/rcap-packet-recovery/paused-three/repair-procedural-contracts.mjs --root .
node --test scripts/rcap-packet-recovery/paused-three/test-procedural-contracts.mjs
node scripts/rcap-packet-recovery/paused-three/repair-procedural-contracts.mjs --root . --apply
```

The JSON writer preflights all four documents, refuses ambiguous/missing targets and symlinks, binds the source digest and is idempotent. Do not also apply the combined patch afterward. Use only the two separately supplied builder patches for their unchanged preimages. Tests passed against exact original input and corrected input in a separate local replay. The 500 unrelated registry track objects are unchanged.

Use the existing corrected LA full builder or install the exact 15-file output inventory after confirming current counterparts. Do not copy the NH review PDFs into active family paths without reconciling whole-output/map/report identities. Do not blindly copy a complete archived registry over a newer file.

## Remaining integration and review

The six-file repair does not regenerate national projections or admit claims. Reconcile only the affected derived copies and source-receipt pins, preserving the 500 unrelated tracks. The historical registry-crosswalk projection remains pinned to a distinct integration ref; do not silently restamp its provenance or treat it as proven current runtime execution.

Independent current-output review, full supported route/fact/representation coverage, Louisiana local-cost/service inputs, and New Hampshire agency/financial-statement channel questions remain. KY downstream packet/invoking-path work is not established by structural gate tests. Apply the existing acceptance criteria without fabricated approvals or new broad legal holds.

The current published baseline remains 194/346. This repair batch's terminal delta is zero; production remains untouched. Full structured evidence is in `data/rcap-grade-a/chat-parallel-2026-09-07/paused-three/DELIVERY.json` and the exact archive.
