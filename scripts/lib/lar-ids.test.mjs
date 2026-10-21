import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { larIdRegistry, larKey } from "./lar-ids.mjs";

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
  assert.deepEqual(idsByRoute(first), { a: "LAR-001", b: "LAR-002", c: "LAR-003", d: "LAR-004" });
  assert.deepEqual(run(factory, first, first.items).items, first.items, "a second run over its own output is a fixed point");
  const removed = run(factory, first, ["a", "c", "d"].map((route) => item(route)));
  assert.deepEqual(idsByRoute(removed), { a: "LAR-001", c: "LAR-003", d: "LAR-004" }, "removing a route keeps every other id");
  assert.deepEqual(removed.resolvedItems.map((entry) => [entry.id, entry.status]), [["LAR-002", "resolved"]]);
  const added = run(factory, removed, ["a", "x", "c", "d"].map((route) => item(route)));
  assert.deepEqual(idsByRoute(added), { a: "LAR-001", x: "LAR-005", c: "LAR-003", d: "LAR-004" }, "a new key takes the next unissued id, never LAR-002");
  assert.deepEqual(added.resolvedItems.map((entry) => entry.id), ["LAR-002"], "resolved items persist across runs");
  const reopened = run(factory, added, ["a", "b", "x", "c", "d"].map((route) => item(route)));
  assert.equal(idsByRoute(reopened).b, "LAR-002", "a reopened key gets its own id back");
  assert.deepEqual(reopened.resolvedItems, []);
  const topRemoved = run(factory, first, ["a", "b", "c"].map((route) => item(route)));
  const afterTop = run(factory, topRemoved, ["a", "b", "c", "y"].map((route) => item(route)));
  assert.equal(idsByRoute(afterTop).y, "LAR-005", "the resolved highest id LAR-004 is never reissued");
  const changed = run(factory, first, [item("a"), item("b", "certified disposition"), item("c"), item("d")]);
  assert.equal(idsByRoute(changed).b, "LAR-005", "a changed missing item is a new key");
  assert.deepEqual(changed.resolvedItems.map((entry) => entry.id), ["LAR-002"]);
}

test("content-keyed LAR ids are stable, append-only and never reused", () => stableIdProperties(larIdRegistry));

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
