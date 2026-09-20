# Expungement.ai Grade A Launch Build Plan
## Mission Lock for Parallel Claude + Codex Execution

**Plan version:** 2026-09-20  
**Status:** ACTIVE  
**Captain / Integration Authority:** Claude  
**Engineering Execution Lane:** Codex  
**Owner / Final Product Authority:** Roger Roman  

---

# 1. Purpose

This file is the single shared Build Plan for completing the Expungement.ai Grade A launch.

Its purpose is to keep Claude and Codex aligned on:

- what the mission actually is;
- what is already complete;
- what remains;
- who owns each type of work;
- what may be done in parallel;
- what must be serialized;
- what evidence is required before anything is called complete;
- what work is explicitly prohibited because it creates drift, redundancy, bureaucracy, or fake progress.

This is an **execution plan**, not a request for another audit, roadmap, governance framework, or planning exercise.

Both agents should read this file before starting a new work session and should use it to decide whether proposed work is:

1. required by the Mission Lock;
2. already complete;
3. owned by the other agent;
4. a shared-foundation change requiring coordination;
5. unnecessary work that should not be started.

---

# 2. Mission

Build and launch one integrated, production-ready Expungement.ai product that delivers:

- accurate nationwide screening;
- the correct remedy/pathway;
- filing-grade court documents;
- official forms when official forms control;
- Grade A custom pleadings when custom pleadings are required;
- a complete Packet Information journey;
- source-backed participant filing guidance;
- DTC payment flow;
- sponsored RCAP flow;
- Clinic Mode;
- Briefcase/download delivery;
- English and Spanish parity;
- mobile and keyboard usability;
- deterministic packet generation;
- trustworthy hosted acceptance;
- one frozen integrated release;
- production launch only after explicit owner authorization.

The finish line is **not** "tests are green."

The finish line is:

> A real eligible participant can move through the intended Expungement.ai journey and receive a legally appropriate, professionally formatted, filing-grade packet with accurate route-specific instructions, and the same integrated product is proven through hosted acceptance and then deliberately released.

---

# 3. Product Quality Standard

Every jurisdiction and every intended pathway receives the same updated, accurate, precise treatment.

There are **no privileged legacy jurisdictions**.

Mississippi, Illinois, DC, Pennsylvania, Texas, and every other jurisdiction are subject to the same Grade A standard.

No jurisdiction is considered safe merely because it was previously marked "verified," "legacy," "accepted," or "working."

At the same time, already-proven work must **not** be reopened without a new concrete defect.

The standard is:

> The filing should look like it was prepared by a top law firm using master attorneys and paralegals, while remaining faithful to the governing form, rule, statute, court practice, and available authority.

Avoidable clerk rejection risk is a product defect.

---

# 4. Authority Hierarchy

When instructions or evidence conflict, use this order:

1. **Roger's direct current instruction**
2. **This Build Plan**
3. **Current Captain decision / integrated worklist**
4. **Current accepted source-backed route/document decisions**
5. **Current repository implementation**
6. **Historical evidence**
7. **Old audits, old manifests, old labels, or stale acceptance artifacts**

Historical evidence may explain why something exists, but stale history does not override a current approved implementation.

No agent may use an old "verified" label as a substitute for current correctness.

---

# 5. Agent Roles

## 5.1 Claude: Captain and Integration Authority

Claude owns:

- the single master Mission Lock worklist;
- nationwide route/document remediation;
- legal-design decisions;
- official-form vs custom-pleading decisions;
- pleading, motion, petition, order, exhibit, verification, service, and caption substance;
- route/source provenance decisions;
- substantive participant-guide content;
- substantive English/Spanish legal wording;
- route availability decisions;
- commercial eligibility decisions;
- acceptance of Codex batches;
- integration into the Captain branch;
- final candidate assembly;
- final release freeze;
- production readiness recommendation.

Claude is the **only agent authorized to declare a Mission Lock item terminal** after reviewing the evidence.

Claude must not duplicate Codex's engineering lane unless Codex exposes a shared defect or hands the item back.

---

## 5.2 Codex: Engineering Execution Lane

Codex owns:

- hosted acceptance engineering;
- browser/E2E acceptance infrastructure;
- Packet Information engineering;
- save/resume/edit mechanics;
- DTC runtime mechanics;
- RCAP runtime mechanics;
- Clinic Mode runtime mechanics;
- mobile acceptance;
- keyboard acceptance;
- English/Spanish runtime parity;
- external-document workflow enforcement;
- deterministic rendering controls;
- acceptance evidence mechanics;
- CI defects;
- release-control engineering;
- evidence-staleness controls;
- integration test defects that do not require substantive legal judgment.

Codex does **not** independently decide:

- remedy identity;
- route existence;
- route availability;
- legal eligibility;
- official form vs custom pleading;
- substantive pleading language;
- substantive order language;
- filing deadlines;
- filing fees;
- service requirements;
- legally required attachments;
- legal Spanish translations;
- commercial eligibility;
- whether a route should be disabled or converted to guidance-only.

If Codex discovers one of those issues, Codex creates a **CAPTAIN HANDOFF** and continues other independent engineering work.

Codex is not a second Captain.

---

# 6. Branch Model

## Claude

Claude continues using the established Captain/integration flow.

The Captain branch is the authoritative integration lane.

## Codex

Codex must:

1. sync from the current `origin/captain-release`;
2. record the exact starting SHA;
3. create/use:

```text
codex/mission-lock-engineering
```

4. never push directly to `captain-release`;
5. hand completed batches back to Claude for review and integration.

The intended flow is:

```text
Captain truth
    ↓
Codex engineering batch
    ↓
evidence + commit
    ↓
Claude review
    ↓
Captain integration
    ↓
affected acceptance rerun
```

Not:

```text
Claude and Codex independently rewrite the same foundation
    ↓
merge conflict
    ↓
stale evidence
    ↓
new audit
    ↓
lost week
```

---

# 7. Current Release Snapshot

This section is a **reference snapshot**, not a permanent live-status record.

Before acting, both agents must refresh current branch/run state from the repository and current evidence.

At the time this Build Plan was created:

```text
Current Item 11B resolution commit:
2a5dfe9ea101975abd107d82769d0fbb86925394

Immutable hosted acceptance freeze:
117b469c453a403fbd217f1c441a08c7c68f6b3a

Accepted worker source SHA:
117b469c453a403fbd217f1c441a08c7c68f6b3a

Accepted worker digest:
sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f
```

The hosted checkout verifier was rebound to the real immutable freeze and was proven non-vacuous:

```text
95/95 with canonical inputs unchanged
93/95 after a deliberate one-line canonical worker-input mutation
95/95 after restoring the mutation
```

The six currently proven commercial routes were:

```text
DC actual innocence
IL felony prostitution relief
MS justice court § 9-11-15(3)
MS municipal court § 21-23-7(6)
MS non-conviction § 99-19-71(4)
WY felony expungement § 7-13-1502
```

They were asserted as an exact set at that point.

**Important:** These six routes are **not** the nationwide denominator and must not be treated as the final scope.

Hosted acceptance was being rerun against the already-published digest.

Production promotion, production deployment, live charges, and live-environment mutation were not authorized.

---

# 8. Definition of Done

The Mission Lock is complete only when all of the following are true.

## 8.1 Nationwide filing-grade document system

Every intended packet pathway has the correct filing vehicle:

- official form where the official form controls;
- custom pleading where a custom pleading is appropriate;
- motion where a motion is required;
- proposed order where needed;
- supporting declaration/affidavit/verification where needed;
- correct exhibit treatment;
- correct service/certificate treatment.

Each court-facing component has the correct:

- instrument identity;
- court;
- county/district/venue treatment;
- case mode;
- caption treatment;
- case number treatment;
- required contents;
- signer;
- execution;
- notarization/verification when required;
- service;
- attachments/exhibits;
- privacy/redaction treatment;
- proposed order/judge signature treatment.

## 8.2 Packet Information

The product collects only the facts needed to generate the packet, at the correct lifecycle stage.

Required behavior:

- reuse known facts;
- derive deterministic values;
- do not ask duplicates;
- do not hide packet-generation facts until after generation;
- do not confuse filing-readiness tasks with generation prerequisites;
- save/resume works;
- Edit works;
- answers persist;
- DTC and sponsored RCAP converge on the same packet semantics;
- Clinic Mode preserves those semantics;
- EN/ES uses stable fact identities;
- mobile and keyboard use are functional.

## 8.3 Participant guide

One shared production participant-guide system renders route-specific:

1. Overview
2. Next Steps
3. Filing Checklist
4. Fees & Costs

Full packet:

```text
participant guide + court filings
```

Court-only:

```text
court filings only
```

Participant-guide pages may include:

```text
KEEP FOR YOUR RECORDS
DO NOT FILE
```

Court filings may not.

## 8.4 Integrated journeys

Hosted acceptance proves real application behavior for:

- anonymous DTC;
- payment;
- sponsored RCAP;
- Clinic Mode;
- Packet Information;
- generation;
- Briefcase/download;
- full packet;
- court-only;
- English;
- Spanish;
- desktop;
- mobile;
- keyboard-only;
- guidance-only/noncommercial routes.

## 8.5 Release

One integrated candidate is:

- committed;
- pushed;
- published where applicable;
- tied to an immutable worker digest;
- accepted against the same bytes;
- free of stale evidence;
- frozen;
- ready for deliberate production promotion.

## 8.6 Production

Production is not complete until:

- Roger explicitly authorizes promotion;
- production is deployed;
- live smoke checks pass;
- no known implementable Grade A defect remains.

---

# 9. Non-Negotiable Mission Lock Rules

Both agents must obey these rules.

## Rule 1: Build, do not re-plan

Do not create another broad:

- audit;
- roadmap;
- governance project;
- architecture memo;
- research queue;
- nationwide census;
- "phase zero";
- status taxonomy;
- replacement worklist.

Use the existing Mission Lock and execute it.

## Rule 2: One master worklist

There is one Mission Lock worklist.

Claude maintains it.

Codex reports into it.

Do not create competing definitions of remaining work.

## Rule 3: No reopening proven work without a defect

Do not re-review a route, form, pleading, source, or acceptance result merely because it is old.

Reopen only when there is:

- a concrete new defect;
- changed authoritative material;
- changed product bytes that invalidate evidence;
- a current acceptance failure tied to that item.

## Rule 4: No scope reduction as repair

Do not:

- disable a route;
- hide a route;
- convert a packet route to guidance-only;
- make it noncommercial;
- remove a jurisdiction;

merely because implementation is broken.

Repair the route.

Only Roger may intentionally reduce product coverage.

## Rule 5: No fake denominators

Never present:

- six proven routes;
- workbook rows;
- currently tested routes;
- currently commercially open routes;
- one browser matrix;

as the nationwide denominator unless they actually are the nationwide denominator.

## Rule 6: No stale evidence laundering

If relevant packet bytes, renderer behavior, route logic, or acceptance inputs change, stale evidence must not remain authoritative.

Do not "roll hashes forward" without re-proving what changed.

## Rule 7: Green must mean something

A test that compares a candidate with itself proves nothing.

Do not:

- point a freeze at the current tip;
- rewrite expected output to match broken output;
- weaken a control because it fails;
- remove assertions to get green;
- hardcode the candidate as its own baseline.

## Rule 8: Fix shared defects once

If one shared implementation defect affects multiple routes:

1. prove the shared cause;
2. fix it once;
3. identify the affected routes;
4. run targeted regression coverage.

Do not manually repair every route if one shared fix is the correct solution.

## Rule 9: Route defects remain route-specific

Do not turn a route-specific defect into a nationwide audit unless evidence shows the defect is shared.

## Rule 10: No bureaucracy as evidence

A new register, manifest, checklist, status file, or report is not progress unless it supports an actual implementation or acceptance need.

---

# 10. Court Document Rules

Court-facing documents are court documents, not product screens.

They must not contain:

- LegalEase branding;
- Expungement.ai branding;
- RCAP branding;
- internal route identifiers;
- workflow statuses;
- provenance labels;
- developer instructions;
- participant coaching;
- "Not attached";
- "To be confirmed";
- "Needs review";
- "Upload this";
- internal source commentary;
- guide-only content.

Court filings may contain legitimate legal blanks when the participant or court must complete them later.

A legitimate blank is not the same thing as missing product data.

Do not invent facts.

---

# 11. Form vs Custom Pleading Rule

For every route/component:

1. determine whether an official/mandatory form controls;
2. if yes, use that form;
3. do not replace it with a generic custom pleading;
4. if no official form controls and a composed pleading is appropriate, produce a Grade A custom document;
5. preserve official form structure and required attachments where applicable.

The same rule applies to:

- petitions;
- motions;
- applications;
- affidavits;
- declarations;
- proposed orders;
- notices;
- certificates;
- cover sheets.

Do not assume a custom pleading is acceptable merely because a renderer can produce one.

---

# 12. External Document Rule

Documents the participant must obtain from somewhere else include examples such as:

- certified dispositions;
- docket sheets;
- criminal history reports;
- certified copies;
- prosecutor records;
- agency records;
- clerk-issued records.

These are generally **filing-readiness items**, not packet-generation prerequisites.

The platform must not require an upload merely to:

- finish screening;
- pay;
- receive sponsorship;
- complete Packet Information;
- generate the documents the platform itself can generate;
- download the generated packet.

The guide/checklist should explain, when supported:

- what the participant needs;
- why it is needed;
- where to obtain it;
- whether certification matters;
- freshness requirements;
- copy requirements;
- filing sequence;
- how it is attached or used.

If the platform needs a fact that appears on an external document in order to populate a pleading, ask for the **fact**, not necessarily the upload.

No upload/scan/OCR requirement should be introduced merely because the participant later needs the underlying document.

---

# 13. Source and Legal Content Rule

New participant instructions may be authored when they are directly supported by:

- statute;
- rule;
- official form instructions;
- authoritative court material;
- an existing source-backed route decision;
- deterministic route data;
- ordinary nonlegal product copy.

Do not invent consequential legal/procedural content.

Unknown fees are not zero-dollar fees.

Unknown procedure is not permission to guess.

If a true legal-design decision remains unresolved, hand it to Claude/Captain.

Do not start a national source reacquisition project to resolve one narrow missing fact.

---

# 14. English / Spanish Rule

English/Spanish parity means equivalent product behavior and equivalent legal meaning, not merely that a locale toggle renders.

Engineering may verify:

- stable IDs;
- runtime parity;
- layout;
- persistence;
- route convergence;
- browser behavior.

Substantive legal translation remains Captain-owned unless already approved.

Do not silently machine-invent a Spanish legal label or legal instruction to make a test pass.

---

# 15. Workstream Ownership Matrix

| Workstream | Claude | Codex | Parallel? |
|---|---|---|---|
| Remaining pleading/form remediation | OWNER | Test/read only | Yes |
| Official form identity | OWNER | Test/read only | Yes |
| Custom pleading legal substance | OWNER | Test/read only | Yes |
| Route legal/source decisions | OWNER | Handoff | Yes |
| Participant-guide legal content | OWNER | Renderer/test | Yes |
| EN/ES substantive legal wording | OWNER | Runtime/test | Yes |
| Hosted acceptance | Consult | OWNER | Yes |
| Packet Information mechanics | Consult | OWNER | Yes |
| Save/resume/edit | Consult | OWNER | Yes |
| Browser E2E | Consult | OWNER | Yes |
| DTC mechanics | Consult | OWNER | Yes |
| RCAP mechanics | Consult | OWNER | Yes |
| Clinic Mode mechanics | Consult | OWNER | Yes |
| Mobile/keyboard acceptance | Consult | OWNER | Yes |
| Determinism controls | Consult | OWNER | Yes |
| Release-control engineering | Approval | OWNER | Yes |
| Commercial eligibility | OWNER | No unilateral change | No |
| Route availability | OWNER | No unilateral change | No |
| Shared document renderer | SERIALIZED | SERIALIZED | No |
| Route schema | SERIALIZED | SERIALIZED | No |
| Shared guide schema | SERIALIZED | SERIALIZED | No |
| Fulfillment foundation | SERIALIZED | SERIALIZED | No |
| Acceptance pin architecture | SERIALIZED | SERIALIZED | No |
| Final integrated freeze | OWNER | Support | No |
| Production promotion | Roger only | Roger only | No |

---

# 16. Serialized Shared Foundation

The following areas must not be edited by Claude and Codex simultaneously:

- shared document renderer;
- route specification schema;
- guide contract/schema;
- shared fulfillment foundation;
- commercial-state machinery;
- acceptance pin/freeze architecture;
- any shared field ownership/presentation schema.

If Codex needs one of these changes, Codex must send:

```text
SHARED FOUNDATION CHANGE REQUEST

Defect:
Affected behavior:
Affected files:
Why local repair is insufficient:
Proposed smallest fix:
Known route impact:
Acceptance that will prove the fix:
```

Claude decides ownership before changes begin.

---

# 17. Claude Work Queue

Claude should continue substantive work while Codex clears engineering.

## A1. Remaining filing-document remediation

Use the existing known worklist.

For each unresolved item determine and implement:

- correct instrument;
- correct form/custom vehicle;
- court;
- venue;
- case mode;
- caption;
- case number treatment;
- required allegations;
- prayer/relief;
- signer;
- verification;
- notarization;
- service;
- exhibits;
- privacy/redaction;
- proposed order;
- local/official requirements.

Do not redo already-settled routes.

## A2. Participant-guide content

Populate route-specific guide data for:

- Overview;
- Next Steps;
- Filing Checklist;
- Fees & Costs.

Include supported:

- filing destination;
- actor;
- sequence;
- service;
- copies;
- external documents;
- hearing/objection stops;
- filing fees/costs;
- post-filing steps.

## A3. Genuine remaining legal/source blockers

Resolve only real blockers.

Do not create a broad research queue from nonblocking uncertainty.

## A4. Substantive EN/ES parity

Repair only actual missing or incorrect route/legal content.

Do not create a general translation audit if the runtime inventory already identifies the defect.

---

# 18. Codex Work Queue

Codex executes in this order unless the Captain explicitly reprioritizes.

## C1. Hosted acceptance

Finish the active hosted-acceptance sequence.

For each failure:

1. capture the exact failing check;
2. reproduce it;
3. determine candidate-caused vs pre-existing;
4. establish what the check is supposed to prove;
5. repair the engineering defect;
6. prove the control still detects the prohibited condition;
7. rerun the affected phase;
8. do not bypass the gate.

Do not rebuild/republish the worker unless canonical worker inputs actually changed.

Do not reopen route work unless hosted acceptance exposes an actual route defect.

## C2. Packet Information engineering

Prove and repair:

- lifecycle placement;
- fact reuse;
- deterministic derivation;
- no duplicate asks;
- save/resume;
- Edit;
- persistence;
- DTC/RCAP convergence;
- Clinic Mode convergence;
- external-document handling;
- EN/ES fact identity;
- mobile behavior;
- keyboard behavior.

If route-specific fact ownership is missing, hand it to Claude rather than guessing.

## C3. Browser/E2E journey acceptance

Prove real hosted journeys for:

- DTC;
- sponsored RCAP;
- Clinic Mode;
- guidance-only/noncommercial route;
- full packet;
- court-only packet;
- English;
- Spanish;
- desktop;
- mobile;
- keyboard-only.

Use representative shared-behavior cases plus targeted regressions for known repaired defects.

Do not mechanically run every state when the behavior is shared and already proven.

## C4. Release-control hardening

Prove:

- candidate/evidence binding;
- immutable worker digest;
- deterministic output;
- stale evidence invalidation;
- truthful dynamic denominators;
- no stale pins;
- no candidate-vs-itself acceptance;
- rollback/recovery controls;
- one integrated release manifest.

---

# 19. Packet Information Lifecycle

The intended lifecycle is:

```text
Screening
  ↓
Results
  ↓
Payment OR Sponsored Admission
  ↓
Packet Information
  ↓
Participant Review
  ↓
Generation
  ↓
Briefcase / Download
  ↓
Participant completes filing-readiness tasks
  ↓
Filing
```

Screening should remain focused on eligibility/routing.

Packet Information should collect facts needed to prepare the packet.

Filing-readiness tasks should not be forced into screening or generation merely because they happen before filing.

---

# 20. Participant Guide Contract

The participant guide must use one shared renderer and route-specific data.

Required sections:

```text
Overview
Next Steps
Filing Checklist
Fees & Costs
```

The guide may explain:

- what the generated documents are;
- where to file;
- what to obtain separately;
- what to sign/notarize;
- what copies to make;
- what to serve;
- expected costs;
- objections/hearings;
- post-filing steps.

It must not invent legal advice beyond supported route instructions.

Legacy `filing_instructions` should not coexist indefinitely with the new guide as two competing instruction systems.

Retire legacy behavior only when the replacement is actually proven.

---

# 21. Acceptance Strategy

Acceptance should prove the product at the correct level.

## Shared behavior

Prove once where behavior is genuinely shared.

Examples:

- authentication boundary;
- Packet Information persistence;
- guide/full-vs-court-only assembly;
- deterministic renderer;
- locale runtime;
- mobile navigation.

## Route-specific behavior

Use targeted coverage where route data drives meaningful variation.

Examples:

- form selection;
- special attachments;
- declaration presence;
- hearing/objection stops;
- case-mode variation;
- external-document requirements;
- unique order structure.

Do not confuse broad test count with product coverage.

---

# 22. Evidence Rules

Every completion claim should identify:

- exact commit SHA;
- exact route/pathway where relevant;
- exact artifact/output where relevant;
- exact test/control;
- exact result;
- whether it was local or hosted;
- whether the result is tied to the same bytes being integrated.

Do not report a local unit test as hosted acceptance.

Do not report "published" as "deployed."

Do not report "accepted" as "live."

---

# 23. Status Vocabulary

Use these words precisely:

## IMPLEMENTED

Code/data/content exists in the worktree.

## COMMITTED

Implementation is in a Git commit.

## PUSHED

Commit exists on the remote branch.

## PUBLISHED

A deployable artifact/image/package has been created.

## ACCEPTED

Required acceptance against the exact candidate/artifact passed.

## DEPLOYED

Candidate has been deployed to the target environment.

## LIVE

The intended production behavior has been verified in production.

## TERMINAL

No known remaining action is required for that Mission Lock item, and the Captain has accepted the evidence.

Do not collapse these states.

---

# 24. Handoff Protocol

## 24.1 Codex to Claude: Captain Handoff

When Codex encounters substantive legal/content work:

```text
CAPTAIN HANDOFF

Jurisdiction/pathway:
Defect:
Observed behavior:
Expected product behavior:
Evidence:
Affected files:
Why this is substantive/legal:
Smallest Captain decision required:
Engineering work that can continue independently:
```

Codex should continue independent work rather than waiting idle.

---

## 24.2 Codex batch completion

Each meaningful Codex batch reports:

```text
PLAN ITEM

DEFECT

ROOT CAUSE

FILES CHANGED

PROOF

REGRESSION CONTROL

COMMIT

PUSH STATUS

CAPTAIN HANDOFFS

NEXT
```

---

## 24.3 Claude integration review

Claude checks:

- ownership boundary respected;
- no legal substance changed accidentally;
- no route/commercial state changed without decision;
- no weakened controls;
- no tautological acceptance;
- no hardcoded shortcut replacing an explicit contract;
- no external-document upload gate;
- no court-document contamination;
- evidence matches exact bytes.

Then Claude integrates the **smallest proven batch** and reruns affected acceptance.

---

# 25. Do Not Do List

Neither agent should do any of the following unless a concrete current defect requires it.

Do not:

- create a new national audit;
- review all 50 states again;
- recalculate every historical source;
- build a second worklist;
- create a second route taxonomy;
- rewrite established legal decisions for style;
- reformat already-correct pleadings merely for cosmetic preference;
- re-run archive archaeology;
- reacquire sources already proven sufficient;
- produce giant reports instead of fixing defects;
- add new metadata solely to document that metadata exists;
- create controls whose only purpose is to verify other controls exist;
- duplicate another agent's active work;
- silently change product scope;
- disable broken routes instead of fixing them;
- treat containment as completion;
- mark external blockers without first proving the blocker is real;
- wait on one blocked item when independent work remains.

---

# 26. Bias Toward Completion

When there are two valid ways forward, prefer the one that:

- repairs the actual product;
- changes fewer shared surfaces;
- preserves established decisions;
- creates reusable shared behavior;
- produces directly testable output;
- reduces remaining Mission Lock work.

Avoid solutions that primarily produce:

- more documentation;
- more intermediate statuses;
- more owner decisions;
- more manual route lists;
- more special cases;
- more duplicated acceptance infrastructure.

---

# 27. Work Session Start Procedure

At the beginning of each work session, the agent should:

1. read this Build Plan;
2. sync repository state;
3. identify current branch and SHA;
4. inspect dirty state;
5. refresh current acceptance/run status;
6. identify the next item from its own lane;
7. verify the item is not already terminal;
8. verify the other agent does not own it;
9. begin execution.

Do not spend the first hour reconstructing the whole project if the next work item is already known.

---

# 28. Work Session Stop Procedure

At the end of a batch/session report only:

```text
WHAT CHANGED

WHAT IS PROVEN

WHAT BECAME TERMINAL

WHAT REMAINS

BLOCKERS

CAPTAIN DECISIONS REQUIRED

EXACT NEXT ITEM
```

Keep it concise.

Do not write a retrospective unless it is necessary to explain a defect.

---

# 29. Parallel Execution Cadence

Use natural batch boundaries.

Claude and Codex should **not** continuously rebase on each other's every small commit.

Recommended pattern:

```text
Claude substantive batch
        ↘
         Captain integration point
        ↗
Codex engineering batch
```

If Claude changes shared behavior that invalidates Codex evidence, Codex refreshes after the Captain batch lands.

If Codex changes shared engineering that affects Claude's outputs, Claude reviews and integrates before relying on it.

---

# 30. When Parallel Work Stops

Parallel mutation stops when:

- remaining substantive work is nearly complete;
- shared foundations are converging;
- release evidence would be invalidated by further parallel edits;
- the product is ready for integrated final acceptance.

At that point:

> Claude becomes sole integrator.

Sequence:

```text
Integrate remaining approved batches
    ↓
Regenerate affected artifacts
    ↓
Run integrated acceptance
    ↓
Resolve actual failures
    ↓
Freeze one candidate
    ↓
Final hosted acceptance
    ↓
Roger production authorization
    ↓
Production cutover
    ↓
Live smoke
```

---

# 31. Final Integrated Acceptance

Before production authorization, prove at minimum:

## Documents

- filing vehicle correct;
- filing-grade formatting;
- no internal/product contamination;
- correct caption/case mode;
- required signing/execution blocks;
- service/order/exhibits correct;
- full packet and court-only boundaries correct.

## Packet Information

- facts collected at correct lifecycle;
- no duplicate asks;
- persistence;
- Edit;
- sponsored/DTC convergence;
- Clinic Mode convergence.

## Guide

- correct sections;
- route-specific instructions;
- costs handled accurately;
- external-document requirements correctly separated from generation.

## Browser

- DTC;
- RCAP;
- Clinic;
- EN;
- ES;
- desktop;
- mobile;
- keyboard;
- generation;
- download/Briefcase.

## Release

- exact candidate SHA;
- exact worker source SHA;
- exact immutable digest;
- deterministic outputs;
- no stale acceptance;
- rollback path known;
- production boundary still intact.

---

# 32. Production Boundary

Until Roger explicitly authorizes it, do not:

- promote to production;
- deploy production;
- mutate live environment data;
- enable live charges;
- exercise live customer payment;
- alter production webhook destinations;
- perform irreversible production migration.

Staging/acceptance actions must remain visibly separated from production.

---

# 33. Immediate Plan From Here

Unless the Captain changes priority, execute in parallel:

## Claude

```text
A1 Remaining filing-document remediation
    ↓
A2 Participant-guide route content
    ↓
A3 Genuine remaining legal/source blockers
    ↓
A4 Substantive EN/ES parity defects
```

## Codex

```text
C1 Finish hosted acceptance
    ↓
C2 Packet Information engineering
    ↓
C3 Real browser/E2E journey acceptance
    ↓
C4 Release-control hardening
```

Then:

```text
Captain integration
    ↓
Integrated Grade A acceptance
    ↓
Freeze
    ↓
Roger production decision
```

---

# 34. Agent Startup Instructions

## Claude

Read this file as the controlling Mission Lock Build Plan.

You are Captain and integration authority.

Continue the substantive Grade A worklist.

Do not duplicate Codex's engineering lane.

Do not reopen already-proven work without a new concrete defect.

Maintain one master remaining-work denominator.

Review and integrate Codex batches only after confirming:

- they stay inside engineering ownership;
- they do not alter legal substance;
- acceptance remains meaningful;
- evidence matches the exact integrated bytes.

---

## Codex

Read this file as the controlling Mission Lock Build Plan.

Claude is Captain.

You are the engineering execution lane.

Work from `codex/mission-lock-engineering`.

Do not push directly to `captain-release`.

Execute C1 through C4.

When an issue requires substantive legal/content judgment, send a Captain Handoff and continue independent engineering work.

Do not weaken acceptance, reduce route scope, or invent legal content.

---

# 35. Mission Lock Question

Before starting any unplanned task, ask:

> Does this task directly fix, prove, integrate, or launch a required part of the Grade A product?

If **yes**, proceed in the correct ownership lane.

If **no**, do not start it.

If uncertain because it touches shared/legal ownership, hand it to the Captain.

---

# 36. Final Reminder

The purpose of this plan is not to maximize activity.

The purpose is to finish Expungement.ai.

The project should continuously move toward:

```text
correct route
+
correct filing vehicle
+
Grade A court documents
+
correct Packet Information
+
correct participant guide
+
real end-to-end product journey
+
truthful acceptance
+
one frozen release
+
production launch
```

Anything that does not materially advance that chain should be treated with suspicion.

**Build the product. Prove the product. Integrate the product. Launch the product.**
