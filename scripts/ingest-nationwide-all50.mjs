import {
  SOURCE_INVENTORY_PATH,
  buildSourceInventory,
  writeJson
} from "./rcap-all50-lib.mjs";

const inventory = buildSourceInventory();
writeJson(SOURCE_INVENTORY_PATH, inventory);

const found = inventory.states.filter((state) => state.status === "resources_found").length;
const missing = inventory.states.length - found;

console.log("RCAP Nationwide ingestion completed.");
console.log(`Source exists: ${inventory.sourceExists ? "yes" : "no"}`);
console.log(`Jurisdictions: ${inventory.states.length}`);
console.log(`Resources found: ${found}`);
console.log(`Explicitly missing: ${missing}`);
console.log(`Wrote: ${SOURCE_INVENTORY_PATH}`);
