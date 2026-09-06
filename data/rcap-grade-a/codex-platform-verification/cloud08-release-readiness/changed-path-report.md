# CLOUD08 change-scope and collision report

## Local evidence

Commands:

```bash
git for-each-ref --format='%(refname:short) %(objectname)' refs/heads refs/remotes
git diff --name-only 4fb89c96e2886e6d9d80f9bb757278c20ecb6b13..48f74d82016795307e565220e38ce369cf43da5e
git diff --name-only 4fb89c96e2886e6d9d80f9bb757278c20ecb6b13..48f74d82016795307e565220e38ce369cf43da5e | wc -l
```

Observed: only local ref `work` was available; no remote/open-PR refs or GitHub metadata were present. The ancestor-to-head range contains **329 paths**, including **0 `src/**` application paths**, 13 script paths, 22 documentation paths, 14 paths under `data/rcap-grade-a/packet-factory-24h/**`, and many packet overlay/raster assets. Those Fable paths are expected branch history and were not audited or modified by CLOUD08.

CLOUD08 additions are exactly:

- `data/rcap-grade-a/codex-platform-verification/cloud08-release-readiness/README.md`
- `data/rcap-grade-a/codex-platform-verification/cloud08-release-readiness/findings.md`
- `data/rcap-grade-a/codex-platform-verification/cloud08-release-readiness/preview-acceptance-checklist.md`
- `data/rcap-grade-a/codex-platform-verification/cloud08-release-readiness/rollback-checklist.md`
- `data/rcap-grade-a/codex-platform-verification/cloud08-release-readiness/changed-path-report.md`

Application files modified: **0**. Production touched: **no**.

## Required open-PR collision check

Git network commands were prohibited and not used. When GitHub metadata is supplied locally, export each open platform PR as `<PR> <BASE_SHA> <HEAD_SHA> <owner: Fable|Codespace-A|Codespace-B>` and run:

```bash
for row in /tmp/cloud08-pr-refs/*.row; do
  read -r pr base head owner < "$row"
  git cat-file -e "$base^{commit}" && git cat-file -e "$head^{commit}"
  git diff --name-only "$base..$head" | sort -u > "/tmp/cloud08-pr-$pr.paths"
done
comm -12 /tmp/cloud08-pr-A.paths /tmp/cloud08-pr-B.paths
```

Apply these stop rules:

1. Any non-Fable PR touching a prohibited packet-factory path stops merge.
2. Any two PRs touching the same application, migration, workflow, environment-contract, or shared script path stop merge pending explicit ownership and ordered integration.
3. A shared application module requires written proof that no active Fable branch changes it, generic/non-family-specific scope, and explicit listing here.
4. Migration additions are ordered by dependency, not merely filename; duplicate timestamps or alternate canonical/phase paths stop release.
5. Environment, Auth, Stripe, Storage, email, queue, monitoring, alert, and rollback files are Codespace integration surfaces even when code merges cleanly.

**Current conclusion:** no collision can be proven or cleared for open PRs without their metadata. This is a release evidence blocker, not a claim that a collision exists.
