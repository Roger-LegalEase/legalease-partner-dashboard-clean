#!/usr/bin/env node
import { buildArizonaRecordSealing } from './lib/az-record-sealing-official-builder.mjs';
buildArizonaRecordSealing({familyId:'az_record_sealing_dismissal_not_guilty-set',trackId:'az_record_sealing_dismissal_not_guilty',routeKey:'obligation:track-only:AZ:az_record_sealing_dismissal_not_guilty',kind:'dismissal',outDir:'data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill'}).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exit(1)});
