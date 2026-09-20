// Project the corrected host onto the stored census, without rendering anything.
//
// S2 may not re-render, so the fleet audit cannot move on its own. This applies
// the host's own corrected emission logic to each family's already-captured
// census and field map, writes the projected maps into a mirror of the overlay
// tree, and lets the real completeness verifier read them. It is what P1, P3 and
// P4 should expect the audit to say once they re-render against the corrected
// host.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  chargeRowOrdinals, printedContextOf, completenessDispositionOf, electionDispositionOf,
  withCompletenessDisposition, flatRefusalRow, dispositionRowsFor, requiredBeforeFilingItems
} from "../../../../scripts/build-census-v1-ne-setaside-custodial-set.mjs";
import { regionProtectCategoryOf, protectCategoryOf } from "../../../../scripts/rcap-official-forms/rcap-field-semantics.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const MIRROR = process.env.S2_PROJECTION_MIRROR ?? "/tmp/s2/proj";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

const dirs = [];
for (const state of fs.readdirSync(path.join(REPO, OVERLAYS))) {
  for (const entry of fs.readdirSync(path.join(REPO, OVERLAYS, state))) {
    const dir = path.join(REPO, OVERLAYS, state, entry);
    if (!fs.existsSync(path.join(dir, "production-field-map.json"))) continue;
    if (!fs.existsSync(path.join(dir, "field-census.census-v1.json"))) continue;
    dirs.push({ dir, rel: `${state}/${entry}` });
  }
}

const CLOSURE = new Set(process.argv.slice(2));
let projected = 0;

for (const { dir, rel } of dirs) {
  const map = read(path.join(dir, "production-field-map.json"));
  if (map.schemaVersion !== "rcap-official-form-field-map/v1-census-v1") continue;
  if (CLOSURE.size && !CLOSURE.has(map.familyId)) continue;
  const census = read(path.join(dir, "field-census.census-v1.json"));
  const routeKey = (map.routeKeys ?? [])[0] ?? null;

  const maps = map.maps.map((m) => {
    const doc = census.documents.find((d) => d.formNumber === m.formNumber);
    if (!doc) return m;
    const policy = { ...(m.documentPolicy ?? {}), routeKey };
    const acro = doc.structuralClass === "acroform";
    const blanks = acro ? [] : doc.fields.filter((f) => f.blankId);
    const item = {
      policy,
      census: acro
        ? { structuralClass: "acroform", fields: doc.fields }
        : { structuralClass: "flat_pdf", blanks, selectionControls: doc.selectionControls ?? [] },
      policyData: { anchors: m.offeredAnchors ?? [] }
    };
    const canonical = dispositionRowsFor(item, { written: m.canonicalWrites ?? [], refused: m.canonicalRefusals ?? [] });
    const boundary = dispositionRowsFor(item, { written: m.boundaryWrites ?? [], refused: m.boundaryRefusals ?? [] });

    let roleRefusals; let selectionControls;
    if (acro) {
      const byName = new Map(doc.fields.map((f) => [f.name, f]));
      const rowOrdinals = chargeRowOrdinals(doc.fields.map((f) => f.name));
      const contextOf = (f) => ({
        printedLabel: f.effectiveLabel ?? null,
        sectionHeading: f.regionHeading ?? null,
        rowOrdinal: rowOrdinals.get(f.name) ?? null,
        page: f.widgets?.[0]?.page ?? null
      });
      roleRefusals = (m.roleRefusals ?? []).map((row) => {
        const f = byName.get(row.field);
        if (!f) return row;
        const context = contextOf(f);
        return withCompletenessDisposition(row, {
          ...context,
          disposition: completenessDispositionOf({
            printedContext: printedContextOf(context), fieldName: f.name,
            protectCategory: f.protectCategory ?? null,
            regionProtectCategory: regionProtectCategoryOf(f.regionHeading),
            documentAcceptsFill: policy.documentAcceptsFill, documentPolicyReason: policy.reason ?? null
          })
        });
      });
      selectionControls = (m.selectionControls ?? []).map((control) => {
        const f = byName.get(control.field) ?? { name: control.field };
        const context = contextOf(f);
        return withCompletenessDisposition({ ...control, disposition: "explicit_refusal" }, {
          ...context,
          disposition: electionDispositionOf({
            printedContext: printedContextOf(context), fieldName: control.field,
            protectCategory: f.protectCategory ?? null,
            regionProtectCategory: regionProtectCategoryOf(f.regionHeading), routeKey
          })
        });
      });
    } else {
      const blankById = new Map(blanks.map((b) => [b.blankId, b]));
      const controlDisposition = (control) => {
        const context = {
          printedLabel: control.label ?? null, sectionHeading: null, rowOrdinal: null,
          page: control.page ?? null, identity: control.label ?? control.selectionId
        };
        const shared = {
          printedContext: printedContextOf(context), fieldName: control.selectionId,
          protectCategory: protectCategoryOf(control.label ?? "") ?? null, regionProtectCategory: null
        };
        const disposition = control.kind === "selection_control"
          ? electionDispositionOf({ ...shared, routeKey })
          : completenessDispositionOf({ ...shared, documentAcceptsFill: policy.documentAcceptsFill, documentPolicyReason: policy.reason ?? null });
        return withCompletenessDisposition({ ...control }, { ...context, disposition });
      };
      roleRefusals = (m.roleRefusals ?? []).map((row) => {
        if (row.blankId && blankById.has(row.blankId)) return flatRefusalRow(row, blankById.get(row.blankId), policy);
        if (row.selectionId) return controlDisposition(row);
        return row;
      });
      selectionControls = (m.selectionControls ?? []).map(controlDisposition);
    }
    return {
      ...m,
      canonicalWrites: canonical.written, canonicalRefusals: canonical.refused,
      boundaryWrites: boundary.written, boundaryRefusals: boundary.refused,
      roleRefusals, selectionControls
    };
  });

  const requiredBeforeFiling = requiredBeforeFilingItems(maps);
  const out = path.join(MIRROR, OVERLAYS, rel);
  // replace the symlinked family with a real directory whose files symlink back,
  // except the projected map
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    if (entry === "production-field-map.json") continue;
    fs.symlinkSync(path.join(dir, entry), path.join(out, entry));
  }
  fs.writeFileSync(path.join(out, "production-field-map.json"),
    `${JSON.stringify({ ...map, requiredBeforeFilingCount: requiredBeforeFiling.length, requiredBeforeFiling, maps }, null, 2)}\n`);
  projected += 1;
}
console.log(`projected ${projected} famil(ies)`);
