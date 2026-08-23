#!/usr/bin/env node
/**
 * Guarded two-phase internal-admin account remediation.
 *
 * Dry-run is the default. Grant and revoke are intentionally separate so the
 * corporate account can be browser-verified between them. This script never
 * deletes an Auth user and never changes either user's email.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { auditExactEmail } from "./audit-internal-admin-access.mjs";

export function parseRemediationArgs(argv) {
  const options = {
    mode: "",
    corporateEmail: "",
    personalEmail: "",
    expectedCorporateUuid: "",
    expectedPersonalUuid: "",
    apply: false,
    confirmCorporateAccess: false,
    receipt: "",
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") options.mode = String(argv[++index] ?? "");
    else if (value === "--corporate-email") options.corporateEmail = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--personal-email") options.personalEmail = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--expected-corporate-uuid") options.expectedCorporateUuid = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--expected-personal-uuid") options.expectedPersonalUuid = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--receipt") options.receipt = String(argv[++index] ?? "").trim();
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
  if (options.mode === "revoke" && options.apply && !options.confirmCorporateAccess) {
    throw new Error("Revocation requires --confirm-corporate-access after an independent browser verification.");
  }
  return options;
}

async function main() {
  const options = parseRemediationArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(
      "Usage: node scripts/security/remediate-internal-admin-accounts.mjs --mode <grant|revoke> --corporate-email <email> --personal-email <email> --expected-corporate-uuid <uuid> --expected-personal-uuid <uuid> [--apply] [--confirm-corporate-access] [--receipt <path>]\n"
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
    .select("auth_user_id")
    .eq("role", "internal_admin")
    .eq("status", "active")
    .is("partner_slug", null);
  if (activeAdminsError) throw new Error(`Recovery administrator check failed: ${safeError(activeAdminsError)}`);

  const plan = options.mode === "grant"
    ? planGrant(options, corporate, activeAdmins ?? [])
    : planRevoke(options, corporate, personal, activeAdmins ?? []);
  process.stdout.write(`${JSON.stringify({ dryRun: !options.apply, ...plan }, null, 2)}\n`);
  if (!options.apply) {
    process.stdout.write("Dry-run only. No production mutation was executed.\n");
    return;
  }

  const startedAt = new Date().toISOString();
  let revocationToken = null;
  if (options.mode === "revoke") {
    revocationToken = validatedRevocationToken(options.expectedPersonalUuid);
  }
  if (options.mode === "grant") await applyGrant(client, corporate);
  else await applyRevoke(client, options.expectedPersonalUuid, revocationToken);
  const completedAt = new Date().toISOString();

  const receipt = {
    receiptVersion: 1,
    mode: options.mode,
    startedAt,
    completedAt,
    corporateEmail: options.corporateEmail,
    corporateUuid: options.expectedCorporateUuid,
    personalEmail: options.personalEmail,
    personalUuid: options.expectedPersonalUuid,
    operations: plan.operations,
    authUsersDeleted: false,
    emailsChanged: false
  };
  const receiptPath = options.receipt || path.join(
    "artifacts",
    "security",
    `internal-admin-remediation-${options.mode}-${completedAt.replace(/[:.]/gu, "-")}.json`
  );
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`Applied ${options.mode} phase. Audit receipt: ${receiptPath}\n`);
  process.stdout.write("The receipt contains account identifiers; store it securely and do not commit it.\n");
}

function planGrant(options, corporate, activeAdmins) {
  const memberships = corporate.canonicalAuthorization.partnerMemberships;
  if (memberships.length) {
    throw new Error("The corporate UUID already has a partner-scoped membership; refusing to overwrite tenant access.");
  }
  const current = corporate.canonicalAuthorization.activeInternalAdminRecords.length;
  const plannedActive = new Set(activeAdmins.map((row) => row.auth_user_id));
  plannedActive.add(options.expectedCorporateUuid);
  if (plannedActive.size < 1) throw new Error("Grant would leave no recovery administrator.");
  return {
    mode: "grant",
    recoveryAdministratorCountAfter: plannedActive.size,
    operations: current
      ? ["Confirm existing active UUID-bound internal_admin authorization for corporate account"]
      : ["Insert or reactivate UUID-bound internal_admin authorization for corporate account"]
  };
}

function planRevoke(options, corporate, personal, activeAdmins) {
  if (corporate.canonicalAuthorization.activeInternalAdminRecords.length !== 1) {
    throw new Error("Corporate account is not exactly one active internal administrator; refusing personal-account revocation.");
  }
  const plannedActive = new Set(activeAdmins.map((row) => row.auth_user_id));
  plannedActive.delete(options.expectedPersonalUuid);
  plannedActive.add(options.expectedCorporateUuid);
  if (plannedActive.size < 1) throw new Error("Revocation would leave no recovery administrator.");
  const metadataKeys = internalMetadataKeys(personal.metadataClaims);
  return {
    mode: "revoke",
    recoveryAdministratorCountAfter: plannedActive.size,
    operations: [
      "Disable personal UUID's internal_admin membership without deleting its row",
      metadataKeys.length ? `Neutralize internal-role Auth metadata keys: ${metadataKeys.join(", ")}` : "Confirm no internal-role Auth metadata claim exists",
      "Globally revoke refresh-token sessions using a validated personal-account access token",
      "Preserve both Auth users and existing audit history"
    ]
  };
}

async function applyGrant(client, corporate) {
  const userId = corporate.auth.user.id;
  const rows = [
    ...corporate.canonicalAuthorization.activeInternalAdminRecords,
    ...corporate.canonicalAuthorization.revokedOrExpiredRecords
  ];
  if (rows.length > 1) throw new Error("Corporate internal authorization is ambiguous.");
  if (rows.length === 1) {
    const { error } = await client.from("partner_users").update({
      role: "internal_admin",
      status: "active",
      partner_slug: null,
      invited_email: corporate.auth.user.email
    }).eq("id", rows[0].id).eq("auth_user_id", userId);
    if (error) throw new Error(`Corporate authorization update failed: ${safeError(error)}`);
  } else {
    const { error } = await client.from("partner_users").insert({
      auth_user_id: userId,
      partner_slug: null,
      role: "internal_admin",
      status: "active",
      invited_email: corporate.auth.user.email
    });
    if (error) throw new Error(`Corporate authorization insert failed: ${safeError(error)}`);
  }
}

async function applyRevoke(client, expectedPersonalUuid, targetAccessToken) {
  const { data: authData, error: authError } = await client.auth.admin.getUserById(expectedPersonalUuid);
  if (authError || !authData.user) throw new Error(`Personal Auth metadata lookup failed: ${safeError(authError)}`);
  const appMetadata = neutralizeInternalMetadata(authData.user.app_metadata ?? {});
  const userMetadata = neutralizeInternalMetadata(authData.user.user_metadata ?? {});

  const { error: membershipError } = await client.from("partner_users")
    .update({ status: "disabled" })
    .eq("auth_user_id", expectedPersonalUuid)
    .eq("role", "internal_admin");
  if (membershipError) throw new Error(`Personal authorization disable failed: ${safeError(membershipError)}`);

  const { error: metadataError } = await client.auth.admin.updateUserById(expectedPersonalUuid, {
    app_metadata: appMetadata,
    user_metadata: userMetadata
  });
  if (metadataError) throw new Error(`Auth metadata cleanup failed: ${safeError(metadataError)}`);

  const { error: signOutError } = await client.auth.admin.signOut(targetAccessToken, "global");
  if (signOutError) throw new Error(`Global session revocation failed: ${safeError(signOutError)}`);
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

function safeError(error) {
  return String(error?.message ?? "unavailable").replace(/[\r\n\t]/gu, " ").slice(0, 180);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`Remediation refused: ${safeError(error)}\n`);
    process.exitCode = 1;
  });
}
