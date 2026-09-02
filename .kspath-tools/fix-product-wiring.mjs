/* Kansas product wiring, corrected.
 *
 * Two things were wrong and one thing has to move.
 *
 * 1. The top-level routeKey and routeKeys named the two SUPERSEDED track-only
 *    keys while binding.routeKeys in the same file named the current ones, so
 *    the record disagreed with itself about which routes it describes. The
 *    generator writes the top level once, at creation, and on a refresh rewrites
 *    only the binding and the component digests -- so the stale top level could
 *    never age out on its own. It is corrected here from MASTER_QUEUE.json,
 *    which is the same source the generator reads.
 *
 * 2. The component digest named the pre-label family assembly. The route line
 *    now prints the human label, so the assembly's bytes moved.
 *
 * Nothing else in the file is touched: the binding, the non-grants, the refusals
 * and the proposal are left exactly as the generator wrote them.
 */
import fs from "node:fs";
import crypto from "node:crypto";
const P = "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/product-wiring.json";
const w = JSON.parse(fs.readFileSync(P, "utf8"));
const master = JSON.parse(fs.readFileSync("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json", "utf8"));
const fam = master.families.find((f) => f.familyId === "rcap-ks-custom-pleading");
const built = JSON.parse(fs.readFileSync(`${fam.directory}/reports/rendered-artifacts.json`, "utf8"));
const before = { routeKey: w.routeKey, routeKeys: [...w.routeKeys] };

w.routeKey = fam.routeKeys[0];
w.routeKeys = [...fam.routeKeys];
if (JSON.stringify(w.routeKeys) !== JSON.stringify(w.binding.routeKeys)) {
  throw new Error("the corrected top level still disagrees with the binding");
}
/* The two names of a route, recorded where a route resolver reads. The key is
 * what binds; the label is what the packet page prints. Neither is derivable
 * from the other, so both are stated. */
w.routeLabels = built.routeLabels;
w.printedRouteLineCarriesTheLabelNotTheKey = true;

const repinned = [];
for (const c of w.proposedRepresentation?.components ?? []) {
  if (!c.file) continue;
  const actual = crypto.createHash("sha256").update(fs.readFileSync(c.file)).digest("hex");
  if (actual === c.sha256) continue;
  repinned.push({ componentId: c.componentId, file: c.file, was: c.sha256, now: actual });
  c.sha256 = actual;
}
w.correctedBy = {
  lane: "FIX03", branch: "fable/kspath",
  what: [
    `top-level routeKey ${before.routeKey} -> ${w.routeKey}`,
    ...before.routeKeys.map((k, i) => `top-level routeKeys[${i}] ${k} -> ${w.routeKeys[i]}`),
    ...repinned.map((r) => `${r.componentId} sha256 ${r.was} -> ${r.now}`)
  ],
  why: "the top level named the superseded track-only keys the census no longer carries, and the component digest named the pre-label bytes",
  authorityCreated: "none"
};
fs.writeFileSync(P, `${JSON.stringify(w, null, 2)}\n`);
console.log(JSON.stringify({ before, after: { routeKey: w.routeKey, routeKeys: w.routeKeys }, repinned, acceptanceReceipt: w.binding.acceptanceReceipt }, null, 2));
