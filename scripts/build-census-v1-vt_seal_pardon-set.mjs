#!/usr/bin/env node
// vt_seal_pardon-set — one of the five Vermont sealing families.
//
// The five file the same three official Vermont forms and differ only in the
// statutory route. The implementation lives in the lane's shared host and this
// file names the family; one shared host, one writer.
import { runFamilyById } from "./build-census-v1-vt_seal_misdemeanor-set.mjs";

export const familyId = "vt_seal_pardon-set";
export { runFamilyById };

if (process.argv[1] && process.argv[1].endsWith("build-census-v1-vt_seal_pardon-set.mjs")) {
  runFamilyById(familyId)
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
