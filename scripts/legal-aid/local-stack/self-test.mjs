// Proves the shim speaks enough PostgREST/GoTrue/Storage for the application's
// client library before the end-to-end run relies on it.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createLocalDatabase, IDS, USERS } from "./bootstrap.mjs";
import { makeJwt, startSupabaseShim } from "./supabase-shim.mjs";

const db = await createLocalDatabase();
const shim = await startSupabaseShim({ db, serviceKey: "service-key-local", anonKey: "anon-key-local", users: USERS });
try {
  const admin = createClient(shim.url, "service-key-local", { auth: { persistSession: false, autoRefreshToken: false } });
  const events = await admin.from("clinic_events").select("id,name,status").eq("partner_slug", "mvlp").order("starts_at", { ascending: true });
  assert.equal(events.error, null, JSON.stringify(events.error));
  assert.equal(events.data.length, 2);
  const one = await admin.from("clinic_events").select("*").eq("id", IDS.eventLegalAid).maybeSingle();
  assert.equal(one.data.public_slug, "mvlp-training-clinic");
  const none = await admin.from("clinic_events").select("*").eq("id", "00000000-0000-4000-8000-000000000000").maybeSingle();
  assert.equal(none.error, null); assert.equal(none.data, null);
  const count = await admin.from("clinic_events").select("id", { count: "exact", head: true }).eq("partner_slug", "mvlp").in("status", ["draft", "published"]);
  assert.equal(count.count, 2);
  const scalar = await admin.rpc("legal_aid_prepare_policy_profile", { p_actor_user_id: IDS.admin, p_partner_slug: "mvlp", p_intake_schema_version: "mvlp-intake-v1", p_profile: { a: 1 } });
  assert.equal(scalar.error, null, JSON.stringify(scalar.error)); assert.match(String(scalar.data), /^[0-9a-f-]{36}$/);
  const approved = await admin.rpc("legal_aid_approve_policy_profile", { p_actor_user_id: IDS.admin2, p_profile_id: scalar.data, p_note: null });
  assert.equal(approved.data, "approved");
  const table = await admin.rpc("legal_aid_register", { p_event_id: IDS.eventLegalAid, p_participant_user_id: IDS.applicant, p_participant_pseudonym: "a".repeat(64), p_idempotency_key: "k-1", p_contact_name: "Test", p_contact_email: "t@example.net", p_contact_phone: null, p_preferred_contact: "email", p_language_preference: null, p_assistance_needs: null, p_source: "public_web", p_assisted_by_event_staff_id: null });
  assert.equal(table.error, null, JSON.stringify(table.error)); assert.ok(Array.isArray(table.data)); assert.equal(table.data[0].outcome, "event_unavailable");
  const insert = await admin.from("participant_account_tombstones").insert({ user_id: IDS.secondApplicant, restoration_barrier: false }).select("*");
  assert.equal(insert.error?.code, "42501", "service_role has no insert grant on the stub table, so the shim must surface the database refusal");
  const blocked = await admin.rpc("participant_account_is_blocked", { p_user_id: IDS.applicant });
  assert.equal(blocked.data, false);
  const user = createClient(shim.url, "anon-key-local", { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${makeJwt({ sub: IDS.applicant, email: "applicant@example.net" })}` } } });
  const me = await user.auth.getUser(makeJwt({ sub: IDS.applicant, email: "applicant@example.net" }));
  assert.equal(me.data.user.email, "applicant@example.net");
  const denied = await user.from("legal_aid_restricted_fields").select("*");
  assert.ok(denied.error, "browser role must not read ciphertext");
  const storage = admin.storage.from("rcap-legal-aid-private");
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3]);
  const up = await storage.upload("legal-aid/x/other/a.pdf", bytes, { contentType: "application/pdf", upsert: false });
  assert.equal(up.error, null, JSON.stringify(up.error));
  const dup = await storage.upload("legal-aid/x/other/a.pdf", bytes, { contentType: "application/pdf", upsert: false });
  assert.ok(dup.error, "second write to the same key must be refused");
  const down = await storage.download("legal-aid/x/other/a.pdf");
  assert.equal(down.error, null, JSON.stringify(down.error)); assert.equal(new Uint8Array(await down.data.arrayBuffer()).length, 8);
  const rm = await storage.remove(["legal-aid/x/other/a.pdf"]);
  assert.equal(rm.error, null);
  console.log("local Supabase shim self-test passed", shim.url);
} finally {
  await shim.close();
  await db.close();
}
