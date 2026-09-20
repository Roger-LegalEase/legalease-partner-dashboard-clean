import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {measureSavedComposedPacket} from './build-census-v1-composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief.mjs';
const dir='data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-il-identity-controls-'));
let passed=0;
const check=(condition,message)=>{assert.ok(condition,message);passed++;};
for(const fixture of ['canonical','boundary']) {
  const file=`${dir}/fixtures/${fixture}.pdf`,bytes=fs.readFileSync(file);
  const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}).replace(/\s+/g,' ');
  const measured=measureSavedComposedPacket(file);
  check(/CERTIFICATION UNDER 735 ILCS 5\/1-109/.test(text),'certification title');
  check(/I certify that the statements set forth in this petition are true and correct/.test(text),'actual certification');
  check(/except as to matters stated to be on information and belief/.test(text),'certification qualification');
  check(!/committed|compiled profile|participant_packet|obligation:runtime-only|\[C[345] -/i.test(text),'no internal prose or unrelated required questions');
  check(/chief judge/.test(text)&&/identity-theft report/.test(text)&&/identifier evidence/.test(text),'destination and supporting documents');
  check(/fee-waiver procedure/.test(text)&&!/a filing you cannot pay for is a filing you cannot make/.test(text),'truthful fee handoff');
  check(measured.glyphsMeasured>0&&measured.pages.every(p=>p.glyphsMeasured>0),'actual glyph measurement on every page');
  check(measured.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes===0,'current layout within measured box');
  check(measured.protectedBlankRegions.length===3&&measured.refusedFieldsWithInk.length===0,'all three unsigned/court-owned regions blank');
  for(const region of measured.protectedBlankRegions){
    const doc=await PDFDocument.load(bytes),font=await doc.embedFont(StandardFonts.TimesRoman),page=doc.getPage(region.page-1);
    page.drawText('X',{x:region.bbox[0]+4,y:page.getHeight()-region.bbox[3]+4,size:11,font});
    const mutant=path.join(scratch,`${fixture}-${region.label.replaceAll(' ','-')}.pdf`);fs.writeFileSync(mutant,await doc.save());
    check(measureSavedComposedPacket(mutant).refusedFieldsWithInk.length>0,`reject ink in ${region.label}`);
  }
  const doc=await PDFDocument.load(bytes),font=await doc.embedFont(StandardFonts.TimesRoman);
  doc.getPage(0).drawText('CLIPPED',{x:1,y:10,size:11,font});
  const mutant=path.join(scratch,`${fixture}-outside.pdf`);fs.writeFileSync(mutant,await doc.save());
  check(measureSavedComposedPacket(mutant).nonWhitespaceGlyphsOutsideMeasuredWriteBoxes>0,'reject outside-content glyphs');
}
const guide=fs.readFileSync(`${dir}/participant-instructions.md`,'utf8');
check(!/committed|compiled|participant_packet|obligation:|fact_q[345]|cannot make/i.test(guide),'clean participant guidance');
check(/No notary is required/.test(guide),'correct certification signing handoff');
console.log(JSON.stringify({passed,failed:0,negativeControls:8,scratch}));
