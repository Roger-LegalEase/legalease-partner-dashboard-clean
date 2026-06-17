import fs from "node:fs";
import {
  BUILD_MANIFEST_PATH,
  SOURCE_INVENTORY_PATH,
  buildManifest,
  buildSourceInventory,
  readJson,
  writeJson
} from "./rcap-all50-lib.mjs";

const inventory = fs.existsSync(SOURCE_INVENTORY_PATH) ? readJson(SOURCE_INVENTORY_PATH) : buildSourceInventory();
if (!fs.existsSync(SOURCE_INVENTORY_PATH)) {
  writeJson(SOURCE_INVENTORY_PATH, inventory);
}

const manifest = buildManifest(inventory);
writeJson(BUILD_MANIFEST_PATH, manifest);

console.log("RCAP all-50 build manifest completed.");
console.log(`Jurisdictions: ${manifest.states.length}`);
console.log(`State built entries: ${manifest.states.filter((state) => state.buildStatus === "state_built").length}`);
console.log(`Wrote: ${BUILD_MANIFEST_PATH}`);
