# Lane H — captain decisions at integration

Integrated from `claude/grade-a-68h-lane-h`, five commits, replayed onto the
E- and F-integrated captain head. The branch was not merged. Thirty-two files,
zero collisions.

## Path exception, approved

Fifteen of the changed paths sit outside Lane H's declared owned set: the Clinic
pages under `src/app/{clinic,internal/clinic,partner/clinic}`, the Clinic
components, and `src/types/clinic-device-reset.d.ts`. They are inside the
assigned Reset Device and accessibility purpose, and the exception is approved on
that basis after inspection rather than on the lane's say-so.

What the inspection found: 39 insertions and 25 deletions across all fifteen,
and every one presentational. Colour tokens darkened for AA contrast
(`#1D9E75` to `#127256`, `#D85A30` to `#A8431F`), plus `role`, `focus:ring-2`,
`aria-describedby` and `aria-invalid`. No data access, no auth, no query, no
secret handling. The type declaration gained twelve lines describing the reset
surface.

Neither Lane F nor Lane G owns or has changed any of them: F owns the render and
payment paths, G owns Colorado's overlay and state pack. **This exception is for
these files in this integration only** and does not widen Lane H's ownership for
future work; the manifest's owned-path list is unchanged.

## Browser portability, fixed under captain ownership

`scripts/clinic-mode/verify-browser.mjs` hardcoded
`/Applications/Google Chrome.app/...`, so the check could only run on one
developer's machine and failed elsewhere with a missing-executable error that
looked like a browser problem rather than a portability one.

Resolution order is now: `CHROME_PATH` when set and executable, then the known
per-platform install locations, then the repository-approved Playwright browser
via `PLAYWRIGHT_BROWSERS_PATH`, then Playwright's own managed resolution — and
if that finds nothing, the launch fails naming the environment. No symlink and
no absolute container path is committed, and there is no branch that skips the
browser check quietly: a machine with no browser fails rather than passing
vacuously.

The two bridges the worker used — the Chromium 1223-to-1194 revision mapping and
the macOS Chrome path — are execution-environment accommodations and are **not**
durable release evidence. The final candidate environment must carry the
expected pinned revision, or an explicitly reviewed updated pin.

## A registry gap this integration exposed

Registering Lane H's six security verifiers surfaced something larger: the
disposition generator read only the top level of `scripts/`, so **no**
`scripts/security/*` verifier had ever been registered — not the Clinic suites,
and not the auth-redirect, sign-out and internal-admin-remediation checks that
predate them. A register that silently omits the security directory is worse
than no register for those files, because it reads as coverage.

The generator and the checker are two halves of one mechanism, so both now read
the top level and `scripts/security/`, keyed by path relative to `scripts/`.
Teaching only the generator would have made every security entry read as naming
a script that does not exist. Ten entries are now registered: Lane H's six, plus
four pre-existing security verifiers that had been invisible.

Consistency was asserted in both directions across all ten — disposition `wired`
if and only if the command is in the chain — and the check was confirmed
non-vacuous by counting the entries it examined rather than trusting an empty
filter to pass.

## Hosted acceptance remains pending

The runner is ready and fail-closed. It refuses a branch name where an exact
candidate SHA is required, a Production hostname, and a partially specified
invocation — all three verified by running them.

Hosted acceptance is **not** complete and no hosted evidence is fabricated. Four
input classes are still required from the captain, and none exists yet:

1. an exact frozen candidate SHA;
2. an exact pinned nonproduction Preview URL;
3. an exact synthetic tenant slug and event slug;
4. at least two exact synthetic participant identities in the reserved test
   domains.

The frozen candidate is itself blocked: a candidate freeze needs a green chain,
and BLOCKER-1 and BLOCKER-4 both stand.

## One non-defect worth recording

`npm run typecheck` failed once during integration with parse errors inside
`.next/dev/types/routes.d.ts`. That is a generated, git-ignored Next build
artifact left behind by a Clinic test that spawns a dev server, not a source
defect. Clearing `.next` returns typecheck to clean. Recorded so the next
occurrence is recognised rather than investigated as a regression.
