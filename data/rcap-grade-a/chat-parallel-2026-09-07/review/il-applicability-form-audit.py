#!/usr/bin/env python3
"""Read-only actual IL individual-form audit. No complete packet is generated.
Requires PyMuPDF and the co-located al-ssn-independent-audit.py review utility.
The metadata emitted by the author is checked against source fields and actual
form bytes rather than adopted as a test pass. Visual examination is separate.
"""
import argparse, importlib.util, json, hashlib, re
from pathlib import Path
from collections import Counter,defaultdict
import fitz
p=argparse.ArgumentParser();p.add_argument('--candidate',type=Path,required=True);p.add_argument('--sources',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('existing_readonly_evidence',Path(__file__).with_name('al-ssn-independent-audit.py'));lib=importlib.util.module_from_spec(spec);spec.loader.exec_module(lib)
sha=lambda b:hashlib.sha256(b).hexdigest()
SOURCES={
'EXP-AD Request':('IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf','44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853',6),
'EXP-AD Order Granting':('IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf','52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305',2),
'FW-CIV-APPLICATION':('IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf','b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5',4)}
root=a.candidate/'data/rcap-grade-a/chat-parallel-2026-09-07/build/il-applicability-repair';forms=root/'forms'
meta=json.loads((forms/'form-tests.json').read_text());assert len(meta['forms'])==10
watched=[x for x in a.candidate.rglob('*') if x.is_file()]+[a.sources/x[0] for x in SOURCES.values()]
before={str(x):sha(x.read_bytes()) for x in watched}
sourceDocs={};catalog={};sourceRows=[]
for id,(fn,pin,n) in SOURCES.items():
 raw=(a.sources/fn).read_bytes();assert sha(raw)==pin;d=fitz.open(stream=raw,filetype='pdf');assert len(d)==n;sourceDocs[id]=d;cat={}
 for i,pg in enumerate(d):
  for w in pg.widgets():cat.setdefault(w.field_name,{'page':i+1,'rect':list(w.rect),'type':w.field_type_string})
 catalog[id]=cat;sourceRows.append({'id':id,'sha256Measured':pin,'bytes':len(raw),'pages':len(d),'fieldNames':len(cat)})
packets=[];textchecks=[];glyphchecks=[];aliases=defaultdict(list)
for m in meta['forms']:
 raw=(forms/m['file']).read_bytes();assert sha(raw)==m['sha256'] and len(raw)==m['byteLength'];d=fitz.open(stream=raw,filetype='pdf');assert len(d)==m['pages']
 cat=catalog[m['sourceId']];partition=Counter(w['fieldName'] for w in m['writes']+m['refusals'])
 assert set(partition)==set(cat) and all(n==1 for n in partition.values())
 assert all(w['page']==cat[w['fieldName']]['page'] for w in m['writes']+m['refusals'])
 counts=Counter();seen=[]
 for w in m['writes']:
  c=cat[w['fieldName']]
  if c['type'] not in ('Text','ComboBox'):continue
  actual=lib.added_text(d[c['page']-1],sourceDocs[m['sourceId']][c['page']-1],fitz.Rect(c['rect'])+(-1,-1,1,1));expected=w['drawnText']
  ok=lib.normal(actual)==lib.normal(expected);textchecks.append({'file':m['file'],'field':w['fieldName'],'page':c['page'],'expected':expected,'observed':actual,'matches':ok})
 for i,pg in enumerate(d):
  src=sourceDocs[m['sourceId']][i];gs=lib.glyphs(src);missing=lib.glyph_compare(gs,lib.glyphs(pg));assert tuple(src.rect)==tuple(pg.rect)
  glyphchecks.append({'file':m['file'],'page':i+1,'sourceGlyphs':len(gs),'missingOrMoved':missing})
  out=a.out/'pages'/Path(m['file']).stem/f'page-{i+1:03}.png';out.parent.mkdir(parents=True,exist_ok=True);pg.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).save(out)
  aliases[sha(out.read_bytes())].append(str(out.relative_to(a.out)))
 if m['sourceId']=='EXP-AD Request':
  education=[r for r in m['refusals'] if r['fieldName'].startswith('22 -')];assert len(education)==1 and education[0]['noAutomaticAttestation'];counts['unassertedEducation']=1
  assert next(w for w in m['writes'] if w['fieldName']=='4 - Outcome - 1')['drawnText']=='FC'
 if m['sourceId']=='FW-CIV-APPLICATION':
  hardship=next(r for r in m['refusals'] if r['fieldName']=='107-110 - Hardship');assert hardship['requiredBeforeFiling'] is False
  fin=next(r for r in m['refusals'] if r['fieldName']=='19 - My Employment Total');assert fin['requiredBeforeFiling']==(m['status']!='qualifying')
  counts['optionalHardship']=1;counts['financialApplicability']=1
 emails=[w for w in m['writes'] if 'email' in w['fieldName'].lower()];assert len(emails)==(0 if m['fixture']=='boundary' else 1)
 # Every complete boundary form has absent email, not an invented address.
 if m['fixture']=='boundary':
  for name,c in cat.items():
   if 'email' in name.lower() and c['type']=='Text':
    val=lib.added_text(d[c['page']-1],sourceDocs[m['sourceId']][c['page']-1],fitz.Rect(c['rect']));assert val==''
 packets.append({'file':m['file'],'sourceId':m['sourceId'],'fixture':m['fixture'],'benefitStatus':m['status'],'sha256Measured':sha(raw),'gitBlobMeasured':lib.blob(raw),'bytes':len(raw),'pages':len(d),'writes':len(m['writes']),'refusals':len(m['refusals']),'dispositionChecks':sum(partition.values()),'specificChecks':dict(counts)})
 d.close()
assert before=={str(x):sha(x.read_bytes()) for x in watched}
result={'schemaVersion':'chatb-il-individual-form-measurements/v1','scope':'Ten complete individual forms, NOT a complete packet, no renderer rerun or missing-order source supplied. Map partition/text/glyph matches do not automatically establish visual quality or legal truth.','sources':sourceRows,'forms':packets,'textChecks':textchecks,'sourceGlyphChecks':glyphchecks,'pngAliases':dict(sorted(aliases.items())),'inputsUnchanged':len(watched),'summary':{'individualForms':len(packets),'formPages':sum(x['pages'] for x in packets),'uniqueFullPngs':len(aliases),'extraExactAliases':40-len(aliases),'sourceFieldDispositions':sum(x['dispositionChecks'] for x in packets),'declaredTextWritesCompared':len(textchecks),'declaredTextMismatches':sum(not x['matches'] for x in textchecks),'nativeSourceGlyphsCompared':sum(x['sourceGlyphs'] for x in glyphchecks),'nativeSourceGlyphMismatches':sum(len(x['missingOrMoved']) for x in glyphchecks),'fullPacketBuilds':0}}
(a.out/'measurements.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['summary'],indent=2))
for x in sourceDocs.values():x.close()
