#!/usr/bin/env node
import { runFamily } from "./build-census-v1-wa_vac_substance_use_disorder-custom-pleading.mjs";

runFamily(process.argv.slice(2))
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
