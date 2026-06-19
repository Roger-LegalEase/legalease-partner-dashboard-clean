# Expungement.ai — Front-End Handoff

> **Read this first.** The backend is already built: the RCAP eligibility engine, Wilma
> (model + safety system), auth, Stripe, and the packet-generation pipeline all exist. This
> package is the **front end** to wire to them. It is not the backend and does not contain it.
> Where the front end depends on the engine, the engine's **live response is the source of
> truth**, the result contract documented below is a faithful reconstruction, so if the real
> response differs in any field name or value, follow the engine, not this doc.

Everything the dev team needs to build the consumer front end. Backend (RCAP engine,
Wilma, auth, Stripe, packet generation) already exists and is out of scope here.

The front end's one job: render the screens, collect the eligibility answers, send them to
the engine, and render whatever result the engine returns. The engine decides outcomes and
whether payment is allowed; the front end never decides eligibility itself.

---

## Files in this package

**Landing page (public marketing site)**
- `Expungement-Landing-Full.html` — the page
- `hero-1500.webp`, `hero-800.webp`, `hero-1500.jpg` — hero images

All four ship in the same folder. The HTML references the images by filename. Deploy this
four-file set, NOT the single-file version (see note below).

`Expungement-Landing-SingleFile.html` (if present) is a preview-anywhere copy with the hero
image baked in as base64. Do not deploy it. It exists only for sharing/previewing where the
separate image files aren't available. Production uses the four-file set so phones download
the smaller image.

**Application (the product)**
- `Expungement-Flow-Prototype.html` — the complete customer funnel and Briefcase, clickable
  end to end. This is the behavioral spec: rebuild it in the real stack. See notes below.

**Briefcase design**
- `Briefcase-Design-Spec.docx` — written spec: rules, brand tokens, every screen, components,
  responsive, voice. Appendix A = the all-50 launch model and the guidance-only matter state.
- `Briefcase-Product-Mockup.html` — built visual reference for the Briefcase screens.

**Wilma (the in-product guide) — design + safety package**
Wilma's logic and backend already exist; these six docs are the source of truth for how she
behaves and how she's kept safe. The front end's only job is to render her chat surface, send
her the page context, and render her responses, plus the two front-end states called out in
"Prototype gaps" below.
- `Wilma-Persona-and-Guardrails.md` — who she is, her voice, and the hard guardrails (never
  determine eligibility, never advise, never predict outcomes, never state unverified law).
- `Wilma-System-Prompt.md` — the deployable system prompt with the `{{RUNTIME_INJECTION}}` slots.
- `Wilma-Golden-Examples.md` — reference dialogues; the behavioral bar.
- `Wilma-Adversarial-Test-Suite.md` — ~40 cases with PASS / SOFT-FAIL / HARD-FAIL criteria;
  the launch gate (hard fails must be 0).
- `Wilma-Telemetry-Escalation-Spec.md` — production logging, drift detection, human review,
  and the escalation thresholds that trigger the kill-switch.
- `Wilma-Engineering-Build-Spec.md` — the implementation order for the safety system
  (content-injection contract → redacted logging → kill-switch → guards → judge → review).

---

## How to read the prototype

`Expungement-Flow-Prototype.html` is a working front-end built with vanilla HTML/CSS/JS and
in-memory state. Treat it as the source of truth for layout, copy, flow order, branch
behavior, and brand. Two things in it are stand-ins for systems you already have:

1. **Auth + persistence are in-memory** (reset on reload). Replace with your real auth and
   the Briefcase data store.
2. **The eligibility engine is mocked.** The `runEngine()` function and the
   `GUIDANCE_ONLY_PATHS` list are placeholders so the prototype can demo all branches. The mock
   defaults to packet-ready and only falls to guidance-only for the path rules in that list.
   Delete the mock; the real result comes from your engine (see contract below). The front end
   must never decide packet-readiness itself, it honors `paymentAllowed`.

There is a **demo bar at bottom-left** (branch picker + reset) for reviewing every result
screen. Remove it before launch.

---

## The one contract that matters: the engine result object

The front end sends the user's answers to the engine and gets back one result object. Every
result screen is built to render this shape. This is the integration point.

```ts
type ExpungementAiEligibilityResult = {
  resultCode:
    | 'packet_ready'
    | 'packet_ready_with_caution'
    | 'needs_more_info'
    | 'not_yet'
    | 'guidance_only'
    | 'not_covered_yet'
    | 'likely_not_eligible'
    | 'needs_review'
    | 'hard_stop';
    // ('state_not_live' exists in the type but never fires for a US state/DC at launch;
    //  reserve it only as a kill-switch if a state is pulled back.)

  userLabel: string;       // headline shown on the result screen
  state: string;
  pathwayLabel?: string;   // e.g. "Illinois expungement (non-conviction)"
  confidence: 'high' | 'medium' | 'low' | 'blocked';

  paymentAllowed: boolean; // front end shows the $50 gate ONLY when this is true
  priceCents?: 5000;
  packetType?: 'official_pdf_overlay' | 'custom_pleading' | 'legacy_packet' | 'guidance_packet';

  reasons: string[];       // plain-language bullets on the result screen
  missingInfo?: string[];  // for needs_more_info
  nextSteps: string[];     // for guidance_only and the no-packet branches
  emailCaptureRecommended: boolean;
  reminderRecommended?: boolean;
  disclaimer: string;      // UPL line rendered at the bottom of the result screen
};
```

**Payment rule (enforce on the front end, and again server-side):**
```ts
showPayGate = result.paymentAllowed === true
// which is only ever true when:
//   resultCode === 'packet_ready' || resultCode === 'packet_ready_with_caution'
```
Every other branch saves to the Briefcase and shows next steps. No pay gate.

---

## Branch → screen map

| resultCode | Pay gate? | What the screen does |
|---|---|---|
| packet_ready | Yes | "You may be eligible." Generate my packet — $50. |
| packet_ready_with_caution | Yes | "You may have a path." Same gate, more cautious copy. |
| needs_more_info | No | "We need a few more details." Returns user to the questions. |
| not_yet | No | "You may need to wait." Offers a reminder. |
| guidance_only | No | "We can give you next steps for your state." Saves guidance, no packet. The exception, for specific paths with no packet template yet. |
| not_covered_yet | No | "We don't support this record type yet." Notify-me. |
| likely_not_eligible | No | "This record may not qualify." Saves results. |
| needs_review | No | "This situation needs review." Saves answers. |
| hard_stop | No | "We can't help with this type of record." Points to legal help. |

---

## Launch model (important)

All 50 states + DC are live at once. No rollout, no "not live in your state" for any US
state/DC, and no state-level packet gate. State is never a dead end: every user gets a real
result and it always saves to the Briefcase.

Packet-readiness is a property of the **path** (the outcome, charge, and answers), not the
state. The default is packet-ready: any in-scope path with enough information and no blocker
can pay and generate. Guidance-only is the exception, reserved for the specific paths that have
no packet template yet (e.g. a path too county-specific to generate, or an unsupported
subpath), and it applies regardless of state. The engine decides this and returns
`paymentAllowed`; the front end honors it.

The engine's decision order (the prototype's mock follows it exactly): hard_stop → needs_more_info
→ not_yet → needs_review → not_covered_yet → likely_not_eligible → guidance_only →
packet_ready_with_caution → packet_ready. Packet-ready is the floor, reached when nothing above
it matched.

The Briefcase shows a guidance matter as its own state (see Appendix A in the spec): "Guidance
saved" pill, no 5-stage filing stepper, next steps in place of the document list, no pay action.

---

## Where the front end meets Wilma

Wilma's behavior, prompt, guards, telemetry, and kill-switch are fully specified in the six
Wilma docs and her backend exists. The front end is responsible for four things only:

1. **Render her chat surface** on every screen (the prototype shows placement and the
   page-aware context line). She is a floating affordance, reachable everywhere.
2. **Send her the page context** so her opener matches where the user is (on the result
   screen: "Want me to explain this result?"; on the pay gate: "Want to know what's
   included?"). The prototype demonstrates this context map.
3. **Render the kill-switch fallback** when Wilma is disabled (built, see below).
4. **Render the report-this-response affordance** on her messages (built, see below).

Everything else, the guardrails, the content injection, the real-time guards, the logging, the
LLM-judge, the escalation, is server-side and out of the front end's hands. The front end must
never try to enforce a guardrail client-side or decide eligibility; it renders what the Wilma
service returns.

### Wilma states already in the prototype

The flow prototype now includes the two safety-critical front-end states the Wilma docs
require, so the prototype and the Wilma package agree. Both are demoable from the bottom-left
dev bar (the "Wilma: ON/OFF" toggle and the report control on each Wilma message):

- **Kill-switch fallback** (per `Wilma-Engineering-Build-Spec.md` §3 and
  `Wilma-Telemetry-Escalation-Spec.md` §4.4). Wilma is gated by a flag (`wilmaEnabled` in the
  prototype; a server-side `wilma_enabled` flag in production, checked server-side on every
  Wilma request). When off, the chat surface shows the graceful fallback ("Wilma's taking a
  quick break, the screening tool and your Briefcase have everything you need"), not an error,
  and the rest of the app keeps working. In production this flag is NOT client-trustable, the
  prototype mirror is for demonstration only.

- **Report-this-response affordance** (per `Wilma-Telemetry-Escalation-Spec.md` §4.1 and
  `Wilma-Engineering-Build-Spec.md` §7). Each Wilma response has an unobtrusive "Report this
  response" control that feeds the human review queue. In the prototype it logs to an in-memory
  list (see the dev bar's "Reports" count); in production it posts to the review-queue endpoint.

What the dev team still wires to the real backend: the `wilmaEnabled` mirror becomes a
server-checked flag, and the report control posts to the real review queue instead of the
in-memory list. The UI states themselves are built.

## Brand tokens (true brand, already applied across all files)

- Navy (primary): `#0B1320`
- Orange (action): `#FF3B00`  (use sparingly: one primary action per screen)
- Teal (positive / Wilma): `#00A99D`
- Cream (canvas): `#F7F3EC`
- Typeface: Sora throughout

---

## Non-negotiables for a justice product

- Self-file model: we prepare documents and guide; the user files. Never imply we are their
  lawyer or that we file for them.
- UPL-safe language everywhere: "may be eligible," "self-help packet," "court approval is not
  guaranteed," "not a law firm," "review before filing." Never "you qualify," "guaranteed,"
  "we will clear your record."
- Wilma is a guide, not a lawyer. "Not legal advice" stays present in her UI.
- Mobile-first. Large share of users on budget Android. Tap targets ≥ 44px.
- Plain language, 6th–8th grade reading level. No em dashes.

---

## Build order suggestion

1. Auth + Briefcase shell (the home the user lands in).
2. Eligibility flow → wire to the engine → render the result object.
3. Pay gate + packet delivery (packet_ready paths).
4. The no-packet result screens + guidance matter in the Briefcase.
5. Wilma chat surface: wire to her existing service; render page context. The kill-switch
   fallback and report-response affordance are already built in the prototype, wire the flag
   to the server-side check and the report control to the real review queue. The engineering
   spec requires the kill-switch and content-injection contract designed in from day one.
6. Care states from the spec: waiting, needs-attention, denied, cleared.
