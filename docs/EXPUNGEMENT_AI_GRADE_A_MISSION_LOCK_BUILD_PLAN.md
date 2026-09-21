# Expungement.ai • Grade A launch execution plan

**Date:** September 21, 2026  
**Repository:** `Roger-LegalEase/legalease-partner-dashboard-clean`  
**Objective:** Finish the existing Expungement.ai, RCAP partner platform, Standard Clinic Mode and configured Legal Aid Clinic Mode, and satisfy the attached Final QA Package. Do not rebuild the platform from scratch.  
**Adoption:** Use this as the execution revision of `docs/EXPUNGEMENT_AI_GRADE_A_MISSION_LOCK_BUILD_PLAN.md`, not a second competing plan. Preserve the earlier versions in Git history and their still-applicable source, legal and visual requirements. This document prepares execution; it reports no new implementation, approval, hosted acceptance or production deployment.

## 1. The finish line and the decision rule

The delivered product must be professionally presented, legally appropriate, secure and usable from first interaction through document delivery, return visits and support. A participant receives the correct route-specific documents and instructions without duplicate intake, lost work, wrong-person access, double charging or dead ends. Partners can operate their programs and clinics without developer intervention for normal tasks.

**The attached `ExpungementAI_Final_QA_Checklist.xlsx` is the acceptance tracker.** Preserve its 248 control types, P00–P11 organization, case/page coverage requirements, result states and necessary human approvals. It is not 248 total executions. Every applicable route, outcome, channel, local variant, role, language and unique document/page needs the required evidence. A held promised route stays in scope.

Before starting or expanding work, answer yes to Roger’s five questions:

> Are we moving with maximum precision and efficiency? Are we avoiding redundancy and bureaucracy? Are we maximizing the potential of both agents? Are we avoiding drift? Are we marching toward a Grade A launch?

Apply that rule through one practical test: **this task must close a specific launch requirement, reuse existing work where possible, have one implementation owner, and have a defined acceptance result.** If it does not, do not start it. This is a decision rule, not a new approval form or a ritual to repeat in every progress message.

Efficiency removes duplicate work. It does not remove required quality, security, legal or visual proof.

## 2. Start from the work we have

The supplied independent-audit transcript reports 106 capability entries: 90 BUILT, six BUILT ELSEWHERE / NOT INTEGRATED, one PARTIALLY BUILT and nine CANNOT VERIFY. It reports no demonstrated whole-capability absence and maps 740 pathway identities across 51 jurisdictions. These are implementation observations, not a launch-readiness percentage or proof that every pathway delivers correctly. [A]

The remote `captain-release` head independently read for this plan is:

`8f3a7891777027f3eac98936eb56b09c133624a2`

It matches the snapshot named in the audit transcript. It is a starting reference, not an accepted production release. At restart, inspect local unpushed work and any subsequent remote delta once; do not reset either agent to this SHA if legitimate later work exists. [R1]

The full `BUILT_VS_NOT_BUILT.md` remains an input from the independent Codespace. Its fetch at the current remote Captain path returned 404. Use its saved rows and evidence directly at handoff; do not invent the identities of all six missing integrations or all nine unknowns from the summary.

### Work already identified for preservation or focused action

| Existing evidence | Execution consequence |
|---|---|
| Missouri packet discovery and current download fixes are reported integrated. | Preserve them. Repair a new failure only at its demonstrated source; do not repeat their implementation. |
| Connecticut packet work existed before later unfinished labels; checked approval PDF hashes match. | Preserve the identified artifacts and applicable approvals. Existing files do not alone prove every current route’s selection or delivery. |
| 32 recovered source originals are hash-verified; 33 bindings remain integrated. | Reuse the exact recovered custody and bindings. Do not start a replacement acquisition campaign or claim the entire corpus is mounted. |
| Payment/recovery, receipt, privacy and attribution changes exist in other branches; the audit identifies missing or partial integration. | Inspect the exact audit-identified changes and their dependencies; port only missing compatible fixes. An entire old PR is not automatically safe to merge. |
| Current authentication/continuation, sponsorship, Packet Information, render jobs and authorized downloads exist. | Finish their real gaps and prove the connected experience. Do not create replacement systems. |
| Reporting, counter, logging and verifier defects are reported. | Repair current customer/security/QA impact once per root cause. Historical dead tooling is not a launch project unless it can affect this execution or release. |

Source: the supplied audit transcripts and their evidence references. These entries are a starting handoff, not independently re-executed closures. [A]

### Resolve the instruction conflicts once

**Purchase sequence.** Current `docs/PRODUCT_CONTRACT.md` §0 and QA control **P06-03** require packet information and verification before checkout. The supplied September 21 Mission Lock §19 instead diagrams payment before Packet Information. This plan follows the product contract and the latest instruction to pass the attached QA:

`Screening → preliminary result → authenticated claim → participant-owned matter/Briefcase → necessary Packet Information → review/verification → DTC checkout and settlement → generation → download and filing tasks.`

Reuse known information and existing collection/verification code. Do not push detailed packet intake into screening. Signatures, notarization, certified-copy acquisition and other filing-only tasks do not become purchase prerequisites merely because filing eventually requires them. Supported sponsored admission remains its separate authority path, with participant ownership, consent and verification intact and no consumer charge. Update only contrary instructions and controls; retain correct implementation. [R2, Q: P03-09, P06-03, P06-18]

**A1.** Adopt the supplied September 21 scope lock: preserve the closed 346-family construction baseline. The standing post-terminal cohort is eight families / 36 documents plus the finite historical §5 findings. This is neither an instruction to repair all 36 again nor permission to skip final nationwide QA. Already-correct findings close through their current successor evidence. Additional repairs require an actual current defect or changed governing requirement. [B]

**UI and security work.** The inspected `AGENTS.md` still excludes new Expungement.ai UI work and contains older sprint directions. Replace conflicting launch instructions in place so required UX and nonproduction security engineering are in scope. Preserve production, money, credentials, participant-data and destructive-action safeguards. Do not run a separate repository-wide skills-cleanup project. [R3]

## 3. Two implementation agents, one integrated product

| Responsibility | Owner | Working boundary |
|---|---|---|
| Integration, exact launch scope and the existing remaining-work list | Claude | Sole writer to the integration branch under its existing permissions. Integrate small coherent changes and their dependencies, not old branch histories wholesale. |
| Legal routing, forms, pleading substance, document data, filing guidance and substantive EN/ES content | Claude | Reuse accepted sources, forms, decisions and templates. Obtain qualified approval where required; an agent is not a substitute for that approval. |
| Consumer/partner/clinic UX, payments, identity, privacy/security, persistence, fulfillment, renderer mechanics and test/release engineering | Codex / Astra 6 | Work in the established engineering lane; no direct integration-branch push. Read the audit once, then the exact task’s sources and consumers. |
| Independent final QA recommendation and evidence/page review | ChatGPT, using the package’s review-lead role | Review actual outputs, source passages and execution evidence in active review sessions. A runner’s report is not independent approval. |
| Required professional, physical or operational judgments | Existing qualified authorized reviewers/operators | Narrow legal, Spanish-comprehension, screen-reader, physical-clinic, security or production actions. Reuse valid prior approvals. |

Each implementation agent takes one coherent outcome at a time. Both continue on nonconflicting work. There is no mandatory fleet of subagents and no verification swarm.

Executable shared foundations default to Codex ownership; legal/document/guide content defaults to Claude. For shared files, name the writer in the existing work item before edits. The other agent supplies the required behavior or patch proposal, not simultaneous edits. Claude does not reimplement engineering to review it; Codex does not invent legal decisions to avoid a handoff.

Integrate at meaningful batch boundaries, not every small commit and not after weeks of isolated work. Independent QA can review stable outputs while the runner prepares the next batch. When a dependency changes, refresh the affected evidence, not everything.

## 4. Execution order: four completion gates

These gates organize implementation. They do not replace or renumber the twelve QA phases.

### Gate 1 — Convert the audit into executable launch work

**Codex:** use the saved capability report and evidence to identify the exact six branch integrations, the missing part of the partial capability, current defects inside built capabilities, and the nine unresolved proof areas. Check any changed snapshot only where it affects the finding. Do not resume a 245-PR reading target.

**Claude:** join those items to the existing worklist and relevant QA control/case IDs. Preserve each verified existing implementation. Put one row per remaining outcome, with only: requirement/defect, existing work to reuse, smallest remaining change, owner, dependency and closing evidence. Multiple failed cases sharing one root link to that row.

**In parallel:** verify the actual authorized nonproduction app, database, worker, storage, provider sandbox, test inbox and required private source access. Name the required human/device/clinic reviewers and existing performance targets. Missing access blocks the dependent test, not all useful work. Do not change target projects to make a credential work.

Load final-QA scope from the audit’s existing inventories plus actual promised coverage. Instantiate applicable controls using existing tooling and evidence links. Do not create a replacement census or manually maintained parallel tracker.

**Gate 1 is complete when the known launch work has exact owners and evidence, the first safe batches are executable, and all QA areas have visible coverage or a named remaining proof task.** The nine unknowns become bounded verification tasks; they do not require a new open-ended audit before implementation resumes.

### Gate 2 — Recover missing work and make the connected journeys succeed

**First Codex batch:** the audit-identified missing payment/recovery, receipt and privacy integrations, including required schema, caller, privilege and compatibility dependencies. Check current successors before importing. Preserve existing sponsorship and ownership safeguards. Audit evidence has also identified defects in some branch-only fixes; “built elsewhere” is not permission to ship them unchanged.

**First Claude batch:** the finite still-live A1 document defects and current route/form/guide mismatches. Start from existing correct packet artifacts and source-backed decisions. Any renderer-mechanics defect becomes one named shared correction, not separate state rebuilds.

Carry both batches through the actual nonproduction product. Establish connected reference journeys for DTC, RCAP and every materially distinct Standard/Legal Aid clinic profile, including MVLP where offered. These exercise the shared plumbing early; they are not substitutes for final per-route coverage.

The required result is the same participant-owned matter moving through the real UI and services to the expected persisted, authenticated downloadable output. Connect provider settlement or legitimate sponsorship, job, artifact and repeat download. Do not insert a final “paid,” “verified” or “ready” row to bypass the transitions being tested.

Finish the remaining partner/clinic and Packet Information gaps as those existing paths expose them. Include safe recovery: leave/resume, lost save, expired auth, edit/reverify, early payment return, duplicate events, worker retry and stale-output replacement without duplicate payment or credit.

Security and accessibility tests travel with these batches. Do not leave them until a cosmetic final pass.

**Gate 2 is complete when missing integrations and demonstrated shared-path failures are corrected and the connected reference journeys pass on the integrated candidate.** It is not yet a national Grade A sign-off.

### Gate 3 — Close all attached QA coverage and commercial polish

Finish route-specific, document, content, role, device and operational exceptions using the existing QA workbook. The scope below is the package’s scope, not optional enhancements. [Q]

| QA phase | Controls | Required launch outcome | Build owner |
|---|---:|---|---|
| P00 — Exact review scope | 20 | Same release identities; all intended routes/outcomes/local variants, sources, roles and surfaces accounted for; independent expectations and real access. | Claude integrates; Codex supplies runtime inventory/evidence. |
| P01 — Public experience, messages, Wilma | 20 | Polished entry/pricing/help/policies, working links and messages, grounded and isolated Wilma, clear errors and no unsupported claims. | Codex UI/runtime; Claude substantive/legal copy. |
| P02 — Legal/procedural correctness | 24 | Correct remedy, timing, exclusions, vehicle, venue, actors, fees, execution and local scope; correct positive and negative outcomes in all jurisdictions. | Claude plus required qualified approval. |
| P03 — Screening through Packet Information | 22 | Fact reuse, no duplicate mandatory asks, safe derivation, necessary workload only, verified saves, resume/edit and correct purchase/filing staging. | Codex; Claude owns legal fact requirements. |
| P04 — Every form and filing | 24 | Correct contents, protected blanks, professional typography/pagination, complete components and all required unique final page/variant reviews. | Claude content/output; Codex shared renderer mechanics. |
| P05 — Guides and assembly | 17 | Approved four-section design, accurate route instructions/fees, EN/ES, readable overflow and exact full/court-only separation. | Claude content; Codex renderer/assembly. |
| P06 — DTC payment to delivery | 22 | Real sandbox payment to exact authorized output on every offered DTC path, including retries, concurrency, refunds where supported and no duplicate side effects. | Codex. |
| P07 — RCAP partner operations | 20 | Provisioning, prepared onboarding, invitations, publication, staff/codes, sponsorship, caps/overages, billing, truthful reporting and closure. | Codex; Claude approved program terms. |
| P08 — Standard and Legal Aid Clinic Mode | 23 | Real profile workflow, assisted consent, sensitive-data restrictions, distinct program/legal/execution decisions, ten-person shared-device sequence, export and follow-up. | Codex workflow; Claude legal content; physical operators. |
| P09 — Security/privacy/integrity | 20 | Tested identity/role/tenant/event/resource boundaries, RLS/RPC/storage, secrets, logging, data rights, concurrency, migration and recovery. | Codex plus qualified assurance where required. |
| P10 — Accessibility/language/devices/performance | 18 | Actual supported-device usability, EN/ES meaning, keyboard/screen-reader checks, printing and accepted load/response/recovery targets. | Codex; qualified language/device users. |
| P11 — Final regression/live release | 18 | All required coverage closes on the exact candidate, followed by authorized production and live operational evidence. | Claude integrates; Codex executes; independent review; Roger authorizes. |
| **Total** | **248** | **Control types, not total test instances.** | |

#### The quality bar is observable

**Documents:** official forms control where required. Custom petitions, motions and orders follow the actual court’s format and source-backed contents, including caption, allegations, relief, verification, service and signer roles. No invented judicial acts, generic report page substituted for a pleading, wrong-jurisdiction fallback, clipped values, missing body text, internal tokens or product branding on filings. The approved guide remains separate; informational translations never replace a required filing-language form.

**Experience:** use the approved design and existing components rather than redesigning the brand. Inspect real loading, empty, error, success, timeout and recovery states, not just the happy-path screenshot. Measure manual participant effort, not screen headings. Partners review prepared information instead of retyping it; commercial authorization is never silently supplied for them. Staff can run the clinic without seeing another participant’s data or needing a developer for normal operations.

**Completeness:** every intended route and materially different outcome/channel combination has explicit coverage. Each offered packet path proves its own selection, population, requirements and connected delivery in applicable languages. Reuse common harness steps and genuinely equivalent evidence, not an unrelated route’s success. Pairwise presentation/device cases do not replace coupled legal, financial or permission branches.

**Page review:** inspect every unique required canonical, boundary, local-form, language and layout-stress output at readable resolution. An exact hash-bound existing review can be reused when its requirements, scope and source applicability remain current. Different bytes need applicable review; contact sheets and matching aggregate page counts are not approval. Use the package’s small review batches, including the five-packet/40-page limit, without reducing overall coverage.

**Gate 3 is complete when every applicable pre-release requirement has passed with its actual evidence or a supported true N/A, and no known defect against the agreed Grade A requirements remains.** S0–S3 ranks fix order; it does not waive an agreed requirement. An unrequested enhancement can be backlog; a promised missing feature cannot.

### Gate 4 — Freeze, release and prove the live product

Claude stops parallel changes to the release candidate after approved batches are integrated. Record the exact application SHA, worker source and immutable digest, data/source/template versions, configuration and target migration state. Keep the last accepted deployment intact while proving this successor.

Run final integrated acceptance and inspect complete results. No skipped downstream jobs, self-comparisons or unrelated crashes count as passes. Renew evidence for affected consumers after a correction. Rebuild and republish when real packaged inputs changed; do not repeatedly undo necessary fixes to preserve `rebuildRequired: false`.

Before production, satisfy applicable production-protection and privacy gates, required reviews, hosted journeys, migration compatibility, recovery and support ownership. The production-only permission/smoke cases remain pending until their actual stage; they are not premarked PASS or N/A.

**READY FOR AUTHORIZED RELEASE:** all prerequisites to production are evidenced against the exact candidate, with only explicitly scheduled production actions remaining.

**Roger’s exact GO → authorized target-specific migration/deployment sequence → production smoke → LIVE VERIFIED.** The actual migration/deployment order follows the existing compatibility and recovery procedure, not a generic fixed ordering. Confirm real domains, auth, saves, help, packaged assets and safe download boundaries. Confirm alerts, support/refund/retry handling and the named responder. Do not conduct destructive tests, actual court filings or unapproved live charges against customers.

Close P11 and this launch effort only after the accepted release is actually live and verified. Subsequent changes use scoped maintenance rather than restarting this project.

## 5. Security and SOC 2 Type II: use the existing gates

Use `docs/security/soc2/CONTROL_REGISTER.csv`, `READINESS_GATES.md`, the operating plan and approved private evidence system. Do not create a parallel compliance program or weaken security to accelerate delivery. [R4, R5]

For production, explicitly establish **CCG-B — Production Protection Minimum**, including its CCG-A prerequisite, and **CCG-D — Privacy and Data Lifecycle Ready** for the Grade A privacy promise. This includes actual privileged MFA/access reviews, an effective protected production change path, required checks, secrets inventory, backup evidence, alerts/responders, and one real end-to-end privacy request with required processor propagation. Apply other company gates where their stated scope requires them.

Read historical status notes as history: an old statement that deletion was never built cannot override current inspected code or the audit’s branch findings. Equally, implemented code is not proof that hosted settings or external processors are configured.

CCG-C/CCG-E concern operating cycles and observation readiness. CCG-F is the external auditor’s issued-report outcome. Passing the final QA package does not itself produce a SOC 2 Type II report or establish operating effectiveness over an unobserved period. Preserve the existing control-operation/evidence process and close its real outstanding requirements without pretending a checklist is certification.

The repository names Roger as executive owner, Lawrence for legal/privacy/compliance approval and Faith for evidence operations. Confirm the needed actions with those actual owners, reuse existing evidence and ask only for the specific external action an agent cannot perform. Nothing here schedules or fabricates their approval.

## 6. Keep the work and the prompts small

Maintain **one existing implementation worklist** and **one existing QA workbook**. The audit is evidence. The workbook’s Defects sheet links to existing build items; it is not a second build backlog. Keep exact cases, page review and result evidence in the package’s existing sheets. Runner outputs may populate those records; avoid two independently edited result systems.

Keep the applicable `AGENTS.md` short: current mission, owners, canonical plan, real safety boundaries and task-specific pointers. Load a skill only when it applies. Do not force a stack of architecture/legal/deployment documents before every edit. Preserve the detailed source and QA requirements as referenced material. This follows the supplied Astra guidance, not a new instructions-maintenance project. [W1]

Each agent’s task needs only **outcome, current evidence, owned scope and closing QA cases**. Safe local and already-authorized nonproduction work continues through implementation, actual inspection and correction without a permission question at each command. Existing push and external-operation scopes still apply. Production, live money, real participant data, destructive actions and privileged changes outside the authorized scope require exact authorization.

Checkpoints report: **customer outcome closed; relevant QA cases passed; exact change; remaining blocker/owner; next outcome.** No headlines about PR-reading percentages, agent counts or report volume.

## 7. First handoff and completion accounting

The first restart handoff must reuse the independent Codespace’s completed audit, including its full capability rows and specific missing-integration evidence. Transfer only required non-sensitive reports/locators and legitimate source custody using existing mechanisms. Do not rebuild the audit in the Captain’s worktree.

Claude adopts this revision in the existing plan path and names the two first nonconflicting batches. Codex begins the missing-integration batch using current actual code and compatible predecessors. Claude begins the live document/content exceptions. Independent QA starts with stable evidence, and required external reviewers receive their exact cases immediately. No new national discovery gate stands in front of known safe work.

Success is counted by required product outcomes and applicable QA cases, with explicit unique artifact/page coverage. The 106 capability entries, 740 pathway identities, 346-family baseline and 248 control types are different populations; none is a substitute for the others or a universal completion percentage.

**We finish when the existing platform meets the attached Grade A acceptance standard and the matching accepted product is live. Not when another report is written.**

## Source notes

- **[Q]** User-supplied `ExpungementAI_Final_QA_Package(1).zip`: Final QA Plan, Execution Prompt, Checklist workbook and `QA_Control_Library.csv`. The workbook/CSV’s 248 control rows were compared and match exactly; all start NOT RUN. Original workbook SHA-256: `3bf99c500db70f23b3053cd31763cf5e92e4df85780e719f4785868b7d69be00`. No QA outcomes were inserted.
- **[A]** User-supplied `Pasted text(20260921-195700).txt`, especially the saved audit results and final capability summary at displayed lines 1025–1042, plus prior supplied audit evidence. These are audit-reported findings, not a fresh execution of their entire underlying report in this planning session.
- **[B]** User-supplied `EXPUNGEMENT_AI_GRADE_A_MISSION_LOCK_BUILD_PLAN_2026-09-21_A1_LOCKED(1).md`, §§7.1, 17/A1, 19 and final acceptance. `ExpungementAI_Grade_A_Launch_Build_Plan_v2(10).md` supplies retained quality/visual and integration requirements; its old status counts and broad rebuild directions are not automatically current work.
- **[R1]** GitHub branch read, September 21, 2026: `captain-release` at `8f3a7891777027f3eac98936eb56b09c133624a2`.
- **[R2]** `docs/PRODUCT_CONTRACT.md` §§0–2 at that SHA; blob `48354aa3083e2e6f8530e13bcc07e0f7bcce5019`.
- **[R3]** `AGENTS.md` at that SHA; blob `64d558c3247937215820e68f3a50eab1d1305f62`. Current Mission Lock header read as version September 20, 2026; supplied A1-lock revision is September 21.
- **[R4]** `docs/security/soc2/COMPANY_CONTROLS_OPERATING_PLAN.md` at that SHA; blob `b25a8eb542174a63a66c325cec1756f1b1917330`.
- **[R5]** `docs/security/soc2/READINESS_GATES.md` at that SHA; blob `98706f59fbe8210a9c8868f96a697d06c9dd03e2`.
- **[W1]** OpenAI Developers, Eric Provencher, “Rethinking skills and prompts for GPT-6 Astra,” September 11, 2026. Official article checked September 21, 2026. Used only for lean task/skill instruction design.

Execution sequencing and ownership in this revision are recommendations for this launch, not claims that the work has been performed. No repository or external-system writes were made to prepare this plan.

## Retained from the superseded revision

This revision replaces the September 21 A1-locked revision at this same path. That
revision is preserved in Git history at `1efad92d3` and is referenced material, not
a second plan. The following sections of it remain controlling where this revision
is silent, because this revision changes execution order and ownership rather than
those rules:

- Non-Negotiable Mission Lock Rules (Rules 1–10), in particular no scope reduction
  as repair, no fake denominators, no stale evidence laundering, and green must
  mean something;
- Court Document Rules;
- the Form vs Custom Pleading Rule;
- the External Document Rule;
- the Source and Legal Content Rule — unknown fees are not zero-dollar fees and
  unknown procedure is not permission to guess;
- the English/Spanish Rule;
- the Serialized Shared Foundation list;
- the Status Vocabulary — implemented, committed, pushed, published, accepted,
  deployed, live and terminal are not collapsed;
- the Production Boundary;
- §7.1's closed 346-family construction baseline and §17's A1 scope lock, which
  §2 of this revision adopts by reference.

Two things this revision changes and the superseded one must no longer be read for:

1. **Purchase sequence.** The superseded §19 diagrammed payment before Packet
   Information. `docs/PRODUCT_CONTRACT.md` §0 Experience A and QA control P06-03
   both require packet information and verification before checkout, and §2 of
   this revision follows them. The superseded diagram is withdrawn.
2. **UI and nonproduction security scope.** The superseded revision inherited
   `AGENTS.md`'s sprint-era exclusion of Expungement.ai UI work. §2 of this
   revision brings required UX and nonproduction security engineering into scope.
   The production, money, credential, participant-data and destructive-action
   safeguards are unchanged.
