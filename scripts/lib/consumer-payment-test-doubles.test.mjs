import test from "node:test";
import assert from "node:assert/strict";
import { startEphemeralPg } from "./rcap-ephemeral-pg.mjs";
import { bindEphemeralDb, getSupabaseAdminClient } from "./consumer-payment-test-doubles.mjs";

test("PostgREST scalars, typed JSON arrays and bounded table results retain provider shapes", async () => {
  const db = startEphemeralPg();
  try {
    db.sql(`create role service_role nologin bypassrls;
      create table public.fixture_ordering(id integer);
      create table public.fixture_arrays(json_values jsonb, text_values text[]);
      grant select,insert,update on fixture_arrays to service_role;
      insert into fixture_ordering values (1),(2);
      grant select on fixture_ordering to service_role;
      create function public.scalar_count() returns integer language sql as $$ select 42 $$;
      create function public.scalar_text() returns text language sql as $$ select 'isolated'::text $$;
      create function public.scalar_policy(p_allowed boolean) returns boolean language sql as $$ select p_allowed $$;
      create function public.table_policy(p_allowed boolean) returns table(allowed boolean) language sql as $$ select p_allowed $$;`);
    bindEphemeralDb(db);
    const client = getSupabaseAdminClient();
    assert.deepEqual(await client.from("fixture_ordering").select("id").order("id", { ascending: false }).limit(1), { data: [{ id: 2 }], error: null });
    assert.deepEqual(await client.from("fixture_ordering").select("id").limit(0), { data: [], error: null });
    assert.throws(() => client.from("fixture_ordering").select("id").limit(-1), /nonnegative integer/);
    assert.deepEqual(await client.rpc("scalar_count", {}), { data: 42, error: null });
    assert.deepEqual(await client.rpc("scalar_text", {}), { data: "isolated", error: null });
    const values = { json_values: ["next step", { answer: "synthetic" }], text_values: ["scope"] };
    const inserted = await client.from("fixture_arrays").insert(values).select("*").single();
    assert.deepEqual(inserted, { data: values, error: null });
    assert.deepEqual(await client.from("fixture_arrays").update({ json_values: [], text_values: [] }).select("*").single(),
      { data: { json_values: [], text_values: [] }, error: null });
    for (const p_allowed of [false, true]) {
      assert.deepEqual(await client.rpc("scalar_policy", { p_allowed }), { data: p_allowed, error: null });
      assert.deepEqual(await client.rpc("table_policy", { p_allowed }), { data: [{ allowed: p_allowed }], error: null });
    }
  } finally { bindEphemeralDb(null); db.stop(); }
});
