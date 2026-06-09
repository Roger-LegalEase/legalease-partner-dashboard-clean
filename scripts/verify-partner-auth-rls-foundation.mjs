import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(rootDir, "supabase/phase-21-partner-auth-rls-foundation.sql");
const resolverPath = path.join(rootDir, "src/lib/partners/session-partner.ts");
const foundationWarning =
  "RLS is enforced at the database level and proven by this verifier. Existing application read/write paths may still use the service role and are not yet fully RLS-bound. App-layer partner dashboard isolation is Commit 3+.";

loadLocalEnv();

const failures = [];

verifySourceHardening();

const requiredEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PARTNER_RLS_WMV_ADMIN_EMAIL: process.env.PARTNER_RLS_WMV_ADMIN_EMAIL,
  PARTNER_RLS_WMV_ADMIN_PASSWORD: process.env.PARTNER_RLS_WMV_ADMIN_PASSWORD,
  PARTNER_RLS_DEMO_STAFF_EMAIL: process.env.PARTNER_RLS_DEMO_STAFF_EMAIL,
  PARTNER_RLS_DEMO_STAFF_PASSWORD: process.env.PARTNER_RLS_DEMO_STAFF_PASSWORD,
  PARTNER_RLS_INTERNAL_ADMIN_EMAIL: process.env.PARTNER_RLS_INTERNAL_ADMIN_EMAIL,
  PARTNER_RLS_INTERNAL_ADMIN_PASSWORD: process.env.PARTNER_RLS_INTERNAL_ADMIN_PASSWORD,
  PARTNER_RLS_NO_PARTNER_EMAIL: process.env.PARTNER_RLS_NO_PARTNER_EMAIL,
  PARTNER_RLS_NO_PARTNER_PASSWORD: process.env.PARTNER_RLS_NO_PARTNER_PASSWORD
};

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value) {
    failures.push(`${key} is required for real authenticated RLS verification.`);
  }
}

if (failures.length === 0) {
  await verifyLiveRls();
}

if (failures.length > 0) {
  console.error("Partner auth RLS foundation verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Partner auth RLS foundation verification passed.");
console.log(foundationWarning);
console.log("Service role usage: setup/schema checks only");
console.log("Cross-partner RLS assertions: authenticated anon-client sessions");
console.log("Partners tested: we-must-vote, demo-partner");
console.log("Internal admin behavior: explicit");
console.log("Unauthenticated access: denied");
console.log("No-partner authenticated access: denied");

function verifySourceHardening() {
  const sqlSource = readSource(sqlPath);
  const resolverSource = readSource(resolverPath);

  if (!sqlSource.includes("FOUNDATION-ONLY WARNING")) {
    failures.push("SQL migration is missing the foundation-only warning comment.");
  }

  if (!sqlSource.includes("set search_path = ''")) {
    failures.push("SECURITY DEFINER helpers must use set search_path = ''.");
  }

  if (/set\s+search_path\s*=\s*public/i.test(sqlSource)) {
    failures.push("SECURITY DEFINER helpers must not use search_path = public.");
  }

  for (const functionName of ["current_partner_slug", "current_partner_role", "is_internal_admin"]) {
    if (!sqlSource.includes(`function public.${functionName}()`)) {
      failures.push(`SQL migration is missing public.${functionName}().`);
    }
  }

  const helperBlocks = [
    extractFunctionBlock(sqlSource, "current_partner_slug"),
    extractFunctionBlock(sqlSource, "current_partner_role"),
    extractFunctionBlock(sqlSource, "is_internal_admin")
  ];

  for (const block of helperBlocks) {
    if (!block.includes("set search_path = ''")) {
      failures.push("A SECURITY DEFINER helper is missing hardened search_path = ''.");
    }
    if (!block.includes("public.partner_users")) {
      failures.push("A SECURITY DEFINER helper does not fully qualify public.partner_users.");
    }
    if (!block.includes("auth.uid()")) {
      failures.push("A SECURITY DEFINER helper does not resolve identity with auth.uid().");
    }
  }

  if (!sqlSource.includes("NULL intentionally grants no partner-scoped rows")) {
    failures.push("SQL migration is missing the fail-closed NULL partner slug comment.");
  }

  if (!sqlSource.includes("unique (auth_user_id)")) {
    failures.push("partner_users must enforce one auth user to one identity row with unique(auth_user_id).");
  }

  if (!sqlSource.includes("role = 'internal_admin' and partner_slug is null")) {
    failures.push("internal_admin must require partner_slug is null.");
  }

  if (!resolverSource.includes('import "server-only";')) {
    failures.push("Session partner resolver must import server-only.");
  }

  for (const banned of ["getSupabaseAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "request.body", "searchParams", "localStorage"]) {
    if (resolverSource.includes(banned)) {
      failures.push(`Session partner resolver must not reference ${banned}.`);
    }
  }

  if (!resolverSource.includes("createServerSupabaseAuthClient")) {
    failures.push("Session partner resolver must use createServerSupabaseAuthClient().");
  }
}

async function verifyLiveRls() {
  const service = createClient(requiredEnv.NEXT_PUBLIC_SUPABASE_URL, requiredEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  await assertRequiredPartners(service);

  const wmv = await signInAs("We Must Vote partner admin", requiredEnv.PARTNER_RLS_WMV_ADMIN_EMAIL, requiredEnv.PARTNER_RLS_WMV_ADMIN_PASSWORD);
  const demo = await signInAs("Demo partner staff", requiredEnv.PARTNER_RLS_DEMO_STAFF_EMAIL, requiredEnv.PARTNER_RLS_DEMO_STAFF_PASSWORD);
  const internal = await signInAs(
    "Internal admin",
    requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_EMAIL,
    requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_PASSWORD
  );
  const noPartner = await signInAs(
    "No-partner authenticated user",
    requiredEnv.PARTNER_RLS_NO_PARTNER_EMAIL,
    requiredEnv.PARTNER_RLS_NO_PARTNER_PASSWORD
  );

  await provisionPartnerUser(service, {
    authUserId: wmv.userId,
    partnerSlug: "we-must-vote",
    role: "partner_admin",
    email: requiredEnv.PARTNER_RLS_WMV_ADMIN_EMAIL
  });
  await provisionPartnerUser(service, {
    authUserId: demo.userId,
    partnerSlug: "demo-partner",
    role: "partner_staff",
    email: requiredEnv.PARTNER_RLS_DEMO_STAFF_EMAIL
  });
  await provisionPartnerUser(service, {
    authUserId: internal.userId,
    partnerSlug: null,
    role: "internal_admin",
    email: requiredEnv.PARTNER_RLS_INTERNAL_ADMIN_EMAIL
  });
  await deletePartnerUser(service, noPartner.userId);

  const cleanupIds = await seedOperationalRows(service);

  try {
    await assertPartnerClientScope(wmv.client, {
      label: "We Must Vote partner admin",
      ownSlug: "we-must-vote",
      otherSlug: "demo-partner",
      expectedRole: "partner_admin"
    });

    await assertPartnerClientScope(demo.client, {
      label: "Demo partner staff",
      ownSlug: "demo-partner",
      otherSlug: "we-must-vote",
      expectedRole: "partner_staff"
    });

    await assertInternalAdminScope(internal.client);
    await assertNoPartnerScope(noPartner.client);
    await assertUnauthenticatedScope();
  } finally {
    await cleanupOperationalRows(service, cleanupIds);
  }
}

async function assertRequiredPartners(service) {
  const { data, error } = await service
    .from("partner_records")
    .select("partner_slug")
    .in("partner_slug", ["we-must-vote", "demo-partner"]);

  if (error) {
    failures.push(`Required partner lookup failed: ${error.message}`);
    return;
  }

  const found = new Set((data ?? []).map((row) => row.partner_slug));
  for (const slug of ["we-must-vote", "demo-partner"]) {
    if (!found.has(slug)) {
      failures.push(`Required partner missing from Supabase: ${slug}.`);
    }
  }
}

async function signInAs(label, email, password) {
  const client = createClient(requiredEnv.NEXT_PUBLIC_SUPABASE_URL, requiredEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    failures.push(`${label} sign-in failed: ${error?.message ?? "No user returned."}`);
    return { client, userId: "" };
  }

  return { client, userId: data.user.id };
}

async function provisionPartnerUser(service, { authUserId, partnerSlug, role, email }) {
  if (!authUserId) {
    return;
  }

  const { error } = await service.from("partner_users").upsert(
    {
      auth_user_id: authUserId,
      partner_slug: partnerSlug,
      role,
      status: "active",
      invited_email: email
    },
    { onConflict: "auth_user_id" }
  );

  if (error) {
    failures.push(`Unable to provision ${role} test identity: ${error.message}`);
  }
}

async function deletePartnerUser(service, authUserId) {
  if (!authUserId) {
    return;
  }

  const { error } = await service.from("partner_users").delete().eq("auth_user_id", authUserId);
  if (error) {
    failures.push(`Unable to clear no-partner test identity: ${error.message}`);
  }
}

async function seedOperationalRows(service) {
  const rows = [
    {
      partner_slug: "we-must-vote",
      partner_id: "we-must-vote",
      status: "started",
      current_step: "understand_goal",
      legal_disclaimer_accepted: true
    },
    {
      partner_slug: "demo-partner",
      partner_id: "demo-partner",
      status: "started",
      current_step: "understand_goal",
      legal_disclaimer_accepted: true
    }
  ];

  const { data, error } = await service.from("rcap_intake_sessions").insert(rows).select("id");
  if (error) {
    failures.push(`Unable to seed operational RLS rows: ${error.message}`);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function cleanupOperationalRows(service, ids) {
  if (ids.length === 0) {
    return;
  }

  const { error } = await service.from("rcap_intake_sessions").delete().in("id", ids);
  if (error) {
    failures.push(`Unable to clean up operational RLS rows: ${error.message}`);
  }
}

async function assertPartnerClientScope(client, { label, ownSlug, otherSlug, expectedRole }) {
  const slug = await rpcValue(client, "current_partner_slug");
  if (slug !== ownSlug) {
    failures.push(`${label} resolved partner slug ${String(slug)} instead of ${ownSlug}.`);
  }

  const role = await rpcValue(client, "current_partner_role");
  if (role !== expectedRole) {
    failures.push(`${label} resolved role ${String(role)} instead of ${expectedRole}.`);
  }

  const internal = await rpcValue(client, "is_internal_admin");
  if (internal !== false) {
    failures.push(`${label} unexpectedly resolved internal_admin behavior.`);
  }

  await assertOnlyOwnRows(client, label, "partner_records", ownSlug, otherSlug);
  await assertOnlyOwnRows(client, label, "partner_metrics", ownSlug, otherSlug);
  await assertOnlyOwnRows(client, label, "rcap_intake_sessions", ownSlug, otherSlug);
}

async function assertOnlyOwnRows(client, label, table, ownSlug, otherSlug) {
  const { data: ownRows, error: ownError } = await client.from(table).select("partner_slug").eq("partner_slug", ownSlug);
  if (ownError) {
    failures.push(`${label} could not read own ${table} rows: ${ownError.message}`);
    return;
  }

  if ((ownRows ?? []).length === 0) {
    failures.push(`${label} did not receive any own ${table} rows for ${ownSlug}.`);
  }

  const { data: otherRows, error: otherError } = await client.from(table).select("partner_slug").eq("partner_slug", otherSlug);
  if (otherError) {
    failures.push(`${label} other-partner ${table} query errored instead of returning no rows: ${otherError.message}`);
    return;
  }

  if ((otherRows ?? []).length !== 0) {
    failures.push(`${label} could read ${otherRows.length} ${table} row(s) for ${otherSlug}.`);
  }
}

async function assertInternalAdminScope(client) {
  const slug = await rpcValue(client, "current_partner_slug");
  if (slug !== null) {
    failures.push(`Internal admin current_partner_slug() returned ${String(slug)} instead of null.`);
  }

  const role = await rpcValue(client, "current_partner_role");
  if (role !== "internal_admin") {
    failures.push(`Internal admin current_partner_role() returned ${String(role)}.`);
  }

  const internal = await rpcValue(client, "is_internal_admin");
  if (internal !== true) {
    failures.push("Internal admin did not resolve explicit internal_admin behavior.");
  }

  const { data, error } = await client
    .from("partner_records")
    .select("partner_slug")
    .in("partner_slug", ["we-must-vote", "demo-partner"]);

  if (error) {
    failures.push(`Internal admin could not read partner_records: ${error.message}`);
    return;
  }

  const slugs = new Set((data ?? []).map((row) => row.partner_slug));
  for (const expected of ["we-must-vote", "demo-partner"]) {
    if (!slugs.has(expected)) {
      failures.push(`Internal admin could not read ${expected} through explicit internal policy.`);
    }
  }
}

async function assertNoPartnerScope(client) {
  const slug = await rpcValue(client, "current_partner_slug");
  if (slug !== null) {
    failures.push(`No-partner user current_partner_slug() returned ${String(slug)} instead of null.`);
  }

  const internal = await rpcValue(client, "is_internal_admin");
  if (internal !== false) {
    failures.push("No-partner user unexpectedly resolved internal_admin behavior.");
  }

  await assertNoRows(client, "No-partner authenticated user", "partner_records");
  await assertNoRows(client, "No-partner authenticated user", "rcap_intake_sessions");
}

async function assertUnauthenticatedScope() {
  const client = createClient(requiredEnv.NEXT_PUBLIC_SUPABASE_URL, requiredEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  await assertNoRows(client, "Unauthenticated anon user", "partner_records");
  await assertNoRows(client, "Unauthenticated anon user", "rcap_intake_sessions");

  const { error } = await client.rpc("current_partner_slug");
  if (!error) {
    failures.push("Unauthenticated anon user could execute current_partner_slug().");
  }
}

async function assertNoRows(client, label, table) {
  const { data, error } = await client.from(table).select("partner_slug").limit(10);
  if (error) {
    failures.push(`${label} ${table} query errored instead of returning no rows: ${error.message}`);
    return;
  }

  if ((data ?? []).length !== 0) {
    failures.push(`${label} could read ${data.length} ${table} row(s).`);
  }
}

async function rpcValue(client, functionName) {
  const { data, error } = await client.rpc(functionName);
  if (error) {
    failures.push(`${functionName} RPC failed: ${error.message}`);
    return undefined;
  }

  return data;
}

function readSource(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    failures.push(`Unable to read ${path.relative(rootDir, file)}: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

function extractFunctionBlock(source, functionName) {
  const marker = `function public.${functionName}()`;
  const start = source.indexOf(marker);
  if (start === -1) {
    return "";
  }

  const end = source.indexOf("$$;", start);
  return end === -1 ? source.slice(start) : source.slice(start, end + 3);
}

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
