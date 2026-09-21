import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { courtFacingRows } from './court-facing-rows.mjs';
import { sanitizePdfText as sharedSanitize } from './composed-family-host.mjs';
import { stripMarkdownEmphasis } from './composed-page-markdown.mjs';
import { createTokenSplitter, fitsByFontMetrics } from './split-token.mjs';
import { stampDeterministic } from '../rcap-official-forms/rcap-deterministic-pdf-date.mjs';
import { extractTextItems } from '../rcap-official-forms/rcap-pdf-anchor-capture.mjs';
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const ts = require('typescript');
// Bounded before/after evidence, not an approval or a freeze on later legal edits.
const baseline = process.env.TASK53_BASE_SHA ?? 'b1e1f1e85b9922ad618a9306c1fb65787abd2e73';
const wrap = text => text.match(/.{1,35}/g) ?? [''];
const mask = courtFacingRows(wrap);
for (const line of ['Route: obligation:track-only:DC:dc_correct_misattributed_arrest', '_Route: obligation:runtime-only:MS:test_', 'Route: obligation:' + 'long-key-'.repeat(30)]) {
  assert.deepEqual(mask(line), wrap(line).map(() => ' '));
}
for (const line of ['Page 1 of 2', 'Clerk of the Court', 'Signature: __________', 'Service on the prosecutor', 'ORDER', 'Route: Main Street', 'The Route: obligation: identifier appears in a quoted body sentence.', '']) {
  assert.deepEqual(mask(line), wrap(line), 'court/body/footer content must survive');
}
function functions(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found = {file, constants: '', helpers: ''};
  function visit(n) {
    if (ts.isFunctionDeclaration(n) && ['renderedWidthOf','sanitize','sanitizeText'].includes(n.name?.text)) found.helpers += n.getText(ast);
    if (ts.isFunctionDeclaration(n) && ['renderComposedPdf','sanitizePdfText'].includes(n.name?.text)) found[n.name.text] = n.getText(ast).replace(/^export /, '');
    if (ts.isFunctionDeclaration(n) && file==='scripts/build-census-v1-ks-22-2410-arrest-set.mjs' && n.name?.text==='renderGuidance') { found.renderComposedPdf=n.getText(ast); found.rendererName=n.name.text; }
    if (ts.isFunctionDeclaration(n) && /^scripts\/build-census-v1-fl-(expunction|sealing|10yr-bridge|trafficking)-set\.mjs$/.test(file) && ['renderTextPdf','renderDocument'].includes(n.name?.text)) {
      found.renderComposedPdf = n.getText(ast); found.rendererName = n.name.text;
    }
    ts.forEachChild(n, visit);
  }
  visit(ast);
  if (!found.sanitizePdfText && /import \{ sanitizePdfText, DOTS \}/.test(source)) found.sanitizePdfText = sharedSanitize.toString();
  // Keep each adapter's real layout/sanitization constants without executing
  // its top-level packet builder or touching its canonical artifacts.
  const referenced = new Set();
  const body = ts.createSourceFile(file, `${found.renderComposedPdf} ${found.sanitizePdfText}`, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  function reference(n) { if (ts.isIdentifier(n)) referenced.add(n.text); ts.forEachChild(n,reference); }
  reference(body);
  const declarations = ast.statements.filter(ts.isVariableStatement).flatMap(s=>[...s.declarationList.declarations]);
  let size;
  do { size=referenced.size; for(const d of declarations) if(referenced.has(d.name.getText(ast))) reference(d.initializer); } while(referenced.size!==size);
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const name = declaration.name.getText(ast);
      if ((referenced.has(name) && name !== 'KEEP_ON_ONE_PAGE') || name === 'sanitize') found.constants += `const ${declaration.getText(ast)};\n`;
    }
  }
  return found;
}
const paths = execFileSync('git', ['ls-files','scripts'], {encoding:'utf8'}).trim().split('\n').filter(p => p.endsWith('.mjs'));
const hosts = [];
for (const file of paths) {
  const source = fs.readFileSync(file,'utf8');
  const current = functions(source,file);
  if (!current.renderComposedPdf) continue;
  const oldSource = execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8',maxBuffer:10e6});
  const old = functions(oldSource,file);
  // AST-normalize only the one wrapper; every other byte in the renderer stays identical.
  const ast = ts.createSourceFile(file,current.renderComposedPdf,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  let call;
  function visit(n) { if(ts.isCallExpression(n)&&n.expression.getText(ast)==='courtFacingRows')call=n;ts.forEachChild(n,visit); }
  visit(ast); assert.ok(call,`${file}: shared rule must wrap the composed renderer`);
  const unwrapped=current.renderComposedPdf.slice(0,call.getStart(ast))+call.arguments[0].getText(ast)+current.renderComposedPdf.slice(call.end);
  assert.equal(unwrapped,old.renderComposedPdf,`${file}: no geometry/content/rendering change outside the shared boundary`);
  assert.equal(current.sanitizePdfText,old.sanitizePdfText);
  const restoredSource = source.replace(/^import \{ courtFacingRows \} from [^\n]+\n/m, '').replace(current.renderComposedPdf, old.renderComposedPdf);
  assert.equal(restoredSource, oldSource, `${file}: all non-composed code, including official PDF filling, must be unchanged`);
  hosts.push({file,current,old});
}
assert.ok(hosts.length >= 98);
const deps = {PDFDocument,StandardFonts,rgb,stampDeterministic,stripMarkdownEmphasis,createTokenSplitter,fitsByFontMetrics,assert,courtFacingRows,KEEP_ON_ONE_PAGE:'\uE000PAGE-BREAK\uE000'};
const compile = f => {
  const render = new Function(...Object.keys(deps),`${f.constants}\n${f.helpers}\n${f.sanitizePdfText}\n${f.renderComposedPdf}\nreturn ${f.rendererName ?? "renderComposedPdf"};`)(...Object.values(deps));
  return async (...args) => { try { const output = await (f.rendererName==='renderTextPdf' ? render(args[1],args[0].split('\n')) : render(...args)); return output.bytes ?? output; } catch(error) { error.message = `${f.file}: ${error.message}`; throw error; } };
};
const results = [];
for (const {file,current,old} of hosts) {
  const routeLine='Route: obligation:track-only:DC:dc_correct_misattributed_arrest'+('-wrapped-key'.repeat(12));
  const source=['IN THE COURT','Synthetic participant',...Array.from({length:43},(_,i)=>`Preserved body line ${i}`),'Signature: __________',routeLine,'Clerk of Court — Page 2','Service and order remain unchanged'].join('\n');
  const before=await compile(old)(source,'Synthetic preservation case');
  const after=await compile(current)(source,'Synthetic preservation case');
  if (process.env.TASK53_EVIDENCE_DIR && ['scripts/build-census-v1-dc_seal_nonconviction-set.mjs','scripts/rcap-custom-pleading/composed-family-host.mjs'].includes(file)) {
    fs.mkdirSync(process.env.TASK53_EVIDENCE_DIR, {recursive:true});
    fs.writeFileSync(path.join(process.env.TASK53_EVIDENCE_DIR,path.basename(file)+'.before.pdf'),before);
    fs.writeFileSync(path.join(process.env.TASK53_EVIDENCE_DIR,path.basename(file)+'.after.pdf'),after);
  }
  assert.ok(before instanceof Uint8Array, `${file}: return type ${Object.keys(before ?? {})}`);
  const a=await PDFDocument.load(before),b=await PDFDocument.load(after);
  assert.equal(a.getPageCount(),b.getPageCount());
  let provenance=false;
  for(let i=0;i<a.getPageCount();i++) {
    assert.deepEqual(a.getPage(i).getSize(),b.getPage(i).getSize());
    const expected=extractTextItems(a.getPage(i)).filter(t=>{
      if(/^Route:(?:\s|$)/.test(t.text)) provenance=true;
      if(t.text.startsWith('Clerk of Court')) provenance=false;
      return !provenance;
    });
    assert.equal(JSON.stringify(extractTextItems(b.getPage(i)).filter(t => t.text.trim())),JSON.stringify(expected),`${file}, page ${i+1}: all remaining text and coordinates unchanged`);
  }
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  results.push({file, beforeSha256:sha(before), afterSha256:sha(after), pages:a.getPageCount(), remainingTextAndCoordinatesUnchanged:true});
  const clean=source.replace(routeLine,'Court footer: retain');
  assert.deepEqual(await compile(old)(clean,'Clean case'),await compile(current)(clean,'Clean case'),'unaffected output byte-identical');
}
// The Washington guide wraps with a font-first helper rather than a local
// `wrap` closure. Exercise its actual PDF and preserve all official-fill code.
{
  const file='scripts/build-census-v1-wa_vac_felony-set.mjs';
  const source=fs.readFileSync(file,'utf8');
  const oldSource=execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'});
  assert.equal(source.replace(/^import \{ courtFacingRows \} from [^\n]+\n/m,'').replace('return courtFacingRows(() => lines)(text);','return lines;'),oldSource);
  function load(text) {
    const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const pieces=[];
    for(const n of ast.statements) {
      if(ts.isFunctionDeclaration(n)&&['guidancePdf','wrappedLines'].includes(n.name?.text))pieces.push(n.getText(ast));
      if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(['FAMILY_ID','ROUTE_KEY','FIXED_DATE'].includes(d.name.getText(ast)))pieces.push(`const ${d.getText(ast)};`);
    }
    return new Function(...Object.keys(deps),pieces.join('\n')+'\nreturn {guidancePdf,wrappedLines};')(...Object.values(deps));
  }
  const old=load(oldSource),current=load(source);
  const stops=Array.from({length:40},(_,i)=>`Preserved synthetic guidance ${i}`);
  const before=await old.guidancePdf(stops),after=await current.guidancePdf(stops);
  const a=await PDFDocument.load(before),b=await PDFDocument.load(after);
  assert.equal(a.getPageCount(),b.getPageCount());let provenance=false;
  for(let i=0;i<a.getPageCount();i++) {
    assert.deepEqual(a.getPage(i).getSize(),b.getPage(i).getSize());
    const expected=extractTextItems(a.getPage(i)).filter(t=>{if(t.text.startsWith('Route:'))provenance=true;return !provenance;});
    assert.deepEqual(extractTextItems(b.getPage(i)).filter(t=>t.text.trim()),expected);
  }
  const font=(await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  assert.deepEqual(current.wrappedLines(await font,'Court footer: Page 1',11,300),old.wrappedLines(await font,'Court footer: Page 1',11,300));
  const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
  results.push({file,beforeSha256:sha(before),afterSha256:sha(after),pages:a.getPageCount(),remainingTextAndCoordinatesUnchanged:true});
}
if (process.env.TASK53_EVIDENCE_DIR) fs.writeFileSync(path.join(process.env.TASK53_EVIDENCE_DIR,'regression-evidence.json'), JSON.stringify({baseline, syntheticCases:true, unchangedInputBytesPreserved:true, officialFillCodeUnchanged:true, approvalsIssued:false, results},null,2)+'\n');
console.log(`PASS: ${results.length} composed adapters preserve renderer logic; all adapter PDFs preserve text, coordinates, page count and clean bytes.`);
