# External action register

Actions that cannot be completed by editing this repository. Each requires a
person, an external console, Secureframe, or an auditor.

**Nothing here has been performed.** `completion_date` stays blank until the
stated evidence actually exists. No action in this register may be described as
done, and no status here may be read as evidence.

Abbreviations: **R** Roger Roman · **L** Lawrence Blackmon · **F** Faith Walls ·
**T** `[Technical Control Owner]` · **SF** Secureframe.

## P0 — production protection

| ID | System | Action | Why it matters | Accountable | Operator | Approver | Expected evidence | Dependency | Status | Controls | SF destination | Completed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EA-01 | GitHub | Enable branch protection or a repository ruleset on `main` | 333 verifiers are not change control if merge can bypass them | R | T | R | Ruleset export showing protection, required reviews, no force-push, no deletion, conversation resolution, restricted admin bypass | — | NOT_STARTED | SDLC-03 | TO_MAP_IN_SECUREFRAME | |
| EA-02 | GitHub | Require pull-request review | Unreviewed production code | R | T | R | Ruleset export naming required reviewers | EA-01 | NOT_STARTED | SDLC-03 | TO_MAP_IN_SECUREFRAME | |
| EA-03 | GitHub | Require named status checks | Checks run but are not required | R | T | R | Ruleset export naming required checks | EA-01 | NOT_STARTED | SDLC-04 | TO_MAP_IN_SECUREFRAME | |
| EA-04 | All privileged systems | Enforce MFA | Credential compromise is the common root cause | R | T | R | Per-system export showing enforcement and exceptions | EA-10 | NOT_STARTED | IAM-02 | TO_MAP_IN_SECUREFRAME | |
| EA-05 | GitHub | Enable Dependabot, secret scanning with push protection, and code scanning | None are configured today | R | T | R | Settings export plus first scan results | EA-01 | NOT_STARTED | VUL-01, VUL-02, VUL-03 | TO_MAP_IN_SECUREFRAME | |

## P0 — access inventory and review

| ID | System | Action | Why it matters | Accountable | Operator | Approver | Expected evidence | Dependency | Status | Controls | SF destination | Completed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EA-10 | All | Produce the privileged-system inventory | Cannot review access to systems not listed | R | T | R | Inventory naming each system, its owner and its admin count | — | NOT_STARTED | AST-01 | TO_MAP_IN_SECUREFRAME | |
| EA-11 | GitHub | Access review | Stale privilege | R | T | R | Dated member and permission export with decisions | EA-10 | NOT_STARTED | IAM-04 | TO_MAP_IN_SECUREFRAME | |
| EA-12 | Supabase | Access review | Direct database access | R | T | R | Dated member export with decisions | EA-10 | NOT_STARTED | IAM-04 | TO_MAP_IN_SECUREFRAME | |
| EA-13 | Vercel | Access review | Deployment authority | R | T | R | Dated member export with decisions | EA-10 | NOT_STARTED | IAM-04 | TO_MAP_IN_SECUREFRAME | |
| EA-14 | Stripe | Access review | Payment authority | R | T | R | Dated user and role export with decisions | EA-10 | NOT_STARTED | IAM-04 | TO_MAP_IN_SECUREFRAME | |
| EA-15 | Google Workspace | Access review | Identity and mail | R | F | R | Dated user and admin-role export | EA-10 | NOT_STARTED | IAM-04 | TO_MAP_IN_SECUREFRAME | |
| EA-16 | Secureframe | Access review | Compliance evidence access | F | F | R | Dated user and role export | EA-10 | NOT_STARTED | EVD-07 | TO_MAP_IN_SECUREFRAME | |
| EA-17 | DNS, registrar, Cloudflare if used | Access review | Domain takeover risk | R | T | R | Dated access export per provider | EA-10 | NOT_STARTED | IAM-04, NET-01 | TO_MAP_IN_SECUREFRAME | |
| EA-18 | All | Remediate internal-admin over-privilege found in the 2026-08 audit | An over-privileged identity configuration was documented and remediation is not evidenced as applied | R | T | R | Before and after production evidence plus re-verification | EA-10 | NOT_STARTED | IAM-11 | TO_MAP_IN_SECUREFRAME | |

## P0 — resilience

| ID | System | Action | Why it matters | Accountable | Operator | Approver | Expected evidence | Dependency | Status | Controls | SF destination | Completed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EA-20 | Supabase | Confirm backup and PITR configuration and retention | Recoverability is unevidenced | R | T | R | Console export showing configuration and retention | — | NOT_STARTED | BCDR-05 | TO_MAP_IN_SECUREFRAME | |
| EA-21 | Supabase, private storage | Production-representative restoration exercise | A repository backup does not prove participant data can be restored | R | T | R | Exercise record with actual RTO, RPO and findings | EA-20 | NOT_STARTED | BCDR-10 | TO_MAP_IN_SECUREFRAME | |
| EA-22 | Monitoring | Configure critical alerts and name responders | Alerts without owners are not detection | R | T | R | Alert configuration and responder map | EA-10 | NOT_STARTED | LOG-01, LOG-09 | TO_MAP_IN_SECUREFRAME | |
| EA-23 | All | Incident-response tabletop | Untested plans fail under pressure | R | T | L for notification path | Exercise record, participants, findings, closed actions | IR-01 | NOT_STARTED | IR-10 | TO_MAP_IN_SECUREFRAME | |

Fixed first tabletop scenario: *a partner or Clinic staff account is compromised,
participant documents may have been accessed, and a packet or signed download
reference appears in an application log.*

## Program, vendor, personnel

| ID | System | Action | Why it matters | Accountable | Operator | Approver | Expected evidence | Dependency | Status | Controls | SF destination | Completed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EA-30 | Secureframe | Map every control; configure recurring evidence tasks | Recurring evidence is the substance of Type II | F | F | R | Mapping export and task configuration | CC0 | NOT_STARTED | EVD-01, EVD-03 | TO_MAP_IN_SECUREFRAME | |
| EA-31 | Corporate | Critical-vendor due diligence: SOC reports, security materials, DPAs | Third-party exposure | F | F | R business risk; L contracts and DPAs | Review records per vendor with dates | VEN-01 | NOT_STARTED | VEN-04, VEN-07 | TO_MAP_IN_SECUREFRAME | |
| EA-32 | Corporate | Security-awareness training and role-based training | Human risk | F | F | R | Completion records per person | TRN-01 | NOT_STARTED | TRN-01, TRN-04 | TO_MAP_IN_SECUREFRAME | |
| EA-33 | Corporate | Policy acknowledgments | Awareness of obligations | F | F | R | Acknowledgment per person per version | GOV-02 | NOT_STARTED | TRN-07 | TO_MAP_IN_SECUREFRAME | |
| EA-34 | Corporate | Endpoint inventory and minimum protections | Unmanaged devices hold participant data | F | F | R | Device inventory with encryption and lock status | AST-01 | NOT_STARTED | END-01 | TO_MAP_IN_SECUREFRAME | |
| EA-35 | Corporate | Cyber-insurance review | Financial resilience | R | F | R | Current policy summary and review date | — | NOT_STARTED | RSK-08 | TO_MAP_IN_SECUREFRAME | |
| EA-36 | External | Penetration test | Independent assurance | R | T | R | Report plus tracked findings and retest | CCG-B | NOT_STARTED | VUL-08 | TO_MAP_IN_SECUREFRAME | |

## Privacy and audit

| ID | System | Action | Why it matters | Accountable | Operator | Approver | Expected evidence | Dependency | Status | Controls | SF destination | Completed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EA-40 | Product, Corporate | Run one privacy request end to end | Proves the workflow, not the policy | F | F | L | Request record with verification, scope, execution, propagation, receipt | PRI-07 | NOT_STARTED | PRI-07 | TO_MAP_IN_SECUREFRAME | |
| EA-41 | Corporate | Approve the retention schedule | Every category needs a rule | L | F | L | Approved schedule covering every DAT-01 category | DAT-01 | NOT_STARTED | PRI-12 | TO_MAP_IN_SECUREFRAME | |
| EA-42 | External | Confirm audit scope with the auditor | Scope drives everything | R | F | L for legal language | Written scope confirmation | CCG-E | NOT_STARTED | GOV-09 | AUDITOR_CONFIRMATION_REQUIRED | |
