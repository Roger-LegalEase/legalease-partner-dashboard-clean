# Lane D — North Dakota route selection

Sprint: national Grade-A · Wave 2
Branch: `claude/grade-a-68h-lane-d`
Base: `a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef`

## Selected

**`ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1`** — Petition to
Seal Criminal Records under N.D.C.C. Chapter 12-60.1.

### Why it is the route that actually requires participant filing

N.D.C.C. § 12-60.1-03 makes the participant do three things, in order, or
nothing happens:

1. serve the prosecuting attorney (§ 12-60.1-03(4), via N.D.R.Crim.P. 49 and
   N.D.R.Civ.P. 5(b));
2. file a petition in the existing criminal case (§ 12-60.1-03(1));
3. file a proposed order with it — mandatory under § 12-60.1-03(3); a petition
   without one is incomplete.

There is no automatic branch, no clerk-side implementation period, and no
outcome that arrives without a filing. That is exactly the property the Grade-A
sprint asked Lane D to find.

### Why it is the highest-readiness such route

Of the five North Dakota routes carrying a Grade-A fulfillment record:

| Route | Filing required | Readiness |
|---|---|---|
| `general-conviction-sealing-under-n-d-c-c-chapter-12-60-1` | yes | **highest** — three grounds fully stated in the state pack, per-ground required-field lists, filing instructions with the petition's own content requirements, hearing and refiling rules, a committed registry excerpt naming the authority, venue and destination, and a pre-existing runtime pleading configuration and passing verifier |
| `dui-record-sealing-under-the-separate-dui-statute` | yes | second — § 39-08-01.6 has a configuration but a thinner committed fact set, and the state pack notes the correct court (municipal or district) is case-dependent |
| `first-offense-possession-sealing` | motion required | lower — § 19-03.1-23(9) sealing on motion, but no committed document set |
| `deferred-imposition-dismissal-and-sealing` | unclear | lower — relief follows the court's own dismissal order after successful probation; the state pack warns the final order must be confirmed rather than assumed |
| `marijuana-specific-summary-pardon-or-sealing-relief` | no court filing | excluded — the Summary Pardon Application is an executive-branch process, not a court filing |

Chapter 12-60.1 is the only one where every Grade-A element — filing,
proposed order, service, destination, fee posture, copies, post-filing steps and
hearing/objection stop conditions — is already stated in committed authority.

## Rejected as the composed commercial reference

**`ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05`.**

Current authority classifies it non-filing, in three places that agree:

1. **The legal-authority route contract**
   (`src/lib/legal-authority/routes/national-report-2026-08-28.json`), decision
   `NATIONAL-2026-08-28-LA-IMM-03`, rule
   `ND-12-60-1-05-AUTOMATIC-CLOSURE-VERIFY`: `stage: automatic`,
   `outcomeMode: automatic_relief`, `packetFamily: null`. Its own timing text
   says the participant "waits 61 complete days from the qualifying
   disposition, verifies on day 62 or the next business day, and **files
   nothing** to obtain the closure itself."
2. **The signed reclassification** `ND-2026-08-28-NO-PARTICIPANT-FILING`
   recorded in `data/rcap-ledger/sellable-pathway-closure.json`, which moved the
   route from `paid_packet_intended` to `non_filing_guidance` for the reason
   `no_participant_filing`. The route row reads `sellable: false`,
   `creditConsumable: false`.
3. **The absence of a Grade-A fulfillment record.** The registry carries five ND
   routes and this is not one of them, because a non-filing route has no packet
   to prove.

There is a pre-August-1-2025 branch on that route, and it does involve a filing.
It is still not this lane's reference, for a reason the same decision states in
its own words:

> "The amendment governs dispositions entered on or after 2025-08-01. A
> disposition before that date takes **the official petition and proposed order**
> instead, which is a service branch on this route and **is not built**."

Two things follow. That branch is an **official-form** branch, not a composed
pleading — so composing a pleading for it would be substituting a
LegalEase-authored document for the official petition the authority names. And
it is expressly not built, so building it would be a lane widening its own
envelope. Lane D did neither.

The rejection is not a claim made once in prose. `scripts/verify-nd-grade-a-packet.mjs`
asserts, on every run, that the closure ledger still classifies the route
`non_filing_guidance` on the signed reclassification, that its route row is still
unsellable and non-credit-consuming, that the decision on record still governs
that route and not the selected one, that the decision still records the
pre-2025-08-01 branch as not built, and that the route contract is still
`automatic_relief` at the `automatic` stage. If any of that moves, the test
fails and the selection is re-decided rather than silently inherited.

## Reuse from the prior lane branch

`claude/north-dakota-grade-a-packet-wiludq` was used only as the prompt permits:
for reusable composer, PDF, fixture and verifier engineering — the character
paginator matched to a monospaced PDF measure, the keep-together rule for
signature blocks, the wrap-and-hard-split routine, the placeholder scan, the
locale-free date formatter, the deterministic-artifact generator with `--check`,
and the shape of the ephemeral-PostgreSQL-plus-Chromium product-path proof.

None of its legal content was carried over. Its packet was the § 12-60.1-05
pre-2025-08-01 petition, which this lane rejects for the reasons above; every
operative sentence here is re-derived from Chapter 12-60.1 authority.
