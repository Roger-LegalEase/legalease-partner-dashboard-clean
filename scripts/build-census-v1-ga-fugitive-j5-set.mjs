#!/usr/bin/env node
import { runGaFamily } from "./build-census-v1-ga-host.mjs";
console.log(JSON.stringify(await runGaFamily("ga-fugitive-j5-set"), null, 2));
