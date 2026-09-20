#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMichiganFamily } from './rcap-packet-recovery/chat9/michigan.mjs';
export const runFamily = () => runMichiganFamily('mi_setaside_first_owi-set');
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) throw new Error('No --check substitute: run the complete family renderer with no arguments.');
  runFamily().then(result => console.log(JSON.stringify(result,null,2))).catch(error => { console.error(error); process.exitCode=1; });
}
