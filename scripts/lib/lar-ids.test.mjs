import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { LAR_ID_FLOOR, larIdRegistry, larKey } from "./lar-ids.mjs";

const item = (routeId, exactMissingItem = "official form") =>
  ({ jurisdiction: "ZZ", routeId, missingItemType: "official_form", exactMissingItem, status: "open" });
const run = (factory, committed, items) => {
  const registry = factory(committed);
  const open = items.map((entry) => ({ ...entry, id: registry.idFor(entry) }));
  return { items: open, resolvedItems: registry.resolvedItems() };
};
const idsByRoute = (report) => Object.fromEntries(report.items.map((entry) => [entry.routeId, entry.id]));

// The properties the generator relies on; a registry that numbers in iteration order must fail them.
function stableIdProperties(factory) {
  const first = run(factory, {}, ["a", "b", "c", "d"].map((route) => item(route)));
  const base = Number(first.items[0].id.slice(4));
  const id = (offset) => `LAR-${String(base + offset).padStart(3, "0")}`;
  assert.deepEqual(idsByRoute(first), { a: id(0), b: id(1), c: id(2), d: id(3) });
  assert.deepEqual(run(factory, first, first.items).items, first.items, "a second run over its own output is a fixed point");
  const removed = run(factory, first, ["a", "c", "d"].map((route) => item(route)));
  assert.deepEqual(idsByRoute(removed), { a: id(0), c: id(2), d: id(3) }, "removing a route keeps every other id");
  assert.deepEqual(removed.resolvedItems.map((entry) => [entry.id, entry.status]), [[id(1), "resolved"]]);
  const added = run(factory, removed, ["a", "x", "c", "d"].map((route) => item(route)));
  assert.deepEqual(idsByRoute(added), { a: id(0), x: id(4), c: id(2), d: id(3) }, "a new key takes the next unissued id, never the resolved one");
  assert.deepEqual(added.resolvedItems.map((entry) => entry.id), [id(1)], "resolved items persist across runs");
  const reopened = run(factory, added, ["a", "b", "x", "c", "d"].map((route) => item(route)));
  assert.equal(idsByRoute(reopened).b, id(1), "a reopened key gets its own id back");
  assert.deepEqual(reopened.resolvedItems, []);
  const topRemoved = run(factory, first, ["a", "b", "c"].map((route) => item(route)));
  const afterTop = run(factory, topRemoved, ["a", "b", "c", "y"].map((route) => item(route)));
  assert.equal(idsByRoute(afterTop).y, id(4), "the resolved highest id is never reissued");
  const changed = run(factory, first, [item("a"), item("b", "certified disposition"), item("c"), item("d")]);
  assert.equal(idsByRoute(changed).b, id(4), "a changed missing item is a new key");
  assert.deepEqual(changed.resolvedItems.map((entry) => entry.id), [id(1)]);
}

test("content-keyed LAR ids are stable, append-only and never reused", () => stableIdProperties(larIdRegistry));

test("a new key never takes a number the old sequential scheme issued (LAR-001..LAR-197)", () => {
  assert.equal(LAR_ID_FLOOR, 198);
  assert.equal(run(larIdRegistry, {}, [item("a")]).items[0].id, "LAR-198");
  const committed = { items: [{ ...item("a"), id: "LAR-001" }, { ...item("b"), id: "LAR-152" }] };
  const next = run(larIdRegistry, committed, [item("a"), item("b"), item("c")]);
  assert.deepEqual(idsByRoute(next), { a: "LAR-001", b: "LAR-152", c: "LAR-198" }, "held ids stay; the new key starts at the floor");
  assert.equal(run(larIdRegistry, { items: [{ ...item("a"), id: "LAR-250" }] }, [item("a"), item("c")]).items[1].id, "LAR-251");
});

test("mutant: sequential numbering fails the stability properties", () => {
  const sequential = () => { let seq = 0; return { idFor: () => `LAR-${String(++seq).padStart(3, "0")}`, resolvedItems: () => [] }; };
  assert.throws(() => stableIdProperties(sequential), /removing a route keeps every other id/);
});

test("the registry refuses ambiguous input", () => {
  assert.throws(() => run(larIdRegistry, {}, [item("a"), item("a")]), /opened twice/);
  assert.throws(() => larIdRegistry({ items: [{ ...item("a"), id: "LAR-001" }, { ...item("b"), id: "LAR-001" }] }), /names two content keys/);
  assert.throws(() => larIdRegistry({ items: [{ ...item("a"), id: "LAR-001" }], resolvedItems: [{ ...item("a"), id: "LAR-002" }] }), /holds two ids/);
  assert.throws(() => larIdRegistry({ items: [{ ...item("a"), id: "L-1" }] }), /malformed/);
});

test("the committed Legal Action Required report is a valid id registry", () => {
  const committed = JSON.parse(fs.readFileSync("data/expungement-ai/reports/legal-action-required.json", "utf8"));
  const again = run(larIdRegistry, committed, committed.items);
  assert.deepEqual(again.items.map((entry) => entry.id), committed.items.map((entry) => entry.id));
  assert.deepEqual(again.resolvedItems, committed.resolvedItems ?? []);
  assert.equal(new Set(committed.items.map(larKey)).size, committed.items.length);
});
