# Evergreen Route Maintenance

How a live-adjacent RCAP route stays trustworthy after the sprint that built
it: what watches the official sources, what record carries a hold, what the
recurring reviews read, and — the heart of this document — the eleven-step
response when an official source changes or vanishes.

The system is deliberately small. Machines observe and assemble; people decide.
No workflow commits to a branch, touches production, changes route state, or
fetches from a host outside `scripts/lib/official-host-policy.mjs`.

## The standing machinery

| Piece | What it is | What it never does |
| --- | --- | --- |
| `.github/workflows/rcap-nightly-source-monitor.yml` running `scripts/rcap-source-monitor.mjs` | Nightly fetch of every pinned official-source URL (acquisition manifest entries + registry rows resolving to an exact URL and hash), recording status, redirect chain, content type and observed sha256 against the pin. On a change or loss it writes a review-task JSON into the run artifact and opens one deduped GitHub issue labeled `source-change-review`. | Commit, approve, invalidate, hold, or touch route state. A changed hash **creates a review task** — nothing else. |
| `data/rcap-grade-a/maintenance/route-holds.json` + `scripts/verify-rcap-route-holds.mjs` (in `npm test`, with `--mutations`) | The single route-scoped hold carrier, captain/owner-authored, consumed read-tolerantly by the runtime availability derivation (packet-route-resolver, owned by RM-1). | Express a path-wide or jurisdiction-wide hold (the verifier refuses both), or release a hold without a reacceptance reference. |
| `.github/workflows/rcap-maintenance-review.yml` running `scripts/rcap-maintenance-review.mjs` | Weekly cron (auto-widening to monthly/quarterly by date, or forced by dispatch) that assembles the review packet: open `source-change-review` issues, active holds, defect registers, unfinished routes from the launch graph. | Change any state. It is a reader. |

Route attribution (`routesUsing`) is **derived at runtime** by the monitor,
joining `data/rcap-ledger/launch-graph.json` and
`data/record-clearing/legal-design-packet-set-manifests.json` with the
manifest's own `obligationKeys`. The generator-owned registries
(`data/record-clearing/source-artifact-registry.json`,
`data/rcap-grade-a/official-source-registry.json`) are never hand-edited to
carry it.

## The eleven-step source-change response

Trigger: a `source-change-review` issue / review task from the nightly monitor,
or any equivalent first-hand observation that an official source changed,
moved, or disappeared.

Each step names who performs it. "Human" steps are decisions; no script may
make them.

1. **Identify the affected routes.** Start from the review task's
   `routesUsing` block — the monitor derives it by joining the launch graph and
   the packet-set manifests (`scripts/rcap-source-monitor.mjs`; re-run with
   `--dry-run` for a fresh join). Treat the list as a floor, not a ceiling: a
   human confirms it against the artifact registry and state pack before
   acting.
2. **Compare for material change.** Fetch the current document through the
   existing acquisition path
   (`.github/workflows/rcap-official-source-acquisition.yml` /
   `scripts/rcap-acquire-official-source.mjs` — one acquisition
   implementation, not two) and compare it against the pinned binary.
   **Human decision:** is the change material — a revised form, new fields,
   changed filing instructions — or cosmetic (re-served bytes, metadata churn,
   a landing page redesign that still links the same binary)? A cosmetic
   change closes the review task with that finding and stops here.
3. **Hold only the affected routes.** **Human action:** add one row per
   affected exact `routeId` (launch-graph `pathwayKey`) to
   `data/rcap-grade-a/maintenance/route-holds.json`, `holdType`
   `MAINTENANCE_HOLD` (or `LEGAL_HOLD` if the change is a legal-authority
   problem), citing the review task and issue as `evidence`, in a reviewed
   commit. `scripts/verify-rcap-route-holds.mjs` refuses wildcards,
   jurisdiction-wide expressions, and unknown routeIds — holds name exact
   routes only. Unaffected sibling routes keep operating.
4. **Update the source artifact and its records.** Bring the new official
   binary in through the acquisition workflow's artifact and a reviewed
   commit; update the source-record / state-pack entry with the new hash,
   revision line, and URL. **Human decision** on identity and currentness —
   the acquisition receipt deliberately leaves `editionOrRevision`,
   `currentnessDetermination` and `supersessionDetermination` unmade.
5. **Update the field map.** Re-extract fields from the new binary and revise
   the overlay/field map for every affected packet family. Field-semantics
   verifiers in `npm test` must pass against the revision.
6. **Regenerate the sample packet.** Re-render the affected family's sample
   through the existing generators; generator `--check` must converge (the
   house convention: a generator that changes its output on re-run is not
   done).
7. **Reaccept.** Run the acceptance path for the exact route and packet
   family (the same acceptance machinery that granted the original Grade-A
   fulfillment record — e.g. `.github/workflows/rcap-github-hosted-acceptance.yml`
   for hosted acceptance). A route sells only what a record proves it
   delivers; the old record proved the old bytes.
8. **Independently verify.** A second pass that did not produce the change:
   `npm test` (which carries the route-holds verifier, field-semantics and
   packet verifiers with their `--mutations` harnesses) plus a person other
   than the updater reviewing the regenerated sample against the new official
   form. **Human decision:** the verification is sufficient.
9. **Reactivate.** **Human action:** set the hold row's `releasedAt` and its
   `reacceptance.reference` to the reacceptance evidence (record path or run
   reference) in a reviewed commit. The verifier refuses a release without
   that reference; the availability derivation restores the route when the
   active hold clears. Never delete the row — it is the history.
10. **Preserve prior versions.** The superseded binary, field map, and
    already-generated participant artifacts are kept (marked superseded,
    never deleted) — per the standing rule that preservation keeps assets and
    history even when authority moves on, and because filed packets must stay
    comparable to what was actually filed.
11. **Never recharge entitled users.** **Standing rule, human-enforced at
    step 7's boundary:** a participant or partner already entitled to a packet
    on the held route receives the corrected packet without a new charge, a
    new credit consumption, or a re-entitlement step. Maintenance is the
    platform's cost, not the participant's.

Close the `source-change-review` issue only after step 9 (or after step 2's
"cosmetic" finding), citing the commits.

## What the nightly monitor does NOT establish

The monitor sees bytes at URLs. It cannot say whether an observed change is
the publisher's current edition, whether it supersedes the pinned one, or
which routes are *materially* affected. Every one of those is a step above,
owned by a person. An unreachable URL is evidence about the URL, not about the
form — publishers move documents without retiring them.
