# Codex Cloud packet execution contract

Every Codex Cloud packet task in this repository runs under this contract. It is
short because it only has to say the six things a cloud task does differently
from a Codespaces task — everything else about building, repairing and verifying
a packet is unchanged, and the gates that matter are unchanged too.

## Why this exists

`scripts/verify-packet-build-environment.mjs` was written against a Codespace.
Three of its fourteen checks assumed a permanent `origin`, a full clone, and an
`origin/<worker-branch>` tracking ref.

Codex Cloud does none of those, on purpose:

- it checks the selected Captain branch out as a **local branch named `work`**;
- the checkout is **shallow**;
- **`origin` is removed** before the agent starts;
- the finished **diff returns through the Codex UI**, not through a push.

So every ordinary Codex Cloud packet task failed the environment gate before it
reached a single source byte. Not because the container was wrong — because the
preflight was asking a Codespace's questions.

## The rule that shaped the fix

**A gate is replaced, never waived.** A cloud task that reported `13/14` with a
note about the clone check would be a gate somebody had argued with, and the
next person to read the report would not know whether the missing check mattered.
Three checks are therefore replaced by cloud-native checks that establish the
same three facts by other evidence:

| Codespaces check | Cloud replacement | The fact both establish |
| --- | --- | --- |
| `repo_identity` | `repo_identity_by_committed_markers` | this checkout is the packet repository, at a commit, on a named branch |
| `clone_is_complete` | `cloud_checkout_contains_captain_base` | this checkout carries the work the assignment was cut from |
| `assigned_branch_tip_visible` | `assignment_present_in_this_checkout` | the assignment this worker is executing is really in this tree |

The denominator stays **14** in both modes. A cloud pass is `14/14`.

Everything else is unchanged and mandatory: clean worktree, Node toolchain,
`pdf-lib`, `private/` ignored and untracked, Master Library mounted, exact
51 / 499 / 329 corpus, corpus matching the committed index, family source binding
by exact SHA-256, the operational-path separation, absent-is-not-empty, and the
stale-artifact block.

One gate is *stronger* in cloud mode: `master_library_mounted` also requires the
corpus environment file, because a cloud worker that changes directory without it
loses the mount and rediscovers the first wave's failure with the bytes sitting
right there on disk.

## What every Codex Cloud packet prompt states

1. **Environment: LegalEase Packet Factory.** The setup phase runs
   `scripts/codex-cloud/setup-packet-factory.sh` and prints
   `LEGALEASE_CODEX_CLOUD_READY`. If that line is absent, the environment is not
   ready and the task stops.

2. **Never run a Git network command.** No `git fetch`, `git pull`, `git push`,
   `git clone`, `git remote add`, or `git fetch --unshallow`. Each of them fails
   on a checkout that is working exactly as designed, and the failure reads as a
   broken environment rather than as a wrong instruction.

3. **Source the corpus environment first.**

   ```sh
   source $HOME/.legalease-corpus-env
   ```

   The setup script writes it in two places — `private/source-corpus-environment.txt`
   inside the repository, and `$HOME/.legalease-corpus-env` — because the home copy
   survives a change of working directory and the repo copy is what the preflight
   looks for.

4. **Run the preflight in cloud mode, with the exact minimum Captain SHA.**

   ```sh
   node scripts/verify-packet-build-environment.mjs \
     --family <FAMILY_ID> \
     --codex-cloud \
     --minimum-captain-sha <SHA>
   ```

   The SHA is supplied by the assignment and is never guessed. A preflight that
   inferred which commit was meant would prove nothing: the point is that this
   shallow checkout demonstrably contains the tree the assignment was cut from.

5. **`PACKET_BUILD_ENVIRONMENT_READY: 14/14` or stop.** In cloud mode a `13/14`
   is a real failure, not the shallow checkout being tolerated.

6. **The diff is the return.** Commit locally and leave the final diff for the
   Codex UI. **`PUSHED: YES` is never part of a cloud return** — there is nothing
   to push to, and asking for it turns a complete task into a failed one.

## The return format

Every cloud packet return ends with:

```text
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
PREFLIGHT: PACKET_BUILD_ENVIRONMENT_READY 14/14
DIFF LEFT FOR THE CODEX UI: YES
```

There is no `PUSHED:` line, no `WORKER BRANCH:` line worth filling in (the branch
is always `work`, and Codex names it), and no request to open a pull request.

## What the setup script does and does not do

`scripts/codex-cloud/setup-packet-factory.sh`, in order:

1. `npm ci`, then proves `pdf-lib` resolves;
2. reads `LEGALEASE_SOURCE_ARTIFACTS_TOKEN` from the environment — setup phase
   only, never printed, never written to disk, never on a command line;
3. downloads the governed private corpus release;
4. verifies the archive SHA-256 **before extracting anything**;
5. extracts into the git-ignored `private/` tree;
6. verifies 51 jurisdictions / 499 files / 329 PDFs, and the corpus's own
   governance checksums where present;
7. writes `private/source-corpus-environment.txt` and `$HOME/.legalease-corpus-env`;
8. re-confirms `private/` is ignored and tracks nothing;
9. prints `LEGALEASE_CODEX_CLOUD_READY`.

It does **not** fetch, pull, push, require `origin`, unshallow the checkout,
change a branch, or commit a corpus byte.

## The current cloud tasks

Generated into `docs/rcap/grade-a/launch-control/codex-cloud-prompts/` and
recorded in `data/rcap-grade-a/launch-control/CODEX_CLOUD_CONTINUATIONS.json`:

| Task | Families | Scope |
| --- | ---: | --- |
| `P2_WA_VACATUR_COMPLETENESS__CODEX_CLOUD` | 9 | unchanged from its original dispatch |
| `R8_COMPLETENESS_REPAIR_PRIORITY_FOUR__CODEX_CLOUD` | 4 | unchanged from its original dispatch |
| `SD_ARREST_EXPUNGEMENT_DISCLOSURE_REPAIR__CODEX_CLOUD` | 1 | new — the one family the S2 continuation left short |
| `VS01_S2_CONTINUATION_INDEPENDENT_VERIFICATION__CODEX_CLOUD` | 4 | unchanged from its original dispatch |
| `VS02_S2_CONTINUATION_INDEPENDENT_VERIFICATION__CODEX_CLOUD` | 4 | unchanged from its original dispatch |
| `VS03_S2_CONTINUATION_INDEPENDENT_VERIFICATION__CODEX_CLOUD` | 2 | unchanged from its original dispatch |

Five of the six carry the families, owned paths and packet scope they were
dispatched with. Only the environment contract around them changed. The South
Dakota repair is the one new task, and it exists because the completeness audit
named a defect — nine fields declared required-before-filing that the packet
never asks the participant for — not because a lane was re-scoped.

Their base moved to the S2 continuation base, which carries S1, S2, the corrected
completeness contract, P1/P3/P4 and the re-rendered evidence. A repair rendered
against the older base would be measured by a contract that has since changed and
would fail for a reason that is not the packet's.

## What this contract does not grant

An environment contract opens nothing. It says how a task runs, not what a
finished task proves. A built packet is not a verified one, a verified one is not
an approved one, and none of the three opens a commercial route.
