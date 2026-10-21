# Lane D — status and evidence

Sprint `2026-08-29-national-grade-a` · North Dakota composed-pleading Grade-A
reference packet.

## Environment identity gate

Run before any repository analysis or file change, and re-run before this
record was written.

| Field | Observed | Result |
| --- | --- | --- |
| Working root | `/home/user/legalease-partner-dashboard-clean` | matches |
| `git rev-parse --show-toplevel` | same path | matches |
| Repository | `Roger-LegalEase/legalease-partner-dashboard-clean` | matches |
| `origin` (fetch and push) | `https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean` | matches |
| Branch | `claude/north-dakota-grade-a-packet-wiludq` | matches the assigned lane branch |
| Base HEAD at lane start | `07675789a80e732d2b835c1e8ba2092b39201b79` | equal to `origin/claude/north-dakota-grade-a-packet-wiludq` at start |
| Production | not connected, not written | untouched |

Two envelope fields could not be compared, and are recorded rather than
inferred:

- **`BASE_SHA` / `REMOTE_BASE_SHA`.** The lane envelope supplied the literal
  placeholders `<captain-provided SHA>`. No captain-provided SHA exists to
  compare against. The observed base is recorded above. Repository, remote,
  branch and worktree all match, so this is **not** an environment misroute; it
  is a missing envelope value.
- **`OWNED_PATHS` / `PROHIBITED_SHARED_PATHS`.** Also placeholders. The lane
  therefore confined itself to new lane-local paths plus one additive change to
  a shared renderer, listed under *Owned paths* below, and edited no ledger,
  registry, denominator, launch graph, migration ordering, lock file, freeze
  record or deployment record.

**Private source corpus: absent.** `private/` does not exist in this checkout,
so `private/source-corpus-environment.txt`, the 51-jurisdiction / 499-file /
329-PDF counts, and the archive SHA-256 could not be confirmed. This lane did
not need it: every operative North Dakota claim in the packet traces to
authority already committed to this repository — the ND state pack, the compiled
`ND-north-dakota` engine profile, and `northDakotaAll50BuildMetadata`, which
carries the Nationwide file SHA-256s the specification pins. Any step that would
need the raw PDFs themselves (a new field map, an overlay against the official
form bytes, a source-freshness review) is blocked here and is recorded as such.

## Status

**COMPLETE** for the North Dakota composed-pleading reference packet on the
N.D.C.C. § 12-60.1-05 petition branch, as candidate evidence.

## Deliverables

| Required deliverable | Where |
| --- | --- |
| 1. Authority and route binding | `docs/rcap/lane-d/ND_COMPOSED_PLEADING_AUTHORITY.md` |
| 2. Versioned packet specification | `src/lib/record-clearing/north-dakota-nonconviction-spec.ts`; canonical bytes at `data/rcap-lane-d/north-dakota/nd-nonconviction-closing-petition/spec.json` |
| 3. Complete pleading set | 4 documents, 7 pages — see the document manifest below |
| 4. Composer | `src/lib/record-clearing/composers/nd-composed-packet-composer.ts` |
| 5. Fixture and artifact | `fixtures/*.json`, `rendered/canonical.pdf`, `rendered/render-report.json` |
| 6. Review | `docs/rcap/lane-d/ND_COMPOSED_PACKET_REVIEW.json` |
| 7. Real product proof | `scripts/verify-nd-grade-a-product-path.mjs` |

## Identity and hashes

| Thing | Value |
| --- | --- |
| Specification | `nd-nonconviction-closing-petition@1.0.0` |
| Specification SHA-256 | `2280f6038f20f26e3d7beea08be82b6d5d4e7f418e04a7b4133915b05fd8aa6b` |
| `spec.json` SHA-256 | `02c479ecb30da60097fb13cd7ab6d83d0a3b100ba5c381fa7dc374233dd0aa82` |
| `rendered/canonical.pdf` SHA-256 | `dd41f0ef635636dffdaeb24bfaed5b0c746fe82c3b1b07c5f4e0897a24b0310a` (16,363 bytes, `application/pdf`, 7 pages) |
| `rendered/canonical.txt` SHA-256 | `51b776944b610c324554c7f77588e016a606f843ee52da4c51a88c18514f06ed` |
| Composer version | `1.0.0` |
| Provider | compiled profile `ND-north-dakota` `2026-06-19-source-conversion-1`, corpus `c205813b…f1b8ede7` |

## Document manifest

| # | Document | Audience | Requirement | Pages |
| --- | --- | --- | --- | --- |
| 1 | How to File This Packet | participant | required | 1–2 |
| 2 | Petition to Close Nonconviction Records | court | required | 3–5 |
| 3 | [Proposed] Order Closing Nonconviction Records | court | required | 6 |
| 4 | Proof of Service on the Prosecuting Attorney | court | conditional — filed only if the judge requires service | 7 |

The petition carries the caption and court identification, jurisdiction and
venue, parties, facts and case history, eligibility allegations, requested
relief, and the verification and signature block. Filing destination, fee (none
may be charged), copies, post-filing timing (the court must enter the closing
order within 10 days), relief scope and post-closing access limits are all in
the packet and all sourced.

## Tests run

| Command | Result |
| --- | --- |
| `node scripts/verify-nd-composed-packet.mjs` | PASS — 1035 checks |
| `node scripts/verify-nd-grade-a-product-path.mjs` | PASS — 42 checks (ephemeral PostgreSQL + Chromium) |
| `node scripts/generate-nd-composed-packet-artifacts.mjs --check` | PASS — committed artifacts re-derive byte for byte |
| `node scripts/verify-nd-pleading-state.mjs` | PASS (pre-existing ND route unaffected) |
| `node scripts/verify-pleading-state.mjs` (PA) | PASS |
| `node scripts/verify-dc-pleading-state.mjs` | PASS |
| `node scripts/verify-ok-pleading-state.mjs` | PASS |
| `node scripts/verify-wy-pleading-state.mjs` | PASS |
| `node scripts/verify-rcap-no-null-presentation.mjs` | PASS |
| `node scripts/verify-rcap-terminalize-c2.mjs` | PASS |
| `node scripts/verify-rcap-terminalize-c3.mjs` | PASS |
| `npx tsc --noEmit` | no new errors |

## Invariants proven

- **The date split is exact.** `2025-07-31` composes a packet; `2025-08-01`
  refuses one and explains the 61-day automatic closing; the boundary day itself
  is on the automatic side. An absent, malformed or impossible order date
  resolves to `unresolved`, never to a branch.
- **Fails closed.** Every required fact is dropped one at a time and must be
  named in the refusal. A missing judicial district or clerk destination has its
  own refusal code, because a guessed filing destination misdirects paper.
- **No unsupported legal language.** The shared renderer's default agency-wide
  relief is asserted absent; the order carries the court-system-only scope; no
  hearing, objection window or appearance instruction is asserted, and the
  packet says the source prescribes none.
- **No placeholder proposed order, no missing service component.** The order is
  a required document with three operative paragraphs; the proof of service is
  present and labelled conditional with the condition on its face.
- **No wrong-state fallback.** Eight other-state boilerplate strings are
  asserted absent; four required North Dakota terms are asserted present.
- **Deterministic.** Same facts, same bytes — including under a reordered fact
  object. The committed artifacts re-derive byte for byte.
- **Filing-readable.** Every line fits the 78-character Courier measure, no page
  exceeds 46 lines, no page opens or closes on a blank line, no signature block
  is split or orphaned, and long names, addresses, captions and allegations
  survive wrapping intact.
- **Authority can go stale.** A pinned specification hash that no longer matches
  refuses the compose; drift in the compiled ND profile version, the ND source
  corpus hash, or a pinned source file hash fails the verifier; a review
  performed against different artifact bytes is reported stale.
- **Screening may be anonymous; a Briefcase may not.**
  `consumer_briefcase_items.user_id` is asserted NOT NULL, and the pending
  screening result starts unowned.
- **The claim is atomic.** Two simultaneous conditional claims, exactly one
  winner; a later claimant cannot take over a claimed row.
- **Private delivery.** No session is 401; a different participant is 403 on
  ownership; a job bound to a matter the participant does not own is 403 on
  ownership; the owner receives bytes that hash to the reviewed artifact; the
  repeat download consumes nothing.
- **Payment is server-evidenced.** The provider receipt cannot be replayed onto
  a second matter and a hand-written paid status is refused by the database.
- **Candidate evidence only.** No route flag, payment behaviour, credit
  consumption, denominator, launch record or deployment record was touched.

## Owned paths

New, lane-local:

- `src/lib/record-clearing/north-dakota-nonconviction-spec.ts`
- `src/lib/record-clearing/north-dakota-nonconviction-config.ts`
- `src/lib/record-clearing/composers/nd-composed-packet-composer.ts`
- `scripts/generate-nd-composed-packet-artifacts.mjs`
- `scripts/verify-nd-composed-packet.mjs`
- `scripts/verify-nd-grade-a-product-path.mjs`
- `scripts/lib/nd-composed-packet-pdf.mjs`
- `data/rcap-lane-d/north-dakota/nd-nonconviction-closing-petition/**`
- `docs/rcap/lane-d/**`

Shared file changed, additively:

- `src/lib/record-clearing/renderers/custom-pleading-renderer.ts` — two optional
  presentation fields, `reliefClauses` and `proposedOrderClauses`. Omitted, every
  existing state renders byte for byte as before; the five state pleading
  verifiers and lane C2/C3 all pass unchanged.

`data/rcap-lane-d/` is a new top-level path chosen deliberately:
`data/rcap-all50/pleadings/north-dakota/` and
`data/rcap-all50/composed-routes/` are enumerated by lane C's verifiers against
the terminalization ledger, and adding a track under either would have made this
lane's artifacts another lane's failure.

## Shared-file patch requests

None outstanding. The one shared-file change is additive, byte-preserving for
every existing consumer, and already validated by the owning lanes' verifiers.

If the captain prefers the artifacts to live under `data/rcap-all50/`, that is a
one-line path change here plus a ledger entry the captain owns; this lane did
not write to the ledger.

## Exact blockers

1. **Private Nationwide corpus absent.** `private/` is not in this checkout, so
   the corpus environment file, jurisdiction/file/PDF counts, and archive
   SHA-256 could not be confirmed. Blocks only work that needs the raw official
   PDF bytes: a field map or overlay against `Close-Nonconviction-Records.pdf`,
   and the source-freshness review. Does not block this packet, whose authority
   is committed in-repo.
2. **Named shared authorities not present at this base.**
   `docs/PRODUCT_CONTRACT.md`, the participant-ownership and claim-boundary ADR,
   the national legal decision report dated 2026-08-28, and the Grade-A
   fulfilment and commercial-integrity records do not exist in this repository at
   `07675789`. The lane preserved the controlling invariant as stated in its own
   brief — screening may be anonymous, a Briefcase may not, a pending result
   becomes a matter only on a secure atomic claim — and proved it against the
   committed schema and delivery core. If those documents exist elsewhere, the
   lane's conformance to them is unverified.
3. **Envelope placeholders.** `BASE_SHA`, `REMOTE_BASE_SHA`, `OWNED_PATHS` and
   `PROHIBITED_SHARED_PATHS` were supplied as literal placeholders. Recorded
   above; path selection was made conservatively in their absence.
4. **Counsel review and source-freshness review pending.** Both remain blockers
   for `approved_for_live` and `live`. Neither is a blocker for this lane's
   candidate evidence, per `AGENTS.md`.

None of these blocked a deliverable. Everything in the required list is done.

## Next integration step

For the captain: bind
`ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05` to
`nd-nonconviction-closing-petition@1.0.0` in whichever registry the captain owns,
and decide whether the artifacts stay at `data/rcap-lane-d/` or move under
`data/rcap-all50/` with a ledger entry. Route reachability, payment posture and
the commercial denominator stay with Lane B and the captain; this lane opened
none of them.

## Production

Not touched. No deploy, no live Supabase migration, no RLS or auth change, no
Stripe live-mode behaviour, no production environment variable or secret.

---

# Captain resolution (integration)

The blockers this lane recorded as envelope placeholders are resolved. The lane
ran without a real envelope and said so; this section supplies what was missing
and records what the captain decided on integration.

| Envelope field | Resolved value |
|---|---|
| `BASE_SHA` | `0cad61625a74665db23ac64988c301e48909cf81` |
| `REMOTE_BASE_SHA` | `0cad61625a74665db23ac64988c301e48909cf81` (remote tip of `claude/new-session-7rsiqq`, confirmed unmoved at integration) |
| `LANE_BRANCH` | `claude/north-dakota-grade-a-packet-wiludq` |
| `OWNED_PATHS` | `data/rcap-lane-d/**`, `docs/rcap/lane-d/**`, `src/lib/record-clearing/north-dakota-nonconviction-*.ts`, `src/lib/record-clearing/composers/nd-composed-packet-composer.ts`, `scripts/generate-nd-composed-packet-artifacts.mjs`, `scripts/lib/nd-composed-packet-pdf.mjs`, `scripts/verify-nd-composed-packet.mjs`, `scripts/verify-nd-grade-a-product-path.mjs` |
| `PROHIBITED_SHARED_PATHS` | `package.json`, `package-lock.json`, `data/rcap-verifier-dispositions.json`, `data/rcap-ledger/**`, `supabase/migrations/**` — captain-applied |

The full envelope is `docs/rcap/grade-a/captain/LANE_ASSIGNMENT_RECORD.md`.

## Source evidence was reverified, not inherited

The lane pinned `Close-Nonconviction-Records.pdf` at
`21b3a790b35f35c345560d9840bf39ca6f1e46cf1b9166c0e5ae2cf8ff7e4d7f`. That hash
was recomputed at integration from the mounted Master Library corpus
(`ND__FORM__EXPERTISE__instructions-for-petition-to-close-nonconviction-records__REV-2025-08-01__EN.pdf`)
and matches. The evidence is therefore accepted on the bytes, not on the ledger
row that asserted it.

## Classification: IMPLEMENTATION_COMPLETE, COMMERCIAL_HOLD

North Dakota is implementation-complete and commercially held. The two are
recorded separately and deliberately, because finishing a build is not
permission to sell it.

The hold is not a formality here. On the controlling base, signed
reclassification `ND-2026-08-28-NO-PARTICIPANT-FILING` moved
`ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05` from
`paid_packet_intended` to `non_filing_guidance`, on the ground that the route's
legal-authority contract carries `outcomeMode automatic_relief` with
`packetFamily null` — the relief arrives without the participant filing
anything. The route is consequently absent from the launch graph, so the
regenerated fulfillment registry holds no record for it, and the Grade-A
authority denies it by the absence of a record rather than by a special case.

## The open legal question this integration does not decide

There is a real tension between this lane's research and that reclassification,
and it is recorded rather than resolved.

The reclassification treats the route as carrying no participant filing. This
lane's authority document reads N.D.C.C. § 12-60.1-05 as splitting on the date
the order of nonconviction was entered: on or after 2025-08-01 the court closes
the record automatically after 61 days and there is nothing to file, but before
2025-08-01 the participant must petition and the court must then order closure
within 10 days. If that reading is right, the automatic branch is non-filing and
the petition branch is not, and a single whole-route classification cannot be
correct for both.

The reclassification's own evidence anticipates this: it records the route as
"the one row the contradiction register held as blocked on the closure
vocabulary, pending its branches being classified separately," and then
classifies the whole route rather than the branches.

This is a question for counsel, not for integration. Nothing here changes the
signed reclassification, and nothing here makes the route sellable. The packet
is integrated as implementation-complete reference work so that the composed
output exists and is testable if the petition branch is later classified
separately; if counsel confirms the whole-route non-filing reading, the packet
is reference material that is never sold, which is a safe outcome and the one
currently in force.
