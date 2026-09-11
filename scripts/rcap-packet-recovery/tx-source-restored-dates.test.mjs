import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractTextItems,
  groupIntoLines,
} from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STATEMENT_SHA = "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d";
const STATEMENT = path.join(ROOT, "private/human-source-returns/TX/TX__STATEMENTOFINABILITYTOAFFORDPAYMENTOFCOURTCOSTSO.pdf");

const families = [
  ["tx_exp_acquittal-set", "tx-exp-acquittal-set--custom-pleading"],
  ["tx_nd_conviction_no_supervision-set", "tx-nd-conviction-no-supervision-set--official-pdf-fill"],
  ["tx_nd_dwi_deferred-set", "tx-nd-dwi-deferred-set--official-pdf-fill"],
  ["tx_nd_probation_misdemeanor-set", "tx-nd-probation-misdemeanor-set--official-pdf-fill"],
];
const disclosureFamilies = new Set([
  "tx_exp_acquittal-set",
  "tx_nd_dwi_deferred-set",
  "tx_nd_probation_misdemeanor-set",
]);

const overlay = (dir, rel) => path.join(ROOT, "data/rcap-all50/overlays/census-v1/tx", dir, rel);
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const normalize = (value) => value.replace(/\s+/g, " ").trim();

async function pageText(pdfPath, packetPage) {
  const pdf = await PDFDocument.load(await readFile(pdfPath), {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  return normalize(groupIntoLines(extractTextItems(pdf.getPages()[packetPage - 1]))
    .map((line) => line.text)
    .join(" "));
}

function statementDobRows(map) {
  const rows = map.maps.flatMap((entry) => entry.canonicalRefusals ?? []);
  return rows.filter((row) => ["Month / Mes", "Day / Día", "Year / Año"].includes(row.fieldName));
}

function assertParticipantDobDisclosure(map) {
  const rows = statementDobRows(map);
  assert.equal(rows.length, 3, "all three source-printed DOB boxes must be disclosed");
  for (const row of rows) {
    assert.equal(row.requiredBeforeFiling, true);
    assert.equal(row.completenessDisposition, "REQUIRED_BEFORE_FILING");
    assert.match(row.printedLabel, /My date of birth is \/ Mi fecha de nacimiento es/);
    assert.match(row.participantMustSupply, /date of birth/i);
    assert.match(row.why, /(?:shares|other widget is).*notary/i);
  }
}

test("held Statement source identity remains exact", async () => {
  const digest = createHash("sha256").update(await readFile(STATEMENT)).digest("hex");
  assert.equal(digest, STATEMENT_SHA);
});

for (const [familyId, dir] of families) {
  test(`${familyId}: Statement page 2 prints DOB as MM/DD/YYYY in both fixtures`, async () => {
    const report = await json(overlay(dir, "reports/rendered-artifacts.json"));
    for (const [fixture, expected, forbidden] of [
      ["canonical", "04/17/1994", "1994-04-17"],
      ["boundary", "12/31/1972", "1972-12-31"],
    ]) {
      const packet = report.artifacts.find((entry) => entry.fixture === fixture);
      assert.ok(packet, `missing ${fixture} packet evidence`);
      const sourcePage = packet.pageManifest.find((entry) =>
        entry.sourceSha256 === STATEMENT_SHA && entry.sourcePage === 2);
      assert.ok(sourcePage, "Statement page 2 is not bound into the packet manifest");
      const text = await pageText(path.join(ROOT, packet.file), sourcePage.packetPage);
      assert.match(text, new RegExp(expected.replaceAll("/", "\\/")));
      assert.doesNotMatch(text, new RegExp(forbidden));
    }
  });

  if (disclosureFamilies.has(familyId)) {
    test(`${familyId}: shared page-11 DOB widgets are honest participant blanks`, async () => {
      const map = await json(overlay(dir, "production-field-map.json"));
      assertParticipantDobDisclosure(map);
      const instructions = await readFile(overlay(dir, "participant-instructions.md"), "utf8");
      assert.match(instructions, /Page 11 of the Statement asks for your date of birth again/);
      assert.match(instructions, /month box shares a form field with the notary's month on page 12/);
      assert.doesNotMatch(instructions, /all (?:date-of-birth|DOB) (?:fields|occurrences).*(?:filled|prefilled)/i);
    });
  }
}

test("shared-widget disclosure rejects protected, optional, or mislabeled variants", async () => {
  const map = await json(overlay("tx-nd-dwi-deferred-set--official-pdf-fill", "production-field-map.json"));
  assertParticipantDobDisclosure(map);
  for (const mutate of [
    (row) => { row.requiredBeforeFiling = false; },
    (row) => { row.completenessDisposition = "PROTECTED_OFFICIAL_OR_THIRD_PARTY"; },
    (row) => { row.printedLabel = "Date"; },
  ]) {
    const changed = structuredClone(map);
    mutate(statementDobRows(changed)[0]);
    assert.throws(() => assertParticipantDobDisclosure(changed));
  }
});

test("acquittal declaration uses source date order and proposed order has no route trailer", async () => {
  const dir = "tx-exp-acquittal-set--custom-pleading";
  const report = await json(overlay(dir, "reports/rendered-artifacts.json"));
  for (const [fixture, expected] of [["canonical", "04/17/1994"], ["boundary", "12/31/1972"]]) {
    const packet = report.artifacts.find((entry) => entry.fixture === fixture);
    const petitionPage = packet.pageManifest.find((entry) =>
      entry.component === "tx_exp_acquittal-petition-3" && entry.sourcePage === 2);
    const orderPage = packet.pageManifest.find((entry) => entry.component === "tx_exp_acquittal-proposed-order-4");
    const declaration = await pageText(path.join(ROOT, packet.file), petitionPage.packetPage);
    const order = await pageText(path.join(ROOT, packet.file), orderPage.packetPage);
    assert.match(declaration, new RegExp(expected.replaceAll("/", "\\/")));
    assert.doesNotMatch(order, /Route\s*:/i);
    assert.doesNotMatch(order, /tx-acquittal-in-window-request/);
  }
});

test("probation packet carries the family-violence allegation stop", async () => {
  const dir = "tx-nd-probation-misdemeanor-set--official-pdf-fill";
  const instructions = await readFile(overlay(dir, "participant-instructions.md"), "utf8");
  assert.match(instructions, /family violence \*\*allegation\*\* anywhere in your record/);
  assert.match(instructions, /an allegation stops this route even where no court ever made a finding/);
  const report = await json(overlay(dir, "reports/rendered-artifacts.json"));
  const packet = report.artifacts.find((entry) => entry.fixture === "canonical");
  const guidePages = packet.pageManifest.filter((entry) => /instructions/.test(entry.component));
  const guideText = normalize((await Promise.all(guidePages.map((entry) =>
    pageText(path.join(ROOT, packet.file), entry.packetPage)))).join(" "));
  assert.match(guideText, /family violence allegation/i);
  assert.match(guideText, /allegation stops this route even where no court ever made a finding/i);
});
