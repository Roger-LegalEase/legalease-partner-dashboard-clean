import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FAMILY = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill");
const SOURCE = path.join(ROOT,
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/NJ/02_PACKET_FORMS/"
  + "NJ__FORM__CN-10557__cn-10557-new-jersey-expungement-kit__REV-2020-06__EN.pdf");
const SOURCE_SHA256 = "c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7";

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(FAMILY, name), "utf8"));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const fieldRows = () => new Map(readJson("production-field-map.json").documents[0].fields
  .map((row) => [row.field, row]));

const ROUTE_INAPPLICABLE = [
  "dismissOff1", "dismissPlea", "acquitOff1", "dismissPtiOff1",
  "contDismissOff1", "contDismissPlea", "contAcquitOff1", "contAcquitCrt",
  "contDismissPtiOff1", "contDismissPtiCrt", "contGuiltyDt", "contGuiltyStatute",
  "contGuiltyCrt", "contGuiltyProbDt",
];
const COURT_OWNED = [
  "sigHearJdg", "orderHearMnth", "orderHearYr", "hearDay", "hearMnth", "hearYr",
  "hearTime", "hearTimeM", "orderFinalDay", "orderFinalMnth", "orderFinalYr",
];

test("ordinance-only branches use the declared route-inapplicable channel", () => {
  const rows = fieldRows();
  for (const field of ROUTE_INAPPLICABLE) {
    const row = rows.get(field);
    assert.ok(row, `${field}: missing from field map`);
    assert.equal(row.decision, "refuse", `${field}: refusal must survive`);
    assert.equal(row.refusalClass, null, `${field}: participant-sworn class survived`);
    assert.equal(row.completenessDisposition, "NOT_APPLICABLE_ON_THIS_ROUTE");
    assert.equal(row.requiredBeforeFiling, false);
    assert.match(row.routeConditionThatMakesItInapplicable, /municipal-ordinance|ordinance conviction/);
  }
});

test("court work is excluded from participant guidance and the clerk owns the docket number", () => {
  const rows = fieldRows();
  const guide = fs.readFileSync(path.join(FAMILY, "participant-instructions.md"), "utf8");
  const requiredSection = guide.split("## Exact facts still required before filing\n")[1]
    ?.split("\n## ")[0] ?? "";
  for (const field of COURT_OWNED) {
    const row = rows.get(field);
    assert.equal(row.refusalClass, "court_prosecutor_clerk_or_agency_owned", `${field}: wrong owner`);
    assert.notEqual(row.requiredBeforeFiling, true, `${field}: remains participant-required`);
    assert.equal(requiredSection.includes(`source field: \`${field}\``), false,
      `${field}: remains in required-before-filing guidance`);
  }
  const docket = rows.get("ExpungeDocketNum");
  assert.equal(docket.refusalClass, "court_prosecutor_clerk_or_agency_owned");
  assert.match(docket.reason, /clerk will fill in/i);
  assert.equal(requiredSection.includes("ExpungeDocketNum"), false);
});

test("participant-owned requirements and corrected source labels remain actionable", () => {
  const rows = fieldRows();
  const guide = fs.readFileSync(path.join(FAMILY, "participant-instructions.md"), "utf8");
  const guilty = rows.get("guilty");
  assert.equal(guilty.requiredBeforeFiling, true);
  assert.equal(guilty.determinedByTheCaseNotTheRoute, true);
  assert.ok(guide.includes(guilty.effectiveLabel));

  const labels = {
    DefSbiNum: "State Bureau of Identification (SBI number, if available, is (SBI number, if available)) — Expungement Order (Form C), page 30",
    arrest3Statute: "(statute), arrest row (3) — Expungement Order (Form C - Continued), page 31",
    arrest4Statute: "(statute), arrest row (4) — Expungement Order (Form C - Continued), page 31",
    arrest5Statute: "(statute), arrest row (5) — Expungement Order (Form C - Continued), page 31",
  };
  for (const [field, label] of Object.entries(labels)) {
    assert.equal(rows.get(field).effectiveLabel, label);
    assert.equal(rows.get(field).requiredBeforeFiling, true);
    assert.ok(guide.includes(label));
  }
});

test("the exact source remains pinned and protected writes remain zero", () => {
  assert.equal(sha256(SOURCE), SOURCE_SHA256);
  const receipt = readJson("source-receipt.json");
  assert.equal(receipt.documents[0].sha256, SOURCE_SHA256);
  const expectedPdfs = new Map([
    ["canonical", "03f6169d042fc1d5ed30df008dfc966ef3d03b382731f5956d0e8786ca8a234f"],
    ["boundary", "23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494"],
  ]);
  const rendered = readJson("reports/rendered-artifacts.json");
  for (const pdf of rendered.pdfs) assert.equal(pdf.sha256, expectedPdfs.get(pdf.fixture));
  assert.equal(rendered.rasters.reduce((count, raster) => count + raster.pages.length, 0), 86);
  assert.ok(rendered.rasters.every((raster) => raster.engine === "bundled_poppler_pdftoppm"));
  const wiring = readJson("product-wiring.json");
  assert.equal(wiring.binding.acceptanceReceipt.verdict, "RASTER_PASS");
  assert.equal(wiring.binding.acceptanceReceipt.boundToCanonicalSha256, expectedPdfs.get("canonical"));
  const actual = readJson("reports/actual-writes.json");
  for (const artifact of actual.artifacts) {
    assert.deepEqual(artifact.proof.protectedInk, []);
    assert.deepEqual(artifact.proof.protectedVectorInk, []);
    const written = new Set(artifact.written.map((row) => row.field));
    for (const refusal of artifact.refused) {
      assert.equal(written.has(refusal.field), false, `${artifact.fixture}/${refusal.field}: refused field was written`);
    }
  }
});
