# Expungement.ai — Final Product QA and Release Review

**Scope:** Expungement.ai direct-to-consumer (DTC), RCAP partner operations, Standard Clinic Mode, and configured Legal Aid Clinic Mode, including MVLP where offered. All 50 states plus the District of Columbia. Every intended pathway, distinct journey, applicable local/form variant, generated document and customer-facing artifact.

**Prepared:** September 19, 2026. **Status:** QA DESIGN; execution has not started. No new route, document, test, deployment or legal approval is declared passed by this plan.

**Controlling build:** `ExpungementAI_Grade_A_Launch_Build_Plan_v2.md` and its supplied product, legal/document and supplemental-design requirements. This is the final independent review of the resulting product, not a replacement build plan or permission to interrupt the current safe implementation sequence.

## 1. What this review must accomplish

Establish that the intended live offering works as a complete product: a person enters through the correct consumer, partner or clinic path; receives a truthful result; retains ownership and saved work; completes only necessary information; reviews and corrects the matter; pays once or uses valid sponsorship; receives the correct professional filing/agency documents and non-filed instructions; and can download, return, obtain help and complete the next step without a broken or unsafe handoff.

The final QA is broader than representative browser acceptance during the build. Every intended route and materially different outcome/channel journey receives its own evidence mapping. Every unique generated filing, form, order, certificate, exhibit/attachment, guide and applicable variant receives document-level review. Every rendered page in the required final artifact set is visually inspected.

**No historic five-state exception. No unexamined jurisdiction. No disabled intended route counted as repaired. No correctly refused transaction substituted for a successful authorized one.** Automatic relief, handoff and correspondence may legitimately end without a packet, but their treatment must itself be correct, complete and tested.

No finite QA program can guarantee no future defect, every possible input, or a court's acceptance. The enforceable standard is complete declared coverage, current-source correctness, no unresolved required checks or known product-caused defects in the released scope, real runtime evidence, and an explicitly identified accepted release. “Flawless” is the quality objective, not a warranty we can manufacture from a green report.

## 2. Who does the work

### ChatGPT is the review lead, not a summary writer

I own the cross-source review: read the governing requirements and current official sources; inspect route and component mappings; inspect every required unique final document and its rendered pages; review UI screenshots, actual flows, messages, translations, runtime traces and structured results; reproduce bounded browser cases where tools permit; reconcile coverage; identify defects; and issue a source/evidence-backed QA recommendation.

I will not simply accept Captain/Codex statements such as “all green,” “the guard holds,” or “visually reviewed.” I need the actual artifacts and the relevant positive and negative observations. A runner produces evidence; that is not the same as independent review of what it proves.

### Execution assignments

| Code | Assignment | Responsibility and boundary |
|---|---|---|
| G | ChatGPT review lead | Direct source/code/content/PDF/image review; evidence interpretation; bounded browser inspection; independent expected-result checks; coverage and final recommendation. |
| B | Browser tool operated by ChatGPT | Bounded user-directed interaction through TinyFish where authorized, recording the actual UI. Not an unrestricted bulk crawler or substitute for low-level instrumentation. |
| R | Captain/Codex/CI runtime runner | Reuse the actual project harnesses for all-route automation, SQL/RLS/RPC tests, controlled races, provider sandboxes, worker renders, screenshots, traces and exports. ChatGPT authors/reviews cases and inspects outputs. |
| H-L | Qualified legal/output reviewer | Formal legal or professional approval where required; ambiguous current/local practice; changed substantive filings and unsupported legal judgments. Existing applicable unchanged approval is reused, not automatically re-signed. |
| H-A | Accessibility/bilingual human reviewer | Real assistive-technology behavior and human comprehension, especially consequential translated consent/legal text. ChatGPT reviews text and visual evidence first. |
| H-C | Clinic/physical-device operator | Actual phones/tablets, shared hardware, printers/scanners, staff/participant rehearsal, physical signature/notary operation. Synthetic participants; no unauthorized real filing. |
| H-S | Independent security specialist when needed | Bounded assurance of unresolved high-risk security areas that code/tests cannot settle; not a mandatory new certification project or a substitute for closing known issues. |
| H-O | Roger / authorized production operator | Actual production-risk authorization, coverage decisions, credential/admin access unavailable to the session, release promotion and operational ownership. |

A person may cover several roles only where qualified and authorized. A sponsor/operator is not automatically a legal approver. A notary does not decide legal eligibility. An AI review is not a notarial act, court filing, attorney representation or certification.

## 3. The completeness model: what “everything” means

### 3.1 Freeze the inventory, not a remembered count

At P00 join the accepted product scope and advertised promises to the current track registry, compiled routes, forms/specifications, component sets, local variants, API/UI routes, roles, partner profiles, clinic modes, locales, templates, messages and release settings. Use all intended coverage, including currently held but promised functionality. Do not inventory only today's small commercially proven subset.

Use a stable key per review unit, for example:

`jurisdiction | remedy/track | runtime route | local/court variant | component | channel | outcome | language | artifact/config version`

Attach source and artifact hashes where applicable. Do not key on row position or a truncated display label. Do not hardcode past denominators such as 344, 343, 267, 583 or 276 as future truth. Retain historical counts as history; derive the actual reviewed population.

Count separately: legal tracks; reachable routes; intended packet routes; legitimately non-packet treatments; component/form versions; unique rendered artifacts; rendered pages; UI states; role-action cases; journey instances; and required checks. A route count is not a document count and a generated packet is not a filed or cleared case.

### 3.2 Required coverage by layer

| Layer | Coverage required |
|---|---|
| Legal/routing | Every intended remedy/route, every material decision branch and timing/exclusion/exception, every applicable declared local and effective-date variant. |
| Customer journeys | Every intended route/outcome/channel combination with distinct behavior; both locales; complete packet journeys for offered packet paths and correct terminal experience for non-packet paths. |
| Documents | Every unique official form, custom filing, proposed order, ancillary document, attachment role, guide and meaningful output variant. All unique required artifact pages visually inspected. |
| Partners/clinic | Every implemented role and sensitive operation; every materially distinct configured partner/clinic policy; each route-channel integration plus all unique program-review/execution workflows. |
| Security and finance | Every sensitive endpoint/resource class, role boundary and material charge/credit/settlement/delivery transition, with exact-resource adversarial cases. |
| Browser/device | Each declared supported browser engine/device class and every unique UI state; representative repetitions of genuinely shared mechanics may be reused, not route-specific assertions. |
| Production | Exact accepted app/worker/data/schema/config tuple plus authorized domain-level smoke and operating readiness. Staging cannot masquerade as production. |

Each complete offered route/channel journey must preserve the same matter from entry through its authorized final result. Bulk journeys can use reused harness steps and authenticated setup; they may not seed final verified answers, payment authority or output rows in place of the participant transitions being tested. Provider and database state must be real sandbox state for claims about real integration.

### 3.3 Exhaustive scope without infinite repetitions

There are infinitely many names, dates, texts and event sequences. We cover all enumerated behavior and use equivalence classes, legal boundary values and adversarial cases for unbounded data. Enumerate those classes before execution. Do not claim every theoretical permutation has been tested.

For example: empty/unknown/zero/false; one/multiple charges; before/on/after a legal threshold; longest reasonable supported names/addresses; supported Unicode; active/expired/revoked permissions; pending/succeeded/failed/refunded payment; normal/slow/lost/duplicated request. All material legal and security combinations are explicit. Pairwise testing is appropriate only for independent presentation/device dimensions; it cannot replace known coupled legal/financial/permission branches.

Reuse is allowed only with a demonstrated equivalence: same actual bytes for a document; same source-backed decision for a rule; or same implementation/configuration for a shared control. Link the reused evidence to every covered entity and rerun its integration into the actual route. A shared form does not prove every route selected and filled it correctly. Two PDFs with different identifiers are not byte-identical; a normalized visual comparison can ignore declared variable regions only when all changed field values are independently verified.

### 3.4 Local coverage is explicit

Every supported local court/variant must be represented where its rules differ. An unresolved county dependency does not disappear behind a statewide pass. Equally, do not invent work for every county where an authoritative uniform statewide procedure governs. Record the source that establishes the applicable scope. Any unreviewed promised local coverage remains incomplete; Roger alone can change the promised scope.

## 4. The minimum evidence needed to start

Reuse the build's existing outputs, not a new reporting platform:

1. Exact candidate/application commit, immutable worker digest, renderer/template versions, source/data versions, migration state, environment and configuration identifiers.
2. Machine-readable inventory of intended routes/components/variants plus all UI/message/role/profile surfaces and current known-defect mapping.
3. Private current source corpus with per-file hashes and proper package locators; official URLs/date/effective-date records. Missing access and incomplete restore remain distinct from nonexistent forms.
4. Actual canonical, long-data, boundary and negative-case artifacts; all rendered page images at readable resolution; full and court-only pairs; both locales; actual download hashes.
5. Existing tests/results, actual run/job/artifact IDs, screenshots/traces, sanitized provider events and DB state needed to connect journeys.
6. Authorized test deployment, synthetic participant A/B and partner A/B identities, configured clinic profiles, sandbox provider credentials held only in approved secret stores, and explicit scopes for any write or fault/load test.
7. Applicable existing legal/output approvals and named humans for genuinely missing legal, assistive-tech or physical-device evidence.

Do not force all 51 jurisdictions into one giant upload or prompt. Produce a small index once, then fetch/materialize only the next identified batch. The reader must be able to inspect all pages and source passages, not just an executive summary. Private customer data is not required: use realistic synthetic cases. Do not include full identifiers, secrets or session tokens in exported evidence/logs/filenames.

The current source-recovery counts and push hold are historical preconditions to recheck at the audit start, not facts to repeat indefinitely. This plan creates no permission to bypass either.

## 5. Phased execution and manageable batches

The phase numbers organize coverage; they are not eleven separate audit projects. P09 security and P10 accessibility begin early and contribute to the same cases. While I inspect one bounded evidence batch, the existing runner can produce the next and qualified reviewers can settle already-isolated issues.

| Phase | Review objective | Default ChatGPT review batch | Required exit |
|---|---|---|---|
| P00 | Candidate, access, exhaustive inventory and independent expectations | One candidate/index; at most 50 inventory exceptions per expansion | Every intended entity and obligation accounted for; access gaps assigned; no invented passes. |
| P01 | Public surfaces, all messages, help and Wilma | 10 distinct page/states or 50 short messages | Correct EN/ES claims/actions/privacy; all unique surfaces inspected. |
| P02 | Every jurisdiction's sources, remedy/routing and local/effective-date branches | Up to 5 exact routes in one jurisdiction; split at 150 source pages or a disputed rule | Every rule and vehicle has independent source expectations; conflicts resolved or explicitly blocked. |
| P03 | Screening, auth, Briefcase, packet information, editing/resume | Up to 5 route journeys or 10 distinct states | Actual workload fixed; no duplicate/invalid asks or lost facts/work; route-specific experiences covered. |
| P04 | Every legal document and rendered page | At most 5 packet/variant sets AND 40 page images; split if either limit is exceeded | All relevant pages and contents reviewed; exact documents/fields/actors/privacy/format correct. |
| P05 | Supplemental guide and packet assembly | Up to 5 guide sets AND 40 pages; full/court-only and EN/ES linked | Correct design, actual contents/fees/procedure and no guide in court-only output. |
| P06 | DTC money, settlement, jobs, storage, delivery and faults | Up to 5 route/channel journeys or 10 fault/race cases | All offered DTC paths deliver correctly and unauthorized transitions have no forbidden side effects. |
| P07 | RCAP onboarding, staff access, sponsor terms, caps, billing/reporting | One policy/profile variant and two isolated tenants; up to 10 role/action cases | All distinct partner workflows and route integrations work with correct ownership and accounting. |
| P08 | Standard Clinic and configured Legal Aid Clinic Mode | One event/profile workflow; separate ten-sequential-participant reset batch | Real assistance, consent, sensitive intake, review, execution, follow-up and shared-device behavior pass. |
| P09 | Security/privacy/integrity and disaster recovery | Up to 10 cases for one trust boundary | All applicable high-risk boundaries have effective evidence; no unresolved exposure. |
| P10 | Accessibility, bilingual comprehension, supported devices, performance | 10 states, one device group or one accepted load scenario | Automated plus necessary human/device checks pass within agreed operating targets. |
| P11 | Fix retest, complete coverage, final release and production smoke | One final candidate with targeted delta reruns | Required instances complete, final matching release proven and operating ownership assigned. |

These limits are workload controls, not reduced coverage. Split any large state into consecutive batches. End a batch with exact reviewed IDs/page ranges and next IDs; the next turn continues there. Do not restart already-reviewed unchanged work.

### P01 detail: no neglected front door

Review landing, pricing, eligibility explanations, all public state/remedy pages, samples, sign-in/recovery, help, legal/privacy/accessibility pages, partner public pages, registrations, errors/empty/loading states, redirects, notifications, consent text and downloadable instructions. Inventory and inspect Wilma's public and authenticated modes, current grounding, limits, unsafe instructions, data isolation, prompt-injection resilience, costs/rate limits and failure fallback. Review all unique strings/templates, then their rendered context.

### P02 detail: law is an independent oracle

Open official source text at review time for every controlling route requirement; cached/imported text is evidence, not automatically current law. Reuse the same verified source edition across routes but read every relevant provision. Record exact citation/version/access date/effective date. Verify remedy, predicates, exceptions, timing anchor, vehicle, mandatory form, case mode, venue, required facts, who prepares/signs/submits/serves, attachments, order practice, privacy, fees, waiver and next steps. Detect false negatives as well as false positives.

Do not re-open source-backed settled decisions without a material discrepancy or currentness issue. Do not blindly accept the implementation's own authority projection as proof its legal content is correct. Formal or ambiguous legal judgments still need the required qualified review. A human only receives the narrow unresolved issue and evidence, not the entire country again.

### P03 detail: original mission preserved

Measure the participant's actual new manual inputs before automated fillers operate. Different section headings do not establish reduced effort. Check aliases, safe derivation, explicit unknowns, conditional branches, generation prerequisites versus filing tasks, editability and review invalidation. Review account claim/auth expiry, back/refresh, multiple tabs, server autosave failure and cross-device/legacy matters. Any substantive screening delta must be the exact authorized legal correction, not questionnaire friction moved upstream.

### P04 detail: each filing is inspected, not merely generated

For every unique final component, read all text, render all pages and inspect it against source/form/exemplar. Check correct caption, party roles, case numbers, allegations, relief, statute references, signatures/pro se/contact, jurat, actual service language and independently valid order. Check field geometry, protected blanks, full-name/name-part and date components, continuation pages, exact charge coverage, privacy, fonts, margins, line spacing, missing tokens, page breaks, clipping and contamination. Inspect both canonical and relevant long-data/boundary output. Valid PDF syntax is not a filing-grade verdict.

Contact sheets are navigation aids only. A page is not visually passed because its thumbnail exists. Inspect each required page at readable resolution, enlarging suspicious areas. For XFA/AcroForm/appearance-sensitive cases use two rendering engines and actual print/reader checks as needed. Official foreign-language informational companions must not replace required filing-language forms. Synthetic evidence labels belong outside the court-facing deliverable.

The new `usesCounty`/Pennsylvania correction is one seeded regression case: supplied court/venue values must be honored; sourced `null` cannot be replaced by a fabricated Pennsylvania custodian; an unnecessary clause may be explicitly omitted, but a required unknown custodian cannot survive as a releasable internal placeholder. Match presentation-less config containment to intended coverage; rejecting 45 configs is not completing 45 filings.

### P05 detail: design and legal instructions together

Inspect the approved Overview/Next Steps/Checklist/Fees system for every normalized route content variant, both languages, and actual full/court-only assembly. Separate the product payment from all other costs. Unknown fee is not zero; false “no fee” is a defect. The reference's four pages are not a page cap, and its six illustrated steps are not a universal legal sequence. Package logo/font assets; no production network/browser fetch merely to render the guide. A supplemental change must not alter separately corrected filing components.

### P06 detail: actually pay, actually deliver

Drive each intended route/channel/language journey on the final candidate using the real accepted entry and participant transitions. Record the same item/matter through verification, provider sandbox checkout/payment, signed settlement, immutable job, validated storage, actual owner download and repeat download. No replacement with an administratively seeded final-review matter for a claim about the complete journey.

Exercise cancellation/decline/required card authentication, early return before webhook, duplicate/reordered/replayed events, retries, zero/discount/refund paths where supported, worker death, stale verification, storage failure and concurrent finalization. Intercept or read actual effects, not only denial prefixes. A `ready` view is not byte delivery. Provider status, ledger counts and actual downloaded bytes must agree.

### P07 detail: RCAP is a product, not a payment flag

Review provisioning, first administrator invite, onboarding agreements/configuration/resources, approval/publish/activate distinctions, public program pages, code lifecycle, staff removal, scope, sponsor window, caps/grace/overage, billing and exports. Use the current approved policy per partner, not historic remembered numbers. Participant ownership remains distinct from partner program administration. Reconcile starts, possible paths, generated/delivered packets, filed cases and actual clearance as different metrics.

A benefit check can be authority-refused, no benefit established, admitted or paused at cap. Absence of a denial code does not prove sponsorship or consumption. Recheck atomic finalization and count exactly the approved consumption unit. Every unique program policy and intended sponsored route must be mapped, including closure and participant continuation.

### P08 detail: clinic safety includes the physical day

Cover participant-owned registration, self-service and consented assistance, event scope, fixed geography, actual timezone rendering, capacity/waitlist/window behavior, staff roster and revocation, temporary access, queue and follow-up. Run the existing ten-sequential-participant shared-device acceptance. Test browser-back, downloads, tabs, local/session storage, autocomplete and end-session/timeout, not just the logout button.

Where Legal Aid Clinic Mode is offered, audit the actual native approved profile: financial/household/status intake, explicit unknowns, encrypted restricted identifiers and audited reveal, policy computation, service acceptance, attorney review, applicant signatures/version binding and re-attestation, notary/execution desk, scoped documents, masked case-file export, safe contact, delivery status and end-of-event continuation. Keep program eligibility, legal remedy eligibility, partner service acceptance, packet verification and execution readiness separate.

MVLP is a named existing profile to include if offered. Do not fabricate a CLS contract or infer that a public third-party form is the approved native intake. A local Supabase stand-in is useful but cannot establish hosted Supabase, actual email delivery, live auth or provisioning. Rehearse actual devices/network/print-sign-scan operations with authorized synthetic participants and real staff roles.

### P09 detail: no false security certification

Map applicable OWASP ASVS 5.0 requirements to existing controls; pin the exact edition. This is an assurance reference, not permission to expand into an unrelated compliance certification. Cover auth, object/role/event access, RLS and column/RPC privileges, storage URLs, server secrets, mutation boundaries, encryption/reveal, telemetry, upload/parsing/injection, data rights, rate limits, stale caches, concurrent writes, migration/restore and source/document prompt injection. Use the actual non-admin role for positive controls; owner/superuser success does not prove application privileges.

Mutating security/load tests require bounded authorized nonproduction targets. I can review code and evidence and reproduce authorized bounded cases; I cannot honestly label that a full professional penetration test of inaccessible infrastructure. Assign truly unresolved high-risk infrastructure/control questions to a qualified security reviewer early, not after everything else is called green.

### P10 detail: beyond screenshots

Use WCAG 2.2 A/AA as the proposed technical target unless the accepted contract has a stricter applicable target. Run automated accessibility checks in actual interactive states and human keyboard/screen-reader tasks. W3C and Playwright explicitly explain that automated tools do not establish complete accessibility on their own.

Review all EN/ES UI/message/guide content, consequential translated meaning and locale switching/data values. Check supported desktop engines, real mobile PDF/download/file controls and physical clinic devices. Test performance against existing numeric targets for response, save, render, concurrency, load and recovery; if missing, set the targets with the product owner at P00, before measuring, not afterwards to fit results. Run bounded cold/slow/large/concurrent/endurance cases. Do not substitute emulation for real assistive technology, printing or notarial practice.

### P11 detail: final recommendation and actual live proof

Reconcile all required case instances to the exact final candidate, retrieve complete job/artifact lists, retest fixes and all affected consumers, and run the required release suite. Separate expected failures within negative tests from an actually failing test job. Skipped downstream jobs are not passed. A once-green ancestor is not the final candidate.

After genuine authorization, promote the accepted app/worker/schema/config combination and run a minimal safe production smoke. Live-money and filing actions are not granted by this plan. Prove support/alerts for stuck paid jobs, failure recovery, safe refunds/retries, data retention and a known-good rollback target. Final status remains LAUNCH BLOCKED while any required evidence, approval, production permission or promised capability is missing.

## 6. Tool and skill capability register

**Discovery performed in this conversation on September 19, 2026.** “Available” below means the action/schema is exposed, not that access to the correct account/project, a sandbox mutation, or a successful product audit has been proven. Recheck permissions at P00 without changing them by default.

| Tool or skill | How ChatGPT uses it | Boundary / dependency |
|---|---|---|
| Files | Retrieve the supplied mission/build/audit/templates and saved project requirements; read source passages and page images; materialize exact evidence files. | Missing/garbled text needs page review; unavailable or partial retrieval is not an empty source. |
| PDF skill + container/Python + built-in vision | Render and inspect every required PDF page, widgets/text/metadata, compare outputs, hash bytes and inspect two-engine differences. | Human physical print and formal legal review are distinct. Existing court source PDFs are not silently modified during QA. OCR only where there is no usable text/visual alternative. |
| Spreadsheet skill (`artifact_tool`) | Maintain this checklist, instances, jurisdiction/page coverage, defects and formulas without a second reporting system. | Initial workbook is a plan, not executed results. A control-library checkbox does not prove all of its route instances. |
| GitHub | Read exact source/commits/diffs; read run/job logs; retrieve artifacts; rerun authorized existing jobs where permission allows. | Several wrappers return only a first page; commit-run wrapper filters PR runs. Use permitted paginated run APIs when necessary. New dispatch is not confirmed by those wrappers; use existing Captain/CI workflow or another authorized path. GitHub access is not a shell in the Captain's worktree. |
| Vercel | Read project/deployment identity, build/runtime logs and errors; inspect protected deployment pages with authorized access. | Do not publish share tokens or invoke deployment/promotion merely to inspect. It does not prove worker/database state by itself. |
| Stripe | Discover/select the correct sandbox account; read checkout/payment/invoice/event resources and approved test actions through operation schemas. | Never select live mode by inference. Use provider sandbox only for QA; permissions and write approvals remain. Real card entry/3DS/MFA may require authorized browser/human interaction. |
| TinyFish | Bounded interactive browser checks with screenshots/recording/HTML and optional authenticated profile where granted. | Metered wallet, access and target rules apply. Not for broad bulk crawling. Use one run at a time and wait for its completion; do not duplicate a timed-out active run. Low-level race/DB instrumentation belongs in runtime harnesses. |
| Gmail | Read controlled test inbox messages and links to verify real transactional delivery and recipient privacy. | Only the connected authorized mailbox; no guarantee across every email provider, SMS phone or inaccessible inbox. The product/CI sends test messages; this plan does not authorize real-user outreach. |
| Supabase plugin | Directory search found a plugin supporting SQL, projects, logs, auth and migrations; it would enable more direct DB evidence retrieval. | NOT INSTALLED/CONNECTED in discovery. Suggested to the user, not activated. Start with scoped read-only nonproduction access; inspect actual schemas after connection. Otherwise the runner exports real hosted DB/RLS/RPC evidence. This is not a launch blocker if equivalent authorized evidence is obtainable. |
| Captain/Codex/CI + Playwright and existing project tests | Bulk parameterized route journeys, supported browser projects, API/RLS tests, worker rendering, trace generation, fault/race/load execution and artifact export. | Execution must actually occur on pinned code/environment. A passing local mock is not hosted integration. Runner returns evidence; ChatGPT reviews it. Reuse installed tools, not a new QA platform. |
| Native web / official-source browsing | Current statutes, rules, official forms, instructions, fees and standard documentation with exact source/effective-date records. | Public reading only. CAPTCHA, MFA, private court portal access, clerk contact and actual filing may need an authorized human. Do not bypass access controls. |
| BrowserStack / equivalent real-device service | Directory search for BrowserStack returned no matching plugin. A licensed existing account could be used through the project's runtime integration where available. | No direct BrowserStack plugin access is claimed. Real devices/human operator are the fallback; no new service purchase is assumed. |
| Optional analytics/compliance apps | Search surfaced PostHog and Vanta as not installed. | Not required for this plan. Use existing runtime/error/analytics evidence; do not create a purchase, compliance or migration project. |

Only Supabase was suggested because it materially adds direct evidence access. No plugin permissions were broadened. No private database, payment, production or browser QA was executed while drafting this plan.

## 7. Human-only or conditional handoffs, scheduled before the last phase

| Task | What I do first | What someone else must supply |
|---|---|---|
| Required legal/professional approval | Review every route/document against current sources, isolate discrepancies, attach exact text/pages and proposed resolution. | Qualified authorized reviewer approves where required; resolves unsupported local practice/ambiguous law. I cannot sign as counsel. |
| Real screen-reader and device accessibility | Automated/DOM/visual review and a precise task list; inspect session evidence afterwards. | Skilled human uses actual assistive technology/devices. A screenshot does not establish what is spoken. |
| Physical clinic operation | Audit digital roles/flows/runbook, construct ten-person reset cases and inspect evidence. | Staff rehearse actual device/network/printer/scanner/consent/execution workflow. Actual signing/notarization requires the proper people, not AI. |
| Important Spanish comprehension | Review every unique translation for meaning and consistency. | Fluent reviewer checks consequential or ambiguous consent/legal/clinical wording and actual usability. Reuse unchanged approved translations. |
| Provider or infrastructure access | Use available account tools and record exact failed operation, not a vague “needs credentials.” | Authorized owner resolves inaccessible MFA/CAPTCHA/secrets/roles; scoped runtime operator runs unavailable probes. |
| Security assurance beyond observable evidence | Review code, hosted privilege evidence, tests and bounded attacks. | Qualified specialist resolves high-risk issues requiring infrastructure/network assessment not exposed here. No certification claim without the actual process. |
| Court filing/acceptance and live operations | Review filing directions, sources, document adequacy and production readiness evidence. | Only authorized humans file, contact courts, move live money or activate production. Court acceptance/outcomes and universal email/infrastructure uptime cannot be guaranteed. |

These are narrow assignments, not permission to defer every hard question. Search/retrieve available evidence and tools first. An external blocker stays explicit; independent review batches continue.

## 8. The checklist workbook and how to use it

`ExpungementAI_Final_QA_Checklist.xlsx` contains **248 control types** organized by phase, a 51-jurisdiction register, execution-case template, artifact/page template, defect template, tool register and source register. It starts NOT RUN. No case results or actual route counts have been invented.

A control type such as “caption correct” must be instantiated for every applicable component/variant. The 248 types are not 248 total nationwide tests. The actual final denominator is the expanded case/coverage inventory.

An execution case needs only: case ID; control ID; exact entity/route/jurisdiction/variant/channel/language; candidate/config version; status; observed result; evidence locator; reviewer; linked defect or source-backed N/A reason. Reuse existing CI evidence locators rather than duplicate their contents. Every document/page review additionally records artifact hash, page count, pages actually inspected and coverage links.

Allowed result states: NOT RUN, IN PROGRESS, PASS, FAIL, BLOCKED, NOT APPLICABLE, STALE. Only PASS counts as passed. NOT APPLICABLE needs a specific source or implementation-scope reason; absence of a feature that was promised is not N/A. STALE means a dependency changed and relevant evidence must be renewed. A blocked intended route may pass its containment test but its successful-delivery obligation remains blocked.

Do not check PASS solely because the runner's aggregate exit is zero. Observe the expected business or legal effect, the negative control where needed, complete artifact retrieval and the final version. Conversely, do not count an expected refusal inside a successful negative test as a failing product journey.

## 9. Defects, fix batches, retests and avoiding a weeks-long loop

Use the existing build issue/worklist and the workbook's links; do not create a new ledger for every finding. One root defect can cover many failed instances, but each affected instance remains visible until retested.

Classify S0: immediate privacy/money/wrong-person harm; S1: wrong legal vehicle/content, unfileable packet, blocked offered journey or critical accessibility; S2: material usability/data/localization/reporting/recovery defect; S3: lower-severity defect against a specified requirement. All required acceptance failures must close for the Grade A verdict. A proposed enhancement outside the agreed product is BACKLOG, not a defect and not a fake pass. Severity does not authorize silently waiving an agreed requirement.

For each defect give exact reproduction, expected versus actual, affected identities, evidence, shared root if demonstrated and the required result. Captain/Codex implements the smallest coherent correction; I review the diff/output and targeted reruns. Retest all consumers of a changed shared renderer/authority, not only the first reported state. No full new inventory or legal review when the existing unchanged evidence still applies.

Freeze candidate versions within a batch. Changed source/requirements/templates/config/data invalidate their dependent evidence only, with a final integration pass after the last change. Do not preserve `rebuildRequired:false` by repeatedly reverting a necessary correction, and do not transplant old approval to new bytes. Keep the accepted live release intact while proving the successor.

Bounded workflow: **produce evidence → review one batch → record exact results → fix grouped root defects → retest affected scope → next batch.** No repeated “are you sure” passes without a changed input, missing coverage or material conflict. No broad mutation sweep while writing into its worktree.

### Scheduling without a false deadline

Reserve legal/device/clinic reviewers and access at P00. Use the first two real review batches to measure page/route/test throughput; compute the remaining effort from the actual inventory and blockers. I will not promise a date or say “one last commit” before that evidence exists.

Practical parallelism: the runtime runner prepares the next batch; ChatGPT reviews the current batch; qualified humans resolve the short actual exceptions already identified. Avoid redundant reviewing agents and shared-file writers. Batch size controls context load; it is not a reason to omit anything or wait until the entire nation is ready before reviewing the first completed family.

No autonomous background monitoring is created here. Each review batch requires an active tool session or an explicitly scheduled supported automation. A later maintenance check is separate from finishing this audit.

## 10. Final release decision

The final report must identify:

- Exact app/worker/data/schema/template/config release and environment observed.
- Intended versus delivered coverage for every jurisdiction, route, component, local variant, channel, language, role and unique surface; any scope change and its actual authorization.
- Required case counts, pass/fail/blocked/stale/N/A counts and all page/artifact coverage; no skipped or unexplained item counted green.
- Which evidence I directly inspected, which execution came from the runner, which checks were live/hosted versus isolated, and which required decisions came from qualified humans.
- Closure of known build defects, final regression/build/release results, real paid and sponsored journeys, actual downloaded packets, production smoke and support/rollback readiness.

**Recommendation:** READY FOR AUTHORIZED RELEASE only when all applicable required checks and reviews pass for the intended scope. **LIVE VERIFIED** additionally requires actual authorized deployment and production smoke. Otherwise: **LAUNCH BLOCKED**, with the exact remaining requirements; implementation complete or audit-accounting complete does not mean launch complete.

No blanket “everything works flawlessly” or guarantee of court outcomes. The conclusion is exact, versioned and supported. Once the agreed coverage is complete and the accepted release is live, close this audit. Future law/form/provider/software changes receive scoped maintenance regression through existing operations, not another permanent open-ended project.

## 11. Sources and provenance

### Product sources (requirements and historical facts, not fresh execution)

- **SRC-01:** `ExpungementAI_Grade_A_Launch_Build_Plan_v2.md`, supplied/generated September 19, 2026. Integrated scope, exact evidence distinctions, all-jurisdiction requirements and release conditions.
- **SRC-02:** `Pasted markdown (2)(20260919-172249).md`. Nationwide court-document remediation and supplemental requirements, including all-pathway acceptance, component ownership/vehicle/privacy and visual standards. Old restart directives remain subordinate to v2.
- **SRC-03:** `Pasted text(20260919-165641).txt`. Original Grade A packet-information mission, cumulative accepted behavior, EN/ES, partner and complete journey requirements.
- **SRC-04:** `ExpungementAI_Supplemental_Packet_Template(1).pdf` and `LEGALEASE.png`. Approved visual authority; all four guide sections and guide/court distinction.
- **SRC-05:** `ExpungementAI_Custom_Pleading_Release_Audit.xlsx`, September 18 audit. Historical exact defects and state/component work, to reconcile against the final candidate.
- **SRC-06:** `RCAP_Clinic_Mode_Audit_and_Codex_Prompt.md`, saved Library document. Event attribution, participant consent/ownership, shared-device reset, ten-person simulation, follow-up/reporting and physical rehearsal. Historical execution/model instructions are not reused.
- **SRC-07:** `MVLP_Onboarding_Runbook.pdf` and `Pasted markdown(20260916-134617).md`, saved Library documents. Configured Legal Aid workflow, separate roles/decisions, restricted intake, execution/export and local-vs-hosted proof limitations. Confirm actual final profile at P00.
- **SRC-08:** `Pasted markdown(20260919-181736).md` and the later user-pasted shared-renderer update. Prior known defects, source custody and reverted 132C. No claim those statuses remain current at audit start.

### External technical references checked September 19, 2026

- **EXT-W3C:** https://www.w3.org/WAI/test-evaluate/ — automated tools cannot establish complete accessibility; knowledgeable human evaluation is required.
- **EXT-WCAG:** https://www.w3.org/WAI/standards-guidelines/wcag/ — WCAG 2.2 framework. A/AA is the proposed technical target here, not a new legal-compliance certification.
- **EXT-PW:** https://playwright.dev/docs/test-projects ; https://playwright.dev/docs/trace-viewer ; https://playwright.dev/docs/accessibility-testing — browser projects, trace evidence and automated/manual accessibility limits.
- **EXT-STRIPE:** https://docs.stripe.com/testing ; https://docs.stripe.com/webhooks — test environments and webhook integration behavior.
- **EXT-ASVS:** https://github.com/OWASP/ASVS — ASVS 5.0.0 stable security requirements and versioned references; use as applicable assurance guidance, not a certification claim.

Tool capability statements come from the actual exposed action schemas and plugin-directory results in this session. Supabase was found but not connected; BrowserStack exact-name search returned no match. Package creation, tool discovery and source review do not constitute executed platform QA.
