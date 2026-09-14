#!/usr/bin/env node
// Exact four-track continuation; shared East host and other families remain untouched.
import assert from 'node:assert/strict';
import {build,checkSaved} from './build-census-v1-oh-clean-tracks-current.mjs';
const argv=process.argv.slice(2);
assert.ok(argv.every(a=>['--check','--no-raster'].includes(a)),'UNSUPPORTED_ARGUMENT');
console.log(JSON.stringify(await(argv.includes('--check')?checkSaved():build()),null,2));
