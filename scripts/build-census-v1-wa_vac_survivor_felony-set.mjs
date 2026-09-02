#!/usr/bin/env node
import { buildWaFamily } from "./build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs";
console.log(JSON.stringify(await buildWaFamily("wa_vac_survivor_felony-set", process.argv.slice(2))));
