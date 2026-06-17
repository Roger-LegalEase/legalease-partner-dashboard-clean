import { retryFieldMaps } from "./rcap-all50-overlay-factory-lib.mjs";

const summary = retryFieldMaps();

console.log("RCAP all-50 field-map retry loop complete.");
console.log(`Retried field maps: ${summary.retriedFieldMaps}`);
console.log(`Retried at: ${summary.retriedAt}`);
