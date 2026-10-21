// Legal Action Required ids, keyed by content and append-only.
//
// audit-petition-route-inventory.mjs used to number items LAR-001.. in iteration order, so one added
// or removed route renumbered every later item and rewrote the ids in 100+ route-product-metadata rows.
// The committed legal-action-required.json is the id registry: an item keeps the id its content key
// already has; a new key gets the next number after every id ever issued (open or resolved); a key no
// longer generated moves to resolvedItems. An id is never given to a different key.

// The old sequential numbering issued LAR-001..LAR-197 (597afa8ab..6f46f2fab, 2026-07-01) to items that
// are not today's keys; a new key starts above every number it ever used, so none is reissued.
export const LAR_ID_FLOOR = 198;

export const larKey = (item) => [item.jurisdiction, item.routeId, item.missingItemType, item.exactMissingItem].join("␟");

const idNumber = (id) => {
  const match = /^LAR-(\d+)$/.exec(id);
  if (!match) throw new Error(`malformed Legal Action Required id: ${id}`);
  return Number(match[1]);
};

export function larIdRegistry(committed = {}) {
  const resolved = committed.resolvedItems ?? [], open = committed.items ?? [];
  const ids = new Map();
  for (const item of [...resolved, ...open]) {
    const key = larKey(item);
    if (ids.has(key) && ids.get(key) !== item.id) throw new Error(`content key holds two ids (${ids.get(key)}, ${item.id}): ${key}`);
    ids.set(key, item.id);
  }
  const numbers = [...ids.values()].map(idNumber);
  if (new Set(numbers).size !== numbers.length) throw new Error("one Legal Action Required id names two content keys");
  let next = Math.max(LAR_ID_FLOOR - 1, ...numbers) + 1;
  const issued = new Set();
  return {
    idFor(item) {
      const key = larKey(item);
      if (issued.has(key)) throw new Error(`Legal Action Required content key opened twice: ${key}`);
      issued.add(key);
      if (!ids.has(key)) ids.set(key, `LAR-${String(next++).padStart(3, "0")}`);
      return ids.get(key);
    },
    // Call after every idFor: what the committed registry held that this run no longer opens.
    resolvedItems() {
      return [
        ...resolved.filter((item) => !issued.has(larKey(item))),
        ...open.filter((item) => !issued.has(larKey(item)))
          .map((item) => ({ ...item, status: "resolved", dateResolved: "derived", resolutionNotes: "no longer generated as open" }))
      ];
    }
  };
}
