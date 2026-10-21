import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

const ROOT = process.cwd();
const TX = "data/rcap-all50/overlays/census-v1/tx";

const CASES = [
  {
    familyId: "tx_exp_acquittal-set",
    directory: "tx-exp-acquittal-set--custom-pleading",
    routeSelectionId: "tx_exp_acquittal-composed-set",
    primaryRouteKey: "obligation:unit:TX:tx_exp_acquittal:tx-acquittal-in-window-request",
    productRouteKey: "obligation:unit:TX:tx_exp_acquittal:tx-acquittal-in-window-request",
    routeKeys: [
      "obligation:unit:TX:tx_exp_acquittal:tx-acquittal-in-window-request",
      "obligation:unit:TX:tx_exp_acquittal:tx-acquittal-out-of-window-petition"
    ]
  },
  {
    familyId: "tx_nd_conviction_no_supervision-set",
    directory: "tx-nd-conviction-no-supervision-set--official-pdf-fill",
    routeSelectionId: "tx_nd_conviction_no_supervision-official-set",
    primaryRouteKey: "obligation:track-pathway:TX:tx_nd_conviction_no_supervision:petitioned-nondisclosure-for-an-eligible-conviction-411-0735",
    productRouteKey: "obligation:track-pathway:TX:tx_nd_conviction_no_supervision:petitioned-nondisclosure-for-an-eligible-conviction-411-0735",
    routeKeys: ["obligation:track-pathway:TX:tx_nd_conviction_no_supervision:petitioned-nondisclosure-for-an-eligible-conviction-411-0735"]
  },
  {
    familyId: "tx_nd_dwi_deferred-set",
    directory: "tx-nd-dwi-deferred-set--official-pdf-fill",
    routeSelectionId: "tx_nd_dwi_deferred-official-set",
    primaryRouteKey: "obligation:track-only:TX:tx_nd_dwi_deferred",
    productRouteKey: "obligation:track-only:TX:tx_nd_dwi_deferred",
    routeKeys: ["obligation:track-only:TX:tx_nd_dwi_deferred"]
  },
  {
    familyId: "tx_nd_probation_misdemeanor-set",
    directory: "tx-nd-probation-misdemeanor-set--official-pdf-fill",
    routeSelectionId: "tx_nd_probation_misdemeanor-official-set",
    primaryRouteKey: "obligation:track-only:TX:tx_nd_probation_misdemeanor",
    productRouteKey: "obligation:track-only:TX:tx_nd_probation_misdemeanor",
    routeKeys: ["obligation:track-only:TX:tx_nd_probation_misdemeanor"]
  },
  {
    familyId: "tx_nd_deferred_other-set",
    directory: "tx-nd-deferred-other-set--official-pdf-fill",
    routeSelectionId: "tx_nd_deferred_other-official-set",
    primaryRouteKey: "obligation:track-pathway:TX:tx_nd_deferred_other:petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725",
    productRouteKey: "obligation:track-pathway:TX:tx_nd_deferred_other:petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725",
    routeKeys: ["obligation:track-pathway:TX:tx_nd_deferred_other:petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725"]
  },
  {
    familyId: "tx_nd_dwi_probation-set",
    directory: "tx-nd-dwi-probation-set--official-pdf-fill",
    routeSelectionId: "tx_nd_dwi_probation-official-set",
    primaryRouteKey: "obligation:track-pathway:TX:tx_nd_dwi_probation:first-offense-dwi-nondisclosure",
    productRouteKey: "obligation:track-pathway:TX:tx_nd_dwi_probation:first-offense-dwi-nondisclosure",
    routeKeys: ["obligation:track-pathway:TX:tx_nd_dwi_probation:first-offense-dwi-nondisclosure"]
  },
  {
    familyId: "tx_nd_veterans_court-set",
    directory: "tx-nd-veterans-court-set--official-pdf-fill",
    routeSelectionId: "tx_nd_veterans_court-official-set",
    primaryRouteKey: "obligation:track-only:TX:tx_nd_veterans_court",
    productRouteKey: "obligation:track-only:TX:tx_nd_veterans_court",
    routeKeys: ["obligation:track-only:TX:tx_nd_veterans_court"]
  },
  {
    familyId: "tx_nd_veterans_reemployment-set",
    directory: "tx-nd-veterans-reemployment-set--official-pdf-fill",
    routeSelectionId: "tx_nd_veterans_reemployment-official-set",
    primaryRouteKey: "obligation:unit:TX:tx_nd_veterans_reemployment:tx-nd0729-oca-petition",
    productRouteKey: "obligation:unit:TX:tx_nd_veterans_reemployment:tx-nd0729-no-filing-route",
    routeKeys: [
      "obligation:unit:TX:tx_nd_veterans_reemployment:tx-nd0729-no-filing-route",
      "obligation:unit:TX:tx_nd_veterans_reemployment:tx-nd0729-oca-petition"
    ]
  }
];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

for (const row of CASES) {
  test(`${row.familyId}: production entrypoint binds current sources`, () => {
    const stdout = execFileSync(process.execPath, [
      path.join(ROOT, "scripts", `build-census-v1-${row.familyId}.mjs`),
      "--check",
      "--no-raster"
    ], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, RCAP_NO_LOCAL_RASTER: "1" }
    });
    const result = JSON.parse(stdout);
    assert.equal(result.familyId, row.familyId);
    assert.equal(result.status, "CHECK_ONLY");
    assert.deepEqual(result.captionDrift, []);
    assert.deepEqual(result.unmappedFields, []);
    assert.deepEqual(result.staleDictionaryKeys, []);
  });

  test(`${row.familyId}: machine route keys stay out of participant surfaces and remain in metadata`, () => {
    const dir = path.join(ROOT, TX, row.directory);
    const instructions = fs.readFileSync(path.join(dir, "participant-instructions.md"), "utf8");
    const wiring = readJson(path.join(dir, "product-wiring.json"));
    const fieldMap = readJson(path.join(dir, "production-field-map.json"));
    const receipt = readJson(path.join(dir, "source-receipt.json"));
    const builder = fs.readFileSync(path.join(ROOT, "scripts", `build-census-v1-${row.familyId}.mjs`), "utf8");

    assert.doesNotMatch(instructions, /_?Route:\s*obligation:/, "participant instructions retain an internal route trailer");

    assert.equal(wiring.routeKey, row.productRouteKey);
    assert.deepEqual(wiring.routeKeys, row.routeKeys);
    assert.deepEqual(fieldMap.routeKeys, row.routeKeys);
    assert.equal(fieldMap.routeSelectionId, row.routeSelectionId);
    assert.deepEqual(receipt.routeKeys, row.routeKeys);
    assert.equal(receipt.routeSelectionId, row.routeSelectionId);
    assert.match(builder, new RegExp(`primaryRouteKey:\\s*${JSON.stringify(row.primaryRouteKey).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`));

    for (const key of row.routeKeys) {
      assert.equal(instructions.includes(key), false, `participant instructions leaked ${key}`);
      for (const fixture of ["canonical", "boundary"]) {
        const pdf = path.join(dir, "fixtures", `${fixture}.pdf`);
        const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
        assert.doesNotMatch(text, /_?Route:\s*obligation:/, `${fixture}.pdf retains an internal route trailer`);
        assert.equal(text.includes(key), false, `${fixture}.pdf leaked ${key}`);
      }
    }

    const rendered = readJson(path.join(dir, "reports", "rendered-artifacts.json"));
    const inventory = rendered.artifacts.map((artifact) => {
      const pdf = path.join(ROOT, artifact.file);
      return {
        fixture: artifact.fixture,
        file: artifact.file,
        sha256: sha256(pdf),
        byteLength: fs.statSync(pdf).size,
        pageCount: artifact.pageCount
      };
    });
    assert.deepEqual(inventory, rendered.artifacts.map(({ fixture, file, sha256: hash, byteLength, pageCount }) => ({
      fixture, file, sha256: hash, byteLength, pageCount
    })));
  });
}
