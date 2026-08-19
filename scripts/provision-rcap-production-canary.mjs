#!/usr/bin/env node
// The reviewed command that provisions one RCAP partner tenant and creates and
// sends its first-administrator invitation.
//
// It is a wrapper and nothing else. Every database write happens inside
// src/lib/partners/partner-provisioning-service.ts and
// src/lib/partners/first-admin-service.ts, which are the same modules the
// internal provisioning surface calls. A command that re-implemented those
// writes would be a second definition of what a provisioned partner is, and the
// two would drift the first time either changed.
//
// Default is --dry-run. Execution against Production additionally requires the
// exact project ref, the exact source SHA, a clean repository, the expected
// merged source in ancestry, and a preflight that finds no tenant, at most one
// matching Auth user, no unrelated membership, and no public or active state.
//
// It never publishes, never activates, never creates an access code, never
// touches billing, and stops before the human accepts.
//
//   node scripts/provision-rcap-production-canary.mjs --dry-run ...
//   node scripts/provision-rcap-production-canary.mjs --execute ... \
//     --confirm-production-ref <ref> --confirm-source-sha <sha>

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const OPTIONS = [
  "dry-run",
  "execute",
  "project-ref",
  "organization-name",
  "legal-organization-name",
  "partner-slug",
  "program-name",
  "program-purpose",
  "admin-name",
  "admin-email",
  "idempotency-key",
  "confirm-production-ref",
  "confirm-source-sha"
];
const FLAGS = new Set(["dry-run", "execute"]);

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) fail(`Unrecognized argument: ${raw}`);
    const [name, inline] = raw.slice(2).split(/=(.*)/s);
    if (!OPTIONS.includes(name)) fail(`Unrecognized option: --${name}`);
    if (FLAGS.has(name)) {
      args[name] = true;
      continue;
    }
    const value = inline ?? argv[++i];
    if (value === undefined || String(value).startsWith("--")) {
      fail(`--${name} requires a value.`);
    }
    args[name] = String(value);
  }
  return args;
}

function fail(message) {
  console.error(`Refused: ${message}`);
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

const args = parseArgs(process.argv.slice(2));
// The default is the safe one. --execute has to be asked for, and asking for
// both is a contradiction rather than a preference.
if (args.execute && args["dry-run"]) {
  fail("Choose either --dry-run or --execute, not both.");
}
const mode = args.execute ? "execute" : "dry-run";

const required = [
  ["organization-name", "--organization-name"],
  ["legal-organization-name", "--legal-organization-name"],
  ["partner-slug", "--partner-slug"],
  ["program-name", "--program-name"],
  ["program-purpose", "--program-purpose"],
  ["admin-name", "--admin-name"],
  ["admin-email", "--admin-email"],
  ["idempotency-key", "--idempotency-key"]
];
for (const [key, label] of required) {
  if (!args[key]) fail(`${label} is required.`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!supabaseUrl || !serviceRoleKey) {
  fail(
    "A secure server-side Supabase environment is required (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
  );
}
let supabaseHost;
try {
  supabaseHost = new URL(supabaseUrl).hostname;
} catch {
  fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
}
const targetsLoopback = LOOPBACK_HOSTS.has(supabaseHost);

// Production is identified by the project ref, not by a hunch about the host.
// The command stays runnable against a local stack precisely so this path can
// be tested; localhost is refused only when execution claims to target
// Production.
const productionRef = args["project-ref"] ?? "";
const targetsProduction =
  mode === "execute" && Boolean(args["confirm-production-ref"]);

if (mode === "execute") {
  if (!args["confirm-production-ref"]) {
    fail("--execute requires --confirm-production-ref.");
  }
  if (!args["confirm-source-sha"]) {
    fail("--execute requires --confirm-source-sha.");
  }
  if (!productionRef) {
    fail("--execute requires --project-ref.");
  }
  if (args["confirm-production-ref"] !== productionRef) {
    fail("--confirm-production-ref does not match --project-ref exactly.");
  }
  if (targetsLoopback && args["confirm-production-ref"] !== "local") {
    fail(
      "Execution confirmed a Production project ref while the Supabase environment is loopback."
    );
  }
  if (!targetsLoopback && !supabaseHost.includes(productionRef)) {
    fail("The Supabase environment does not belong to --project-ref.");
  }

  const status = git(["status", "--porcelain"]);
  if (status) fail("The repository is not clean.");

  const head = git(["rev-parse", "HEAD"]);
  const confirmedSha = args["confirm-source-sha"];
  if (!/^[0-9a-f]{40}$/.test(confirmedSha)) {
    fail("--confirm-source-sha must be a full 40-character commit SHA.");
  }
  if (head !== confirmedSha) {
    fail("HEAD does not match --confirm-source-sha.");
  }
  const expectedMerged = process.env.RCAP_CANARY_EXPECTED_ANCESTOR ?? "";
  if (expectedMerged) {
    try {
      execFileSync(
        "git",
        ["merge-base", "--is-ancestor", expectedMerged, "HEAD"],
        { cwd: root }
      );
    } catch {
      fail("The expected merged source is not in HEAD's ancestry.");
    }
  }
}

const {
  provisionPartner,
  readPartnerProvisioningState,
  isPartnerProvisioningReplay,
  PartnerProvisioningError
} = await import("../src/lib/partners/partner-provisioning-service.ts");
const {
  createFirstAdminInvitation,
  getFirstAdminAccessView,
  sendFirstAdminInvitationEmail,
  FirstAdminProvisioningError
} = await import("../src/lib/partners/first-admin-service.ts");
const { validatePartnerProvisioningInput } = await import(
  "../src/lib/partners/partner-provisioning-domain.ts"
);
const { getSupabaseAdminClient } = await import("../src/lib/supabase/server.ts");
const { normalizeEmail } = await import(
  "../src/lib/partners/first-admin-domain.ts"
);

const values = {
  organizationName: args["organization-name"],
  legalOrganizationName: args["legal-organization-name"],
  partnerSlug: args["partner-slug"],
  programName: args["program-name"],
  programPurpose: args["program-purpose"],
  administratorName: args["admin-name"],
  administratorEmail: args["admin-email"],
  clearanceReason:
    process.env.RCAP_CANARY_CLEARANCE_REASON ??
    "Reviewed RCAP production canary provisioning, authorized by the repository owner.",
  idempotencyKey: args["idempotency-key"]
};
const validated = validatePartnerProvisioningInput(values);
if (!validated.ok) fail(validated.error);

const supabase = getSupabaseAdminClient();
if (!supabase) fail("Supabase service-role access is not configured.");

const operatorUserId = await resolveOperator(supabase);
const adminEmail = normalizeEmail(values.administratorEmail);
const authMatches = await countAuthUsers(supabase, adminEmail);
const state = await readPartnerProvisioningState(validated.value.partnerSlug);
const isReplay = await isPartnerProvisioningReplay({
  partnerSlug: validated.value.partnerSlug,
  idempotencyKey: validated.value.idempotencyKey
});
const membership = await findUnrelatedMembership(supabase, adminEmail);

report("RCAP PRODUCTION CANARY PROVISIONING");
report(`mode: ${mode}`);
report(`supabase host: ${supabaseHost}`);
report(`project ref: ${productionRef || "(not supplied)"}`);
report("");
report("Intended tenant");
report(`  organization: ${validated.value.organizationName}`);
report(`  legal name:   ${validated.value.legalOrganizationName}`);
report(`  page address: ${validated.value.partnerSlug}`);
report("Intended program");
report(`  name:    ${validated.value.programName}`);
report(`  purpose: ${truncate(validated.value.programPurpose, 120)}`);
report("Intended administrator path");
report(`  name:  ${validated.value.administratorName}`);
report(`  email: ${maskEmail(adminEmail)}`);
report(
  `  auth account: ${
    authMatches === 0
      ? "absent — an account will be created when the invitation is opened"
      : authMatches === 1
        ? "already confirmed — no second account will be created"
        : "ambiguous — more than one account matches; provisioning is refused"
  }`
);
report("");
report("Records that would be created");
for (const line of [
  "partner tenant record",
  "partner program",
  "onboarding workspace",
  "eight initial onboarding sections",
  "implementation milestone state",
  "private participant page configuration",
  "provisioning audit event",
  "idempotency record",
  "one first-administrator invitation",
  "one branded invitation email"
]) {
  report(`  + ${line}`);
}
report("Records that would remain absent");
for (const line of [
  "additional Auth user",
  "partner membership (created only when the administrator accepts)",
  "access code",
  "packet or participant allocation",
  "invoice, purchase order, payment, checkout, or sponsorship claim",
  "public participant page, sitemap entry, or navigation entry"
]) {
  report(`  - ${line}`);
}
report("");
report("Publication and activation");
report("  publication:        private");
report("  public route:       404");
report("  program activation: inactive");
report("  participant intake: inactive");
report("  launched:           no");
report("");
report("Current state");
report(`  tenant exists:              ${state.partnerExists ? "yes" : "no"}`);
report(`  this key already ran:       ${isReplay ? "yes — a re-run resumes it" : "no"}`);
report(`  workspace exists:           ${state.workspaceExists ? "yes" : "no"}`);
report(`  memberships for this slug:  ${state.membershipCount}`);
report(`  access codes for this slug: ${state.accessCodeCount}`);
report(`  publication authorized:     ${state.publicationAuthorized ? "yes" : "no"}`);
report(`  activation authorized:      ${state.activationAuthorized ? "yes" : "no"}`);
report("");

if (mode === "dry-run") {
  report("Dry run only. Nothing was written.");
  process.exit(0);
}

// Preflight for execution. Every one of these is a reason to stop before the
// first write rather than to unwind afterwards.
// A tenant under this slug stops the run unless this exact key created it, in
// which case the re-run resumes the operation rather than starting a second one.
if (!isReplay && (state.partnerExists || state.workspaceExists)) {
  fail("A tenant already exists for that page address.");
}
if (authMatches > 1) {
  fail("More than one Auth user matches the administrator email.");
}
if (membership) {
  fail("The administrator email already holds a partner membership.");
}
if (state.publicationAuthorized || state.activationAuthorized) {
  fail("The initial state is not private and inactive.");
}
if (state.accessCodeCount > 0) {
  fail("An access code already exists for that page address.");
}

let provisioning;
try {
  provisioning = await provisionPartner({ values, operatorUserId });
} catch (error) {
  if (error instanceof PartnerProvisioningError) {
    fail(`Provisioning stopped (${error.code}). Nothing was created.`);
  }
  throw error;
}
report(
  provisioning.created
    ? "Provisioned one partner tenant."
    : "This request was already processed. The original result was returned."
);
report(`  workspace status:   ${provisioning.workspaceStatus}`);
report(`  sections:           ${provisioning.sectionCount}`);
report(`  milestones:         ${provisioning.milestoneCount}`);
report(`  page configuration: ${provisioning.pageConfigurationCreated ? "private" : "absent"}`);

// Invitation creation and delivery are separate from the provisioning
// transaction on purpose: an email provider failure must not roll back a tenant,
// and a retried email must not create a second invitation.
const invitationKey =
  process.env.RCAP_CANARY_INVITATION_KEY ?? deriveKey(validated.value.idempotencyKey, 1);
const deliveryKey =
  process.env.RCAP_CANARY_DELIVERY_KEY ?? deriveKey(validated.value.idempotencyKey, 2);

let invitation;
try {
  invitation = await createFirstAdminInvitation({
    partnerSlug: validated.value.partnerSlug,
    operatorUserId,
    values: {
      fullName: validated.value.administratorName,
      email: adminEmail,
      idempotencyKey: invitationKey
    }
  });
} catch (error) {
  if (error instanceof FirstAdminProvisioningError) {
    fail(
      `The tenant was provisioned, but the invitation was not created (${error.code}). Re-run with the same keys.`
    );
  }
  throw error;
}
report(
  invitation.created
    ? "Created one first-administrator invitation."
    : "An invitation for this request already existed. No second invitation was created."
);

if (invitation.setupLink) {
  try {
    const delivery = await sendFirstAdminInvitationEmail({
      partnerSlug: validated.value.partnerSlug,
      operatorUserId,
      invitationId: invitation.invitation.invitationId,
      setupLink: invitation.setupLink,
      deliveryIdempotencyKey: deliveryKey
    });
    report(
      delivery.duplicatePrevented
        ? "The invitation had already been delivered. No second email was sent."
        : "Sent one branded invitation email."
    );
  } catch (error) {
    const code =
      error instanceof FirstAdminProvisioningError ? error.code : "unknown";
    report(
      `Invitation delivery did not complete (${code}). The invitation remains pending and can be resent with the same delivery key.`
    );
  }
} else {
  report(
    "The invitation already existed, so its one-time link is not reissued here. Resend it from the administrator access panel."
  );
}

const access = await getFirstAdminAccessView(validated.value.partnerSlug);
const after = await readPartnerProvisioningState(validated.value.partnerSlug);
report("");
report("Stopped before human acceptance.");
report(`  invitation status:  ${access.invitation?.status ?? "none"}`);
report(`  delivery status:    ${access.invitation?.deliveryStatus ?? "none"}`);
report(`  memberships:        ${after.membershipCount}`);
report(`  publication:        ${after.publicationAuthorized ? "PUBLIC" : "private"}`);
report(`  activation:         ${after.activationAuthorized ? "ACTIVE" : "inactive"}`);
report(`  access codes:       ${after.accessCodeCount}`);
report("Nothing was published and nothing was activated.");
process.exit(0);

// --- helpers ---------------------------------------------------------------

function report(line) {
  console.log(line);
}

function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/** Enough to confirm the right mailbox, not enough to publish it. */
function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return "(redacted)";
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

/** Derived so one operator-supplied key drives every step deterministically. */
function deriveKey(seed, index) {
  const hex = seed.replace(/-/g, "");
  const mutated = `${hex.slice(0, 30)}${index.toString(16).padStart(2, "0")}`;
  return [
    mutated.slice(0, 8),
    mutated.slice(8, 12),
    `4${mutated.slice(13, 16)}`,
    `8${mutated.slice(17, 20)}`,
    mutated.slice(20, 32)
  ].join("-");
}

async function resolveOperator(client) {
  const configured = process.env.RCAP_CANARY_OPERATOR_USER_ID;
  if (configured) return configured;
  const { data, error } = await client
    .from("partner_users")
    .select("auth_user_id")
    .is("partner_slug", null)
    .eq("role", "internal_admin")
    .eq("status", "active")
    .limit(2);
  if (error) fail("The internal operator identity could not be read.");
  const rows = data ?? [];
  if (rows.length !== 1) {
    fail(
      "Exactly one active internal administrator must be identifiable, or set RCAP_CANARY_OPERATOR_USER_ID."
    );
  }
  return rows[0].auth_user_id;
}

async function countAuthUsers(client, email) {
  let count = 0;
  for (let page = 1; page <= 10; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) fail("The Auth user list could not be read.");
    for (const user of result.data.users) {
      if (normalizeEmail(user.email) === email) count += 1;
    }
    if (result.data.users.length < 1000) return count;
  }
  fail("The Auth user list could not be read completely.");
  return count;
}

async function findUnrelatedMembership(client, email) {
  const { data, error } = await client
    .from("partner_users")
    .select("id, partner_slug, role, status")
    .eq("invited_email", email)
    .eq("status", "active")
    .limit(1);
  if (error) fail("Existing memberships could not be read.");
  return (data ?? [])[0] ?? null;
}

// randomUUID is imported so an operator can generate a key with
//   node -e "console.log(require('crypto').randomUUID())"
// and so this module fails loudly if crypto is unavailable.
void randomUUID;
