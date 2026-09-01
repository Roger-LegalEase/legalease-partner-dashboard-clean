# CLOUD08 release, rollback, observability, and change-scope review

**Assignment:** `CLOUD08_RELEASE_ROLLBACK_OBSERVABILITY`
**Reviewed head:** `48f74d82016795307e565220e38ce369cf43da5e`
**Minimum ancestor:** `4fb89c96e2886e6d9d80f9bb757278c20ecb6b13` (proven ancestor locally)
**Review date:** 2026-09-01
**Production touched:** no

## Verdict

Release readiness is **blocked**. The repository has useful fail-closed controls, an authenticated database health probe, default-off feature flags, private packet-storage contracts, Stripe signature verification, email dry-run behavior, and strong ephemeral acceptance machinery. Current-head evidence nevertheless does not establish a complete Preview contract, a reversible database release, operational alert delivery, or an applied migration order.

No application, migration, packet, queue, Production, or commercial-authority file was modified by CLOUD08.

## Current-head conclusions

| Area | Conclusion | Evidence / stop condition |
|---|---|---|
| Preview contract | **Incomplete** | `verify-rcap-staging-authorization-readiness` reports `applicationDeploymentTarget` and `workerDeploymentTarget` blank. Stop before any shared staging action. |
| Rollback contract | **Incomplete** | The ephemeral workflow proves a runtime flag rollback to disabled, but no current-head contract proves database backward compatibility, restore rehearsal, RPO/RTO, or a post-migration application rollback target. |
| Migration order | **Not proven here** | The documented 49→50 same-window security order is explicit. The PostgreSQL verifier could not run because PostgreSQL 16 is absent, and the authorized staging rehearsal remains unrun. |
| Monitoring | **Incomplete** | `/api/health` probes only `partner_records`; it does not probe Auth, Storage, Stripe, email, queue age/depth, worker heartbeat, or delivery. LegalEase OS export is optional/default-off. |
| Alerting | **Absent as a proven release control** | No repository evidence binds health/queue/webhook/email failures to a paging destination, severity, threshold, acknowledgement owner, or tested delivery receipt. |
| Audit events | **Partial** | Structured security logs and LegalEase OS events redact known data, while product/database audit trails exist. No release evidence proves centralized retention, immutable ingestion, correlation, or operator review. |
| Sensitive logging | **One defect** | Verified Stripe webhook failures log arbitrary `error.message` via raw `console.error`; see `findings.md` CLOUD08-F01. |
| Backups / restore | **Unproven** | Repository backup references concern codespace artifacts, not a Preview Supabase database restore. Stop until a disposable restore rehearsal produces timestamps and row/object checks. |
| Support ownership | **Partial** | A partner support mailbox contract exists, but release incident commander, database rollback owner, Stripe owner, email owner, and alert acknowledgement rotation are not all assigned in executable release evidence. |
| Change scope | **Locally separable; PR collision unknown** | GitHub PR metadata was unavailable in the checkout (only local `work` ref). Local ancestor-to-head census found 329 paths and zero `src/**` paths, but includes Fable-owned packet paths. This audit wrote only its exact output directory. |

## Release blocker register

1. **RB-01 — Preview identity incomplete:** name immutable application deployment, worker digest/target, Supabase project ref, Stripe test endpoint, auth allowed origins, Storage bucket, email sink/provider, and evidence run.
2. **RB-02 — Database rollback undefined:** establish a restore point and test old/new application compatibility before applying additive migrations; never attempt destructive reverse SQL under incident pressure.
3. **RB-03 — Migration execution evidence absent:** prove the full ordered sequence on a disposable clone, including the phase 49→50 same-window constraint and browser-role denial checks.
4. **RB-04 — No actionable alerts:** install and test alert routing for health, queue/worker, Stripe, email, Storage, and error-rate signals with named owners.
5. **RB-05 — Sensitive error logging:** bound Stripe webhook failure logs to a redacted error class/code.
6. **RB-06 — Current hosted acceptance identity is stale:** `verify-rcap-github-hosted-acceptance` fails because the current branch changes frozen application and worker inputs. A newly pinned candidate is required; do not reuse the old acceptance claim.
7. **RB-07 — Open-PR collision evidence unavailable:** export open PR head/base SHAs and changed paths, then run the path procedure in `changed-path-report.md` before merge.

## Artifacts

- `findings.md` — reproduced failures with bounded patch/test requirements.
- `preview-acceptance-checklist.md` — exact Preview commands, evidence, and stop conditions.
- `rollback-checklist.md` — release rollback decision tree and database restore acceptance.
- `changed-path-report.md` — local scope census and PR collision procedure.
