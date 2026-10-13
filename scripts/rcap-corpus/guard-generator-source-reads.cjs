// Observe the unchanged generators. Every private source read must have been
// inventoried and must match its pin, even if an adapter catches the refusal.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {fileURLToPath} = require('node:url');
const root = path.resolve(__dirname, '../..');
const original = fs.readFileSync;
const manifestPath = path.join(root, 'data/rcap-grade-a/source-custody/generator-preflight-20261013/manifest.json');
const manifest = JSON.parse(original(manifestPath, 'utf8'));
const sources = new Map(manifest.sources.map(s => [s.path, s]));
// The child environment preflight samples the mounted index. These are
// conditional reads, not an instruction to acquire unmounted source catalogs.
if (manifest.conditionalCorpusIndex) {
  const ref = manifest.conditionalCorpusIndex;
  const bytes = original(path.join(root, ref.path));
  if (bytes.length !== ref.byteLength || crypto.createHash('sha256').update(bytes).digest('hex') !== ref.sha256) throw Error('Corpus source index changed');
  const index = JSON.parse(bytes), custodies = new Map(index.custodies.map(c => [c.id,c]));
  for (const entry of index.entries) {
    const custody = custodies.get(entry.custody ?? 'master_library');
    const name = custody.pathsRelativeTo === 'custodyRoot' ? custody.root+'/'+entry.path : entry.path;
    const row = {path:name, sha256:entry.sha256, byteLength:entry.byteLength};
    const prior = sources.get(name);
    if (prior && (prior.sha256 !== row.sha256 || prior.byteLength !== row.byteLength)) throw Error('Conflicting source index identity');
    sources.set(name,row);
  }
}
const observed = new Map(), refused = new Map();
fs.readFileSync = function(file, options) {
  const input = file instanceof URL ? fileURLToPath(file) : file;
  if (typeof input !== 'string' && !Buffer.isBuffer(input)) return original.apply(this, arguments);
  const absolute = path.resolve(String(input));
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  if (!relative.startsWith('private/')) return original.apply(this, arguments);
  try {
    const record = sources.get(relative);
    if (!record) throw Error('private read absent from reviewed source inventory');
    for (let cursor = absolute; cursor !== root; cursor = path.dirname(cursor)) {
      if (fs.lstatSync(cursor).isSymbolicLink()) throw Error('symlink in private source path');
    }
    const bytes = original.call(fs, absolute);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== record.byteLength || sha256 !== record.sha256) throw Error('source length or SHA-256 mismatch');
    observed.set(relative, {path:relative, sha256, byteLength:bytes.length});
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : bytes;
  } catch (error) {
    refused.set(relative, {path:relative, reason:error.code || error.message});
    process.exitCode = 1;
    throw error;
  }
};
require('node:module').syncBuiltinESMExports();
process.on('exit', () => {
  const result = {schemaVersion:'rcap-generator-source-read-coverage/v1', command:process.argv.slice(1),
    status:refused.size ? 'REFUSED' : 'PASS', observed:[...observed.values()].sort((a,b)=>a.path.localeCompare(b.path)),
    refused:[...refused.values()].sort((a,b)=>a.path.localeCompare(b.path))};
  if (process.env.GENERATOR_SOURCE_AUDIT_DIR) {
    const directory = path.resolve(process.env.GENERATOR_SOURCE_AUDIT_DIR);
    if (directory === root || directory.startsWith(root + path.sep)) {
      process.stderr.write('Source audit output must be outside the checkout\n'); process.exitCode=1;
    } else {
      fs.mkdirSync(directory, {recursive:true});
      fs.writeFileSync(path.join(directory, `source-reads-${process.pid}.json`), JSON.stringify(result,null,2)+'\n');
    }
  }
  if (refused.size) {
    process.stderr.write('GENERATOR_SOURCE_INVENTORY_REFUSED '+JSON.stringify(result.refused)+'\n');
    process.exitCode=1;
  }
});
