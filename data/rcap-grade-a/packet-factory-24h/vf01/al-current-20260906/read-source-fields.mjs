// Independent source-byte inventory. Does not invoke the packet builder or finalizer.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require=createRequire(`${process.cwd()}/package.json`);
const {PDFDocument}=require('pdf-lib');
const root='/home/codespace/.local/share/legalease/private/source-imports/restart-recovered-20260906';
const sources=[['CR-65','LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf'],['C-10-CRIMINAL','STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf']];
const output=[];
for(const [documentId,relativePath] of sources){
 const file=`${root}/${relativePath}`,bytes=fs.readFileSync(file),pdf=await PDFDocument.load(bytes),pages=pdf.getPages();
 const fields=pdf.getForm().getFields().map(f=>({name:f.getName(),type:f.constructor.name,widgets:f.acroField.getWidgets().map(w=>({page:pages.findIndex(p=>p.ref.toString()===w.P()?.toString())+1,rect:w.getRectangle()}))}));
 output.push({documentId,path:file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),byteLength:bytes.length,pageCount:pages.length,pages:pages.map(p=>({width:p.getWidth(),height:p.getHeight()})),fields});
}
fs.writeFileSync('data/rcap-grade-a/packet-factory-24h/vf01/al-current-20260906/source-fields.json',JSON.stringify({method:'pdf-lib AcroForm inventory freshly read from recovered hash-bound original bytes',sources:output},null,1)+'\n');
console.log(JSON.stringify(output.map(s=>({documentId:s.documentId,sha256:s.sha256,pages:s.pageCount,fields:s.fields.length,widgets:s.fields.reduce((n,f)=>n+f.widgets.length,0),unknownWidgetPages:s.fields.flatMap(f=>f.widgets).filter(w=>w.page===0).length}))));
