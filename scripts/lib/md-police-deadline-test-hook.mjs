import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

/** Test-only visibility into the actual unchanged historical deadline gate.
 * Register after ts-esm-loader and before any evaluator import. This appends
 * only an export to the loader's real transpiled module: no copied function,
 * alternate arithmetic, modified profile or production export is introduced. */
export function registerMarylandDeadlineTestExport() {
  const url = pathToFileURL(path.resolve('src/lib/rcap-engine/evaluator.ts')).href;
  const source = `
let evaluatorUrl;
export function initialize(data) { evaluatorUrl = data.url; }
export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (url !== evaluatorUrl) return loaded;
  const source = String(loaded.source);
  if (!source.includes('function mdPoliceRecordDeadlineSafetyGate(')) {
    throw new Error('The actual Maryland deadline gate is unavailable');
  }
  return { ...loaded, source: source + '\\nexport { mdPoliceRecordDeadlineSafetyGate };\\n' };
}`;
  register('data:text/javascript,' + encodeURIComponent(source), { data: { url } });
}
