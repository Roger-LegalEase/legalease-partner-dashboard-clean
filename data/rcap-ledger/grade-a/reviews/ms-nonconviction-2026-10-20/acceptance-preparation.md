# MS full-es approval succession — pre-built evidence (Section 26)

**Nothing here is an approval.** Every approval field in the draft record reads `PENDING_OWNER_APPROVAL`; no committed record was touched. Prepared by Acceptance Claude, 2026-10-19, so that Roger's one line ("Approve MS full-es f80520fb… (renderer Spanish fix e27b6b0ba)") lets the lead integrate in one step.

## What was reproduced (my own run, not the lead's dump)

Disposable worktree `/tmp/legalease-ms-succession` = batch10 `15f73f82373d943c15148c76d20ed1e6cc4de1ce` + `e27b6b0ba` applied with `git cherry-pick --no-commit` (3 lines in `src/lib/rcap/supplemental/guide-renderer.ts`, nothing else). `assemble-ms-artifacts.mjs` runs the production assembly path exactly as `scripts/verify-ms-paid-packet-proof.mjs` does (same fixture, synthetic charged-conduct control, matter, options), twice per artifact.

| Artifact | sha256 | bytes | vs v3 approval |
|---|---|---|---|
| full-en | `9bbe447c8c3eb5ac3967bdbe308a1f19e07a711b21d9b1106f9bcef92dbb4dfd` | 69769 | identical |
| **full-es** | `f80520fbb425435b19b1e5d97d3214c56d2c469fcc7c660035258d0d57926fcd` | 71729 (was 71652) | **moved** from `28b5dfcb…` |
| court-only | `18a452b04d6c26e04cbc26c9f1e0b3d7139de3dcc63f0f9dd8871f9c4e847dfe` | 20758 | identical |

All three deterministic (second assembly byte-identical). `artifacts/assembly-report.json` has the run record. The full-es digest equals the lead's dump and the approval request.

## Rasters

`rasters/full-es/page-01.png … page-17.png`: `pdftoppm -r 150 -png`, 1275x1650 RGB, the same tool and settings as the committed review (`rasterReview.rasterizer`). Method validated first: rastering the **approved** full-es the same way reproduces the committed `pageSha256` list 17/17 (and the committed PNG blobs match it 17/17). New page hashes: `rasters/full-es.pageSha256.json`. Versus the approved rasters only `page-01.png` and `page-06.png` differ; 15 pages are byte-identical. Text diff (`text-diff-approved-vs-new.txt`): exactly the three Spanish meaning restorations (contents rows 03 and 04 on page 1; the Fees subtitle on page 6). Visual check of the two pages: no clipping, no overlap; the page-6 paragraph break at the foot is identical in the approved page.

## Files to integrate (lead), in the formats the loader and verifier check

1. `artifacts/ms-nonconviction-successor-review-full-es.pdf` → `data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf` (full-en and court-only unchanged).
2. `rasters/full-es/page-*.png` → `data/rcap-ledger/grade-a/reviews/ms-nonconviction-successor-review-rasters/full-es/` (replace the 17 committed PNGs; names unchanged).
3. `ms-nonconviction-successor-review.evidence.SUCCESSOR-DRAFT.json` → `data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json` (whole-file successor: full-es `artifacts[]` and `rasterReview.artifacts[]` entries updated, `changedFromPriorApproval` now names v3 and the renderer fix; everything else byte-for-byte as committed). `review-evidence-entry.full-es.json` holds just the two entries if a targeted edit is preferred.
4. `2026-10-19-ms-nonconv-paid-consumer-successor-v4.DRAFT.json` → `data/record-clearing/legal-decisions/2026-10-19-ms-nonconv-paid-consumer-successor-v4.json` after filling, **only on Roger's line**: `status` → `APPROVED_EXACT_PAID_CONSUMER_SUCCESSOR`, `decidedAt`, `ownerInstruction` (Roger's words verbatim), `approvedAtCommit`, `preservedEvidence[successor_review_evidence].sha256` (digest of the committed file from step 3), `currentCommercialArtifactApproval.sha256`; delete the `_draft` key. `supersedes.sha256` is the git-derived digest of the committed v3 bytes at 15f73f823 (`f8cce1368da9d339…`); `movedArtifacts` states full-es moved, full-en and court-only not.
5. `src/lib/rcap/fulfillment/paid-consumer-successor.ts`: the loader pins the v3 path, `schemaVersion`, `decisionId`, `decidedAt`, and the supersedes chain (v3 → v2 → first). It needs the v4 path/ids and a fourth link (v4 supersedes v3) with the same `priorDecisionMutated:false` byte check; the `movedArtifacts` validation already handles a single moved artifact.
6. `scripts/verify-ms-paid-packet-proof.mjs --write` after 1–5 produces the new proof file (`scripts/lib/ms-paid-packet-proof.mjs` constants move: current → predecessor). Expect `current production assembly changed the approved full-es bytes` to pass only once 1 and 4 are in.
7. Other committed records that pin `28b5dfcb…` and need the same owner line or a derived regeneration (not edited here): `data/rcap-grade-a/legal-decisions/OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_2026-09-20.json` (owner record; v3 says it "cannot drift" from the decision), `CURRENT_COMMERCIAL_ARTIFACT_VISUAL_REVIEW_2026-09-20.json` (raster review entry, pageSha256 list), `data/rcap-grade-a/fulfillment-authority-registry.json` and `data/rcap-grade-a/worker-static-authority.json` (`approvedArtifactSha256.full-es` + artifact entry; generated), `deploy/rcap-render-worker/runtime-data-manifest.json` (sha + bytes 71652→71729), `data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json` (names the full-es digest). Historical proof files and the `question-contract-output-reproduction-*` series also contain the old digest as history and must stay as they are.
8. Question-contract hop for `guide-renderer.ts` at the current chain (the lead's item from the approval request).

## Not done here, on purpose
No approval written anywhere; no commit; no record in the repository changed; no proof file written; no push. The lead's `/tmp/lead-renderer-es` was not used; the reproduction is independent.

## Addendum 04:0x UTC — pushed batch10 head

Re-assembled at the pushed head `4d38862c0f0210a337f81e0125f9f8d142fa9558` + e27b6b0ba (one commit after 15f73f823, none of the renderer/assembly/guide/spec/fixture inputs touched): all three digests identical to the 15f73f823 run (`artifacts-at-4d38862c0/vs-15f73f823.txt`). The prep is valid for integration on 4d38862c0.
