import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const { supabaseUrl, serviceRoleKey } = requiredSupabaseEnv();
const now = readOption("--now");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data, error } = await supabase.rpc("release_expired_rcap_screening_slots", {
  p_now: now ?? new Date().toISOString()
});

if (error) {
  console.error(`RCAP expired slot release failed: ${error.message}`);
  process.exit(1);
}

await emitPartnerUsageRows(data ?? []);
console.log(JSON.stringify({ ok: true, released: data ?? [] }, null, 2));

function readOption(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }
  return { supabaseUrl, serviceRoleKey };
}

async function emitPartnerUsageRows(rows) {
  await Promise.all(rows.map((row) => emitPartnerUsageWindowEvent(row)));
}

async function emitPartnerUsageWindowEvent(row) {
  if (process.env.LEGALEASE_OS_EVENTS_ENABLED !== "true") return;
  if (!process.env.LEGALEASE_OS_EVENTS_ENDPOINT || !process.env.LEGALEASE_OS_EVENTS_SECRET) return;

  const payload = partnerUsagePayload(row);
  const body = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", process.env.LEGALEASE_OS_EVENTS_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  try {
    await fetch(process.env.LEGALEASE_OS_EVENTS_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-legalease-os-timestamp": timestamp,
        "x-legalease-os-signature": `sha256=${signature}`,
        "x-idempotency-key": payload.idempotency_key
      },
      body
    });
  } catch {
    // Usage event export is fail-safe and must not fail the lifecycle job.
  }
}

function partnerUsagePayload(row) {
  const screeningsAllowed = safeCount(row.screenings_allowed);
  const screeningsUsed = safeCount(row.screenings_used);
  const metadata = {
    partner_slug: safeSlug(row.partner_slug),
    screenings_allowed: screeningsAllowed,
    screenings_used: screeningsUsed,
    at_capacity: screeningsUsed >= screeningsAllowed
  };
  if (row.period_label) metadata.period_label = row.period_label;
  return {
    eventType: "partner_usage_window",
    product: "expungement_ai",
    state: "ALL",
    source: "partner_entitlement",
    timestamp: new Date().toISOString(),
    metadata,
    idempotency_key: `leos-${createHash("sha256").update([
      "partner_usage_window",
      metadata.partner_slug,
      metadata.period_label ?? "current",
      metadata.screenings_used,
      metadata.screenings_allowed
    ].join(":")).digest("hex").slice(0, 32)}`
  };
}

function safeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeCount(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : 0;
}
