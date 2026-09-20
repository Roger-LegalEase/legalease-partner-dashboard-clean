# Lane J — release-blocker decision and patch preparation

Sprint `legalease-68h-grade-a-2026-08-29`, shard `S-J-BLK`.
Base `148382ab2a2acbe673b6d35c8967f5a908342e60`.
Owned path: `docs/rcap/grade-a/lane-j/**`. Everything else was read-only
evidence.

**This lane decides and prepares. It applies nothing.** No hash was re-pinned,
no protected file was edited, no image was published, Production was not touched.

## Contents

| File | What it is |
|---|---|
| `BLOCKER-4-TERMINALIZATION-DECISION-MATRIX.md` | The 18-record matrix, the classification test, per-record reasoning |
| `blocker-4-decision-matrix.json` | The same matrix, machine-readable |
| `BLOCKER-4-MECHANICAL-PATCH-BUNDLE.md` | What the patch does, its verified effect, how to apply it |
| `patches/blocker-4-decision-unchanged-repin.patch` | Ten one-line re-pins. Generated, verified applicable, reverted |
| `BLOCKER-4-LEGAL-OWNER-QUESTIONS.md` | Q-J-01 … Q-J-04, one per unresolved route |
| `BLOCKER-5-MISSISSIPPI-PROOF-AUTHORIZATION-PACKET.md` | The proposed new authorization, in full |
| `patches/blocker-5-mississippi-proof-proposed.diff` | The byte-exact proposed edit the new proof hash is computed from |
| `BLOCKER-1-WORKER-REPUBLICATION-RUNBOOK.md` | The non-production publication runbook and its authorization |
| `RELEASE-BLOCKER-DEPENDENCY-ORDER.md` | What blocks what, and what engineering may do after each approval |
| `LANE-J-RESULT.md` | Identity gate, test baseline, lane result |

## Findings in one page

**BLOCKER-4.** Eighteen records, fourteen tracks, seven compiled profiles. The
compiled profiles moved for two reasons: a `questionLifecycle` projection was
added, and `lawrenceRatification` blocks were reprojected from the new
controlling `route-ratification-registry.json`. Across all seven profiles, every
domain the eighteen records declare reliance on — terminology, jurisdiction,
questions, source sections, and eleven others — is **byte-identical**. All
fourteen tracks are absent from the ratification registry, so none carries a
decision that could have moved.

Ten records are DECISION_UNCHANGED and have an exact mechanical patch. Eight are
INSUFFICIENT_AUTHORITY, because a substantively-changed pathway shares operative
statutory authority with the track and nothing on record says whether the change
reaches it: Illinois § 5.2(g) immediate sealing, the two Kentucky
KRS 218A void-and-seal motions, and the five West Virginia § 17C-5-2b DUI
deferral components. No record is DECISION_CHANGED and none requires retirement
today; four could require it, conditionally on the answers.

**BLOCKER-5.** The pinned proof asserts at line 711 that
`MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`
reaches checkout. It does not, and should not: the route has no packet
fulfillment record, and the owner's 2026-08-28 legacy-generator retirement
decision closes Mississippi's commercial authority outright. The proof is stale,
the runtime is right. The fix removes one line, which the delta mechanism
correctly refuses to accept as a revision — `linesRemoved > 0` means a new
authorization. Three files, one signature, and a proposed new proof hash
computed from a byte-exact candidate: `903b1b6e…954642`.

**BLOCKER-1.** The accepted worker image was built from `441ee318…`. Three of
the seven pinned image inputs have since moved — `package.json`, the `src/`
tree, the `scripts/lib/` tree — so `verify-rcap-image-input-fingerprint.mjs` is
red and republication is required. The runbook is complete. It cannot execute
until the candidate source SHA exists, which is after BLOCKER-4 and BLOCKER-5
land, and then needs two separate authorizations from Roger: one to publish, one
to bind Preview.

## Two things not to do with this work

1. **Do not read a green verifier as the goal.** Each of the three blockers has
   a cheap shortcut available — move the hashes, invent a Mississippi
   fulfillment record, re-take the fingerprint against the stale image — and
   each would leave the release worse than red.
2. **Do not report `verify-rcap-terminalize-c1.mjs` as passing after the
   mechanical patch.** It goes from 18 drift failures to 8 and stays red on
   purpose, until Q-J-01 through Q-J-04 are answered.
