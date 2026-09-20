#!/usr/bin/env node
import { runFamilyById } from "./build-census-v1-ky_void_seal_controlled_substance-set.mjs";
console.log(JSON.stringify(await runFamilyById("ky_void_seal_marijuana_synthetic_salvia-set"), null, 2));
