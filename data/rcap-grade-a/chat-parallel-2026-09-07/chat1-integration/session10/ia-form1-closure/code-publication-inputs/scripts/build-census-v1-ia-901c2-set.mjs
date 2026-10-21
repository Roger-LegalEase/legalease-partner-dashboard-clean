#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFamily } from './rcap-packet-recovery/chat8/ia-901c2.mjs';
export { buildFamily };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('This is a full five-fixture build; no --check or ignored arguments.');
  await buildFamily();
}
