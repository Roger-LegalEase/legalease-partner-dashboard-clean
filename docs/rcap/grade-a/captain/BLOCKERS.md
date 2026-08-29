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
