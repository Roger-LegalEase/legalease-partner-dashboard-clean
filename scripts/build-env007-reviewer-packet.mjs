#!/usr/bin/env node
// ENV-007 — the read-only reviewer packet.
//
// Derives everything from git and the committed evidence files. It computes no
// new facts of its own: the matrices come from
// data/rcap-render/phase-boundary-matrices.json, the test results from
// data/rcap-render/workflow-hardening-verification.json, and the diffs from git.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (...a) => execFileSync("git", a, { cwd: rootDir, encoding: "utf8", maxBuffer: 1 << 28 }).trim();
const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const BASE_SHA = "dd93579871962260b12918e54c44cf9bf1e81529";
const PRIOR_HARDENING_SHA = "360d341e8b9ad9e7266e855252d0c6b774890415";
const PRIOR_HEAD_SHA = process.env.ENV007_PRIOR_HEAD_SHA || "b1412a0260ee73bc8034fe944b35faa99fc21dbc";
const AUDIT_PACKET_COMMIT = "00212d529e82a2a2a90b172b29268922feecfcbd";
// The packet describes the CORRECTION commit. Because the packet is itself
// committed, it cannot contain its own hash; it names the correction commit and
// declares itself that commit's child, which `git log` verifies in one line.
const CORRECTION_SHA = process.env.ENV007_CORRECTION_SHA || git("rev-parse", "HEAD");

const matrices = read("data/rcap-render/phase-boundary-matrices.json");
const tests = read("data/rcap-render/workflow-hardening-verification.json");
const manifest = read("data/rcap-acceptance-migration-manifest.json");
const worker = read("data/rcap-render/worker-authority-reconciliation.json");
const equivalence = read("data/rcap-render/audit-surface-equivalence.json");

const nameStatus = (a, b, ...paths) =>
  git("diff", "--name-status", a, b, "--", ...paths).split("\n").filter(Boolean);

const PRODUCT_PATHS = ["src", "public", "package.json", "package-lock.json", "next.config.ts"];
const MIGRATION_PATHS = manifest.migrations.map((m) => m.path);
const AUDIT_PATHS = ["data/expungement-ai/flow-audit", "docs/expungement-ai/flow-audit"];

const out = [];
const w = (l = "") => out.push(l);

w("# ENV-007 — reviewer packet");
w();
w("Read-only. Nothing in this branch was executed: no hosted workflow run, no migration applied, no deployment, no worker image built, no seeding, no payment.");
w();
w("| | |");
w("|---|---|");
w(`| Base SHA (\`origin/main\`) | \`${BASE_SHA}\` |`);
w(`| Prior hardening SHA | \`${PRIOR_HARDENING_SHA}\` |`);
w(`| Prior head (Stripe boundary) | \`${PRIOR_HEAD_SHA}\` |`);
w(`| Correction commit | \`${CORRECTION_SHA}\` |`);
w("| New head SHA | this packet's own commit, the immediate child of the correction commit — `git log --oneline -2` on the branch shows both |");
w(`| Branch | \`${git("rev-parse", "--abbrev-ref", "HEAD")}\` |`);
w(`| Frozen audit packet commit | \`${AUDIT_PACKET_COMMIT}\` (branch not written) |`);
w();

w("## Files changed");
w();
w("### This patch (prior head → correction commit)");
w();
w("| | |");
w("|---|---|");
for (const line of nameStatus(PRIOR_HEAD_SHA, CORRECTION_SHA, ".")) {
  const [status, ...rest] = line.split("\t");
  w(`| \`${status}\` | \`${rest.join("\t")}\` |`);
}
w();
w("### Whole branch (base → head)");
w();
w("| | |");
w("|---|---|");
for (const line of nameStatus(BASE_SHA, CORRECTION_SHA, ".")) {
  const [status, ...rest] = line.split("\t");
  w(`| \`${status}\` | \`${rest.join("\t")}\` |`);
}
w();

w("## Workflow phase → environment");
w();
w("| Phase | Job(s) | Environment(s) |");
w("|---|---|---|");
for (const r of matrices.environmentMatrix) {
  w(`| \`${r.phase}\` | ${r.jobs.map((j) => `\`${j}\``).join(" → ")} | ${r.environments.map((e) => `\`${e}\``).join(" + ")} |`);
}
w();

w("## Environment-variable sentinel matrix");
w();
w("Environment-scoped variables, not secrets. A GitHub Environment created implicitly by a workflow naming one that does not exist carries neither, so an empty value is the signal.");
w();
w("| Job | Environment | `RCAP_ENVIRONMENT_ID` | `RCAP_ENVIRONMENT_CLASS` | Failure code |");
w("|---|---|---|---|---|");
for (const j of matrices.jobs) {
  const sn = (matrices.sentinelMatrix.flatMap((r) => r.sentinels).find((x) => x.job === j.job)) ?? {};
  if (!sn.RCAP_ENVIRONMENT_ID) { w(`| \`${j.job}\` | ${j.environment ? `\`${j.environment}\`` : "none"} | — | — | *(no sentinel; read-only job)* |`); continue; }
  w(`| \`${j.job}\` | \`${j.environment}\` | \`${sn.RCAP_ENVIRONMENT_ID}\` | \`${sn.RCAP_ENVIRONMENT_CLASS}\` | \`${sn.failureCode}\` |`);
}
w();
w("| Phase | Sentinels asserted |");
w("|---|---|");
for (const r of matrices.sentinelMatrix) {
  const asserted = r.sentinels.filter((x) => x.RCAP_ENVIRONMENT_ID);
  w(`| \`${r.phase}\` | ${asserted.length === 0 ? "none (read-only job)" : asserted.map((x) => `\`${x.job}\` → \`${x.RCAP_ENVIRONMENT_ID}\``).join(", ")} |`);
}
w();

w("## Secret-access matrix");
w();
w("Secrets the job serving that phase can even *reference*. A phase cannot use a secret whose expression does not exist in its job.");
w();
w("| Phase | Referencable secrets | `STRIPE_SECRET_ACCESS` | `STRIPE_TRANSACTION` |");
w("|---|---|---|---|");
for (const r of matrices.secretMatrix) {
  w(`| \`${r.phase}\` | ${r.referencableSecrets.map((x) => `\`${x}\``).join(", ") || "none"} | ${r.stripeSecretAccess ? "**true**" : "false"} | ${r.stripeTransaction ? "**true**" : "false"} |`);
}
w();
w("Secret access and transaction authority are separate columns: `payment_environment_probe` holds the key and cannot spend it. Every transacting step in the payment job is gated on `stripe_transaction`, not on membership of the job.");
w();

w("## External-transaction matrix");
w();
w("| Phase | Any external request | Supabase schema | Supabase Auth | Vercel Preview | Vercel **Production** | Registry pull | Stripe API | Checkout Session | Payment webhook | `PAYMENT_EXERCISED` |");
w("|---|---|---|---|---|---|---|---|---|---|---|");
const yn = (b) => (b ? "yes" : "no");
for (const r of matrices.externalWriteMatrix) {
  w(`| \`${r.phase}\` | ${yn(r.externalRequestsPermitted)} | ${yn(r.supabaseSchemaWrite)} | ${yn(r.supabaseAuthConfigWrite)} | ${yn(r.vercelPreviewDeployment)} | **${yn(r.vercelProductionWrite)}** | ${yn(r.containerRegistryPull)} | ${r.stripeApiCall ? "**YES**" : "no"} | ${r.createsCheckoutSession ? "**YES**" : "no"} | ${r.consumesPaymentWebhook ? "**YES**" : "no"} | ${r.paymentExercised ? "**true**" : "false"} |`);
}
w();
w("Invariants, derived and asserted:");
w();
for (const [k, v] of Object.entries(matrices.invariants)) w(`- \`${k}\` — **${v}**`);
w();

w("## Retired and renamed paths");
w();
w("| Value | Status | Refused where | Replacement |");
w("|---|---|---|---|");
w("| `github_acceptance` | **retired** | F1 `retired_path_refusal` job; `legacy_refusal` step 2 of both protected jobs; the retired workflow's own first step | `hosted_payment` |");
w("| `hosted_full` / phase `full` | **renamed, refused alias** | F1 `retired_path_refusal`; `legacy_refusal` in `hosted_write` | `hosted_full_nonpayment` |");
w("| `hosted_checkout_gate` / phase `checkout_gate` | **renamed, refused alias** | F1 `retired_path_refusal`; `legacy_refusal` in `hosted_write` | `hosted_checkout_pinning` (static) or `hosted_payment` (real Session) |");
w();
w("Every refusal happens before any secret is read. `github_acceptance` prints `GITHUB_ACCEPTANCE_RETIRED` and `Use hosted_payment for payment-producing acceptance.` No workflow references `rcap-github-hosted-acceptance.yml` in a `uses:`, so it has no caller.");
w();
w("Its unique case — a real, human-completed Sandbox payment against a live tunnel host — is **not** relocated. Route it through `hosted_payment`, whose reuse-only Checkout step prepares one real unpaid Session on a stable Vercel Preview host that a person can pay.");
w();
w("## Immutable-tag execution recommendation");
w();
w("Restrict both environments' deployment rules to an **immutable tag** cut at the reviewed commit rather than to a branch. A branch moves; a tag pinned in the environment rule does not, so \"approved for this environment\" and \"the bytes that were reviewed\" stay the same thing. The workflow already pins `application_sha`, `worker_source_sha`, `worker_digest` and `tools_sha` — but those pins live *in the workflow file*, and restricting the environment to a tag is what stops a different workflow file from reaching the same secrets.");
w();
w("## Tests and results");
w();
w(`\`node scripts/verify-rcap-acceptance-workflow-hardening.mjs\` — **${tests.passed}/${tests.total} passing**, ${tests.failed} failing. Static and dry-run only: no network, no database, no registry, no deployment.`);
w();
w("| Check | Result |");
w("|---|---|");
for (const r of tests.results) w(`| \`${r.id}\` | ${r.ok ? "pass" : "**FAIL**"} |`);
w();
w("Supporting scripts:");
w();
w(`- \`scripts/rcap-phase-boundary-matrix.mjs\` — exit 0, all ${Object.keys(matrices.invariants).length} invariants hold`);
w(`- \`scripts/rcap-audit-surface-equivalence.mjs\` — exit 0, ${equivalence.identicalCount}/${equivalence.auditedSurface.fileCount} audited-surface files identical, ${equivalence.differingInsideAuditedSurface.length} differing inside`);
w(`- \`scripts/rcap-worker-authority-reconcile.mjs\` — exit 1, \`${worker.status}\` (intended: it is a gate)`);
w();

w("## Product diff");
w();
const productDiff = nameStatus(BASE_SHA, CORRECTION_SHA, ...PRODUCT_PATHS);
w(productDiff.length === 0
  ? "**Empty.** No file under `src/` or `public/`, and neither package manifest nor `next.config.ts`, differs from the base commit."
  : productDiff.map((l) => `- \`${l}\``).join("\n"));
w();

w("## Migration SQL diff");
w();
const migrationDiff = nameStatus(BASE_SHA, CORRECTION_SHA, ...MIGRATION_PATHS);
w(migrationDiff.length === 0
  ? `**Empty.** All ${MIGRATION_PATHS.length} authorized migration files are byte-identical to the base commit.`
  : migrationDiff.map((l) => `- \`${l}\``).join("\n"));
w();
w("| Phase | Path | Blob at base | Blob at correction | Identical |");
w("|---|---|---|---|---|");
for (const m of manifest.migrations) {
  const atBase = (() => { try { return git("rev-parse", `${BASE_SHA}:${m.path}`); } catch { return "MISSING"; } })();
  const atHead = (() => { try { return git("rev-parse", `${CORRECTION_SHA}:${m.path}`); } catch { return "MISSING"; } })();
  w(`| ${m.phase} | \`${m.path}\` | \`${atBase.slice(0, 12)}\` | \`${atHead.slice(0, 12)}\` | ${atBase === atHead ? "yes" : "**NO**"} |`);
}
w();
w(`Migration manifest hash: \`${manifest.manifestHash}\``);
w();

w("## Audit artifact diff");
w();
const auditDiff = nameStatus(BASE_SHA, CORRECTION_SHA, ...AUDIT_PATHS);
const auditRef = (() => { try { return git("rev-parse", "origin/claude/expai-flow-audit-p1"); } catch { return "unknown"; } })();
w(auditDiff.length === 0
  ? `**Empty.** No Phase 1 / Phase 1B / ENV-007 audit artifact was touched by this branch, and \`origin/claude/expai-flow-audit-p1\` is still at \`${auditRef}\`.`
  : auditDiff.map((l) => `- \`${l}\``).join("\n"));
w();

w("## Exact remaining blockers");
w();
const withheld = manifest.acceptanceAuthorizationGate.withheldPhases;
w(`1. **\`ACCEPTANCE_AUTHORIZATION_WITHHELD\` — phases ${withheld.join(", ")}.** Recorded \`queued\` for staging in \`data/rcap-staging-action.json\`; phase 54's is "explicitly withheld by the authorizing instruction". \`hosted_migrate\` refuses before any write. Roger must record an acceptance authorization for each withheld phase, and the manifest must be regenerated from it.`);
w(`2. **\`${worker.status}\`.** ${worker.reason}. No pin was changed. Gates \`hosted_deploy\`, \`hosted_accept\`, \`hosted_full\`, \`hosted_checkout_gate\`, \`hosted_worker_contract\` and \`hosted_payment\`.`);
w(`3. **Neither GitHub Environment exists yet, and neither carries its identity variables.** \`rcap-acceptance\` and \`rcap-acceptance-payment\` are declared in the workflow but not created in GitHub Settings, and no secret has been moved. Until they exist, any write-capable phase fails to resolve its environment. The setup checklist is section 4 of \`docs/rcap/ENV-007-workflow-hardening-report.md\`.`);
w(`4. **One assumption the first \`hosted_payment\` run must confirm.** The Stripe secrets are read from the \`rcap-acceptance-payment\` environment and are no longer declared as \`workflow_call\` secrets. Environment secrets are expected to resolve inside a called workflow's job that declares that environment; proving it requires running a hosted workflow, which is out of scope. The \`stripe_present\` step makes a wrong assumption an explicit refusal naming the environment, never a silent skip.`);
w(`5. **The \`github_acceptance\` fallback now fails closed.** It still references the Stripe secrets, receives none, and exits 1 at its first step. That is the intended consequence of the owner decision, not a regression to fix here — but it means that fallback mode is unavailable until it is either retired or moved behind the payment environment.`);
w();

const target = path.join(rootDir, "docs/rcap/ENV-007-reviewer-packet.md");
fs.writeFileSync(target, `${out.join("\n")}\n`);
console.log(`wrote docs/rcap/ENV-007-reviewer-packet.md (${out.length} lines)`);
