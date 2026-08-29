# Lane D — North Dakota composed-pleading authority and route binding

Sprint: `2026-08-29-national-grade-a`
Lane: D — North Dakota composed-pleading Grade-A reference packet
Branch: `claude/north-dakota-grade-a-packet-wiludq`

## 1. Route binding

| Field | Value |
| --- | --- |
| Jurisdiction | ND |
| Route id | `ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05` |
| State-pack pathway | `nonconviction_closing_petition` |
| Effective-date branch | order of nonconviction entered **before 2025-08-01** |
| Specification | `nd-nonconviction-closing-petition@1.0.0` |
| Specification SHA-256 | `2280f6038f20f26e3d7beea08be82b6d5d4e7f418e04a7b4133915b05fd8aa6b` |
| Composer version | `1.0.0` |
| Compiled profile | `ND-north-dakota`, `2026-06-19-source-conversion-1` |
| Source corpus SHA-256 | `c205813b263764fe44648ba577d91e8fadb52b55974b7fe154495bbff1b8ede7` |

### The date split, exactly

N.D.C.C. § 12-60.1-05 splits on the date the order of nonconviction was entered.
The split decides whether the participant files anything at all, so it is
resolved before a packet exists rather than inside one.

| Order of nonconviction | Branch | Packet |
| --- | --- | --- |
| on or after **2025-08-01** | `automatic_close_61_day` — the court closes the court record 61 days after the order | none; the composer refuses and says why |
| before **2025-08-01** | `petition_to_close_nonconviction_records` — the court must enter the closing order within 10 days, no filing fee | this packet |

The boundary date itself belongs to the automatic branch, because the source
says "on or after August 1, 2025". `2025-07-31` composes a packet; `2025-08-01`
does not. Both are asserted in `scripts/verify-nd-composed-packet.mjs`.

All four statutory exclusions block **both** branches: the dismissal was part of
a plea agreement involving conviction on another offense; the dismissal was due
to a finding the person was not fit to proceed; the not-guilty verdict was due
to lack of criminal responsibility; the case was appealed.

The single authority on all of this is
`resolveNdNonconvictionRoute` in
`src/lib/record-clearing/north-dakota-nonconviction-spec.ts`. It fails closed:
an unestablished nonconviction status, or an absent, malformed, or impossible
order date returns `unresolved` rather than a branch.

## 2. Controlling legal-design authority

Every operative sentence in the packet traces to committed repository
authority. This lane commissioned no new legal research.

| Element | Source in this repository |
| --- | --- |
| Date split, definition of nonconviction | `src/lib/rcap/state-packs/north-dakota/eligibility-rules.ts` (`ndEligibilityRules[2]`) |
| Filing destination, conditional service, no fee | `filing-instructions.ts` (`ndFilingInstructions[7]`) |
| 61-day automatic close; 10-day order on petition | `waiting-periods.ts` (`nonconvictionAutomaticClose`, `nonconvictionPetitionClose`) |
| No filing fee | `fee-notes.ts` (`ndFeeNotes[0]`) |
| The four exclusions | `disqualifying-offenses.ts` (`ndDisqualifyingOffenseNotes[3]`) and the compiled ND profile, verbatim |
| Court-system-only relief scope; access after closing | compiled ND profile `ND-north-dakota.json`, filing-note section |
| Document type | `document-types.ts` (`nd_petition_to_close_nonconviction_records`) |
| Required fields | `required-fields.ts` (`ndRequiredFields.nonconviction_closing_petition`) |
| Safety language | `safety-language.ts` (`ndSafetyDisclaimer`) |

Source file identities the specification pins (SHA-256 from
`northDakotaAll50BuildMetadata`):

- `Close-Nonconviction-Records.pdf` — `21b3a790b35f35c345560d9840bf39ca6f1e46cf1b9166c0e5ae2cf8ff7e4d7f`
- `North Dakota Expungement : Sealing Reference for Wilma.rtf` — `68c9109532391768ba04b29801f6e7ed4dbee4e2905b9a79bb162b4cd7905a68`

## 3. Approved custom-pleading authority

`northDakotaAll50BuildMetadata.customPleadingSupport` records
`supported: true`, `status: draft_config_allowed`. `AGENTS.md` places custom
pleading drafting inside the build-first model, where visual, counsel and
source-freshness review are not blockers for build work and remain blockers for
`approved_for_live` and `live`.

The pre-existing sibling configuration, `ndConvictionSealingConfig`, is
untouched: this is a new route on the same state pack, not a fork of an existing
one. `scripts/verify-nd-pleading-state.mjs` still passes unchanged.

## 4. Why the shared renderer was extended rather than replaced

`renderCustomPleading` already composes a pleading body for PA, DC, ND, OK and
WY, and it was reused. Two of its defaults are wrong on this route and only on
this route: requested-relief clause (b) and the proposed order's operative
paragraph both direct **every criminal justice agency** holding the record to
act. Under § 12-60.1-05 the order reaches only records controlled by the North
Dakota court system. Rendering the default would assert relief the statute does
not grant.

Two optional presentation fields were added — `reliefClauses` and
`proposedOrderClauses`. Omitted, every existing state renders byte for byte as
before; `verify-rcap-terminalize-c3.mjs`, `verify-pleading-state.mjs`,
`verify-dc-pleading-state.mjs`, `verify-nd-pleading-state.mjs`,
`verify-ok-pleading-state.mjs`, `verify-wy-pleading-state.mjs` and
`verify-rcap-no-null-presentation.mjs` all pass unchanged.

No new legal engine, packet system, matter model, Briefcase, payment system,
sponsorship system, RCAP portal or Clinic product was created.

## 5. Source silences carried, not filled

1. **Verification statute** — no committed source ties one to this petition. The
   citation is held null, the penalty recital is suppressed, and the silence is
   a counsel flag.
2. **Subsection** — the committed sources identify a § 12-60.1-05 subsection
   only for the automatic branch. None is attributed to the petition branch.
3. **County to judicial district** — no committed source maps them.
   `ND_JUDICIAL_DISTRICT_BY_COUNTY` is empty by design; the judicial district and
   the clerk destination arrive as governed matter facts and a matter without
   them is refused rather than filed into a guessed district.
4. **Hearing and objection** — the source prescribes neither for this route.
   Neither is asserted; the packet says so in as many words.

## 6. Stop and handoff conditions

This lane stops and hands off rather than deciding, when:

- an operative legal claim would need a source not committed to this repository
  (the private Nationwide corpus is not present in this checkout — see
  `ND_LANE_D_STATUS.md`);
- a route flag, payment behaviour, credit consumption, launch record or
  commercial denominator would have to move — Lane B and the captain hold that
  authority, and this lane produces candidate evidence only;
- a shared registry, ledger, or generated manifest outside this lane's paths
  would have to change;
- `approved_for_live` or `live` would have to be asserted — counsel review and
  source-freshness review are still pending and are still blockers for both.

## 7. Commercial posture

Candidate evidence only. This packet opens no payment, sets no route flag, and
enters no denominator. `docs/rcap/lane-d/ND_COMPOSED_PACKET_REVIEW.json` records
`commercialPosture: candidate_evidence_only` and the verifier fails if that
changes.
