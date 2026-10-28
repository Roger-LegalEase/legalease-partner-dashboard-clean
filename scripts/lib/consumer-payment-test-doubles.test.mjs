import test from "node:test";
import assert from "node:assert/strict";
import { startEphemeralPg } from "./rcap-ephemeral-pg.mjs";
import { bindEphemeralDb, getSupabaseAdminClient } from "./consumer-payment-test-doubles.mjs";

test("PostgREST boolean scalars retain false/true and table results stay arrays", async () => {
  const db = startEphemeralPg();
  try {
    db.sql(`create role service_role nologin bypassrls;
      create function public.scalar_policy(p_allowed boolean) returns boolean language sql as $$ select p_allowed $$;
      create function public.table_policy(p_allowed boolean) returns table(allowed boolean) language sql as $$ select p_allowed $$;`);
    bindEphemeralDb(db);
    const client = getSupabaseAdminClient();
    for (const p_allowed of [false, true]) {
      assert.deepEqual(await client.rpc("scalar_policy", { p_allowed }), { data: p_allowed, error: null });
      assert.deepEqual(await client.rpc("table_policy", { p_allowed }), { data: [{ allowed: p_allowed }], error: null });
    }
  } finally { bindEphemeralDb(null); db.stop(); }
});
