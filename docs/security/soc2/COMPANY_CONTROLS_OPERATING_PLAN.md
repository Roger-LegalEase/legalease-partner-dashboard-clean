# Company Controls Operating Plan

How LegalEase implements, operates and evidences the controls required for a
future SOC 2 Type II examination.

**Status.** LegalEase is implementing and validating the technical and
operational controls required for a future SOC 2 Type II examination. Audit
completion and any applicable observation period remain subject to actual control
operation and auditor review.

Nothing in this repository may state or imply that LegalEase is SOC 2 compliant,
is Type II certified, that an observation period has begun, that a control is
operating, that MFA is enforced company-wide, that backups are restorable, that
vendors have been reviewed, that employees completed training, that an access
review was completed, that deletion is implemented, or that branch protection is
enabled — unless current evidence supports that exact statement.

## Scope

In scope: Expungement.ai direct-to-consumer, the RCAP partner and Clinic
programs, the shared legal engine, packet generation and delivery, the partner
portal, and the internal administrative surfaces — together with the vendors that
host and support them.

Out of scope for this plan, and not weakened by it: the legal accuracy of
record-clearing routes, official-form fidelity, visual review, and packet
verification. Those have independent gates in `docs/PRODUCT_CONTRACT.md` and the
RCAP All-50 sprint plans. **Completing a SOC 2 control never substitutes for
legal, form, visual or packet QA approval.**

## Governing principles

1. A document saying a control should exist does not make it implemented.
2. Code existing does not make a control operating.
3. A verifier proves only what it actually tests.
4. One successful test is not recurring operating effectiveness.
5. Missing evidence is a gap, not permission to infer success.
6. Historical evidence is labelled historical.
7. "Complete" is never a synonym for "planned".
8. Sensitive evidence lives in Secureframe or another approved private system, never in Git.
9. Company-controls work must not weaken tenant isolation, participant ownership, packet authority, payment authority, sponsorship accounting or official-form controls.

## Authority

Roger Roman is Primary Program Owner and Executive Control Owner. Lawrence
Blackmon is Secondary Program Owner and Legal Compliance Authority. Faith Walls
is Chief of Staff and Compliance Operations Administrator and the Secureframe
operational administrator. Full detail, boundaries, escalation and delegation:
`AUTHORITY_AND_RACI.md`.

Exactly one accountable owner per control. No one person provides implementation,
independent approval and evidence-completeness attestation for the same
high-risk control.

## Control lifecycle

```text
identified → owner assigned → designed → implemented → configured
→ evidenced once → operating on cadence → observation-period ready
```

A control advances only on evidence. `current_status` and `evidence_maturity` in
`CONTROL_REGISTER.csv` are independent axes: a control can be
`VERIFIED_EXISTING` at `REPOSITORY_IMPLEMENTED` and still be nowhere near
`OPERATING_EVIDENCE_PRESENT`.

## Proof standards

| Maturity | Means | Ceiling rule |
|---|---|---|
| `NONE` | Nothing exists | — |
| `DESIGN_DOCUMENTED` | Written down and approved | **A policy alone cannot exceed this** |
| `REPOSITORY_IMPLEMENTED` | Code, migration, verifier or configuration-as-code exists | **Code alone cannot exceed this** |
| `HOSTED_OR_EXTERNAL_CONFIG_VERIFIED` | Current external evidence of the live setting | A configuration claim without current external evidence stays `EXTERNAL_ACTION_REQUIRED` |
| `OPERATING_EVIDENCE_PRESENT` | Actual dated evidence of execution | One test is not a cadence |
| `OBSERVATION_PERIOD_READY` | Owner, approver, evidence administrator, cadence and evidence source all established | — |

## Phases

`CC0` census and register · `CC1` governance and policy · `CC2` **P0** access,
identity and production change · `CC3` risk, assets, vendors, HR, training ·
`CC4` logging, monitoring, vulnerability, configuration · `CC5` incident response
and resilience · `CC6` privacy, retention, deletion, participant lifecycle ·
`CC7` Secureframe and evidence operations · `CC8` pre-observation readiness.

Scope and exit gates for each: `docs/LegalEase-Master-Build-Plan-v4.md` §11.3.

## Priorities

The initial P0 backlog is ordered in the master plan §11.4. Branch protection,
MFA, access review, restore testing and incident response are not sequenced
behind documentation work.

## Dependencies

CC2 depends on the privileged-system inventory from CC0. CC3 vendor work depends
on the asset inventory. CC4 alerting depends on the log-source inventory. CC5
restore testing depends on confirmed backup configuration. CC6 deletion depends
on the frozen object model in `docs/PRODUCT_CONTRACT.md` §1 — a deletion job
enumerates every store of participant data by name, so it cannot be written
against a schema still in motion. CC7 depends on every prior phase producing an
owner and a cadence. CC8 depends on all of them.

## Release gates

`CCG-A` through `CCG-F`, defined in `READINESS_GATES.md` with objective entry and
exit criteria. `CCG-F` is an external auditor outcome; no internal status
substitutes for it.

## External actions

Most P0 work cannot be completed by editing this repository. Every such action is
recorded in `EXTERNAL_ACTION_REGISTER.md` with owner, approver, expected
evidence, dependency and status. Actions are not marked complete until the stated
evidence exists. Nothing in that register may be presented as performed.

## Observation-period readiness

Governed by `CCG-E`. Faith attests that required evidence is present and
organised; Lawrence provides legal, privacy and compliance approval; Roger makes
the final go/no-go decision. None of these may be inferred or fabricated, and no
customer statement may imply the period has begun before Roger's decision.

## Relationship to Secureframe

Secureframe is the preferred compliance and recurring-evidence system of record.
Faith is its operational administrator; Roger retains executive ownership;
Lawrence approves legal and privacy mappings and claims.

**This repository holds** non-sensitive control definitions, architecture
references, runbooks, templates, code and test evidence references, control IDs,
internal-safe summaries, and the external-action register.

**Secureframe or another approved private location holds** employee evidence,
access-review exports, screenshots and console exports, contracts and DPAs, SOC
reports, vendor questionnaires, background-check evidence, training records,
confidential risk discussion, audit requests, and sensitive compliance evidence.

Sensitive evidence is never duplicated into Git. Where an external system should
be authoritative, this repository carries a schema or template and a pointer.

Control-to-Secureframe mapping uses `TO_MAP_IN_SECUREFRAME` until verified. No
Secureframe or AICPA control identifier is invented.

## Relationship to the product build plans

`docs/PRODUCT_CONTRACT.md` is the authority for product behaviour and outranks
this plan on what the product must do. `docs/LegalEase-Master-Build-Plan-v4.md`
is the enterprise plan of record. The RCAP All-50 sprint plans remain the active
state-build plan; the all-state build continues in non-production, and applicable
company-control gates must pass before `approved_for_live`, `live`, new
production routing, or any compliance claim.

Two contract audits completed 2026-08-27 produced 251 adversarially-verified
gaps against the product contract. Those are product defects, tracked in
`docs/sprint-control/audit/`. Where one is also a control failure — notably the
partner-tenancy exposure of participant records, and the absence of a claim
credential — it carries a control ID in `CONTROL_REGISTER.csv` and is not
double-tracked.
