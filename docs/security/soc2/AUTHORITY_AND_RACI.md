# Authority and RACI

Controlling authority for the Company Controls and SOC 2 readiness program. These
assignments are fixed. Do not substitute generic job titles or introduce
executives the repository does not establish. Where no other person is
established, use `[Technical Control Owner]`.

## The three named authorities

### Roger Roman — Primary Program Owner and Executive Control Owner

Accountable for the overall program: scope, priorities, budget and resources,
security-risk acceptance, final business decisions, production release gates,
audit-firm coordination, Secureframe program oversight, final readiness
determination, beginning or delaying a Type II observation period, executive
incident command, approval of critical vendors, approval of technical-security
exceptions, and final company-level go/no-go.

Roger may delegate execution and remains accountable for the program.

**Boundary.** Roger may not mark a legal, privacy, regulatory or contractual
compliance issue resolved over an unresolved legal block from Lawrence.

### Lawrence Blackmon — Secondary Program Owner and Legal Compliance Authority

Program decision-maker when Roger is unavailable, subject to the same legal and
security boundaries.

Final authority for: legal compliance; privacy-law interpretation; data-retention
legal requirements; legal holds; deletion exceptions based on legal obligations;
record-clearing legal accuracy; court and form legal requirements; legal
disclaimers and public legal statements; partner contract compliance;
data-processing legal requirements; incident-notification legal determinations;
regulator, court or law-enforcement response decisions; approval of policies
containing legal obligations; approval of external statements about SOC 2,
privacy, security or compliance; and whether a legal or compliance issue blocks
launch.

Lawrence may block a release, control closure, policy approval, privacy
disposition or compliance claim on legal grounds.

**Boundary.** Lawrence is not the routine evidence collector and is not assigned
ordinary administrative data entry merely because he holds legal authority. He
does not change production systems because he controls legal notification.

### Faith Walls — Chief of Staff and Compliance Operations Administrator

Operating authority for the administrative compliance program: Secureframe
operational administration; the company control calendar; assigning and tracking
administrative control tasks; requesting, collecting and organising evidence;
maintaining the approved audit data room; policy versions and approval records;
policy acknowledgments; security-awareness training coordination and completion
tracking; onboarding and offboarding checklists; access-review campaign
coordination; personnel, vendor, asset and control registers; vendor due-diligence
coordination; contract, DPA, SOC report, renewal and reassessment tracking;
scheduling management reviews, incident-response exercises and backup/restoration
exercises; minutes and decisions; the exception register; the evidence calendar;
escalating missed deadlines to Roger and legal or privacy issues to Lawrence;
confirming administrative evidence packages are complete; and coordinating
auditor requests.

Faith may require a control owner to provide evidence or complete an assigned
administrative task, and may mark an administrative task complete when its stated
evidence and acceptance criteria are present.

**Boundaries.** Faith may not accept residual security risk for the company;
approve her own high-risk evidence without an independent approver; approve
production-security configuration; make legal interpretations reserved for
Lawrence; overrule Lawrence on legal compliance or Roger on program or business
risk; receive broad production access solely because she administers compliance;
delete or change production data; or represent that the company is SOC 2
compliant before the audit is complete.

## Segregation of duties

Exactly one accountable owner per control. Responsible operator, reviewer, legal
approver and evidence administrator may be different people. Where one domain has
separate legal and technical responsibilities, split it into separate controls
rather than assigning two accountable owners to one control.

**No one person may unilaterally provide all three of** implementation,
independent approval, and final evidence-completeness attestation **for a
high-risk control.**

## Domain defaults

| Domain | Accountable | Responsible | Approver | Evidence admin |
|---|---|---|---|---|
| Governance and policy | Roger | Faith | Lawrence for policies carrying legal obligations | Faith |
| Risk management | Roger | Faith | Roger; Lawrence for legal risk | Faith |
| Asset and system management | Roger | `[Technical Control Owner]` | Roger | Faith |
| Data inventory and classification | Roger | `[Technical Control Owner]` | Lawrence | Faith |
| Identity and access | Roger | `[Technical Control Owner]` | Roger | Faith |
| Personnel security | Faith | Faith | Roger for exceptions; Lawrence for legal requirements | Faith |
| Vendor and third-party risk | Faith operates | Faith | Roger for critical-vendor business and security risk; Lawrence for contracts, privacy terms, DPAs | Faith |
| Encryption, keys, secrets | Roger | `[Technical Control Owner]` | Roger | Faith |
| Configuration and environment | Roger | `[Technical Control Owner]` | Roger | Faith |
| Secure development and change management | Roger | `[Technical Control Owner]` | Roger | Faith |
| Logging and monitoring | Roger | `[Technical Control Owner]` | Roger; Lawrence for privacy-safe logging rules | Faith |
| Vulnerability and patch management | Roger | `[Technical Control Owner]` | Roger | Faith |
| Incident response | Roger | `[Technical Control Owner]` | Lawrence for notification determinations | Faith |
| Business continuity and DR | Roger | `[Technical Control Owner]` | Roger | Faith |
| Network and service boundaries | Roger | `[Technical Control Owner]` | Roger | Faith |
| Endpoint and device | Faith | Faith | Roger | Faith |
| Privacy — legal framework, retention interpretation, legal holds, deletion exceptions | **Lawrence** | Lawrence | Lawrence | Faith |
| Privacy — technical deletion and export implementation | **Roger** until delegated | `[Technical Control Owner]` | Roger | Faith |
| Privacy — request administration and evidence | **Faith** | Faith | Lawrence for dispositions with legal effect | Faith |
| Processing integrity | Roger | `[Technical Control Owner]` | Roger; Lawrence for legal accuracy | Faith |
| Availability and resilience | Roger | `[Technical Control Owner]` | Roger | Faith |
| Training and awareness | Faith | Faith | Roger | Faith |
| Audit evidence and Secureframe operations | Faith | Faith | Roger for final program approval; Lawrence for legal and privacy evidence | Faith |
| Overall program and readiness | Roger | Faith | Lawrence for legal compliance | Faith |

## Incident authority

| Role | Held by | Decides |
|---|---|---|
| Incident Commander, executive decisions | Roger | Severity, escalation, resourcing, external engagement, business impact |
| Legal and regulatory notification authority | Lawrence | Whether notification is required, to whom, when, and in what terms |
| Incident coordinator, scribe, action tracker, evidence custodian | Faith | Administrative coordination and communications logistics |
| Containment and remediation | `[Technical Control Owner]` | Technical execution |

Faith does not make technical containment decisions unless separately assigned
and qualified. Lawrence does not change production systems.

## Privacy-request authority

Intake, identity-verification administration, tracking and completion evidence:
Faith. Legal-hold decisions, deletion exceptions and retention interpretation:
Lawrence. Technical execution of export and deletion: Roger until delegated to a
`[Technical Control Owner]`. Program oversight: Roger.

## Audit-request authority

Auditor requests are received and coordinated by Faith, who assembles the
evidence package. Lawrence approves anything with legal effect or any external
statement about scope, period, criteria or opinion. Roger approves the response
and holds audit-firm coordination.

## Absence and delegation

Roger unavailable: Lawrence decides, within the same legal and security
boundaries, and records the decision for Roger's review. Lawrence unavailable: a
legal decision waits — no other role may substitute for legal authority, and a
release requiring legal approval does not proceed. Faith unavailable: Roger
designates an interim evidence administrator; the segregation rule still applies,
so the interim administrator may not be the implementer of a high-risk control
they attest to.

## Escalation

Missed control deadline → Faith → Roger. Legal or privacy issue → Faith →
Lawrence. Security risk requiring acceptance → `[Technical Control Owner]` →
Roger. Legal block on a release → Lawrence, and the release stops until resolved.
Disagreement between program and legal authority → Lawrence prevails on legal
compliance; Roger prevails on business and program risk; neither overrides the
other's domain.
