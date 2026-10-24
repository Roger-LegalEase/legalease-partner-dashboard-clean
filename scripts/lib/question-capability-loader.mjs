// Test process only: reuse the repository loader and expose one actual private definition surface.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = process.cwd();
const native = await import(pathToFileURL(path.join(root, 'scripts/lib/ts-esm-loader.mjs')).href);
const target = pathToFileURL(path.join(root, 'src/lib/expungement-ai/packet-information.ts')).href;
export const resolve = native.resolve;
export async function load(url, context, next) {
  const result = await native.load(url, context, next);
  if (process.env.QUESTION_CAPABILITY_MODULE_LOG && url.startsWith(pathToFileURL(root + '/').href) && /\.(ts|tsx|json)$/.test(url)) {
    const file = fileURLToPath(url);
    fs.appendFileSync(process.env.QUESTION_CAPABILITY_MODULE_LOG, JSON.stringify({ file: path.relative(root, file), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }) + '\n');
  }
  if (url !== target) return result;
  if (typeof result.source !== 'string' || !result.source.includes('function protectedPacketQuestionSurface(')) throw new Error('Actual packet question surface unavailable; capability verification cannot be skipped.');
  return { ...result, source: result.source + '\nexport { protectedPacketQuestionSurface };\n' };
}
