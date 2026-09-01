#!/usr/bin/env node
import { runGaFamily } from "./build-census-v1-ga-host.mjs";
console.log(JSON.stringify(await runGaFamily("ga-pardon-j7-set"), null, 2));
