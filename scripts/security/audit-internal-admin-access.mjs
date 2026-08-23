#!/usr/bin/env node
/** Exact-email, read-only internal authorization audit. No write methods are used. */
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const relevantMetadataKey = /(role|admin|internal|partner|permission|access)/i;
const legacyEmailAllowlistNames = [
  "INTERNAL_ADMIN_EMAILS",
  "INTERNAL_ADMIN_EMAIL_ALLOWLIST",
  "LEGAL_ADMIN_EMAILS",
  "ADMIN_EMAIL_ALLOWLIST"
];

export function parseArgs(argv) {
  const options = { email: "", json: false, redact: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--email") options.email = String(argv[++index] ?? "").trim().toLowerCase();
    else if (value === "--json") options.json = true;
    else if (value === "--redact") options.redact = true;
    else if (value === "--help" || value === "-h") options.help = true;
    else throw new Error(`Unknown option: ${value}`);
  }
  if (!options.help && !isExactEmail(options.email)) {
    throw new Error("Provide one exact email with --email <email>.");
  }
  return options;
}

export function relevantMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => relevantMetadataKey.test(key))
      .map(([key, value]) => [key, safeMetadataValue(value)])
  );
}

export function legacyAllowlistAudit(email, env = process.env) {
  return legacyEmailAllowlistNames.map((name) => {
    const configured = typeof env[name] === "string" && env[name].trim().length > 0;
    const entries = configured
      ? env[name].split(/[\s,;]+/u).map((value) => value.trim().toLowerCase()).filter(Boolean)
      : [];
    return { name, configured, exactMatch: entries.includes(email) };
  });
}

export async function auditExactEmail({ email, client, env = process.env }) {
  const matches = await findExactAuthUsers(client, email);
  const user = matches.length === 1 ? matches[0] : null;
  const authUserId = user?.id ?? null;

  const [partnerUsers, contentRoles, onboardingEvents, contentEvents] = authUserId
    ? await Promise.all([
        exactRows(client, "partner_users", "auth_user_id", authUserId,
          "id, auth_user_id, partner_slug, role, status, invited_email, created_at, updated_at"),
        optionalExactRows(client, "content_admin_users", "auth_user_id", authUserId,
          "auth_user_id, content_role, partner_slug, status, created_at, updated_at"),
        optionalExactRows(client, "partner_onboarding_activity", "actor_user_id", authUserId,
          "id, event_type, summary_code, owner_type, actor_user_id, request_id, occurred_at", 25, "occurred_at"),
        optionalExactRows(client, "content_audit_events", "actor_id", authUserId,
          "audit_id, actor_id, actor_role, action, entity_type, entity_id, created_at", 25, "created_at")
      ])
    : [[], { rows: [], unavailable: null }, { rows: [], unavailable: null }, { rows: [], unavailable: null }];

  const activeInternal = partnerUsers.filter(
    (row) => row.role === "internal_admin" && row.status === "active" && row.partner_slug === null
  );
  const revokedOrExpired = partnerUsers.filter(
    (row) => row.role === "internal_admin" && row.status !== "active"
  );
  const partnerMemberships = partnerUsers.filter((row) => row.role !== "internal_admin");
  const metadata = user
    ? {
        app_metadata: relevantMetadata(user.app_metadata),
        user_metadata: relevantMetadata(user.user_metadata)
      }
    : { app_metadata: {}, user_metadata: {} };
  const legacyAllowlists = legacyAllowlistAudit(email, env);
  const conflicts = [];
  if (matches.length !== 1) conflicts.push(`Expected one Auth user; found ${matches.length}.`);
  if (activeInternal.length > 1) conflicts.push("More than one active internal-admin row exists.");
  if (activeInternal.length && partnerMemberships.some((row) => row.status === "active")) {
    conflicts.push("The UUID has both internal and partner-scoped active memberships.");
  }
  if (metadataClaimsInternal(metadata)) conflicts.push("Auth metadata contains an internal/admin role claim.");
  if (legacyAllowlists.some((entry) => entry.exactMatch)) conflicts.push("The email matches a legacy environment allowlist.");
  if (contentRoles.rows.some((row) => row.status === "active") && activeInternal.length === 0) {
    conflicts.push("An active content role exists without canonical internal-admin membership.");
  }

  return {
    auditVersion: 1,
    generatedAt: new Date().toISOString(),
    readOnly: true,
    query: { exactEmail: email },
    auth: {
      matchCount: matches.length,
      user: user ? {
        id: user.id,
        email: user.email ?? null,
        emailVerified: Boolean(user.email_confirmed_at),
        emailConfirmedAt: user.email_confirmed_at ?? null,
        bannedUntil: user.banned_until ?? null,
        createdAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null
      } : null
    },
    canonicalAuthorization: {
      source: "public.partner_users",
      activeInternalAdminRecords: activeInternal,
      revokedOrExpiredRecords: revokedOrExpired,
      partnerMemberships
    },
    metadataClaims: metadata,
    contentRoles,
    legacyAllowlists,
    sessions: {
      supported: false,
      activeCount: null,
      reason: "The installed Supabase Admin SDK does not expose session listing by Auth user UUID. Use the guarded remediation runbook's administrative session-revocation step."
    },
    recentAdministrativeEvents: {
      onboarding: onboardingEvents,
      content: contentEvents
    },
    conflicts
  };
}

async function findExactAuthUsers(client, email) {
  const matches = [];
  const perPage = 1000;
  for (let page = 1; page <= 10000; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Auth user lookup failed: ${safeError(error)}`);
    const users = data?.users ?? [];
    matches.push(...users.filter((user) => user.email?.trim().toLowerCase() === email));
    if (users.length < perPage) break;
    if (page === 10000) throw new Error("Auth user lookup exceeded the safe pagination bound.");
  }
  return matches;
}

async function exactRows(client, table, column, value, select) {
  const { data, error } = await client.from(table).select(select).eq(column, value);
  if (error) throw new Error(`${table} lookup failed: ${safeError(error)}`);
  return data ?? [];
}

async function optionalExactRows(client, table, column, value, select, limit = 50, order = "created_at") {
  const query = client.from(table).select(select).eq(column, value).order(order, { ascending: false }).limit(limit);
  const { data, error } = await query;
  if (error) return { rows: [], unavailable: safeError(error) };
  return { rows: data ?? [], unavailable: null };
}

function metadataClaimsInternal(metadata) {
  return JSON.stringify(metadata).toLowerCase().includes("internal_admin");
}

function safeMetadataValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 160);
  if (Array.isArray(value)) return value.slice(0, 20).map(safeMetadataValue);
  if (typeof value === "object") return relevantMetadata(value);
  return String(value).slice(0, 160);
}

function safeError(error) {
  return String(error?.message ?? "unavailable").replace(/[\r\n\t]/gu, " ").slice(0, 180);
}

function isExactEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function redactReport(report) {
  const serialized = JSON.stringify(report);
  return JSON.parse(serialized, (key, value) => {
    if (typeof value !== "string") return value;
    if (/email/i.test(key) || value.includes("@")) return redactEmail(value);
    if (/(^id$|_id$|uuid)/i.test(key) || /^[0-9a-f-]{36}$/i.test(value)) return `${value.slice(0, 8)}…`;
    return value;
  });
}

function redactEmail(value) {
  const at = value.indexOf("@");
  if (at < 1) return "[redacted]";
  return `${value[0]}***${value.slice(at)}`;
}

function printHuman(report) {
  const lines = [
    "Internal administrator authorization audit (read-only)",
    `Exact email: ${report.query.exactEmail}`,
    `Auth matches: ${report.auth.matchCount}`,
    `Auth user UUID: ${report.auth.user?.id ?? "not found"}`,
    `Email verified: ${report.auth.user?.emailVerified ?? false}`,
    `Active internal-admin records: ${report.canonicalAuthorization.activeInternalAdminRecords.length}`,
    `Revoked/expired records: ${report.canonicalAuthorization.revokedOrExpiredRecords.length}`,
    `Partner memberships: ${report.canonicalAuthorization.partnerMemberships.length}`,
    `Active sessions: unavailable through installed SDK`,
    `Conflicts: ${report.conflicts.length}`,
    ...report.conflicts.map((conflict) => `- ${conflict}`)
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("Usage: node scripts/security/audit-internal-admin-access.mjs --email <exact-email> [--json] [--redact]\n");
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Set the target Supabase URL and service-role credential in the execution environment.");
  }
  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const report = await auditExactEmail({ email: options.email, client });
  const output = options.redact ? redactReport(report) : report;
  if (options.json) process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  else printHuman(output);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`Audit failed: ${safeError(error)}\n`);
    process.exitCode = 1;
  });
}
