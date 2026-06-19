# Expungement.ai — Profile-Driven Screening Flow (Front-End)

This is the front-end for the all-51 rule-level packet. It is **only** the interface. It
renders the jurisdiction profile and the engine's result. It never evaluates eligibility,
chooses a pathway, or decides packet availability. Those rules live in the Codex backend.

## What's in the demo

`expungement-flow-all51.html` is the full demo: a state picker followed by the profile-driven
flow, loading **all 51 real profiles** from the rule-level packet. Pick any state and the same
shell renders that state's own questions, terminology, screen count, and context question.
Per-state variation is real (Pennsylvania 5 screens, Illinois 16, Texas 17, Nebraska 20).

`expungement-flow-IL.html` is the single-state version (Illinois only), useful as the focused
reference. Both are driven the same way; the all-51 file just embeds every profile and adds the
picker.

The extracted consumer profiles are in `profiles_fe/` (`all51.json`, and `IL.json` alone).
These are the trimmed consumer-facing slices; the full source profiles with rules live in the
rule-level packet's `profiles/` folder.

## The two integration points (the only things to wire to Codex)

1. **Load the profile.** Demo embeds one profile inline. Production:
   `GET /api/expungement-ai/profiles/{state}` → render its `flowStages` + `questions`.
2. **Evaluate.** Demo calls `mockEvaluate(answers)`. Production: replace with
   `POST /api/expungement-ai/evaluate` (profileVersion, matterId, normalized answers) →
   render the returned `ScreeningEvaluation`. Delete `mockEvaluate` and `forced` entirely.

Nothing else changes. The render layer already consumes the real contract shape.

## Rendering rules the UI already enforces (keep these)

- Screens come from `flowStages` order. Raw `source_question_*` rows are the backend's
  evaluation surface and are **not** rendered as screens.
- The pathway-description question is `contextOnly`: rendered as optional, labeled "does not
  decide your result," and it never sets the pathway or blocks Continue.
- Checkout shows **only** when `paymentAllowed === true` (packet_ready /
  packet_ready_with_caution). Every other result saves and stops. Enforce server-side too.
- Changing jurisdiction invalidates state-specific answers (confirm first).
- Missing facts return to exact question IDs (`missingQuestionIds`).
- Never claim a packet/payment/filing/eligibility/outcome the backend hasn't returned.

## Suggested React structure

```
<ScreeningFlow state>                       // owns step index + answers, fetches profile
  useProfile(state)                          // GET /profiles/{state}
  deriveScreens(profile)                     // flowStages order, drop source_question_*
  <ProgressRail pct/>                        // the path-forward signature element
  <QuestionScreen question answers onAnswer> // switches on question.type:
      SingleChoice | MultiSelect | DateOrUnknown | NumberOrRange | TextOrUnknown | CaseDetailsForm
      renders ContextOnlyBanner when question.contextOnly
  onComplete -> POST /evaluate -> <ResultScreen evaluation>
  <ResultScreen>                             // switch on resultCode -> RESULT_UI map
      paymentAllowed ? <PacketGate packetPlan> : <SaveToBriefcase>
  <PacketGate>                               // Stripe checkout; on success backend generates
```

Component-to-question-type mapping is the whole game: the `type` field on each profile
question selects the input component. Add a new question type once; every state that uses it
renders for free. No per-state components, ever.

## ScreeningEvaluation contract (what /evaluate returns)

```ts
{ jurisdiction, profileVersion, matterId, pathwayId?, resultCode, userLabel,
  reasons:[{code,text,sourceRef?}], missingQuestionIds:[], cautions:[], nextSteps:[],
  paymentAllowed:boolean,
  packetPlan?:{ pathwayId, mode, formMappingStatus, sourceFormIds:[], requiredInputIds:[], sourceRuleRefs:[] } }
```

## Extending to all 51

Same components, same contract. For each state the dev team points `useProfile` at that
state's profile JSON from the packet's `profiles/` folder (or the live `/profiles` endpoint).
The 9 result codes, the checkout gate, the screen types, and the brand are identical
everywhere. The per-state difference is entirely in the data.

## Honest status

- Real Illinois profile data drives the demo; the other 50 profiles exist in the packet and
  load the same way.
- The evaluate result is mocked. The Codex engine is the source of truth; if its real response
  differs from the contract above, follow the engine and update the render map's field reads.
- Auth, Stripe, packet generation, and the Briefcase store are backend/integration work,
  shown here only as the screens that sit on top of them.
