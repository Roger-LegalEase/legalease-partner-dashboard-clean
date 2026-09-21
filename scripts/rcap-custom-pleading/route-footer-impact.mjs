// Bounded #53 measurement of existing fixture artifacts; never rewrites
// a packet, approval, visual verdict, or source binding.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
// PyMuPDF reads actual PDF text, including official-font encodings and encrypted
// forms with an empty user password. Install it in an isolated Python tool path.
const files = execFileSync('rg',['--files', 'data/rcap-all50/overlays/census-v1'],{encoding:'utf8'}).trim().split('\n').filter(f=>/\/fixtures\/[^/]+\.pdf$/.test(f)).sort();
const scanOutput = execFileSync(process.env.TASK53_PYTHON ?? 'python', ['-c', `
import json, re, sys
import pymupdf as fitz
fitz.TOOLS.mupdf_display_errors(False)
fitz.TOOLS.mupdf_display_warnings(False)
result = {}
for file in json.load(sys.stdin):
    fitz.TOOLS.mupdf_warnings(reset=True)
    doc = fitz.open(file)
    if doc.needs_pass and not doc.authenticate(''):
        raise RuntimeError('Cannot inspect encrypted artifact: ' + file)
    pages = []
    for index, page in enumerate(doc):
        lines = page.get_text(sort=True).splitlines()
        hits = [line for j, line in enumerate(lines) if re.match(r'^\\s*_?Route:\\s*obligation:\\S', ' '.join(lines[j:j+2]))]
        if hits: pages.append({'page':index+1, 'lines':hits})
    result[file] = {'pageCount':len(doc), 'pages':pages, 'warnings':fitz.TOOLS.mupdf_warnings(reset=True)}
print(json.dumps(result))
`], {input:JSON.stringify(files),encoding:'utf8',maxBuffer:20e6});
if(process.env.TASK53_SCAN_OUTPUT)fs.writeFileSync(process.env.TASK53_SCAN_OUTPUT,scanOutput);
const scanLines=scanOutput.trim().split('\n');
const scanned=JSON.parse(scanLines.pop());
const scanWarnings=Object.entries(scanned).filter(([,v])=>v.warnings).map(([file,v])=>({file,warning:v.warnings}));
const root = 'data/rcap-all50/overlays/census-v1';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const artifacts=[];let canonicalDenominator=0, fixtureDenominator=0;
for(const state of fs.readdirSync(root).sort()) {
  for(const family of fs.readdirSync(path.join(root,state)).sort()) {
    const dir=path.join(root,state,family);
    if(!fs.existsSync(path.join(dir,'fixtures')))continue;
    if(fs.existsSync(path.join(dir,'fixtures/canonical.pdf')))canonicalDenominator++;
    const receipt=JSON.parse(fs.readFileSync(path.join(dir,'source-receipt.json')));
    const reportPath=path.join(dir,'reports/rendered-artifacts.json');
    const report=JSON.parse(fs.readFileSync(reportPath));
    for(const filename of fs.readdirSync(path.join(dir,'fixtures')).filter(f=>f.endsWith('.pdf')).sort()) {
      const fixture=filename.slice(0,-4);
      const file=path.join(dir,'fixtures',filename);fixtureDenominator++;
      const bytes=fs.readFileSync(file);
      const pdf=scanned[file];
      if(!pdf)throw new Error(`Unscanned artifact: ${file}`);
      const artifact=(report.artifacts??report.pdfs??[]).find(a=>a.fixture===fixture);
      const pages=pdf.pages.map(page=>({...page,manifest:artifact?.pageManifest?.find(m=>m.packetPage===page.page)??null}));
      if(pages.length)artifacts.push({file,fixture,familyId:receipt.familyId,strategy:receipt.implementationStrategy,oldSha256:hash(bytes),pageCount:pdf.pageCount,pages,artifactReport:reportPath,newSha256:null,evidenceStatus:'STALE',renewal:'Rerender composed pages, then renew applicable artifact/visual evidence; not approved.'});
    }
  }
}
// Bind each measured family to its existing builder and follow its imports to
// the shared correction. A saved packet is not assumed fixed from its state.
function correctionPath(file, seen = new Set()) {
  const absolute=path.resolve(file);
  if(seen.has(absolute)||!fs.existsSync(absolute))return null;
  seen.add(absolute);const source=fs.readFileSync(absolute,'utf8');
  if(source.includes('court-facing-rows.mjs'))return [file,'scripts/rcap-custom-pleading/court-facing-rows.mjs'];
  for(const match of source.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)['"]/g)) {
    if(!match[1].startsWith('.'))continue;
    const next=path.relative(process.cwd(),path.resolve(path.dirname(absolute),match[1]));
    const trail=correctionPath(next,seen);if(trail)return [file,...trail];
  }
  return null;
}
for(const artifact of artifacts) {
  const dir=path.dirname(path.dirname(artifact.file));
  const status=JSON.parse(fs.readFileSync(path.join(dir,'build-status.json')));
  // This existing wrapper omits builtBy in its historical status. Verify its
  // exact output locator instead of inferring a builder from jurisdiction.
  artifact.builder=status.builtBy ?? (dir.endsWith('/wa-vac-felony-set--official-pdf-fill') ? 'scripts/build-census-v1-wa_vac_felony-set.mjs' : null);
  if(!status.builtBy && artifact.builder && !fs.readFileSync(artifact.builder,'utf8').includes(dir))throw new Error('Unproven builder locator');
  artifact.correctionPath=artifact.builder && correctionPath(artifact.builder);
  if(!artifact.correctionPath)throw new Error(`No shared correction path for ${artifact.file}`);
}
// Existing references to these exact old bytes, not a claim every reference is an approval.
const refs=execFileSync('rg',['-l','-F','-g','!data/rcap-grade-a/mission-lock/task53/**','-f','-','data','docs'],{input:artifacts.map(a=>a.oldSha256).join('\n'),encoding:'utf8',maxBuffer:20e6}).trim().split('\n');
const referenceTexts=refs.map(file=>[file,fs.readFileSync(file,'utf8')]);
for(const a of artifacts)a.oldHashReferences=referenceTexts.filter(([,s])=>s.includes(a.oldSha256)).map(([f])=>f);
console.log(JSON.stringify({baseSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),canonicalDenominator,fixtureDenominator,scanWarnings,scanMessages:scanLines,affectedTotal:artifacts.length,affectedCanonical:artifacts.filter(a=>a.fixture==='canonical').length,affectedBoundary:artifacts.filter(a=>a.fixture==='boundary').length,officialPdfFillModified:false,approvalsIssued:false,artifacts},null,2));
