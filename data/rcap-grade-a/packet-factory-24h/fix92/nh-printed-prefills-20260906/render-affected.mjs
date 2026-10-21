import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { rasterizePageCalibrated } from "../../../../../scripts/raster/pdf-page-raster.mjs";

const evidence = path.dirname(fileURLToPath(import.meta.url));
const family = "data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill";
const records = [];
const receipt = path.join(evidence, "affected-raster.json");
const previous = fs.existsSync(receipt) ? JSON.parse(fs.readFileSync(receipt, "utf8")).records : [];
const durable = path.join(os.homedir(), ".local/share/legalease/evidence/fix92-nh-printed-prefills-20260906");
for (const fixture of ["canonical", "boundary"]) {
  const file = `${family}/fixtures/${fixture}.pdf`;
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  for (const packetPage of [5, 6]) {
    const retained = previous.find((r) => r.sha256 === sha256 && r.fixture === fixture && r.packetPage === packetPage
      && fs.existsSync(path.join(evidence, r.image))
      && crypto.createHash("sha256").update(fs.readFileSync(path.join(evidence, r.image))).digest("hex") === r.imageSha256);
    if (retained) { records.push(retained); continue; }
    const rendered = await rasterizePageCalibrated({ file, pageIndex: packetPage - 1,
      keep: path.join(durable, `${fixture}-page-${packetPage}`) });
    const image = `${fixture}-page-${packetPage}.png`;
    fs.copyFileSync(rendered.image, path.join(evidence, image));
    records.push({ fixture, file, sha256, packetPage, image,
      engine: "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
      calibrationResidualPx: rendered.calibrationResidualPx, paper: rendered.paper,
      pxPerPt: rendered.pxPerPt, pxPerPtVertical: rendered.pxPerPtVertical,
      imageSha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(evidence, image))).digest("hex") });
    fs.writeFileSync(path.join(evidence, "affected-raster.json"), `${JSON.stringify({
      familyId: "nh_petition_nonconviction_pre2019-set", authorEvidenceOnly: true,
      centralRasterPass: false, independentlyAccepted: false, complete: records.length === 4, records
    }, null, 2)}\n`);
    console.log(`${fixture} page ${packetPage}: calibration residual ${rendered.calibrationResidualPx}px`);
  }
}
