# Claude Opus 5 Prompt: Repair the Platform Document-Delivery Core

## Recommended run configuration

- Model: Claude Opus 5
- Thinking: enabled
- Effort: `xhigh` for this multi-file production-recovery task, or `high` if `xhigh` is unavailable
- Workspace: one dedicated Codespace or worktree for this lane
- Paste the complete prompt below in one message rather than feeding requirements incrementally

---

You are working in the LegalEase / Expungement.ai repository on a production-recovery lane.

The platform is incomplete. Complete the scoped lane end to end. Do not leave stubs, placeholder implementations, fake-success states, or follow-up TODOs for work that belongs inside this lane.

## Outcome

Make the packet-generation path produce the correct jurisdiction-specific, openable, durably stored PDF through a real HTTP request, without Playwright, Chromium, Puppeteer, or another browser runtime.

Mississippi is the first vertical proof because an existing generator and live partner depend on it. The resolver, renderer, storage lifecycle, download path, navigation, and behavioral gates must be platform abstractions. Do not build a Mississippi-only architecture.

At the end of this lane, a supported participant must be able to submit packet information, reach the resulting Briefcase/document item, open and download the same stored PDF, and receive no form from the wrong jurisdiction. CI must prove that path over HTTP for every jurisdiction the product declares `packet_ready`.

## Known audit findings to confirm against the current branch

These findings came from the latest repository audit. Treat them as leads, not substitutes for inspecting the current code:

- The participant-facing runtime renderer uses Playwright and fails in the deployed serverless environment.
- `src/lib/record-clearing/renderers/overlay-renderer.ts` already uses `pdf-lib` but is not connected to the participant runtime.
- The current template resolver names TX, PA, DC, and IL, then falls through to Mississippi for other jurisdictions.
- Generator entry points exist for only MS, DC, IL, PA, and TX-Harris.
- Existing all50/all51 checks largely prove files, review artifacts, or declarations rather than a downloadable PDF over HTTP.
- The nationwide overlay anchors are placeholder geometry and are not approved mappings.

If file names, call sites, or implementation details have changed, use the current equivalents. Do not stop for a discrepancy. Mention only material deviations in the final report.

## Scope

### In scope

1. Exact jurisdiction and remedy resolution with no default-state fallback.
2. A browser-free runtime PDF renderer using the repository's `pdf-lib` foundation.
3. One real, visually confirmed Mississippi form mapping as the first proof fixture, selected only after the mandatory source-PDF structural check below.
4. Durable artifact storage and truthful packet status transitions.
5. Participant and authorized partner download of stored PDF bytes.
6. Successful post-submit navigation to the created document or Briefcase item.
7. An explicit jurisdiction capability registry if the repository does not already have a suitable one.
8. A real HTTP merge gate for every jurisdiction declared `packet_ready`.
9. An all-51 runtime capability audit that distinguishes packet delivery from guidance-only service.
10. Regression protection for paid DTC and sponsored RCAP authorization.
11. Removal or quarantine of the participant-runtime Playwright packet renderer.

### Out of scope

- Mapping all 300 forms or completing all 51 jurisdictions.
- Fixing the weekly partner report renderer, except for extracting a shared utility that does not expand this lane.
- Dashboard, onboarding, content-platform, marketing, or analytics redesigns.
- Resolving the commercial 100-packet-versus-1,200-screening question.
- Production test-data cleanup, retention policy, or participant deletion.
- Deploying, merging to `main`, changing production environment variables, or applying a migration remotely.

Deliver what was asked at this scope. Make routine, reversible engineering decisions yourself using repository conventions. Pause only when a missing credential or permission makes the work impossible, or when two valid choices would materially change a public API, stored data compatibility, or legal-form behavior. Do not broaden or transform the task silently.

## Repository and safety rules

1. Read `AGENTS.md` and all repository-local instructions before changing files.
2. Inspect the current worktree before modifying anything. Do not discard, overwrite, amend, or absorb unrelated work.
3. Fetch `origin/main` and record the exact base SHA.
4. If the current worktree is not a safe clean base, create a separate worktree from current `origin/main`.
5. Use branch `fix/platform-document-delivery-core` unless repository instructions require another name.
6. Do not write to production data, remote storage, remote databases, or production environment configuration.
7. Do not deploy and do not merge to `main`.
8. Preserve the existing paid consumer path and sponsored RCAP authorization boundaries.
9. Do not introduce a default jurisdiction, default template, or cross-jurisdiction fallback under any name.
10. Do not log participant PII, criminal-history details, storage credentials, signed URLs, or raw internal errors.
11. Use existing dependencies and abstractions where practical. Add a dependency only when the repository has no suitable capability and the addition is materially smaller and safer than implementing it locally.
12. Keep migration changes backward-compatible and unapplied. Never reuse an existing migration or phase identifier.

## Communication during the run

Before the first tool call, say one sentence stating what you are about to do.

While working, provide a brief update only when you find a material issue, complete a major milestone, or change direction. Do not narrate routine file reads, commands, or every edit.

When finished, lead with the outcome. The first sentence must say whether the end-to-end path now works and what remains blocked.

Only correct an earlier statement when the correction would change the code, conclusion, or decision. Make immaterial corrections silently.

Keep conversational updates and the final response concise. Put detailed evidence in the requested evidence file rather than repeating it in chat.

### Mandatory proof-form checkpoint

There is one deliberate exception to the normal sparse-update and adapt-without-pausing rules. This is the first substantive task after repository-instruction, worktree, branch, and base-SHA safety setup. Before broad implementation analysis and before writing or refactoring the runtime renderer, inspect the exact Mississippi source PDF selected as the proof fixture and send one short message containing:

- the exact source PDF path and form/remedy identity;
- exactly one structural classification: `clean AcroForm`, `dirty AcroForm`, `flat scan`, `XFA`, or `encrypted`; and
- the implementation approach that follows from that classification.

Use this concise shape:

> Proof fixture: `<path and form identity>` — `<classification>`. Approach: `<field filling or visually confirmed coordinate overlay, with one brief qualifier if needed>`.

Then continue without waiting for a reply. If the candidate is encrypted or XFA, do not build against it: stop renderer work, choose a different Mississippi proof form, repeat the structural check and short report for the replacement, then continue. If every viable Mississippi source is encrypted or XFA, stop the lane and report that blocker rather than substituting another jurisdiction or silently changing the renderer architecture. Do not emit a long preliminary report. This is the only required mid-run structural checkpoint.

## Delegation

You may use at most two subagents, and only for genuinely independent, sizeable, read-only investigations such as:

- tracing the current packet/storage/download call graph; or
- inventorying CI, capability declarations, and existing behavioral tests.

Do not delegate work that can be completed in a handful of tool calls. Do not use subagents to review, verify, or double-check your own work. Do not let multiple agents edit overlapping files. The primary agent owns all implementation and integration decisions.

## Execution

After completing only the mandatory repository-safety setup, perform section 0 first. Do not begin the broad call-graph trace in section 1 or any implementation before the structural checkpoint message has been sent. After that message, continue through the remaining sections without waiting for a reply. Do not stop after producing a diagnostic report or implementation plan.

### 0. Classify the proof source before renderer work

This gate happens before renderer design or implementation. Repository setup, instruction reading, and locating the candidate source file may happen first; renderer edits may not.

1. Identify the exact Mississippi official source PDF and remedy/form that will serve as the vertical proof. Do not use an HTML reconstruction, rendered screenshot, placeholder map, or generated derivative as the source fixture.
2. Open the PDF visually and inspect its document structure with appropriate local PDF tooling. Do not infer the answer only from a state-pack label, draft field map, filename, or prior audit classification.
3. Classify it as exactly one of:
   - `clean AcroForm`: a usable AcroForm field tree with stable, meaningful fields sufficient for the proof values;
   - `dirty AcroForm`: an AcroForm exists, but fields are partial, unnamed, duplicated, malformed, appearance-dependent, or otherwise unsafe to treat as a clean fillable form;
   - `flat scan`: no usable AcroForm fields and the official pages must be preserved as a visual background for an overlay;
   - `XFA`: the form depends on XFA rather than a usable standard AcroForm; or
   - `encrypted`: the source is encrypted or permission-restricted in a way that prevents safe processing by the selected runtime library.
4. Send the single short checkpoint message required above before changing renderer code. State the approach that follows:
   - clean AcroForm: fill explicitly mapped fields, generate appearances as required, and preserve or flatten the result according to repository needs;
   - dirty AcroForm: test whether the required proof values can be addressed deterministically. Use explicit field filling only if that test succeeds; otherwise use a visually confirmed coordinate overlay. State which path you selected;
   - flat scan: preserve the official pages and draw text, dates, marks, and signature placeholders at manually confirmed absolute coordinates;
   - XFA or encrypted: reject that candidate, select another Mississippi proof form, and repeat this gate before proceeding. If every viable Mississippi source is XFA or encrypted, stop and report the blocker. Do not substitute a different jurisdiction.
5. Record the selected source identity, structural evidence, classification, resulting strategy, and the mapping-cost implication in the final evidence file.

The corpus audit found 288 of 300 drafts with no extracted AcroForm fields and classified all four Mississippi forms as scanned. That makes a flat scan the likely result, but it is still only a lead. The answer must come from opening and inspecting the exact proof PDF. No renderer implementation may begin until this gate is complete.

### 1. Establish the current path

Trace the actual current path for:

1. packet creation and authorization;
2. jurisdiction-specific input persistence;
3. packet status transitions;
4. source-template selection;
5. PDF rendering;
6. artifact storage, if any;
7. Briefcase-item creation;
8. document display and download;
9. partner-sponsored packet accounting; and
10. capability or launch declarations consumed by the UI and API.

Inspect the current equivalents of at least:

- `src/lib/expungement-ai/packet-pdf.ts`
- `src/lib/record-clearing/renderers/overlay-renderer.ts`
- `src/app/api/expungement-ai/packet/generate/route.ts`
- the participant document/download route
- the MS, DC, IL, PA, and TX-Harris generator paths
- the Briefcase and document navigation components
- packet status and storage schema
- the all50/all51 scripts and required CI workflows
- the DTC frozen-flow or equivalent consumer regression guard

Do not create a separate pre-implementation report. Record the final call graph and material deviations once in the evidence file.

### 2. Implement exact capability and template resolution

Use the repository's current capability registry if it is suitable. Otherwise create the smallest typed, machine-readable registry that explicitly enumerates all 50 states plus DC and can represent county-limited support.

The registry must distinguish at least:

- `guidance_only`
- `generator_present`
- `mapping_in_review`
- `packet_ready`
- `temporarily_disabled`

It must distinguish statewide Texas from Harris County support and must not use an implicit catch-all state.

Create or refactor one resolver that accepts normalized jurisdiction, county where required, and remedy/form identity, and returns the exact source template plus mapping definition.

Required behavior:

- MS, DC, IL, PA, and TX-Harris can resolve only to their own explicitly registered assets.
- Unknown, malformed, incomplete, or unsupported combinations fail closed with a typed `jurisdiction_not_packet_ready` or repository-consistent equivalent.
- Texas outside a supported county cannot resolve to Harris County assets.
- No jurisdiction can receive Mississippi or another jurisdiction's form through fallback behavior.
- A capability cannot be `packet_ready` unless the runtime HTTP gate can prove delivery.

Add focused tests for the positive and negative resolution contracts.

### 3. Replace the runtime browser renderer

Begin this section only after the proof-source checkpoint in Step 0. Implement the renderer around the selected source structure rather than assuming fillable fields exist.

Adapt the existing `pdf-lib` renderer or consolidate it into one participant-runtime renderer. Do not maintain parallel runtime rendering implementations.

The runtime renderer must:

- load the exact registered official source PDF;
- preserve source pages;
- apply mapped text, dates, checkboxes, and signature placeholders required by the proof form;
- support bounded wrapping and explicit overflow behavior;
- support a continuation or narrative page when the proof packet requires one;
- return valid PDF bytes;
- return structured metadata containing jurisdiction, county when applicable, remedy/form ID, source-template identity, renderer version, and page count; and
- return typed handled errors for missing source assets, missing or unapproved mappings, invalid PDF input, encrypted/XFA incompatibility, and unsafe overflow.

The participant runtime must not import, launch, or shell out to Playwright, Chromium, Puppeteer, or another browser executable.

Use the Mississippi form selected and classified in Step 0 as the first vertical proof. For a clean or deterministically usable dirty AcroForm, map only verified field identities. For an overlay path, inspect rendered pages visually with available PDF/image tooling and confirm every live coordinate against the official form. Do not promote the repeated placeholder anchors into live mappings and do not claim other jurisdictions are ready merely because source PDFs or draft maps exist.

### 4. Make `ready` mean stored bytes exist

Refactor generation into one truthful, idempotent lifecycle:

1. authorize the participant or valid partner-scoped actor;
2. resolve the exact jurisdiction/remedy definition;
3. create or claim the generation operation idempotently;
4. move the packet to the repository's rendering/in-progress state;
5. render PDF bytes;
6. parse the rendered bytes with an existing PDF parser to confirm they are loadable;
7. store the artifact through the existing storage abstraction or the smallest repository-consistent addition;
8. persist artifact identity, byte size, checksum, renderer version, template identity, and creation timestamp;
9. mark the packet `ready` only after storage succeeds; and
10. on failure, persist a safe recoverable failure state without exposing PII or stack traces.

Retries must not create duplicate fulfilled packets, duplicate Briefcase items, duplicate stored artifacts, duplicate payments, or duplicate sponsored usage counts.

If schema or storage policy changes are needed:

- add a new uniquely named migration using the current repository convention;
- make it backward-compatible;
- include operational and rollback notes;
- add ownership-consistent RLS and storage policies; and
- do not apply it remotely.

### 5. Serve the stored artifact

The participant-facing document route must:

- authorize the user or valid partner-scoped actor;
- resolve the artifact by the durable packet or Briefcase identifier actually returned by generation;
- read existing stored bytes rather than render on demand;
- return `application/pdf`, a safe filename, and correct length when available;
- return handled responses for unauthorized, not found, not ready, jurisdiction not ready, and storage unavailable states; and
- avoid exposing internal paths, bucket names, credentials, signed URLs, PII, or stack traces.

If an old route must remain, make it a compatibility adapter to the same stored artifact. Do not keep a second renderer behind it.

### 6. Complete the participant path

After successful generation:

- route the participant to the created document or Briefcase item without manual URL editing;
- use the durable identifier returned by the server;
- preserve access after refresh;
- show a truthful recoverable state after generation failure; and
- never show a ready or download action before stored bytes exist.

Centralize the behavior when the current architecture allows it. Otherwise update the five existing generator form paths consistently without redesigning the UI.

### 7. Add runtime behavioral gates

These tests are product deliverables and required merge gates. Do not replace them with source inspection, snapshot presence, signoff declarations, or screenshots.

#### A. Ready-jurisdiction HTTP gate

Add `verify-packet-delivery-ready-jurisdictions`, using repository naming conventions if a different script name is required.

For every capability declared `packet_ready`, the gate must:

1. start or use the real test application server;
2. create the minimum authorized fixture through supported helpers;
3. submit a real packet-generation HTTP request;
4. follow the returned durable document or Briefcase identifier;
5. make a real HTTP download request;
6. assert successful status and `Content-Type: application/pdf`;
7. assert non-empty PDF bytes;
8. parse the bytes and assert a positive page count;
9. assert a robust marker identifies the requested jurisdiction and exact source template; and
10. assert no other jurisdiction's template identity is present.

The gate must:

- run in the standard `npm test` path or the repository's mandatory equivalent;
- run in required CI;
- never skip based on changed-file scope; and
- fail whenever a jurisdiction is declared `packet_ready` but cannot complete the contract.

#### B. All-51 runtime capability audit

Add `audit-packet-delivery-all51`, using repository naming conventions if needed.

For all 50 states plus DC:

- read the explicit capability;
- exercise the appropriate runtime contract;
- require the full HTTP/PDF proof for `packet_ready`;
- require an explicit safe non-packet response for `guidance_only`, `generator_present`, `mapping_in_review`, and `temporarily_disabled` as appropriate;
- fail on cross-jurisdiction fallback;
- fail when product configuration claims readiness that runtime cannot prove; and
- write one machine-readable JSON capability matrix as a CI artifact.

Do not make all 51 packet-ready in order to satisfy the audit. Honest non-packet states are valid; incorrect forms and silent skips are not.

#### C. Direct regression coverage

Preserve and exercise the directly affected contracts:

- screening-first consumer entry;
- Stripe payment requirement for non-sponsored users;
- sponsored bypass only for a valid sponsored session;
- partner attribution currently persisted by the application;
- single-count packet fulfillment and sponsored usage behavior where the active schema supports it;
- download response validation; and
- existing authentication and RLS boundaries.

Wire the existing DTC flow guard into the required test path if it is not already mandatory. Do not expand this lane to repair unrelated onboarding verifiers; record those separately.

### 8. Remove the broken participant runtime path

After the new path is integrated:

- remove or clearly quarantine the participant-runtime Playwright renderer;
- leave browser tooling only when it is explicitly offline or visual-review tooling with no participant-facing runtime imports;
- update callers to use the single stored-artifact path; and
- record the weekly partner Playwright renderer as a separate defect if it remains.

Do not add explanatory comments that merely repeat the code. Add a brief architecture comment only where it prevents a future serverless-browser regression.

## Acceptance contract

Precondition P0: before renderer implementation, the agent reported the exact Mississippi proof source, its structural classification, and the resulting implementation strategy. If the first candidate was XFA or encrypted, it selected and classified a different proof source before proceeding.

This lane is complete only when the following works in a local or preview environment:

1. Open the partner intake path for the proof jurisdiction.
2. Complete screening to a supported Mississippi remedy.
3. Continue through account handling without losing existing partner attribution.
4. Complete the sponsored authorization path.
5. Submit representative jurisdiction-specific packet information once.
6. Reach the created document or Briefcase item without editing the URL.
7. Open the document.
8. Download the document.
9. Parse the downloaded bytes successfully as a PDF.
10. Confirm the correct Mississippi source form and expected fixture values visually.
11. Refresh and download again, receiving the same stored artifact rather than a second fulfillment.
12. Attempt an unsupported jurisdiction and receive an explicit not-ready result, never the Mississippi form.
13. Run the ready-jurisdiction HTTP gate through the mandatory test command.
14. Run the all-51 audit and produce the JSON matrix.

Capture evidence once, keyed to these step numbers. Use command output and artifact metadata for HTTP and PDF-byte claims, plus targeted screenshots or rendered page images for the visual form check. Do not duplicate the same evidence in multiple reports.

## Test execution

Inspect `package.json`, workflow files, and repository instructions, then use the actual project commands.

During implementation, run targeted tests for changed areas. At the end, run one complete relevant pass containing:

- type checking;
- linting when it is part of the repository's normal gate;
- resolver and renderer tests;
- packet, Briefcase, payment, sponsored-flow, authorization, storage, and download tests affected by the change;
- the new ready-jurisdiction HTTP gate;
- the all-51 runtime audit; and
- the production build.

Do not perform redundant full-suite passes or create a separate verification subtask. Report any command that could not run and the exact reason. Do not claim success because a test was skipped, conditionally bypassed, or asserted only source text.

## Deliverables

1. Focused implementation commits on `fix/platform-document-delivery-core`.
2. Any required unapplied migration and storage policy changes.
3. The explicit capability/route resolution used by runtime.
4. The browser-free runtime renderer and one real confirmed Mississippi proof mapping.
5. Durable artifact generation and stored-artifact download.
6. Completed post-submit navigation.
7. The ready-jurisdiction HTTP gate and all-51 runtime audit.
8. Mandatory test and CI wiring.
9. A concise `PLATFORM_DOCUMENT_DELIVERY_EVIDENCE.md` containing:
   - base and final SHAs;
   - final call graph;
   - material design decisions, including the proof PDF's structural classification and chosen rendering strategy;
   - files and migrations changed;
   - commands and results;
   - acceptance evidence by step number;
   - capability result for MS, DC, IL, PA, and TX-Harris;
   - the location of the all-51 JSON matrix; and
   - remaining blockers outside this lane.
10. Push the branch and open a draft PR only if credentials are available and repository instructions permit it. Do not merge.

Match the evidence document to the task. Keep it under roughly 180 lines unless additional detail is necessary to explain a failure or migration. Do not pad it with boilerplate, repeated summaries, or a chronological work diary.

## Completion conditions

Do not mark the lane complete if any of the following remains true:

- participant runtime rendering still launches a browser;
- an unknown or unsupported jurisdiction can receive another jurisdiction's form;
- a packet can be marked `ready` without stored, loadable PDF bytes;
- the download route renders on demand instead of reading the stored artifact;
- renderer work began before the exact proof PDF was structurally classified and reported;
- an encrypted or XFA proof source was used instead of selecting a different Mississippi fixture;
- the proof mapping uses the repeated placeholder coordinates;
- the participant cannot reach the created document without manual URL editing;
- retries can duplicate fulfillment, artifacts, Briefcase items, payment effects, or sponsored usage;
- the HTTP gate is absent from the mandatory test path or can self-skip;
- a `packet_ready` jurisdiction fails the real HTTP/PDF contract;
- screenshots are the only proof that the returned bytes are a valid PDF;
- the paid consumer or sponsored authorization path regresses; or
- the work expands into the explicitly excluded lanes.

## Final response format

Lead with one sentence stating the outcome.

Then report, briefly:

1. branch, base SHA, final SHA, and draft PR link if opened;
2. what changed at the architecture level;
3. acceptance steps passed or blocked, by number;
4. exact required commands and results;
5. jurisdictions now honestly classified `packet_ready`;
6. remaining blockers outside this lane; and
7. evidence-file and JSON-matrix paths.

Do not repeat the evidence document in chat and do not provide a chronological narration of the work.

<tone_preference>
Keep outputs focused, brief, and concise. Spend most of the response on the result and actionable blockers.
</tone_preference>
