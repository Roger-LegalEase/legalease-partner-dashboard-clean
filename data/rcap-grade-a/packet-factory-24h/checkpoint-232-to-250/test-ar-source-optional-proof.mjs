#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const { classifyBlank } = await import(pathToFileURL(path.join(root, "scripts/rcap-packet-completeness/completeness-contract.mjs")).href);
  const p = { sourcePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf", sourceSha256: "63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23", page: 1, rect: { x: 117, y: 418.8, width: 412.8, height: 14.52 }, sourceText: "charged with the offense(s) of:", condition: "additional_charged_offence_exists" };
  const field = { name: "2", label: "_", widgets: [{ page: 1, rect: p.rect }] };
  const base = { disposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false, sourceOptional: p };
  const cases = [
    ["valid", field, base, "OPTIONAL_PARTICIPANT_CONTENT"],
    ["forged-hash", field, { ...base, sourceOptional: { ...p, sourceSha256: "0".repeat(64) } }, "UNCLASSIFIED_BLANK"],
    ["forged-geometry", field, { ...base, sourceOptional: { ...p, rect: { ...p.rect, x: 118 } } }, "UNCLASSIFIED_BLANK"],
    ["swapped-field", { ...field, name: "FBI No if known" }, base, "UNCLASSIFIED_BLANK"],
    ["swapped-condition", field, { ...base, sourceOptional: { ...p, condition: "additional_convicted_offence_exists" } }, "UNCLASSIFIED_BLANK"],
    ["protected", { ...field, label: "Signature" }, base, "PROTECTED_FIELD"],
    ["known-fact", field, { ...base, factAvailable: true, factId: "matter.charge" }, "KNOWN_FACT_NOT_WRITTEN"],
    ["route-election", field, { ...base, routeDetermined: true }, "ROUTE_OPTION_NOT_SELECTED"]
  ];
  for (const [name, f, declared, expected] of cases) {
    const actual = classifyBlank(f, "builder prose", null, declared).disposition;
    if (actual !== expected) throw new Error(`${name}: expected ${expected}, got ${actual}`);
    console.log(`${name}: ${actual}`);
  }
  console.log("AR_SOURCE_OPTIONAL_PROOF_TEST_PASS");
