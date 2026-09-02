#!/usr/bin/env node
import { runFamilyById } from "./build-census-v1-va_seal_petition_misdemeanor-set.mjs";
console.log(JSON.stringify(await runFamilyById("va_seal_petition_felony-set"), null, 2));
