#!/usr/bin/env node
import { buildArizonaRecordSealing } from './lib/az-record-sealing-official-builder.mjs';
buildArizonaRecordSealing({familyId:'az_record_sealing_arrest_no_charges-set',trackId:'az_record_sealing_arrest_no_charges',routeKey:'obligation:track-pathway:AZ:az_record_sealing_arrest_no_charges:remedy-1-record-sealing',kind:'arrest',outDir:'data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill'}).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exit(1)});
