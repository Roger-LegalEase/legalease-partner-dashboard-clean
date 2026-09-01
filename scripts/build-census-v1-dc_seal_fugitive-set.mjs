#!/usr/bin/env node
// dc_seal_fugitive-set entry point. The shared DC Chapter-8 custom-pleading
// host lives in build-census-v1-dc_seal_nonconviction-set.mjs (east-host pattern).
import { runFamilyById } from "./build-census-v1-dc_seal_nonconviction-set.mjs";
console.log(JSON.stringify(await runFamilyById("dc_seal_fugitive-set"), null, 2));
