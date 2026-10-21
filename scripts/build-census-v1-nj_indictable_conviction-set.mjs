#!/usr/bin/env node
import { runEastFamily } from "./build-census-v1-nj_arrest_no_conviction-set.mjs";
const args = process.argv.slice(2);
await runEastFamily("nj_indictable_conviction-set",
  args.includes("--check") || args.includes("--check-nonvisual")
    ? ["--check-nonvisual"] : ["--no-raster"]);
