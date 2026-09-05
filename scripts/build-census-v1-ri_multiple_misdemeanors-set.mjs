#!/usr/bin/env node
/**
 * ri_multiple_misdemeanors-set.
 *
 * The five Rhode Island families share one host, in
 * scripts/build-census-v1-ri_decriminalized-set.mjs, because Rhode Island
 * publishes one motion-and-affidavit form per court and carries every statutory
 * branch as a numbered Part of one affidavit - and because the owner's decision
 * of 2026-09-05 requires each court-specific proposed order to be composed once
 * and shared by the families that use it. Every family on that host is granted
 * to this one lane.
 */
import { runRhodeIslandFamily } from "./build-census-v1-ri_decriminalized-set.mjs";

const result = await runRhodeIslandFamily("ri_multiple_misdemeanors-set");
console.log(JSON.stringify(result, null, 2));
