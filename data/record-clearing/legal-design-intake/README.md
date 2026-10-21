# Legal-design intake — all 50 states plus D.C.

One memo per jurisdiction. Drop a file named `<CODE>.memo.json` in this
directory, where `<CODE>` is the two-letter jurisdiction code (`AL` … `WY`,
plus `DC`). Nothing else in this directory is read as a memo.

Validate and import with:

```bash
npm run rcap:legal-design-intake
```

## What LegalEase is

A self-help packet generator. The court, clerk, prosecutor or agency is the
authority; LegalEase is not.

LegalEase asks the participant structured questions, relies on their answers,
generates the applicable packet, identifies documents they may need to obtain
and attach, and gives filing, fee, signature, notarization, service and
next-step instructions.

LegalEase does **not** require certified dispositions, criminal histories,
fingerprints or certificates before generating a packet; does not accept
uploads of those records as part of fulfillment; does not inspect or
authenticate them; does not independently determine eligibility; does not
decide whether a participant's evidence is sufficient; does not approve an
individual filing; and does not guarantee court or agency action.

The validator enforces this. A memo carrying `documentUpload`, `staffApproval`,
`eligibilityDetermination` or any sibling key is rejected rather than
reinterpreted.

## The five kinds of requirement

The schema keeps these apart because they behave differently.

| Kind | Field | Effect |
|---|---|---|
| Generation requirement | `participantInputs` | A question LegalEase asks. Its answer drives what is generated. |
| Participant filing requirement | `supportingDocuments` | A record the participant obtains and attaches. **Never delays generation.** |
| Manual completion item | `manualCompletionItems` | A field the packet leaves blank on purpose. |
| Self-help boundary | `selfHelpStopConditions` | Where automated assistance ends. |
| Legal-design blocker | a classified limitation | The only one that stops a track being built. |

The distinction that matters most: **"the court requires a certified
disposition" is a participant filing requirement, not a packet-generation
blocker.** Ask the participant for the disposition information, generate from
their answer, and list the certified disposition as something to obtain and
attach before filing.

## What a memo must contain

Eighteen things per proposed relief track. All of them. A memo missing any one
is **rejected**, not partially imported: a missing waiting period or absent
stop condition is a question for counsel, and inventing one would put a
fabricated legal rule into the runtime wearing counsel's approval.

1. stable track ID · 2. legal and public name · 3. controlling authority ·
4. effective dates · 5. eligible record and disposition types · 6. exclusions
and waiting periods · 7. output strategy · 8. geography and venue · 9. filing
or process destination · 10. packet or process components · 11. questions
LegalEase asks the participant · 12. documents the participant obtains and
attaches · 13. items the participant completes by hand · 14. official sources ·
15. filing, fee, notice, service, signature and notarization rules ·
16. self-help stop conditions · 17. unresolved questions · 18. legal-design
decision.

Where nothing applies, say so explicitly — `[]` for an empty list, `"none"`
for a rule. Absence and "there is none" are different answers and the
validator will not guess which was meant.

`TEMPLATE.memo.json` is a filled example. It is **not** a real memo, is not
named for any jurisdiction, and is never imported.

## Limitations are classified

Every entry in `legalDesignDecision.limitations` is an object, not a string,
and carries one of six classifications:

| Classification | What it means | Blocks? |
|---|---|---|
| `packet_instruction` | Text the packet must carry — a step, a document to attach, a fee, a deadline, a warning. | No |
| `participant_question` | Something to ask before generating, so the answer selects the right output. | No |
| `scope_restriction` | A narrowing of who or where the track is offered to. | No |
| `manual_completion_item` | A field the packet leaves blank for the participant. | No |
| `self_help_boundary` | Where automated assistance ends. | No |
| `legal_design_blocker` | Counsel has not determined an element of the design. | **Yes** |

A bare string is refused. Left unclassified, "the participant needs a certified
disposition" reads as a reason to withhold the packet, which is exactly the
error this schema exists to prevent.

A `legal_design_blocker` must additionally name `undeterminedElement` — one of
the twelve affected elements below. A record the participant must obtain is
none of them.

## Open questions carry an impact

Every entry in `unresolvedQuestions` is an object with an `impact` and an
`affectedElement`. A bare string is refused.

| Impact | Meaning |
|---|---|
| `build_blocker` | The platform does not know what packet or strategy to implement. Nothing is built until it closes. |
| `release_blocker` | Engineering may proceed. The track may not become `packet_ready` until it closes, however green every other gate is. |
| `nonblocking_research_note` | Blocks neither, and is still owed an answer. |

This matters because every track is `runtime_disabled` today. Recorded only as
prose, an open question would quietly expire the moment runtime enablement
arrived, having never been anyone's job to close. `computeRuntimeStatus` takes
`openReleaseBlockers` and returns `runtime_disabled` while any is open.

`affectedElement` is one of: `governing_mechanism`, `correct_form`,
`output_strategy`, `venue`, `geographic_scope`, `eligibility_branch`,
`waiting_period`, `packet_components`, `filing_process`, `notice_or_service`,
`participant_instructions`, `legal_effect_or_warning`.

## Guidance tracks say why they are guidance

A `process_guidance` track must carry `guidanceRationales`. The vocabulary
splits in two.

**An external dependency** — `third_party_signature`, `agency_certification`,
`participant_obtains_record`, `certificate_attached_later`,
`another_entity_decides`. None of these, on its own, means we could not prepare
the participant's portion of a form, leave the external sections blank, and
instruct them how to get the rest. A track whose reasons are *all* in this group
goes to `legal-design-guidance-rereview-queue.json`, which asks counsel exactly
that question.

**Guidance is the right output** — `requires_negotiation`,
`individualized_advocacy`, `contested_evidentiary_showing`,
`no_participant_filing_exists`. One of these is enough to keep a track off the
queue entirely.

Nothing in that queue is reclassified by the pipeline or by engineering. It is a
question for counsel; a yes produces a revised memo.

## The participant confirms their own answer

A supporting document may name `confirms`, pointing at the `participantInputs`
key it corroborates. The packet then tells the participant to check their own
answer against the record once they have it.

That is the participant verifying their own facts. It is not LegalEase verifying
them — we never see the record — and it is not a condition of generating.

## No attorney metadata

This is not a reviewer database and must never become one. Do not include
reviewer names, contact details, bar numbers, firm names, signatures or
approver identities. The validator walks the whole memo at every depth and
**rejects** any of those keys rather than merely ignoring them.

That is also why the participant's signing rule is `rules.participantSignature`
rather than `rules.signature`: a bare `signature` key is reserved for the
rejection list.

## Legal-design approval is not output approval

`legal_design_approved` means the mechanism, venue and components are right.
It says nothing about the document the renderer actually produced.

An imported track therefore lands at `legal_review_pending`, never
`legal_approved`. It stays `runtime_disabled`, because `packet_ready` also
requires source approval, technical proof, visual review, a current source and
runtime enablement. Importing a memo enables nothing.

## What `packet_ready` does and does not mean

`packet_ready` means LegalEase can reliably generate the correct forms and
instructions for a track.

It does not mean any participant is ready to file. They may still need to
obtain supporting records, complete fields the packet left blank, sign,
notarize, pay a fee and serve parties. Those are printed in the packet and are
not inputs to the status.

There is no `filing_complete` status and there will not be one. LegalEase never
sees the participant's final assembled filing, so it has nothing to base such a
claim on.

## The self-help stop rule

If a prosecutor objects or the court schedules a contested hearing, LegalEase's
automated assistance ends and the participant needs a lawyer.

That is a boundary on what happens next. It does not retract the initial packet
and it is not a reason to withhold one.

## Statuses

| Status | Meaning |
|---|---|
| `legal_design_approved` | Design settled. Implementation may begin. |
| `legal_design_approved_with_limitations` | Design settled within stated limits, which must be named and classified. |
| `legal_research_required` | Not implementable yet. Deferred on import. |
| `output_review_pending` | Produced document is with counsel. |
| `legal_approved` | Counsel approved the completed output. |
| `legal_rejected` | Do not offer this track. |

## Where the human memo lives

**Not in this repository.** The attorney's original memo, and any partial draft,
markup or clarification, stays in the secure legal workspace.

Only completed, validated `<CODE>.memo.json` enters the repository. An operator
reads the original in the legal workspace, converts its conclusions here, and
runs the validator. Nothing else about the memo — not the prose, not a scan,
not a draft — is committed.

Classifying counsel's limitations is part of that conversion. Where a
classification is not obvious from what counsel wrote, ask them rather than
choosing one.
