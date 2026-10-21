# Chat C first repair batch: Florida phone placement

Date: 2026-09-07. Status: **SOURCE FIX COMMITTED; FULL REBUILD BLOCKED**.

Family: `fl-early-juvenile-set` only. Branch: `chatgpt/parallel-build-20260907`.
Target: `chatgpt/launch-recovery-20260906`. Frozen assignment baseline:
`03fbc59d262cf7da322a0c4f1d76f0d511f6b297`.
Repair commit: `9dc00c937c327f1e6db3ba0771c2c31c2bea70e8`.

## Literal defect and implementation

Read the Florida entry in
`data/rcap-grade-a/packet-factory-24h/vf04/repair-assignments.json`, blob
`aa6d373f61814fa2eeb02ee71f7f9a12f6a35c7c`, before editing. VF-B reported the
page-one whole-phone write at x=359 overprinting the official closing
parenthesis ending at x=384.22. Both fixture values had the same collision.
The finding expressly permits moving the whole phone to x >= 384.5.

`scripts/build-census-v1-fl-early-juvenile-set.mjs` now draws the whole phone
at x=386, y=573, width=67. Its 8.5-point font, both existing phone values,
page-two phone placement, all other fields, instructions, official pages,
and protected signatures are unchanged. No shared imported module changed.
The builder's three shared imports were inspected; a repository-wide
reverse-import search was not completed in the partial local mirror.

Original builder blob: `e38fba84ce762624e7aff89a57ee89d289940919`.
Repaired builder blob: `6ece59f8b7bcf6217568cc6affd841ef783b4f6b`.
Repaired builder SHA-256:
`eaa04769217859211ee3686e609cde0a142cb0a31dfb53a9fe6f8f32201a4cb3`.

## Official source and executed checks

The committed acquisition receipt identifies Drive file
`1oyQ5_MEMY5hW0xfnxn3oiqHbnLgXZeoq`. Its downloaded FDLE40-028 source was
verified as 22,449 bytes and SHA-256
`d9417ea382c9c1ea170153b5aa25e63230799de836b8aefca0ee80a47e23f6eb`.
This verifies held-byte identity, not current legal or source-freshness approval.
No official source binary was committed.

These commands actually ran against the repaired builder in the local mirror:

```sh
node --check scripts/build-census-v1-fl-early-juvenile-set.mjs
OUT=data/rcap-grade-a/chat-parallel-2026-09-07/build/fl-early-juvenile-set
node scripts/rcap-packet-recovery/chat3/test-fl-phone-placement.mjs > "$OUT/placement-tests.json"
PF20_FL_EARLY_JUVENILE_SOURCE=/mnt/data/chat3/source/fdle.pdf \
  node scripts/rcap-packet-recovery/chat3/test-fl-source-input.mjs > "$OUT/source-tests.json"
python scripts/rcap-packet-recovery/chat3/test-fl-phone-pdf.py \
  --source /mnt/data/chat3/source/fdle.pdf \
  --placement-json "$OUT/placement-tests.json" --out /mnt/data/chat3/phone-probes
```

All exited zero. Node: v22.16.0. Python: 3.13.5. Probe dependencies:
PyMuPDF 1.26.7, pypdf 5.9.0, reportlab 4.4.9.

| Check | Actual scope | Result |
| --- | --- | --- |
| Builder syntax | Complete source parsed, no rendering | PASS |
| Placement | Actual builder fixture constants and drawing function/calls, font-metric test double | 4 positive cases; 12 in-memory mutated-write controls caught |
| Source gate | Actual sourceBytes function and real input files | Exact source accepted; missing, truncated and same-length-corrupt files rejected; source unchanged |
| PDF geometry | Exact official five-page source with only two phone writes, via pypdf/ReportLab | Both diagnostic probes passed; 10 mutated-PDF controls caught |

The PDF controls catch the old overlap, missing page-one phone despite a
page-two phone, cell-edge overflow, a shrunken font and an omitted official
page. Probe serialization matched across two builds of each probe. **This is
not two builds of the complete packet or execution of its pdf-lib renderer.**

Both corrected page-one phone-region images and the reproduced old collision
were visually inspected. The complete post-edit canonical/boundary packets
were not generated or visually reviewed. The images establish scoped author
geometry QA only, not independent review or a central raster receipt.

## Branch coverage and hashes

The current host emits canonical and boundary fixture branches only. The
phone tests cover page one and page two for both existing fixture fact sets.
No conditional output was added, removed or rebuilt. Full canonical,
boundary and affected-conditional output coverage remains unestablished.

Diagnostic-only PDF SHA-256 values, NOT participant-output hashes:

- Canonical phone probe: `37ea08171c5c664fe0e182fa0609b6eca735a4b949c3d08cd650f22c7b51b0ef`.
- Boundary phone probe: `23137666dff36bcb5cb4ebf1b69c58d7969433be1618c290b53bdb168fc1ce89`.

New complete canonical PDF hash: **not available; not rebuilt**.
New complete boundary PDF hash: **not available; not rebuilt**.
The probes are not placed in the authoritative family fixture directory.

## Changed paths and remaining work

The batch changes only the family-specific builder, three tests under
`scripts/rcap-packet-recovery/chat3/`, three measured JSON reports under
`data/rcap-grade-a/chat-parallel-2026-09-07/build/fl-early-juvenile-set/`, and
this document. No family report, queue, global source/route registry,
application, workflow, runtime, authorization or payment file was changed.

The local environment has no full checkout or pdf-lib and cannot reach
GitHub/npm directly. Connected GitHub read/write and Drive downloads work.
The exact source is available, but the complete builder's dependencies and
four repository authority inputs are absent. A source-aware build runner or
an execution bundle was requested from original Chat A in PR #224 comment
5570905465. No workaround workflow was created or changed by Chat C.

The real pending command is
`node scripts/build-census-v1-fl-early-juvenile-set.mjs` with
`PF20_FL_EARLY_JUVENILE_SOURCE` pointing to the verified held source. It must
run twice without `--check`, compare all generated family bytes, retain
complete output hashes, and check every changed page and unaffected content.
`--check` is only a preflight and is not counted as a full rebuild.

The existing builder's whole-document text search can mask a missing value
on one page when it exists on another. The new diagnostic test detects that
phone failure, but the builder-wide text proof was not changed in this patch.
That limitation remains and must not be reported as repaired.

After actual rebuilding, Chat A must incorporate fresh raster coverage and
Chat B must perform the independent current-output reread. Historical raster
receipts may not be applied to changed PDFs. No author QA here grants a
terminal status, legal approval, source-freshness approval or live authority.

Complete families closed in this batch: **0**. The other 121 assigned
families, including `il-seal-edu-set`, `co_motion_seal_nonconviction-set`,
`al-felony-dwop-set` and `al-felony-nonconviction-90-set`, were not implemented
in this batch. The full 122-row assignment has not been extracted locally.
