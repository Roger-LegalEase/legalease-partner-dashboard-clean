#!/usr/bin/env node
import { runGaFamily } from "./build-census-v1-ga-host.mjs";
console.log(JSON.stringify(await runGaFamily("ga-fo-discharged-pre2026-set"), null, 2));
