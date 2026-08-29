# Captain blocker register

Recorded against captain branch `claude/legalease-sprint-captain-utucnw`, based
on `0cad61625a74665db23ac64988c301e48909cf81`.

Each entry states whether the blocker was introduced by this sprint's
integration or already present on the controlling base, because the two call for
different responses and conflating them wastes a lane.

---

## BLOCKER-1 — Worker publication evidence is stale; the chain cannot go green without a republication

**Status:** open. **Origin:** pre-existing on the controlling base, not
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

**Status:** open. **Origin:** pre-existing on the controlling base, not
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
| `verify-rcap-terminalize-c1` | red on the base and still red — BLOCKER-4 |
| `generate-rcap-staging-action --check` | red on the base and still red — BLOCKER-1 |

Two of the four pre-existing reds are cleared. The remaining two are recorded
rather than forced, because one needs a deployment authorization this sprint
does not hold and the other needs a legal review this sprint may not perform.
Neither can be cleared by engineering alone, and neither was caused by the
integration.

A `NATIONAL GRADE-A RELEASE RESULT` requires a full green chain, a frozen
candidate SHA, a pinned Preview, hosted acceptance, payment and artifact proof,
security denial proof, mobile and accessibility proof and rollback proof. None
of those is satisfiable while BLOCKER-1 and BLOCKER-4 stand, so no release
result is issued.

---

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
