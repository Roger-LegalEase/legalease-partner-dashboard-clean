# Lane D — North Dakota Grade-A status and evidence

Sprint: national Grade-A · Wave 2
Lane: `D-north-dakota-composed-pleading`
Branch: `claude/grade-a-68h-lane-d`
Base: `a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef`

## Mandatory identity gate

| Required | Observed | Result |
|---|---|---|
| `origin` resolves to `Roger-LegalEase/legalease-partner-dashboard-clean` | `https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean` | pass |
| `a25eec4c…` exists | `git cat-file -e` succeeded | pass |
| `a25eec4c…` is an ancestor of `origin/claude/legalease-sprint-captain-utucnw` | it *is* that branch's tip | pass |
| Starting checkout clean | `git status --porcelain` empty | pass |
| Lane branch created from the base | `claude/grade-a-68h-lane-d` at `a25eec4c…`, did not previously exist | pass |
| Production | not connected, not written | untouched |

The Wave 1 base `0cad6162…`, `origin/main`, `07675789` and the prior lane
branch's tip were all rejected as bases, as the prompt requires.

## Status

**COMPLETE** for a Grade-A North Dakota composed packet on a route that actually
requires participant filing, as candidate evidence with commercial status closed.

## Route

| | |
|---|---|
| Selected | `ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` |
| Rejected | `ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05` — `non_filing_guidance` per signed reclassification `ND-2026-08-28-NO-PARTICIPANT-FILING` and decision `NATIONAL-2026-08-28-LA-IMM-03`; its pre-2025-08-01 branch takes the official petition and proposed order and is recorded as not built |
| Reasoning | `docs/rcap/grade-a/north-dakota/ROUTE_SELECTION.md`, and asserted on every verifier run |

## Identity and hashes

| | |
|---|---|
| Specification | `nd-chapter-12-60-1-conviction-sealing@1.0.0` |
| Specification SHA-256 | `1bca63ed3706e1c009c062adaa08a5936555ce005193969ffc65cf76aa606985` |
| `spec.json` SHA-256 | `65c5443226a8f162096ede0278640562ee6f79982dd0cc584a3973863363010e` |
| Artifact | `rendered/canonical.pdf`, `application/pdf`, 19,792 bytes, 8 pages |
| Artifact SHA-256 | `913e34a6f714383878397371c8d536bc094afce3a6067cfeb4caefee04e2e270` |
| Composed text SHA-256 | `b2395bfe3f4fca10171563048275b6e92d08c8981fb30b8c4e173b3894f6a582` |
| Visual-review page evidence SHA-256 | `c52e141dd6f76b82f318553da40f32c72b5415c938e4af831ec006ecd4617161` |
| Provider | `legalease/nd-chapter-12-60-1-composer`, `composed_pleading_packet_v1@1.0.0`, `pdf-lib@1.17.1`, compiled profile `ND-north-dakota@2026-06-19-source-conversion-1` |

Source identities bound (both `heldInRepository: false` — see blockers):

- `ND__SUPPORT__SEALING-CRIMINAL-RECORDS-RESEARCH-GUIDE__…__REV-UNKNOWN__EN.pdf` — `b39a0c1532bff3381382544a3888478835edb2109af597a2468a34e2a5f19a3c`
- `ND__REFERENCE__WILMA__north-dakota-expungement-sealing-reference__REV-UNKNOWN__EN.rtf` — `68c9109532391768ba04b29801f6e7ed4dbee4e2905b9a79bb162b4cd7905a68`

Each hash is confirmed from two independent committed records that agree
(`data/rcap-all50/local-source-corpus-index.json` and the ND state pack's
`all50-build-metadata.ts`).

## Packet contents

| # | Document | Audience | Requirement | Pages |
|---|---|---|---|---|
| 1 | How to File This Packet | participant | required | 1–3 |
| 2 | Petition to Seal Criminal Records | court | required | 4–6 |
| 3 | [Proposed] Order to Seal Criminal Records | court | required | 7 |
| 4 | Proof of Service on the Prosecuting Attorney | court | required | 8 |
| — | Notice/affidavit to law enforcement, witnesses, victims | court | **absent by design** — the § 12-60.1-04(4) canvass is the prosecutor's duty and the source prescribes no participant document | — |

Grade-A element coverage: exact route, jurisdiction and packet family;
complete filing; mandatory proposed order (§ 12-60.1-03(3)); service component
(§ 12-60.1-03(4)); filing destination (governed fact, never defaulted); fee and
waiver instructions (no amount stated by any source, so none printed);
copy requirements; post-filing steps; five hearing and objection stop
conditions; versioned specification and hash; source identities and hashes;
provider identity and version; deterministic fixtures; filing-format artifact
and SHA-256; page-by-page visual review; output-level legal review; final
verification binding; participant ownership; private storage; owner-authorized
download; repeat download; payment idempotency.

## Tests run

| Command | Result |
|---|---|
| `verify-nd-grade-a-packet.mjs` | PASS — 1752 checks |
| `verify-nd-grade-a-product-path.mjs` | PASS — 59 checks (ephemeral PostgreSQL + Chromium) |
| `verify-nd-shared-renderer-byte-preservation.mjs` | PASS — 367 checks, 24 configurations, 72 comparisons, byte-identical |
| `generate-nd-grade-a-packet.mjs --check` | PASS — artifacts re-derive byte for byte |
| `verify-route-resolution.mjs` | PASS |
| `verify-rcap-non-filing-components.mjs` and `--mutations` | PASS |
| `verify-rcap-grade-a-fulfillment-authority.mjs` and `--mutations` | PASS |
| `generate-rcap-grade-a-fulfillment-authority.mjs --check` | PASS |
| `verify-shared-claim-boundary-app.mjs` | PASS |
| `verify-nd-pleading-state.mjs` | PASS (pre-existing ND configuration untouched) |
| `verify-pleading-state.mjs` (PA), `verify-dc-pleading-state.mjs`, `verify-ok-pleading-state.mjs`, `verify-wy-pleading-state.mjs` | PASS |
| `verify-rcap-no-null-presentation.mjs` | PASS |
| `npx tsc --noEmit` | 0 errors |
| `npx eslint` on lane paths | 0 problems |
| `verify-rcap-terminalize-c2.mjs` / `c3.mjs` | FAIL — **pre-existing at the base**, byte-identical failure lists (23 and 21 respectively) against a clean worktree at `a25eec4c`; the lane adds none and removes none |
| `verify-rcap-track-pathway-crosswalk.mjs` | FAIL — **pre-existing at the base**; `data/rcap-ledger/track-pathway-crosswalk.json` is a stale generated artifact. Confirmed FAIL in a clean base worktree with the identical message |
| `verify-rcap-verifier-dispositions.mjs` | FAIL — **lane-caused**; the three new verifier scripts have no register entry. The register and `package.json` are captain-owned; the exact patch is filed. This is the only lane-caused failure |
| `npm test` | exits 1 at `verify-rcap-track-pathway-crosswalk.mjs`, the pre-existing failure above |

The c2/c3 failures are NV and ND compiled-profile fingerprint drift in lane C's
own committed provenance records. They are not this lane's paths, and the
delta against a clean base worktree is empty in both directions — proven by
diffing the two failure lists rather than asserted.

`npm test` was first blocked earlier in the chain by an environment gap, not a
code one: the pinned Playwright expects Chromium revision 1223 and the image
carries 1194, so `scripts/security/test-sign-out-origin.mjs` could not launch a
browser. This is the same gap the captain's lane-assignment record documents. It
was bridged **in the execution environment only** — symlinks under
`/opt/pw-browsers` giving the expected revision path the binaries the image
already has. No repository file was changed, no browser-dependent check was
weakened, skipped or quarantined, and the blocked security test then passed
against a real Chromium. With that bridge in place the chain runs on to the
pre-existing crosswalk failure above.

## Invariants proven

- **The selected route requires filing; the rejected one does not**, and the
  rejection is re-checked against the closure ledger, the decision record and
  the route contract on every verifier run.
- **Fails closed** on an unestablished conviction, offence level, clean period
  or § 12-60.1-04(1)(c)/(d) finding; on all three statutory bars; on every
  required fact, per ground; and on a missing filing destination, which gets its
  own refusal code because a guessed destination misdirects paper.
- **Relief does not exceed the statute.** Chapter 12-60.1 reaches court and
  prosecution records and not BCI or CJDISS data. The default agency-wide relief
  is asserted absent; the order states what it does not reach.
- **No invented fee, hearing or deadline.** A test asserts no dollar figure
  appears anywhere in the packet.
- **Deterministic**, including under a reordered fact object; artifacts
  re-derive byte for byte.
- **Filing-readable**: every line inside the 78-character Courier measure, no
  page over 46 lines, no page opening or closing on a blank line, no split or
  orphaned signature block, unique section numerals, and long names, addresses,
  captions and narratives surviving wrapping intact.
- **Authority can go stale**: a pinned specification hash that no longer matches
  refuses; drift in the compiled ND profile version or in either bound source
  hash fails the verifier; a review performed against different artifact bytes
  is reported stale.
- **Screening may be anonymous; a Briefcase may not.** The pending row starts
  unowned and carries no payment-allowed claim; `consumer_briefcase_items.user_id`
  is asserted NOT NULL.
- **The claim is atomic and exactly-once.** Two simultaneous claimants race;
  exactly one wins; a later claimant cannot take over.
- **Private delivery**: anonymous 401, different participant 403 on ownership,
  wrong matter 403 on ownership, owner receives bytes hashing to the reviewed
  artifact, repeat download consumes nothing.
- **Payment idempotency**: the provider receipt cannot be replayed onto a second
  matter, and a hand-written paid status is refused by the database.
- **Commercial status stays closed.** All nine admission points of the shipped
  `admitCommercialAction` gate deny this route, before and after the synthetic
  payment. A body asserting its own authority has its claim keys rejected.

## Exact blockers

1. **Legal authority is pending, and only the decision owner can move it.** No
   committed legal-authority route contract exists for Chapter 12-60.1
   conviction sealing; `src/lib/legal-authority/routes/` carries one North
   Dakota contract and it is the non-filing § 12-60.1-05 route. This blocks
   `COMPLETE_PACKET_PROVEN` and is meant to.
2. **The Master Library extract is not mounted in this lane's environment.**
   `RCAP_BUNDLE_EXTRACT` is unset and no extract directory exists, so the two
   bound source hashes were confirmed from two agreeing committed records rather
   than recomputed from the bytes. Both sources are recorded
   `heldInRepository: false`, which the Grade-A contract counts as missing
   proof — the correct fail-closed answer. Source-freshness review is blocked on
   the same fact (the research guide carries `REV-UNKNOWN`).
3. **Output-level legal approval is left `pending`.** Lane D produced the review
   and traced every operative sentence to committed authority, but whether a
   lane-internal review is the approval the contract means is the captain's and
   counsel's decision, not the lane's.
4. **`provider.imageDigest` divergence.** The registry names the hosted worker
   image; this lane's artifact was produced by the composer and PDF renderer
   recorded in the specification. Both facts are stated; the captain reconciles.
5. **Pre-existing c2/c3 failures at the base**, described above. Outside this
   lane's paths.
6. **`verify-rcap-verifier-dispositions.mjs` is red on this branch and green at
   the base**, because Lane D added three verifier scripts and that verifier
   requires every script in `scripts/` to carry a recorded disposition. Both the
   register and `package.json` are captain-owned, so the lane reports the exact
   change rather than making it. This is the only lane-caused regression in the
   repository's own test chain, and the patch request below closes it.

None of these blocked a deliverable. Everything the lane was asked to deliver is
delivered.

## Captain patch requests

1. **Shared renderer** —
   `docs/rcap/grade-a/north-dakota/CAPTAIN_PATCH_REQUEST_SHARED_RENDERER.md`,
   isolated in commit `066200df`, with a 367-check byte-preservation proof. If
   declined, this packet must not be admitted: without it the petition asks for
   agency-wide relief Chapter 12-60.1 does not grant.
2. **Verifier-dispositions register (and, optionally, the npm test chain)** —
   `docs/rcap/grade-a/north-dakota/CAPTAIN_PATCH_REQUEST_REGISTRY.json`,
   machine-readable, with the exact three register entries, the counts delta,
   and the exact npm-test-chain string and placement. It offers two options:
   wire the four scripts (register entries plus the chain addition, which must
   land together or the dispositions verifier stays red for the opposite
   reason), or register them `keep_available` with no `package.json` change.
   The lane recommends wiring, because otherwise a future edit to the shared
   pleading renderer, the ND state pack or the specification would not be caught
   by CI.
3. **Grade-A fulfillment registry record** —
   `data/rcap-lane-d/north-dakota/nd-chapter-12-60-1-conviction-sealing/fulfillment-record-patch.json`,
   machine-readable, computed from what this lane actually produced. It fills
   six of the nine missing proofs, names the three it cannot, and states the
   expected post-patch state: still `INCOMPLETE`, still
   `not_commercially_eligible`. The registry was not edited.

## Production

Not touched. No deployment, no migration, no live Stripe operation, no real
participant, no sponsored-credit consumption, no environment change, no domain
activation. No private source bytes, tokens, secrets, participant data, signed
URLs or vendor material are committed.
