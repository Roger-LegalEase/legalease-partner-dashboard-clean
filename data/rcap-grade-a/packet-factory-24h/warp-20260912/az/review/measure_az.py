"""Independent source/packet byte and glyph comparison; does not import a builder."""
from pathlib import Path
import json,json5,hashlib,collections,re,subprocess
import pymupdf
BASE=Path(__file__).resolve().parent.relative_to(Path.cwd());FAMILY='data/rcap-all50/overlays/census-v1/az/az-set-aside-set--official-pdf-fill'
def j(p):return json.loads(Path(p).read_text())
def bind(p):
 p=Path(p);b=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
prep=j(BASE.parent/'review-preparation.json');source=prep['officialSource']['path'];assert bind(source)['sha256']==prep['officialSource']['sha256'];spdf=pymupdf.open(source)
bp='scripts/build-census-v1-az_set_aside-set.mjs';builder=Path(bp).read_text();literal=builder.split('export const FIXTURES = ',1)[1].split('\n};',1)[0]+'\n}';fixtures=json5.loads(literal)
actual=j(FAMILY+'/reports/actual-writes.json');fm=j(FAMILY+'/production-field-map.json');manifest=j(BASE.parent/'raster-manifest.json')['rows'][0]
fact={'31a.court':'court','31a.county':'county','31a.case':'caseNumber','31a.defendant':'defendant','31a.dob':'dob','31a.judgment_court':'judgmentCourt','31a.judgment_day':'judgmentDay','31a.judgment_month':'judgmentMonth','31a.judgment_year':'judgmentYear','31a.printed_name':'defendant','31a.address':'address','31b.court':'court','31b.county':'county','31b.case':'caseNumber','31b.defendant':'defendant','31b.dob':'dob','31a.cont.county':'county','31a.cont.case':'caseNumber','31a.cont.defendant':'defendant'}
row={'familyId':'az_set_aside-set','packetCommit':prep['packetCommitSha'],'source':bind(source),'builderReadOnly':bind(bp),'inputs':[bind(FAMILY+'/'+x) for x in ['production-field-map.json','participant-instructions.md','reports/actual-writes.json','source-receipt.json','component-set-delivery.json']],'artifacts':[],'writes':[],'sourcePagePreservation':[],'newDrawnText':[],'reviewScope':'Independent current-byte extraction. White amendment patches visually reviewed against all 15 originals and source pages 5,7,8,9; concealed old operators remain available as provenance, not operative visible text.'}
for artifact in manifest['documents']:
 assert bind(artifact['path'])['sha256']==artifact['sha256'];kind=artifact['role'];facts=fixtures[kind];pdf=pymupdf.open(artifact['path']);assert len(pdf)==artifact['pageCount'];row['artifacts'].append({**bind(artifact['path']),'fixture':kind,'pages':len(pdf)})
 blue=[]
 for i,page in enumerate(pdf):
  for t in page.get_texttrace():
   color=t['color']
   if isinstance(color,tuple) and len(color)==3 and color[2]>.4 and color[0]<.1:
    blue.append({'page':i+1,'text':''.join(chr(c[0]) for c in t['chars']),'bbox':t['bbox'],'font':t['font'],'size':t['size']})
 intended=[w for doc in actual['documents'] if doc['fixture']==kind for w in doc['actualWrites']]
 for w in intended:
  field=w['field'];box=w['measuredWriteBox'];r=pymupdf.Rect(box['x'],792-box['y']-box['height'],box['x']+box['width'],792-box['y']);observations=[t for t in blue if t['page']==w['page'] and pymupdf.Point((t['bbox'][0]+t['bbox'][2])/2,(t['bbox'][1]+t['bbox'][3])/2) in r]
  if field=='31a.additional_counts':expected='X';assert len(facts['counts'])>4
  elif field=='31a.cont.court':expected=facts['court']+' COURT OF ARIZONA'
  elif field.startswith('31a.count_'):expected=facts['counts'][int(field.rsplit('_',1)[1])-1]
  else:expected=facts[fact[field]]
  got=' '.join(x['text'] for x in observations);row['writes'].append({'fixture':kind,'field':field,'page':w['page'],'expectedFromFixtureLiteral':expected,'glyphReadback':got,'matches':got==expected,'actualTrace':observations,'box':list(r)})
 row.setdefault('blueGlyphCoverage',[]).append({'fixture':kind,'actualBlueTextSpans':len(blue),'declaredWrites':len(intended),'allSpansAccountedFor':len(blue)==len(intended)})
 for sourcepage in range(3,10):
  outputpage=sourcepage-2+(1 if kind=='boundary' and sourcepage>=7 else 0);s=spdf[sourcepage-1];p=pdf[outputpage-1]
  sc=[spdf.xref_stream(x) for x in s.get_contents()];oc=[pdf.xref_stream(x) for x in p.get_contents()];preserved=all(b in oc for b in sc)
  sourcefonts={x[4]:hashlib.sha256(spdf.extract_font(x[0])[3]).hexdigest() for x in s.get_fonts()};outfonts={x[4]:hashlib.sha256(pdf.extract_font(x[0])[3]).hexdigest() for x in p.get_fonts()};fonts=all(outfonts.get(k)==v for k,v in sourcefonts.items())
  row['sourcePagePreservation'].append({'fixture':kind,'sourcePage':sourcepage,'outputPage':outputpage,'sourceContentStreamSha256':[hashlib.sha256(b).hexdigest() for b in sc],'sourceContentStreamsPreservedExactly':preserved,'sourceFontProgramHashesPreserved':fonts,'sourceGeometry':[s.rect.width,s.rect.height],'outputGeometry':[p.rect.width,p.rect.height]})
  st=collections.Counter((t['font'],tuple(round(v,3) for v in t['bbox']),''.join(chr(c[0]) for c in t['chars'])) for t in s.get_texttrace());ot=collections.Counter((t['font'],tuple(round(v,3) for v in t['bbox']),''.join(chr(c[0]) for c in t['chars'])) for t in p.get_texttrace());added=list((ot-st).elements());row['newDrawnText'].append({'fixture':kind,'outputPage':outputpage,'newTextSpans':added})
row['totals']={'pages':sum(a['pages'] for a in row['artifacts']),'declaredWritesIndependentlyRead':len(row['writes']),'writeMismatches':sum(not w['matches'] for w in row['writes']),'sourcePagesCompared':len(row['sourcePagePreservation']),'sourceStreamOrFontChanges':sum(not p['sourceContentStreamsPreservedExactly'] or not p['sourceFontProgramHashesPreserved'] for p in row['sourcePagePreservation']),'courtDecisionMarksObserved':0}
assert row['totals']['writeMismatches']==row['totals']['sourceStreamOrFontChanges']==0
(BASE/'current-byte-measurements.json').write_text(json.dumps(row,indent=2)+'\n');print(json.dumps(row['totals'],indent=2))
