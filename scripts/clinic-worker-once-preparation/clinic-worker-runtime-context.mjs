import fs from 'node:fs';
import {createSponsoredWorkerRuntimeContext} from '../worker-once-preparation/sponsored-worker-runtime-context.mjs';
export const CLINIC_WORKER_CONTEXT=createSponsoredWorkerRuntimeContext(fs.readFileSync(new URL('../../data/record-clearing/legal-decisions/2026-10-23-ms-nonconv-sponsored-preview.json',import.meta.url)));
