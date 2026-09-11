#!/usr/bin/env node
import { runEastFamily } from "./build-census-v1-nj_arrest_no_conviction-set.mjs";
import { repairRiNonconvictionReport } from "./rcap-packet-recovery/ri-nonconviction-report.mjs";
if (!process.argv.includes('--repair-report-only')) await runEastFamily("ri_nonconviction_sealing-set");
if (!process.argv.includes('--check') && !process.argv.includes('--self-test')) {
  console.log(JSON.stringify(await repairRiNonconvictionReport()));
}
