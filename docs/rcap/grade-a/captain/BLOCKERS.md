# Captain blocker register

Recorded against captain branch `claude/legalease-sprint-captain-utucnw`.
Opened at base `0cad61625a74665db23ac64988c301e48909cf81`; reconciled against
head `813c669fcf1387476df3b8ef7a3e45f8a1faf881`.

Each entry states whether the blocker was introduced by this sprint's
integration or already present on the controlling base, because the two call for
different responses and conflating them wastes a lane.

## Where this stands at the reconciled head

| | |
|---|---|
| Lanes | B, C, D, E, F, G, H, G-CO-SOURCE, G-CO-BUILD, I, J — **all integrated**. No worker is running. |
| BLOCKER-1 worker republication | **open**, narrowed: the branch pin that would have refused every candidate is corrected, and nonproduction readiness reports 0 blocked inputs. Publication still needs a frozen candidate and its own authorization. |
| BLOCKER-2 operational corpus | **open**. Unchanged. |
| BLOCKER-3 legacy generators | **open**, already adjudicated. Unchanged. |
| BLOCKER-4 terminalization drift | **CLOSED**. 18 → 8 by mechanical repin, 8 → 0 by the decision owner's four answers of 2026-08-29. `verify-rcap-terminalize-c1` passes. |
| BLOCKER-5 Mississippi proof | **CLOSED**. Authorized 2026-08-29 and applied byte-exact; the proof hashes to `903b1b6e…954642` and its three coupled locations agree. |
| Legal decisions | Six recorded verbatim in `data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json`. |
| Candidate | **not frozen**. No candidate SHA is named. |
| Commercial | `commerciallyEligible` **0**, `COMPLETE_PACKET_PROVEN` **0**. |
| Production | untouched. |

| Oregon route design | **artifact-complete, approval-requested**. The overbroad route is retired and replaced by three disposition-bound configurations, each with its own identity, predicate and specification hash. Each now renders: Option 3 for never charged, Option 2 for acquittal and for ordinary dismissal, Option 1 unmarked in all three, marked inside the court's own measured boxes. All six legal sections are bound on all three. Six artifacts are verified twice over — from their content streams and from a render of every page — and three output-level approval packages are written, one per configuration. Approval is **requested, not granted**: the decision field on all three reads REQUESTED with no grantor. |
| Colorado official bytes | 0 of 8. The governed acquirer is re-run and the session's egress policy still refuses the issuing court. |

Both Oregon legal-design questions are answered and implemented, and the
engineering that followed them is done: the option geometry is measured off the
pinned binary rather than derived, the three route-scoped bindings render, and
both verification legs agree. What remains on Oregon is a human decision on exact
artifacts, which is what the three packages ask for and which the legal-design
answers expressly were not.

One correction belongs in this register because it changed what the packet does.
An earlier measurement reported that the official form contains no checkboxes and
derived a selection mark into the left margin at x=58.2. That finding was false —
the form draws fourteen — and it is withdrawn; the marks are struck inside the
court's own boxes at the measured coordinates. Chasing it found a second defect
in the shared rasteriser, which had been returning scroll positions rather than
pages at a resolution unrelated to the caller's scale. Both are fixed, and the
Oregon and NC visual evidence is regenerated. The pdf-finish-final canonical and
boundary rasters are NOT regenerated: their per-family fixture PDFs are not
committed and not reproducible in this checkout, so regenerating that manifest
here would delete evidence rather than refresh it. Those images predate the
correction and need a rerun where the fixtures exist.

---

## BLOCKER-1 — Worker publication evidence is stale; the chain cannot go green without a republication

**Status:** open, narrowed 2026-08-29. The retired integration-branch pin that would have refused every candidate on this branch is corrected in the four nonproduction workflows, and nonproduction readiness now reports 0 blocked inputs. What remains is unchanged: a frozen candidate and a publication authorization.
**Origin still:** open. **Origin:** pre-existing on the controlling base, not
introduced by integration. **Owner:** captain, and it needs an authorization
this sprint does not hold.

`scripts/generate-rcap-staging-action.mjs --check` is in the test chain and
fails. It reports two things:

1. `imageInputFingerprintBaseSha 67a0a789` is not image-input-equivalent to
   HEAD — the fingerprint is stale and must be regenerated.
2. The worker publication evidence was built from `441ee318`, which is not
   image-input-equivalent to the fingerprint base — the published image is for
   other bytes and must be republished at the freeze.

This was verified at the controlling base itself, in a detached worktree at
`0cad61625a74665db23ac64988c301e48909cf81`, before any integration commit: it
already failed there, already named `441ee318`, and already listed **159**
differing files. The integration adds five files to that list — the three
fulfillment modules and two North Dakota modules — so it makes an existing
condition slightly larger without changing its nature. Reverting every
integration commit would not clear it.

**Why it is not fixed here.** The remedy the tool names is republishing the
worker image at the freeze. That is a deployment action. This sprint authorizes
no deployment, no environment change and no domain activation, so the captain
records the blocker rather than performing the republication. Regenerating the
fingerprint alone would be worse than leaving it: it would satisfy the first
complaint while the published image still served other bytes, which is precisely
the mismatch the check exists to catch.

**Consequence for the release gate.** A full green repository chain is not
reachable on this base until the worker is republished at a frozen candidate.
`NATIONAL GRADE-A RELEASE RESULT` requires both a frozen candidate SHA and a
full green chain, and neither is satisfiable while this stands. It is the gating
item, and it needs an operator with publication authority.

---

## BLOCKER-2 — The operational Nationwide corpus is absent

**Status:** open. **Origin:** pre-existing. **Owner:** whoever holds the
operational corpus.

`OFFICIAL_FORMS_SOURCE_DIR` points at the operational Nationwide tree, whose
top level is directories matching `LegalEase ...`. The pinned release
`source-corpus-2026-08-28` carries the **Master Library**, which is a different
corpus with a `STATES/` and `00_GOVERNANCE/` shape.
`scripts/rcap-official-forms/operational-corpus-precondition.mjs` refuses a
Master Library mounted at the operational path by name, and is right to: the
Master Library answers "what is the current official edition of this form", and
the operational tree answers "what does this platform build packets from". Ten
retired assets are present in one and absent from the other, so substituting
would make a retirement mean something nobody intended.

The Master Library itself is recovered and verified — 51 jurisdictions, 499
files, 329 PDFs, 498/498 governance checksums, archive SHA-256
`a26e3ca7d52db4460e53c2eddd893109037702f5c8035f2c698a7e16bad84e89` — so lanes
needing official binaries are unblocked. Only lanes needing the operational tree
are blocked, and no substitution is permitted to unblock them.

---

## BLOCKER-3 — Five legacy document generators cannot execute

**Status:** open, already adjudicated. **Origin:** pre-existing, long-standing.
**Owner:** the packet-family workstream.

`verify-dc-document-generator`, `verify-pennsylvania-document-generator`,
`verify-texas-harris-document-generator`, `verify-illinois-document-generator`
and `verify-mississippi-document-generator` all fail with `ENOENT` on paths such
as `src/lib/rcap/documents/pennsylvania/generator.ts`. That directory exists at
neither the controlling base nor the older stale base, so this predates the
sprint by a long way.

This was checked against the North Dakota renderer change specifically, because
that change touches the shared custom-pleading renderer and the legacy
generators are protected. The failures are byte-identical with the renderer
change applied and with it reverted, so the change is not the cause.

The repository has already adjudicated this: all five are recorded
`blocked_on_family` in `data/rcap-verifier-dispositions.json`, and none is in
the test chain. Recorded here so it is not rediscovered as a regression.

---

## BLOCKER-4 — Terminalization provenance has drifted from the compiled profiles

**Status:** CLOSED 2026-08-29 by the decision owner's four answers; see the summary at the top. The account below is kept as written, because it is the record of what the blocker was and why it could not be cleared by engineering.
**Was:** open. **Origin:** pre-existing on the controlling base, not
introduced by integration. **Owner:** legal review, not engineering.

`scripts/verify-rcap-terminalize-c1.mjs` is in the test chain and fails with 18
entries of the form `provenance.profileSha256 drifted from
src/lib/rcap-engine/compiled/profiles/<profile>.json`. It is the first red step
the chain reaches on this base.

Verified pre-existing at the controlling base in a detached worktree: it fails
there with the same 18 entries, and the failure set in the captain tree is
byte-identical to the one at the base. Integration added nothing to it. No
commit on this branch touches a compiled profile.

The seven implicated profiles are West Virginia (5), Texas (4), Kentucky (3),
Indiana (2), Connecticut (2), Vermont (1) and Illinois (1). Each was changed by
accepted work on the controlling branch — Batch C gave several of them their
first legal-authority contracts — so the terminalization records now pin profile
bytes that have been superseded.

**Why it is not fixed here.** This is not the same class of problem as the
source-support audit or the crosswalk pins, which were regenerated earlier on
this branch. Those had a generator, and regenerating them was the ledger
following its input with no finding changing. This verifier has no write or
re-pin mode — only `--render` — so the pins would have to be moved by hand, and
moving a `profileSha256` by hand asserts that the terminalization decision still
holds against the new profile bytes. For West Virginia and the other Batch C
profiles the bytes changed *because the legal authority changed*. Whether each
terminalization survives that change is a legal-review question about the
decision, not a mechanical question about the hash.

Re-pinning without that review would be exactly the failure the check exists to
prevent: a provenance record that looks current and no longer describes the
authority it claims to rest on. The pins are therefore left drifted and visibly
red rather than quietly moved.

**What it needs.** For each of the 18 entries, a reviewer confirms the
terminalization still follows from the current profile, and the pin is moved
with that confirmation recorded. Where it does not follow, the terminalization
is reopened rather than re-pinned.

---

## Chain status on this base, stated plainly

The repository chain is **not green on the controlling base**, and was not green
before this sprint's integration. Running it in order:

| Step | Status |
|---|---|
| `verify-rcap-e2-source-support-audit` | was red on the base; **fixed** on this branch |
| `verify-rcap-verifier-dispositions` | was red on the base; **fixed** on this branch |
| `verify-rcap-terminalize-c1` | was red on the base; **fixed** — see BLOCKER-4 below |
| `generate-rcap-staging-action --check` | red on the base and still red — BLOCKER-1 |
| `verify-rcap-image-input-fingerprint` | red on the base and still red — the same root as BLOCKER-1 |

Three of the four pre-existing reds are cleared. BLOCKER-4 fell the way it was
always going to: not by engineering deciding it, but by the decision owner
answering four narrow questions and the prepared patches being applied to
whichever branch each answer selected.

The one that remains needs a worker republication, which needs a frozen candidate
and a publication authorization. It was not caused by the integration and cannot
be cleared by engineering alone.

A `NATIONAL GRADE-A RELEASE RESULT` requires a full green chain, a frozen
candidate SHA, a pinned Preview, hosted acceptance, payment and artifact proof,
security denial proof, mobile and accessibility proof and rollback proof. The
candidate is not frozen and the Oregon artifacts are not approved, so no release
result is issued.

---

## BLOCKER-5 — The Mississippi finetune fixture needs a new authorization to fix

**Status:** CLOSED 2026-08-29. The authorization was issued and the edit applied byte-exact. The account below is kept as written; it is the record of why the obvious fix was not available without one.
**Was:** open. **Origin:** pre-existing red; my attempted fix was reverted.
**Owner:** the authorizer of the standing parity approval, not engineering.

`scripts/verify-screening-verification-finetune.mjs` fails on clean source. Its
fixture route, `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`,
has no entry in `data/rcap-ledger/packet-fulfillment-records.json`, so
`assertCheckoutAllowed` throws `PacketFulfillmentNotProvenError` and the proof's
`assert.doesNotThrow` fails. Confirmed red on the captain head *before* Lane E
integration.

The refusal is correct. Mississippi is closed — § 99-15-59 generates a status
summary, not a filing — and a route sells only what it can prove it delivers.
Adding a Mississippi fulfillment record to make the assertion pass would open a
route nobody proved, so that was never an option.

**Why the obvious fix is not available to me.** I inverted the assertion to
assert the truth — that the route is denied, and denied specifically for the
missing fulfillment record — and the repository refused it, correctly.

That proof script is hash-pinned twice: in the approval record
`public-profile-lifecycle-validation-2026-08-26` and again as a constant in
`scripts/lib/screening-parity-deltas.mjs`. Double-entry, so the data cannot be
edited alone. And the rule those pins enforce is explicit:

> Each move is recorded in the record's `proofRevisions`, and a revision is only
> accepted if it removes nothing: a proof may be strengthened under a standing
> approval, never weakened. Weakening it needs a new authorization.

My change removed one assertion and added forty-nine. Under that rule it is a
weakening regardless of the forty-nine, and inverting an assertion is exactly
the shape the rule exists to catch — a proof that used to demand one thing now
demanding its opposite, under an approval nobody revisited. The mechanism did
its job. The edit is reverted and the proof is back at its pinned bytes.

**What it needs.** A new authorization from the approval's authorizer, covering
the change of expectation from "checkout is allowed for this fixture route" to
"checkout is denied for this fixture route, for the missing fulfillment record".
That is a decision about what a signed approval covers, and it is not a
captain's to grant.

Two treatments are available once authorized, and the second is likely better
because it moves the fixture off a closed route entirely rather than inverting
an assertion:

- **A.** A synthetic, verifier-local Grade-A record that cannot reach the global
  fulfillment registry or runtime commercial status.
- **B.** Assert the live route is commercially denied, and prove verification
  invalidation separately through the protected verification machinery — which
  the proof already does independently of checkout, at three other points.

Until then the verifier stays visibly red rather than being edited around, and
no Mississippi fulfillment record exists. Commercial eligibility is unaffected
and remains zero.

---

## Closed by the decision owner, 2026-08-29

- **BLOCKER-4.** Four answers, recorded verbatim. Illinois § 5.2(g) retired as a
  participant-facing pleading and kept in the service model as attorney action
  and referral; Kentucky KRS 218A.275 and 218A.276 confirmed separate routes and
  repinned; West Virginia § 17C-5-2b(g) confirmed the correct vehicle and its
  five component records repinned. Two answers carried preconditions and both
  were satisfied before any patch was applied: the KRS 218A.275(12) exclusion is
  now recorded authority with its route-specific denial fact, and the West
  Virginia one-year clock is recorded with the six wrong starting points named as
  wrong. Terminalization provenance drift is 0. Nothing was repinned to obtain
  green output — the one retirement moves no hash at all.
- **BLOCKER-5.** Authorized and applied byte-exact. The assertion that a
  Mississippi route is admitted at checkout is replaced by its inverse, so the
  proof now proves the refusal and pins its reason by message. Recorded as a new
  authorization rather than a proof revision, because the mechanism refuses a
  revision that removes a line and this removed one.

## Resolved during this session

- **Playwright browser revision.** The pinned Playwright expected a Chromium
  revision the image does not carry, which failed the security checks at
  `test-sign-out-origin`. Bridged in the execution environment. No repository
  file was changed and no browser-dependent security check was weakened,
  skipped or quarantined.
- **Source-support audit drift.** 1,356 stale line spans; regenerated. Verified
  no severity change, no flag change and no score decrease across all 935 rows.
- **Verifier dispositions.** 39 scripts added by accepted work had no recorded
  decision; registered as provisional.
- **Crosswalk and E3 job graph.** Re-pinned to the regenerated audit. Content
  hashes unchanged on both.
