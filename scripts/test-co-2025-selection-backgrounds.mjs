// CO JDF 612/615 2025 lineage: preserve source control paint without changing the default sanitizer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=process.cwd(), require=createRequire(root+'/package.json');
const {PDFDocument,PDFName,PDFDict}=require('pdf-lib'), sharp=require('sharp');
const helperUrl=pathToFileURL(root+'/scripts/rcap-official-forms/rcap-active-content.mjs').href;

const {sanitizeAndFlatten,scanBytesForActiveContent}=await import(helperUrl);
const input=fs.readFileSync('reference/co-jdf-2025-07-01/JDF612.pdf');
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(input),'4a45070b9332e73ddbb3ec9cb8d326b707589856d3104b8ab7d9ab991d9d496b');
const out=process.env.CO_SELECTION_TEST_OUTPUT ?? fs.mkdtempSync(path.join(os.tmpdir(),'co-selected-backgrounds-'));fs.mkdirSync(out,{recursive:true});
const reference=await PDFDocument.load(input,{updateMetadata:false});reference.getForm().getCheckBox('3D.0').check();
const widgetRect=reference.getForm().getCheckBox('3D.0').acroField.getWidgets()[0].getRectangle();
fs.writeFileSync(out+'/source.pdf',await reference.save({useObjectStreams:false,updateFieldAppearances:false}));
const variants={};
for(const variant of ['default','disabled','enabled']){
 const pdf=await PDFDocument.load(input,{updateMetadata:false});const field=pdf.getForm().getCheckBox('3D.0');field.check();
 pdf.addJavaScript('regression-action','app.alert("must be removed")');
 const widgets=field.acroField.getWidgets();
 const options={writtenFields:new Set(['3D.0']),preserveUnwrittenSelectionBackgrounds:true,suppressSynthesizedAppearances:true,fitAppearancesToRect:true,normalizeInvertedWidgetRects:true};
 if(variant!=='default')options.preserveWrittenSelectionBackgrounds=variant==='enabled';
 const {clean,report}=await sanitizeAndFlatten(pdf,options);
 clean.setCreationDate(new Date('2026-10-21T00:00:00Z'));clean.setModificationDate(new Date('2026-10-21T00:00:00Z'));
 const bytes=Buffer.from(await clean.save({useObjectStreams:false}));const active=scanBytesForActiveContent(bytes);
 assert(active.inspectable);assert.deepEqual(active.hits,[]);assert.equal(clean.getForm().getFields().length,0);
 for(const widget of widgets){const mk=widget.dict.lookup(PDFName.of('MK'));assert(!(mk instanceof PDFDict)||mk.get(PDFName.of('BG'))===undefined);}
 assert.equal(report.widgetContributions.sourceSelectionBackgroundsPreserved?.includes('3D.0')??false,variant==='enabled');
 fs.writeFileSync(out+'/'+variant+'.pdf',bytes);variants[variant]={sha256:sha(bytes),activeContentRemoved:true,fieldsRemaining:0};
}
assert.equal(variants.default.sha256,variants.disabled.sha256);
const rasters={};
for(const variant of ['source','disabled','enabled']){
 const result=spawnSync('pdftoppm',['-f','2','-l','2','-singlefile','-r','300','-png',out+'/'+variant+'.pdf',out+'/'+variant],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 rasters[variant]=await sharp(out+'/'+variant+'.png').removeAlpha().raw().toBuffer({resolveWithObject:true});
}
const scale=300/72,box={x:Math.floor((widgetRect.x-1)*scale),y:Math.floor((792-widgetRect.y-widgetRect.height-1)*scale),w:Math.ceil((widgetRect.width+2)*scale),h:Math.ceil((widgetRect.height+2)*scale)};
const delta=name=>{const a=rasters.source,b=rasters[name];assert.deepEqual(a.info,b.info);let changed=0;for(let y=box.y;y<box.y+box.h;y++)for(let x=box.x;x<box.x+box.w;x++){const i=(y*a.info.width+x)*a.info.channels;if([...Array(a.info.channels).keys()].some(k=>Math.abs(a.data[i+k]-b.data[i+k])>24))changed++;}return changed;};
const disabledDelta=delta('disabled'),enabledDelta=delta('enabled');assert(disabledDelta>0);assert.equal(enabledDelta,0);
const result={status:'PASS',sourceSha256:sha(input),variants,disabledDelta,enabledDelta,box};
fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
