# Lane B — authority coverage and the evidence record

Owner: Terminal B (guidance, exclusions and exact deferrals)
Base: `df3d8607e8a0c723e23c346f1cd725c17a2c22b0`
Scope: all of lane B — 33 states, 39 jobs, 73 tracks

## Outcome

Every one of the 73 assigned tracks reaches exactly one supported treatment.

| Treatment | Tracks |
|---|---:|
| `complete_guidance` | 64 |
| `exact_supported_deferral` | 9 |
| `deliberate_scope_exclusion` | 0 |
| **Total** | **73** |

**No lane-B track is blocked on operator source.** There is no evidence gap in
this lane. Every deferral below rests on a stated legal or documentary condition
that the committed record actually establishes — not on a missing file.

## Correction to the first version of this record

The first version reported that five tracks had no committed authority and were
blocked on operator source: `IN:in_auto_expungement`, `MD:md_10104_pre_service`,
`MI:mi_arrest_acquittal_dismissal`, `MI:mi_arrest_no_charge` and
`MI:mi_deferral_status`.

That finding was scoped to the compiled profiles under
`src/lib/rcap-engine/compiled/profiles/`, and for those files it was accurate —
none of the five has a pathway or source section there. The inference drawn from
it was wrong, because the compiled profiles are not the authority universe.

The governed **Master Library** carries a per-track legal design memo for every
one of them, at `data/record-clearing/legal-design-intake/<ST>.memo.json` on
`feat/record-clearing-production-integration` at the pinned tip `3b6f4c10` — the
same tip every lane-B job already names in its `sourceDependency`. The memos are
keyed by exact `trackId`, and all 51 states have one. All five were built from
those memos and are terminalized.

`MI:mi_deferral_status` is the clearest example of the original error: the
compiled profile has no mention of deferrals at all, while the memo classifies it
as a non-relief routing node with ten citations — MCL 333.7411, 762.11 to 762.15,
769.4a, 436.1703, 600.1070, 600.1209, 750.350a, 750.430, 780.621(2) and
780.621d(7)(d).

## What each memo carries

Per track: `legalName`, `publicName`, `controllingAuthority` (statutory citation
list plus a summary), `destination` (kind, name, detail), `outputStrategy`,
`eligibleRecordTypes`, `eligibleDispositions`, `exclusions`, `waitingPeriods`,
`components`, `participantInputs`, `supportingDocuments`,
`manualCompletionItems`, `selfHelpStopConditions`, `unresolvedQuestions`,
`officialSources`, and `legalDesignDecision` with its status, rationale and
limitations.

Two kinds of memo content are binding on participant copy and are followed rather
than summarised away:

- `legalDesignDecision.limitations` — for example Michigan requires "set aside"
  rather than "expunge", Georgia's statutes have not used "expungement" since
  1 July 2013, Connecticut says "erasure", New Hampshire says "annulment", and
  Montana keeps removal, expungement and sealing as three distinct things.
- `selfHelpStopConditions` — the points at which a self-help route must stop.

Where a memo marks `destination.name` as "Not applicable" because the node
explains a disposition rather than granting relief, the participant is told what
the disposition means for them and routed to the mechanism that does apply. Where
a memo names no usable destination at all, a real one is supplied from elsewhere
in the same committed memo rather than invented — Hawaii is the one instance, and
the Criminal Justice Data Center is named there as the place to verify a record
and explicitly not as a place to apply.

## The nine deferrals and what supports each

Each has its own statement under this directory naming the track literally, the
exact supported reason, and what the participant is told.

| State | Track | Supported condition |
|---|---|---|
| AR | `ar-misdemeanor-dwi-seal` | Waiting period unsettled: § 16-90-1405(b)(2) refers out to the § 5-65-111 lookback and two readings are live at once — the 2026 *Coleman* appellate reading against the statutory text with existing ACIC forms and practice |
| KY | `ky_felony_vacatur_expungement` | Two versions of the KRS 431.073(1)(a) eligibility list are published concurrently, with a 30 April 2027 changeover adding KRS 286.13-150 |
| KY | `ky_felony_expungement_after_pardon` | Eligibility turns on characterising a full pardon under KRS 431.073(1)(c) — a document LegalEase never sees and does not authenticate |
| OK | `ok_clean_slate` | Administration does not exist (Bureau has until 1 Nov 2027 to begin, 1 Nov 2029 to finish) and § 18b(B) confers eligibility "subject to the availability of funds" with no determinable appropriation |
| TX | `tx_exp_acquittal` | Filing cost not stateable: art. 102.006 repealed 1 Sep 2025, temporarily re-added with an expiry, replaced by art. 102.0061 from 1 Jan 2026, which sets a county-varying ex parte civil fee |
| TX | `tx_exp_dismissed` | Same fee condition, plus further release-blocking questions in the governing review |
| WV | `wv_conv_multiple_misdemeanors` | Forum unresolved: § 61-11-26(a)(1) names the convicting circuit court while the (d) proviso requires grouping by circuit court, and convictions spanning circuits are unanswered |
| WV | `wv_conv_nonviolent_felony` | § 61-11-26(p)(5) makes two of the four nonviolent-felony limbs express findings for the circuit court, not statements a self-help service makes |
| WV | `wv_conv_single_misdemeanor` | Which of the five published Judiciary forms is the operative § 61-11-26 misdemeanour petition is unsettled |

None of these is "coming soon". In every case the participant still receives the
mechanism, the exact destination, the settled timing, what to gather, the next
step, and a handoff carrying the specific question to ask.

## Where authority is genuinely thin, and what was done instead

Four routes could not be described fully from the committed record. None was
filled in with a plausible substitute, and each says so to the participant:

- **TN `tn_trafficking_40_32_105`** — the current text of T.C.A. § 40-32-105 could
  not be retrieved from any official source on 6 August 2026; the Tennessee Code
  is a licensed publication. That the route exists rests on official
  cross-references in the enacted Public Chapter 268. No eligibility condition,
  waiting period, fee, form or court is stated.
- **ND `nd-unconstitutional-arrest-expungement-routing`** — *State v. Howe*,
  308 N.W.2d 743 (N.D. 1981), is named by the state courts' own guide but is not
  published at ndcourts.gov. No unofficial mirror was used to supply the standard.
- **MD `md_10103_1_automatic`** — the step following a law enforcement unit's
  failure to complete a § 10-103.1 expungement is not identified in the
  controlling review, and no filing was invented for it.
- **OH `oh_2953_39_prosecutor`** — the full text of ORC 2953.39 was not read at
  source, leaving it unknown whether a person can prompt a prosecutor and what
  follows a refusal. The route deliberately does not end at the prosecutor's
  door, because waiting on something you cannot start is the worst outcome
  available.

## Integration handoff

This lane produced data, not a rendering path. Nothing in `src/**` reads
`data/rcap-all50/guidance-packets/` yet.

The Briefcase surface at `src/app/briefcase/[packetId]/page.tsx` already renders
guidance-only items as an accessible ordered list from `item.nextSteps` and
suppresses the filing stepper, payment and generation for them, so the surface
exists. What does not exist is the loader that maps these packet files onto that
surface. `src/lib/rcap/all50-internal-preview.ts` shows the established pattern —
it reads sibling directories under `data/rcap-all50/` with `fs` at runtime.

Both languages are committed as data rather than resolved at runtime, because
`resolveRuntimeText` only translates strings already present in
`EXACT_ENGLISH_INDEX`. A loader must read `es` from these files directly.

## Note on path shape

The dispatch describes owned paths as
`data/rcap-all50/guidance-packets/<state>/**`, but the frozen shared verifier
globs that directory flat and non-recursively, skipping `_`-prefixed files. Flat
`<st>.json` files were used so the verifier — a shared artifact this lane must not
modify — keeps working. Nested directories would require changing it first.

## What the participant is told

Nothing in this record reaches a participant. It exists so the authority basis
for each track is visible and auditable.
