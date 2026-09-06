#!/usr/bin/env node
// il-seal-nonconv-set is built by the shared Illinois host,
// scripts/build-census-v1-il-exp-pardon-set.mjs. The host's FAMILY_CONFIG entry
// for this family carries its track, its mode, its route summary and every
// election the route determines.
import { buildIllinoisFamily, selfTest } from "./build-census-v1-il-exp-pardon-set.mjs";
if (process.argv.includes("--self-test")) selfTest("il-seal-nonconv-set");
else await buildIllinoisFamily("il-seal-nonconv-set");
