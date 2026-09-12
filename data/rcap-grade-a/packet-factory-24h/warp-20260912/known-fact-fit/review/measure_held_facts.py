"""Independent intended-write census, fixture readback and old-failure negative controls."""
import json,re,hashlib,subprocess
from pathlib import Path
import pymupdf as pdf
from PIL import Image
BASE=Path(__file__).resolve().parent.relative_to(Path.cwd());OLD=Path('data/rcap-grade-a/packet-factory-24h/seven-cleared-20260911/review');RUN='34662168673'
TARGETS={'nm_conviction-set':[('NM-4-953','p4-y11004-x7200'),('NM-4-960','p2-y55524-x7200')],'nm_identity_theft-set':[('NM-4-951','p3-y68964-x7200')],'nm_release_without_conviction-set':[('NM-4-952','p4-y57924-x7200'),('NM-4-959','p2-y63444-x7200')],'co_motion_seal_conviction-set':[('JDF-205','Email')]}
def j(p):return json.loads(Path(p).read_text())
def b(p):p=Path(p);bs=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(bs).hexdigest(),'byteLength':len(bs)}
def norm(s):return re.sub(r'\s+','',str(s)).replace('’',"'")
for family,targets in TARGETS.items():
 m=j(BASE/f'measurements-{family}.json')['rows'][0];d=Path(m['directory']);fm=j(d/'production-field-map.json');act=j(d/'reports/actual-writes.json');builder=Path('scripts')/f'build-census-v1-{family}.mjs';decl=builder.read_text().split('const FIXTURES = {',1)[1].split('\n};',1)[0];facts={}
 for kind in ['canonical','boundary']:
  block=re.split(r'\b'+kind+r':\s*(?:compose\()?\{',decl,maxsplit=1)[1].split('}',1)[0];f=dict(re.findall(r'"([^"]+)"\s*:\s*"([^"]*)"',block));f['participant.full_mailing_address']=f"{f['participant.street_address']}, {f['participant.city']}, {f['participant.state']} {f['participant.zip']}";f['participant.city_state_zip']=f"{f['participant.city']}, {f['participant.state']} {f['participant.zip']}"
  if 'matter.court' in f:f['matter.fee_waiver_court_caption']=f['matter.court']+' Judicial District'
  facts[kind]=f
 evidence={'familyId':family,'fixtureDeclaration':b(builder),'fixtureFactsReadWithoutExecutingBuilder':facts,'intendedWrites':[],'repairedFields':[],'refusedHeldFacts':[],'unfittable':[]}
 for mapdoc in fm['maps']:
  docid=mapdoc['documentId']
  for kind in ['canonical','boundary']:
   ad=next(x for x in act['documents'] if x['fixture']==kind and x.get('documentId',x.get('formNumber'))==docid);measured=next(x for x in m['artifacts'] if x['fixture']==kind);pd=pdf.open(measured['path']);raster=j(BASE/f'{family}-{RUN}-original-raster-measurements.json')
   evidence['refusedHeldFacts'] += [x for x in mapdoc[kind+'Refusals'] if x.get('theBuildHoldsAValueForThisBlank') or x.get('completenessDisposition')=='KNOWN_FACT_NOT_WRITTEN'];evidence['unfittable']+=ad.get('unfittable',[])
   for intended in mapdoc[kind+'Writes']:
    if intended.get('kind')=='selection_settled_by_route':
     assert docid=='NM-4-222' and intended['field']=='NM-4-222/p4-y33222-x28800' and intended['selected'] is True and len(ad['routeDeterminedSelectionMarksReportedByFinalizer'])==1 and not ad['routeDeterminedSelectionMarksRefusedByFinalizer'];continue
    field=intended['field'].removeprefix(docid+'/');found=[w for w in ad['actualWrites'] if w['field']==field];assert found,(family,docid,kind,field,'intended write absent')
    for w in found:
     expected=facts[kind][w['factId']]
     if docid=='JDF-205' and field=='DoB':yy,mm,dd=expected.split('-');expected=f'{dd}/{mm}/{yy}'
     match=next(x for x in measured['writeMeasurements'] if x['documentId']==docid and x['field']==field and x['rect']==w['rect']);assert norm(expected) in norm(match['read']),(family,docid,kind,field,expected,match['read'])
     evidence['intendedWrites'].append({'fixture':kind,'document':docid,'field':field,'factId':w['factId'],'independentlyDerivedExpected':expected,'readFromPdf':match['read'],'page':match['page'],'matches':True})
     if kind=='boundary' and (docid,field) in targets:
      page=pd[match['page']-1];r=w['rect'];clip=pdf.Rect(r['x']-2,page.rect.height-r['y']-r['height']-2,r['x']+r['width']+2,page.rect.height-r['y']+2);spans=[s for block in page.get_text('dict',clip=clip)['blocks'] if 'lines' in block for line in block['lines'] for s in line['spans'] if norm(expected) in norm(s['text'])];assert len(spans)==1,(family,field,spans);s=spans[0];assert s['font']=='Times-Roman' and s['size']>=6
      oldbs=subprocess.check_output(['git','show','eb34d1b47:'+measured['path']]);oldpdf=pdf.open(stream=oldbs,filetype='pdf');oldread=oldpdf[match['page']-1].get_textbox(clip);assert norm(expected) not in norm(oldread)
      page_row=next(x for x in raster['pages'] if x['kind']=='boundary' and x['page']==match['page']);im=Image.open(page_row['extractedPath']);p=page_row['paper'];scale=page_row['pxPerPt'];crop=[max(p['x0'],int(p['x0']+(clip.x0-18)*scale)),max(p['y0'],int(p['y0']+(clip.y0-18)*scale)),min(p['x1']+1,int(p['x0']+(clip.x1+18)*scale)),min(p['y1']+1,int(p['y0']+(clip.y1+18)*scale))];focus=BASE/f'{family}-{docid}-{field}-repaired-field.png';im.crop(crop).save(focus)
      measuredwidth=pdf.get_text_length(expected,fontname='Times-Roman',fontsize=s['size']);evidence['repairedFields'].append({'document':docid,'field':field,'page':match['page'],'expected':expected,'read':match['read'],'sourceWriteRectangle':r,'actualSpan':s,'independentTimesRomanWidthPt':measuredwidth,'fitsWidthWithoutHorizontalScaling':measuredwidth<=r['width'],'fontAtOrAboveSixPointFloor':s['size']>=6,'oldPdfSha256':hashlib.sha256(oldbs).hexdigest(),'oldExactFieldRead':oldread,'oldFailureNegativeControl':True,'currentPdf':{k:measured[k] for k in ['path','sha256','byteLength']},'originalRasterPageSha256':page_row['pngSha256'],'originalRasterFocus':b(focus)})
 assert not evidence['refusedHeldFacts'] and not evidence['unfittable'];assert len(evidence['repairedFields'])==len(targets)
 evidence['totals']={'intendedWritesMatchedToVisibleExactFacts':len(evidence['intendedWrites']),'formerlyMissingFactsNowPresent':len(evidence['repairedFields']),'heldFactsStillRefused':0,'unfittableWrites':0};(BASE/f'held-fact-measurements-{family}.json').write_text(json.dumps(evidence,indent=2)+'\n');print(family,evidence['totals'])
