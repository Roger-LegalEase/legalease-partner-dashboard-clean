import { buildOverlayFactory, overlayManifestPath } from "./rcap-all50-overlay-factory-lib.mjs";

const manifest = await buildOverlayFactory();

console.log("RCAP all-50 official PDF overlay factory complete.");
console.log(`Forms found: ${manifest.summary.totalFormsFound}`);
console.log(`PDF forms: ${manifest.summary.totalPdfForms}`);
console.log(`Mapped forms: ${manifest.summary.mappedForms}`);
console.log(`Partial maps: ${manifest.summary.partialMaps}`);
console.log(`Rendered samples: ${manifest.summary.renderedSamples}`);
console.log(`Blocked forms: ${manifest.summary.blockedForms}`);
console.log(`Visual review pending: ${manifest.summary.visualReviewPending}`);
console.log(`Manifest: ${overlayManifestPath}`);
