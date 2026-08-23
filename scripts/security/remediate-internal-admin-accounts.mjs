#!/usr/bin/env node
/**
 * Guarded two-phase internal-admin account remediation.
 *
 * Dry-run is the default. Grant and revoke are intentionally separate so the
 * corporate account can be browser-verified between them. This script never
 * deletes an Auth user and never changes either user's email.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { auditExactEmail } from "./audit-internal-admin-access.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const toolPath = "scripts/security/remediate-internal-admin-accounts.mjs";

export function parseRemediationArgs(argv) {
  const options = {
    mode: "",
    corporateEmail: "",
    personalEmail: "",
    expectedCorporateUuid: "",
    expectedPersonalUuid: "",
    apply: false,
    confirmCorporateAccess: false,
    receiptOutput: "",
    operatorId: "",
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") options.mode = String(argv[++index] ?? "");
    else if (value === "--corporate-email") options.corporateEmail = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--personal-email") options.personalEmail = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--expected-corporate-uuid") options.expectedCorporateUuid = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--expected-personal-uuid") options.expectedPersonalUuid = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--receipt-output") options.receiptOutput = String(argv[++index] ?? "").trim();
    else if (value === "--operator-id") options.operatorId = String(argv[++index] ?? "").trim();
    else if (value === "--apply") options.apply = true;
    else if (value === "--confirm-corporate-access") options.confirmCorporateAccess = true;
    else if (value === "--help" || value === "-h") options.help = true;
    else throw new Error(`Unknown option: ${value}`);
  }
  if (options.help) return options;
  if (!['grant', 'revoke'].includes(options.mode)) throw new Error("--mode must be grant or revoke.");
  if (!isEmail(options.corporateEmail) || !isEmail(options.personalEmail)) {
    throw new Error("Provide both exact account emails.");
  }
  if (!isUuid(options.expectedCorporateUuid) || !isUuid(options.expectedPersonalUuid)) {
    throw new Error("Provide both expected Auth user UUIDs.");
  }
  if (options.expectedCorporateUuid === options.expectedPersonalUuid) {
    throw new Error("Corporate and personal emails must resolve to separate Auth user UUIDs.");
  }
  if (options.apply && !options.receiptOutput) {
    throw new Error("Apply mode requires an explicit --receipt-output path in an approved secure location.");
  }
  if (options.mode === "revoke" && options.apply && !options.confirmCorporateAccess) {
    throw new Error("Revocation requires --confirm-corporate-access after an independent browser verification.");
  }
  validateOperatorId(options.operatorId, "--operator-id");
  return options;
}

async function main() {
  const options = parseRemediationArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(
      "Usage: node scripts/security/remediate-internal-admin-accounts.mjs --mode <grant|revoke> --corporate-email <email> --personal-email <email> --expected-corporate-uuid <uuid> --expected-personal-uuid <uuid> [--apply --receipt-output <secure-path>] [--confirm-corporate-access] [--operator-id <id>]\n"
    );
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Target Supabase URL and service-role credential are required.");
  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const [corporate, personal] = await Promise.all([
    auditExactEmail({ email: options.corporateEmail, client }),
    auditExactEmail({ email: options.personalEmail, client })
  ]);
  assertExactIdentity(corporate, options.expectedCorporateUuid, "corporate");
  assertExactIdentity(personal, options.expectedPersonalUuid, "personal");
  if (!corporate.auth.user.emailVerified) throw new Error("The corporate Auth email is not verified.");
  if (personal.legacyAllowlists.some((entry) => entry.exactMatch)) {
    throw new Error("The personal email still matches a legacy runtime allowlist; remove it before applying account remediation.");
  }

  const { data: activeAdmins, error: activeAdminsError } = await client
    .from("partner_users")
    .select("auth_user_id, partner_slug, role, status")
    .eq("role", "internal_admin")
    .eq("status", "active")
    .is("partner_slug", null);
  if (activeAdminsError) throw new Error(`Recovery administrator check failed: ${safeError(activeAdminsError)}`);

  const plan = buildRemediationPlan({ options, corporate, personal, activeAdmins: activeAdmins ?? [] });
  process.stdout.write(`${JSON.stringify({ dryRun: !options.apply, ...plan }, null, 2)}\n`);
  if (!options.apply) {
    process.stdout.write("Dry-run only. No production mutation was executed.\n");
    return;
  }

  const receiptPath = resolveReceiptOutput(options.receiptOutput);
  const startedAt = new Date().toISOString();
  let revocationToken = null;
  if (options.mode === "revoke") {
    revocationToken = validatedRevocationToken(options.expectedPersonalUuid);
  }
  const receipt = buildRemediationReceipt({
    options,
    plan,
    corporate,
    personal,
    activeAdmins: activeAdmins ?? [],
    startedAt,
    operationId: crypto.randomUUID(),
    candidateSha: currentCandidateSha(),
    operatorId: options.operatorId || validateOperatorId(
      String(process.env.RCAP_REMEDIATION_OPERATOR_ID ?? "").trim(),
      "RCAP_REMEDIATION_OPERATOR_ID"
    ) || null
  });
  reserveReceipt(receiptPath, receipt);
  const recordAction = async (action, operation) => {
    receipt.actionsAttempted.push(action);
    writeReservedReceipt(receiptPath, receipt);
    await operation();
    receipt.actionsCompleted.push(action);
    if (action === "revoke_personal_refresh_sessions") receipt.sessionRevocation = "completed";
    writeReservedReceipt(receiptPath, receipt);
  };

  try {
    if (options.mode === "grant") await applyGrant(client, corporate, recordAction);
    else await applyRevoke(client, personal, revocationToken, recordAction);

    const [corporateAfter, personalAfter, activeAdminsAfter] = await Promise.all([
      auditExactEmail({ email: options.corporateEmail, client }),
      auditExactEmail({ email: options.personalEmail, client }),
      loadActiveGlobalInternalAdmins(client)
    ]);
    assertAppliedInvariant({ options, corporate: corporateAfter, personal: personalAfter, activeAdmins: activeAdminsAfter });
    Object.assign(receipt, {
      status: "completed",
      completedAt: new Date().toISOString(),
      afterRoleState: receiptRoleState(corporateAfter, personalAfter, activeAdminsAfter)
    });
    writeReservedReceipt(receiptPath, receipt);
  } catch (error) {
    if (receipt.sessionRevocation === "pending" && receipt.actionsAttempted.includes("revoke_personal_refresh_sessions")) {
      receipt.sessionRevocation = "failed";
    }
    Object.assign(receipt, {
      status: "failed",
      failedAt: new Date().toISOString(),
      failure: { name: safeFailureName(error) }
    });
    writeReservedReceipt(receiptPath, receipt);
    throw error;
  }

  process.stdout.write(`Applied ${options.mode} phase. Audit receipt: ${receiptPath}\n`);
  process.stdout.write("The receipt contains account identifiers; store it securely and do not commit it.\n");
}

export function buildRemediationPlan({ options, corporate, personal, activeAdmins }) {
  assertPlanningIdentities(options, corporate, personal);
  if (personal.contentRoles.unavailable) {
    throw new Error("Legacy content-role authority could not be audited; refusing incomplete personal-account revocation.");
  }
  const before = activeGlobalInternalAdminIds(activeAdmins);
  const plannedActive = new Set(before);
  const corporateActive = corporate.canonicalAuthorization.activeInternalAdminRecords.length === 1;

  if (options.mode === "grant") plannedActive.add(options.expectedCorporateUuid);
  else {
    if (!corporateActive || !before.has(options.expectedCorporateUuid)) {
      throw new Error("Corporate account is not an authoritative active global internal administrator; refusing personal-account revocation.");
    }
    plannedActive.delete(options.expectedPersonalUuid);
  }

  assertPostPlanRecoverySet(plannedActive, options.expectedCorporateUuid);

  if (options.mode === "grant") {
    return {
      mode: "grant",
      recoveryAdministratorCountBefore: before.size,
      recoveryAdministratorCountAfter: plannedActive.size,
      actions: [corporateActive ? "confirm_corporate_internal_admin" : "grant_corporate_internal_admin"],
      operations: corporateActive
        ? ["Confirm existing active UUID-bound internal_admin authorization for corporate account"]
        : ["Insert or reactivate UUID-bound internal_admin authorization for corporate account"]
    };
  }

  const metadataKeys = internalMetadataKeys(personal.metadataClaims);
  const activeLegacyContentRoles = personal.contentRoles.rows.filter((row) => row.status === "active");
  return {
    mode: "revoke",
    recoveryAdministratorCountBefore: before.size,
    recoveryAdministratorCountAfter: plannedActive.size,
    actions: [
      "disable_personal_internal_admin",
      "disable_personal_legacy_content_roles",
      "neutralize_personal_internal_metadata",
      "revoke_personal_refresh_sessions"
    ],
    operations: [
      "Disable personal UUID's internal_admin membership without deleting its row",
      activeLegacyContentRoles.length
        ? `Disable ${activeLegacyContentRoles.length} active legacy content-role row(s) without deleting history`
        : "Confirm no active legacy content-role row exists",
      metadataKeys.length ? `Neutralize internal-role Auth metadata keys: ${metadataKeys.join(", ")}` : "Confirm no internal-role Auth metadata claim exists",
      "Globally revoke refresh-token sessions using a validated personal-account access token",
      "Preserve both Auth users and existing audit history"
    ]
  };
}

function assertPostPlanRecoverySet(plannedActive, expectedCorporateUuid) {
  if (plannedActive.size === 0) {
    throw new Error("The complete remediation plan would leave no active global recovery administrator.");
  }
  if (!plannedActive.has(expectedCorporateUuid)) {
    throw new Error("The complete remediation plan would leave no verified corporate recovery administrator.");
  }
}

export async function applyGrant(client, corporate, recordAction = async (_action, operation) => operation()) {
  const userId = corporate.auth.user.id;
  const rows = [
    ...corporate.canonicalAuthorization.activeInternalAdminRecords,
    ...corporate.canonicalAuthorization.revokedOrExpiredRecords
  ];
  if (rows.length > 1) throw new Error("Corporate internal authorization is ambiguous.");
  if (rows.length === 1) {
    if (corporate.canonicalAuthorization.activeInternalAdminRecords.length === 1) {
      await recordAction("confirm_corporate_internal_admin", async () => {});
    } else {
      await recordAction("grant_corporate_internal_admin", async () => {
        const { error } = await client.from("partner_users").update({
          role: "internal_admin",
          status: "active",
          partner_slug: null,
          invited_email: corporate.auth.user.email
        }).eq("id", rows[0].id).eq("auth_user_id", userId);
        if (error) throw new Error(`Corporate authorization update failed: ${safeError(error)}`);
      });
    }
  } else {
    await recordAction("grant_corporate_internal_admin", async () => {
      const { error } = await client.from("partner_users").insert({
        auth_user_id: userId,
        partner_slug: null,
        role: "internal_admin",
        status: "active",
        invited_email: corporate.auth.user.email
      });
      if (error) throw new Error(`Corporate authorization insert failed: ${safeError(error)}`);
    });
  }
}

export async function applyRevoke(client, personal, targetAccessToken, recordAction = async (_action, operation) => operation()) {
  const expectedPersonalUuid = personal.auth.user.id;
  const { data: authData, error: authError } = await client.auth.admin.getUserById(expectedPersonalUuid);
  if (authError || !authData.user) throw new Error(`Personal Auth metadata lookup failed: ${safeError(authError)}`);
  const appMetadata = neutralizeInternalMetadata(authData.user.app_metadata ?? {});
  const userMetadata = neutralizeInternalMetadata(authData.user.user_metadata ?? {});

  await recordAction("disable_personal_internal_admin", async () => {
    const { error } = await client.from("partner_users")
      .update({ status: "disabled" })
      .eq("auth_user_id", expectedPersonalUuid)
      .eq("role", "internal_admin");
    if (error) throw new Error(`Personal authorization disable failed: ${safeError(error)}`);
  });

  await recordAction("disable_personal_legacy_content_roles", async () => {
    const { error } = await client.from("content_admin_users")
      .update({ status: "disabled" })
      .eq("auth_user_id", expectedPersonalUuid)
      .eq("status", "active");
    if (error) throw new Error(`Legacy content-role disable failed: ${safeError(error)}`);
  });

  await recordAction("neutralize_personal_internal_metadata", async () => {
    const { error } = await client.auth.admin.updateUserById(expectedPersonalUuid, {
      app_metadata: appMetadata,
      user_metadata: userMetadata
    });
    if (error) throw new Error(`Auth metadata cleanup failed: ${safeError(error)}`);
  });

  await recordAction("revoke_personal_refresh_sessions", async () => {
    const { error } = await client.auth.admin.signOut(targetAccessToken, "global");
    if (error) throw new Error(`Global session revocation failed: ${safeError(error)}`);
  });
}

function assertPlanningIdentities(options, corporate, personal) {
  assertExactIdentity(corporate, options.expectedCorporateUuid, "corporate");
  assertExactIdentity(personal, options.expectedPersonalUuid, "personal");
  if (corporate.auth.user.id === personal.auth.user.id) {
    throw new Error("Corporate and personal emails resolve to the same Auth user UUID.");
  }
  if (!corporate.auth.user.emailVerified) throw new Error("The corporate Auth email is not verified.");
  if (isCurrentlyBanned(corporate.auth.user.bannedUntil)) {
    throw new Error("The corporate Auth account is disabled and cannot be a recovery administrator.");
  }
  const corporateInternalRows = [
    ...corporate.canonicalAuthorization.activeInternalAdminRecords,
    ...corporate.canonicalAuthorization.revokedOrExpiredRecords
  ];
  if (corporateInternalRows.length > 1) {
    throw new Error("Corporate internal authorization is ambiguous.");
  }
  if (corporate.canonicalAuthorization.partnerMemberships.some((row) => row.status === "active")) {
    throw new Error("Corporate account has an active partner-scoped membership and cannot be counted as a global recovery administrator.");
  }
  if (corporate.canonicalAuthorization.activeInternalAdminRecords.some((row) => row.partner_slug !== null)) {
    throw new Error("Corporate account has a partner-scoped internal membership and cannot be counted as a global recovery administrator.");
  }
}

function isCurrentlyBanned(value) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

export function activeGlobalInternalAdminIds(rows) {
  return new Set(rows
    .filter((row) => row.role === "internal_admin" && row.status === "active" && row.partner_slug === null && isUuid(row.auth_user_id))
    .map((row) => row.auth_user_id));
}

export async function loadActiveGlobalInternalAdmins(client) {
  const { data, error } = await client.from("partner_users")
    .select("auth_user_id, partner_slug, role, status")
    .eq("role", "internal_admin")
    .eq("status", "active")
    .is("partner_slug", null);
  if (error) throw new Error(`Recovery administrator check failed: ${safeError(error)}`);
  return data ?? [];
}

export function assertAppliedInvariant({ options, corporate, personal, activeAdmins }) {
  assertPlanningIdentities(options, corporate, personal);
  const active = activeGlobalInternalAdminIds(activeAdmins);
  if (corporate.canonicalAuthorization.activeInternalAdminRecords.length !== 1 || !active.has(options.expectedCorporateUuid)) {
    throw new Error("Applied remediation did not leave the corporate target as an active global internal administrator.");
  }
  if (active.size < 1) {
    throw new Error("Applied remediation left no active global recovery administrator.");
  }
  if (options.mode === "revoke" && (
    personal.canonicalAuthorization.activeInternalAdminRecords.length !== 0
    || active.has(options.expectedPersonalUuid)
  )) {
    throw new Error("Applied remediation did not disable the personal account's global internal authorization.");
  }
}

export function resolveReceiptOutput(requestedPath, { repoRoot = repositoryRoot } = {}) {
  if (!requestedPath) throw new Error("Apply mode requires an explicit secure receipt output path.");
  const resolvedRepository = fs.realpathSync(repoRoot);
  const resolved = path.resolve(requestedPath);
  if (resolved === resolvedRepository) throw new Error("The repository root cannot be used as a receipt destination.");
  assertNoSymlinkComponents(resolved);
  if (fs.existsSync(resolved)) throw new Error("Receipt destination already exists; refusing to overwrite it.");

  const relative = path.relative(resolvedRepository, resolved);
  const insideRepository = relative !== "" && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  if (insideRepository) {
    if (relative === ".git" || relative.startsWith(`.git${path.sep}`)) {
      throw new Error("Git metadata cannot be used as a receipt destination.");
    }
    if (gitExitStatus(["ls-files", "--error-unmatch", "--", relative], resolvedRepository) === 0) {
      throw new Error("Receipt destination is tracked by Git.");
    }
    if (gitExitStatus(["check-ignore", "-q", "--no-index", "--", relative], resolvedRepository) !== 0) {
      throw new Error("Receipt destination is inside an unignored repository path.");
    }
  }
  return resolved;
}

function assertNoSymlinkComponents(targetPath) {
  const parsed = path.parse(targetPath);
  let cursor = parsed.root;
  for (const part of targetPath.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor)) continue;
    if (fs.lstatSync(cursor).isSymbolicLink()) {
      throw new Error("Receipt destination must not resolve through a symbolic link.");
    }
  }
}

function gitExitStatus(args, cwd) {
  try {
    execFileSync("git", args, { cwd, stdio: "ignore" });
    return 0;
  } catch (error) {
    return typeof error?.status === "number" ? error.status : 1;
  }
}

const reservedReceiptPaths = new Set();

export function reserveReceipt(receiptPath, receipt) {
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true, mode: 0o700 });
  const descriptor = fs.openSync(receiptPath, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8" });
    fs.fchmodSync(descriptor, 0o600);
  } finally {
    fs.closeSync(descriptor);
  }
  reservedReceiptPaths.add(path.resolve(receiptPath));
}

export function writeReservedReceipt(receiptPath, receipt) {
  const resolved = path.resolve(receiptPath);
  if (!reservedReceiptPaths.has(resolved)) throw new Error("Receipt output was not reserved by this process.");
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Reserved receipt destination is no longer a regular file.");
  const flags = fs.constants.O_WRONLY | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW ?? 0);
  const descriptor = fs.openSync(resolved, flags);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8" });
    fs.fchmodSync(descriptor, 0o600);
  } finally {
    fs.closeSync(descriptor);
  }
}

export function buildRemediationReceipt({
  options,
  plan,
  corporate,
  personal,
  activeAdmins,
  startedAt,
  operationId,
  candidateSha,
  operatorId
}) {
  return {
    receiptVersion: 1,
    operationId,
    status: "started",
    timestamp: startedAt,
    startedAt,
    completedAt: null,
    targetUserUuids: {
      corporate: options.expectedCorporateUuid,
      personal: options.expectedPersonalUuid
    },
    mode: options.mode,
    beforeRoleState: receiptRoleState(corporate, personal, activeAdmins),
    afterRoleState: null,
    actionsPlanned: [...plan.actions],
    actionsAttempted: [],
    actionsCompleted: [],
    sessionRevocation: options.mode === "revoke" ? "pending" : "not_applicable",
    operatorIdentity: operatorId || null,
    tool: { path: toolPath, candidateSha },
    authUsersDeleted: false,
    authEmailsChanged: false
  };
}

function receiptRoleState(corporate, personal, activeAdmins) {
  return {
    corporate: accountRoleState(corporate),
    personal: accountRoleState(personal),
    activeGlobalInternalAdministratorUuids: [...activeGlobalInternalAdminIds(activeAdmins)].sort()
  };
}

function accountRoleState(report) {
  return {
    authUserUuid: report.auth.user.id,
    emailVerified: Boolean(report.auth.user.emailVerified),
    activeGlobalInternalAdminRows: report.canonicalAuthorization.activeInternalAdminRecords.length,
    inactiveInternalAdminRows: report.canonicalAuthorization.revokedOrExpiredRecords.length,
    activePartnerScopedRows: report.canonicalAuthorization.partnerMemberships.filter((row) => row.status === "active").length,
    activeLegacyContentRoleRows: report.contentRoles.rows.filter((row) => row.status === "active").length
  };
}

function currentCandidateSha() {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/u.test(sha)) throw new Error("Unable to record the candidate Git SHA.");
  return sha;
}

function safeFailureName(error) {
  const name = String(error?.name ?? "Error");
  return /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/u.test(name) ? name : "Error";
}

function validatedRevocationToken(expectedPersonalUuid) {
  const targetAccessToken = process.env.RCAP_PERSONAL_ACCOUNT_ACCESS_TOKEN;
  if (!targetAccessToken) {
    throw new Error("RCAP_PERSONAL_ACCOUNT_ACCESS_TOKEN is required for the supported global session-revocation call.");
  }
  const claims = decodeJwtPayload(targetAccessToken);
  if (claims.sub !== expectedPersonalUuid) throw new Error("Session-revocation token subject does not match expected personal UUID.");
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) throw new Error("Session-revocation token is expired.");
  return targetAccessToken;
}

function assertExactIdentity(report, expectedUuid, label) {
  if (report.auth.matchCount !== 1 || !report.auth.user) {
    throw new Error(`The ${label} email did not resolve to exactly one Auth user.`);
  }
  if (report.auth.user.id !== expectedUuid) throw new Error(`The ${label} Auth UUID does not match the required expected UUID.`);
}

function internalMetadataKeys(metadataClaims) {
  return Object.entries({ ...metadataClaims.app_metadata, ...metadataClaims.user_metadata })
    .filter(([key, value]) => /internal.*admin|admin.*internal/iu.test(key) || JSON.stringify(value).toLowerCase().includes("internal_admin"))
    .map(([key]) => key)
    .sort();
}

function neutralizeInternalMetadata(metadata) {
  return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [
    key,
    /internal.*admin|admin.*internal/iu.test(key) || JSON.stringify(value).toLowerCase().includes("internal_admin") ? null : value
  ]));
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Session-revocation token is not a JWT.");
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new Error("Session-revocation token payload is invalid.");
  }
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function validateOperatorId(value, source) {
  if (value && !/^[A-Za-z0-9._@+:-]{1,120}$/u.test(value)) {
    throw new Error(`${source} contains unsupported characters.`);
  }
  return value;
}

function safeError(error) {
  return String(error?.message ?? "unavailable").replace(/[\r\n\t]/gu, " ").slice(0, 180);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`Remediation refused: ${safeError(error)}\n`);
    process.exitCode = 1;
  });
}
