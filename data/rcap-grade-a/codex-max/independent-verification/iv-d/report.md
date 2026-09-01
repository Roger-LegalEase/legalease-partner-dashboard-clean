# IV-D — Independent verification report

## Result

All three assigned Vermont families were processed exactly once and independently received `PASS_COMPLETE_INDEPENDENT`:

| Family | Canonical SHA-256 | Boundary SHA-256 | Pages | Components | Verdict |
| --- | --- | --- | ---: | --- | --- |
| `vt_seal_misdemeanor-set` | `c37d27bad040121f3e677e81911745c6ea41f12fa1b8d7e986b74b9585d98a87` | `f98d432c416ce087ee267333638df32c56cc4c68a7e6395f50d91465067bb269` | 6 | 200-00130, 200-00132, 600-00228 | `PASS_COMPLETE_INDEPENDENT` |
| `vt_seal_18_to_21-set` | `4884aef91eec3e1215e0db1b5ff9ebd69f02b8f415594a81eb824c4388af19ae` | `1b8e24ec49bffc3d6967bed810bd5f18f69f9d994358a5024eff536ce7fb5502` | 6 | 200-00130, 200-00132, 600-00228 | `PASS_COMPLETE_INDEPENDENT` |
| `vt_seal_dui-set` | `e69f731e1e15799bd8e02afa0d328338bc71333e595b08b056a072b5b89112d7` | `ee94b81bca45e1e437325a0f78286505fa4a1aab0383df611d2982fc4a203ac6` | 6 | 200-00130, 200-00132, 600-00228 | `PASS_COMPLETE_INDEPENDENT` |

Each queue row is currently `RASTER_PASS` and carries a successful workflow job, an exact rendered-commit binding, canonical and boundary digest bindings, a receipt artifact ID/digest, and the successful canary dependency. Repository-byte digest recomputation matched all six pinned values. Canonical and boundary manifests each contain the same six pages and three-form component set.

The completeness verifier independently returned `PASS_COMPLETE` for every family with all nine defect counters at zero. The independent content read covered participant and filing instructions; fee/waiver; service/notice; destination; timing; self-help boundary; required-before-filing facts; repeating rows; route options; protected and later-completion fields; proposed orders; and source/decision receipts. Detailed evidence and conclusions are in `rows.json`.

## Collision gate

The prior VF02, VF11, and VF12 verification claims are released, `ACTIVE_ASSIGNMENTS.json` contains no current matching family assignment, and no assigned packet is actively being rewritten. No family acquired an active Claude verification owner, so all three were clear to verify.

## Raster receipt artifacts

Artifact retrieval was attempted without printing any credential. No repository-authorized GitHub token was present in this task environment, so neither receipt JSON nor the workflow PNG set could be downloaded and directly inspected. This access limitation is recorded separately and is not treated as a packet defect or as a `BLOCKED_ARTIFACT` primary verdict.

## Safety

No packet, overlay, builder, source receipt, legal decision, claim, canonical queue, launch authority, commercial route, or Production file was modified. No repair payload was required.
