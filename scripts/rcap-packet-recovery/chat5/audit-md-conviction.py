#!/usr/bin/env python3
"""Author-only complete-PDF audit for exact Maryland 072B/089/MDJ-008 output.
Actual glyphs, source-word positions, selections, protected pixels and all pages.
Does not replace the shared completeness importer or independent review.
"""
import argparse, collections, hashlib, json, pathlib, re, tempfile
import fitz
import numpy as np
OUT='data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill'
def digest(b):return hashlib.sha256(b).hexdigest()
def norm(s):return re.sub(r'\s+','',s)
def rect(w,h=792):
 r=w['rect'];return fitz.Rect(r['x'],h-r['y']-r['height'],r['x']+r['width'],h-r['y'])
def pix(p):
 x=p.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csGRAY,alpha=False);return np.frombuffer(x.samples,dtype=np.uint8).reshape(x.height,x.width)
def chars(p):
 return [{'c':chr(c[0]),'box':fitz.Rect(c[3])} for s in p.get_texttrace() if s['font']=='Helvetica' for c in s['chars']]
def word_vector(p):return collections.Counter((round(w[0],1),round(w[1],1),round(w[2],1),round(w[3],1),w[4]) for w in p.get_text('words') if not (w[4]=='Reset' and any((q.rect+(-2,-2,2,2)).contains(fitz.Rect(w[:4])) for q in (p.widgets() or []) if q.field_type_string=='Button')))
def inspect(pdf,report,census,sources):
 d=fitz.open(pdf);errors=[];writes=[];checks=[];protected=[];words=0
 if len(d)!=report['output']['pageCount']:errors.append('complete page count changed')
 if len(d)!=len(report['pageManifest']):errors.append('page manifest changed')
 for i,desc in enumerate(report['pageManifest'][:len(d)]):
  p=d[i]
  if list(p.widgets() or []):errors.append('interactive widget remains')
  if list(p.annots() or []):errors.append('annotation remains')
  id=desc['documentId']
  if id=='participant-instructions':
   for block in p.get_text('dict')['blocks']:
    for line in block.get('lines',[]):
     for s in line['spans']:
      if not (p.rect+(-.5,-.5,.5,.5)).contains(fitz.Rect(s['bbox'])):errors.append('guide out of bounds')
      if s['size']<7.99:errors.append('guide text below 8 points')
   continue
  source=sources[id][desc['sourcePage']-1];sp=desc['sourcePage'];new=chars(p);allowed=[]
  for w in report['writes']:
   if w['documentId']!=id or w['kind']!='text':continue
   for widget in w['widgets']:
    if widget['page']!=sp:continue
    r=rect(widget,p.rect.height);allowed.append(r)
    text=''.join(c['c'] for c in new if r.contains(fitz.Point((c['box'].x0+c['box'].x1)/2,(c['box'].y0+c['box'].y1)/2)))
    ok=norm(text)==norm(w['value']);writes.append({'page':i+1,'document':id,'field':w['field'],'expected':w['value'],'actual':text,'pass':ok})
    if not ok:errors.append(f"p{i+1} missing/wrong actual write: {w['field']}: {text!r}")
  outside=[c['c'] for c in new if c['c'].strip() and not any((r+(-.6,-.6,.6,.6)).contains(c['box']) for r in allowed)]
  if outside:errors.append(f'p{i+1} {len(outside)} glyphs outside allowed source rectangles')
  # Source text integrity is checked independently of output-map declarations.
  lost=word_vector(source)-word_vector(p)
  if lost:errors.append(f'p{i+1} missing/moved source words: '+repr(list(lost.items())[:8]))
  words+=sum(word_vector(source).values())
  before=pix(source);after=pix(p)
  selected={w['field'] for w in report['writes'] if w['documentId']==id and w['kind']=='checkbox'}
  byfield={b['field']:b for b in report['blanks'] if b['documentId']==id}
  for f in census[id]:
   for widget in f['widgets']:
    if widget['page']!=sp:continue
    r=rect(widget);x0,y0,x1,y1=[round(x*2) for x in r];a=before[y0:y1,x0:x1];b=after[y0:y1,x0:x1]
    added=int(((b<100)&(a>180)).sum())
    if f['type']=='PDFCheckBox':
     ok=added>=8 if f['field'] in selected else added==0
     checks.append({'page':i+1,'document':id,'field':f['field'],'expectedSelected':f['field'] in selected,'addedDarkPixels':added,'pass':ok})
     if not ok:errors.append(f"p{i+1} wrong visible selection {f['field']} {added}")
    if byfield.get(f['field'],{}).get('completenessClass')=='court_or_execution_owned':
     ok=added==0;protected.append({'page':i+1,'document':id,'field':f['field'],'addedDarkPixels':added,'pass':ok})
     if not ok:errors.append(f"p{i+1} protected ink: {f['field']}")
  if id=='CC-DC-089' and sp==3:
   # Entire judicial findings/order block below identifying caption is immutable.
   equal=np.array_equal(before[round(300*2):round(700*2),round(100*2):round(583*2)],after[round(300*2):round(700*2),round(100*2):round(583*2)])
   if not equal:errors.append('089 complete judicial area changed')
 # Check whole packet carries all disclosed missing facts, not just reports.
 whole='\n'.join(p.get_text() for p in d)
 for b in report['requiredBeforeFiling']:
  if norm(b.get('displayLabel') or b.get('field') or b['label']) not in norm(whole):errors.append('missing disclosure '+(b.get('displayLabel') or b.get('field') or b['label']))
 return {'sha256':digest(pathlib.Path(pdf).read_bytes()),'pages':len(d),'writes':writes,'checkboxes':checks,'protected':protected,'sourceWordsChecked':words,'errors':errors,'passed':not errors}
def main():
 a=argparse.ArgumentParser();a.add_argument('--root',default='.');a.add_argument('--out');a.add_argument('--evidence',required=True);o=a.parse_args();root=pathlib.Path(o.root).resolve();out=pathlib.Path(o.out) if o.out else root/OUT;dest=pathlib.Path(o.evidence);dest.mkdir(parents=True,exist_ok=True)
 census=json.loads((out/'official-field-census.json').read_text());receipt=json.loads((out/'source-receipt.json').read_text());src={k:fitz.open(root/v['path']) for k,v in receipt['sourceCatalog'].items()}
 for k,v in receipt['sourceCatalog'].items():assert digest((root/v['path']).read_bytes())==v['sha256']
 index=json.loads((out/'reports/rendered-artifacts.json').read_text())['pdfs'];results=[];inventory=[];seen={};pages=dest/'pages';pages.mkdir(exist_ok=True)
 for r in index:
  p=out/'fixtures'/(r['fixture']+'.pdf');report=json.loads((out/'reports'/(r['fixture']+'.json')).read_text());assert digest(p.read_bytes())==r['sha256'];m=inspect(p,report,census,src);m['fixture']=r['fixture'];results.append(m)
  for i,page in enumerate(fitz.open(p)):
   png=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).tobytes('png');h=digest(png);name=r['fixture'].replace('/','--')+f'-p{i+1:02}.png'
   if h not in seen:(pages/name).write_bytes(png);seen[h]=name
   inventory.append({'fixture':r['fixture'],'page':i+1,'pngSha256':h,'representative':seen[h]})
 negatives=[]
 with tempfile.TemporaryDirectory(prefix='chat5-conviction-controls-') as td:
  for name in ['agency_caption_overlap','erase_name','signature','judge_findings','missing_089_order','missing_notice','wrong_basis','out_of_bounds','wrong_notice_reason','paid_has_waiver','invisible_fee_name']:
   fixture='selectable/misdemeanor-waiver' if name in ['judge_findings','missing_089_order','missing_notice','wrong_notice_reason','invisible_fee_name'] else 'canonical';report=json.loads((out/'reports'/(fixture+'.json')).read_text());d=fitz.open(out/'fixtures'/(fixture+'.pdf'))
   if name=='agency_caption_overlap':d[0].insert_text((158,225),'Westminster Police Department',fontsize=10)
   elif name=='erase_name':d[0].add_redact_annot(fitz.Rect(342,113,502,126),fill=(1,1,1));d[0].apply_redactions()
   elif name=='signature':d[0].insert_text((323,634),'SIGNED',fontsize=10)
   elif name=='judge_findings':d[3].insert_text((150,555),'GRANTED',fontsize=10)
   elif name=='missing_089_order':d.delete_page(3)
   elif name=='missing_notice':d.delete_page(4)
   elif name=='wrong_basis':d[0].draw_line((40,310),(45,315),color=(0,0,0),width=2)
   elif name=='out_of_bounds':d[0].insert_text((10,15),'INVALID',fontsize=10)
   elif name=='wrong_notice_reason':d[4].insert_text((41,518),'X',fontsize=10)
   elif name=='paid_has_waiver':d.insert_pdf(src['CC-DC-089'])
   elif name=='invisible_fee_name':d[1].add_redact_annot(fitz.Rect(129,245,319,260),fill=(1,1,1));d[1].apply_redactions()
   target=pathlib.Path(td)/(name+'.pdf');d.save(target);m=inspect(target,report,census,src);negatives.append({'name':name,'detected':bool(m['errors']),'errors':m['errors']})
 report={'familyId':'md_10110_conviction-set','scope':'AUTHOR_QA_ONLY','pdfs':len(results),'pages':len(inventory),'distinctImages':len(seen),'measurements':results,'negativeControls':negatives,'passed':all(r['passed'] for r in results) and all(r['detected'] for r in negatives)}
 (dest/'byte-audit.json').write_text(json.dumps(report,indent=2)+'\n');(dest/'page-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
 print(json.dumps({'passed':report['passed'],'pdfs':report['pdfs'],'pages':report['pages'],'distinct':len(seen),'errors':{r['fixture']:r['errors'] for r in results if r['errors']},'negativeControls':negatives},indent=2));raise SystemExit(0 if report['passed'] else 1)
if __name__=='__main__':main()
