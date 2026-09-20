#!/usr/bin/env node
// Add only governed adopted upload bodies to the runtime corpus index.
// A full inventory walk would replace historical custody records in this
// partially recovered checkout. Existing entries are deliberately preserved.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadUserSourceAdoption, USER_SOURCE_ADOPTION_PATH } from "./user-source-adoption.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const indexPath = path.join(root, "data/rcap-all50/local-source-corpus-index.json");
const custodyId = "user_upload_adopted_20260911";
const custodyRoot = "private/source-imports/user-upload-20260911";
const adoption = loadUserSourceAdoption(root); // Rehashes every adopted source.
const sources = adoption.sources.filter((s) => s.heldCorpusPath.startsWith(`${custodyRoot}/`));
assert.equal(new Set(sources.map((s) => s.sha256)).size, sources.length);
const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const master = JSON.parse(fs.readFileSync(path.join(root, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"), "utf8"));
const states = new Map(master.families.map((f) => [f.familyId, f.jurisdiction]));
const structures = JSON.parse(execFileSync(process.env.RCAP_PIKEPDF_PYTHON ?? process.env.PYTHON ?? "python3", ["-c", `
import json,sys,pikepdf
out=[]
for filename in sys.argv[1:]:
 with pikepdf.open(filename) as pdf:
  acro=pdf.Root.get('/AcroForm')
  def count(fields):
   return sum(count(f['/Kids']) if '/Kids' in f and any('/T' in k for k in f['/Kids']) else 1 for f in fields)
  out.append(dict(pageCount=len(pdf.pages),acroFormPresent=acro is not None,
   acroFieldCount=count(acro.get('/Fields',[])) if acro is not None else 0,
   xfaPresent=acro is not None and '/XFA' in acro))
print(json.dumps(out))
`, ...sources.map((s) => path.join(root, s.heldCorpusPath))], { encoding: "utf8" }));
const additions = sources.map((s, i) => ({
  path: s.heldCorpusPath, custody: custodyId,
  custodyType: "GOVERNED_ADOPTED_USER_UPLOAD_PARTIAL",
  fileName: path.basename(s.heldCorpusPath),
  state: states.get(s.familyIds[0]),
  assetClass: s.sourceRole === "official-form" ? "FORM" : "AUTHORITY",
  formNumber: s.sourceRole === "official-form" ? s.sourceId.replace("official-form:", "") : null,
  revision: s.printedRevision ?? null, language: "EN",
  byteLength: s.byteLength, sha256: s.sha256, assetFormat: "pdf",
  ...structures[i],
  structuralClassObserved: structures[i].xfaPresent ? "xfa" : structures[i].acroFieldCount > 0 ? "acroform" : "flat_pdf",
  structureReadBy: "pikepdf", loadError: null,
  adoptionEvidence: USER_SOURCE_ADOPTION_PATH,
  sourceId: s.sourceId,
}));
const existing = index.entries.filter((e) => e.custody !== custodyId);
assert.ok(additions.every((a) => !existing.some((e) => e.path === a.path)), "adopted paths must not collide with historical custody");
index.entries = [...existing, ...additions];
index.custodies = [...index.custodies.filter((c) => c.id !== custodyId), {
  id: custodyId, root: custodyRoot, pathsRelativeTo: "repositoryRoot",
  describes: `Only adopted, exact-hash source bodies from ${USER_SOURCE_ADOPTION_PATH}; rejected or stale uploads are excluded.`,
  custodyType: "GOVERNED_ADOPTED_USER_UPLOAD_PARTIAL", completeOperationalCorpus: false,
  binariesIndexed: additions.length, pdfsIndexed: additions.length,
}];
const counts = (key) => index.entries.reduce((out, e) => {
  const value = e[key] ?? "unknown"; out[value] = (out[value] ?? 0) + 1; return out;
}, {});
index.byState = counts("state");
Object.assign(index.totals, { binariesIndexed: index.entries.length, pdfsIndexed: index.entries.length,
  byAssetFormat: counts("assetFormat"), byCustody: counts("custody"),
  byStructure: counts("structuralClassObserved"), statesRepresented: Object.keys(index.byState).length });
index.userUploadAdoption = { generatedBy: "scripts/grade-a-packet-factory-24h/index-user-source-adoption.mjs",
  evidence: USER_SOURCE_ADOPTION_PATH, historicalEntriesPreserved: existing.length,
  adoptedUniqueBodies: additions.length, terminalPromotions: 0 };
const output = `${JSON.stringify(index, null, 2)}\n`;
if (process.argv.includes("--check")) assert.equal(fs.readFileSync(indexPath, "utf8"), output,
  "runtime corpus index must contain the exact adopted source bodies");
else fs.writeFileSync(indexPath, output);
console.log(`PASS adopted runtime corpus: ${additions.length} exact bodies; ${existing.length} historical entries preserved; stale uploads excluded`);
