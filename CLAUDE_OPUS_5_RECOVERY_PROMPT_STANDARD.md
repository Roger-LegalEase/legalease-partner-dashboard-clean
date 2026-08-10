# Claude Opus 5 Recovery-Prompt Standard

Use this standard for future LegalEase engineering recovery prompts.

## Prompt construction

1. Give the full scoped task in one prompt. Include the desired end state, current known facts, in-scope work, excluded work, safety constraints, behavioral acceptance contract, and concrete deliverables.
2. Define a complete lane, not an investigation that ends with a plan and not a task so broad that unrelated systems are swept in.
3. Tell the agent to inspect current code and adapt without pausing when file names or implementation details have changed. Require material deviations only in the final report.
4. Preserve behavioral gates that are actual product deliverables. Remove generic instructions to double-check, re-verify, or create a verification subagent.
5. Use an explicit completion contract based on user-visible behavior, real requests, real persisted state, and real artifacts. Source-presence checks are supporting tests, not acceptance evidence.

## Scope language

Include this pattern:

> Deliver what was asked at the scope intended. Make routine, reversible decisions yourself using repository conventions. Pause only when missing access makes the task impossible or when two valid choices would materially change a public API, stored-data compatibility, or user outcome. Do not silently narrow, widen, or transform the task.

List both `In scope` and `Out of scope`. Name adjacent systems that the agent must leave alone.

## Communication

Include this pattern:

> Before the first tool call, say one sentence stating what you are about to do. While working, provide a brief update only for a material finding, a major milestone, or a change of direction. When finished, lead with the outcome. Keep detailed evidence in the requested artifact rather than repeating it in chat.

Explicitly request a concise final response and a non-redundant written artifact.

## Delegation

Set a deterministic cap. Default:

> Use at most two subagents, only for genuinely independent, sizeable, read-only investigations. Do not delegate work that can be completed in a handful of tool calls. Do not use subagents to review or verify your own work, and do not allow agents to edit overlapping files.

Use zero or one for smaller tasks.

## Self-correction

Include:

> Only correct an earlier statement when the correction would change the code, conclusion, or decision. Make immaterial corrections silently.

Do not ask the model to double-check or re-check its answer.

## Test and evidence wording

Distinguish product verification from model self-verification:

- Good: "Add an HTTP integration test that downloads and parses the produced PDF."
- Good: "Run the repository's required test command once after targeted tests pass."
- Avoid: "Use a second agent to verify your work."
- Avoid: "Double-check every conclusion before responding."
- Avoid: repeated test passes with no new information.

## Written deliverables

Calibrate length explicitly:

> Match the document length to the task. Cover the substance, but do not add filler sections, duplicate summaries, boilerplate, or a chronological work diary.

Where useful, set a rough line or page ceiling.

## Run configuration

For large multi-file production-recovery work:

- Claude Opus 5
- thinking enabled
- `xhigh` effort when available, otherwise `high`
- one dedicated branch and workspace per implementation lane

For narrow edits or ordinary reviews, begin at lower effort and increase only when the task requires it.

## Final checklist for the prompt author

Before sending a prompt, confirm that it:

- states one unambiguous end result;
- contains the whole task specification up front;
- names in-scope and excluded systems;
- avoids unnecessary pre-implementation reports;
- does not request redundant self-verification;
- caps subagents;
- defines sparse progress updates;
- defines a user-visible or runtime acceptance contract;
- calibrates written artifact length; and
- specifies a concise, outcome-first final response.
