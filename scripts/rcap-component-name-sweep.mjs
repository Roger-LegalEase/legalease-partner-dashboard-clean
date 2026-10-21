#!/usr/bin/env node
/**
 * Sweep COMPONENT_SET by NAME, not by ordinal.
 *
 * A required component can go missing without leaving a gap in the ordinals,
 * because a surviving component slides into the vacated number. West Virginia
 * and Mississippi both did this: the registry declares five components ending
 * `attachment-4` and `instructions-5`, the packet renders four and names the
 * fourth `filing-instructions-4`, and the rendered ordinals read 1,2,3,4 --
 * unique and contiguous. An ordinal sweep measures the disguise and calls the
 * family clean. This one compares names.
 *
 * Declared names: packetSet.components[].componentId in
 * data/record-clearing/legal-design-track-registry.json.
 * Rendered names: componentSet in each family's reports/rendered-artifacts.json.
 *
 * THE UNIT IS THE TRACK, NOT THE FAMILY.
 *
 * A first cut compared each family against the tracks it renders and put Texas
 * at the top of the failing list with 29 components absent. It has none.
 * rcap-tx-custom-pleading is a fee-waiver-only family: it declares
 * servesComponentIdsInOtherPacketSets and renders exactly the fee-waiver
 * component of eight expunction packet sets, whose petitions and orders other
 * families render. Measured family by family, every component it does not
 * render reads as absent, which is a defect of the question rather than of
 * Texas. So a declared component is absent only when NO family anywhere renders
 * that name -- the rendered set is unioned across all 288 families first, and
 * cross-serving costs nothing.
 *
 * Attribution is by name: a rendered component belongs to the longest registry
 * trackId that prefixes it on a hyphen boundary. That boundary is what stops
 * ms-nonadj from swallowing ms-nonadjudication-under-99-15-26.
 *
 * Populations, kept apart on purpose:
 *
 *   MISSING_COMPONENTS    the track renders fewer components than the registry
 *                         declares. The deficit is how many are genuinely gone.
 *                         This is the failing population.
 *   NAME_DIVERGENCE_ONLY  counts agree and some names differ -- a renamed slot,
 *                         e.g. the registry's `process-guidance-3` rendered as
 *                         `filing-instructions-3`. Nothing absent by count.
 *   CLEAN                 declared and rendered names match exactly.
 *   NOT_MEASURABLE_HERE   no comparison is possible. NOT a pass.
 *
 * Folding the second into the first inflates the count with renames; folding it
 * into CLEAN hides one. This measures. It writes no verdict and repairs nothing.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const flag = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const COMMIT = flag("--commit") ?? "HEAD";
const OUT = path.resolve(ROOT, flag("--out") ?? "data/rcap-grade-a/component-set-sweep/COMPONENT_NAME_SWEEP.json");
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const git = (...a) => execFileSync("git", a, { cwd: ROOT, maxBuffer: 1 << 30 }).toString();

/* ---- what the registry declares ---- */
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, REGISTRY), "utf8"));
const tracks = new Map();
for (const t of registry.tracks ?? []) {
  tracks.set(t.trackId, {
    trackId: t.trackId, jurisdiction: t.jurisdiction,
    packetSetId: t.packetSet?.packetSetId ?? null,
    declared: (t.packetSet?.components ?? []).map((c) => c.componentId).filter(Boolean)
  });
}
const trackIds = [...tracks.keys()].sort((a, b) => b.length - a.length);
const attribute = (name) => trackIds.find((id) => name === id || name.startsWith(`${id}-`)) ?? null;

/* ---- what the packets actually render ---- */
const familyPaths = git("ls-tree", "-r", "--name-only", COMMIT)
  .split("\n").filter((l) => l.endsWith("/reports/rendered-artifacts.json")).sort();

const families = [];
const renderedByTrack = new Map(); // trackId -> Map(componentName -> [familyId])
for (const rel of familyPaths) {
  let doc;
  try { doc = JSON.parse(git("show", `${COMMIT}:${rel}`)); }
  catch (e) { families.push({ path: rel, familyId: null, result: "UNREADABLE", why: String(e.message).split("\n")[0] }); continue; }
  const familyId = doc.familyId ?? null;
  if (doc.componentSet === undefined || doc.componentSet === null) {
    families.push({
      path: rel, familyId, result: "NOT_MEASURABLE_HERE", reason: "NO_COMPONENT_SET_IN_REPORT",
      why: "reports/rendered-artifacts.json names no components at all, so there are no rendered names to compare. Nothing is claimed about this family either way.",
      reportKeys: Object.keys(doc)
    });
    continue;
  }
  // componentSet is a list of names in most families and of component objects
  // in one (Vermont's seal-pardon set); read a name out of either.
  const rendered = (Array.isArray(doc.componentSet) ? doc.componentSet : [])
    .map((c) => (typeof c === "string" ? c : c?.componentId)).filter((c) => typeof c === "string");
  const attributed = [], unattributed = [];
  for (const name of rendered) {
    const id = attribute(name);
    if (!id) { unattributed.push(name); continue; }
    attributed.push({ name, trackId: id });
    if (!renderedByTrack.has(id)) renderedByTrack.set(id, new Map());
    const m = renderedByTrack.get(id);
    if (!m.has(name)) m.set(name, []);
    m.get(name).push(familyId ?? rel);
  }
  families.push({
    path: rel, familyId, renderedComponents: rendered,
    tracksRendered: [...new Set(attributed.map((a) => a.trackId))],
    unattributedComponents: unattributed,
    servesComponentIdsInOtherPacketSets: doc.servesComponentIdsInOtherPacketSets ?? null,
    result: null
  });
}

/* ---- the comparison, per track, against the union of every family ---- */
const trackRows = [];
for (const id of [...tracks.keys()]) {
  const t = tracks.get(id);
  const m = renderedByTrack.get(id);
  if (!m || m.size === 0) {
    trackRows.push({
      ...t, result: "NOT_MEASURABLE_HERE", reason: "NO_FAMILY_RENDERS_THIS_TRACK",
      why: "no rendered-artifacts.json anywhere names a component of this track, so there is nothing to compare its declared names against. Not clean -- unmeasured.",
      declaredComponentNames: t.declared, renderedComponentNames: [], renderedBy: []
    });
    continue;
  }
  const renderedNames = [...m.keys()];
  const declaredNotRendered = t.declared.filter((n) => !m.has(n));
  const renderedNotDeclared = renderedNames.filter((n) => !t.declared.includes(n));
  const deficit = t.declared.length - renderedNames.length;
  const result = deficit > 0 ? "MISSING_COMPONENTS"
    : (declaredNotRendered.length === 0 && renderedNotDeclared.length === 0) ? "CLEAN" : "NAME_DIVERGENCE_ONLY";
  /* Two different shapes hide behind one deficit, and the fix for them is not
   * the same, so name them mechanically rather than by eye.
   *
   * ORDINAL_COLLISION -- something absent AND a rendered name the registry never
   * declared. That undeclared name is the component that slid into the vacated
   * ordinal: Mississippi's `filing-instructions-4` sitting where `attachment-4`
   * should be, so 1,2,3,4 reads contiguous. This is the disguise the ordinal
   * sweep could not see.
   *
   * NOT_RENDERED_AT_ALL -- something absent and every rendered name declared.
   * Nothing took the ordinal; the components were simply never built. Texas's
   * eight expunction sets are this: only the shared fee-waiver component of each
   * exists anywhere in the corpus. */
  const signature = deficit <= 0 ? null
    : renderedNotDeclared.length > 0 ? "ORDINAL_COLLISION" : "NOT_RENDERED_AT_ALL";
  trackRows.push({
    ...t, result, signature,
    declaredCount: t.declared.length, renderedCount: renderedNames.length,
    componentsAbsentByCount: Math.max(0, deficit),
    declaredComponentNames: t.declared, renderedComponentNames: renderedNames,
    declaredNotRendered, renderedNotDeclared,
    renderedBy: [...new Set([...m.values()].flat())]
  });
}

/* ---- roll the track result back up to the families that render the track ---- */
const trackById = new Map(trackRows.map((r) => [r.trackId, r]));
for (const f of families) {
  if (f.result) continue;
  const rs = f.tracksRendered.map((id) => trackById.get(id));
  if (rs.length === 0) {
    f.result = "NOT_MEASURABLE_HERE";
    f.reason = f.renderedComponents.length === 0 ? "COMPONENT_SET_IS_EMPTY" : "NO_REGISTRY_TRACK_FOR_THIS_FAMILY";
    f.why = f.renderedComponents.length === 0
      ? "the report carries a componentSet with nothing in it"
      : "no rendered component name attributes to any registry trackId, so this family has no registry track to be measured against. Not clean -- unmeasured.";
    continue;
  }
  f.result = rs.some((r) => r.result === "MISSING_COMPONENTS") ? "MISSING_COMPONENTS"
    : rs.some((r) => r.result === "NAME_DIVERGENCE_ONLY") ? "NAME_DIVERGENCE_ONLY" : "CLEAN";
  f.tracks = rs.map((r) => ({
    trackId: r.trackId, result: r.result,
    signature: r.signature ?? null,
    componentsAbsentByCount: r.componentsAbsentByCount ?? 0,
    declaredComponentNames: r.declaredComponentNames,
    renderedComponentNames: r.renderedComponentNames,
    declaredNotRendered: r.declaredNotRendered ?? [],
    renderedBy: r.renderedBy
  }));
}

const byResult = (arr, r) => arr.filter((x) => x.result === r);
const reasons = (arr) => byResult(arr, "NOT_MEASURABLE_HERE")
  .reduce((m, r) => { m[r.reason] = (m[r.reason] ?? 0) + 1; return m; }, {});

const ms = trackRows.filter((r) => r.jurisdiction === "MS" && ["ms-drug-cd", "ms-dui", "ms-mip"].includes(r.trackId));
const wv = trackRows.find((r) => r.trackId === "wv_drug_conditional_discharge");
const doc = {
  schemaVersion: "rcap-component-name-sweep/v2",
  generatedBy: "KSRAS / fable/ksras",
  sweptAtCommit: git("rev-parse", COMMIT).trim(),
  registry: REGISTRY,
  unitOfMeasurement: "the registry track. A declared component is absent only when no family anywhere renders that name; the rendered set is unioned across every family first, so a family that serves one component of another packet set is not read as having lost the rest.",
  whyNotOrdinals: "a surviving component takes the absent one's ordinal, so 1,2,3,4 reads unique and contiguous while a declared component is gone. An ordinal sweep measures the disguise.",
  populations: {
    MISSING_COMPONENTS: "the track renders fewer components than the registry declares; the deficit is genuinely absent",
    NAME_DIVERGENCE_ONLY: "counts agree, some names differ; a renamed slot, nothing absent by count",
    CLEAN: "declared and rendered names match exactly",
    NOT_MEASURABLE_HERE: "no comparison is possible. NOT a pass"
  },
  counts: {
    tracksInRegistry: trackRows.length,
    tracks: {
      MISSING_COMPONENTS: byResult(trackRows, "MISSING_COMPONENTS").length,
      NAME_DIVERGENCE_ONLY: byResult(trackRows, "NAME_DIVERGENCE_ONLY").length,
      CLEAN: byResult(trackRows, "CLEAN").length,
      NOT_MEASURABLE_HERE: byResult(trackRows, "NOT_MEASURABLE_HERE").length,
      notMeasurableByReason: reasons(trackRows),
      missingBySignature: byResult(trackRows, "MISSING_COMPONENTS")
        .reduce((m, r) => { m[r.signature] = (m[r.signature] ?? 0) + 1; return m; }, {})
    },
    familiesSwept: families.length,
    families: {
      MISSING_COMPONENTS: byResult(families, "MISSING_COMPONENTS").length,
      NAME_DIVERGENCE_ONLY: byResult(families, "NAME_DIVERGENCE_ONLY").length,
      CLEAN: byResult(families, "CLEAN").length,
      NOT_MEASURABLE_HERE: byResult(families, "NOT_MEASURABLE_HERE").length,
      UNREADABLE: byResult(families, "UNREADABLE").length,
      notMeasurableByReason: reasons(families),
      notMeasurableRuntimeOnlyRoutes: byResult(families, "NOT_MEASURABLE_HERE")
        .filter((f) => /runtime-only/.test(f.path) || /runtime-only/.test(String(f.familyId))).length
    },
    componentsAbsentTotal: trackRows.reduce((n, r) => n + (r.componentsAbsentByCount ?? 0), 0)
  },
  knownInstanceControls: {
    why: "a sweep that cannot reproduce its known instances has a count that means nothing",
    mississippi: {
      expected: "MISSING_COMPONENTS on the three tracks rcap-ms-custom-pleading renders, 3 components absent in total",
      observed: ms.map((r) => ({ trackId: r.trackId, result: r.result, componentsAbsentByCount: r.componentsAbsentByCount, declaredNotRendered: r.declaredNotRendered })),
      componentsAbsentTotal: ms.reduce((n, r) => n + (r.componentsAbsentByCount ?? 0), 0),
      reproduced: ms.length === 3 && ms.every((r) => r.result === "MISSING_COMPONENTS") && ms.reduce((n, r) => n + (r.componentsAbsentByCount ?? 0), 0) === 3
    },
    westVirginia: {
      expected: "CLEAN on wv_drug_conditional_discharge, the track rcap-wv-custom-pleading renders; it was repaired",
      observed: wv ? { trackId: wv.trackId, result: wv.result, componentsAbsentByCount: wv.componentsAbsentByCount } : "NOT FOUND",
      reproduced: wv?.result === "CLEAN"
    }
  },
  whatThisDoesNotDecide: "This is a measurement. It promotes nothing, opens no route, writes no verdict, flips no queue row, and does not itself repair a packet.",
  tracks: trackRows,
  families
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`tracks: MISSING ${doc.counts.tracks.MISSING_COMPONENTS}, DIVERGENCE ${doc.counts.tracks.NAME_DIVERGENCE_ONLY}, CLEAN ${doc.counts.tracks.CLEAN}, NOT_MEASURABLE ${doc.counts.tracks.NOT_MEASURABLE_HERE} of ${doc.counts.tracksInRegistry}`);
console.log(`families: MISSING ${doc.counts.families.MISSING_COMPONENTS}, DIVERGENCE ${doc.counts.families.NAME_DIVERGENCE_ONLY}, CLEAN ${doc.counts.families.CLEAN}, NOT_MEASURABLE ${doc.counts.families.NOT_MEASURABLE_HERE} of ${doc.counts.familiesSwept}`);
console.log(`components absent: ${doc.counts.componentsAbsentTotal}`);
console.log(`controls: MS reproduced ${doc.knownInstanceControls.mississippi.reproduced} (${doc.knownInstanceControls.mississippi.componentsAbsentTotal} absent), WV reproduced ${doc.knownInstanceControls.westVirginia.reproduced}`);
